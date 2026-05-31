/**
 * 工作流引擎 - 支持多节点流程（一对一、一对多、多对一）
 */

import mysql from 'mysql2/promise';

class WorkflowEngine {
  constructor(pool) {
    this.pool = pool;
  }

  /**
   * 启动流程实例
   */
  async startInstance(definitionId, businessData, applicantId) {
    const connection = await this.pool.getConnection();
    try {
      await connection.beginTransaction();

      // 获取流程定义
      const [definitions] = await connection.execute(
        'SELECT * FROM process_definitions WHERE id = ? AND status = ?',
        [definitionId, 'published']
      );

      if (definitions.length === 0) {
        throw new Error('流程定义不存在或未发布');
      }

      const definition = definitions[0];
      const nodes = JSON.parse(definition.nodes);
      const edges = JSON.parse(definition.edges);

      // 获取申请人信息
      const [employees] = await connection.execute(
        'SELECT * FROM employees WHERE id = ?',
        [applicantId]
      );
      
      if (employees.length === 0) {
        throw new Error('申请人不存在');
      }

      const applicant = employees[0];

      // 创建流程实例
      const [result] = await connection.execute(
        `INSERT INTO process_instances 
         (definition_id, business_key, business_type, title, applicant_id, applicant_name, 
          status, current_nodes, variables, start_time) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        [
          definitionId,
          businessData.businessKey,
          businessData.businessType,
          businessData.title,
          applicantId,
          applicant.name,
          'running',
          JSON.stringify([]),
          JSON.stringify(businessData.variables || {})
        ]
      );

      const instanceId = result.insertId;

      // 找到开始节点
      const startNode = nodes.find(n => n.type === 'start');
      
      // 推进到第一个任务节点
      await this.advance(connection, instanceId, startNode.id, nodes, edges, applicant);

      await connection.commit();
      return { success: true, instanceId };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * 推进流程
   */
  async advance(connection, instanceId, currentNodeId, nodes, edges, applicant) {
    const currentNode = nodes.find(n => n.id === currentNodeId);
    
    switch (currentNode.type) {
      case 'start':
        // 开始节点，直接找下一个节点
        const startEdges = edges.filter(e => e.source === currentNodeId);
        for (const edge of startEdges) {
          await this.advance(connection, instanceId, edge.target, nodes, edges, applicant);
        }
        break;

      case 'approval':
        // 一对一审批节点
        await this.handleApprovalNode(connection, instanceId, currentNode, applicant);
        break;

      case 'multi_approval':
        // 多审批节点（一对多/多对一/多对多）
        await this.handleMultiApprovalNode(connection, instanceId, currentNode, applicant);
        break;

      case 'parallel':
        // 并行网关（一对多）
        await this.handleParallelFork(connection, instanceId, currentNode, nodes, edges, applicant);
        break;

      case 'parallel_join':
        // 并行汇聚（多对一）
        await this.handleParallelJoin(connection, instanceId, currentNode, nodes, edges, applicant);
        break;

      case 'inclusive':
        // 包容网关（条件分支一对多）
        await this.handleInclusiveFork(connection, instanceId, currentNode, nodes, edges, applicant);
        break;

      case 'inclusive_join':
        // 包容汇聚（多对一）
        await this.handleInclusiveJoin(connection, instanceId, currentNode, nodes, edges, applicant);
        break;

      case 'end':
        // 结束节点
        await this.completeInstance(connection, instanceId);
        break;
    }
  }

  /**
   * 处理一对一审批节点
   */
  async handleApprovalNode(connection, instanceId, node, applicant) {
    const config = node.config;
    const approvers = await this.resolveApprovers(connection, config, applicant);

    if (approvers.length === 0) {
      throw new Error(`节点 ${node.name} 未找到审批人`);
    }

    const approver = approvers[0]; // 一对一取第一个

    // 创建任务
    await connection.execute(
      `INSERT INTO process_tasks 
       (instance_id, node_id, node_name, node_type, assignee_id, assignee_name, 
        status, due_date, created_at) 
       VALUES (?, ?, ?, ?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL ? HOUR), NOW())`,
      [
        instanceId,
        node.id,
        node.name,
        node.type,
        approver.id,
        approver.name,
        'pending',
        config.timeoutHours || 24
      ]
    );

    // 更新实例当前节点
    await this.updateInstanceCurrentNodes(connection, instanceId, [node.id]);
  }

  /**
   * 处理多审批节点（一对多/多对一/多对多）
   */
  async handleMultiApprovalNode(connection, instanceId, node, applicant) {
    const config = node.config;
    const approvers = await this.resolveApprovers(connection, config, applicant);

    if (approvers.length === 0) {
      throw new Error(`节点 ${node.name} 未找到审批人`);
    }

    // 创建父任务
    const [parentResult] = await connection.execute(
      `INSERT INTO process_tasks 
       (instance_id, node_id, node_name, node_type, status, 
        is_multi_node, multi_node_strategy, created_at) 
       VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        instanceId,
        node.id,
        node.name,
        node.type,
        'pending',
        true,
        JSON.stringify(config.strategy)
      ]
    );

