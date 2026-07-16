import express from 'express';
const router = express.Router();

import { createNotification, createOperationLog } from '../utils/audit.js';

// 获取出差列表
router.get('/business-trips', async (req, res) => {
  const { pool } = req.app.locals;
  try {
    const { applicantId, status, page = 1, pageSize = 10 } = req.query;

    let sql = 'SELECT * FROM business_trip_applications WHERE 1=1';
    const params = [];

    if (applicantId) {
      sql += ' AND applicant_id = ?';
      params.push(applicantId);
    }

    if (status) {
      sql += ' AND status = ?';
      params.push(status);
    }

    sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(pageSize), (parseInt(page) - 1) * parseInt(pageSize));

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
    const {
      destination, tripType, startDate, endDate, purpose, itinerary,
      estimatedCost, costBreakdown, accommodation, transport,
      accompanyPersons, isUrgent, applicantId, approverId
    } = req.body;

    const [employees] = await pool.execute(
      'SELECT * FROM employees WHERE id = ?',
      [applicantId]
    );

    if (employees.length === 0) {
      return res.status(400).json({ success: false, message: '申请人不存在' });
    }

    const applicant = employees[0];

    let approverName = null;
    if (approverId) {
      const [approvers] = await pool.execute('SELECT * FROM employees WHERE id = ?', [approverId]);
      if (approvers.length > 0) approverName = approvers[0].name;
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;

    const date = new Date();
    const year = date.getFullYear();
    const [countResult] = await pool.execute(
      'SELECT COUNT(*) as count FROM business_trip_applications WHERE YEAR(created_at) = ?',
      [year]
    );
    const sequence = String(countResult[0].count + 1).padStart(4, '0');
    const tripCode = `TRIP-${year}-${sequence}`;

    const [result] = await pool.execute(
      `INSERT INTO business_trip_applications 
       (trip_code, applicant_id, applicant_name, department, destination, trip_type,
        start_date, end_date, days, purpose, itinerary, estimated_cost, cost_breakdown,
        accommodation, transport, accompany_persons, is_urgent, status, current_step, approver, created_at, updated_at) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', 1, ?, NOW(), NOW())`,
      [
        tripCode, applicantId, applicant.name, applicant.department, destination, tripType,
        startDate, endDate, days, purpose, JSON.stringify(itinerary || []), estimatedCost,
        JSON.stringify(costBreakdown || {}), accommodation, transport,
        JSON.stringify(accompanyPersons || []), isUrgent ? 1 : 0, approverName
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
    const [trips] = await pool.execute(
      'SELECT * FROM business_trip_applications WHERE id = ?',
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
    const { action, comment, approverId, forwardTo } = req.body;

    const [trips] = await pool.execute(
      'SELECT * FROM business_trip_applications WHERE id = ?',
      [id]
    );

    if (trips.length === 0) {
      return res.status(404).json({ success: false, message: '出差申请不存在' });
    }

    const trip = trips[0];

    if (forwardTo) {
      const currentApprover = trip.approver || '';
      const resultText = action === 'agree' ? '批准' : action === 'reject' ? '拒绝' : '';
      const intermediateResult = resultText ? `${currentApprover}:${resultText}` : null;
      const newComment = trip.comment
        ? `${trip.comment}\n---\n${currentApprover}: ${comment || ''}`
        : comment || null;
      await pool.execute(
        'UPDATE business_trip_applications SET comment = ?, result = ?, approver = ?, updated_at = NOW() WHERE id = ?',
        [newComment, intermediateResult, forwardTo, id]
      );
      await createNotification(pool, {
        userId: trip.applicant_name,
        title: '出差申请已转发',
        content: `您的${trip.destination}出差申请(${trip.trip_code})已转发至总经理审批`,
        type: 'approval',
        relatedId: parseInt(id),
        relatedType: 'business_trip'
      });
      return res.json({ success: true, message: '已转发至总经理' });
    }

    const [approvers] = await pool.execute(
      'SELECT * FROM employees WHERE id = ?',
      [approverId]
    );

    if (approvers.length === 0) {
      return res.status(400).json({ success: false, message: '审批人不存在' });
    }

    const approver = approvers[0];

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

// 删除出差申请
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

    await pool.execute(
      'DELETE FROM business_trip_applications WHERE id = ?',
      [id]
    );

    res.json({ success: true, message: '出差申请删除成功' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
