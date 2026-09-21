import express from 'express';
const router = express.Router();

import { createNotification, createOperationLog } from '../utils/audit.js';
import { requireRole } from '../middleware/auth.js';

// 将登录账号(users.id)解析为对应的员工(employees.id)
// OA 审批链路中 currentApproverId / applicantId / approverId 统一使用 employees.id，
// 而 JWT 与登录态使用的是 users.id，二者需在此转换，否则所有审批查询/处理均错位
const resolveEmployeeId = async (pool, userId) => {
  if (userId === undefined || userId === null) return null;
  const [users] = await pool.execute('SELECT username FROM users WHERE id = ?', [userId]);
  if (users.length === 0) return null;
  let name = users[0].username;
  if (name && name.startsWith('emp_')) {
    const parts = String(name).split('_');
    if (parts.length >= 2) name = parts[1];
  }
  const [employees] = await pool.execute('SELECT id FROM employees WHERE name = ?', [name]);
  return employees.length ? employees[0].id : null;
};

// 安全解析 JSON 列：MySQL JSON 类型经 mysql2 读取时已自动反序列化为对象/数组，
// 若再 JSON.parse 会抛 "[object Object]" 错误。已是对象/数组则原样返回，仅对字符串二次解析。
const parseJsonField = (value, fallback) => {
  if (value === null || value === undefined) return fallback;
  if (typeof value === 'object') return value;
  if (typeof value === 'string') {
    try { return JSON.parse(value); } catch { return fallback; }
  }
  return fallback;
};

const generateApprovalPath = async (connection, flowCode, applicantDept, applicantPosition) => {
  const approvalPath = [];
  let order = 1;

  // 报销流程：固定财务总监→总经理
  if (flowCode === 'reimburse') {
    const [financeDirector] = await connection.execute(
      'SELECT e.* FROM employees e JOIN oa_approver_configs c ON e.department = c.department AND e.position = c.position WHERE c.isFinanceDirector = ?',
      [1]
    );
    if (financeDirector.length > 0) {
      approvalPath.push({
        order: order++, type: 'finance_director', position: financeDirector[0].position,
        name: financeDirector[0].name, userId: financeDirector[0].id
      });
    }
    const [topManager] = await connection.execute(
      'SELECT e.* FROM employees e JOIN oa_approver_configs c ON e.department = c.department AND e.position = c.position WHERE c.isTopManager = ?',
      [1]
    );
    if (topManager.length > 0) {
      approvalPath.push({
        order: order++, type: 'top_manager', position: topManager[0].position,
        name: topManager[0].name, userId: topManager[0].id
      });
    }
    return approvalPath;
  }

  // 标准流程：直属上级→部门经理→总经理→财务总监
  const [approverConfigs] = await connection.execute(
    'SELECT * FROM oa_approver_configs WHERE department = ? AND position = ?',
    [applicantDept, applicantPosition]
  );
  if (approverConfigs.length === 0) return approvalPath;

  const config = approverConfigs[0];

  if (config.superiorPosition) {
    const [superior] = await connection.execute(
      'SELECT e.* FROM employees e JOIN oa_approver_configs c ON e.department = c.department AND e.position = c.position WHERE c.department = ? AND c.position = ?',
      [applicantDept, config.superiorPosition]
    );
    if (superior.length > 0) {
      approvalPath.push({ order: order++, type: 'direct_superior', position: config.superiorPosition, name: superior[0].name, userId: superior[0].id });
    }
  }

  if (!config.isDeptManager) {
    const [deptManager] = await connection.execute(
      'SELECT e.* FROM employees e JOIN oa_approver_configs c ON e.department = c.department AND e.position = c.position WHERE c.department = ? AND c.isDeptManager = ?',
      [applicantDept, 1]
    );
    if (deptManager.length > 0 && !approvalPath.find(p => p.userId === deptManager[0].id)) {
      approvalPath.push({ order: order++, type: 'dept_manager', position: deptManager[0].position, name: deptManager[0].name, userId: deptManager[0].id });
    }
  }

  if (approvalPath.length === 0) {
    const [topManager] = await connection.execute(
      'SELECT e.* FROM employees e JOIN oa_approver_configs c ON e.department = c.department AND e.position = c.position WHERE c.isTopManager = ?',
      [1]
    );
    if (topManager.length > 0) {
      approvalPath.push({ order: order++, type: 'top_manager', position: topManager[0].position, name: topManager[0].name, userId: topManager[0].id, note: '直接上级缺失，直达最高管理者' });
    }
  } else {
    const [topManager] = await connection.execute(
      'SELECT e.* FROM employees e JOIN oa_approver_configs c ON e.department = c.department AND e.position = c.position WHERE c.isTopManager = ?',
      [1]
    );
    if (topManager.length > 0 && !approvalPath.find(p => p.userId === topManager[0].id)) {
      approvalPath.push({ order: order++, type: 'top_manager', position: topManager[0].position, name: topManager[0].name, userId: topManager[0].id });
    }
  }

  const [financeDirector] = await connection.execute(
    'SELECT e.* FROM employees e JOIN oa_approver_configs c ON e.department = c.department AND e.position = c.position WHERE c.isFinanceDirector = ?',
    [1]
  );
  if (financeDirector.length > 0 && !approvalPath.find(p => p.userId === financeDirector[0].id)) {
    approvalPath.push({ order: order++, type: 'finance_director', position: financeDirector[0].position, name: financeDirector[0].name, userId: financeDirector[0].id });
  }

  return approvalPath;
};