    const parentTaskId = parentResult.insertId;

    // 创建子任务
    for (const approver of approvers) {
      await connection.execute(
        `INSERT INTO process_tasks 
         (instance_id, node_id, node_name, node_type, assignee_id, assignee_name, 
          status, parent_task_id, due_date, created_at) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL ? HOUR), NOW())`,
        [
          instanceId,
          node.id,
          node.name,
          node.type,
          approver.id,
          approver.name,
          'pending',
          parentTaskId,
          config.timeoutHours || 24
        ]
      );
    }

    // 更新实例当前节点
    await this.updateInstanceCurrentNodes(connection, instanceId, [node.id]);
  }

  /**
   * 处理并行网关（一对多）
   */
  async handleParallelFork(connection, instanceId, node, nodes, edges, applicant) {
    const outgoingEdges = edges.filter(e => e.source === node.id);

    // 激活所有分支
    for (const edge of outgoingEdges) {
      const targetNode = nodes.find(n => n.id === edge.target);
      
      // 检查分支条件
      if (!edge.condition || await this.evaluateCondition(edge.condition, {})) {
        // 创建分支上下文
        await this.createBranchContext(connection, instanceId, node.id, targetNode.id);
        
        // 推进分支
        await this.advance(connection, instanceId, targetNode.id, nodes, edges, applicant);
      }
    }
  }

  /**
   * 处理并行汇聚（多对一）
   */
  async handleParallelJoin(connection, instanceId, node, nodes, edges, applicant) {
    const config = node.config;
    
    // 获取所有入边（前置分支）
    const incomingEdges = edges.filter(e => e.target === node.id);
    const branchIds = incomingEdges.map(e => e.source);

    // 检查已完成的 branches
    const completedBranches = await this.getCompletedBranches(connection, instanceId, node.id);

    // 根据汇聚策略判断是否继续
    let shouldJoin = false;
    
    switch (config.joinStrategy) {
      case 'all':
        shouldJoin = completedBranches.length === branchIds.length;
        break;
      case 'any':
        shouldJoin = completedBranches.length >= 1;
        break;
      case 'n_of_m':
        shouldJoin = completedBranches.length >= config.requiredBranches;
        break;
    }

    if (shouldJoin) {
      // 清理分支上下文
      await this.cleanupBranchContexts(connection, instanceId, node.id);

      // 继续推进
      const outgoingEdges = edges.filter(e => e.source === node.id);
      for (const edge of outgoingEdges) {
        await this.advance(connection, instanceId, edge.target, nodes, edges, applicant);
      }
    }
  }

  /**
   * 处理包容网关（条件分支一对多）
   */
  async handleInclusiveFork(connection, instanceId, node, nodes, edges, applicant) {
    const config = node.config;
    let activatedBranches = [];

    // 评估所有分支条件
    for (const branch of config.branches) {
      const shouldActivate = branch.default || 
        await this.evaluateCondition(branch.condition, {});

      if (shouldActivate) {
        activatedBranches.push(branch.branchId);

        // 找到对应的目标节点
        const edge = edges.find(e => 
          e.source === node.id && e.target === branch.branchId
        );

        if (edge) {
          await this.createBranchContext(connection, instanceId, node.id, branch.branchId);
          await this.advance(connection, instanceId, branch.branchId, nodes, edges, applicant);
        }
      }
    }

    // 记录激活的分支
    await connection.execute(
      'UPDATE process_instances SET variables = JSON_SET(variables, "$.inclusiveActivatedBranches", ?) WHERE id = ?',
      [JSON.stringify({ gatewayId: node.id, branches: activatedBranches }), instanceId]
    );
  }

  /**
   * 处理包容汇聚（多对一）
   */
  async handleInclusiveJoin(connection, instanceId, node, nodes, edges, applicant) {
    const config = node.config;

    // 获取需要汇聚的分支
    const [instances] = await connection.execute(
      'SELECT variables FROM process_instances WHERE id = ?',
      [instanceId]
    );

    const variables = JSON.parse(instances[0].variables || '{}');
    const activatedBranches = (variables.inclusiveActivatedBranches && variables.inclusiveActivatedBranches.branches) || [];
    const completedBranches = await this.getCompletedBranches(connection, instanceId, node.id);

    // 检查是否所有激活的分支都已完成
    const allCompleted = activatedBranches.every(branchId => 
      completedBranches.includes(branchId)
    );

    if (allCompleted) {
      await this.cleanupBranchContexts(connection, instanceId, node.id);

      const outgoingEdges = edges.filter(e => e.source === node.id);
      for (const edge of outgoingEdges) {
        await this.advance(connection, instanceId, edge.target, nodes, edges, applicant);
      }
    }
  }

  /**
   * 解析审批人
   */
  async resolveApprovers(connection, config, applicant) {
    const { approverType, approvers } = config;

    switch (approverType) {
      case 'user':
        // 直接指定员工ID
        const [users] = await connection.execute(
          'SELECT id, name, department, position FROM employees WHERE id IN (?) AND is_active = 1',
          [approvers]
        );
        return users;

      case 'role':
        // 按角色查找
        const [roleUsers] = await connection.execute(
          `SELECT DISTINCT e.id, e.name, e.department, e.position 
           FROM employees e
           JOIN employee_roles er ON e.id = er.employee_id
           WHERE er.role IN (?) AND e.is_active = 1`,
          [approvers]
        );
        return roleUsers;

      case 'dept_leader':
        // 部门负责人
        const [leaders] = await connection.execute(
          `SELECT DISTINCT e.id, e.name, e.department, e.position 
           FROM employees e
           JOIN employee_roles er ON e.id = er.employee_id
           WHERE er.role = 'dept_manager' 
           AND er.department = ? 
           AND e.is_active = 1`,
          [applicant.department]
        );
        return leaders;

      case 'manager':
        // 直属上级
        if (applicant.manager_id) {
          const [managers] = await connection.execute(
            'SELECT id, name, department, position FROM employees WHERE id = ? AND is_active = 1',
            [applicant.manager_id]
          );
          return managers;
        }
        return [];

      case 'self_select':
        // 申请人自选，返回空数组，由前端处理
        return [];

      default:
        return [];
    }
  }

  /**
   * 评估条件
   */
  async evaluateCondition(condition, variables) {
    if (!condition) return true;

    const { field, operator, value } = condition;
    const fieldValue = variables[field];

    switch (operator) {
      case 'eq':
        return fieldValue === value;
      case 'ne':
        return fieldValue !== value;
      case 'gt':
        return fieldValue > value;
      case 'gte':
        return fieldValue >= value;
      case 'lt':
        return fieldValue < value;
      case 'lte':
        return fieldValue <= value;
      case 'in':
        return value.includes(fieldValue);
      case 'contains':
        return fieldValue && fieldValue.includes(value);
      default:
        return true;
    }
  }

  /**
   * 更新实例当前节点
   */
  async updateInstanceCurrentNodes(connection, instanceId, nodeIds) {
    await connection.execute(
      'UPDATE process_instances SET current_nodes = ? WHERE id = ?',
      [JSON.stringify(nodeIds), instanceId]
    );
  }

  /**
   * 创建分支上下文
   */
  async createBranchContext(connection, instanceId, gatewayId, branchId) {
    await connection.execute(
      `INSERT INTO branch_contexts 
       (instance_id, branch_id, gateway_id, status, start_time) 
       VALUES (?, ?, ?, 'active', NOW())`,
      [instanceId, branchId, gatewayId]
    );
  }

  /**
   * 获取已完成的分支
   */
  async getCompletedBranches(connection, instanceId, gatewayId) {
    const [contexts] = await connection.execute(
      'SELECT branch_id FROM branch_contexts WHERE instance_id = ? AND gateway_id = ? AND status = ?',
      [instanceId, gatewayId, 'completed']
    );
    return contexts.map(c => c.branch_id);
  }

  /**
   * 清理分支上下文
   */
  async cleanupBranchContexts(connection, instanceId, gatewayId) {
    await connection.execute(
      'DELETE FROM branch_contexts WHERE instance_id = ? AND gateway_id = ?',
      [instanceId, gatewayId]
    );
  }

  /**
   * 完成流程实例
   */
  async completeInstance(connection, instanceId) {
    await connection.execute(
      'UPDATE process_instances SET status = ?, end_time = NOW() WHERE id = ?',
      ['completed', instanceId]
    );
  }

  /**
   * 处理审批任务
   */
  async processTask(taskId, action, comment, transferTo = null) {
    const connection = await this.pool.getConnection();
    try {
      await connection.beginTransaction();

      // 获取任务信息
      const [tasks] = await connection.execute(
        `SELECT t.*, i.definition_id, i.variables, i.applicant_id
         FROM process_tasks t
         JOIN process_instances i ON t.instance_id = i.id
         WHERE t.id = ?`,
        [taskId]
      );

      if (tasks.length === 0) {
        throw new Error('任务不存在');
      }

      const task = tasks[0];

      // 更新任务状态
      await connection.execute(
        `UPDATE process_tasks 
         SET status = ?, action = ?, comment = ?, completed_at = NOW() 
         WHERE id = ?`,
        ['completed', action, comment, taskId]
      );

      // 记录审批历史
      await connection.execute(
        `INSERT INTO approval_history 
         (business_type, business_id, step, node_name, approver_id, approver_name, 
          approver_role, action, comment, created_at) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        [
          'process',
          task.instance_id,
          task.node_id,
          task.node_name,
          task.assignee_id,
          task.assignee_name,
          task.node_type,
          action,
          comment
        ]
      );

      // 根据操作类型处理
      if (action === 'agree') {
        // 检查是否是多节点任务
        if (task.is_multi_node) {
          // 检查是否满足完成条件
          const shouldContinue = await this.checkMultiTaskCompletion(connection, task.parent_task_id);
          if (shouldContinue) {
            // 获取流程定义
            const [definitions] = await connection.execute(
              'SELECT nodes, edges FROM process_definitions WHERE id = ?',
              [task.definition_id]
            );
            const nodes = JSON.parse(definitions[0].nodes);
            const edges = JSON.parse(definitions[0].edges);

            // 获取申请人信息
            const [employees] = await connection.execute(
              'SELECT * FROM employees WHERE id = ?',
              [task.applicant_id]
            );

            // 推进到下一节点
            const outgoingEdges = edges.filter(e => e.source === task.node_id);
            for (const edge of outgoingEdges) {
              await this.advance(connection, task.instance_id, edge.target, nodes, edges, employees[0]);
            }
          }
        } else {
          // 普通任务，直接推进
          const [definitions] = await connection.execute(
            'SELECT nodes, edges FROM process_definitions WHERE id = ?',
            [task.definition_id]
          );
          const nodes = JSON.parse(definitions[0].nodes);
          const edges = JSON.parse(definitions[0].edges);

          const [employees] = await connection.execute(
            'SELECT * FROM employees WHERE id = ?',
            [task.applicant_id]
          );

          const outgoingEdges = edges.filter(e => e.source === task.node_id);
          for (const edge of outgoingEdges) {
            await this.advance(connection, task.instance_id, edge.target, nodes, edges, employees[0]);
          }
        }
      } else if (action === 'reject') {
        // 拒绝，结束流程
        await connection.execute(
          'UPDATE process_instances SET status = ?, end_time = NOW() WHERE id = ?',
          ['terminated', task.instance_id]
        );
      } else if (action === 'transfer' && transferTo) {
        // 转交
        const [newAssignee] = await connection.execute(
          'SELECT id, name FROM employees WHERE id = ?',
          [transferTo]
        );

        if (newAssignee.length > 0) {
          await connection.execute(
            `UPDATE process_tasks 
             SET assignee_id = ?, assignee_name = ?, status = ? 
             WHERE id = ?`,
            [newAssignee[0].id, newAssignee[0].name, 'transferred', taskId]
          );

          // 创建新任务
          await connection.execute(
            `INSERT INTO process_tasks 
             (instance_id, node_id, node_name, node_type, assignee_id, assignee_name, 
              status, parent_task_id, created_at) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
            [
              task.instance_id,
              task.node_id,
              task.node_name,
              task.node_type,
              newAssignee[0].id,
              newAssignee[0].name,
              'pending',
              task.parent_task_id
            ]
          );
        }
      }

      await connection.commit();
      return { success: true };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * 检查多任务完成条件
   */
  async checkMultiTaskCompletion(connection, parentTaskId) {
    // 获取父任务信息
    const [parentTasks] = await connection.execute(
      'SELECT multi_node_strategy FROM process_tasks WHERE id = ?',
      [parentTaskId]
    );

    if (parentTasks.length === 0) return true;

    const strategy = JSON.parse(parentTasks[0].multi_node_strategy);

    // 获取所有子任务
    const [subTasks] = await connection.execute(
      'SELECT status, action FROM process_tasks WHERE parent_task_id = ?',
      [parentTaskId]
    );

    const totalCount = subTasks.length;
    const completedCount = subTasks.filter(t => t.status === 'completed').length;
    const approvedCount = subTasks.filter(t => t.action === 'agree').length;

    switch (strategy.type) {
      case 'any':
        return approvedCount >= 1;
      case 'all':
        return approvedCount === totalCount;
      case 'sequential':
        return completedCount === totalCount;
      case 'percentage':
        const percentage = (approvedCount / totalCount) * 100;
        return percentage >= strategy.requiredPercentage;
      case 'count':
        return approvedCount >= strategy.requiredCount;
      default:
        return false;
    }
  }

  /**
   * 获取待办任务
   */
  async getTodoTasks(employeeId) {
    const [tasks] = await this.pool.execute(
      `SELECT t.*, i.business_type, i.business_key, i.title, i.applicant_name, i.applicant_id
       FROM process_tasks t
       JOIN process_instances i ON t.instance_id = i.id
       WHERE t.assignee_id = ? AND t.status = ? AND i.status = ?
       ORDER BY t.created_at DESC`,
      [employeeId, 'pending', 'running']
    );
    return tasks;
  }

  /**
   * 获取已办任务
   */
  async getDoneTasks(employeeId) {
    const [tasks] = await this.pool.execute(
      `SELECT t.*, i.business_type, i.business_key, i.title, i.applicant_name
       FROM process_tasks t
       JOIN process_instances i ON t.instance_id = i.id
       WHERE t.assignee_id = ? AND t.status = ?
       ORDER BY t.completed_at DESC`,
      [employeeId, 'completed']
    );
    return tasks;
  }
}

export default WorkflowEngine;
