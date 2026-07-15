import express from 'express';
const router = express.Router();

import { createNotification, createOperationLog } from '../utils/audit.js';

router.get('/office-supplies', async (req, res) => {
  try {
    const { pool } = req.app.locals;
    const [applications] = await pool.execute('SELECT * FROM office_supplies_applications');
    res.json({ success: true, data: applications });
  } catch (error) {
    console.error('获取办公用品申请失败:', error);
    res.status(500).json({ success: false, message: '获取办公用品申请失败' });
  }
});

router.post('/office-supplies', async (req, res) => {
  const { applicant, itemName, quantity, reason, approver } = req.body;
  try {
    const { pool } = req.app.locals;
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
    await pool.execute(
      'INSERT INTO office_supplies_applications (applicant, itemName, quantity, reason, approver, status, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [applicant, itemName, quantity, reason, approver, '审批中', now]
    );

    await createNotification(pool, { userId: approver, title: '办公用品审批提醒', content: `${applicant} 申请了${quantity}个${itemName}，请审批`, type: 'approval' });
    await createOperationLog(pool, { username: applicant, action: 'submit', module: 'office_supplies', targetName: `${itemName}x${quantity}`, detail: `提交给${approver}审批` });

    res.json({ success: true, message: '办公用品申请提交成功' });
  } catch (error) {
    console.error('提交办公用品申请失败:', error);
    res.status(500).json({ success: false, message: '提交办公用品申请失败' });
  }
});

router.put('/office-supplies/:id', async (req, res) => {
  const { id } = req.params;
  const { comment, result } = req.body;
  try {
    const { pool } = req.app.locals;
    const status = result === '批准' ? '已批准' : result === '拒绝' ? '已拒绝' : '审批中';
    await pool.execute(
      'UPDATE office_supplies_applications SET comment = ?, result = ?, status = ? WHERE id = ?',
      [comment || null, result || null, status, id]
    );

    const [[app]] = await pool.query('SELECT applicant, itemName, quantity FROM office_supplies_applications WHERE id = ?', [id]);
    if (app) {
      const actionLabel = result === '批准' ? '已通过' : result === '拒绝' ? '被拒绝' : '已更新';
      await createNotification(pool, { userId: app.applicant, title: `办公用品申请${actionLabel}`, content: `您申请的${app.itemName}x${app.quantity}${actionLabel}`, type: 'approval' });
      await createOperationLog(pool, { username: req.body.operator || '系统', action: result === '批准' ? 'approve' : result === '拒绝' ? 'reject' : 'update', module: 'office_supplies', targetName: `${app.applicant}的${app.itemName}`, detail: comment || '' });
    }

    res.json({ success: true, message: '办公用品申请更新成功' });
  } catch (error) {
    console.error('更新办公用品申请失败:', error);
    res.status(500).json({ success: false, message: '更新办公用品申请失败' });
  }
});

router.get('/office-supplies/pending/:approver', async (req, res) => {
  const { approver } = req.params;
  try {
    const { pool } = req.app.locals;
    const [applications] = await pool.execute('SELECT * FROM office_supplies_applications WHERE approver = ? AND status = ?', [approver, '审批中']);
    res.json({ success: true, data: applications });
  } catch (error) {
    console.error('获取待审批办公用品申请失败:', error);
    res.status(500).json({ success: false, message: '获取待审批办公用品申请失败' });
  }
});

export default router;