// 获取审批流程列表
router.get('/oa/flows', async (req, res) => {
  const { pool } = req.app.locals;
  try {
    const [flows] = await pool.execute('SELECT * FROM oa_approval_flows WHERE status = ?', ['启用']);
    res.json({ success: true, data: flows });
  } catch (error) {
    console.error('获取审批流程列表失败:', error);
    res.status(500).json({ success: false, message: '获取审批流程列表失败: ' + error.message });
  }
});

// 生成审批路径
router.post('/oa/generate-approval-path', async (req, res) => {
  const { pool } = req.app.locals;
  try {
    const { flowCode, applicantDept, applicantPosition } = req.body;
    const approvalPath = await generateApprovalPath(pool, flowCode || '', applicantDept, applicantPosition);
    if (approvalPath.length === 0) {
      return res.status(400).json({ success: false, message: '未找到申请人的职位配置' });
    }
    res.json({ success: true, data: approvalPath });
  } catch (error) {
    console.error('生成审批路径失败:', error);
    res.status(500).json({ success: false, message: '生成审批路径失败: ' + error.message });
  }
});

// 提交审批申请
router.post('/oa/submit', async (req, res) => {
  const { pool } = req.app.locals;
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const { flowCode, applicantId, applicantName, applicantDept, applicantPosition, businessType, businessData } = req.body;

    const [approverConfigs] = await connection.execute(
      'SELECT * FROM oa_approver_configs WHERE department = ? AND position = ?',
      [applicantDept, applicantPosition]
    );

    if (approverConfigs.length === 0) {
      await connection.rollback();
      return res.status(400).json({ success: false, message: '未找到申请人的职位配置' });
    }

    const config = approverConfigs[0];
    const approvalPath = [];
    let order = 1;

    if (config.superiorPosition) {
      const [superior] = await connection.execute(
        'SELECT e.* FROM employees e JOIN oa_approver_configs c ON e.department = c.department AND e.position = c.position WHERE c.department = ? AND c.position = ?',
        [applicantDept, config.superiorPosition]
      );

      if (superior.length > 0) {
        approvalPath.push({
          order: order++,
          type: 'direct_superior',
          position: config.superiorPosition,
          name: superior[0].name,
          userId: superior[0].id
        });
      }
    }

    if (!config.isDeptManager) {
      const [deptManager] = await connection.execute(
        'SELECT e.* FROM employees e JOIN oa_approver_configs c ON e.department = c.department AND e.position = c.position WHERE c.department = ? AND c.isDeptManager = ?',
        [applicantDept, true]
      );

      if (deptManager.length > 0) {
        const existingIndex = approvalPath.findIndex(p => p.userId === deptManager[0].id);
        if (existingIndex === -1) {
          approvalPath.push({
            order: order++,
            type: 'dept_manager',
            position: deptManager[0].position,
            name: deptManager[0].name,
            userId: deptManager[0].id
          });
        }
      }
    }

    if (approvalPath.length === 0) {
      const [topManager] = await connection.execute(
        'SELECT e.* FROM employees e JOIN oa_approver_configs c ON e.department = c.department AND e.position = c.position WHERE c.isTopManager = ?',
        [true]
      );

      if (topManager.length > 0) {
        approvalPath.push({
          order: order++,
          type: 'top_manager',
          position: topManager[0].position,
          name: topManager[0].name,
          userId: topManager[0].id,
          note: '直接上级缺失，直达最高管理者'
        });
      }
    } else {
      const [topManager] = await connection.execute(
        'SELECT e.* FROM employees e JOIN oa_approver_configs c ON e.department = c.department AND e.position = c.position WHERE c.isTopManager = ?',
        [true]
      );

      if (topManager.length > 0) {
        approvalPath.push({
          order: order++,
          type: 'top_manager',
          position: topManager[0].position,
          name: topManager[0].name,
          userId: topManager[0].id
        });
      }
    }

    const [financeDirector] = await connection.execute(
      'SELECT e.* FROM employees e JOIN oa_approver_configs c ON e.department = c.department AND e.position = c.position WHERE c.isFinanceDirector = ?',
      [true]
    );

    if (financeDirector.length > 0) {
      approvalPath.push({
        order: order++,
        type: 'finance_director',
        position: financeDirector[0].position,
        name: financeDirector[0].name,
        userId: financeDirector[0].id
      });
    }

    if (approvalPath.length === 0) {
      await connection.rollback();
      return res.status(400).json({ success: false, message: '无法生成审批路径，请检查组织架构配置' });
    }

    const firstApprover = approvalPath[0];
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');

    const [result] = await connection.execute(
      'INSERT INTO oa_approval_instances (flowCode, applicantId, applicantName, applicantDept, applicantPosition, businessType, businessData, currentApproverType, currentApproverId, currentApproverName, approvalPath, status, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [flowCode, applicantId, applicantName, applicantDept, applicantPosition, businessType, JSON.stringify(businessData), firstApprover.type, firstApprover.userId, firstApprover.name, JSON.stringify(approvalPath), '审批中', now]
    );

    await connection.commit();

    await createNotification(pool, {
      userId: firstApprover.name,
      title: 'OA审批提醒',
      content: `${applicantName} 提交了${businessType}审批申请，请审批`,
      type: 'approval',
      relatedId: result.insertId,
      relatedType: 'oa_approval'
    });
    await createOperationLog(pool, {
      username: applicantName,
      action: 'submit',
      module: 'oa_approval',
      targetName: `${businessType}审批`,
      detail: `提交给${firstApprover.name}审批`
    });

    res.json({
      success: true,
      message: '申请提交成功',
      data: {
        instanceId: result.insertId,
        approvalPath: approvalPath,
        currentApprover: firstApprover
      }
    });
  } catch (error) {
    await connection.rollback();
    console.error('提交审批申请失败:', error);
    res.status(500).json({ success: false, message: '提交审批申请失败: ' + error.message });
  } finally {
    connection.release();
  }
});

