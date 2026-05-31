/**
 * 工作流API路由 - 简化版本
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
      sql += ' AND applicant = ?';
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
    
    // 将字段名转换为前端期望的格式
    const formattedProjects = projects.map((project) => ({
      id: project.id,
      project_name: project.projectName || project.project_name || '未命名项目',
      project_type: project.projectType || project.project_type || '其他',
      description: project.description || '',
      applicant_name: project.applicant || project.applicant_name || '未知申请人',
      created_at: project.createdAt || project.created_at || new Date().toISOString(),
      project_link: project.projectLink || project.project_link || '',
      status: project.status || '审批中',
      applicant: project.applicant || ''
    }));
    
    // 获取总数
    let countSql = 'SELECT COUNT(*) as total FROM project_applications WHERE 1=1';
    const countParams = [];
    
    if (applicant) {
      countSql += ' AND applicant = ?';
      countParams.push(applicant);
    }
    
    if (status) {
      countSql += ' AND status = ?';
      countParams.push(status);
    }
    
    const [countResult] = await pool.execute(countSql, countParams);
    
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
router.post('/projects', async (req, res) => {
  try {
    const { pool } = req.app.locals;
    const {
      projectName,
      projectType,
      priority,
      budget,
      description,
      projectLink,
      applicant,
      approver
    } = req.body;
    
    // 创建项目申请
    const now = new Date();
    const [result] = await pool.execute(
      `INSERT INTO project_applications 
       (applicant, projectName, projectType, budget, priority, description, projectLink, status, approver, createdAt) 
       VALUES (?, ?, ?, ?, ?, ?, ?, '审批中', ?, ?)`,
      [
        applicant || '未知申请人',
        projectName,
        projectType,
        budget || 0,
        priority || '普通',
        description || '',
        projectLink,
        approver || '总经理',
        now
      ]
    );
    
    res.json({
      success: true,
      data: {
        id: result.insertId,
        status: '审批中'
      }
    });
  } catch (error) {
    console.error('创建项目申请失败:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// 获取项目详情
router.get('/projects/:id', async (req, res) => {
  try {
    const { pool } = req.app.locals;
    const { id } = req.params;
    
    const [projects] = await pool.execute(
      'SELECT * FROM project_applications WHERE id = ?',
      [id]
    );
    
    if (projects.length === 0) {
      return res.status(404).json({ success: false, message: '项目不存在' });
    }
    
    res.json({ success: true, data: projects[0] });
  } catch (error) {
    console.error('获取项目详情失败:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// 审批项目
router.post('/projects/:id/approve', async (req, res) => {
  try {
    const { pool } = req.app.locals;
    const { id } = req.params;
    const { action, comment, approver } = req.body;
    
    // 更新项目状态
    const newStatus = action === 'agree' ? '已批准' : '已拒绝';
    await pool.execute(
      `UPDATE project_applications 
       SET status = ?, comment = ?, result = ?, approver = ?
       WHERE id = ?`,
      [newStatus, comment, newStatus, approver || '总经理', id]
    );
    
    res.json({ success: true });
  } catch (error) {
    console.error('审批项目失败:', error);
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
    
    let sql = 'SELECT * FROM business_trip_applications WHERE 1=1';
    const params = [];
    
    if (applicant) {
      sql += ' AND applicant = ?';
      params.push(applicant);
    }
    
    if (status) {
      sql += ' AND status = ?';
      params.push(status);
    }
    
    sql += ' ORDER BY createdAt DESC LIMIT ? OFFSET ?';
    params.push(parseInt(pageSize), (parseInt(page) - 1) * parseInt(pageSize));
    
    const [trips] = await pool.execute(sql, params);
    
    // 获取总数
    let countSql = 'SELECT COUNT(*) as total FROM business_trip_applications WHERE 1=1';
    const countParams = [];
    
    if (applicant) {
      countSql += ' AND applicant = ?';
      countParams.push(applicant);
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
    console.error('获取出差申请列表失败:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// 创建出差申请
router.post('/business-trips', async (req, res) => {
  try {
    const { pool } = req.app.locals;
    const {
      destination,
      tripType,
      startDate,
      endDate,
      days,
      purpose,
      estimatedCost,
      applicant,
      approver
    } = req.body;
    
    // 创建出差申请
    const now = new Date();
    const [result] = await pool.execute(
      `INSERT INTO business_trip_applications 
       (applicant, destination, tripType, startDate, endDate, days, purpose, estimatedCost, status, approver, createdAt) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, '审批中', ?, ?)`,
      [
        applicant || '未知申请人',
        destination,
        tripType,
        startDate,
        endDate,
        days || 1,
        purpose,
        estimatedCost || 0,
        approver || '总经理',
        now
      ]
    );
    
    res.json({
      success: true,
      data: {
        id: result.insertId,
        status: '审批中'
      }
    });
  } catch (error) {
    console.error('创建出差申请失败:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// 获取出差详情
router.get('/business-trips/:id', async (req, res) => {
  try {
    const { pool } = req.app.locals;
    const { id } = req.params;
    
    const [trips] = await pool.execute(
      'SELECT * FROM business_trip_applications WHERE id = ?',
      [id]
    );
    
    if (trips.length === 0) {
      return res.status(404).json({ success: false, message: '出差申请不存在' });
    }
    
    res.json({ success: true, data: trips[0] });
  } catch (error) {
    console.error('获取出差详情失败:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// 审批出差申请
router.post('/business-trips/:id/approve', async (req, res) => {
  try {
    const { pool } = req.app.locals;
    const { id } = req.params;
    const { action, comment, approver } = req.body;
    
    // 更新出差状态
    const newStatus = action === 'agree' ? '已批准' : '已拒绝';
    await pool.execute(
      `UPDATE business_trip_applications 
       SET status = ?, comment = ?, result = ?, approver = ?
       WHERE id = ?`,
      [newStatus, comment, newStatus, approver || '总经理', id]
    );
    
    res.json({ success: true });
  } catch (error) {
    console.error('审批出差申请失败:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * 审批中心API - 简化版本
 */

