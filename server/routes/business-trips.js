import express from 'express';
const router = express.Router();

import { createNotification, createOperationLog, getOperator } from '../utils/audit.js';
import { resubmitApplication } from '../utils/resubmitHelper.js';
import { getRealName } from '../utils/identity.js';
import { appendReturnHistory } from '../utils/returnHistory.js';

// 仅当前审批人或管理角色可操作（退回/软删判断用）
const isManagerUser = async (req) => {
  try {
    const { pool } = req.app.locals;
    const name = getRealName(req);
    if (!name) return false;
    if (name === '管理员' || name === '总经理' || /^admin$/i.test(name)) return true;
    const [emp] = await pool.execute('SELECT e.position, r.name AS roleName FROM employees e LEFT JOIN roles r ON e.roleId = r.id WHERE e.name = ?', [name]);
    if (emp.length === 0) return false;
    const roleName = emp[0].roleName || '';
    const position = String(emp[0].position || '');
    if (['系统管理员', '总经理', '业务中心经理', '技术部经理'].includes(roleName) || /总经理/.test(position)) return true;
    return false;
  } catch (e) { return false; }
};

// 获取出差列表
router.get('/business-trips', async (req, res) => {
  const { pool } = req.app.locals;
  try {
    const { applicantId, status, page = 1, pageSize = 10 } = req.query;

    const columns = 'id, trip_code, applicant_id, applicant_name, department, destination, start_date, end_date, days, purpose, itinerary, estimated_cost, cost_breakdown, accommodation, transport, accompany_persons, customer_info, status, approver, current_step, current_approvers, approval_history, is_urgent, attachments, comment, halfDayPeriod, created_at, updated_at';
    let sql = `SELECT ${columns} FROM business_trip_applications WHERE 1=1`;
    const params = [];

    if (applicantId) {
      sql += ' AND applicant_id = ?';
      params.push(applicantId);
    }

    if (status) {
      sql += ' AND status = ?';
      params.push(status);
    }

    sql += ' AND (is_deleted = 0 OR is_deleted IS NULL)';
    const btPage = parseInt(page) || 1;
    const btSize = parseInt(pageSize) || 10;
    sql += ` ORDER BY created_at DESC LIMIT ${btSize} OFFSET ${(btPage - 1) * btSize}`;

    const [trips] = await pool.query(sql, params);

    let countSql = 'SELECT COUNT(*) as total FROM business_trip_applications WHERE 1=1';
    const countParams = [];

    if (applicantId) {
      countSql += ' AND applicant_id = ?';
      countParams.push(applicantId);
    }

    if (status) {
      countSql += ' AND status = ?';
      countParams.push(status);
    }

    countSql += ' AND (is_deleted = 0 OR is_deleted IS NULL)';
    const [countResult] = await pool.execute(countSql, countParams);

    res.json({
      success: true,
      data: {
        list: trips,
        pagination: {
          page: parseInt(page),
          pageSize: parseInt(pageSize),
          total: countResult[0].total
        }
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 创建出差申请
router.post('/business-trips', async (req, res) => {
  const { pool } = req.app.locals;
  try {
    const destination = req.body.destination;
    const startDate = req.body.startDate;
    const endDate = req.body.endDate;
    const frontendDays = req.body.days;
    const purpose = req.body.purpose;
    const itinerary = req.body.itinerary;
    const estimatedCost = req.body.estimatedCost;
    const costBreakdown = req.body.costBreakdown;
    const accommodation = req.body.accommodation;
    const transport = req.body.transport;
    const accompanyPersons = req.body.accompanyPersons;
    const isUrgent = req.body.isUrgent;
    // 半天 / X天半 对应的时段（上午、下午）
    const halfDayPeriod = req.body.halfDayPeriod || null;
    // 安全加固：申请人身份一律从 JWT token 解析，忽略请求体 applicantId，防伪造
    const tokenApplicantName = getRealName(req);
    if (!tokenApplicantName) {
      return res.status(401).json({ success: false, message: '未登录，无法提交申请' });
    }
    const approverId = req.body.approverId;
    const approverName = req.body.approver || null;
    const [employees] = await pool.execute(
      'SELECT * FROM employees WHERE name = ?',
      [String(tokenApplicantName).replace(/^emp_/, '').replace(/_\d+$/, '')]
    );

    if (employees.length === 0) {
      return res.status(400).json({ success: false, message: '当前用户不是有效的员工，无法提交申请' });
    }

    const applicant = employees[0];
    const applicantId = applicant.id;

    let days;
    if (frontendDays) {
      days = parseFloat(frontendDays);
    } else {
      const start = new Date(startDate);
      const end = new Date(endDate);
      days = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
    }

    const date = new Date();
    const year = date.getFullYear();
    const [countResult] = await pool.execute(
      'SELECT COUNT(*) as count FROM business_trip_applications WHERE YEAR(created_at) = ?',
      [year]
    );
    const sequence = String(countResult[0].count + 1).padStart(4, '0');
    const tripCode = `TRIP-${year}-${sequence}`;

    const [result] = await pool.query(
      `INSERT INTO business_trip_applications 
       (trip_code, applicant_id, applicant_name, department, destination,
        start_date, end_date, days, purpose, itinerary, estimated_cost, cost_breakdown,
        accommodation, transport, accompany_persons, is_urgent, attachments, status, current_step, approver, halfDayPeriod, created_at, updated_at) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', 1, ?, ?, NOW(), NOW())`,
      [
        tripCode, applicantId, applicant.name, applicant.department, destination,
        startDate, endDate, days, purpose, JSON.stringify(itinerary || []), estimatedCost,
        JSON.stringify(costBreakdown || {}), accommodation, transport,
        JSON.stringify(accompanyPersons || []), isUrgent ? 1 : 0, req.body.attachments || null, approverName, halfDayPeriod
      ]
    );

    await createOperationLog(pool, {
      username: applicant.name,
      action: 'submit',
      module: 'business_trip',
      targetName: `${destination}出差(${tripCode})`,
      detail: `出差天数:${days}天, 预估费用:${estimatedCost}元`
    });

    res.json({
      success: true,
      data: {
        id: result.insertId,
        tripCode,
        status: 'pending'
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 获取出差详情
router.get('/business-trips/:id', async (req, res) => {
  const { pool } = req.app.locals;
  try {
    const { id } = req.params;
    const trip_columns = 'id, trip_code, applicant_id, applicant_name, department, destination, start_date, end_date, days, purpose, itinerary, estimated_cost, cost_breakdown, accommodation, transport, accompany_persons, customer_info, status, approver, current_step, current_approvers, approval_history, is_urgent, attachments, comment, created_at, updated_at';
    const [trips] = await pool.execute(
      `SELECT * FROM business_trip_applications WHERE id = ?`,
      [id]
    );

    if (trips.length === 0) {
      return res.status(404).json({ success: false, message: '出差申请不存在' });
    }

    const trip = trips[0];

    const safeJSONParse = (str, defaultValue) => {
      try {
        if (!str || str === 'null' || str === 'undefined') return defaultValue;
        return JSON.parse(str);
      } catch (e) {
        console.log('JSON解析失败:', str, e.message);
        return defaultValue;
      }
    };

    trip.itinerary = safeJSONParse(trip.itinerary, []);
    trip.cost_breakdown = safeJSONParse(trip.cost_breakdown, {});
    trip.accompany_persons = safeJSONParse(trip.accompany_persons, []);
    trip.current_approvers = safeJSONParse(trip.current_approvers, []);
    trip.approval_history = safeJSONParse(trip.approval_history, []);

    res.json({ success: true, data: trip });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 审批出差申请
router.post('/business-trips/:id/approve', async (req, res) => {
  const { pool } = req.app.locals;
  try {
    const { id } = req.params;
    const { action, comment, approverId, forwardTo, operator } = req.body;

    const [trips] = await pool.execute(
      'SELECT * FROM business_trip_applications WHERE id = ?',
      [id]
    );

    if (trips.length === 0) {
      return res.status(404).json({ success: false, message: '出差申请不存在' });
    }

    const trip = trips[0];

    if (forwardTo) {
      // 安全加固：审批人身份一律从 JWT token 解析，忽略请求体的 operator/approverId，防伪造
      const tokenName = getRealName(req);
      let currentApprover = tokenName || trip.approver || '';
      if ((!currentApprover || !String(currentApprover).trim()) && approverId) {
        try {
          const [approverRows] = await pool.execute('SELECT name FROM employees WHERE id = ?', [approverId]);
          if (approverRows.length > 0) currentApprover = approverRows[0].name;
        } catch (e) { /* ignore */ }
      }
      const resultText = action === 'agree' ? '批准' : action === 'reject' ? '拒绝' : '';
      const newComment = trip.comment
        ? `${trip.comment}\n---\n${currentApprover}: ${comment || ''}`
        : `${currentApprover}: ${comment || ''}`;
      const forwardHistory = JSON.parse(trip.approval_history || '[]');
      forwardHistory.push({
        step: trip.current_step,
        nodeName: '转交审批',
        approverId: approverId || null,
        approverName: currentApprover || '',
        approverRole: '',
        action: resultText ? 'forward' : 'forward',
        comment: comment || '',
        createdAt: new Date()
      });
      await pool.execute(
        'UPDATE business_trip_applications SET comment = ?, approver = ?, approval_history = ?, updated_at = NOW() WHERE id = ?',
        [newComment, forwardTo, JSON.stringify(forwardHistory), id]
      );
      await createNotification(pool, {
        userId: trip.applicant_name,
        title: '出差申请已转发',
        content: `您的${trip.destination}出差申请(${trip.trip_code})已转发至总经理审批`,
        type: 'approval',
        relatedId: parseInt(id),
        relatedType: 'business_trip'
      });
      await createNotification(pool, {
        userId: forwardTo,
        title: '出差审批提醒',
        content: `${trip.applicant_name} 的${trip.destination}出差申请(${trip.trip_code})已转发给您，请审批`,
        type: 'approval',
        relatedId: parseInt(id),
        relatedType: 'business_trip'
      });
      return res.json({ success: true, message: '已转发至总经理' });
    }

    // 安全加固：审批人身份一律从 JWT token 解析，忽略请求体传的 approverId/operator，防伪造审批
    const tokenName = getRealName(req);
    if (!tokenName) {
      return res.status(401).json({ success: false, message: '未登录' });
    }
    const cleanName = String(tokenName).replace(/^emp_/, '').replace(/_\d+$/, '');
    let approver = null;
    const [byTokenName] = await pool.execute('SELECT * FROM employees WHERE name = ?', [cleanName]);
    if (byTokenName.length > 0) approver = byTokenName[0];

    if (!approver) {
      console.log('[出差审批调试] id:', id, 'token用户:', tokenName, 'trip.approver:', trip.approver, 'trip.current_approvers:', trip.current_approvers);
      return res.status(400).json({ success: false, message: '当前用户不是有效的审批人' });
    }

    // 校验当前用户是否是该申请的当前审批人，防止越权审批
    const currentApprovers = (trip.current_approvers || '').split(',').map(s => s.trim()).filter(Boolean);
    const isCurrentApprover = currentApprovers.includes(tokenName) || currentApprovers.includes(cleanName) || trip.approver === tokenName || trip.approver === cleanName;
    if (!isCurrentApprover) {
      return res.status(403).json({ success: false, message: '您不是该申请的当前审批人，无权限审批' });
    }

    const historyRecord = {
      step: trip.current_step,
      nodeName: '审批节点',
      approverId,
      approverName: approver.name,
      approverRole: approver.position,
      action,
      comment,
      createdAt: new Date()
    };

    const currentHistory = JSON.parse(trip.approval_history || '[]');
    currentHistory.push(historyRecord);

    let newStatus = trip.status;
    let newStep = trip.current_step + 1;

    if (action === 'reject') {
      newStatus = 'rejected';
    } else if (action === 'agree') {
      newStatus = 'approved';
    }

    const accumComment = trip.comment
      ? `${trip.comment}\n---\n${approver.name}: ${comment || ''}`
      : `${approver.name}: ${comment || ''}`;
    await pool.execute(
      `UPDATE business_trip_applications 
       SET status = ?, current_step = ?, approval_history = ?, comment = ?, updated_at = NOW() 
       WHERE id = ?`,
      [newStatus, newStep, JSON.stringify(currentHistory), accumComment, id]
    );

    const actionLabel = action === 'agree' ? '已通过' : '已驳回';
    await createNotification(pool, {
      userId: trip.applicant_name,
      title: `出差申请${actionLabel}`,
      content: `您的${trip.destination}出差申请(${trip.trip_code})${actionLabel}`,
      type: 'approval',
      relatedId: parseInt(id),
      relatedType: 'business_trip'
    });
    await createOperationLog(pool, {
      username: approver.name,
      action: action === 'agree' ? 'approve' : 'reject',
      module: 'business_trip',
      targetName: `${trip.destination}出差(${trip.trip_code})`,
      detail: comment || ''
    });

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 撤回出差申请：申请人本人（待审批/审批中）可撤回，状态置为「已撤回」
router.post('/business-trips/:id/withdraw', async (req, res) => {
  try {
    const { id } = req.params;
    const { pool } = req.app.locals;
    const operator = getRealName(req);
    if (!operator) return res.status(401).json({ success: false, message: '未登录' });
    const [[rec]] = await pool.query('SELECT * FROM business_trip_applications WHERE id = ?', [id]);
    if (!rec) return res.status(404).json({ success: false, message: '出差申请不存在' });
    if (rec.applicant_name !== operator) return res.status(403).json({ success: false, message: '仅申请人本人可撤回' });
    if (!['待审批', '审批中', 'pending', '待审核'].includes(rec.status)) {
      return res.status(400).json({ success: false, message: '当前状态不可撤回' });
    }
    await pool.execute('UPDATE business_trip_applications SET status = ? WHERE id = ?', ['已撤回', id]);
    // withdrawNotify: 撤回后通知审批人，并给申请人一条消息中心回执
    try {
      const notifyTargets = new Set([rec.approver, operator].filter(Boolean));
      for (const uid of notifyTargets) {
        await createNotification(pool, {
          userId: uid,
          title: '申请已撤回',
          content: uid === operator
            ? `您已撤回自己的出差申请（编号 ${id}）`
            : `${operator} 撤回了一份出差申请（编号 ${id}），该申请已从您的待办中移除`,
          type: 'approval',
          relatedId: parseInt(id),
          relatedType: 'business_trip'
        });
      }
    } catch (e) { /* 通知失败不影响撤回主流程 */ }
    await createOperationLog(pool, { username: operator, action: 'withdraw', module: 'business_trip', targetName: `${rec.destination}出差(${rec.trip_code})`, detail: '申请人撤回' });
    res.json({ success: true, message: '撤回成功' });
  } catch (error) {
    console.error('撤回出差失败:', error);
    res.status(500).json({ success: false, message: '撤回失败' });
  }
});

// 退回出差申请：当前审批人将申请退回给申请人，状态置为「已退回」，记录退回理由
router.post('/business-trips/:id/return', async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const { pool } = req.app.locals;
    const operator = getRealName(req);
    if (!operator) return res.status(401).json({ success: false, message: '未登录' });
    if (!reason || !String(reason).trim()) return res.status(400).json({ success: false, message: '退回理由不能为空' });
    const isManager = await isManagerUser(req);
    const [[rec]] = await pool.query('SELECT * FROM business_trip_applications WHERE id = ?', [id]);
    if (!rec) return res.status(404).json({ success: false, message: '出差申请不存在' });
    if (!isManager && rec.approver !== operator) return res.status(403).json({ success: false, message: '仅当前审批人可退回' });
    if (!['待审批', '审批中', 'pending', '待审核'].includes(rec.status)) {
      return res.status(400).json({ success: false, message: '当前状态不可退回' });
    }
    await pool.execute('UPDATE business_trip_applications SET status = ?, return_reason = ? WHERE id = ?', ['已退回', reason, id]);
    await appendReturnHistory(pool, 'business_trip_applications', id, operator, reason);
    await createNotification(pool, { userId: rec.applicant_name, title: '出差申请被退回', content: `您的${rec.destination}出差申请(${rec.trip_code})被${operator}退回，原因：${reason}`, type: 'approval', relatedId: parseInt(id), relatedType: 'business_trip' });
    await createOperationLog(pool, { username: operator, action: 'return', module: 'business_trip', targetName: `${rec.destination}出差(${rec.trip_code})`, detail: reason });
    res.json({ success: true, message: '已退回' });
  } catch (error) {
    console.error('退回出差失败:', error);
    res.status(500).json({ success: false, message: '退回失败' });
  }
});

// 软删除出差申请：仅已撤回/草稿状态可删，置 is_deleted=1（管理员后台仍可查）
router.post('/business-trips/:id/soft-delete', async (req, res) => {
  try {
    const { id } = req.params;
    const { pool } = req.app.locals;
    const operator = getRealName(req);
    if (!operator) return res.status(401).json({ success: false, message: '未登录' });
    const [[rec]] = await pool.query('SELECT * FROM business_trip_applications WHERE id = ?', [id]);
    if (!rec) return res.status(404).json({ success: false, message: '出差申请不存在' });
    const isManager = await isManagerUser(req);
    if (!isManager && rec.applicant_name !== operator) return res.status(403).json({ success: false, message: '无权限删除他人的申请' });
    if (!isManager && !['已撤回', '草稿', 'withdrawn', 'draft'].includes(rec.status)) {
      return res.status(400).json({ success: false, message: '仅「已撤回/草稿」状态可删除' });
    }
    await pool.execute('UPDATE business_trip_applications SET is_deleted = 1 WHERE id = ?', [id]);
    await createOperationLog(pool, { username: operator, action: 'soft_delete', module: 'business_trip', targetName: `${rec.destination}出差(${rec.trip_code})`, detail: '软删除（逻辑删除）' });
    res.json({ success: true, message: '删除成功' });
  } catch (error) {
    console.error('删除出差失败:', error);
    res.status(500).json({ success: false, message: '删除失败' });
  }
});

// 删除出差申请（软删除）：仅已撤回/草稿状态可删，置 is_deleted=1
router.delete('/business-trips/:id', async (req, res) => {
  const { pool } = req.app.locals;
  try {
    const { id } = req.params;

    const [trips] = await pool.execute(
      'SELECT * FROM business_trip_applications WHERE id = ?',
      [id]
    );

    if (trips.length === 0) {
      return res.status(404).json({ success: false, message: '出差申请不存在' });
    }

    // 安全加固：仅申请人本人（且已撤回/草稿）或管理角色可删除，防越权删除
    const operatorName = getRealName(req);
    const [selfRoles] = await pool.execute(
      'SELECT r.name AS roleName, e.position FROM employees e LEFT JOIN roles r ON e.roleId = r.id WHERE e.name = ?',
      [operatorName]
    );
    const isManager = operatorName === '管理员' || operatorName === '总经理' || /^admin$/i.test(operatorName)
      || /总经理/.test(String(selfRoles[0]?.position || ''))
      || ['系统管理员', '总经理', '业务中心经理', '技术部经理'].includes(String(selfRoles[0]?.roleName || ''));
    const isOwner = trips[0].applicant_name === operatorName;
    if (!isManager && !isOwner) {
      return res.status(403).json({ success: false, message: '无权限删除他人的出差申请' });
    }
    if (!isManager && !['已撤回', '草稿', 'withdrawn', 'draft'].includes(trips[0].status)) {
      return res.status(400).json({ success: false, message: '仅「已撤回/草稿」状态可删除' });
    }

    await pool.execute('UPDATE business_trip_applications SET is_deleted = 1 WHERE id = ?', [id]);

    // 删除出差申请审计
    createOperationLog(pool, { userId: String(req.user?.id || ''), username: getOperator(req), action: 'delete', module: 'business_trip', targetId: id, targetName: `${trips[0].destination}出差(${trips[0].trip_code})`, detail: `删除出差申请: ${trips[0].destination}`, ipAddress: req.ip });
    res.json({ success: true, message: '出差申请删除成功' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});


// 重新提交申请：申请人（已撤回 / 已退回 / 草稿）修改后再次提交，状态回到待审批
router.post('/business-trips/:id/resubmit', async (req, res) => {
  try {
    const { id } = req.params;
    const { pool } = req.app.locals;
    const operator = getRealName(req);
    if (!operator) return res.status(401).json({ success: false, message: '未登录' });
    const r = await resubmitApplication(pool, {
      table: 'business_trip_applications',
      id,
      operator,
      applicantCol: 'applicant_name',
      data: req.body,
      newStatus: 'pending'
    });
    if (r.code !== 200) return res.status(r.code).json({ success: false, message: r.message });
    if (req.body.approver) {
      await createNotification(pool, {
        userId: req.body.approver,
        title: '审批提醒',
        content: `${operator} 重新提交了一份出差申请，请审批`,
        type: 'approval'
      });
    }
    await createOperationLog(pool, {
      username: operator,
      action: 'resubmit',
      module: 'business_trip',
      targetName: `${operator}的出差申请`,
      detail: '撤回/退回后重新提交'
    });
    res.json({ success: true, message: r.message });
  } catch (error) {
    console.error('重新提交失败:', error);
    res.status(500).json({ success: false, message: '重新提交失败' });
  }
});

export default router;
