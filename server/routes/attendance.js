import express from 'express';
const router = express.Router();

import { createNotification, createOperationLog, getOperator } from '../utils/audit.js';
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
    const [applications] = await pool.execute('SELECT * FROM leave_applications ORDER BY createdAt DESC');
    res.json({ success: true, data: applications });
  } catch (error) {
    console.error('获取请假申请失败:', error);
    res.status(500).json({ success: false, message: '获取请假申请失败' });
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
  const { leaveType, startDate, endDate, days, reason, approver, attachments } = req.body;
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
      'INSERT INTO leave_applications (applicant, leaveType, startDate, endDate, days, reason, approver, attachments, status, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [applicant, leaveType, startDate, endDate, days, reason, approver, attachments || null, '审批中', now]
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
    const [[permRecord]] = await pool.query('SELECT approver FROM leave_applications WHERE id = ?', [id]);
    if (!permRecord) {
      return res.status(404).json({ success: false, message: '请假申请不存在' });
    }
    if (!isManager && permRecord.approver !== operatorName) {
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

export default router;