// 获取我的待办审批列表
router.get('/oa/todo/:userId', async (req, res) => {
  const { pool } = req.app.locals;
  try {
    // OA 审批链路以 employees.id 为审批人标识；JWT/登录态是 users.id，需转换
    const empId = await resolveEmployeeId(pool, req.user?.id);
    const userId = empId !== null ? String(empId) : (req.user?.id !== undefined ? String(req.user.id) : req.params.userId);

    const [instances] = await pool.execute(
      'SELECT * FROM oa_approval_instances WHERE currentApproverId = ? AND status = ? ORDER BY createdAt DESC',
      [userId, '审批中']
    );

    const formattedInstances = instances.map(instance => ({
      ...instance,
      businessData: parseJsonField(instance.businessData, {}),
      approvalPath: parseJsonField(instance.approvalPath, [])
    }));

    res.json({ success: true, data: formattedInstances });
  } catch (error) {
    console.error('获取待办审批列表失败:', error);
    res.status(500).json({ success: false, message: '获取待办审批列表失败: ' + error.message });
  }
});

// 获取我的已办审批列表
router.get('/oa/done/:userId', async (req, res) => {
  const { pool } = req.app.locals;
  try {
    // OA 审批链路以 employees.id 为审批人标识；JWT/登录态是 users.id，需转换
    const empId = await resolveEmployeeId(pool, req.user?.id);
    const userId = empId !== null ? String(empId) : (req.user?.id !== undefined ? String(req.user.id) : req.params.userId);

    const [histories] = await pool.execute(
      `SELECT h.*, i.flowCode, i.applicantName, i.applicantDept, i.businessType, i.businessData, i.status as instanceStatus 
       FROM oa_approval_history h 
       JOIN oa_approval_instances i ON h.instanceId = i.id 
       WHERE h.approverId = ? 
       ORDER BY h.createdAt DESC`,
      [userId]
    );

    const formattedHistories = histories.map(history => ({
      ...history,
      businessData: parseJsonField(history.businessData, {})
    }));

    res.json({ success: true, data: formattedHistories });
  } catch (error) {
    console.error('获取已办审批列表失败:', error);
    res.status(500).json({ success: false, message: '获取已办审批列表失败: ' + error.message });
  }
});

