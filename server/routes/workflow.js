/**
 * ������API·�� - �򻯰汾
 */

import express from 'express';

const router = express.Router();

/**
 * ��Ŀ����API
 */

// ��ȡ��Ŀ�����б�
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
    
    // ���ֶ���ת��Ϊǰ�������ĸ�ʽ
    const formattedProjects = projects.map((project) => {
  let status = project.status || '审批中';
  if (status === '审批中') status = 'pending';
  else if (status === '已批准') status = 'approved';
  else if (status === '已拒绝') status = 'rejected';
  return {
    id: project.id,
    project_code: 'PRJ' + String(project.id).padStart(6, '0'),
    project_name: project.projectName || project.project_name || '未命名项目',
    project_type: project.projectType || project.project_type || '其他',
    description: project.description || '',
    applicant_name: project.applicant || project.applicant_name || '未知申请人',
    applicant: project.applicant || '',
    department: project.department || '',
    priority: project.priority || '中',
    budget: project.budget || 0,
    created_at: project.createdAt || project.created_at || new Date().toISOString(),
    project_link: project.projectLink || project.project_link || '',
    status: status,
    current_approvers: project.currentApprovers ? JSON.parse(project.currentApprovers) : [project.approverId || '']
  };
});
    
    // ��ȡ����
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
    console.error('��ȡ��Ŀ�����б�ʧ��:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ������Ŀ����
router.post("/projects", async (req, res) => {
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
      approver,
      applicantId,
      approverId
    } = req.body;
    
    let applicantName = applicant;
    let approverName = approver;
    
    if (applicantId && !applicant) {
      const [employees] = await pool.query("SELECT name FROM employees WHERE id = ?", [applicantId]);
      applicantName = employees.length > 0 ? employees[0].name : "δ֪������";
    }
    
    if (approverId && !approver) {
      const [employees] = await pool.query("SELECT name FROM employees WHERE id = ?", [approverId]);
      approverName = employees.length > 0 ? employees[0].name : "�ܾ���";
    }
    
    const now = new Date();
    const [result] = await pool.query(
      `INSERT INTO project_applications 
       (applicant, projectName, projectType, budget, priority, description, projectLink, status, approver, createdAt) 
       VALUES (?, ?, ?, ?, ?, ?, ?, "������", ?, ?)`,
      [
        applicantName || "δ֪������",
        projectName,
        projectType,
        budget || 0,
        priority || "��ͨ",
        description || "",
        projectLink || "",
        approverName || "�ܾ���",
        now
      ]
    );res.json({
      success: true,
      data: {
        id: result.insertId,
        status: '������'
      }
    });
  } catch (error) {
    console.error('������Ŀ����ʧ��:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ��ȡ��Ŀ����
router.get('/projects/:id', async (req, res) => {
  try {
    const { pool } = req.app.locals;
    const { id } = req.params;
    
    const [projects] = await pool.query(
      'SELECT * FROM project_applications WHERE id = ?',
      [id]
    );
    
    if (projects.length === 0) {
      return res.status(404).json({ success: false, message: '��Ŀ������' });
    }
    
    res.json({ success: true, data: projects[0] });
  } catch (error) {
    console.error('��ȡ��Ŀ����ʧ��:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ������Ŀ
router.post('/projects/:id/approve', async (req, res) => {
  try {
    const { pool } = req.app.locals;
    const { id } = req.params;
    const { action, comment, approver } = req.body;
    
    // ������Ŀ״̬
    const newStatus = action === 'agree' ? '����׼' : '�Ѿܾ�';
    await pool.query(
      `UPDATE project_applications 
       SET status = ?, comment = ?, result = ?, approver = ?
       WHERE id = ?`,
      [newStatus, comment, newStatus, approver || '�ܾ���', id]
    );
    
    res.json({ success: true });
  } catch (error) {
    console.error('������Ŀʧ��:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * ��������API
 */

// ��ȡ���������б�
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
      sql += ' AND applicant = ?';
      params.push(applicant);
    }
    
    if (status) {
      sql += ' AND status = ?';
      params.push(status);
    }
    
    sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(size, offset);
    
    const [trips] = await pool.query(sql, params);

    const formattedTrips = trips.map((trip) => {
      let status = trip.status || '审批中';
      if (status === '审批中') status = 'pending';
      else if (status === '已批准') status = 'approved';
      else if (status === '已拒绝') status = 'rejected';
      return {
        id: trip.id,
        trip_code: 'TRP' + String(trip.id).padStart(6, '0'),
        destination: trip.destination || '',
        applicant_name: trip.applicant || '',
        department: trip.department || '',
        trip_type: trip.tripType || 'domestic',
        days: trip.days || 0,
        estimated_cost: trip.estimatedCost || 0,
        status: status,
        start_date: trip.startDate || '',
        end_date: trip.endDate || '',
        current_approvers: [trip.approverId || '']
      };
    });

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
    console.error('��ȡ���������б�ʧ��:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ������������
router.post("/business-trips", async (req, res) => {
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
      approver,
      applicantId,
      approverId,
      applicantName
    } = req.body;
    
    let finalApplicantName = applicant || applicantName;
    let approverName = approver;
    
    if (applicantId && !finalApplicantName) {
      const [employees] = await pool.query("SELECT name FROM employees WHERE id = ?", [applicantId]);
      finalApplicantName = employees.length > 0 ? employees[0].name : "δ֪������";
    }
    
    if (approverId && !approverName) {
      const [employees] = await pool.query("SELECT name FROM employees WHERE id = ?", [approverId]);
      approverName = employees.length > 0 ? employees[0].name : "�ܾ���";
    }
    
    const now = new Date();
    const [result] = await pool.query(
      `INSERT INTO business_trip_applications 
       (applicant, destination, tripType, startDate, endDate, days, purpose, estimatedCost, status, approver, createdAt) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, "������", ?, ?)`,
      [
        finalApplicantName || "δ֪������",
        destination,
        tripType,
        startDate,
        endDate,
        days || 1,
        purpose,
        estimatedCost || 0,
        approverName || "�ܾ���",
        now
      ]
    );res.json({
      success: true,
      data: {
        id: result.insertId,
        status: '������'
      }
    });
  } catch (error) {
    console.error('������������ʧ��:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ��ȡ��������
router.get('/business-trips/:id', async (req, res) => {
  try {
    const { pool } = req.app.locals;
    const { id } = req.params;
    
    const [trips] = await pool.query(
      'SELECT * FROM business_trip_applications WHERE id = ?',
      [id]
    );
    
    if (trips.length === 0) {
      return res.status(404).json({ success: false, message: '�������벻����' });
    }
    
    res.json({ success: true, data: trips[0] });
  } catch (error) {
    console.error('��ȡ��������ʧ��:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ������������
router.post('/business-trips/:id/approve', async (req, res) => {
  try {
    const { pool } = req.app.locals;
    const { id } = req.params;
    const { action, comment, approver } = req.body;
    
    // ���³���״̬
    const newStatus = action === 'agree' ? '����׼' : '�Ѿܾ�';
    await pool.query(
      `UPDATE business_trip_applications 
       SET status = ?, comment = ?, result = ?, approver = ?
       WHERE id = ?`,
      [newStatus, comment, newStatus, approver || '�ܾ���', id]
    );
    
    res.json({ success: true });
  } catch (error) {
    console.error('������������ʧ��:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * ��������API - �򻯰汾
 */

// ��ȡ��������
router.get('/approvals/todo', async (req, res) => {
  try {
    const { pool } = req.app.locals;
    
    // ��ȡ��Ŀ�������
    const [projectTasks] = await pool.query(
      `SELECT 'project' as type, id, projectName as title, applicant, status, createdAt 
       FROM project_applications 
       WHERE status = '������'`
    );
    
    // ��ȡ�����������
    const [tripTasks] = await pool.query(
      `SELECT 'business_trip' as type, id, destination as title, applicant, status, createdAt, estimatedCost 
       FROM business_trip_applications 
       WHERE status = '������'`
    );
    
    const tasks = [...projectTasks, ...tripTasks];
    tasks.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    res.json({ success: true, data: tasks });
  } catch (error) {
    console.error('��ȡ��������ʧ��:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ��ȡ�Ѱ�����
router.get('/approvals/done', async (req, res) => {
  try {
    const { pool } = req.app.locals;
    
    // ��ȡ����ɵ���Ŀ����
    const [projectTasks] = await pool.query(
      `SELECT 'project' as type, id, projectName as title, applicant, status, createdAt 
       FROM project_applications 
       WHERE status IN ('����׼', '�Ѿܾ�')`
    );
    
    // ��ȡ����ɵĳ�������
    const [tripTasks] = await pool.query(
      `SELECT 'business_trip' as type, id, destination as title, applicant, status, createdAt, estimatedCost 
       FROM business_trip_applications 
       WHERE status IN ('����׼', '�Ѿܾ�')`
    );
    
    const tasks = [...projectTasks, ...tripTasks];
    tasks.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    res.json({ success: true, data: tasks });
  } catch (error) {
    console.error('��ȡ�Ѱ�����ʧ��:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
export const initWorkflowEngine = () => {};
