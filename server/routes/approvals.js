import express from 'express';
const router = express.Router();

import { createNotification, createOperationLog } from '../utils/audit.js';

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
    const { applicantId, applicantName, applicantDept, applicantPosition } = req.body;

    const [approverConfigs] = await pool.execute(
      'SELECT * FROM oa_approver_configs WHERE department = ? AND position = ?',
      [applicantDept, applicantPosition]
    );

    if (approverConfigs.length === 0) {
      return res.status(400).json({ success: false, message: '未找到申请人的职位配置' });
    }

    const config = approverConfigs[0];
    const approvalPath = [];
    let order = 1;

    if (config.superiorPosition) {
      const [superior] = await pool.execute(
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
      const [deptManager] = await pool.execute(
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
      const [topManager] = await pool.execute(
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
      const [topManager] = await pool.execute(
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

    const [financeDirector] = await pool.execute(
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
    const { userId } = req.params;

    const [instances] = await pool.execute(
      'SELECT * FROM oa_approval_instances WHERE currentApproverId = ? AND status = ? ORDER BY createdAt DESC',
      [userId, '审批中']
    );

    const formattedInstances = instances.map(instance => ({
      ...instance,
      businessData: JSON.parse(instance.businessData || '{}'),
      approvalPath: JSON.parse(instance.approvalPath || '[]')
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
    const { userId } = req.params;

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
      businessData: JSON.parse(history.businessData || '{}')
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

    const [instances] = await pool.execute(
      'SELECT * FROM oa_approval_instances WHERE applicantId = ? ORDER BY createdAt DESC',
      [userId]
    );

    const formattedInstances = instances.map(instance => ({
      ...instance,
      businessData: JSON.parse(instance.businessData || '{}'),
      approvalPath: JSON.parse(instance.approvalPath || '[]')
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
        businessData: JSON.parse(instance.businessData || '{}'),
        approvalPath: JSON.parse(instance.approvalPath || '[]'),
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

    const { instanceId, approverId, approverName, approverPosition, action, comment } = req.body;

    const [instances] = await connection.execute(
      'SELECT * FROM oa_approval_instances WHERE id = ?',
      [instanceId]
    );

    if (instances.length === 0) {
      await connection.rollback();
      return res.status(404).json({ success: false, message: '审批实例不存在' });
    }

    const instance = instances[0];

    if (instance.currentApproverId !== approverId) {
      await connection.rollback();
      return res.status(403).json({ success: false, message: '您不是当前审批人，无权处理' });
    }

    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
    const approvalPath = JSON.parse(instance.approvalPath || '[]');
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
    const { instanceId, applicantId } = req.body;

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

// 更新审批人配置
router.put('/oa/approver-config/:id', async (req, res) => {
  const { pool } = req.app.locals;
  try {
    const { id } = req.params;
    const { superiorPosition, isDeptManager, isTopManager, isFinanceDirector } = req.body;

    await pool.execute(
      'UPDATE oa_approver_configs SET superiorPosition = ?, isDeptManager = ?, isTopManager = ?, isFinanceDirector = ? WHERE id = ?',
      [superiorPosition, isDeptManager, isTopManager, isFinanceDirector, id]
    );

    res.json({ success: true, message: '审批人配置更新成功' });
  } catch (error) {
    console.error('更新审批人配置失败:', error);
    res.status(500).json({ success: false, message: '更新审批人配置失败: ' + error.message });
  }
});

export default router;
