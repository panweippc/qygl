# 混合审批流程设计说明

## 一、概述

本文档针对当前企业管理系统中的**请假申请**、**报销申请**、**会议申请**三个功能，设计具体的混合审批流程方案。

### 1.1 当前系统现状
- 已有基础的单节点审批功能
- 支持请假、报销、会议三种申请类型
- 管理员可查看所有申请并进行审批
- 员工只能查看自己的申请记录

### 1.2 设计目标
- 实现多级、多条件的混合审批流程
- 支持串行、并行、条件分支的组合
- 提高审批效率，减少人工干预
- 确保流程合规性和可追溯性

---

## 二、请假申请混合审批流程

### 2.1 流程图

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            请假申请混合审批流程                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   ┌─────────┐                                                               │
│   │  提交   │                                                               │
│   │  申请   │                                                               │
│   └────┬────┘                                                               │
│        │                                                                    │
│        ▼                                                                    │
│   ┌─────────┐                                                               │
│   │ 条件分支 │◀──────────────────── 根据请假类型和天数判断                      │
│   │  判断   │                                                               │
│   └────┬────┘                                                               │
│        │                                                                    │
│   ┌────┼────┬──────────────┬──────────────┐                                 │
│   │    │    │              │              │                                 │
│   ▼    ▼    ▼              ▼              ▼                                 │
│ ┌───┐┌───┐┌─────┐     ┌─────────┐   ┌─────────┐                            │
│ │病假││婚假││产假 │     │ 年假≤3天 │   │ 年假>3天 │                            │
│ └───┘└───┘└─────┘     └────┬────┘   └────┬────┘                            │
│   │    │    │              │              │                                 │
│   ▼    ▼    ▼              ▼              ▼                                 │
│ ┌─────┐┌─────┐┌─────┐  ┌─────────┐   ┌─────────┐                           │
│ │HR   ││HR   ││HR   │  │直属上级  │   │直属上级  │                           │
│ │材料  ││审批  ││审批  │  │  审批   │   │  审批   │                           │
│ │审核  ││     ││     │  └────┬────┘   └────┬────┘                           │
│ └──┬──┘└──┬──┘└──┬──┘       │              │                                │
│    │      │      │          │              │                                │
│    └──────┼──────┘          │              ▼                                │
│           │                 │         ┌─────────┐                          │
│           │                 │         │部门经理  │                          │
│           │                 │         │  审批   │                          │
│           │                 │         └────┬────┘                          │
│           │                 │              │                                │
│           └─────────────────┼──────────────┘                                │
│                             │                                               │
│                             ▼                                               │
│                       ┌─────────┐                                          │
│                       │  结束   │                                          │
│                       └─────────┘                                          │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 2.2 流程说明

| 请假类型 | 天数条件 | 审批流程 | 说明 |
|----------|----------|----------|------|
| **病假** | 任意 | HR材料审核 → 结束 | 需上传医院证明 |
| **婚假** | 任意 | HR审批 → 结束 | 需上传结婚证 |
| **产假** | 任意 | HR审批 → 结束 | 需上传相关证明 |
| **年假** | ≤3天 | 直属上级审批 → 结束 | 简单流程 |
| **年假** | >3天 | 直属上级审批 → 部门经理审批 → 结束 | 多级审批 |
| **事假** | ≤1天 | 直属上级审批 → 结束 | 简单流程 |
| **事假** | >1天 | 直属上级审批 → 部门经理审批 → 结束 | 多级审批 |

### 2.3 数据库表结构调整

