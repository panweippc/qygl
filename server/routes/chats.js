import express from 'express';
import { createOperationLog } from '../utils/audit.js';
const router = express.Router();

router.get('/chats', async (req, res) => {
  const { pool } = req.app.locals;
  try {
    const [existingChats] = await pool.execute('SELECT * FROM chats WHERE id = ?', [1]);
    if (existingChats.length === 0) {
      await pool.execute(
        'INSERT INTO chats (id, name, lastMessage, time, createdAt, updatedAt) VALUES (?, ?, ?, ?, NOW(), NOW())',
        [1, '公共聊天', '欢迎大家加入公共聊天！', new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })]
      );
      console.log('创建默认公共聊天室成功');
    }

    const [chats] = await pool.execute('SELECT * FROM chats ORDER BY createdAt ASC');

    const [messages] = await pool.execute(
      'SELECT * FROM messages ORDER BY createdAt ASC LIMIT 1000'
    );

    res.json({ success: true, chats, messages });
  } catch (error) {
    console.error('获取聊天数据失败:', error);
    res.status(500).json({ success: false, message: '获取聊天数据失败' });
  }
});

router.get('/chats/:chatId/messages', async (req, res) => {
  const { pool } = req.app.locals;
  const { chatId } = req.params;
  const { limit = 50, offset = 0 } = req.query;

  try {
    const [messages] = await pool.execute(
      'SELECT * FROM messages WHERE chatId = ? ORDER BY createdAt DESC LIMIT ? OFFSET ?',
      [chatId, parseInt(limit), parseInt(offset)]
    );

    res.json({ success: true, messages: messages.reverse() });
  } catch (error) {
    console.error('获取消息失败:', error);
    res.status(500).json({ success: false, message: '获取消息失败' });
  }
});

router.post('/messages', async (req, res) => {
  const { pool } = req.app.locals;
  const { chatId, senderId, text, time, tempId } = req.body;
  const username = req.body.operator || req.body.username || '系统';

  if (!chatId || !senderId || !text) {
    return res.status(400).json({ success: false, message: '缺少必要参数' });
  }

  try {
    const [chats] = await pool.execute('SELECT * FROM chats WHERE id = ?', [chatId]);
    if (chats.length === 0) {
      await pool.execute(
        'INSERT INTO chats (id, name, lastMessage, time, createdAt, updatedAt) VALUES (?, ?, ?, ?, NOW(), NOW())',
        [chatId, chatId == 1 ? '公共聊天' : `聊天室${chatId}`, '新聊天室', time || new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })]
      );
      console.log(`自动创建聊天室: ${chatId}`);
    }

    const [result] = await pool.execute(
      'INSERT INTO messages (chatId, senderId, text, time, isOwn, createdAt) VALUES (?, ?, ?, ?, ?, NOW())',
      [chatId, senderId, text, time || new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }), true]
    );

    await pool.execute(
      'UPDATE chats SET lastMessage = ?, time = ?, updatedAt = NOW() WHERE id = ?',
      [text, time || new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }), chatId]
    );

    const message = {
      id: result.insertId,
      tempId: tempId,
      chatId: parseInt(chatId),
      senderId,
      text,
      time: time || new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
      isOwn: false
    };

    req.app.get('io').to('chat_' + chatId).emit('newMessage', message);

    await createOperationLog(pool, {
      userId: senderId,
      username,
      action: 'create',
      module: 'chat',
      targetId: result.insertId,
      targetName: text ? text.substring(0, 50) : '',
      detail: `发送消息: ${text ? text.substring(0, 100) : ''}`,
      ipAddress: req.ip
    });

    res.json({
      success: true,
      message: '消息发送成功',
      data: { id: result.insertId, tempId }
    });
  } catch (error) {
    console.error('发送消息失败:', error);
    res.status(500).json({ success: false, message: '发送消息失败: ' + error.message });
  }
});

router.post('/chats', async (req, res) => {
  const { pool } = req.app.locals;
  const { name, lastMessage = '', time = '' } = req.body;
  const username = req.body.operator || req.body.username || '系统';

  if (!name) {
    return res.status(400).json({ success: false, message: '聊天室名称不能为空' });
  }

  try {
    const [result] = await pool.execute(
      'INSERT INTO chats (name, lastMessage, time, createdAt, updatedAt) VALUES (?, ?, ?, NOW(), NOW())',
      [name, lastMessage, time]
    );

    await createOperationLog(pool, {
      username,
      action: 'create',
      module: 'chat',
      targetId: result.insertId,
      targetName: name,
      detail: `创建聊天室: ${name}`,
      ipAddress: req.ip
    });

    res.json({
      success: true,
      message: '聊天室创建成功',
      data: { id: result.insertId, name }
    });
  } catch (error) {
    console.error('创建聊天室失败:', error);
    res.status(500).json({ success: false, message: '创建聊天室失败' });
  }
});

router.delete('/chats/:id', async (req, res) => {
  const { pool } = req.app.locals;
  const { id } = req.params;
  const username = req.body.operator || req.body.username || '系统';

  try {
    await pool.execute('DELETE FROM messages WHERE chatId = ?', [id]);

    await pool.execute('DELETE FROM chats WHERE id = ?', [id]);

    await createOperationLog(pool, {
      username,
      action: 'delete',
      module: 'chat',
      targetId: id,
      targetName: `聊天室ID: ${id}`,
      detail: `删除聊天室 ID: ${id}`,
      ipAddress: req.ip
    });

    res.json({ success: true, message: '聊天室删除成功' });
  } catch (error) {
    console.error('删除聊天室失败:', error);
    res.status(500).json({ success: false, message: '删除聊天室失败' });
  }
});

export default router;
