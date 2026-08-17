import express from 'express';
const router = express.Router();

import { createNotification, createOperationLog, getOperator } from '../utils/audit.js';

// ---- 招待费数据访问控制：申请人本人 + 财务/总经理 可见 ----
const FINANCE_ROLES = ['财务总监', '财务经理', '总经理', '系统管理员'];

// 获取当前登录用户真实姓名（处理 emp_姓名_id 前缀）
const getRealName = (req) => {
  let username = req.user?.username || req.user?.name || '';
  if (username && /^emp_/.test(username)) {
    const parts = String(username).split('_');
    if (parts.length >= 2) username = parts[1];
  }
  return username || '';
};

// 判断是否财务/管理角色（从数据库读取最新角色）
const isFinanceManager = async (req) => {
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
    if (FINANCE_ROLES.includes(roleName) || /总经理/.test(position)) return true;
    return false;
  } catch (e) {
    return false;
  }
};

router.get('/entertainment-expenses', async (req, res) => {
  try {
    const { pool } = req.app.locals;
    const isManager = await isFinanceManager(req);
    if (isManager) {
      const [records] = await pool.execute('SELECT * FROM entertainment_expenses ORDER BY createdAt DESC');
      return res.json({ success: true, data: records });
    }
    const name = getRealName(req);
    const [records] = await pool.execute('SELECT * FROM entertainment_expenses WHERE applicant = ? ORDER BY createdAt DESC', [name]);
    res.json({ success: true, data: records });
  } catch (error) {
    console.error('获取业务招待费记录失败:', error);
    res.status(500).json({ success: false, message: '获取业务招待费记录失败' });
  }
});

router.get('/entertainment-expenses/:id', async (req, res) => {
  try {
    const { pool } = req.app.locals;
    const [records] = await pool.execute('SELECT * FROM entertainment_expenses WHERE id = ?', [req.params.id]);
    if (records.length === 0) {
      return res.status(404).json({ success: false, message: '业务招待费记录不存在' });
    }
    const isManager = await isFinanceManager(req);
    const name = getRealName(req);
    if (!isManager && records[0].applicant !== name) {
      return res.status(403).json({ success: false, message: '无权限查看该招待费记录' });
    }
    res.json({ success: true, data: records[0] });
  } catch (error) {
    console.error('获取业务招待费记录详情失败:', error);
    res.status(500).json({ success: false, message: '获取业务招待费记录详情失败' });
  }
});

router.post('/entertainment-expenses', async (req, res) => {
  const { guestName, guestUnit, location, guestCount, expenseType, expenseAmount, expenseDate, purpose, approver, attachments } = req.body;
  const applicant = getRealName(req);
  if (!applicant) {
    return res.status(401).json({ success: false, message: '未登录' });
  }
  if (!expenseType) {
    return res.status(400).json({ success: false, message: '招待类型不能为空' });
  }
  try {
    const { pool } = req.app.locals;
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
    // 金额处理：null/空/非数字一律为0，避免数据库超出范围
    const safeAmount = expenseAmount === null || expenseAmount === undefined || expenseAmount === '' || isNaN(Number(expenseAmount))
      ? 0 : Number(expenseAmount);
    await pool.execute(
      'INSERT INTO entertainment_expenses (applicant, guestName, guestUnit, location, guestCount, expenseType, expenseAmount, expenseDate, purpose, approver, attachments, status, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [applicant, guestName, guestUnit || '', location || '', guestCount || 1, expenseType, safeAmount, expenseDate, purpose, approver, attachments || null, '审批中', now]
    );
    await createNotification(pool, { userId: approver, title: '业务招待费审批提醒', content: `${applicant} 提交了${safeAmount}元的${expenseType}招待申请，请审批`, type: 'approval' });
    await createOperationLog(pool, { username: applicant, action: 'submit', module: 'entertainment', targetName: `${expenseType}招待(${safeAmount}元)`, detail: `提交给${approver}审批` });
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
    const operator = getRealName(req);
    const isManager = await isFinanceManager(req);
    const [[record]] = await pool.query('SELECT applicant, approver FROM entertainment_expenses WHERE id = ?', [id]);
    if (!record) {
      return res.status(404).json({ success: false, message: '招待费记录不存在' });
    }
    // 非管理角色：仅当是当前审批人时允许操作
    if (!isManager && record.approver !== operator && record.applicant !== operator) {
      return res.status(403).json({ success: false, message: '您不是该招待费的审批人，无权限操作' });
    }
    if (forwardTo) {
      const [[current]] = await pool.query('SELECT approver, comment as oldComment, result as oldResult FROM entertainment_expenses WHERE id = ?', [id]);
      const currentApprover = current?.approver || '';
      const intermediateResult = result ? `${currentApprover}:${result}` : null;
      const accumulatedResult = current?.oldResult && current.oldResult.includes(':')
        ? `${current.oldResult};${intermediateResult}`
        : (intermediateResult || current?.oldResult || null);
      const newComment = current?.oldComment
        ? `${current.oldComment}\n---\n${currentApprover}: ${comment || ''}`
        : `${currentApprover}: ${comment || ''}`;
      await pool.execute(
        'UPDATE entertainment_expenses SET comment = ?, result = ?, approver = ? WHERE id = ?',
        [newComment, accumulatedResult, forwardTo, id]
      );
      const [[app]] = await pool.query('SELECT applicant FROM entertainment_expenses WHERE id = ?', [id]);
      if (app) {
        await createNotification(pool, { userId: app.applicant, title: '招待费已转发', content: `您的业务招待费申请已转发至总经理审批`, type: 'approval' });
        await createNotification(pool, { userId: forwardTo, title: '招待费审批提醒', content: `${app.applicant} 的业务招待费申请已转发给您，请审批`, type: 'approval' });
        await createOperationLog(pool, { username: getOperator(req), action: 'forward', module: 'entertainment', targetName: `${app.applicant}的业务招待费`, detail: comment || '' });
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
