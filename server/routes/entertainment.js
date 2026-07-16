import express from 'express';
const router = express.Router();

import { createNotification, createOperationLog } from '../utils/audit.js';

router.get('/entertainment-expenses', async (req, res) => {
  try {
    const { pool } = req.app.locals;
    const [records] = await pool.execute('SELECT * FROM entertainment_expenses ORDER BY createdAt DESC');
    res.json({ success: true, data: records });
  } catch (error) {
    console.error('获取业务招待费记录失败:', error);
    res.status(500).json({ success: false, message: '获取业务招待费记录失败' });
  }
});

router.post('/entertainment-expenses', async (req, res) => {
  const { applicant, guestName, guestCount, expenseType, expenseAmount, expenseDate, purpose, approver } = req.body;
  try {
    const { pool } = req.app.locals;
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
    await pool.execute(
      'INSERT INTO entertainment_expenses (applicant, guestName, guestCount, expenseType, expenseAmount, expenseDate, purpose, approver, status, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [applicant, guestName, guestCount || 1, expenseType, expenseAmount, expenseDate, purpose, approver, '审批中', now]
    );
    await createNotification(pool, { userId: approver, title: '业务招待费审批提醒', content: `${applicant} 提交了${expenseAmount}元的${expenseType}招待申请，请审批`, type: 'approval' });
    await createOperationLog(pool, { username: applicant, action: 'submit', module: 'entertainment', targetName: `${expenseType}招待(${expenseAmount}元)`, detail: `提交给${approver}审批` });
    res.json({ success: true, message: '业务招待费申请提交成功' });
  } catch (error) {
    console.error('提交业务招待费申请失败:', error);
    res.status(500).json({ success: false, message: '提交业务招待费申请失败' });
  }
});

router.put('/entertainment-expenses/:id', async (req, res) => {
  const { id } = req.params;
  const { comment, result, forwardTo } = req.body;
  try {
    const { pool } = req.app.locals;
    if (forwardTo) {
      const [[current]] = await pool.query('SELECT approver, comment as oldComment FROM entertainment_expenses WHERE id = ?', [id]);
      const currentApprover = current?.approver || '';
      const intermediateResult = result ? `${currentApprover}:${result}` : null;
      const newComment = current?.oldComment
        ? `${current.oldComment}\n---\n${currentApprover}: ${comment || ''}`
        : comment || null;
      await pool.execute(
        'UPDATE entertainment_expenses SET comment = ?, result = ?, approver = ? WHERE id = ?',
        [newComment, intermediateResult, forwardTo, id]
      );
      const [[app]] = await pool.query('SELECT applicant FROM entertainment_expenses WHERE id = ?', [id]);
      if (app) {
        await createNotification(pool, { userId: app.applicant, title: '招待费已转发', content: `您的业务招待费申请已转发至总经理审批`, type: 'approval' });
        await createOperationLog(pool, { username: req.body.operator || '系统', action: 'forward', module: 'entertainment', targetName: `${app.applicant}的业务招待费`, detail: comment || '' });
      }
    } else {
      const status = result === '批准' ? '已批准' : result === '拒绝' ? '已拒绝' : '审批中';
      const [[current]] = await pool.query('SELECT approver, comment as oldComment, result as oldResult FROM entertainment_expenses WHERE id = ?', [id]);
      const currentApprover = current?.approver || '';
      const accumulatedResult = current?.oldResult && current.oldResult.includes(':')
        ? `${current.oldResult};${currentApprover}:${result}`
        : `${currentApprover}:${result}`;
      const newComment = current?.oldComment
        ? `${current.oldComment}\n---\n${currentApprover}: ${comment || ''}`
        : `${currentApprover}: ${comment || ''}`;
      await pool.execute(
        'UPDATE entertainment_expenses SET comment = ?, result = ?, status = ? WHERE id = ?',
        [newComment, accumulatedResult, status, id]
      );
    }
    res.json({ success: true, message: '业务招待费申请更新成功' });
  } catch (error) {
    console.error('更新业务招待费申请失败:', error);
    res.status(500).json({ success: false, message: '更新业务招待费申请失败' });
  }
});

export default router;