```sql
-- 请假申请表增加字段
ALTER TABLE leave_applications ADD COLUMN flow_instance_id INT COMMENT '流程实例ID';
ALTER TABLE leave_applications ADD COLUMN current_node VARCHAR(100) COMMENT '当前节点';
ALTER TABLE leave_applications ADD COLUMN approver_chain JSON COMMENT '审批链记录';

-- 创建审批链记录表
CREATE TABLE leave_approval_chain (
  id INT PRIMARY KEY AUTO_INCREMENT,
  leave_id INT NOT NULL COMMENT '请假申请ID',
  node_name VARCHAR(100) COMMENT '节点名称',
  approver VARCHAR(255) COMMENT '审批人',
  status VARCHAR(50) COMMENT '状态',
  comment TEXT COMMENT '审批意见',
  action_time DATETIME COMMENT '操作时间',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### 2.4 前端界面调整

```vue
<!-- LeaveApplicationView.vue 增加审批流程展示 -->
<template>
  <div class="leave-application">
    <!-- 原有表单 -->
    
    <!-- 新增：审批流程预览 -->
    <div class="approval-flow-preview" v-if="showFlowPreview">
      <h3>审批流程</h3>
      <el-steps :active="currentStep" direction="vertical">
        <el-step 
          v-for="(node, index) in approvalNodes" 
          :key="index"
          :title="node.name"
          :description="node.approver"
          :status="node.status"
        />
      </el-steps>
    </div>
    
    <!-- 新增：审批进度跟踪 -->
    <div class="approval-progress" v-if="isSubmitted">
      <approval-timeline :records="approvalChain" />
    </div>
  </div>
</template>
```

### 2.5 后端API调整

```javascript
// server.js 新增接口

// 获取请假审批流程预览
app.get('/api/leave-applications/flow-preview', async (req, res) => {
  const { leaveType, days } = req.query;
  const flowNodes = calculateLeaveFlow(leaveType, parseInt(days));
  res.json({ success: true, data: flowNodes });
});

// 计算请假审批流程
function calculateLeaveFlow(leaveType, days) {
  const nodes = [];
  
  // 根据类型和天数确定审批链
  if (['病假', '婚假', '产假'].includes(leaveType)) {
    nodes.push({ name: 'HR审核', approver: 'HR部门', type: 'serial' });
  } else if (leaveType === '年假') {
    nodes.push({ name: '直属上级审批', approver: '直属上级', type: 'serial' });
    if (days > 3) {
      nodes.push({ name: '部门经理审批', approver: '部门经理', type: 'serial' });
    }
  } else if (leaveType === '事假') {
    nodes.push({ name: '直属上级审批', approver: '直属上级', type: 'serial' });
    if (days > 1) {
      nodes.push({ name: '部门经理审批', approver: '部门经理', type: 'serial' });
    }
  }
  
  return nodes;
}

// 提交请假申请时初始化审批流程
app.post('/api/leave-applications', async (req, res) => {
  const { leaveType, days, ...otherData } = req.body;
  
  // 计算审批流程
  const approvalChain = calculateLeaveFlow(leaveType, days);
  
  // 保存申请
  const result = await db.query(
    `INSERT INTO leave_applications 
     (applicant, leave_type, start_date, end_date, days, reason, approver, status, approver_chain) 
     VALUES (?, ?, ?, ?, ?, ?, ?, '审批中', ?)`,
    [req.user.username, leaveType, otherData.startDate, otherData.endDate, 
     days, otherData.reason, approvalChain[0].approver, JSON.stringify(approvalChain)]
  );
  
  res.json({ success: true, data: { id: result.insertId, approvalChain } });
});

