import express from 'express';
const router = express.Router();

import { createNotification, createOperationLog, getOperator } from '../utils/audit.js';
import { resubmitApplication } from '../utils/resubmitHelper.js';
import { getRealName } from '../utils/identity.js';

// 请假审批：仅当前审批人或管理角色可操作
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
    if (['系统管理员', '总经理', '人事经理', '人事专员', '部门经理'].includes(roleName) || /总经理/.test(position)) return true;
    return false;
  } catch (e) { return false; }
};

// 获取请假申请列表
router.get('/leave-applications', async (req, res) => {
  try {
    const { pool } = req.app.locals;
    const [applications] = await pool.execute('SELECT * FROM leave_applications WHERE is_deleted = 0 OR is_deleted IS NULL ORDER BY createdAt DESC');
    res.json({ success: true, data: applications });
  } catch (error) {
    console.error('获取请假申请失败:', error);
    res.status(500).json({ success: false, message: '获取请假申请失败' });
  }
});

// 撤回请假申请：申请人本人（审批中）可撤回
router.post('/leave-applications/:id/withdraw', async (req, res) => {
  try {
    const { id } = req.params;
    const { pool } = req.app.locals;
    const operator = getRealName(req);
    if (!operator) return res.status(401).json({ success: false, message: '未登录' });
    const [[rec]] = await pool.query('SELECT applicant, status FROM leave_applications WHERE id = ?', [id]);
    if (!rec) return res.status(404).json({ success: false, message: '请假申请不存在' });
    if (rec.applicant !== operator) return res.status(403).json({ success: false, message: '仅申请人本人可撤回' });
    if (!['待审批', '审批中', 'pending', '待审核'].includes(rec.status)) {
      return res.status(400).json({ success: false, message: '当前状态不可撤回' });
    }
    await pool.execute('UPDATE leave_applications SET status = ?, result = ? WHERE id = ?', ['已撤回', '已撤回', id]);
    await createOperationLog(pool, { username: operator, action: 'withdraw', module: 'attendance', targetName: `${rec.leaveType || ''}请假`, detail: '申请人撤回' });
    res.json({ success: true, message: '撤回成功' });
  } catch (error) {
    console.error('撤回请假失败:', error);
    res.status(500).json({ success: false, message: '撤回失败' });
  }
});

// 退回请假申请：当前审批人退回，记录理由
router.post('/leave-applications/:id/return', async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const { pool } = req.app.locals;
    const operator = getRealName(req);
    if (!operator) return res.status(401).json({ success: false, message: '未登录' });
    if (!reason || !String(reason).trim()) return res.status(400).json({ success: false, message: '退回理由不能为空' });
    const isManager = await isManagerUser(req);
    const [[rec]] = await pool.query('SELECT applicant, approver, status FROM leave_applications WHERE id = ?', [id]);
    if (!rec) return res.status(404).json({ success: false, message: '请假申请不存在' });
    if (!isManager && rec.approver !== operator) return res.status(403).json({ success: false, message: '仅当前审批人可退回' });
    if (!['待审批', '审批中', 'pending', '待审核'].includes(rec.status)) {
      return res.status(400).json({ success: false, message: '当前状态不可退回' });
    }
    await pool.execute('UPDATE leave_applications SET status = ?, result = ?, return_reason = ? WHERE id = ?', ['已退回', '已退回', reason, id]);
    await createNotification(pool, { userId: rec.applicant, title: '请假申请被退回', content: `您的${rec.leaveType || ''}请假被${operator}退回，原因：${reason}`, type: 'approval' });
    await createOperationLog(pool, { username: operator, action: 'return', module: 'attendance', targetName: `${rec.leaveType || ''}请假`, detail: reason });
    res.json({ success: true, message: '已退回' });
  } catch (error) {
    console.error('退回请假失败:', error);
    res.status(500).json({ success: false, message: '退回失败' });
  }
});

// 软删除请假申请：仅已撤回/草稿可删
router.post('/leave-applications/:id/soft-delete', async (req, res) => {
  try {
    const { id } = req.params;
    const { pool } = req.app.locals;
    const operator = getRealName(req);
    if (!operator) return res.status(401).json({ success: false, message: '未登录' });
    const [[rec]] = await pool.query('SELECT applicant, status FROM leave_applications WHERE id = ?', [id]);
    if (!rec) return res.status(404).json({ success: false, message: '请假申请不存在' });
    const isManager = await isManagerUser(req);
    if (!isManager && rec.applicant !== operator) return res.status(403).json({ success: false, message: '无权限删除他人的申请' });
    if (!isManager && !['已撤回', '草稿', 'withdrawn', 'draft'].includes(rec.status)) {
      return res.status(400).json({ success: false, message: '仅「已撤回/草稿」状态可删除' });
    }
    await pool.execute('UPDATE leave_applications SET is_deleted = 1 WHERE id = ?', [id]);
    await createOperationLog(pool, { username: operator, action: 'soft_delete', module: 'attendance', targetName: `${rec.leaveType || ''}请假`, detail: '软删除（逻辑删除）' });
    res.json({ success: true, message: '删除成功' });
  } catch (error) {
    console.error('删除请假失败:', error);
    res.status(500).json({ success: false, message: '删除失败' });
  }
});

