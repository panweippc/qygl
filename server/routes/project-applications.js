import express from 'express';
const router = express.Router();

import { createNotification, createOperationLog } from '../utils/audit.js';

// 创建项目申请
router.post('/projects', async (req, res) => {
  const { pool } = req.app.locals;
  try {
    console.log('前端提交的参数:', req.body);
    const {
      projectName, projectType, priority, budget, startDate, endDate,
      description, objectives, teamMembers, resources, applicantId, approverId
    } = req.body;

    if (!projectName || !projectType || !priority || budget === undefined || !startDate || !endDate || !description || !objectives || !resources || !applicantId) {
      console.log('缺少的必填参数:', {
        projectName: !projectName,
        projectType: !projectType,
        priority: !priority,
        budget: budget === undefined,
        startDate: !startDate,
        endDate: !endDate,
        description: !description,
        objectives: !objectives,
        resources: !resources,
        applicantId: !applicantId
      });
      return res.status(400).json({ success: false, message: '缺少必填参数' });
    }

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

    const date = new Date();
    const year = date.getFullYear();
    let projectCode;
    let sequence = 1;

    while (true) {
      projectCode = `PRJ-${year}-${String(sequence).padStart(4, '0')}`;
      const [existingProjects] = await pool.execute(
        'SELECT * FROM project_applications WHERE project_code = ?',
        [projectCode]
      );
      if (existingProjects.length === 0) {
        break;
      }
      sequence++;
    }

    const [result] = await pool.execute(
      `INSERT INTO project_applications 
       (project_code, project_name, applicant_id, applicant_name, department, 
        project_type, priority, budget, start_date, end_date, description, objectives,
        team_members, resources, status, current_step, approver, created_at, updated_at) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', 1, ?, NOW(), NOW())`,
      [
        projectCode, projectName, applicantId, applicant.name, applicant.department,
        projectType, priority, budget, startDate, endDate, description, objectives,
        JSON.stringify(teamMembers || []), resources, approverName
      ]
    );

    await createOperationLog(pool, {
      username: applicant.name,
      action: 'submit',
      module: 'project',
      targetName: `${projectName}项目(${projectCode})`,
      detail: `项目类型:${projectType}, 预算:${budget}元`
    });

    res.json({
      success: true,
      data: {
        id: result.insertId,
        projectCode,
        status: 'pending'
      }
    });
  } catch (error) {
    console.error('添加项目申请失败:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// 获取项目详情
router.get('/projects/:id', async (req, res) => {
  const { pool } = req.app.locals;
  try {
    const { id } = req.params;
    const [projects] = await pool.execute(
      'SELECT * FROM project_applications WHERE id = ?',
      [id]
    );

    if (projects.length === 0) {
      return res.status(404).json({ success: false, message: '项目不存在' });
    }

    const project = projects[0];
    project.team_members = JSON.parse(project.team_members || '[]');
    project.current_approvers = JSON.parse(project.current_approvers || '[]');
    project.approval_history = JSON.parse(project.approval_history || '[]');

    res.json({ success: true, data: project });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 审批项目
router.post('/projects/:id/approve', async (req, res) => {
  const { pool } = req.app.locals;
  try {
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
      const resultText = action === 'agree' ? '批准' : action === 'reject' ? '拒绝' : '';
      const intermediateResult = resultText ? `${currentApprover}:${resultText}` : null;
      const newComment = project.comment
        ? `${project.comment}\n---\n${currentApprover}: ${comment || ''}`
        : `${currentApprover}: ${comment || ''}`;
      await pool.execute(
        'UPDATE project_applications SET comment = ?, result = ?, approver = ?, updated_at = NOW() WHERE id = ?',
        [newComment, intermediateResult, forwardTo, id]
      );
      await createNotification(pool, {
        userId: project.applicant_name,
        title: '项目申请已转发',
        content: `您的${project.project_name}项目申请(${project.project_code})已转发至总经理审批`,
        type: 'approval',
        relatedId: parseInt(id),
        relatedType: 'project'
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
      step: project.current_step,
      nodeName: '审批节点',
      approverId,
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
      detail: comment || ''
    });

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 删除项目申请
router.delete('/projects/:id', async (req, res) => {
  const { pool } = req.app.locals;
  try {
    const { id } = req.params;

    const [projects] = await pool.execute(
      'SELECT * FROM project_applications WHERE id = ?',
      [id]
    );

    if (projects.length === 0) {
      return res.status(404).json({ success: false, message: '项目不存在' });
    }

    await pool.execute(
      'DELETE FROM project_applications WHERE id = ?',
      [id]
    );

    res.json({ success: true, message: '项目删除成功' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 更新项目申请
router.put('/projects/:id', async (req, res) => {
  const { pool } = req.app.locals;
  try {
    const { id } = req.params;
    const { project_name, description, project_link } = req.body;

    const [projects] = await pool.execute(
      'SELECT * FROM project_applications WHERE id = ?',
      [id]
    );

    if (projects.length === 0) {
      return res.status(404).json({ success: false, message: '项目不存在' });
    }

    await pool.execute(
      'UPDATE project_applications SET project_name = ?, description = ?, project_link = ?, updated_at = NOW() WHERE id = ?',
      [project_name, description, project_link, id]
    );

    res.json({ success: true, message: '项目更新成功' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 批量更新项目负责人（按项目类型）
router.put('/projects/update-manager', async (req, res) => {
  const { pool } = req.app.locals;
  try {
    const { projectType, manager } = req.body;
    if (!projectType || !manager) {
      return res.status(400).json({ success: false, message: '缺少参数' });
    }
    await pool.execute(
      "UPDATE project_applications SET applicant_name = ?, updated_at = NOW() WHERE project_type = ?",
      [manager, projectType]
    );
    await createOperationLog(pool, {
      username: req.body.operator || '系统',
      action: 'update',
      module: 'project',
      targetName: `项目分类"${projectType}"负责人变更为${manager}`,
    });
    res.json({ success: true, message: '项目负责人更新成功' });
  } catch (error) {
    console.error('更新项目负责人失败:', error);
    res.status(500).json({ success: false, message: '更新项目负责人失败' });
  }
});

export default router;
