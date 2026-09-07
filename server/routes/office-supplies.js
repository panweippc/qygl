import express from 'express';
const router = express.Router();

import { createNotification, createOperationLog, getOperator } from '../utils/audit.js';
import { resubmitApplication } from '../utils/resubmitHelper.js';
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
      const [applications] = await pool.execute('SELECT * FROM office_supplies_applications WHERE is_deleted = 0 OR is_deleted IS NULL ORDER BY createdAt DESC');
      return res.json({ success: true, data: applications });
    }
    const name = getRealName(req);
    const [applications] = await pool.execute('SELECT * FROM office_supplies_applications WHERE applicant = ? AND (is_deleted = 0 OR is_deleted IS NULL) ORDER BY createdAt DESC', [name]);
    res.json({ success: true, data: applications });
  } catch (error) {
    console.error('获取办公用品申请失败:', error);
    res.status(500).json({ success: false, message: '获取办公用品申请失败' });
  }
});

// 撤回办公用品申请：申请人本人（审批中）可撤回
router.post('/office-supplies/:id/withdraw', async (req, res) => {
  try {
    const { id } = req.params;
    const { pool } = req.app.locals;
    const operator = getRealName(req);
    if (!operator) return res.status(401).json({ success: false, message: '未登录' });
    const [[rec]] = await pool.query('SELECT applicant, status FROM office_supplies_applications WHERE id = ?', [id]);
    if (!rec) return res.status(404).json({ success: false, message: '办公用品申请不存在' });
    if (rec.applicant !== operator) return res.status(403).json({ success: false, message: '仅申请人本人可撤回' });
    if (!['待审批', '审批中', 'pending', '待审核'].includes(rec.status)) {
      return res.status(400).json({ success: false, message: '当前状态不可撤回' });
    }
    await pool.execute('UPDATE office_supplies_applications SET status = ?, result = ? WHERE id = ?', ['已撤回', '已撤回', id]);
    await createOperationLog(pool, { username: operator, action: 'withdraw', module: 'office_supplies', targetName: `${rec.itemName || ''}申请`, detail: '申请人撤回' });
    res.json({ success: true, message: '撤回成功' });
  } catch (error) {
    console.error('撤回办公用品失败:', error);
    res.status(500).json({ success: false, message: '撤回失败' });
  }
});

// 退回办公用品申请：当前审批人退回，记录理由
router.post('/office-supplies/:id/return', async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const { pool } = req.app.locals;
    const operator = getRealName(req);
    if (!operator) return res.status(401).json({ success: false, message: '未登录' });
    if (!reason || !String(reason).trim()) return res.status(400).json({ success: false, message: '退回理由不能为空' });
    const isManager = await isManagerUser(req);
    const [[rec]] = await pool.query('SELECT applicant, approver, status FROM office_supplies_applications WHERE id = ?', [id]);
    if (!rec) return res.status(404).json({ success: false, message: '办公用品申请不存在' });
    if (!isManager && rec.approver !== operator) return res.status(403).json({ success: false, message: '仅当前审批人可退回' });
    if (!['待审批', '审批中', 'pending', '待审核'].includes(rec.status)) {
      return res.status(400).json({ success: false, message: '当前状态不可退回' });
    }
    await pool.execute('UPDATE office_supplies_applications SET status = ?, result = ?, return_reason = ? WHERE id = ?', ['已退回', '已退回', reason, id]);
    await createNotification(pool, { userId: rec.applicant, title: '办公用品申请被退回', content: `您申请的${rec.itemName || ''}被${operator}退回，原因：${reason}`, type: 'approval' });
    await createOperationLog(pool, { username: operator, action: 'return', module: 'office_supplies', targetName: `${rec.itemName || ''}申请`, detail: reason });
    res.json({ success: true, message: '已退回' });
  } catch (error) {
    console.error('退回办公用品失败:', error);
    res.status(500).json({ success: false, message: '退回失败' });
  }
});

// 软删除办公用品申请：仅已撤回/草稿状态可删
router.post('/office-supplies/:id/soft-delete', async (req, res) => {
  try {
    const { id } = req.params;
    const { pool } = req.app.locals;
    const operator = getRealName(req);
    if (!operator) return res.status(401).json({ success: false, message: '未登录' });
    const [[rec]] = await pool.query('SELECT applicant, status FROM office_supplies_applications WHERE id = ?', [id]);
    if (!rec) return res.status(404).json({ success: false, message: '办公用品申请不存在' });
    const isManager = await isManagerUser(req);
    if (!isManager && rec.applicant !== operator) return res.status(403).json({ success: false, message: '无权限删除他人的申请' });
    if (!isManager && !['已撤回', '草稿', 'withdrawn', 'draft'].includes(rec.status)) {
      return res.status(400).json({ success: false, message: '仅「已撤回/草稿」状态可删除' });
    }
    await pool.execute('UPDATE office_supplies_applications SET is_deleted = 1 WHERE id = ?', [id]);
    await createOperationLog(pool, { username: operator, action: 'soft_delete', module: 'office_supplies', targetName: `${rec.itemName || ''}申请`, detail: '软删除（逻辑删除）' });
    res.json({ success: true, message: '删除成功' });
  } catch (error) {
    console.error('删除办公用品失败:', error);
    res.status(500).json({ success: false, message: '删除失败' });
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


// 重新提交申请：申请人（已撤回 / 已退回 / 草稿）修改后再次提交，状态回到待审批
router.post('/office-supplies/:id/resubmit', async (req, res) => {
  try {
    const { id } = req.params;
    const { pool } = req.app.locals;
    const operator = getRealName(req);
    if (!operator) return res.status(401).json({ success: false, message: '未登录' });
    const r = await resubmitApplication(pool, {
      table: 'office_supplies_applications',
      id,
      operator,
      applicantCol: 'applicant',
      data: req.body,
      newStatus: '审批中'
    });
    if (r.code !== 200) return res.status(r.code).json({ success: false, message: r.message });
    if (req.body.approver) {
      await createNotification(pool, {
        userId: req.body.approver,
        title: '审批提醒',
        content: `${operator} 重新提交了一份办公用品申请，请审批`,
        type: 'approval'
      });
    }
    await createOperationLog(pool, {
      username: operator,
      action: 'resubmit',
      module: 'office_supplies',
      targetName: `${operator}的办公用品申请`,
      detail: '撤回/退回后重新提交'
    });
    res.json({ success: true, message: r.message });
  } catch (error) {
    console.error('重新提交失败:', error);
    res.status(500).json({ success: false, message: '重新提交失败' });
  }
});

export default router;
