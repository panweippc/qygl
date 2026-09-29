import express from 'express';
import { createOperationLog, getOperator } from '../utils/audit.js';

const router = express.Router();

// 获取员工基础信息（用于成员姓名/头像）
async function getEmployee(pool, id) {
  const [rows] = await pool.execute(
    'SELECT id, name, avatar FROM employees WHERE id = ? LIMIT 1',
    [id]
  );
  return rows[0] || null;
}

// 校验某员工是否为会话成员（未退出）
async function isMember(pool, conversationId, userId) {
  const [rows] = await pool.execute(
    'SELECT 1 FROM chat_members WHERE conversation_id = ? AND user_id = ? AND deleted_at IS NULL LIMIT 1',
    [conversationId, userId]
  );
  return rows.length > 0;
}

// 落库并广播一条消息（REST 与 Socket 共用，单一真相源）
async function sendChatMessage(pool, io, {
  conversationId, employeeId, content, msgType = 'text',
  attachmentUrl = null, attachmentName = null, attachmentSize = null, tempId = null
}) {
  const member = await isMember(pool, conversationId, employeeId);
  if (!member) {
    const err = new Error('NOT_MEMBER');
    err.status = 403;
    throw err;
  }
  const emp = await getEmployee(pool, employeeId);
  const senderName = emp?.name || (emp?.username || '用户');

  const [result] = await pool.execute(
    `INSERT INTO chat_messages
      (conversation_id, sender_id, sender_name, msg_type, content, attachment_url, attachment_name, attachment_size, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(3))`,
    [conversationId, employeeId, senderName, msgType, content, attachmentUrl, attachmentName, attachmentSize]
  );
  await pool.execute(
    'UPDATE chat_conversations SET updated_at = NOW(), last_message_id = ? WHERE id = ?',
    [result.insertId, conversationId]
  );

  const [rows] = await pool.execute(
    'SELECT * FROM chat_messages WHERE id = ? LIMIT 1',
    [result.insertId]
  );
  const message = rows[0];

  // 广播给会话房间内所有在线成员
  io.to('chat_' + conversationId).emit('chat:message', { conversationId, message, tempId });

  // 审计
  try {
    await createOperationLog(pool, {
      userId: employeeId,
      username: getOperator({ user: { name: senderName } }) || senderName,
      action: 'create',
      module: 'chat',
      targetId: result.insertId,
      targetName: (content || attachmentName || '').toString().substring(0, 50),
      detail: `发送聊天消息(${msgType})`,
      ipAddress: ''
    });
  } catch (e) { /* 日志失败不影响收发 */ }

  return message;
}

// 会话列表（当前员工参与且未退出）
router.get('/chat/conversations', async (req, res) => {
  const { pool } = req.app.locals;
  const employeeId = parseInt(req.query.employeeId);
  if (!employeeId) return res.status(400).json({ success: false, message: '缺少 employeeId' });
  try {
    const [conversations] = await pool.execute(
      `SELECT c.*, m.last_read_message_id
       FROM chat_conversations c
       JOIN chat_members m ON c.id = m.conversation_id
       WHERE m.user_id = ? AND m.deleted_at IS NULL
       ORDER BY c.updated_at DESC`,
      [employeeId]
    );

    const list = [];
    for (const conv of conversations) {
      // 最后一条消息
      const [lastMsgs] = await pool.execute(
        `SELECT * FROM chat_messages WHERE conversation_id = ? AND deleted_at IS NULL ORDER BY id DESC LIMIT 1`,
        [conv.id]
      );
      const last = lastMsgs[0] || null;

      // 成员（用于单聊显示对方姓名、群聊头像等）
      const [members] = await pool.execute(
        `SELECT user_id, username FROM chat_members WHERE conversation_id = ? AND deleted_at IS NULL`,
        [conv.id]
      );

      // 未读：非自己发送且 id 大于已读指针
      const [unreadRows] = await pool.execute(
        `SELECT COUNT(*) AS unread FROM chat_messages
         WHERE conversation_id = ? AND deleted_at IS NULL AND sender_id != ? AND id > ?`,
        [conv.id, employeeId, conv.last_read_message_id]
      );

      let title = conv.title;
      let avatar = conv.avatar;
      if (conv.type === 'single' && members.length === 2) {
        const other = members.find(m => m.user_id !== employeeId);
        title = other ? other.username : '私聊';
        avatar = null;
      }

      list.push({
        id: conv.id,
        type: conv.type,
        title,
        avatar,
        updatedAt: conv.updated_at,
        lastMessage: last
          ? { id: last.id, msgType: last.msg_type, content: last.content, senderName: last.sender_name, createdAt: last.created_at, deleted: !!last.deleted_at }
          : null,
        unread: unreadRows[0]?.unread || 0,
        members
      });
    }

    res.json({ success: true, data: list });
  } catch (error) {
    console.error('获取会话列表失败:', error);
    res.status(500).json({ success: false, message: '获取会话列表失败' });
  }
});

