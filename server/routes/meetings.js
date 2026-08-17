import express from 'express';
const router = express.Router();

import { createNotification, createOperationLog, getOperator } from '../utils/audit.js';
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
    const [meetings] = await pool.execute('SELECT * FROM meetings');
    res.json({ success: true, data: meetings });
  } catch (error) {
    console.error('获取会议记录失败:', error);
    res.status(500).json({ success: false, message: '获取会议记录失败' });
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

export default router;