// 获取我发起的审批列表
router.get('/oa/my-applications/:userId', async (req, res) => {
  const { pool } = req.app.locals;
  try {
    const { userId } = req.params;
    // applicantId 历史数据中可能混用 users.id 与 employees.id，二者皆匹配以兼容存量数据
    const empId = await resolveEmployeeId(pool, userId);
    const candidates = empId !== null ? [String(userId), String(empId)] : [String(userId)];

    const [instances] = await pool.execute(
      `SELECT * FROM oa_approval_instances WHERE applicantId IN (${candidates.map(() => '?').join(',')}) ORDER BY createdAt DESC`,
      candidates
    );

    const formattedInstances = instances.map(instance => ({
      ...instance,
      businessData: parseJsonField(instance.businessData, {}),
      approvalPath: parseJsonField(instance.approvalPath, [])
    }));

    res.json({ success: true, data: formattedInstances });
  } catch (error) {
    console.error('获取我的申请列表失败:', error);
    res.status(500).json({ success: false, message: '获取我的申请列表失败: ' + error.message });
  }
});

// 获取审批详情
router.get('/oa/detail/:instanceId', async (req, res) => {
  const { pool } = req.app.locals;
  try {
    const { instanceId } = req.params;

    const [instances] = await pool.execute(
      'SELECT * FROM oa_approval_instances WHERE id = ?',
      [instanceId]
    );

    if (instances.length === 0) {
      return res.status(404).json({ success: false, message: '审批实例不存在' });
    }

    const instance = instances[0];

    const [histories] = await pool.execute(
      'SELECT * FROM oa_approval_history WHERE instanceId = ? ORDER BY nodeOrder ASC',
      [instanceId]
    );

    res.json({
      success: true,
      data: {
        ...instance,
        businessData: parseJsonField(instance.businessData, {}),
        approvalPath: parseJsonField(instance.approvalPath, []),
        histories: histories
      }
    });
  } catch (error) {
    console.error('获取审批详情失败:', error);
    res.status(500).json({ success: false, message: '获取审批详情失败: ' + error.message });
  }
});