// 创建会话（单聊去重 / 群聊）
router.post('/chat/conversations', async (req, res) => {
  const { pool } = req.app.locals;
  const { employeeId, type = 'single', memberIds = [], title = '' } = req.body;
  if (!employeeId) return res.status(400).json({ success: false, message: '缺少 employeeId' });
  const me = await getEmployee(pool, employeeId);
  if (!me) return res.status(400).json({ success: false, message: '当前用户不存在' });

  try {
    if (type === 'single') {
      const otherId = parseInt(memberIds[0]);
      if (!otherId || otherId === employeeId) {
        return res.status(400).json({ success: false, message: '单聊需指定另一位成员' });
      }
      // 去重：已存在两人单聊则直接返回
      const [existing] = await pool.execute(
        `SELECT c.id FROM chat_conversations c
         JOIN chat_members m1 ON c.id = m1.conversation_id AND m1.user_id = ? AND m1.deleted_at IS NULL
         JOIN chat_members m2 ON c.id = m2.conversation_id AND m2.user_id = ? AND m2.deleted_at IS NULL
         WHERE c.type = 'single' LIMIT 1`,
        [employeeId, otherId]
      );
      if (existing.length) {
        return res.json({ success: true, data: { id: existing[0].id, existed: true } });
      }
      const [cRes] = await pool.execute(
        `INSERT INTO chat_conversations (type, created_by, created_at, updated_at) VALUES ('single', ?, NOW(), NOW())`,
        [employeeId]
      );
      await pool.execute(
        `INSERT INTO chat_members (conversation_id, user_id, username, role, joined_at) VALUES (?, ?, ?, 'owner', NOW()), (?, ?, ?, 'member', NOW())`,
        [cRes.insertId, employeeId, me.name, cRes.insertId, otherId, (await getEmployee(pool, otherId))?.name || '用户']
      );
      return res.json({ success: true, data: { id: cRes.insertId, existed: false } });
    }

    // 群聊
    const ids = Array.from(new Set([employeeId, ...memberIds.map(Number)])).filter(Boolean);
    if (ids.length < 2) return res.status(400).json({ success: false, message: '群聊至少需要 2 人' });
    const [cRes] = await pool.execute(
      `INSERT INTO chat_conversations (type, title, created_by, created_at, updated_at) VALUES ('group', ?, ?, NOW(), NOW())`,
      [title || '群聊', employeeId]
    );
    for (const uid of ids) {
      const emp = await getEmployee(pool, uid);
      const role = uid === employeeId ? 'owner' : 'member';
      await pool.execute(
        `INSERT INTO chat_members (conversation_id, user_id, username, role, joined_at) VALUES (?, ?, ?, ?, NOW())
         ON DUPLICATE KEY UPDATE deleted_at = NULL`,
        [cRes.insertId, uid, emp?.name || '用户', role]
      );
    }
    // 系统消息：创建群聊
    await pool.execute(
      `INSERT INTO chat_messages (conversation_id, sender_id, sender_name, msg_type, content, created_at)
       VALUES (?, ?, ?, 'system', ?, NOW(3))`,
      [cRes.insertId, employeeId, me.name, `${me.name} 创建了群聊`]
    );
    await pool.execute('UPDATE chat_conversations SET updated_at = NOW() WHERE id = ?', [cRes.insertId]);
    res.json({ success: true, data: { id: cRes.insertId, existed: false } });
  } catch (error) {
    console.error('创建会话失败:', error);
    res.status(500).json({ success: false, message: '创建会话失败' });
  }
});

