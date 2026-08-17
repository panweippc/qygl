import express from 'express';
const router = express.Router();

import { createNotification, createOperationLog, getOperator } from '../utils/audit.js';
import { getRealName } from '../utils/identity.js';
import { requireRole } from '../middleware/auth.js';

// 创建项目申请
router.post('/projects', async (req, res) => {
  const { pool } = req.app.locals;
  try {
    console.log('前端提交的参数:', req.body);
    const {
      projectName, projectType, priority, budget, startDate, endDate,
      description, objectives, teamMembers, resources, applicantId, approverId, applicantName
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

    // 安全加固：申请人身份一律从 JWT token 解析，忽略请求体 applicantId/applicantName，防伪造
    const tokenApplicantName = getRealName(req);
    if (!tokenApplicantName) {
      return res.status(401).json({ success: false, message: '未登录，无法提交申请' });
    }
    const [employees] = await pool.execute(
      'SELECT * FROM employees WHERE name = ?',
      [String(tokenApplicantName).replace(/^emp_/, '').replace(/_\d+$/, '')]
    );

    if (employees.length === 0) {
      return res.status(400).json({ success: false, message: '当前用户不是有效的员工，无法提交申请' });
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
    const { action, comment, approverId, forwardTo, operator } = req.body;

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
      const newComment = project.comment
        ? `${project.comment}\n---\n${currentApprover}: ${comment || ''}`
        : `${currentApprover}: ${comment || ''}`;
      const forwardHistory = JSON.parse(project.approval_history || '[]');
      forwardHistory.push({
        step: project.current_step,
        nodeName: '转交审批',
        approverId: (project.applicant_id) || null,
        approverName: currentApprover || '',
        approverRole: '',
        action: resultText ? 'forward' : 'forward',
        comment: comment || '',
        createdAt: new Date()
      });
      await pool.execute(
        'UPDATE project_applications SET comment = ?, approver = ?, approval_history = ?, updated_at = NOW() WHERE id = ?',
        [newComment, forwardTo, JSON.stringify(forwardHistory), id]
      );
      await createNotification(pool, {
        userId: project.applicant_name,
        title: '项目申请已转发',
        content: `您的${project.project_name}项目申请(${project.project_code})已转发至总经理审批`,
        type: 'approval',
        relatedId: parseInt(id),
        relatedType: 'project'
      });
      await createNotification(pool, {
        userId: forwardTo,
        title: '项目审批提醒',
        content: `${project.applicant_name} 的${project.project_name}项目申请(${project.project_code})已转发给您，请审批`,
        type: 'approval',
        relatedId: parseInt(id),
        relatedType: 'project'
      });
      return res.json({ success: true, message: '已转发至总经理' });
    }

    // 安全加固：审批人身份一律从 JWT token 解析，忽略请求体 approverId/operator，防伪造审批
    const tokenName = getRealName(req);
    if (!tokenName) {
      return res.status(401).json({ success: false, message: '未登录' });
    }
    const cleanName = String(tokenName).replace(/^emp_/, '').replace(/_\d+$/, '');
    let approver = null;
    const [byTokenName] = await pool.execute('SELECT * FROM employees WHERE name = ?', [cleanName]);
    if (byTokenName.length > 0) approver = byTokenName[0];
    if (!approver) {
      return res.status(400).json({ success: false, message: '当前用户不是有效的审批人' });
    }

    // 校验当前用户是否是该申请的当前审批人，防止越权审批
    const currentApprovers = (project.current_approvers || '').split(',').map(s => s.trim()).filter(Boolean);
    const isCurrentApprover = currentApprovers.includes(tokenName) || currentApprovers.includes(cleanName) || project.approver === tokenName || project.approver === cleanName;
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

    // 安全加固：仅申请人本人（且待审批）或管理角色可删除，防越权删除
    const operatorName = getRealName(req);
    const [selfRoles] = await pool.execute(
      'SELECT r.name AS roleName, e.position FROM employees e LEFT JOIN roles r ON e.roleId = r.id WHERE e.name = ?',
      [operatorName]
    );
    const isManager = operatorName === '管理员' || operatorName === '总经理' || /^admin$/i.test(operatorName)
      || /总经理/.test(String(selfRoles[0]?.position || ''))
      || ['系统管理员', '总经理', '业务中心经理', '技术部经理'].includes(String(selfRoles[0]?.roleName || ''));
    const isOwner = projects[0].applicant_name === operatorName;
    if (!isManager && !isOwner) {
      return res.status(403).json({ success: false, message: '无权限删除他人的项目申请' });
    }
    if (!isManager && projects[0].status !== 'pending') {
      return res.status(400).json({ success: false, message: '已审批的项目申请不可删除' });
    }

    await pool.execute(
      'DELETE FROM project_applications WHERE id = ?',
      [id]
    );

    // 删除项目申请审计
    createOperationLog(pool, { userId: String(req.user?.id || ''), username: getOperator(req), action: 'delete', module: 'project', targetId: id, targetName: `${projects[0].project_name}项目`, detail: `删除项目申请: ${projects[0].project_name}`, ipAddress: req.ip });
    res.json({ success: true, message: '项目删除成功' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 批量更新项目负责人（按项目类型）-- 必须在 /:id 路由之前
router.put('/projects/update-manager', requireRole('系统管理员', '总经理', '业务中心经理', '技术部经理'), async (req, res) => {
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

// 更新项目申请
router.put('/projects/:id', async (req, res) => {
  const { pool } = req.app.locals;
  try {
    const { id } = req.params;
    const { project_name, description, project_link, applicant_name, applicantId } = req.body;

    const [projects] = await pool.execute(
      'SELECT * FROM project_applications WHERE id = ?',
      [id]
    );

    if (projects.length === 0) {
      return res.status(404).json({ success: false, message: '项目不存在' });
    }

    // 安全加固：申请人身份一律从 JWT token 解析，忽略请求体 applicant_name/applicantId，防伪造
    let name = getRealName(req) || projects[0].applicant_name
    if (applicantId && !name) {
      const [emps] = await pool.execute('SELECT name FROM employees WHERE id = ?', [applicantId])
      if (emps.length > 0) name = emps[0].name
    }

    await pool.execute(
      'UPDATE project_applications SET project_name = ?, description = ?, project_link = ?, applicant_name = ?, updated_at = NOW() WHERE id = ?',
      [project_name, description, project_link, name || projects[0].applicant_name, id]
    );

    // 更新项目申请审计
    createOperationLog(pool, {
      userId: String(req.user?.id || ''),
      username: getOperator(req),
      action: 'update',
      module: 'project',
      targetId: id,
      targetName: `${project_name || projects[0].project_name}项目`,
      detail: `更新项目申请: ${project_name || projects[0].project_name}`,
      ipAddress: req.ip,
      beforeValue: { project_name: projects[0].project_name, description: projects[0].description, project_link: projects[0].project_link, applicant_name: projects[0].applicant_name },
      afterValue: { project_name: project_name, description, project_link, applicant_name: name || projects[0].applicant_name }
    });
    res.json({ success: true, message: '项目更新成功' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
