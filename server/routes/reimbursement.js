import express from 'express';
const router = express.Router();

import { createNotification, createOperationLog } from '../utils/audit.js';

// 获取报销记录列表
router.get('/reimbursements', async (req, res) => {
  try {
    const { pool } = req.app.locals;
    const [reimbursements] = await pool.execute('SELECT * FROM reimbursements');
    res.json({ success: true, data: reimbursements });
  } catch (error) {
    console.error('获取报销记录失败:', error);
    res.status(500).json({ success: false, message: '获取报销记录失败' });
  }
});

// 提交报销申请
router.post('/reimbursements', async (req, res) => {
  const { applicant, reimburseType, amount, reimburseDate, reason, approver, attachments } = req.body;
  try {
    const { pool } = req.app.locals;
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
    await pool.execute(
      'INSERT INTO reimbursements (applicant, reimburseType, amount, reimburseDate, reason, approver, attachments, status, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [applicant, reimburseType, amount, reimburseDate, reason, approver, attachments || null, '审批中', now]
    );

    await createNotification(pool, {
      userId: approver, title: '报销审批提醒', content: `${applicant} 提交了${amount}元的${reimburseType}报销申请，请审批`, type: 'approval',
    });
    await createOperationLog(pool, { username: applicant, action: 'submit', module: 'reimbursement', targetName: `${reimburseType}报销(${amount}元)`, detail: `提交给${approver}审批` });

    res.json({ success: true, message: '报销申请提交成功' });
  } catch (error) {
    console.error('提交报销申请失败:', error);
    res.status(500).json({ success: false, message: '提交报销申请失败' });
  }
});

// 更新报销申请
router.put('/reimbursements/:id', async (req, res) => {
  const { id } = req.params;
  const { comment, result, forwardTo } = req.body;
  try {
    const { pool } = req.app.locals;
    if (forwardTo) {
      const [[current]] = await pool.query('SELECT approver, comment as oldComment FROM reimbursements WHERE id = ?', [id]);
      const currentApprover = current?.approver || '';
      const intermediateResult = result ? `${currentApprover}:${result}` : null;
      const newComment = current?.oldComment
        ? `${current.oldComment}\n---\n${currentApprover}: ${comment || ''}`
        : `${currentApprover}: ${comment || ''}`;
      await pool.execute(
        'UPDATE reimbursements SET comment = ?, result = ?, approver = ? WHERE id = ?',
        [newComment, intermediateResult, forwardTo, id]
      );
      const [[app]] = await pool.query('SELECT applicant, reimburseType, amount FROM reimbursements WHERE id = ?', [id]);
      if (app) {
        await createNotification(pool, { userId: app.applicant, title: '报销已转发', content: `您的${app.reimburseType}报销(${app.amount}元)已转发至总经理审批`, type: 'approval' });
        await createOperationLog(pool, { username: req.body.operator || '系统', action: 'forward', module: 'reimbursement', targetName: `${app.applicant}的${app.reimburseType}报销`, detail: comment || '' });
      }
    } else {
      const status = result === '批准' ? '已批准' : result === '拒绝' ? '已拒绝' : '审批中';
      const [[current]] = await pool.query('SELECT approver, comment as oldComment, result as oldResult FROM reimbursements WHERE id = ?', [id]);
      const currentApprover = current?.approver || '';
      const accumulatedResult = current?.oldResult && current.oldResult.includes(':')
        ? `${current.oldResult};${currentApprover}:${result}`
        : `${currentApprover}:${result}`;
      const newComment = current?.oldComment
        ? `${current.oldComment}\n---\n${currentApprover}: ${comment || ''}`
        : `${currentApprover}: ${comment || ''}`;
      await pool.execute(
        'UPDATE reimbursements SET comment = ?, result = ?, status = ? WHERE id = ?',
        [newComment, accumulatedResult, status, id]
      );
      const [[app]] = await pool.query('SELECT applicant, reimburseType, amount FROM reimbursements WHERE id = ?', [id]);
      if (app) {
        const actionLabel = result === '批准' ? '已通过' : result === '拒绝' ? '被拒绝' : '已更新';
        await createNotification(pool, { userId: app.applicant, title: `报销${actionLabel}`, content: `您的${app.reimburseType}报销(${app.amount}元)${actionLabel}`, type: 'approval' });
        await createOperationLog(pool, { username: req.body.operator || '系统', action: result === '批准' ? 'approve' : result === '拒绝' ? 'reject' : 'update', module: 'reimbursement', targetName: `${app.applicant}的${app.reimburseType}报销`, detail: comment || '' });
      }
    }

    res.json({ success: true, message: '报销申请更新成功' });
  } catch (error) {
    console.error('更新报销申请失败:', error);
    res.status(500).json({ success: false, message: '更新报销申请失败' });
  }
});

// 删除报销申请
router.delete('/reimbursements/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const { pool } = req.app.locals;
    await pool.execute('DELETE FROM reimbursements WHERE id = ?', [id]);
    res.json({ success: true, message: '报销申请删除成功' });
  } catch (error) {
    console.error('删除报销申请失败:', error);
    res.status(500).json({ success: false, message: '删除报销申请失败' });
  }
});

export default router;