// 历史消息（游标分页，before 之前）
router.get('/chat/conversations/:id/messages', async (req, res) => {
  const { pool } = req.app.locals;
  const conversationId = parseInt(req.params.id);
  const employeeId = parseInt(req.query.employeeId);
  const before = parseInt(req.query.before) || 0;
  const limit = Math.min(parseInt(req.query.limit) || 30, 100);
  if (!employeeId || !(await isMember(pool, conversationId, employeeId))) {
    return res.status(403).json({ success: false, message: '无权访问该会话' });
  }
  try {
    const sql = before
      ? `SELECT * FROM chat_messages WHERE conversation_id = ? AND id < ? ORDER BY id DESC LIMIT ${limit}`
      : `SELECT * FROM chat_messages WHERE conversation_id = ? ORDER BY id DESC LIMIT ${limit}`;
    const params = before ? [conversationId, before] : [conversationId];
    const [messages] = await pool.execute(sql, params);
    // 前端按时间正序展示
    messages.reverse();
    res.json({
      success: true,
      data: messages.map(m => ({
        id: m.id, conversationId: m.conversation_id, senderId: m.sender_id, senderName: m.sender_name,
        msgType: m.msg_type, content: m.content, attachmentUrl: m.attachment_url,
        attachmentName: m.attachment_name, attachmentSize: m.attachment_size,
        deleted: !!m.deleted_at, createdAt: m.created_at
      }))
    });
  } catch (error) {
    console.error('获取消息失败:', error);
    res.status(500).json({ success: false, message: '获取消息失败' });
  }
});

// 发送消息（REST，持久化 + 广播）
router.post('/chat/conversations/:id/messages', async (req, res) => {
  const { pool } = req.app.locals;
  const conversationId = parseInt(req.params.id);
  const { employeeId, content, msgType = 'text', attachmentUrl, attachmentName, attachmentSize } = req.body;
  if (!employeeId || (!content && !attachmentUrl)) {
    return res.status(400).json({ success: false, message: '缺少必要参数' });
  }
  try {
    const message = await sendChatMessage(pool, req.app.get('io'), {
      conversationId, employeeId, content, msgType, attachmentUrl, attachmentName, attachmentSize
    });
    res.json({
      success: true,
      data: {
        id: message.id, conversationId: message.conversation_id, senderId: message.sender_id, senderName: message.sender_name,
        msgType: message.msg_type, content: message.content, attachmentUrl: message.attachment_url,
        attachmentName: message.attachment_name, attachmentSize: message.attachment_size, deleted: false, createdAt: message.created_at
      }
    });
  } catch (error) {
    if (error.status === 403) return res.status(403).json({ success: false, message: '您不是该会话成员' });
    console.error('发送消息失败:', error);
    res.status(500).json({ success: false, message: '发送消息失败' });
  }
});

// 标记已读
router.post('/chat/conversations/:id/read', async (req, res) => {
  const { pool } = req.app.locals;
  const conversationId = parseInt(req.params.id);
  const { employeeId } = req.body;
  if (!employeeId) return res.status(400).json({ success: false, message: '缺少 employeeId' });
  try {
    const [maxRows] = await pool.execute(
      'SELECT MAX(id) AS maxId FROM chat_messages WHERE conversation_id = ? AND deleted_at IS NULL',
      [conversationId]
    );
    const maxId = maxRows[0]?.maxId || 0;
    await pool.execute(
      `INSERT INTO chat_members (conversation_id, user_id, last_read_message_id, joined_at)
       VALUES (?, ?, ?, NOW()) ON DUPLICATE KEY UPDATE last_read_message_id = ?`,
      [conversationId, employeeId, maxId, maxId]
    );
    req.app.get('io').to('chat_' + conversationId).emit('chat:read', { conversationId, userId: employeeId, lastReadMessageId: maxId });
    res.json({ success: true, data: { lastReadMessageId: maxId } });
  } catch (error) {
    console.error('标记已读失败:', error);
    res.status(500).json({ success: false, message: '标记已读失败' });
  }
});

// 群聊：添加成员
router.post('/chat/conversations/:id/members', async (req, res) => {
  const { pool } = req.app.locals;
  const conversationId = parseInt(req.params.id);
  const { employeeIds = [] } = req.body;
  try {
    const conv = await pool.execute('SELECT type FROM chat_conversations WHERE id = ?', [conversationId]);
    if (!conv[0].length || conv[0][0].type !== 'group') {
      return res.status(400).json({ success: false, message: '仅群聊可添加成员' });
    }
    for (const uid of employeeIds.map(Number)) {
      const emp = await getEmployee(pool, uid);
      await pool.execute(
        `INSERT INTO chat_members (conversation_id, user_id, username, role, joined_at)
         VALUES (?, ?, ?, 'member', NOW()) ON DUPLICATE KEY UPDATE deleted_at = NULL`,
        [conversationId, uid, emp?.name || '用户']
      );
    }
    req.app.get('io').to('chat_' + conversationId).emit('chat:members-changed', { conversationId });
    res.json({ success: true, message: '已添加成员' });
  } catch (error) {
    console.error('添加成员失败:', error);
    res.status(500).json({ success: false, message: '添加成员失败' });
  }
});