// 处理审批
router.post('/oa/process', async (req, res) => {
  const { pool } = req.app.locals;
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const { instanceId, action, comment } = req.body;

    // 审批人身份统一从 JWT token 解析，禁止信任请求体中的 approverId/approverName
    // OA 审批链路以 employees.id 为标识，需将 JWT 的 users.id 转换为 employees.id
    const approverId = (await resolveEmployeeId(pool, req.user?.id)) ?? (req.user?.id || null);
    const approverName = req.user?.name || req.user?.username || '';
    const approverPosition = req.body.approverPosition || '';

    const [instances] = await connection.execute(
      'SELECT * FROM oa_approval_instances WHERE id = ?',
      [instanceId]
    );

    if (instances.length === 0) {
      await connection.rollback();
      return res.status(404).json({ success: false, message: '审批实例不存在' });
    }

    const instance = instances[0];

    if (String(instance.currentApproverId) !== String(approverId)) {
      await connection.rollback();
      return res.status(403).json({ success: false, message: '您不是当前审批人，无权处理' });
    }

    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
    const approvalPath = parseJsonField(instance.approvalPath, []);
    const currentNodeOrder = approvalPath.findIndex(p => p.userId === approverId) + 1;

    await connection.execute(
      'INSERT INTO oa_approval_history (instanceId, nodeOrder, approverType, approverId, approverName, approverPosition, action, comment, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [instanceId, currentNodeOrder, instance.currentApproverType, approverId, approverName, approverPosition, action, comment, now]
    );

    if (action === 'agree') {
      const currentIndex = approvalPath.findIndex(p => p.userId === approverId);
      const nextNode = approvalPath[currentIndex + 1];

      if (!nextNode) {
        await connection.execute(
          'UPDATE oa_approval_instances SET status = ?, completedAt = ? WHERE id = ?',
          ['已批准', now, instanceId]
        );
      } else {
        await connection.execute(
          'UPDATE oa_approval_instances SET currentApproverType = ?, currentApproverId = ?, currentApproverName = ? WHERE id = ?',
          [nextNode.type, nextNode.userId, nextNode.name, instanceId]
        );
      }
    } else if (action === 'reject') {
      await connection.execute(
        'UPDATE oa_approval_instances SET status = ?, completedAt = ? WHERE id = ?',
        ['已驳回', now, instanceId]
      );
    } else if (action === 'return') {
      await connection.execute(
        'UPDATE oa_approval_instances SET status = ?, currentApproverType = NULL, currentApproverId = NULL, currentApproverName = NULL WHERE id = ?',
        ['已退回', instanceId]
      );
    }

    await connection.commit();

    if (action === 'agree') {
      const currentIndex = approvalPath.findIndex(p => p.userId === approverId);
      const nextNode = approvalPath[currentIndex + 1];

      if (nextNode) {
        await createNotification(pool, {
          userId: nextNode.name,
          title: 'OA审批提醒',
          content: `${instance.applicantName}的${instance.businessType}审批申请待您审批`,
          type: 'approval',
          relatedId: instanceId,
          relatedType: 'oa_approval'
        });
      } else {
        await createNotification(pool, {
          userId: instance.applicantName,
          title: 'OA审批通过',
          content: `您的${instance.businessType}审批申请已全部通过`,
          type: 'approval',
          relatedId: instanceId,
          relatedType: 'oa_approval'
        });
      }
    } else if (action === 'reject') {
      await createNotification(pool, {
        userId: instance.applicantName,
        title: 'OA审批驳回',
        content: `您的${instance.businessType}审批申请已被驳回`,
        type: 'approval',
        relatedId: instanceId,
        relatedType: 'oa_approval'
      });
    } else if (action === 'return') {
      await createNotification(pool, {
        userId: instance.applicantName,
        title: 'OA审批退回',
        content: `您的${instance.businessType}审批申请已被退回修改`,
        type: 'approval',
        relatedId: instanceId,
        relatedType: 'oa_approval'
      });
    }

    await createOperationLog(pool, {
      username: approverName,
      action: action === 'agree' ? 'approve' : action,
      module: 'oa_approval',
      targetName: `${instance.businessType}审批(${instance.flowCode})`,
      detail: comment || ''
    });

    res.json({ success: true, message: '审批处理成功' });
  } catch (error) {
    await connection.rollback();
    console.error('处理审批失败:', error);
    res.status(500).json({ success: false, message: '处理审批失败: ' + error.message });
  } finally {
    connection.release();
  }
});

// 撤回申请
router.post('/oa/withdraw', async (req, res) => {
  const { pool } = req.app.locals;
  try {
    const { instanceId } = req.body;
    // 安全加固：申请人身份一律从 JWT token 解析，禁止撤回他人申请
    // OA 审批链路以 employees.id 为标识，需将 JWT 的 users.id 转换为 employees.id
    const empId = await resolveEmployeeId(pool, req.user?.id);
    const applicantId = empId !== null ? empId : (req.user?.id ?? null);

    const [instances] = await pool.execute(
      'SELECT * FROM oa_approval_instances WHERE id = ? AND applicantId = ? AND status = ?',
      [instanceId, applicantId, '审批中']
    );

    if (instances.length === 0) {
      return res.status(400).json({ success: false, message: '申请不存在或无法撤回' });
    }

    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
    await pool.execute(
      'UPDATE oa_approval_instances SET status = ?, completedAt = ? WHERE id = ?',
      ['已撤回', now, instanceId]
    );

    // 撤回审批审计
    const operator = req.user?.name || req.user?.username || '系统';
    createOperationLog(pool, { userId: String(req.user?.id || ''), username: operator, action: 'withdraw', module: 'oa_approval', targetId: instanceId, targetName: `${instances[0].businessType}审批(${instances[0].flowCode})`, detail: '撤回审批', ipAddress: req.ip });

    res.json({ success: true, message: '申请撤回成功' });
  } catch (error) {
    console.error('撤回申请失败:', error);
    res.status(500).json({ success: false, message: '撤回申请失败: ' + error.message });
  }
});