// 审批通过并流转到下一节点
app.put('/api/leave-applications/:id/approve', async (req, res) => {
  const { id } = req.params;
  const { comment } = req.body;
  
  // 获取当前申请
  const [application] = await db.query(
    'SELECT * FROM leave_applications WHERE id = ?', [id]
  );
  
  const chain = JSON.parse(application.approver_chain);
  const currentIndex = chain.findIndex(n => n.approver === application.approver && !n.completed);
  
  // 标记当前节点完成
  chain[currentIndex].completed = true;
  chain[currentIndex].comment = comment;
  chain[currentIndex].actionTime = new Date();
  
  // 检查是否还有下一节点
  const nextNode = chain[currentIndex + 1];
  let newStatus = '审批中';
  let newApprover = null;
  
  if (nextNode) {
    newApprover = nextNode.approver;
  } else {
    newStatus = '已批准';
  }
  
  // 更新申请
  await db.query(
    `UPDATE leave_applications 
     SET status = ?, approver = ?, approver_chain = ? 
     WHERE id = ?`,
    [newStatus, newApprover, JSON.stringify(chain), id]
  );
  
  res.json({ success: true, message: '审批完成' });
});
```

---

## 三、报销申请混合审批流程

### 3.1 流程图

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            报销申请混合审批流程                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   ┌─────────┐                                                               │
│   │  提交   │                                                               │
│   │  申请   │                                                               │
│   └────┬────┘                                                               │
│        │                                                                    │
│        ▼                                                                    │
│   ┌─────────┐                                                               │
│   │ 条件分支 │◀──────────────────── 根据金额判断                              │
│   │  判断   │                                                               │
│   └────┬────┘                                                               │
│        │                                                                    │
│   ┌────┼──────────────┬──────────────────────┐                             │
│   │    │              │                      │                             │
│   ▼    ▼              ▼                      ▼                             │
│ ┌───┐┌─────────┐  ┌─────────┐         ┌─────────┐                         │
│ │<500││500-5000 │  │ 5000-2万 │         │  >2万   │                         │
│ └───┘└────┬────┘  └────┬────┘         └────┬────┘                         │
│   │       │            │                    │                               │
│   ▼       ▼            ▼                    ▼                               │
│ ┌─────┐ ┌─────┐   ┌─────────┐        ┌─────────┐                          │
│ │直属 │ │直属 │   │  并行   │        │  并行   │                          │
│ │上级 │ │上级 │   │  审批   │        │  审批   │                          │
│ │审批 │ │审批 │   │财务+部门│        │财务+部门│                          │
│ └──┬──┘ └──┬──┘   └────┬────┘        └────┬────┘                          │
│    │       │            │                    │                              │
│    │       │            ▼                    ▼                              │
│    │       │       ┌─────────┐        ┌─────────┐                         │
│    │       │       │ 总经理  │        │ 总经理  │                         │
│    │       │       │  审批   │        │  审批   │                         │
│    │       │       └────┬────┘        └────┬────┘                         │
│    │       │            │                    │                              │
│    └───────┼────────────┼────────────────────┘                              │
│            │            │                                                   │
│            ▼            ▼                                                   │
│       ┌─────────┐  ┌─────────┐                                             │
│       │  结束   │  │  结束   │                                             │
│       └─────────┘  └─────────┘                                             │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 3.2 流程说明

| 金额范围 | 审批流程 | 说明 |
|----------|----------|------|
| **< 500元** | 直属上级审批 → 结束 | 小额快速审批 |
| **500-5000元** | 直属上级审批 → 结束 | 常规审批 |
| **5000-20000元** | 直属上级审批 → 财务+部门并行审批 → 结束 | 中等金额，需多部门审核 |
| **> 20000元** | 直属上级审批 → 财务+部门并行审批 → 总经理审批 → 结束 | 大额，需高层审批 |

### 3.3 并行审批逻辑

```javascript
// 并行审批处理
async function processParallelApproval(applicationId, nodeConfig) {
  const { approvers, parallelType } = nodeConfig;
  
  // 创建并行审批任务
  const tasks = approvers.map(approver => ({
    applicationId,
    approver,
    status: 'pending',
    createdAt: new Date()
  }));
  
  await db.query('INSERT INTO parallel_approval_tasks VALUES ?', [tasks]);
  
  // 等待所有审批完成
  const results = await waitForAllApprovals(applicationId, approvers.length);
  
  // 根据并行类型计算结果
  if (parallelType === 'and') {
    // 会签：全部通过才算通过
    const allApproved = results.every(r => r.status === 'approved');
    return allApproved ? 'approved' : 'rejected';
  } else {
    // 或签：任一通过即算通过
    const anyApproved = results.some(r => r.status === 'approved');
    return anyApproved ? 'approved' : 'rejected';
  }
}
```

### 3.4 数据库表结构调整

```sql
-- 报销申请表增加字段
ALTER TABLE reimbursements ADD COLUMN flow_instance_id INT COMMENT '流程实例ID';
ALTER TABLE reimbursements ADD COLUMN current_node VARCHAR(100) COMMENT '当前节点';
ALTER TABLE reimbursements ADD COLUMN approval_mode VARCHAR(20) COMMENT '审批模式：serial/parallel';