// 获取单个请假申请
router.get('/leave-applications/:id', async (req, res) => {
  try {
    const { pool } = req.app.locals;
    const [applications] = await pool.execute('SELECT * FROM leave_applications WHERE id = ?', [req.params.id]);
    if (applications.length === 0) {
      return res.status(404).json({ success: false, message: '请假申请不存在' });
    }
    res.json({ success: true, data: applications[0] });
  } catch (error) {
    console.error('获取请假申请详情失败:', error);
    res.status(500).json({ success: false, message: '获取请假申请详情失败' });
  }
});

// 提交请假申请
router.post('/leave-applications', async (req, res) => {
  const { leaveType, startDate, endDate, days, reason, approver, attachments, halfDayPeriod } = req.body;
  // 安全加固：申请人身份一律从 JWT token 解析，忽略请求体 applicant，防伪造
  const applicant = getRealName(req);
  if (!applicant) {
    return res.status(401).json({ success: false, message: '未登录，无法提交申请' });
  }
  if (!leaveType || !startDate || !endDate) {
    return res.status(400).json({ success: false, message: '请假类型和日期不能为空' });
  }
  try {
    const { pool } = req.app.locals;
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
    await pool.execute(
      'INSERT INTO leave_applications (applicant, leaveType, startDate, endDate, days, reason, approver, attachments, halfDayPeriod, status, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [applicant, leaveType, startDate, endDate, days, reason, approver, attachments || null, halfDayPeriod || null, '审批中', now]
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
    // 安全加固：仅当前审批人或管理角色可操作
    const operatorName = getRealName(req);
    const isManager = await isManagerUser(req);
    const [[permRecord]] = await pool.query('SELECT applicant, approver FROM leave_applications WHERE id = ?', [id]);
    if (!permRecord) {
      return res.status(404).json({ success: false, message: '请假申请不存在' });
    }
    // 允许申请人取消自己的申请；审批人/管理员可做任何操作
    const isApplicant = permRecord.applicant === operatorName;
    if (!isManager && permRecord.approver !== operatorName && !(result === '取消' && isApplicant)) {
      return res.status(403).json({ success: false, message: '您不是该请假的审批人，无权限操作' });
    }
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
        await createNotification(pool, {
          userId: forwardTo,
          title: '请假审批提醒',
          content: `${app.applicant} 的${app.leaveType}申请(${app.days}天)已转发给您，请审批`,
          type: 'approval',
        });
        await createOperationLog(pool, {
          username: getOperator(req),
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
          username: getOperator(req),
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
    // 删除前获取记录用于审计
    const [rows] = await pool.execute('SELECT applicant, leaveType FROM leave_applications WHERE id = ?', [id]);
    const info = rows[0] || {};
    await pool.execute('DELETE FROM leave_applications WHERE id = ?', [id]);
    // 删除请假申请审计
    createOperationLog(pool, { userId: String(req.user?.id || ''), username: getOperator(req), action: 'delete', module: 'attendance', targetId: id, targetName: `${info.applicant || ''}的${info.leaveType || ''}请假`, detail: `删除请假申请: ${info.leaveType || ''}请假`, ipAddress: req.ip });
    res.json({ success: true, message: '请假申请删除成功' });
  } catch (error) {
    console.error('删除请假申请失败:', error);
    res.status(500).json({ success: false, message: '删除请假申请失败' });
  }
});


// 重新提交申请：申请人（已撤回 / 已退回 / 草稿）修改后再次提交，状态回到待审批
router.post('/leave-applications/:id/resubmit', async (req, res) => {
  try {
    const { id } = req.params;
    const { pool } = req.app.locals;
    const operator = getRealName(req);
    if (!operator) return res.status(401).json({ success: false, message: '未登录' });
    const r = await resubmitApplication(pool, {
      table: 'leave_applications',
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
        content: `${operator} 重新提交了一份请假申请，请审批`,
        type: 'approval'
      });
    }
    await createOperationLog(pool, {
      username: operator,
      action: 'resubmit',
      module: 'leave',
      targetName: `${operator}的请假申请`,
      detail: '撤回/退回后重新提交'
    });
    res.json({ success: true, message: r.message });
  } catch (error) {
    console.error('重新提交失败:', error);
    res.status(500).json({ success: false, message: '重新提交失败' });
  }
});

export default router;
