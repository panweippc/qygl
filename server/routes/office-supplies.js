import express from 'express';
const router = express.Router();

import { createNotification, createOperationLog, getOperator } from '../utils/audit.js';
import { getRealName } from '../utils/identity.js';

// 办公用品数据访问控制：普通员工只看自己
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
    if (['系统管理员', '总经理', '行政经理', '办公室主任', '人事经理'].includes(roleName) || /总经理/.test(position)) return true;
    return false;
  } catch (e) { return false; }
};

router.get('/office-supplies', async (req, res) => {
  try {
    const { pool } = req.app.locals;
    const isManager = await isManagerUser(req);
    if (isManager) {
      const [applications] = await pool.execute('SELECT * FROM office_supplies_applications ORDER BY createdAt DESC');
      return res.json({ success: true, data: applications });
    }
    const name = getRealName(req);
    const [applications] = await pool.execute('SELECT * FROM office_supplies_applications WHERE applicant = ? ORDER BY createdAt DESC', [name]);
    res.json({ success: true, data: applications });
  } catch (error) {
    console.error('获取办公用品申请失败:', error);
    res.status(500).json({ success: false, message: '获取办公用品申请失败' });
  }
});

router.post('/office-supplies', async (req, res) => {
  const { itemName, quantity, reason, approver } = req.body;
  // 安全加固：申请人身份一律从 JWT token 解析，忽略请求体 applicant，防伪造
  const applicant = getRealName(req);
  if (!applicant) {
    return res.status(401).json({ success: false, message: '未登录，无法提交申请' });
  }
  if (!itemName || !quantity) {
    return res.status(400).json({ success: false, message: '物品名称和数量不能为空' });
  }
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
    // 安全加固：仅当前审批人或管理角色可审批，防越权
    const operatorName = getRealName(req);
    const isManager = await isManagerUser(req);
    const [[current]] = await pool.query('SELECT approver, comment as oldComment, result as oldResult FROM office_supplies_applications WHERE id = ?', [id]);
    if (!current) {
      return res.status(404).json({ success: false, message: '办公用品申请不存在' });
    }
    if (!isManager && current.approver !== operatorName) {
      return res.status(403).json({ success: false, message: '您不是该申请的审批人，无权限操作' });
    }
    const currentApprover = current?.approver || '';
    const accumulatedResult = current?.oldResult && current.oldResult.includes(':')
      ? `${current.oldResult};${currentApprover}:${result}`
      : `${currentApprover}:${result}`;
    const newComment = current?.oldComment
      ? `${current.oldComment}\n---\n${currentApprover}: ${comment || ''}`
      : `${currentApprover}: ${comment || ''}`;
    await pool.execute(
      'UPDATE office_supplies_applications SET comment = ?, result = ?, status = ? WHERE id = ?',
      [newComment, accumulatedResult, status, id]
    );

    const [[app]] = await pool.query('SELECT applicant, itemName, quantity FROM office_supplies_applications WHERE id = ?', [id]);
    if (app) {
      const actionLabel = result === '批准' ? '已通过' : result === '拒绝' ? '被拒绝' : '已更新';
      await createNotification(pool, { userId: app.applicant, title: `办公用品申请${actionLabel}`, content: `您申请的${app.itemName}x${app.quantity}${actionLabel}`, type: 'approval' });
      await createOperationLog(pool, { username: getOperator(req), action: result === '批准' ? 'approve' : result === '拒绝' ? 'reject' : 'update', module: 'office_supplies', targetName: `${app.applicant}的${app.itemName}`, detail: comment || '' });
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