-- 并行审批任务表
CREATE TABLE parallel_approval_tasks (
  id INT PRIMARY KEY AUTO_INCREMENT,
  application_id INT NOT NULL COMMENT '申请ID',
  application_type VARCHAR(50) COMMENT '申请类型',
  approver VARCHAR(255) COMMENT '审批人',
  status VARCHAR(50) DEFAULT 'pending' COMMENT '状态',
  comment TEXT COMMENT '审批意见',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  completed_at DATETIME COMMENT '完成时间'
);
```

---

## 四、会议申请混合审批流程

### 4.1 流程图

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            会议申请混合审批流程                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   ┌─────────┐                                                               │
│   │  提交   │                                                               │
│   │  申请   │                                                               │
│   └────┬────┘                                                               │
│        │                                                                    │
│        ▼                                                                    │
│   ┌─────────┐                                                               │
│   │ 条件分支 │◀──────────────────── 根据会议类型和规模判断                     │
│   │  判断   │                                                               │
│   └────┬────┘                                                               │
│        │                                                                    │
│   ┌────┼──────────────┬──────────────────────┬──────────────────┐          │
│   │    │              │                      │                  │          │
│   ▼    ▼              ▼                      ▼                  ▼          │
│ ┌────┐┌────┐     ┌─────────┐          ┌─────────┐       ┌─────────┐       │
│ │内部││部门│     │ 跨部门  │          │ 大型会议 │       │ 外部会议 │       │
│ │会议││会议│     │  会议   │          │ >50人   │       │         │       │
│ └──┬─┘└──┬─┘     └────┬────┘          └────┬────┘       └────┬────┘       │
│    │     │            │                    │                 │            │
│    ▼     ▼            ▼                    ▼                 ▼            │
│ ┌─────┐┌─────┐   ┌─────────┐        ┌─────────┐       ┌─────────┐        │
│ │自动 ││部门 │   │  并行   │        │  并行   │       │  并行   │        │
│ │通过 ││负责人│   │部门+行政│        │部门+行政│       │部门+总经│        │
│ │     ││审批 │   │  审批   │        │+总经理 │       │  理审批 │        │
│ └─────┘└──┬──┘   └────┬────┘        └────┬────┘       └────┬────┘        │
│           │           │                    │                 │            │
│           └───────────┼────────────────────┼─────────────────┘            │
│                       │                    │                              │
│                       ▼                    ▼                              │
│                  ┌─────────┐        ┌─────────┐                          │
│                  │  结束   │        │  结束   │                          │
│                  └─────────┘        └─────────┘                          │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 4.2 流程说明

| 会议类型 | 条件 | 审批流程 | 说明 |
|----------|------|----------|------|
| **内部会议** | 部门内部 | 自动通过 | 无需审批 |
| **部门会议** | 本部门 | 部门负责人审批 → 结束 | 简单审批 |
| **跨部门会议** | 涉及多个部门 | 并行审批（各部门负责人+行政）→ 结束 | 需协调 |
| **大型会议** | 参会人数>50人 | 并行审批（部门+行政+总经理）→ 结束 | 重要会议 |
| **外部会议** | 有外部人员 | 并行审批（部门+总经理）→ 结束 | 需高层把关 |

### 4.3 会议室冲突检测

```javascript
// 会议室冲突检测
async function checkMeetingConflict(meetingData) {
  const { meetingDate, meetingTime, location, participants } = meetingData;
  
  // 检查时间冲突
  const conflicts = await db.query(
    `SELECT * FROM meetings 
     WHERE meeting_date = ? 
     AND location = ?
     AND status != '已取消'
     AND (
       (meeting_time <= ? AND DATE_ADD(meeting_time, INTERVAL 2 HOUR) > ?) OR
       (meeting_time < ? AND DATE_ADD(meeting_time, INTERVAL 2 HOUR) >= ?)
     )`,
    [meetingDate, location, meetingTime, meetingTime, meetingTime, meetingTime]
  );
  
  if (conflicts.length > 0) {
    return {
      hasConflict: true,
      conflicts: conflicts.map(c => ({
        title: c.title,
        time: c.meeting_time,
        organizer: c.organizer
      }))
    };
  }
  
  return { hasConflict: false };
}
```

---

## 五、通用审批引擎设计

### 5.1 审批流程引擎类

```typescript
// ApprovalFlowEngine.ts
class ApprovalFlowEngine {
  // 启动审批流程
  async startFlow(flowCode: string, formData: object, applicant: string): Promise<FlowInstance> {
    // 1. 获取流程定义
    const flowDef = await this.getFlowDefinition(flowCode);
    
    // 2. 计算审批路径
    const path = this.calculatePath(flowDef, formData);
    
    // 3. 创建流程实例
    const instance = await this.createInstance(flowDef, path, formData, applicant);
    
    // 4. 启动第一个节点
    await this.executeNode(instance.id, path[0].id);
    
    return instance;
  }
  