// 获取审批人配置列表
router.get('/oa/approver-configs', async (req, res) => {
  const { pool } = req.app.locals;
  try {
    const [configs] = await pool.execute('SELECT * FROM oa_approver_configs ORDER BY department, position');
    res.json({ success: true, data: configs });
  } catch (error) {
    console.error('获取审批人配置失败:', error);
    res.status(500).json({ success: false, message: '获取审批人配置失败: ' + error.message });
  }
});

// 首页审批数据聚合：跨 7 张业务表按姓名统计，与 OAWorkflowView 真实数据对齐
router.get('/home/approval-summary', async (req, res) => {
  const { pool } = req.app.locals;
  try {
    const userName = req.user?.name || req.user?.username;
    if (!userName) {
      return res.status(401).json({ success: false, message: '未登录' });
    }

    const pendingStatuses = ['待审批', '审批中', 'pending', '待审核'];
    const approvedStatuses = ['已批准', 'approved'];
    const rejectedStatuses = ['已拒绝', '拒绝', 'rejected'];
    const returnedStatuses = ['已退回', 'returned'];
    const withdrawnStatuses = ['已撤回', 'withdrawn', '已取消', 'cancelled'];

    // 7 张业务表的申请人/审批人字段映射
    const applicantTables = [
      { table: 'leave_applications', applicantCol: 'applicant', approverCol: 'approver', isDeleted: false },
      { table: 'reimbursements', applicantCol: 'applicant', approverCol: 'approver', isDeleted: true },
      { table: 'meetings', applicantCol: 'organizer', approverCol: 'approver', isDeleted: false },
      { table: 'project_applications', applicantCol: 'applicant_name', approverCol: 'approver', isDeleted: true },
      { table: 'entertainment_expenses', applicantCol: 'applicant', approverCol: 'approver', isDeleted: true },
      { table: 'office_supplies_applications', applicantCol: 'applicant', approverCol: 'approver', isDeleted: true },
      { table: 'business_trip_applications', applicantCol: 'applicant_name', approverCol: 'approver', isDeleted: true }
    ];

    const statusFilter = (col, statuses) => statuses.map(s => `${col} = ?`).join(' OR ');

    const counts = {
      myTotal: 0, myPending: 0, myApproved: 0, myRejected: 0,
      myReturned: 0, myWithdrawn: 0, todoTotal: 0, doneTotal: 0
    };

    for (const { table, applicantCol, approverCol, isDeleted } of applicantTables) {
      const deletedSql = isDeleted ? ` AND (is_deleted = 0 OR is_deleted IS NULL)` : '';

      // 我发起的总数
      const [myTotal] = await pool.execute(
        `SELECT COUNT(*) as c FROM ${table} WHERE ${applicantCol} = ?${deletedSql}`,
        [userName]
      );
      counts.myTotal += myTotal[0].c;

      // 我发起的 - 进行中
      const [myPending] = await pool.execute(
        `SELECT COUNT(*) as c FROM ${table} WHERE ${applicantCol} = ? AND (${statusFilter('status', pendingStatuses)})${deletedSql}`,
        [userName, ...pendingStatuses]
      );
      counts.myPending += myPending[0].c;

      // 我发起的 - 已通过
      const [myApproved] = await pool.execute(
        `SELECT COUNT(*) as c FROM ${table} WHERE ${applicantCol} = ? AND (${statusFilter('status', approvedStatuses)})${deletedSql}`,
        [userName, ...approvedStatuses]
      );
      counts.myApproved += myApproved[0].c;

      // 我发起的 - 已拒绝
      const [myRejected] = await pool.execute(
        `SELECT COUNT(*) as c FROM ${table} WHERE ${applicantCol} = ? AND (${statusFilter('status', rejectedStatuses)})${deletedSql}`,
        [userName, ...rejectedStatuses]
      );
      counts.myRejected += myRejected[0].c;

      // 我发起的 - 已退回
      const [myReturned] = await pool.execute(
        `SELECT COUNT(*) as c FROM ${table} WHERE ${applicantCol} = ? AND (${statusFilter('status', returnedStatuses)})${deletedSql}`,
        [userName, ...returnedStatuses]
      );
      counts.myReturned += myReturned[0].c;

      // 我发起的 - 已撤回
      const [myWithdrawn] = await pool.execute(
        `SELECT COUNT(*) as c FROM ${table} WHERE ${applicantCol} = ? AND (${statusFilter('status', withdrawnStatuses)})${deletedSql}`,
        [userName, ...withdrawnStatuses]
      );
      counts.myWithdrawn += myWithdrawn[0].c;

      // 待我审批：当前审批人 = 我 且 进行中
      const [todoTotal] = await pool.execute(
        `SELECT COUNT(*) as c FROM ${table} WHERE ${approverCol} = ? AND (${statusFilter('status', pendingStatuses)})${deletedSql}`,
        [userName, ...pendingStatuses]
      );
      counts.todoTotal += todoTotal[0].c;

      // 已办：当前审批人 = 我 且 非进行中（单审批人流程近似；精确历史需 approval_history 表）
      const [doneTotal] = await pool.execute(
        `SELECT COUNT(*) as c FROM ${table} WHERE ${approverCol} = ? AND NOT (${statusFilter('status', pendingStatuses)})${deletedSql}`,
        [userName, ...pendingStatuses]
      );
      counts.doneTotal += doneTotal[0].c;
    }

    res.json({ success: true, data: counts });
  } catch (error) {
    console.error('获取首页审批聚合数据失败:', error);
    res.status(500).json({ success: false, message: '获取首页审批聚合数据失败: ' + error.message });
  }
});

