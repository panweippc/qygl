import express from 'express';
const router = express.Router();

import { createNotification, createOperationLog, getOperator } from '../utils/audit.js';
import { resubmitApplication } from '../utils/resubmitHelper.js';
import { getRealName } from '../utils/identity.js';

// 会议审批：仅当前审批人或管理角色可操作
const isManagerUser = async (req) => {
  try {
    const { pool } = req.app.locals;
    const name = getRealName(req);
    if (!name) return false;
    if (name === '管理员' || name === '总经理' || /^admin$/i.test(name)) return true;
    const [emp] = await pool.execute(
      'SELECT e.position, r.name AS roleName FROM employees e LEFT JOIN roles r ON e.roleId = r.id WHERE e.name = ?',
      [name]
    );
    if (emp.length === 0) return false;
    const roleName = emp[0].roleName || '';
    const position = String(emp[0].position || '');
    if (['系统管理员', '总经理', '行政经理', '办公室主任'].includes(roleName) || /总经理/.test(position)) return true;
    return false;
  } catch (e) { return false; }
};

router.get('/meetings', async (req, res) => {
  try {
    const { pool } = req.app.locals;
    const [meetings] = await pool.execute('SELECT * FROM meetings WHERE is_deleted = 0 OR is_deleted IS NULL ORDER BY createdAt DESC');
    res.json({ success: true, data: meetings });
  } catch (error) {
    console.error('获取会议记录失败:', error);
    res.status(500).json({ success: false, message: '获取会议记录失败' });
  }
});

// 撤回会议申请：申请人本人（待审批/审批中）可撤回，状态置为「已撤回」
router.post('/meetings/:id/withdraw', async (req, res) => {
  try {
    const { id } = req.params;
    const { pool } = req.app.locals;
    const operator = getRealName(req);
    if (!operator) return res.status(401).json({ success: false, message: '未登录' });
    const [[rec]] = await pool.query('SELECT organizer, status FROM meetings WHERE id = ?', [id]);
    if (!rec) return res.status(404).json({ success: false, message: '会议申请不存在' });
    if (rec.organizer !== operator) return res.status(403).json({ success: false, message: '仅申请人本人可撤回' });
    if (!['待审批', '审批中', 'pending', '待审核'].includes(rec.status)) {
      return res.status(400).json({ success: false, message: '当前状态不可撤回' });
    }
    await pool.execute('UPDATE meetings SET status = ?, result = ? WHERE id = ?', ['已撤回', '已撤回', id]);
    await createOperationLog(pool, { username: operator, action: 'withdraw', module: 'meeting', targetName: `会议"${rec.title || ''}"`, detail: '申请人撤回' });
    res.json({ success: true, message: '撤回成功' });
  } catch (error) {
    console.error('撤回会议失败:', error);
    res.status(500).json({ success: false, message: '撤回失败' });
  }
});

// 退回会议申请：当前审批人将申请退回给申请人，状态置为「已退回」，记录退回理由
router.post('/meetings/:id/return', async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const { pool } = req.app.locals;
    const operator = getRealName(req);
    if (!operator) return res.status(401).json({ success: false, message: '未登录' });
    if (!reason || !String(reason).trim()) return res.status(400).json({ success: false, message: '退回理由不能为空' });
    const isManager = await isManagerUser(req);
    const [[rec]] = await pool.query('SELECT organizer, approver, status FROM meetings WHERE id = ?', [id]);
    if (!rec) return res.status(404).json({ success: false, message: '会议申请不存在' });
    if (!isManager && rec.approver !== operator) return res.status(403).json({ success: false, message: '仅当前审批人可退回' });
    if (!['待审批', '审批中', 'pending', '待审核'].includes(rec.status)) {
      return res.status(400).json({ success: false, message: '当前状态不可退回' });
    }
    await pool.execute('UPDATE meetings SET status = ?, result = ?, return_reason = ? WHERE id = ?', ['已退回', '已退回', reason, id]);
    await createNotification(pool, { userId: rec.organizer, title: '会议申请被退回', content: `您发起的会议"${rec.title || ''}"被${operator}退回，原因：${reason}`, type: 'approval' });
    await createOperationLog(pool, { username: operator, action: 'return', module: 'meeting', targetName: `会议"${rec.title || ''}"`, detail: reason });
    res.json({ success: true, message: '已退回' });
  } catch (error) {
    console.error('退回会议失败:', error);
    res.status(500).json({ success: false, message: '退回失败' });
  }
});

