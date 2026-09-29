import express from 'express';
const router = express.Router();

import { createNotification, createOperationLog, getOperator } from '../utils/audit.js';
import { getRealName } from '../utils/identity.js';
import { requireRole } from '../middleware/auth.js';

// 创建项目申请

// 获取项目详情

// 审批项目

// 删除项目申请

// 批量更新项目负责人（按项目类型）-- 必须在 /:id 路由之前

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

    // 允许编辑“负责人(applicant_name)”：优先使用请求体传入的负责人，其次保留原值，最后回退到当前登录用户
    const requestedManager = (applicant_name && String(applicant_name).trim()) ? applicant_name : null
    let name = requestedManager || projects[0].applicant_name || getRealName(req)
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