// 将 userId(users.id) 解析为真实姓名，用于按 applicant / applicant_name 查询 7 张传统业务表
const resolveUserName = async (pool, userId) => {
  if (userId === undefined || userId === null) return null;
  const [users] = await pool.execute('SELECT username, name FROM users WHERE id = ?', [userId]);
  if (users.length === 0) return null;
  const u = users[0];
  const rawName = u.name || u.username || '';
  if (rawName && rawName.startsWith('emp_')) {
    const parts = String(rawName).split('_');
    if (parts.length >= 2) return parts[1];
  }
  return rawName;
};

// 统一状态文本（中文优先，便于移动端展示）
const normalizeStatus = (status) => {
  if (!status) return '审批中';
  const s = String(status).toLowerCase();
  if (['approved', '已通过', '已同意', '已批准'].some(x => s.includes(x))) return '已通过';
  if (['rejected', '已拒绝', '拒绝'].some(x => s.includes(x))) return '已拒绝';
  if (['returned', '已退回', '退回'].some(x => s.includes(x))) return '已退回';
  if (['withdrawn', '已撤回', '已取消', 'cancelled'].some(x => s.includes(x))) return '已撤回';
  if (['pending', '待审批', '审批中', '待审核', '进行中'].some(x => s.includes(x))) return '审批中';
  return status;
};

