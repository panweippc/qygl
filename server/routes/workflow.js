/**
 * 工作流API路由
 */

import express from 'express';
import { createNotification, createOperationLog } from '../utils/audit.js';
import { getRealName } from '../utils/identity.js';
import { requireRole } from '../middleware/auth.js';

const router = express.Router();

// 从数据库按申请人名解析申请人记录（token 身份优先，请求体仅作回退且不可覆盖真实身份）
const resolveApplicantByName = async (pool, name) => {
  if (!name) return null;
  const [emp] = await pool.query('SELECT id, name FROM employees WHERE name = ?', [name]);
  return emp.length > 0 ? emp[0] : null;
};

/**
 * 根据审批人id或用户名解析员工记录。
 * 前端传的 approverId 来自 users 表 id，与 employees 表 id 可能不一致，
 * 故查不到时回退按用户名查询。
 */
const resolveApprover = async (pool, { approverId, operator }) => {
  if (approverId) {
    const [byId] = await pool.execute('SELECT * FROM employees WHERE id = ?', [approverId]);
    if (byId.length > 0) return byId[0];
  }
  let operatorName = String(operator || '').replace(/^emp_/, '').replace(/_\d+$/, '');
  if (operatorName) {
    const [byName] = await pool.execute('SELECT * FROM employees WHERE name = ?', [operatorName]);
    if (byName.length > 0) return byName[0];
  }
  return null;
};

/**
 * 项目申请API
 */