// 软删除会议申请：仅已撤回/草稿状态可删，置 is_deleted=1（管理员后台仍可查）
router.post('/meetings/:id/soft-delete', async (req, res) => {
  try {
    const { id } = req.params;
    const { pool } = req.app.locals;
    const operator = getRealName(req);
    if (!operator) return res.status(401).json({ success: false, message: '未登录' });
    const [[rec]] = await pool.query('SELECT organizer, status FROM meetings WHERE id = ?', [id]);
    if (!rec) return res.status(404).json({ success: false, message: '会议申请不存在' });
    const isManager = await isManagerUser(req);
    if (!isManager && rec.organizer !== operator) return res.status(403).json({ success: false, message: '无权限删除他人的申请' });
    if (!isManager && !['已撤回', '草稿', 'withdrawn', 'draft'].includes(rec.status)) {
      return res.status(400).json({ success: false, message: '仅「已撤回/草稿」状态可删除' });
    }
    await pool.execute('UPDATE meetings SET is_deleted = 1 WHERE id = ?', [id]);
    await createOperationLog(pool, { username: operator, action: 'soft_delete', module: 'meeting', targetName: `会议"${rec.title || ''}"`, detail: '软删除（逻辑删除）' });
    res.json({ success: true, message: '删除成功' });
  } catch (error) {
    console.error('删除会议失败:', error);
    res.status(500).json({ success: false, message: '删除失败' });
  }
});

router.get('/meetings/:id', async (req, res) => {
  try {
    const { pool } = req.app.locals;
    const [meetings] = await pool.execute('SELECT * FROM meetings WHERE id = ?', [req.params.id]);
    if (meetings.length === 0) {
      return res.status(404).json({ success: false, message: '会议记录不存在' });
    }
    res.json({ success: true, data: meetings[0] });
  } catch (error) {
    console.error('获取会议记录详情失败:', error);
    res.status(500).json({ success: false, message: '获取会议记录详情失败' });
  }
});

router.post('/meetings', async (req, res) => {
  const { title, meetingDate, meetingTime, location, participants, agenda, approver } = req.body;
  // 安全加固：发起人身份一律从 JWT token 解析，忽略请求体 organizer，防伪造
  const organizer = getRealName(req);
  if (!organizer) {
    return res.status(401).json({ success: false, message: '未登录，无法发起会议' });
  }
  if (!title) {
    return res.status(400).json({ success: false, message: '会议标题不能为空' });
  }
  try {
    const { pool } = req.app.locals;
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
    await pool.execute(
      'INSERT INTO meetings (title, organizer, meetingDate, meetingTime, location, participants, agenda, approver, status, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [title, organizer, meetingDate, meetingTime, location, participants, agenda, approver, '待审批', now]
    );

    await createNotification(pool, { userId: approver, title: '会议审批提醒', content: `${organizer} 发起了会议"${title}"，请审批`, type: 'approval' });
    await createOperationLog(pool, { username: organizer, action: 'submit', module: 'meeting', targetName: `会议"${title}"`, detail: `提交给${approver}审批` });

    res.json({ success: true, message: '会议创建成功' });
  } catch (error) {
    console.error('创建会议失败:', error);
    res.status(500).json({ success: false, message: '创建会议失败' });
  }
});