// 聚合我的全部申请：OA 统一审批流 + 7 张传统业务表，按申请时间倒序
router.get('/oa/all-my-applications/:userId', async (req, res) => {
  const { pool } = req.app.locals;
  try {
    const { userId } = req.params;
    const userName = await resolveUserName(pool, userId);
    if (!userName) {
      return res.status(400).json({ success: false, message: '用户不存在' });
    }

    // 7 张传统业务表映射（与 /home/approval-summary 对齐）
    const applicantTables = [
      { table: 'leave_applications', type: '请假', applicantCol: 'applicant', titleCol: 'reason', isDeleted: false },
      { table: 'reimbursements', type: '报销', applicantCol: 'applicant', titleCol: 'reimburseType', amountCol: 'amount', isDeleted: true },
      { table: 'meetings', type: '会议', applicantCol: 'organizer', titleCol: 'title', isDeleted: false },
      { table: 'project_applications', type: '项目申请', applicantCol: 'applicant_name', titleCol: 'project_name', isDeleted: true, hasApplicantId: true },
      { table: 'entertainment_expenses', type: '招待', applicantCol: 'applicant', titleCol: 'purpose', amountCol: 'expenseAmount', isDeleted: true },
      { table: 'office_supplies_applications', type: '办公用品', applicantCol: 'applicant', titleCol: 'itemName', isDeleted: true },
      { table: 'business_trip_applications', type: '出差', applicantCol: 'applicant_name', titleCol: 'destination', amountCol: 'estimated_cost', isDeleted: true, hasApplicantId: true }
    ];

    const all = [];
    const empId = await resolveEmployeeId(pool, userId);

    // 传统 7 张表
    for (const cfg of applicantTables) {
      const deletedSql = cfg.isDeleted ? ` AND (is_deleted = 0 OR is_deleted IS NULL)` : '';
      const applicantIdSql = cfg.hasApplicantId
        ? ` AND (${cfg.applicantCol} = ? OR applicant_id = ?)`
        : ` AND ${cfg.applicantCol} = ?`;
      const params = cfg.hasApplicantId ? [userName, userId] : [userName];
      const timeCol = cfg.table === 'business_trip_applications' || cfg.table === 'project_applications' ? 'created_at' : 'createdAt';
      const fields = ['id', `${cfg.titleCol} as title`, `${cfg.applicantCol} as applicantName`, 'status', `${timeCol} as createdAt`];
      if (cfg.amountCol) fields.push(`${cfg.amountCol} as amount`);

      try {
        const [rows] = await pool.execute(
          `SELECT ${fields.join(', ')} FROM ${cfg.table} WHERE 1=1${applicantIdSql}${deletedSql} ORDER BY ${timeCol} DESC LIMIT 200`,
          params
        );
        for (const row of rows) {
          const businessData = { title: row.title || '' };
          if (cfg.amountCol && row.amount) businessData.amount = row.amount;
          all.push({
            id: row.id,
            source: cfg.table,
            businessType: cfg.type,
            applicantName: row.applicantName || userName,
            status: normalizeStatus(row.status),
            createdAt: row.createdAt,
            businessData
          });
        }
      } catch (e) {
        // 表或字段不存在时静默跳过，避免整张表缺失导致接口 500
        console.warn(`聚合我的申请时查询 ${cfg.table} 失败:`, e.message);
      }
    }

    // OA 统一审批流
    try {
      const candidates = empId !== null ? [String(userId), String(empId)] : [String(userId)];
      const [instances] = await pool.execute(
        `SELECT * FROM oa_approval_instances WHERE applicantId IN (${candidates.map(() => '?').join(',')}) ORDER BY createdAt DESC LIMIT 200`,
        candidates
      );
      for (const it of instances) {
        const data = parseJsonField(it.businessData, {});
        all.push({
          id: it.id,
          source: 'oa_approval_instances',
          businessType: it.businessType || 'OA审批',
          applicantName: it.applicantName || userName,
          status: normalizeStatus(it.status),
          createdAt: it.createdAt,
          businessData: data
        });
      }
    } catch (e) {
      console.warn('聚合我的申请时查询 oa_approval_instances 失败:', e.message);
    }

    all.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());

    res.json({ success: true, data: all });
  } catch (error) {
    console.error('获取全部申请列表失败:', error);
    res.status(500).json({ success: false, message: '获取全部申请列表失败: ' + error.message });
  }
});

// 更新审批人配置
router.put('/oa/approver-config/:id', requireRole('系统管理员', '总经理'), async (req, res) => {
  const { pool } = req.app.locals;
  try {
    const { id } = req.params;
    const { superiorPosition, isDeptManager, isTopManager, isFinanceDirector } = req.body;

    await pool.execute(
      'UPDATE oa_approver_configs SET superiorPosition = ?, isDeptManager = ?, isTopManager = ?, isFinanceDirector = ? WHERE id = ?',
      [superiorPosition, isDeptManager, isTopManager, isFinanceDirector, id]
    );

    // 审批人配置修改审计（审批流程配置，高危）
    const operator = req.user?.name || req.user?.username || '系统';
    createOperationLog(pool, { userId: String(req.user?.id || ''), username: operator, action: 'update', module: 'oa_approval', targetId: id, targetName: `审批人配置#${id}`, detail: `更新审批人配置: 上级岗位=${superiorPosition||'无'}, 部门经理=${isDeptManager?1:0}, 总经理=${isTopManager?1:0}, 财务总监=${isFinanceDirector?1:0}`, ipAddress: req.ip });

    res.json({ success: true, message: '审批人配置更新成功' });
  } catch (error) {
    console.error('更新审批人配置失败:', error);
    res.status(500).json({ success: false, message: '更新审批人配置失败: ' + error.message });
  }
});

export default router;
