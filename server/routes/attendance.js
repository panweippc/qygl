import express from 'express';
const router = express.Router();

import { createNotification, createOperationLog } from '../utils/audit.js';

// 获取请假申请列表
router.get('/leave-applications', async (req, res) => {
  try {
    const { pool } = req.app.locals;
    const [applications] = await pool.execute('SELECT * FROM leave_applications');
    res.json({ success: true, data: applications });
  } catch (error) {
    console.error('获取请假申请失败:', error);
    res.status(500).json({ success: false, message: '获取请假申请失败' });
  }
});

// 提交请假申请
router.post('/leave-applications', async (req, res) => {
  const { applicant, leaveType, startDate, endDate, days, reason, approver } = req.body;
  try {
    const { pool } = req.app.locals;
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
    await pool.execute(
      'INSERT INTO leave_applications (applicant, leaveType, startDate, endDate, days, reason, approver, status, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [applicant, leaveType, startDate, endDate, days, reason, approver, '审批中', now]
    );

    await createNotification(pool, {
      userId: approver,
      title: '请假审批提醒',
      content: `${applicant} 提交了${days}天的${leaveType}申请，请审批`,
      type: 'approval',
    });
    await createOperationLog(pool, {
      username: applicant,
      action: 'submit',
      module: 'attendance',
      targetName: `${leaveType}请假(${days}天)`,
      detail: `提交给${approver}审批`
    });

    res.json({ success: true, message: '请假申请提交成功' });
  } catch (error) {
    console.error('提交请假申请失败:', error);
    res.status(500).json({ success: false, message: '提交请假申请失败' });
  }
});

// 更新请假申请
router.put('/leave-applications/:id', async (req, res) => {
  const { id } = req.params;
  const { comment, result, nextApprover, forwardTo } = req.body;
  try {
    const { pool } = req.app.locals;
    let status;
    if (result === '批准') {
      status = '已批准';
    } else if (result === '拒绝') {
      status = '已拒绝';
    } else if (result === '取消') {
      status = '已取消';
    } else {
      status = '审批中';
    }
    if (forwardTo) {
      const [[current]] = await pool.query('SELECT approver, comment as oldComment FROM leave_applications WHERE id = ?', [id]);
      const currentApprover = current?.approver || '';
      const intermediateResult = result ? `${currentApprover}:${result}` : null;
      const newComment = current?.oldComment
        ? `${current.oldComment}\n---\n${currentApprover}: ${comment || ''}`
        : `${currentApprover}: ${comment || ''}`;
      await pool.execute(
        'UPDATE leave_applications SET comment = ?, result = ?, approver = ? WHERE id = ?',
        [newComment, intermediateResult, forwardTo, id]
      );
      const [[app]] = await pool.query('SELECT applicant, leaveType, days FROM leave_applications WHERE id = ?', [id]);
      if (app) {
        await createNotification(pool, {
          userId: app.applicant,
          title: '请假已转发',
          content: `您的${app.leaveType}申请(${app.days}天)已转发至总经理审批`,
          type: 'approval',
        });
        await createOperationLog(pool, {
          username: req.body.operator || '系统',
          action: 'forward',
          module: 'attendance',
          targetName: `${app.applicant}的${app.leaveType}请假`,
          detail: comment || ''
        });
      }
    } else {
      const [[current]] = await pool.query('SELECT approver, comment as oldComment, result as oldResult FROM leave_applications WHERE id = ?', [id]);
      const currentApprover = current?.approver || '';
      const accumulatedResult = current?.oldResult && current.oldResult.includes(':')
        ? `${current.oldResult};${currentApprover}:${result}`
        : `${currentApprover}:${result}`;
      const newComment = current?.oldComment
        ? `${current.oldComment}\n---\n${currentApprover}: ${comment || ''}`
        : `${currentApprover}: ${comment || ''}`;
      await pool.execute(
        'UPDATE leave_applications SET comment = ?, result = ?, status = ?, nextApprover = ? WHERE id = ?',
        [newComment, accumulatedResult, status, nextApprover || null, id]
      );
      const [[app]] = await pool.query('SELECT applicant, leaveType, days FROM leave_applications WHERE id = ?', [id]);
      if (app) {
        const actionLabel = result === '批准' ? '已通过' : result === '拒绝' ? '被拒绝' : '已更新';
        await createNotification(pool, {
          userId: app.applicant,
          title: `请假${actionLabel}`,
          content: `您的${app.leaveType}申请(${app.days}天)${actionLabel}`,
          type: 'approval',
        });
        await createOperationLog(pool, {
          username: req.body.operator || '系统',
          action: result === '批准' ? 'approve' : result === '拒绝' ? 'reject' : 'update',
          module: 'attendance',
          targetName: `${app.applicant}的${app.leaveType}请假`,
          detail: comment || ''
        });
      }
    }

    res.json({ success: true, message: '请假申请更新成功' });
  } catch (error) {
    console.error('更新请假申请失败:', error);
    res.status(500).json({ success: false, message: '更新请假申请失败' });
  }
});

// 删除请假申请
router.delete('/leave-applications/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const { pool } = req.app.locals;
    await pool.execute('DELETE FROM leave_applications WHERE id = ?', [id]);
    res.json({ success: true, message: '请假申请删除成功' });
  } catch (error) {
    console.error('删除请假申请失败:', error);
    res.status(500).json({ success: false, message: '删除请假申请失败' });
  }
});

export default router;
