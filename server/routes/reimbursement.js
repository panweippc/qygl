import express from 'express';
const router = express.Router();

import { createNotification, createOperationLog, getOperator } from '../utils/audit.js';

// ---- 报销/招待费数据访问控制：申请人本人 + 财务/总经理 可见 ----
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

// 判断是否财务/管理角色（从数据库读取最新角色，避免 token 角色过期）
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

// 获取报销记录列表：财务/总经理看全部，普通员工只看自己
router.get('/reimbursements', async (req, res) => {
  try {
    const { pool } = req.app.locals;
    const isManager = await isFinanceManager(req);
    if (isManager) {
      const [reimbursements] = await pool.execute('SELECT * FROM reimbursements ORDER BY createdAt DESC');
      return res.json({ success: true, data: reimbursements });
    }
    const name = getRealName(req);
    const [reimbursements] = await pool.execute('SELECT * FROM reimbursements WHERE applicant = ? ORDER BY createdAt DESC', [name]);
    res.json({ success: true, data: reimbursements });
  } catch (error) {
    console.error('获取报销记录失败:', error);
    res.status(500).json({ success: false, message: '获取报销记录失败' });
  }
});

// 获取单个报销记录：仅本人或财务/总经理可见
router.get('/reimbursements/:id', async (req, res) => {
  try {
    const { pool } = req.app.locals;
    const [records] = await pool.execute('SELECT * FROM reimbursements WHERE id = ?', [req.params.id]);
    if (records.length === 0) {
      return res.status(404).json({ success: false, message: '报销记录不存在' });
    }
    const isManager = await isFinanceManager(req);
    const name = getRealName(req);
    if (!isManager && records[0].applicant !== name) {
      return res.status(403).json({ success: false, message: '无权限查看该报销记录' });
    }
    res.json({ success: true, data: records[0] });
  } catch (error) {
    console.error('获取报销记录详情失败:', error);
    res.status(500).json({ success: false, message: '获取报销记录详情失败' });
  }
});

// 提交报销申请：申请人身份从 token 读取，禁止伪造他人名义提交
router.post('/reimbursements', async (req, res) => {
  const { reimburseType, amount, reimburseDate, reason, approver, attachments, detail } = req.body;
  const applicant = getRealName(req);
  if (!applicant) {
    return res.status(401).json({ success: false, message: '未登录' });
  }
  if (!reimburseType || !amount) {
    return res.status(400).json({ success: false, message: '报销类型和金额不能为空' });
  }
  try {
    const { pool } = req.app.locals;
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
    await pool.execute(
      'INSERT INTO reimbursements (applicant, reimburseType, amount, reimburseDate, reason, approver, attachments, detail, status, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [applicant, reimburseType, amount, reimburseDate, reason, approver, attachments || null, detail ? JSON.stringify(detail) : null, '审批中', now]
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

// 更新报销申请（审批）：仅当前审批人或财务/总经理可操作
router.put('/reimbursements/:id', async (req, res) => {
  const { id } = req.params;
  const { comment, result, forwardTo } = req.body;
  try {
    const { pool } = req.app.locals;
    const operator = getRealName(req);
    const isManager = await isFinanceManager(req);
    const [[record]] = await pool.query('SELECT applicant, approver FROM reimbursements WHERE id = ?', [id]);
    if (!record) {
      return res.status(404).json({ success: false, message: '报销记录不存在' });
    }
    // 非管理角色：仅当是当前审批人（或审批人之一）时允许操作
    if (!isManager && record.approver !== operator && record.applicant !== operator) {
      return res.status(403).json({ success: false, message: '您不是该报销的审批人，无权限操作' });
    }
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
        await createNotification(pool, { userId: forwardTo, title: '报销审批提醒', content: `${app.applicant} 的${app.reimburseType}报销(${app.amount}元)已转发给您，请审批`, type: 'approval' });
        await createOperationLog(pool, { username: getOperator(req), action: 'forward', module: 'reimbursement', targetName: `${app.applicant}的${app.reimburseType}报销`, detail: comment || '' });
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
        await createOperationLog(pool, { username: getOperator(req), action: result === '批准' ? 'approve' : result === '拒绝' ? 'reject' : 'update', module: 'reimbursement', targetName: `${app.applicant}的${app.reimburseType}报销`, detail: comment || '' });
      }
    }

    res.json({ success: true, message: '报销申请更新成功' });
  } catch (error) {
    console.error('更新报销申请失败:', error);
    res.status(500).json({ success: false, message: '更新报销申请失败' });
  }
});

// 删除报销申请：仅本人（且仅审批中）或财务/总经理可删除
router.delete('/reimbursements/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const { pool } = req.app.locals;
    // 删除前获取记录用于审计
    const [rows] = await pool.execute('SELECT applicant, reimburseType, amount, status FROM reimbursements WHERE id = ?', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: '报销记录不存在' });
    }
    const operator = getRealName(req);
    const isManager = await isFinanceManager(req);
    if (!isManager && rows[0].applicant !== operator) {
      return res.status(403).json({ success: false, message: '无权限删除他人的报销记录' });
    }
    if (!isManager && rows[0].status !== '审批中') {
      return res.status(400).json({ success: false, message: '已审批的报销记录不可删除' });
    }
    const info = rows[0] || {};
    await pool.execute('DELETE FROM reimbursements WHERE id = ?', [id]);
    // 删除报销申请审计
    createOperationLog(pool, { userId: String(req.user?.id || ''), username: getOperator(req), action: 'delete', module: 'reimbursement', targetId: id, targetName: `${info.applicant || ''}的${info.reimburseType || ''}报销`, detail: `删除报销申请: ${info.reimburseType || ''}报销`, ipAddress: req.ip });
    res.json({ success: true, message: '报销申请删除成功' });
  } catch (error) {
    console.error('删除报销申请失败:', error);
    res.status(500).json({ success: false, message: '删除报销申请失败' });
  }
});

export default router;