router.put('/meetings/:id', async (req, res) => {
  const { id } = req.params;
  const { comment, result, forwardTo } = req.body;
  try {
    const { pool } = req.app.locals;
    // 安全加固：仅当前审批人或管理角色可操作
    const operatorName = getRealName(req);
    const isManager = await isManagerUser(req);
    const [[permRecord]] = await pool.query('SELECT approver FROM meetings WHERE id = ?', [id]);
    if (!permRecord) {
      return res.status(404).json({ success: false, message: '会议记录不存在' });
    }
    if (!isManager && permRecord.approver !== operatorName) {
      return res.status(403).json({ success: false, message: '您不是该会议的审批人，无权限操作' });
    }
    if (forwardTo) {
      const [[current]] = await pool.query('SELECT approver, comment as oldComment FROM meetings WHERE id = ?', [id]);
      const currentApprover = current?.approver || '';
      const intermediateResult = result ? `${currentApprover}:${result}` : null;
      const newComment = current?.oldComment
        ? `${current.oldComment}\n---\n${currentApprover}: ${comment || ''}`
        : `${currentApprover}: ${comment || ''}`;
      await pool.execute(
        'UPDATE meetings SET comment = ?, result = ?, approver = ? WHERE id = ?',
        [newComment, intermediateResult, forwardTo, id]
      );
      const [[app]] = await pool.query('SELECT title, organizer FROM meetings WHERE id = ?', [id]);
      if (app) {
        await createNotification(pool, { userId: app.organizer, title: '会议已转发', content: `您发起的会议"${app.title}"已转发至总经理审批`, type: 'approval' });
        await createNotification(pool, { userId: forwardTo, title: '会议审批提醒', content: `${app.organizer} 发起的会议"${app.title}"已转发给您，请审批`, type: 'approval' });
        await createOperationLog(pool, { username: getOperator(req), action: 'forward', module: 'meeting', targetName: `会议"${app.title}"`, detail: comment || '' });
      }
    } else {
      const status = result === '批准' ? '已批准' : result === '拒绝' ? '已拒绝' : '待审批';
      const [[current]] = await pool.query('SELECT approver, comment as oldComment, result as oldResult FROM meetings WHERE id = ?', [id]);
      const currentApprover = current?.approver || '';
      const accumulatedResult = current?.oldResult && current.oldResult.includes(':')
        ? `${current.oldResult};${currentApprover}:${result}`
        : `${currentApprover}:${result}`;
      const newComment = current?.oldComment
        ? `${current.oldComment}\n---\n${currentApprover}: ${comment || ''}`
        : `${currentApprover}: ${comment || ''}`;
      await pool.execute(
        'UPDATE meetings SET comment = ?, result = ?, status = ? WHERE id = ?',
        [newComment, accumulatedResult, status, id]
      );
      const [[app]] = await pool.query('SELECT title, organizer FROM meetings WHERE id = ?', [id]);
      if (app) {
        const actionLabel = result === '批准' ? '已通过' : result === '拒绝' ? '被拒绝' : '已更新';
        await createNotification(pool, { userId: app.organizer, title: `会议审批${actionLabel}`, content: `您发起的会议"${app.title}"${actionLabel}`, type: 'approval' });
        await createOperationLog(pool, { username: getOperator(req), action: result === '批准' ? 'approve' : result === '拒绝' ? 'reject' : 'update', module: 'meeting', targetName: `会议"${app.title}"`, detail: comment || '' });
      }
    }

    res.json({ success: true, message: '会议审批更新成功' });
  } catch (error) {
    console.error('更新会议审批失败:', error);
    res.status(500).json({ success: false, message: '更新会议审批失败' });
  }
});

router.get('/meetings/pending/:approver', async (req, res) => {
  const { approver } = req.params;
  try {
    const { pool } = req.app.locals;
    const [meetings] = await pool.execute('SELECT * FROM meetings WHERE approver = ? AND status = ?', [approver, '待审批']);
    res.json({ success: true, data: meetings });
  } catch (error) {
    console.error('获取待审批会议失败:', error);
    res.status(500).json({ success: false, message: '获取待审批会议失败' });
  }
});


// 重新提交申请：申请人（已撤回 / 已退回 / 草稿）修改后再次提交，状态回到待审批
router.post('/meetings/:id/resubmit', async (req, res) => {
  try {
    const { id } = req.params;
    const { pool } = req.app.locals;
    const operator = getRealName(req);
    if (!operator) return res.status(401).json({ success: false, message: '未登录' });
    const r = await resubmitApplication(pool, {
      table: 'meetings',
      id,
      operator,
      applicantCol: 'organizer',
      data: req.body,
      newStatus: '待审批'
    });
    if (r.code !== 200) return res.status(r.code).json({ success: false, message: r.message });
    if (req.body.approver) {
      await createNotification(pool, {
        userId: req.body.approver,
        title: '审批提醒',
        content: `${operator} 重新提交了一份会议申请，请审批`,
        type: 'approval'
      });
    }
    await createOperationLog(pool, {
      username: operator,
      action: 'resubmit',
      module: 'meeting',
      targetName: `${operator}的会议申请`,
      detail: '撤回/退回后重新提交'
    });
    res.json({ success: true, message: r.message });
  } catch (error) {
    console.error('重新提交失败:', error);
    res.status(500).json({ success: false, message: '重新提交失败' });
  }
});

export default router;
