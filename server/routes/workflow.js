/**
 * 工作流API路由
 */

import express from 'express';

const router = express.Router();

/**
 * 项目申请API
 */

// 获取项目申请列表
router.get('/projects', async (req, res) => {
  try {
    const { pool } = req.app.locals;
    const { applicant, status, page = 1, pageSize = 10 } = req.query;

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

    sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    const pageSizeInt = parseInt(pageSize, 10);
    const offset = (parseInt(page, 10) - 1) * pageSizeInt;
    params.push(pageSizeInt, offset);

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

    res.json({
      success: true,
      data: {
        list: formattedProjects,
        pagination: {
          page: parseInt(page),
          pageSize: parseInt(pageSize),
          total: countResult[0].total
        }
      }
    });
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

    let applicantIdVal = applicantId || applicant_id;
    let applicantNameVal = applicant || applicant_name || applicantName;

    if (applicantIdVal && !applicantNameVal) {
      const [employees] = await pool.query("SELECT name FROM employees WHERE id = ?", [applicantIdVal]);
      applicantNameVal = employees.length > 0 ? employees[0].name : "未知申请人";
    }

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
    const { action, comment: commentText, approver } = req.body;

    const newStatus = action === 'agree' ? 'approved' : 'rejected';
    await pool.query(
      `UPDATE project_applications
       SET status = ?, comment = ?, updated_at = ?
       WHERE id = ?`,
      [newStatus, commentText || '', new Date(), id]
    );

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
    await pool.query('DELETE FROM project_applications WHERE id = ?', [id]);
    res.json({ success: true, message: '项目删除成功' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 更新项目申请
router.put('/projects/:id', async (req, res) => {
  try {
    const { pool } = req.app.locals;
    const { id } = req.params;
    const { project_name, description, project_link } = req.body;
    const [projects] = await pool.query('SELECT * FROM project_applications WHERE id = ?', [id]);
    if (projects.length === 0) {
      return res.status(404).json({ success: false, message: '项目不存在' });
    }
    await pool.query(
      'UPDATE project_applications SET project_name = ?, description = ?, project_link = ?, updated_at = NOW() WHERE id = ?',
      [project_name, description, project_link, id]
    );
    res.json({ success: true, message: '项目更新成功' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

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
      trip_type: trip.trip_type || 'domestic',
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
      tripType,
      trip_type,
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

    let applicantIdVal = applicantId || applicant_id;
    let applicantNameVal = applicant || applicant_name || applicantName;

    if (applicantIdVal && !applicantNameVal) {
      const [employees] = await pool.query("SELECT name FROM employees WHERE id = ?", [applicantIdVal]);
      applicantNameVal = employees.length > 0 ? employees[0].name : "未知申请人";
    }

    let approverIdVal = approverId || approver_id;
    let approverNameVal = approver;

    if (approverIdVal && !approverNameVal) {
      const [employees] = await pool.query("SELECT name FROM employees WHERE id = ?", [approverIdVal]);
      approverNameVal = employees.length > 0 ? employees[0].name : "";
    }

    const tripCode = 'TRP' + String(Date.now()).slice(-6);
    const now = new Date();
    const finalTripType = tripType || trip_type || 'domestic';
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
       (trip_code, applicant_id, applicant_name, department, destination, trip_type, is_urgent, start_date, end_date, days, purpose, estimated_cost, itinerary, cost_breakdown, accommodation, transport, accompany_persons, customer_info, status, current_step, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', 1, ?, ?)`,
      [
        tripCode,
        applicantIdVal || '',
        applicantNameVal || '未知申请人',
        '',
        destination || '',
        finalTripType,
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
        now,
        now
      ]
    );

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
    const { action, comment: commentText, approver } = req.body;

    const newStatus = action === 'agree' ? 'approved' : 'rejected';
    await pool.query(
      `UPDATE business_trip_applications
       SET status = ?, comment = ?, updated_at = ?
       WHERE id = ?`,
      [newStatus, commentText || '', new Date(), id]
    );

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
