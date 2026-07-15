import express from 'express';
const router = express.Router();

import { createNotification, createOperationLog } from '../utils/audit.js';

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

router.post('/meetings', async (req, res) => {
  const { title, organizer, meetingDate, meetingTime, location, participants, agenda, approver } = req.body;
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
  const { comment, result } = req.body;
  try {
    const { pool } = req.app.locals;
    const status = result === '批准' ? '已批准' : result === '拒绝' ? '已拒绝' : '待审批';
    await pool.execute(
      'UPDATE meetings SET comment = ?, result = ?, status = ? WHERE id = ?',
      [comment || null, result || null, status, id]
    );

    const [[app]] = await pool.query('SELECT title, organizer FROM meetings WHERE id = ?', [id]);
    if (app) {
      const actionLabel = result === '批准' ? '已通过' : result === '拒绝' ? '被拒绝' : '已更新';
      await createNotification(pool, { userId: app.organizer, title: `会议审批${actionLabel}`, content: `您发起的会议"${app.title}"${actionLabel}`, type: 'approval' });
      await createOperationLog(pool, { username: req.body.operator || '系统', action: result === '批准' ? 'approve' : result === '拒绝' ? 'reject' : 'update', module: 'meeting', targetName: `会议"${app.title}"`, detail: comment || '' });
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