// 获取项目申请列表
router.get('/projects', async (req, res) => {
  try {
    const { pool } = req.app.locals;
    const { applicant, status } = req.query;

    let sql = 'SELECT * FROM project_applications WHERE 1=1';
    const params = [];

    if (applicant) {
      sql += ' AND applicant_name = ?';
      params.push(applicant);
    }

    if (status) {
      sql += ' AND status = ?';
      params.push(status);
    }

    sql += ' ORDER BY created_at DESC';

    // 仅当明确提供了 pageSize 参数时才分页
    const hasPagination = req.query.pageSize !== undefined;
    if (hasPagination) {
      const page = parseInt(req.query.page, 10) || 1;
      const pageSize = parseInt(req.query.pageSize, 10) || 10;
      sql += ' LIMIT ? OFFSET ?';
      params.push(pageSize, (page - 1) * pageSize);
    }

    const [projects] = await pool.query(sql, params);

    const formattedProjects = projects.map((project) => ({
      id: project.id,
      project_code: project.project_code || ('PRJ' + String(project.id).padStart(6, '0')),
      project_name: project.project_name || '',
      project_type: project.project_type || '',
      description: project.description || '',
      objectives: project.objectives || '',
      applicant_name: project.applicant_name || '',
      applicant_id: project.applicant_id || '',
      department: project.department || '',
      priority: project.priority || '中',
      budget: project.budget || 0,
      start_date: project.start_date || '',
      end_date: project.end_date || '',
      team_members: project.team_members || '',
      resources: project.resources || '',
      project_link: project.project_link || '',
      status: project.status || 'pending',
      current_step: project.current_step || 1,
      current_approvers: project.current_approvers || '',
      comment: project.comment || '',
      created_at: project.created_at || new Date(),
      updated_at: project.updated_at || new Date()
    }));

    const responseData = { list: formattedProjects };

    if (hasPagination) {
      let countSql = 'SELECT COUNT(*) as total FROM project_applications WHERE 1=1';
      const countParams = [];

      if (applicant) {
        countSql += ' AND applicant_name = ?';
        countParams.push(applicant);
      }

      if (status) {
        countSql += ' AND status = ?';
        countParams.push(status);
      }

      const [countResult] = await pool.query(countSql, countParams);
      responseData.pagination = {
        page: parseInt(req.query.page, 10) || 1,
        pageSize: parseInt(req.query.pageSize, 10) || 10,
        total: countResult[0].total
      };
    }

    res.json({ success: true, data: responseData });
  } catch (error) {
    console.error('获取项目申请列表失败:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// 创建项目申请
router.post("/projects", async (req, res) => {
  try {
    const { pool } = req.app.locals;
    const {
      projectName,
      project_name,
      projectType,
      project_type,
      priority,
      budget,
      description,
      objectives,
      teamMembers,
      team_members,
      resources,
      projectLink,
      project_link,
      startDate,
      start_date,
      endDate,
      end_date,
      applicant,
      approver,
      applicantId,
      applicant_id,
      approverId,
      approver_id,
      applicantName,
      applicant_name
    } = req.body;

    // 安全加固：申请人身份一律从 JWT token 解析，忽略请求体传入的 applicant/applicantId/applicantName，防伪造
    const applicantNameVal = getRealName(req);
    if (!applicantNameVal) {
      return res.status(401).json({ success: false, message: '未登录，无法提交申请' });
    }
    const applicantEmpRow = await resolveApplicantByName(pool, applicantNameVal);
    const applicantIdVal = req.user?.id || applicantEmpRow?.id || applicantId || applicant_id;

    let approverIdVal = approverId || approver_id;
    let approverNameVal = approver;

    if (approverIdVal && !approverNameVal) {
      const [employees] = await pool.query("SELECT name FROM employees WHERE id = ?", [approverIdVal]);
      approverNameVal = employees.length > 0 ? employees[0].name : "";
    }

    const projectCode = 'PRJ' + String(Date.now()).slice(-6);
    const now = new Date();

    const [result] = await pool.query(
      `INSERT INTO project_applications
       (project_code, project_name, applicant_id, applicant_name, department, project_type, priority, budget, start_date, end_date, description, objectives, team_members, resources, project_link, status, current_step, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', 1, ?, ?)`,
      [
        projectCode,
        projectName || project_name || '',
        applicantIdVal || '',
        applicantNameVal || '未知申请人',
        '',
        projectType || project_type || '',
        priority || '中',
        budget || 0,
        startDate || start_date || null,
        endDate || end_date || null,
        description || '',
        objectives || '',
        JSON.stringify(teamMembers || team_members || []),
        resources || '',
        projectLink || project_link || '',
        now,
        now
      ]
    );

    // 审计：创建项目申请
    await createOperationLog(pool, {
      username: getRealName(req) || applicantNameVal || '系统',
      action: 'create',
      module: 'project',
      targetName: projectName || project_name || `项目申请(${projectCode})`,
      detail: `创建项目申请，提交给${approverNameVal || '未指定'}审批`
    });
    res.json({
      success: true,
      data: {
        id: result.insertId,
        status: 'pending'
      }
    });
  } catch (error) {
    console.error('创建项目申请失败:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// 获取项目申请详情
router.get('/projects/:id', async (req, res) => {
  try {
    const { pool } = req.app.locals;
    const { id } = req.params;

    const [projects] = await pool.query(
      'SELECT * FROM project_applications WHERE id = ?',
      [id]
    );

    if (projects.length === 0) {
      return res.status(404).json({ success: false, message: '项目申请不存在' });
    }

    res.json({ success: true, data: projects[0] });
  } catch (error) {
    console.error('获取项目申请失败:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// 审批项目
router.post('/projects/:id/approve', async (req, res) => {
  try {
    const { pool } = req.app.locals;
    const { id } = req.params;
    const { action, comment, approverId, forwardTo } = req.body;

    const [projects] = await pool.execute(
      'SELECT * FROM project_applications WHERE id = ?',
      [id]
    );

    if (projects.length === 0) {
      return res.status(404).json({ success: false, message: '项目不存在' });
    }

    const project = projects[0];

    if (forwardTo) {
      const currentApprover = project.approver || '';
      const newComment = project.comment
        ? `${project.comment}\n---\n${currentApprover}: ${comment || '已同意并转交'}`
        : `${currentApprover}: ${comment || '已同意并转交'}`;
      await pool.execute(
        'UPDATE project_applications SET comment = ?, approver = ?, updated_at = NOW() WHERE id = ?',
        [newComment, forwardTo, id]
      );
      await createNotification(pool, {
        userId: project.applicant_name,
        title: '项目申请已转交',
        content: `您的${project.project_name}项目申请(${project.project_code})已转交给 ${forwardTo} 审批`,
        type: 'approval',
        relatedId: parseInt(id),
        relatedType: 'project'
      });
      await createNotification(pool, {
        userId: forwardTo,
        title: '项目审批提醒',
        content: `${project.applicant_name} 的${project.project_name}项目申请(${project.project_code})已转交给您，请审批`,
        type: 'approval',
        relatedId: parseInt(id),
        relatedType: 'project'
      });
      await createOperationLog(pool, {
        username: getRealName(req) || currentApprover || '系统',
        action: 'forward',
        module: 'project',
        targetName: `${project.project_name}项目(${project.project_code})`,
        detail: comment || '',
        ipAddress: req.ip
      });
      return res.json({ success: true, message: '已转交审批' });
    }

    // 安全加固：审批人身份一律从 JWT token 解析，忽略请求体传的 approverId/operator，防伪造审批
    const currentUserName = getRealName(req);
    if (!currentUserName) {
      return res.status(401).json({ success: false, message: '未登录' });
    }
    const approver = await resolveApprover(pool, { operator: currentUserName });

    if (!approver) {
      return res.status(400).json({ success: false, message: '当前用户不是有效的审批人' });
    }

    // 校验当前用户是否是该申请的当前审批人，防止越权审批
    const currentApprovers = (project.current_approvers || '').split(',').map(s => s.trim()).filter(Boolean);
    const isCurrentApprover = currentApprovers.includes(currentUserName) || project.approver === currentUserName;
    if (!isCurrentApprover) {
      return res.status(403).json({ success: false, message: '您不是该申请的当前审批人，无权限审批' });
    }

    const historyRecord = {
      step: project.current_step,
      nodeName: '审批节点',
      approverId: approver.id,
      approverName: approver.name,
      approverRole: approver.position,
      action,
      comment,
      createdAt: new Date()
    };

    const currentHistory = JSON.parse(project.approval_history || '[]');
    currentHistory.push(historyRecord);

    let newStatus = project.status;
    let newStep = project.current_step + 1;

    if (action === 'reject') {
      newStatus = 'rejected';
    } else if (action === 'agree') {
      newStatus = 'approved';
    }

    const accumComment = project.comment
      ? `${project.comment}\n---\n${approver.name}: ${comment || ''}`
      : `${approver.name}: ${comment || ''}`;
    await pool.execute(
      `UPDATE project_applications 
       SET status = ?, current_step = ?, approval_history = ?, comment = ?, updated_at = NOW() 
       WHERE id = ?`,
      [newStatus, newStep, JSON.stringify(currentHistory), accumComment, id]
    );

    const actionLabel = action === 'agree' ? '已通过' : '已驳回';
    await createNotification(pool, {
      userId: project.applicant_name,
      title: `项目申请${actionLabel}`,
      content: `您的${project.project_name}项目申请(${project.project_code})${actionLabel}`,
      type: 'approval',
      relatedId: parseInt(id),
      relatedType: 'project'
    });
    await createOperationLog(pool, {
      username: approver.name,
      action: action === 'agree' ? 'approve' : 'reject',
      module: 'project',
      targetName: `${project.project_name}项目(${project.project_code})`,
      detail: comment || '',
      ipAddress: req.ip
    });

    res.json({ success: true });
  } catch (error) {
    console.error('审批项目失败:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// 删除项目申请
router.delete('/projects/:id', async (req, res) => {
  try {
    const { pool } = req.app.locals;
    const { id } = req.params;
    const [projects] = await pool.query('SELECT * FROM project_applications WHERE id = ?', [id]);
    if (projects.length === 0) {
      return res.status(404).json({ success: false, message: '项目不存在' });
    }
    // 安全加固：仅申请人本人（且待审批）或管理角色可删除，防越权删除他人申请
    const operatorName = getRealName(req);
    const [selfRoles] = await pool.query(
      'SELECT r.name AS roleName, e.position FROM employees e LEFT JOIN roles r ON e.roleId = r.id WHERE e.name = ?',
      [operatorName]
    );
    const isManager = operatorName === '管理员' || operatorName === '总经理' || /^admin$/i.test(operatorName)
      || /总经理/.test(String(selfRoles[0]?.position || ''))
      || ['系统管理员', '总经理', '业务中心经理', '技术部经理'].includes(String(selfRoles[0]?.roleName || ''));
    const project = projects[0];
    const isOwner = project.applicant_name === operatorName;
    if (!isManager && !isOwner) {
      return res.status(403).json({ success: false, message: '无权限删除他人的项目申请' });
    }
    if (!isManager && project.status !== 'pending') {
      return res.status(400).json({ success: false, message: '已审批的项目申请不可删除' });
    }
    await pool.query('DELETE FROM project_applications WHERE id = ?', [id]);
    res.json({ success: true, message: '项目删除成功' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 批量更新项目负责人（按项目类型）-- 必须在 /:id 路由之前
router.put('/projects/update-manager', requireRole('系统管理员', '总经理', '业务中心经理', '技术部经理'), async (req, res) => {
  try {
    const { pool } = req.app.locals;
    const { projectType, manager } = req.body;
    if (!projectType || !manager) {
      return res.status(400).json({ success: false, message: '缺少参数' });
    }
    await pool.query(
      "UPDATE project_applications SET applicant_name = ?, updated_at = NOW() WHERE project_type = ?",
      [manager, projectType]
    );
    const { createOperationLog, getOperator } = await import('../utils/audit.js');
    await createOperationLog(pool, {
      username: getOperator(req),
      action: 'update',
      module: 'project',
      targetName: `产品分类"${projectType}"负责人变更为${manager}`,
    });
    res.json({ success: true, message: '项目负责人更新成功' });
  } catch (error) {
    console.error('更新项目负责人失败:', error);
    res.status(500).json({ success: false, message: '更新项目负责人失败' });
  }
});

// 注意：项目申请的更新（含 applicant_name/负责人）由 projectApplicationsRouter 的
// PUT /projects/:id 统一处理。该路由在 server.js 中于 workflowRouter 之后挂载，
// 故此处不复定义，避免路由被先生效导致负责人(申请编号)无法更新。


/**
 * 出差申请API
 */

// 获取出差申请列表
router.get('/business-trips', async (req, res) => {
  try {
    const { pool } = req.app.locals;
    const { applicant, status, page = 1, pageSize = 10 } = req.query;

    const pageNum = parseInt(page) || 1;
    const size = parseInt(pageSize) || 10;
    const offset = (pageNum - 1) * size;

    let sql = 'SELECT * FROM business_trip_applications WHERE 1=1';
    const params = [];

    if (applicant) {
      sql += ' AND applicant_name = ?';
      params.push(applicant);
    }

    if (status) {
      sql += ' AND status = ?';
      params.push(status);
    }

    sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(size, offset);

    const [trips] = await pool.query(sql, params);

    const formattedTrips = trips.map((trip) => ({
      id: trip.id,
      trip_code: trip.trip_code || ('TRP' + String(trip.id).padStart(6, '0')),
      destination: trip.destination || '',
      applicant_name: trip.applicant_name || '',
      applicant_id: trip.applicant_id || '',
      department: trip.department || '',
      is_urgent: trip.is_urgent || false,
      days: trip.days || 0,
      estimated_cost: trip.estimated_cost || 0,
      start_date: trip.start_date || '',
      end_date: trip.end_date || '',
      purpose: trip.purpose || '',
      itinerary: trip.itinerary || '',
      cost_breakdown: trip.cost_breakdown || '',
      accommodation: trip.accommodation || '',
      transport: trip.transport || '',
      accompany_persons: trip.accompany_persons || '',
      customer_info: trip.customer_info || '',
status: trip.status || 'pending',
      current_step: trip.current_step || 1,
      current_approvers: trip.current_approvers || '',
      approver: trip.approver || '',
      approval_history: trip.approval_history || '',
      result: trip.result || '',
      comment: trip.comment || '',
      created_at: trip.created_at || new Date(),
      updated_at: trip.updated_at || new Date()
    }));

    let countSql = 'SELECT COUNT(*) as total FROM business_trip_applications WHERE 1=1';
    const countParams = [];

    if (applicant) {
      countSql += ' AND applicant_name = ?';
      countParams.push(applicant);
    }

    if (status) {
      countSql += ' AND status = ?';
      countParams.push(status);
    }

    const [countResult] = await pool.query(countSql, countParams);

    res.json({
      success: true,
      data: {
        list: formattedTrips,
        pagination: {
          page: parseInt(page),
          pageSize: parseInt(pageSize),
          total: countResult[0].total
        }
      }
    });
  } catch (error) {
    console.error('获取出差申请列表失败:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// 创建出差申请
router.post("/business-trips", async (req, res) => {
  try {
    const { pool } = req.app.locals;
    const {
      destination,
      startDate,
      start_date,
      endDate,
      end_date,
      days,
      purpose,
      estimatedCost,
      estimated_cost,
      isUrgent,
      is_urgent,
      itinerary,
      costBreakdown,
      cost_breakdown,
      accommodation,
      transport,
      accompanyPersons,
      accompany_persons,
      customerInfo,
      customer_info,
      applicant,
      approver,
      applicantId,
      applicant_id,
      approverId,
      approver_id,
      applicantName,
      applicant_name
    } = req.body;

    // 安全加固：申请人身份一律从 JWT token 解析，忽略请求体传入的 applicant/applicantId/applicantName，防伪造
    const applicantNameVal = getRealName(req);
    if (!applicantNameVal) {
      return res.status(401).json({ success: false, message: '未登录，无法提交申请' });
    }
    const applicantEmpRow = await resolveApplicantByName(pool, applicantNameVal);
    const applicantIdVal = req.user?.id || applicantEmpRow?.id || applicantId || applicant_id;

    let approverIdVal = approverId || approver_id;
    let approverNameVal = approver;

    if (approverIdVal && !approverNameVal) {
      const [employees] = await pool.query("SELECT name FROM employees WHERE id = ?", [approverIdVal]);
      approverNameVal = employees.length > 0 ? employees[0].name : "";
    }

    const tripCode = 'TRP' + String(Date.now()).slice(-6);
    const now = new Date();
    const finalStartDate = startDate || start_date || null;
    const finalEndDate = endDate || end_date || null;
    let finalDays = days;
    if (!finalDays && finalStartDate && finalEndDate) {
      const d1 = new Date(finalStartDate);
      const d2 = new Date(finalEndDate);
      if (!isNaN(d1) && !isNaN(d2)) {
        finalDays = Math.ceil((d2 - d1) / (1000 * 60 * 60 * 24)) + 1;
      }
    }
    finalDays = finalDays || 1;

    const [result] = await pool.query(
       `INSERT INTO business_trip_applications
        (trip_code, applicant_id, applicant_name, department, destination, is_urgent, start_date, end_date, days, purpose, estimated_cost, itinerary, cost_breakdown, accommodation, transport, accompany_persons, customer_info, status, current_step, approver, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', 1, ?, ?, ?)`,
      [
        tripCode,
        applicantIdVal || '',
        applicantNameVal || '未知申请人',
        '',
        destination || '',
        isUrgent || is_urgent ? 1 : 0,
        finalStartDate,
        finalEndDate,
        finalDays,
        purpose || '',
        estimatedCost || estimated_cost || 0,
        typeof itinerary === 'object' ? JSON.stringify(itinerary) : (itinerary || ''),
        typeof costBreakdown === 'object' ? JSON.stringify(costBreakdown) : (cost_breakdown || ''),
        accommodation || '',
        transport || '',
        typeof accompanyPersons === 'object' ? JSON.stringify(accompanyPersons) : (accompany_persons || ''),
        typeof customerInfo === 'object' ? JSON.stringify(customerInfo) : (customer_info || ''),
        approverNameVal || null,
        now,
        now
      ]
    );

    // 审计：创建出差申请
    await createOperationLog(pool, {
      username: getRealName(req) || applicantNameVal || '系统',
      action: 'create',
      module: 'business_trip',
      targetName: `出差申请(${tripCode})`,
      detail: `创建出差申请，目的地: ${destination || ''}, 天数: ${finalDays}, 提交给${approverNameVal || '未指定'}审批`
    });
    res.json({
      success: true,
      data: {
        id: result.insertId,
        status: 'pending'
      }
    });
  } catch (error) {
    console.error('创建出差申请失败:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// 获取出差申请详情
router.get('/business-trips/:id', async (req, res) => {
  try {
    const { pool } = req.app.locals;
    const { id } = req.params;

    const [trips] = await pool.query(
      'SELECT * FROM business_trip_applications WHERE id = ?',
      [id]
    );

    if (trips.length === 0) {
      return res.status(404).json({ success: false, message: '出差申请不存在' });
    }

    res.json({ success: true, data: trips[0] });
  } catch (error) {
    console.error('获取出差申请失败:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// 审批出差申请
router.post('/business-trips/:id/approve', async (req, res) => {
  try {
    const { pool } = req.app.locals;
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
      const newComment = trip.comment
        ? `${trip.comment}\n---\n${currentApprover}: ${comment || '已同意并转交'}`
        : `${currentApprover}: ${comment || '已同意并转交'}`;
      await pool.execute(
        'UPDATE business_trip_applications SET comment = ?, approver = ?, updated_at = NOW() WHERE id = ?',
        [newComment, forwardTo, id]
      );
      await createNotification(pool, {
        userId: trip.applicant_name,
        title: '出差申请已转交',
        content: `您的${trip.destination}出差申请(${trip.trip_code})已转交给 ${forwardTo} 审批`,
        type: 'approval',
        relatedId: parseInt(id),
        relatedType: 'business_trip'
      });
      await createNotification(pool, {
        userId: forwardTo,
        title: '出差审批提醒',
        content: `${trip.applicant_name} 的${trip.destination}出差申请(${trip.trip_code})已转交给您，请审批`,
        type: 'approval',
        relatedId: parseInt(id),
        relatedType: 'business_trip'
      });
      await createOperationLog(pool, {
        username: getRealName(req) || currentApprover || '系统',
        action: 'forward',
        module: 'business_trip',
        targetName: `${trip.destination}出差(${trip.trip_code})`,
        detail: comment || '',
        ipAddress: req.ip
      });
      return res.json({ success: true, message: '已转交审批' });
    }

    // 安全加固：审批人身份一律从 JWT token 解析，忽略请求体传的 approverId/operator，防伪造审批
    const currentUserName = getRealName(req);
    if (!currentUserName) {
      return res.status(401).json({ success: false, message: '未登录' });
    }
    const approver = await resolveApprover(pool, { operator: currentUserName });

    if (!approver) {
      return res.status(400).json({ success: false, message: '当前用户不是有效的审批人' });
    }

    // 校验当前用户是否是该申请的当前审批人，防止越权审批
    const currentApprovers = (trip.current_approvers || '').split(',').map(s => s.trim()).filter(Boolean);
    const isCurrentApprover = currentApprovers.includes(currentUserName) || trip.approver === currentUserName;
    if (!isCurrentApprover) {
      return res.status(403).json({ success: false, message: '您不是该申请的当前审批人，无权限审批' });
    }

    const historyRecord = {
      step: trip.current_step,
      nodeName: '审批节点',
      approverId: approver.id,
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
      detail: comment || '',
      ipAddress: req.ip
    });

    res.json({ success: true });
  } catch (error) {
    console.error('审批出差申请失败:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * 审批中心API
 */

// 获取待审批任务
router.get('/approvals/todo', async (req, res) => {
  try {
    const { pool } = req.app.locals;

    const [projectTasks] = await pool.query(
      `SELECT 'project' as type, id, project_name as title, applicant_name as applicant, status, created_at as createdAt, budget as estimatedCost
       FROM project_applications
       WHERE status = 'pending'`
    );

    const [tripTasks] = await pool.query(
      `SELECT 'business_trip' as type, id, destination as title, applicant_name as applicant, status, created_at as createdAt, estimated_cost as estimatedCost
       FROM business_trip_applications
       WHERE status = 'pending'`
    );

    const tasks = [...projectTasks, ...tripTasks];
    tasks.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.json({ success: true, data: tasks });
  } catch (error) {
    console.error('获取待审批任务失败:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// 获取已审批任务
router.get('/approvals/done', async (req, res) => {
  try {
    const { pool } = req.app.locals;

    const [projectTasks] = await pool.query(
      `SELECT 'project' as type, id, project_name as title, applicant_name as applicant, status, created_at as createdAt
       FROM project_applications
       WHERE status IN ('approved', 'rejected')`
    );

    const [tripTasks] = await pool.query(
      `SELECT 'business_trip' as type, id, destination as title, applicant_name as applicant, status, created_at as createdAt, estimated_cost as estimatedCost
       FROM business_trip_applications
       WHERE status IN ('approved', 'rejected')`
    );

    const tasks = [...projectTasks, ...tripTasks];
    tasks.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.json({ success: true, data: tasks });
  } catch (error) {
    console.error('获取已审批任务失败:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
export const initWorkflowEngine = () => {};