// 会话成员列表
router.get('/chat/conversations/:id/members', async (req, res) => {
  const { pool } = req.app.locals;
  const conversationId = parseInt(req.params.id);
  const employeeId = parseInt(req.query.employeeId);
  if (!employeeId || !(await isMember(pool, conversationId, employeeId))) {
    return res.status(403).json({ success: false, message: '无权访问该会话' });
  }
  try {
    const [members] = await pool.execute(
      `SELECT user_id, username, role FROM chat_members WHERE conversation_id = ? AND deleted_at IS NULL`,
      [conversationId]
    );
    // 在线状态由 socket 广播的 onlineEmployeeIds 在前端合并
    res.json({ success: true, data: members });
  } catch (error) {
    console.error('获取成员失败:', error);
    res.status(500).json({ success: false, message: '获取成员失败' });
  }
});

// 撤回消息（仅发送者本人）
router.delete('/chat/conversations/:id/messages/:mid', async (req, res) => {
  const { pool } = req.app.locals;
  const conversationId = parseInt(req.params.id);
  const mid = parseInt(req.params.mid);
  const { employeeId } = req.body;
  try {
    const [msg] = await pool.execute('SELECT sender_id FROM chat_messages WHERE id = ? AND conversation_id = ?', [mid, conversationId]);
    if (!msg.length) return res.status(404).json({ success: false, message: '消息不存在' });
    if (msg[0].sender_id !== employeeId) return res.status(403).json({ success: false, message: '只能撤回自己的消息' });
    await pool.execute('UPDATE chat_messages SET deleted_at = NOW() WHERE id = ?', [mid]);
    req.app.get('io').to('chat_' + conversationId).emit('chat:message-recalled', { conversationId, messageId: mid });
    res.json({ success: true, message: '已撤回' });
  } catch (error) {
    console.error('撤回失败:', error);
    res.status(500).json({ success: false, message: '撤回失败' });
  }
});

// 消息搜索（当前用户参与的会话内）
router.get('/chat/search', async (req, res) => {
  const { pool } = req.app.locals;
  const employeeId = parseInt(req.query.employeeId);
  const q = (req.query.q || '').trim();
  if (!employeeId) return res.status(400).json({ success: false, message: '缺少 employeeId' });
  if (q.length < 1) return res.json({ success: true, data: [] });
  try {
    const [rows] = await pool.execute(
      `SELECT m.* FROM chat_messages m
       JOIN chat_members mem ON m.conversation_id = mem.conversation_id
       WHERE mem.user_id = ? AND mem.deleted_at IS NULL
         AND m.deleted_at IS NULL AND m.msg_type = 'text' AND m.content LIKE ?
       ORDER BY m.id DESC LIMIT 50`,
      [employeeId, `%${q}%`]
    );
    res.json({
      success: true,
      data: rows.map(m => ({
        id: m.id, conversationId: m.conversation_id, senderName: m.sender_name,
        content: m.content, createdAt: m.created_at
      }))
    });
  } catch (error) {
    console.error('搜索失败:', error);
    res.status(500).json({ success: false, message: '搜索失败' });
  }
});

// 未读总数（侧边栏红点）
router.get('/chat/unread-count', async (req, res) => {
  const { pool } = req.app.locals;
  const employeeId = parseInt(req.query.employeeId);
  if (!employeeId) return res.status(400).json({ success: false, message: '缺少 employeeId' });
  try {
    const [rows] = await pool.execute(
      `SELECT
         (SELECT COUNT(*) FROM chat_messages cm
          WHERE cm.conversation_id = c.id AND cm.deleted_at IS NULL
            AND cm.sender_id != ? AND cm.id > m.last_read_message_id) AS unread
       FROM chat_conversations c
       JOIN chat_members m ON c.id = m.conversation_id
       WHERE m.user_id = ? AND m.deleted_at IS NULL`,
      [employeeId, employeeId]
    );
    const total = rows.reduce((s, r) => s + (r.unread || 0), 0);
    res.json({ success: true, data: { count: total } });
  } catch (error) {
    console.error('获取未读失败:', error);
    res.status(500).json({ success: false, message: '获取未读失败' });
  }
});

export default router;
export { sendChatMessage };