  // 计算审批路径
  calculatePath(flowDef: FlowDefinition, formData: object): ApprovalNode[] {
    const path = [];
    let currentNode = flowDef.nodes.find(n => n.isStart);
    
    while (currentNode && !currentNode.isEnd) {
      path.push(currentNode);
      
      // 根据条件选择下一节点
      if (currentNode.type === 'condition') {
        const nextNodeId = this.evaluateConditions(currentNode.conditions, formData);
        currentNode = flowDef.nodes.find(n => n.id === nextNodeId);
      } else {
        currentNode = flowDef.nodes.find(n => n.id === currentNode.nextNodes[0]);
      }
    }
    
    if (currentNode) {
      path.push(currentNode);
    }
    
    return path;
  }
  
  // 评估条件
  evaluateConditions(conditions: Condition[], formData: object): string {
    for (const condition of conditions) {
      const fieldValue = formData[condition.field];
      const conditionValue = condition.value;
      
      let matched = false;
      switch (condition.operator) {
        case 'eq': matched = fieldValue == conditionValue; break;
        case 'gt': matched = fieldValue > conditionValue; break;
        case 'gte': matched = fieldValue >= conditionValue; break;
        case 'lt': matched = fieldValue < conditionValue; break;
        case 'lte': matched = fieldValue <= conditionValue; break;
        case 'in': matched = conditionValue.includes(fieldValue); break;
      }
      
      if (matched) {
        return condition.nextNodeId;
      }
    }
    
    return conditions[conditions.length - 1]?.nextNodeId;
  }
  
  // 执行节点
  async executeNode(instanceId: string, nodeId: string): Promise<void> {
    const node = await this.getNode(nodeId);
    
    if (node.type === 'serial') {
      await this.handleSerialNode(instanceId, node);
    } else if (node.type === 'parallel') {
      await this.handleParallelNode(instanceId, node);
    } else if (node.type === 'auto') {
      await this.handleAutoNode(instanceId, node);
    }
  }
  
  // 处理串行节点
  async handleSerialNode(instanceId: string, node: ApprovalNode): Promise<void> {
    const approver = await this.resolveApprover(node.approvers[0]);
    await this.assignTask(instanceId, node.id, approver);
  }
  
  // 处理并行节点
  async handleParallelNode(instanceId: string, node: ApprovalNode): Promise<void> {
    const approvers = await Promise.all(
      node.approvers.map(a => this.resolveApprover(a))
    );
    
    // 创建并行任务
    for (const approver of approvers) {
      await this.assignTask(instanceId, node.id, approver, true);
    }
  }
  
  // 处理自动节点
  async handleAutoNode(instanceId: string, node: ApprovalNode): Promise<void> {
    // 自动通过，直接流转到下一节点
    await this.completeNode(instanceId, node.id, 'approved', '自动审批');
    await this.transitionToNext(instanceId, node.id);
  }
  
  // 完成节点审批
  async completeNode(
    instanceId: string, 
    nodeId: string, 
    action: string, 
    comment: string,
    operator: string
  ): Promise<void> {
    // 1. 记录审批历史
    await this.recordHistory(instanceId, nodeId, operator, action, comment);
    
    // 2. 检查是否可以流转
    const canTransition = await this.checkCanTransition(instanceId, nodeId);
    
    if (canTransition) {
      // 3. 流转到下一节点
      await this.transitionToNext(instanceId, nodeId);
    }
  }
  
  // 检查是否可以流转
  async checkCanTransition(instanceId: string, nodeId: string): Promise<boolean> {
    const node = await this.getNode(nodeId);
    
    if (node.type === 'parallel') {
      // 检查并行审批是否完成
      const tasks = await this.getParallelTasks(instanceId, nodeId);
      
      if (node.parallelType === 'and') {
        // 会签：全部通过
        return tasks.every(t => t.status === 'approved');
      } else {
        // 或签：任一通过
        return tasks.some(t => t.status === 'approved');
      }
    }
    
    return true;
  }
  
