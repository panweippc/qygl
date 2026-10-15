/**
 * 工作流API路由
 */

import express from 'express';
import { createNotification, createOperationLog } from '../utils/audit.js';
import { resubmitApplication } from '../utils/resubmitHelper.js';
import { getRealName } from '../utils/identity.js';
import { requireRole } from '../middleware/auth.js';
import { appendReturnHistory } from '../utils/returnHistory.js';
import { appendApprovalLog } from '../utils/approvalLog.js';

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
 * 确保 project_applications 表具备协同申请所需扩展列（参与部门）。
 * 幂等：列已存在时忽略 ER_DUP_FIELDNAME。
 */
let projectSchemaReady = null;
const ensureProjectSchema = async (pool) => {
  if (projectSchemaReady) return projectSchemaReady;
  projectSchemaReady = (async () => {
    try {
      await pool.execute('ALTER TABLE project_applications ADD COLUMN `participating_departments` TEXT DEFAULT NULL');
    } catch (e) {
      if (e.code !== 'ER_DUP_FIELDNAME') {
        console.error('[project] ensureSchema 失败:', e.message);
        projectSchemaReady = null; // 允许下次请求重试
      }
    }
  })();
  return projectSchemaReady;
};

/**
 * 项目申请API
 */

// 获取项目申请列表
router.get('/projects', async (req, res) => {
  try {
    const { pool } = req.app.locals;
    const { applicant, status } = req.query;

    await ensureProjectSchema(pool);

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

    sql += ' AND (is_deleted = 0 OR is_deleted IS NULL)';
    sql += ' ORDER BY created_at DESC';

    // 仅当明确提供了 pageSize 参数时才分页
    const hasPagination = req.query.pageSize !== undefined;
    if (hasPagination) {
      const page = parseInt(req.query.page, 10) || 1;
      const pageSize = parseInt(req.query.pageSize, 10) || 10;
      sql += ` LIMIT ${pageSize} OFFSET ${(page - 1) * pageSize}`;
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
      approver: project.approver || '',
      approver_id: project.approver_id || '',
      participating_departments: project.participating_departments || '',
      collaboration_mode: project.collaboration_mode || '',
      close_status: project.close_status || 'open',
      status: project.status || 'pending',
      current_step: project.current_step || 1,
      current_approvers: project.current_approvers || '',
      comment: project.comment || '',
      attachments: project.attachments || null,
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

      countSql += ' AND (is_deleted = 0 OR is_deleted IS NULL)';

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

// 协同给我的：当前用户作为协同对象（人员或部门成员）的事项
router.get('/projects/collaborated-with-me', async (req, res) => {
  try {
    const { pool } = req.app.locals;
    const me = getRealName(req);
    if (!me) return res.status(401).json({ success: false, message: '未登录' });

    // 先查出当前用户在 employees 表中的部门（避免跨表 collation 不一致）
    const [empRows] = await pool.query(
      'SELECT department FROM employees WHERE name = ?',
      [me]
    );
    const departments = empRows.map((r) => r.department).filter(Boolean);

    // 收集用户作为人员协同对象、以及所在部门作为部门协同对象的 application_id
    const appIds = new Set();
    const [userRows] = await pool.query(
      "SELECT application_id FROM project_collaborators WHERE target_type = 'user' AND target_name = ?",
      [me]
    );
    for (const r of userRows) appIds.add(r.application_id);

    if (departments.length > 0) {
      const placeholders = departments.map(() => '?').join(',');
      const [deptRows] = await pool.query(
        `SELECT application_id FROM project_collaborators WHERE target_type = 'dept' AND target_name IN (${placeholders})`,
        departments
      );
      for (const r of deptRows) appIds.add(r.application_id);
    }

    const ids = Array.from(appIds);
    let rows = [];
    if (ids.length > 0) {
      const placeholders = ids.map(() => '?').join(',');
      [rows] = await pool.query(
        `SELECT * FROM project_applications WHERE collaboration_mode <> '' AND id IN (${placeholders}) ORDER BY created_at DESC`,
        ids
      );
    }

    const list = [];
    for (const pa of rows) {
      const [cols] = await pool.query(
        'SELECT * FROM project_collaborators WHERE application_id = ? ORDER BY id ASC',
        [pa.id]
      );
      list.push({
        id: pa.id,
        project_code: pa.project_code || ('PRJ' + String(pa.id).padStart(6, '0')),
        project_name: pa.project_name || '',
        project_type: pa.project_type || '',
        description: pa.description || '',
        applicant_name: pa.applicant_name || '',
        objectives: pa.objectives || '',
        priority: pa.priority || '中',
        start_date: pa.start_date || '',
        end_date: pa.end_date || '',
        collaboration_mode: pa.collaboration_mode || '',
        close_status: pa.close_status || 'open',
        status: pa.status || '',
        created_at: pa.created_at || new Date(),
        expire_at: pa.expire_at || null,
        attachments: pa.attachments || null,
        collaborators: cols
      });
    }
    res.json({ success: true, data: { list } });
  } catch (error) {
    console.error('获取协同给我的失败:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// 创建项目申请
router.post("/projects", async (req, res) => {
  try {
    const { pool } = req.app.locals;

    // ===== 协同申请（无审批）：协作路径；行为按角色区分（participant 填写意见 / cc 知会），模式概念已移除 =====
    const isCollaboration = req.body.isCollaboration;
    if (isCollaboration) {
      // 协同标记：仅用于区分「协同类」与「审批类项目申请」（共用 project_applications 表），不再有 notify/opinion 语义
      const collabFlag = 'collab';
      const applicantNameVal = getRealName(req);
      if (!applicantNameVal) {
        return res.status(401).json({ success: false, message: '未登录，无法提交申请' });
      }
      const applicantEmpRow = await resolveApplicantByName(pool, applicantNameVal);
      const applicantIdVal = req.user?.id || applicantEmpRow?.id || req.body.applicantId || req.body.applicant_id;

      const title = (req.body.projectName || req.body.project_name || '').toString().trim();
      const desc = req.body.description || '';
      const prio = req.body.priority || '中';
      const startDateVal = req.body.startDate || req.body.start_date || new Date().toISOString().slice(0, 10);
      const endDateVal = req.body.endDate || req.body.end_date || new Date().toISOString().slice(0, 10);
      const expireAt = req.body.expireAt || req.body.expire_at || null;
      const projectCode = 'PRJ' + String(Date.now()).slice(-6);
      const now = new Date();

      // 主表：不再写 approver/审批字段；status 依模式而定
      const [result] = await pool.query(
        `INSERT INTO project_applications
         (project_code, project_name, applicant_id, applicant_name, department, project_type, priority, budget, start_date, end_date, description, objectives, collaboration_mode, status, close_status, expire_at, attachments, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'open', ?, ?, ?, ?)`,
        [
          projectCode,
          title,
          applicantIdVal || '',
          applicantNameVal || '未知发起人',
          '',
          req.body.projectType || req.body.project_type || '',
          prio,
          0,
          startDateVal,
          endDateVal,
          desc,
          req.body.objectives || '',
          collabFlag,
          'processing',
          expireAt,
          req.body.attachments || null,
          now,
          now
        ]
      );
      const appId = result.insertId;

      // 协同对象子表：多条 → 一对多；user 或 dept
      // 部门协同对象在落库时直接展开为部门成员个人行（target_type='user' + dept 字段），
      // 保证"部门内任意一人响应"≠"整个部门完成"，每人独立响应、独立计入自动关闭判定。
      // collab_role：participant=参与人(需响应) / cc=抄送(仅知会)；added_by 为 NULL 表示初始发起写入
      const collaborators = Array.isArray(req.body.collaborators) ? req.body.collaborators : [];
      const insertedCols = await insertCollaboratorsExpanded(pool, appId, collaborators, { addedBy: null, applicantName: applicantNameVal, projectName: title });

      // 通知协同对象（user 直接通知；部门已展开为成员个人行，逐人通知）
      // 参与人收到"需响应"文案；抄送(cc)收到中性"知会"文案，避免误导其填写意见
      const baseVerb = '邀请您填写协同意见';
      const notifyOne = async (username, roleVerb) => {
        if (!username) return;
        try {
          await createNotification(pool, {
            userId: username,
            title: '协同申请',
            content: `${applicantNameVal} ${roleVerb}：「${title}」`,
            type: 'collaboration',
            relatedId: appId,
            relatedType: 'project'
          });
        } catch (e) { /* 通知失败不影响主流程 */ }
      };
      for (const ic of insertedCols) {
        const roleVerb = ic.collab_role === 'cc' ? '向您发送了协同知会' : baseVerb;
        await notifyOne(ic.target_name, roleVerb);
      }

      // 审计
      await createOperationLog(pool, {
        username: applicantNameVal,
        action: 'create',
        module: 'project',
        targetName: title || `协同申请(${projectCode})`,
        detail: `协同，发起方1人，协同对象${collaborators.length}个`
      });
      await appendApprovalLog(pool, {
        applicationType: 'project',
        applicationId: appId,
        actor: applicantNameVal,
        actorRole: '发起人',
        action: 'submit',
        fromStatus: '',
        toStatus: 'processing',
        targetUser: insertedCols.map((c) => c.target_name).filter(Boolean).join(',')
      });

      return res.json({
        success: true,
        data: { id: appId, status: 'processing' }
      });
    }

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
      participatingDepartments,
      participating_departments,
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

    // 当前审批人：默认即用户所选审批人，用于审批权限校验与「我收到的」可见性
    const currentApproversVal = approverNameVal || '';
    const projectCode = 'PRJ' + String(Date.now()).slice(-6);
    const now = new Date();

    const [result] = await pool.query(
      `INSERT INTO project_applications
       (project_code, project_name, applicant_id, applicant_name, department, project_type, priority, budget, start_date, end_date, description, objectives, team_members, resources, project_link, approver, approver_id, current_approvers, participating_departments, status, current_step, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', 1, ?, ?)`,
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
        approverNameVal || null,
        approverIdVal || null,
        currentApproversVal,
        JSON.stringify(participatingDepartments || participating_departments || []),
        now,
        now
      ]
    );

    // 审计：创建协同申请
    await createOperationLog(pool, {
      username: getRealName(req) || applicantNameVal || '系统',
      action: 'create',
      module: 'project',
      targetName: projectName || project_name || `协同申请(${projectCode})`,
      detail: `创建协同申请，提交给${approverNameVal || '未指定'}审批`
    });
    await appendApprovalLog(pool, { applicationType: 'project', applicationId: result.insertId, actor: applicantNameVal, actorRole: '申请人', action: 'submit', fromStatus: '', toStatus: 'pending', targetUser: approverNameVal || '' });
    // 通知审批人
    if (approverNameVal) {
      try {
        await createNotification(pool, {
          userId: approverNameVal,
          title: '协同申请待审批',
          content: `${applicantNameVal} 提交了协同申请「${projectName || project_name || ''}」(${projectCode})，请审批`,
          type: 'approval',
          relatedId: result.insertId,
          relatedType: 'project'
        });
      } catch (e) { /* 通知失败不影响主流程 */ }
    }
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
      return res.status(404).json({ success: false, message: `项目申请不存在 (id=${id})` });
    }

    const app = projects[0];
    // 协同模型子表：协同对象（旧审批数据无子表，返回空数组，向后兼容）
    const [collaborators] = await pool.query(
      'SELECT * FROM project_collaborators WHERE application_id = ? ORDER BY id ASC',
      [id]
    ).catch(() => [[]]);

    res.json({
      success: true,
      data: {
        ...app,
        collaborators: collaborators || []
      }
    });
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
      await appendApprovalLog(pool, { applicationType: 'project', applicationId: id, actor: getRealName(req) || currentApprover || '系统', actorRole: '审批人', action: 'forward', fromStatus: project.status, toStatus: project.status, targetUser: forwardTo, comment: comment || '' });
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
    const prjLogAction = action === 'agree' ? 'approve' : action === 'reject' ? 'reject' : 'update';
    await appendApprovalLog(pool, { applicationType: 'project', applicationId: id, actor: approver.name, actorRole: '审批人', action: prjLogAction, fromStatus: project.status, toStatus: newStatus, comment: comment || '' });

    res.json({ success: true });
  } catch (error) {
    console.error('审批项目失败:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// 仅当前审批人或管理角色可操作（退回/软删判断用）
const isProjectManagerUser = async (req) => {
  try {
    const { pool } = req.app.locals;
    const name = getRealName(req);
    if (!name) return false;
    if (name === '管理员' || name === '总经理' || /^admin$/i.test(name)) return true;
    const [emp] = await pool.query('SELECT e.position, r.name AS roleName FROM employees e LEFT JOIN roles r ON e.roleId = r.id WHERE e.name = ?', [name]);
    if (emp.length === 0) return false;
    const roleName = emp[0].roleName || '';
    const position = String(emp[0].position || '');
    if (['系统管理员', '总经理', '业务中心经理', '技术部经理'].includes(roleName) || /总经理/.test(position)) return true;
    return false;
  } catch (e) { return false; }
};

// 撤回项目申请：申请人本人（待审批/审批中）可撤回，状态置为「已撤回」
router.post('/projects/:id/withdraw', async (req, res) => {
  try {
    const { id } = req.params;
    const { pool } = req.app.locals;
    const operator = getRealName(req);
    if (!operator) return res.status(401).json({ success: false, message: '未登录' });
    const [[rec]] = await pool.query('SELECT * FROM project_applications WHERE id = ?', [id]);
    if (!rec) return res.status(404).json({ success: false, message: '项目申请不存在' });
    if (rec.applicant_name !== operator) return res.status(403).json({ success: false, message: '仅申请人本人可撤回' });
    if (!['待审批', '审批中', 'pending', '待审核'].includes(rec.status)) {
      return res.status(400).json({ success: false, message: '当前状态不可撤回' });
    }
    await pool.query('UPDATE project_applications SET status = ? WHERE id = ?', ['已撤回', id]);
    // withdrawNotify: 撤回后通知审批人，并给申请人一条消息中心回执
    try {
      const notifyTargets = new Set([rec.approver, operator].filter(Boolean));
      for (const uid of notifyTargets) {
        await createNotification(pool, {
          userId: uid,
          title: '申请已撤回',
          content: uid === operator
            ? `您已撤回自己的项目申请（编号 ${id}）`
            : `${operator} 撤回了一份项目申请（编号 ${id}），该申请已从您的待办中移除`,
          type: 'approval',
          relatedId: parseInt(id),
          relatedType: 'project'
        });
      }
    } catch (e) { /* 通知失败不影响撤回主流程 */ }
    await createOperationLog(pool, { username: operator, action: 'withdraw', module: 'project', targetName: `${rec.project_name}项目(${rec.project_code})`, detail: '申请人撤回' });
    await appendApprovalLog(pool, { applicationType: 'project', applicationId: id, actor: operator, actorRole: '申请人', action: 'withdraw', fromStatus: rec.status, toStatus: '已撤回' });
    res.json({ success: true, message: '撤回成功' });
  } catch (error) {
    console.error('撤回项目失败:', error);
    res.status(500).json({ success: false, message: '撤回失败' });
  }
});

// 退回项目申请：当前审批人将申请退回给申请人，状态置为「已退回」，记录退回理由
router.post('/projects/:id/return', async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const { pool } = req.app.locals;
    const operator = getRealName(req);
    if (!operator) return res.status(401).json({ success: false, message: '未登录' });
    if (!reason || !String(reason).trim()) return res.status(400).json({ success: false, message: '退回理由不能为空' });
    const isManager = await isProjectManagerUser(req);
    const [[rec]] = await pool.query('SELECT * FROM project_applications WHERE id = ?', [id]);
    if (!rec) return res.status(404).json({ success: false, message: '项目申请不存在' });
    if (!isManager && rec.approver !== operator) return res.status(403).json({ success: false, message: '仅当前审批人可退回' });
    if (!['待审批', '审批中', 'pending', '待审核'].includes(rec.status)) {
      return res.status(400).json({ success: false, message: '当前状态不可退回' });
    }
    await pool.query('UPDATE project_applications SET status = ?, return_reason = ? WHERE id = ?', ['已退回', reason, id]);
    await appendReturnHistory(pool, 'project_applications', id, operator, reason);
    await createNotification(pool, { userId: rec.applicant_name, title: '项目申请被退回', content: `您的${rec.project_name}项目申请(${rec.project_code})被${operator}退回，原因：${reason}`, type: 'approval', relatedId: parseInt(id), relatedType: 'project' });
    await createOperationLog(pool, { username: operator, action: 'return', module: 'project', targetName: `${rec.project_name}项目(${rec.project_code})`, detail: reason });
    await appendApprovalLog(pool, { applicationType: 'project', applicationId: id, actor: operator, actorRole: '审批人', action: 'return', fromStatus: rec.status, toStatus: '已退回', comment: reason });
    res.json({ success: true, message: '已退回' });
  } catch (error) {
    console.error('退回项目失败:', error);
    res.status(500).json({ success: false, message: '退回失败' });
  }
});

// 软删除项目申请：仅已撤回/草稿状态可删，置 is_deleted=1（管理员后台仍可查）
router.post('/projects/:id/soft-delete', async (req, res) => {
  try {
    const { id } = req.params;
    const { pool } = req.app.locals;
    const operator = getRealName(req);
    if (!operator) return res.status(401).json({ success: false, message: '未登录' });
    const [[rec]] = await pool.query('SELECT * FROM project_applications WHERE id = ?', [id]);
    if (!rec) return res.status(404).json({ success: false, message: '项目申请不存在' });
    const isManager = await isProjectManagerUser(req);
    if (!isManager && rec.applicant_name !== operator) return res.status(403).json({ success: false, message: '无权限删除他人的申请' });
    if (!isManager && !['已撤回', '草稿', 'withdrawn', 'draft'].includes(rec.status)) {
      return res.status(400).json({ success: false, message: '仅「已撤回/草稿」状态可删除' });
    }
    await pool.query('UPDATE project_applications SET is_deleted = 1 WHERE id = ?', [id]);
    await createOperationLog(pool, { username: operator, action: 'soft_delete', module: 'project', targetName: `${rec.project_name}项目(${rec.project_code})`, detail: '软删除（逻辑删除）' });
    res.json({ success: true, message: '删除成功' });
  } catch (error) {
    console.error('删除项目失败:', error);
    res.status(500).json({ success: false, message: '删除失败' });
  }
});

// 删除项目申请（软删除）：仅已撤回/草稿状态可删，置 is_deleted=1
router.delete('/projects/:id', async (req, res) => {
  try {
    const { pool } = req.app.locals;
    const { id } = req.params;
    const [projects] = await pool.query('SELECT * FROM project_applications WHERE id = ?', [id]);
    if (projects.length === 0) {
      return res.status(404).json({ success: false, message: '项目不存在' });
    }
    // 安全加固：仅申请人本人（且已撤回/草稿）或管理角色可删除，防越权删除他人申请
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
    if (!isManager && !['已撤回', '草稿', 'withdrawn', 'draft'].includes(project.status)) {
      return res.status(400).json({ success: false, message: '仅「已撤回/草稿」状态可删除' });
    }
    await pool.query('UPDATE project_applications SET is_deleted = 1 WHERE id = ?', [id]);
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

    sql += ` ORDER BY created_at DESC LIMIT ${size} OFFSET ${offset}`;

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
    await appendApprovalLog(pool, { applicationType: 'businessTrip', applicationId: result.insertId, actor: applicantNameVal, actorRole: '申请人', action: 'submit', fromStatus: '', toStatus: 'pending', targetUser: approverNameVal || '' });
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
      await appendApprovalLog(pool, { applicationType: 'businessTrip', applicationId: id, actor: getRealName(req) || currentApprover || '系统', actorRole: '审批人', action: 'forward', fromStatus: trip.status, toStatus: trip.status, targetUser: forwardTo, comment: comment || '' });
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
    const tripLogAction = action === 'agree' ? 'approve' : action === 'reject' ? 'reject' : 'update';
    await appendApprovalLog(pool, { applicationType: 'businessTrip', applicationId: id, actor: approver.name, actorRole: '审批人', action: tripLogAction, fromStatus: trip.status, toStatus: newStatus, comment: comment || '' });

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


// 重新提交申请：申请人（已撤回 / 已退回 / 草稿）修改后再次提交，状态回到待审批
router.post('/projects/:id/resubmit', async (req, res) => {
  try {
    const { id } = req.params;
    const { pool } = req.app.locals;
    const operator = getRealName(req);
    if (!operator) return res.status(401).json({ success: false, message: '未登录' });
    const r = await resubmitApplication(pool, {
      table: 'project_applications',
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
        content: `${operator} 重新提交了一份项目申请，请审批`,
        type: 'approval'
      });
    }
    await createOperationLog(pool, {
      username: operator,
      action: 'resubmit',
      module: 'project',
      targetName: `${operator}的项目申请`,
      detail: '撤回/退回后重新提交'
    });
    await appendApprovalLog(pool, { applicationType: 'project', applicationId: id, actor: operator, actorRole: '申请人', action: 'resubmit', fromStatus: '', toStatus: 'pending' });
    res.json({ success: true, message: r.message });
  } catch (error) {
    console.error('重新提交失败:', error);
    res.status(500).json({ success: false, message: '重新提交失败' });
  }
});

// 审批生命周期日志查询（详情页时间线使用）：返回某条申请的全部动作链，按时间升序
router.get('/approval-logs', async (req, res) => {
  try {
    const { pool } = req.app.locals;
    const { type, id } = req.query;
    if (!type || !id) return res.status(400).json({ success: false, message: '缺少 type 或 id' });
    const [logs] = await pool.execute(
      'SELECT * FROM approval_logs WHERE application_type = ? AND application_id = ? ORDER BY created_at ASC, id ASC',
      [type, id]
    );
    let distributes = [];
    try {
      const [dr] = await pool.execute(
        'SELECT * FROM distributed_records WHERE applicationType = ? AND applicationId = ? ORDER BY createdAt ASC, id ASC',
        [type, id]
      );
      distributes = dr;
    } catch (e) {
      // distributed_records 表或字段异常不影响主时间线
      console.error('查询关联下发记录失败(可忽略):', e && e.message);
    }
    res.json({ success: true, data: logs, distributes });
  } catch (error) {
    console.error('查询审批日志失败:', error);
    res.status(500).json({ success: false, message: '查询审批日志失败' });
  }
});

// ===== 协同申请反馈端点（无审批：意见征集 / 通知） =====

// 校验当前用户是否为某协同申请的协同对象（user 直接匹配 / dept 校验部门归属）
async function resolveCollaboratorAuth(pool, appId, username) {
  const [userCols] = await pool.query(
    "SELECT id FROM project_collaborators WHERE application_id = ? AND target_type = 'user' AND target_name = ?",
    [appId, username]
  );
  if (userCols.length > 0) return true;
  const [deptCols] = await pool.query(
    "SELECT DISTINCT target_name FROM project_collaborators WHERE application_id = ? AND target_type = 'dept'",
    [appId]
  );
  for (const d of deptCols) {
    const [ems] = await pool.query('SELECT 1 FROM employees WHERE name = ? AND department = ?', [username, d.target_name]);
    if (ems.length > 0) return true;
  }
  return false;
}

// 协同对象落库：部门自动展开为部门成员个人行
// 设计要点：选部门作为协同对象时，在落库阶段即把部门成员逐个写入 project_collaborators
//（target_type='user'、dept=部门名），而非写一条 dept 行。这样"部门内任意一人响应"不会
// 误判为整个部门完成；每人独立响应、独立计入自动关闭判定，彻底消除"一人响应=整个部门已填写"的 bug。
// 返回展开后的逐人明细，供调用方逐个发通知。
async function insertCollaboratorsExpanded(pool, appId, collaborators, opts = {}) {
  const { addedBy = null, applicantName = '', projectName = '', excludeNames = [] } = opts;
  const inserted = [];
  // 需要排除的人员姓名集合（发起人），避免发起人把自己加为协同对象
  const excludes = new Set([applicantName].filter(Boolean));
  for (const c of (collaborators || [])) {
    if (!c) continue;
    const ttype = c && c.type === 'user' ? 'user' : 'dept';
    const collabRole = (c && c.collabRole) === 'cc' ? 'cc' : 'participant';
    const role = (c && (c.role || c.expectedRole)) || null;
    if (ttype === 'user') {
      const targetName = (c && c.name) || '';
      if (excludes.has(targetName)) {
        console.log('insertCollaboratorsExpanded: skip applicant as collaborator (user):', targetName);
        continue;
      }
      const [r] = await pool.query(
        'INSERT INTO project_collaborators (application_id, target_type, target_id, target_name, dept, expected_role, collab_role, added_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [appId, 'user', (c && c.id) || null, (c && c.name) || '', (c && (c.dept || c.department)) || null, role, collabRole, addedBy]
      );
      inserted.push({ id: r.insertId, target_type: 'user', target_name: (c && c.name) || '', dept: (c && (c.dept || c.department)) || null, collab_role: collabRole });
    } else {
      const deptName = (c && c.name) || '';
      const [members] = await pool.query('SELECT id, name, department FROM employees WHERE department = ?', [deptName]);
      if (members.length === 0) {
        // 兜底：部门无成员时仍保留一条部门行，避免协同对象丢失（极端情况）
        const [r] = await pool.query(
          'INSERT INTO project_collaborators (application_id, target_type, target_name, dept, expected_role, collab_role, added_by) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [appId, 'dept', deptName, deptName, role, collabRole, addedBy]
        );
        inserted.push({ id: r.insertId, target_type: 'dept', target_name: deptName, dept: deptName, collab_role: collabRole });
      } else {
        for (const m of members) {
          if (excludes.has(m.name)) {
            console.log('insertCollaboratorsExpanded: skip applicant as collaborator (dept member):', m.name);
            continue;
          }
          const [r] = await pool.query(
            'INSERT INTO project_collaborators (application_id, target_type, target_id, target_name, dept, expected_role, collab_role, added_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [appId, 'user', m.id || null, m.name, m.department || deptName, role, collabRole, addedBy]
          );
          inserted.push({ id: r.insertId, target_type: 'user', target_name: m.name, dept: m.department || deptName, collab_role: collabRole });
        }
      }
    }
  }
  return inserted;
}

// 协同动作实时同步：把某动作通知给"发起人 + 所有协同对象(部门展开为成员)"，排除操作者本人。
// 用于"已知晓 / 提交意见 / 追加对象"等动作，确保其他人能在消息中心实时看到进度。
async function notifyProjectParties(pool, appId, excludeName, { title, content, type = 'collaboration', relatedId, relatedType = 'project' }) {
  try {
    const [apps] = await pool.query('SELECT applicant_name, project_name FROM project_applications WHERE id = ?', [appId]);
    if (apps.length === 0) return;
    const targets = new Set();
    if (apps[0].applicant_name) targets.add(apps[0].applicant_name);
    const [cols] = await pool.query('SELECT target_type, target_name FROM project_collaborators WHERE application_id = ?', [appId]);
    for (const c of cols) {
      if (c.target_type === 'user') targets.add(c.target_name);
      else {
        const [members] = await pool.query('SELECT name FROM employees WHERE department = ?', [c.target_name]);
        for (const m of members) targets.add(m.name);
      }
    }
    for (const u of targets) {
      if (!u || u === excludeName) continue;
      await createNotification(pool, { userId: u, title, content, type, relatedId: Number(relatedId), relatedType });
    }
  } catch (e) { /* 通知失败不影响主流程 */ }
}

// 协同自动关闭判定（方案B）：当全部协同对象（参与人 + 抄送）均已响应后自动收口。
// participant 完成 = 已填写意见 或 已确认知晓；cc 完成 = 已确认知晓。
// 已关闭不重复触发；无任何协同对象时不自动关闭。
async function checkAndCloseCollaboration(pool, id, appMeta) {
  try {
    const [parts] = await pool.query(
      "SELECT ack_status, opinion_text FROM project_collaborators WHERE application_id = ?",
      [id]
    );
    if (parts.length === 0) return; // 无协同对象则不自动关闭
    const allDone = parts.every((p) =>
      p.ack_status === 'acknowledged' || (p.opinion_text && p.opinion_text.toString().trim())
    );
    if (!allDone) return;
    const [cur] = await pool.query('SELECT close_status FROM project_applications WHERE id = ?', [id]);
    if (cur.length === 0 || cur[0].close_status === 'closed') return;
    await pool.query("UPDATE project_applications SET close_status = 'closed', status = 'closed', updated_at = NOW() WHERE id = ?", [id]);
    // 系统关闭节点时间晚 1 秒，确保倒序时间线中“自动关闭”始终排在最后用户动作之上
    await appendApprovalLog(pool, { applicationType: 'project', applicationId: id, actor: '系统', actorRole: '系统', action: 'auto_close', fromStatus: 'open', toStatus: 'closed', targetUser: '', createdAt: 'DATE_ADD(NOW(), INTERVAL 1 SECOND)' });
    // 收尾通知：全员可见"协同已完成"
    await notifyProjectParties(pool, id, '', {
      title: '协同已完成',
      content: `协同事项「${appMeta.project_name || ''}」的全部协同对象已响应，协同自动结束`,
      relatedId: id
    });
  } catch (e) { /* 不影响主流程 */ }
}

// 通知模式：协同对象已知晓
router.post('/projects/:id/ack', async (req, res) => {
  try {
    const { pool } = req.app.locals;
    const { id } = req.params;
    const me = getRealName(req);
    if (!me) return res.status(401).json({ success: false, message: '未登录' });
    const [apps] = await pool.query('SELECT id, collaboration_mode, close_status, applicant_name, project_name FROM project_applications WHERE id = ?', [id]);
    if (apps.length === 0) return res.status(404).json({ success: false, message: '协同申请不存在' });
    if (apps[0].close_status === 'closed') return res.status(400).json({ success: false, message: '该协同已结束，无法确认' });
    const authorized = await resolveCollaboratorAuth(pool, id, me);
    if (!authorized) return res.status(403).json({ success: false, message: '您不是该协同的协同对象，无法确认' });
    // 先取当前用户所在部门，避免 UPDATE 中跨表字符串比较触发 collation 不一致 500
    const [empRows] = await pool.query('SELECT department FROM employees WHERE name = ? LIMIT 1', [me]);
    const myDept = empRows[0]?.department || '';
    const [result] = await pool.query(
      `UPDATE project_collaborators
       SET ack_status = 'acknowledged', ack_at = NOW()
       WHERE application_id = ?
         AND ((target_type = 'user' AND target_name = ?)
              OR (target_type = 'dept' AND target_name = ?))`,
      [id, me, myDept]
    );
    await appendApprovalLog(pool, { applicationType: 'project', applicationId: id, actor: me, actorRole: '协同对象', action: 'ack', fromStatus: '', toStatus: 'acknowledged', targetUser: me });
    // 实时同步消息中心：通知发起人 + 所有协同对象（除操作者本人）
    await notifyProjectParties(pool, id, me, {
      title: '协同已知晓',
      content: `${me} 已知晓了协同事项「${apps[0].project_name || ''}」`,
      relatedId: id
    });
    // 方案A：全部参与人响应后自动关闭并通知全员
    await checkAndCloseCollaboration(pool, id, apps[0]);
    res.json({ success: true, data: { updated: result.affectedRows } });
  } catch (error) {
    console.error('协同已知晓失败:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// 意见征集模式：协同对象提交意见
router.post('/projects/:id/opinion', async (req, res) => {
  try {
    const { pool } = req.app.locals;
    const { id } = req.params;
    const { opinion } = req.body;
    const me = getRealName(req);
    if (!me) return res.status(401).json({ success: false, message: '未登录' });
    if (!opinion || !opinion.toString().trim()) return res.status(400).json({ success: false, message: '意见内容不能为空' });
    const [apps] = await pool.query('SELECT id, collaboration_mode, close_status, applicant_name, project_name FROM project_applications WHERE id = ?', [id]);
    if (apps.length === 0) return res.status(404).json({ success: false, message: '协同申请不存在' });
    if (apps[0].close_status === 'closed') return res.status(400).json({ success: false, message: '该协同已结束，无法提交意见' });
    const authorized = await resolveCollaboratorAuth(pool, id, me);
    if (!authorized) return res.status(403).json({ success: false, message: '您不是该协同的协同对象，无法提交意见' });
    // 先取当前用户所在部门，避免 UPDATE 中跨表字符串比较触发 collation 不一致 500
    const [empRows] = await pool.query('SELECT department FROM employees WHERE name = ? LIMIT 1', [me]);
    const myDept = empRows[0]?.department || '';
    const [result] = await pool.query(
      `UPDATE project_collaborators
       SET opinion_text = ?, opinion_at = NOW()
       WHERE application_id = ?
         AND ((target_type = 'user' AND target_name = ?)
              OR (target_type = 'dept' AND target_name = ?))`,
      [opinion.toString().trim(), id, me, myDept]
    );
    await appendApprovalLog(pool, { applicationType: 'project', applicationId: id, actor: me, actorRole: '协同对象', action: 'opinion', fromStatus: '', toStatus: '', targetUser: me, comment: opinion.toString().trim().slice(0, 200) });
    // 实时同步消息中心：通知发起人 + 所有协同对象（除操作者本人）
    await notifyProjectParties(pool, id, me, {
      title: '协同意见提交',
      content: `${me} 对协同事项「${apps[0].project_name || ''}」提交了意见${opinion ? '：' + opinion.toString().trim().slice(0, 50) : ''}`,
      relatedId: id
    });
    // 方案A：全部参与人响应后自动关闭并通知全员
    await checkAndCloseCollaboration(pool, id, apps[0]);
    res.json({ success: true, data: { updated: result.affectedRows } });
  } catch (error) {
    console.error('提交协同意见失败:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// 链式转发：追加协同对象
// 权限：发起人，或"已响应"的参与人（participant 已填写意见 / 旧 notify 已确认）。
// 新对象写入 project_collaborators（added_by=操作者），并实时通知全员；被追加的参与人会收到"请响应"提示。
router.post('/projects/:id/collaborators', async (req, res) => {
  try {
    const { pool } = req.app.locals;
    const { id } = req.params;
    const me = getRealName(req);
    if (!me) return res.status(401).json({ success: false, message: '未登录' });
    const [apps] = await pool.query('SELECT id, collaboration_mode, close_status, applicant_name, project_name FROM project_applications WHERE id = ?', [id]);
    if (apps.length === 0) return res.status(404).json({ success: false, message: '协同申请不存在' });
    // 链式转发兼容方案A：已自动结束的协同追加对象时回置为 open，允许链路继续生长
    if (apps[0].close_status === 'closed') {
      await pool.query(
        'UPDATE project_applications SET close_status = ?, status = ?, updated_at = NOW() WHERE id = ?',
        ['open', 'processing', id]
      );
      // 记录重开节点，闭合证据链（追加对象导致已结束协同被重新打开）
      await appendApprovalLog(pool, {
        applicationType: 'project',
        applicationId: id,
        actor: me,
        actorRole: (apps[0].applicant_name || '') === me ? '发起人' : '协同对象',
        action: 'reopen',
        fromStatus: 'closed',
        toStatus: 'processing',
        targetUser: '',
        comment: '追加协同对象，协同已重开'
      });
    }

    // 鉴权：发起人 或 已响应的参与人
    // 部门协同对象已展开为成员个人行（target_type='user' + dept 字段），
    // 故"我"的响应状态直接用 user 行匹配即可，避免跨表排序规则不匹配（原 LEFT JOIN 在
    // employees.department 与 project_collaborators.target_name 排序规则不一致时会 500）。
    const isApplicant = (apps[0].applicant_name || '') === me;
    let canAdd = isApplicant;
    if (!canAdd) {
      const authorized = await resolveCollaboratorAuth(pool, id, me);
      if (authorized) {
        const [myRows] = await pool.query(
          `SELECT ack_status, opinion_text FROM project_collaborators WHERE application_id = ? AND target_type = 'user' AND target_name = ?`,
          [id, me]
        );
        if (myRows.length > 0) {
          canAdd = myRows.some((r) => (r.opinion_text && r.opinion_text.toString().trim()) || r.ack_status === 'acknowledged');
        } else {
          // 兼容旧数据：部门作为整体协同对象（target_type='dept'）时，部门成员按部门行状态判定
          const [deptCols] = await pool.query(
            `SELECT target_name, ack_status, opinion_text FROM project_collaborators WHERE application_id = ? AND target_type = 'dept'`,
            [id]
          );
          for (const d of deptCols) {
            const [ems] = await pool.query('SELECT 1 FROM employees WHERE name = ? AND department = ?', [me, d.target_name]);
            if (ems.length > 0) {
              canAdd = (d.ack_status === 'acknowledged') || !!d.opinion_text;
              break;
            }
          }
        }
      }
    }
    if (!canAdd) return res.status(403).json({ success: false, message: '仅发起人或已响应的参与人可追加协同对象' });

    const collaborators = Array.isArray(req.body.collaborators) ? req.body.collaborators : [];
    if (collaborators.length === 0) return res.status(400).json({ success: false, message: '请至少添加一个协同对象' });

    // 部门协同对象展开为成员个人行（同提交逻辑），避免"一人响应代表整个部门完成"
    const insertedCols = await insertCollaboratorsExpanded(pool, id, collaborators, {
      addedBy: me,
      applicantName: apps[0].applicant_name,
      projectName: apps[0].project_name
    });

    // 被追加对象（参与人）单独通知"请响应"
    const verb = '填写意见';
    for (const ic of insertedCols) {
      if (ic.collab_role === 'participant') {
        await createNotification(pool, { userId: ic.target_name, title: '协同对象更新', content: `${me} 将您加入协同事项「${apps[0].project_name || ''}」，请${verb}`, type: 'collaboration', relatedId: Number(id), relatedType: 'project' });
      }
    }

    // 通知其余相关人：某人追加了协同对象
    await notifyProjectParties(pool, id, me, {
      title: '协同对象更新',
      content: `${me} 在协同事项「${apps[0].project_name || ''}」中追加了 ${insertedCols.length} 位协同对象`,
      relatedId: id
    });
    await appendApprovalLog(pool, { applicationType: 'project', applicationId: id, actor: me, actorRole: isApplicant ? '发起人' : '协同对象', action: 'add_collaborator', fromStatus: '', toStatus: '', targetUser: insertedCols.map((c) => c.target_name).filter(Boolean).join(',') });

    res.json({ success: true, data: { inserted: insertedCols.length } });
  } catch (error) {
    console.error('追加协同对象失败:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
export const initWorkflowEngine = () => {};