// 获取待办任务
router.get('/approvals/todo', async (req, res) => {
  try {
    const { pool } = req.app.locals;
    
    // 获取项目申请待办
    const [projectTasks] = await pool.execute(
      `SELECT 'project' as type, id, projectName as title, applicant, status, createdAt 
       FROM project_applications 
       WHERE status = '审批中'`
    );
    
    // 获取出差申请待办
    const [tripTasks] = await pool.execute(
      `SELECT 'business_trip' as type, id, destination as title, applicant, status, createdAt, estimatedCost 
       FROM business_trip_applications 
       WHERE status = '审批中'`
    );
    
    const tasks = [...projectTasks, ...tripTasks];
    tasks.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    res.json({ success: true, data: tasks });
  } catch (error) {
    console.error('获取待办任务失败:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// 获取已办任务
router.get('/approvals/done', async (req, res) => {
  try {
    const { pool } = req.app.locals;
    
    // 获取已完成的项目申请
    const [projectTasks] = await pool.execute(
      `SELECT 'project' as type, id, projectName as title, applicant, status, createdAt 
       FROM project_applications 
       WHERE status IN ('已批准', '已拒绝')`
    );
    
    // 获取已完成的出差申请
    const [tripTasks] = await pool.execute(
      `SELECT 'business_trip' as type, id, destination as title, applicant, status, createdAt, estimatedCost 
       FROM business_trip_applications 
       WHERE status IN ('已批准', '已拒绝')`
    );
    
    const tasks = [...projectTasks, ...tripTasks];
    tasks.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    res.json({ success: true, data: tasks });
  } catch (error) {
    console.error('获取已办任务失败:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
export const initWorkflowEngine = () => {};