  // 流转到下一节点
  async transitionToNext(instanceId: string, currentNodeId: string): Promise<void> {
    const instance = await this.getInstance(instanceId);
    const currentNode = await this.getNode(currentNodeId);
    
    // 找到下一节点
    let nextNodeId;
    if (currentNode.type === 'condition') {
      nextNodeId = this.evaluateConditions(currentNode.conditions, instance.formData);
    } else {
      nextNodeId = currentNode.nextNodes[0];
    }
    
    if (!nextNodeId || nextNodeId === 'end') {
      // 流程结束
      await this.completeFlow(instanceId);
    } else {
      // 执行下一节点
      await this.executeNode(instanceId, nextNodeId);
    }
  }
}
```

### 5.2 流程配置示例

```json
{
  "flows": [
    {
      "code": "LEAVE_APPROVAL",
      "name": "请假审批",
      "nodes": [
        {
          "id": "start",
          "type": "start",
          "nextNodes": ["type_check"]
        },
        {
          "id": "type_check",
          "name": "请假类型判断",
          "type": "condition",
          "conditions": [
            { "field": "leaveType", "operator": "in", "value": ["病假", "婚假", "产假"], "nextNodeId": "hr_approval" },
            { "field": "leaveType", "operator": "eq", "value": "年假", "nextNodeId": "annual_leave_check" },
            { "field": "leaveType", "operator": "eq", "value": "事假", "nextNodeId": "personal_leave_check" }
          ]
        },
        {
          "id": "annual_leave_check",
          "name": "年假天数判断",
          "type": "condition",
          "conditions": [
            { "field": "days", "operator": "lte", "value": 3, "nextNodeId": "supervisor_approval" },
            { "field": "days", "operator": "gt", "value": 3, "nextNodeId": "supervisor_to_manager" }
          ]
        },
        {
          "id": "supervisor_approval",
          "name": "直属上级审批",
          "type": "serial",
          "approvers": [{ "type": "supervisor" }],
          "nextNodes": ["end"]
        },
        {
          "id": "supervisor_to_manager",
          "name": "直属上级审批",
          "type": "serial",
          "approvers": [{ "type": "supervisor" }],
          "nextNodes": ["manager_approval"]
        },
        {
          "id": "manager_approval",
          "name": "部门经理审批",
          "type": "serial",
          "approvers": [{ "type": "role", "value": "dept_manager" }],
          "nextNodes": ["end"]
        },
        {
          "id": "hr_approval",
          "name": "HR审批",
          "type": "serial",
          "approvers": [{ "type": "role", "value": "hr" }],
          "nextNodes": ["end"]
        },
        {
          "id": "end",
          "type": "end"
        }
      ]
    },
    {
      "code": "REIMBURSEMENT_APPROVAL",
      "name": "报销审批",
      "nodes": [
        {
          "id": "start",
          "type": "start",
          "nextNodes": ["amount_check"]
        },
        {
          "id": "amount_check",
          "name": "金额判断",
          "type": "condition",
          "conditions": [
            { "field": "amount", "operator": "lt", "value": 500, "nextNodeId": "supervisor_approval_simple" },
            { "field": "amount", "operator": "lt", "value": 5000, "nextNodeId": "supervisor_approval_normal" },
            { "field": "amount", "operator": "lt", "value": 20000, "nextNodeId": "parallel_medium" },
            { "field": "amount", "operator": "gte", "value": 20000, "nextNodeId": "parallel_large" }
          ]
        },
        {
          "id": "supervisor_approval_simple",
          "name": "直属上级审批",
          "type": "serial",
          "approvers": [{ "type": "supervisor" }],
          "nextNodes": ["end"]
        },
        {
          "id": "parallel_medium",
          "name": "财务部门并行审批",
          "type": "parallel",
          "parallelType": "and",
          "approvers": [
            { "type": "role", "value": "finance" },
            { "type": "role", "value": "dept_manager" }
          ],
          "nextNodes": ["end"]
        },
        {
          "id": "parallel_large",
          "name": "财务部门并行审批",
          "type": "parallel",
          "parallelType": "and",
          "approvers": [
            { "type": "role", "value": "finance" },
            { "type": "role", "value": "dept_manager" }
          ],
          "nextNodes": ["gm_approval"]
        },
        {
          "id": "gm_approval",
          "name": "总经理审批",
          "type": "serial",
          "approvers": [{ "type": "user", "value": "general_manager" }],
          "nextNodes": ["end"]
        },
        {
          "id": "end",
          "type": "end"
        }
      ]
    },
    {
      "code": "MEETING_APPROVAL",
      "name": "会议审批",
      "nodes": [
        {
          "id": "start",
          "type": "start",
          "nextNodes": ["meeting_type_check"]
        },
        {
          "id": "meeting_type_check",
          "name": "会议类型判断",
          "type": "condition",
          "conditions": [
            { "field": "meetingType", "operator": "eq", "value": "内部", "nextNodeId": "auto_pass" },
            { "field": "meetingType", "operator": "eq", "value": "部门", "nextNodeId": "dept_approval" },
            { "field": "participantCount", "operator": "gt", "value": 50, "nextNodeId": "parallel_large_meeting" },
            { "field": "hasExternal", "operator": "eq", "value": true, "nextNodeId": "parallel_external" }
          ]
        },
        {
          "id": "auto_pass",
          "name": "自动通过",
          "type": "auto",
          "nextNodes": ["end"]
        },
        {
          "id": "dept_approval",
          "name": "部门负责人审批",
          "type": "serial",
          "approvers": [{ "type": "department" }],
          "nextNodes": ["end"]
        },
        {
          "id": "parallel_large_meeting",
          "name": "大型会议并行审批",
          "type": "parallel",
          "parallelType": "and",
          "approvers": [
            { "type": "department" },
            { "type": "role", "value": "admin" },
            { "type": "user", "value": "general_manager" }
          ],
          "nextNodes": ["end"]
        },
        {
          "id": "parallel_external",
          "name": "外部会议并行审批",
          "type": "parallel",
          "parallelType": "and",
          "approvers": [
            { "type": "department" },
            { "type": "user", "value": "general_manager" }
          ],
          "nextNodes": ["end"]
        },
        {
          "id": "end",
          "type": "end"
        }
      ]
    }
  ]
}
```

---

## 六、实施计划

### 6.1 阶段划分

| 阶段 | 内容 | 工期 | 优先级 |
|------|------|------|--------|
| **第一阶段** | 基础框架搭建 | 1周 | 高 |
| **第二阶段** | 请假审批流程 | 1周 | 高 |
| **第三阶段** | 报销审批流程 | 1周 | 高 |
| **第四阶段** | 会议审批流程 | 1周 | 中 |
| **第五阶段** | 流程设计器 | 2周 | 低 |

### 6.2 数据库迁移脚本

```sql
-- 1. 创建流程定义表
CREATE TABLE IF NOT EXISTS approval_flow_definitions (
  id INT PRIMARY KEY AUTO_INCREMENT,
  code VARCHAR(100) UNIQUE NOT NULL,
  name VARCHAR(255),
  description TEXT,
  node_config JSON,
  is_active TINYINT DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 2. 创建流程实例表
CREATE TABLE IF NOT EXISTS approval_flow_instances (
  id INT PRIMARY KEY AUTO_INCREMENT,
  flow_code VARCHAR(100),
  business_id INT,
  business_type VARCHAR(50),
  applicant VARCHAR(255),
  current_node_id VARCHAR(100),
  status VARCHAR(50),
  form_data JSON,
  path_config JSON,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  completed_at DATETIME
);

-- 3. 迁移现有数据
INSERT INTO approval_flow_instances 
  (business_id, business_type, applicant, status, created_at)
SELECT id, 'leave', applicant, status, created_at 
FROM leave_applications WHERE status = '审批中';

-- 4. 添加关联字段
ALTER TABLE leave_applications ADD COLUMN flow_instance_id INT;
ALTER TABLE reimbursements ADD COLUMN flow_instance_id INT;
ALTER TABLE meetings ADD COLUMN flow_instance_id INT;
```

---

## 七、总结

本设计文档为当前系统的请假、报销、会议三个功能提供了完整的混合审批流程方案：

1. **请假审批**：根据请假类型和天数，采用条件分支+串行审批的组合
2. **报销审批**：根据金额大小，采用条件分支+串行/并行审批的组合
3. **会议审批**：根据会议类型和规模，采用条件分支+自动/串行/并行审批的组合

通过引入通用的审批流程引擎，可以实现：
- 流程配置的灵活性和可扩展性
- 审批路径的自动计算和流转
- 并行审批的自动化处理
- 审批历史的完整记录

**文档版本**: v1.0.0  
**最后更新**: 2026-03-14
