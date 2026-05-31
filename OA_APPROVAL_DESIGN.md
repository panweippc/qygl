# OA审批系统设计说明

## 一、系统概述

### 1.1 设计目标
OA审批系统是企业管理系统的重要组成部分，旨在实现企业内部各类申请流程的电子化、标准化和自动化，提高审批效率，降低管理成本，确保流程可追溯。

### 1.2 适用范围
本系统适用于企业内部以下审批场景：
- 请假申请（事假、病假、年假、婚假、产假等）
- 报销申请（差旅费、办公用品、餐饮费、交通费等）
- 会议申请（会议室预定、会议创建）
- 办公用品申请
- 其他自定义审批流程

### 1.3 技术架构
- **前端框架**：Vue 3 + TypeScript + Element Plus
- **后端服务**：Node.js + Express
- **数据存储**：MySQL
- **状态管理**：Pinia
- **UI组件库**：Element Plus

---

## 二、核心概念

### 2.1 审批流程定义
```
┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐
│  发起   │───▶│  审批中 │───▶│  已批准 │    │  已拒绝 │
│  申请   │    │         │    │         │    │         │
└─────────┘    └─────────┘    └─────────┘    └─────────┘
                                    │              │
                                    ▼              ▼
                              ┌─────────┐    ┌─────────┐
                              │  已归档 │    │  已退回 │
                              └─────────┘    └─────────┘
```

### 2.2 状态流转图
```
                    ┌─────────────────────────────────────┐
                    │                                     │
                    ▼                                     │
┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┤
│  草稿    │──▶│ 审批中   │──▶│  已批准  │──▶│  已完成  │
└──────────┘   └──────────┘   └──────────┘   └──────────┘
                    │              │
                    │              ▼
                    │         ┌──────────┐
                    └────────▶│  已拒绝  │
                              └──────────┘
```

### 2.3 角色定义
| 角色 | 说明 | 权限 |
|------|------|------|
| 申请人 | 发起审批流程的员工 | 提交申请、查看进度、撤回申请 |
| 审批人 | 负责审批的管理人员 | 审批通过/拒绝、添加审批意见 |
| 管理员 | 系统管理员 | 查看所有审批、流程配置、数据统计 |
| 抄送人 | 需要知晓审批结果的人员 | 接收通知、查看审批详情 |

---

## 三、功能模块设计

### 3.1 审批流程引擎

#### 3.1.1 流程定义
```typescript
interface ApprovalFlow {
  id: string;
  name: string;              // 流程名称
  code: string;              // 流程编码
  description: string;       // 流程描述
  category: string;          // 流程分类
  isActive: boolean;         // 是否启用
  formSchema: FormSchema;    // 表单配置
  nodes: ApprovalNode[];     // 审批节点
  createdAt: Date;
  updatedAt: Date;
}

interface ApprovalNode {
  id: string;
  name: string;              // 节点名称
  type: NodeType;            // 节点类型
  approvers: Approver[];     // 审批人配置
  conditions?: Condition[];  // 流转条件
  nextNodes: string[];       // 下一节点ID
  isStart?: boolean;         // 是否开始节点
  isEnd?: boolean;           // 是否结束节点
}

type NodeType = 'start' | 'serial' | 'parallel' | 'condition' | 'end';
```

#### 3.1.2 多节点审批流程设计

##### 串行审批（Serial）
```
┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐
│  开始   │───▶│ 直属上级 │───▶│ 部门经理 │───▶│  总经理  │───▶│  结束   │
└─────────┘    └─────────┘    └─────────┘    └─────────┘    └─────────┘
```
- 特点：按顺序依次审批，前一级通过后才进入下一级
- 适用：层级明确的审批流程
- 配置：`type: 'serial'`, `nextNodes: ['node2']`

##### 并行审批（Parallel）
```
                    ┌─────────┐
               ┌───▶│ 财务审批 │
               │    └─────────┘
┌─────────┐    │         │
│  开始   │───▶┤         ▼
└─────────┘    │    ┌─────────┐
               └───▶│ 人事审批 │
                    └─────────┘
                          │
                          ▼
                    ┌─────────┐
                    │  会签   │────▶ 需全部通过
                    │  或签   │────▶ 任一通过即可
                    └─────────┘
```
- 特点：多个审批人同时审批，可配置会签（全部通过）或或签（任一通过）
- 适用：需要多部门同时审核的场景
- 配置：`type: 'parallel'`, `parallelType: 'and' | 'or'`

##### 条件分支审批（Condition）
```
                              ┌─────────┐
                    金额<1000 │ 部门经理 │
               ┌─────────────▶│  审批   │
               │               └─────────┘
┌─────────┐    │
│  开始   │───▶┤
└─────────┘    │               ┌─────────┐
               │    金额≥1000  │  总经理  │
               └─────────────▶│  审批   │
                              └─────────┘
```
- 特点：根据条件自动选择审批路径
- 适用：不同条件走不同审批流程
- 配置：`type: 'condition'`, `conditions: [{field, operator, value, nextNode}]`

##### 混合审批流程示例
```
┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐
│  开始   │───▶│ 直属上级 │───▶│ 条件分支 │    │         │
└─────────┘    └─────────┘    └────┬────┘    │         │
                                   │         │         │
                    ┌──────────────┼─────────┘         │
                    │              │                   │
                    ▼              ▼                   ▼
              ┌─────────┐    ┌─────────┐         ┌─────────┐
         普通 │ 部门经理 │    │ 并行审批 │         │  结束   │
         请假 │  审批   │    │ 财务+人事│         │         │
              └────┬────┘    └────┬────┘         └─────────┘
                   │              │
                   └──────────────┘
                          │
                          ▼
                    ┌─────────┐
                    │  总经理  │
                    │  审批   │
                    └────┬────┘
                         │
                         ▼
                   金额>5000
```

#### 3.1.3 节点配置详解
```typescript
interface ApprovalNode {
  id: string;
  name: string;                    // 节点名称
  type: NodeType;                  // 节点类型
  
  // 审批人配置
  approvers: Approver[];           // 审批人列表
  approverType: 'single' | 'multi' | 'auto'; // 审批方式
  parallelType?: 'and' | 'or';     // 并行审批类型：会签/或签
  
  // 流转配置
  nextNodes: string[];             // 下一节点ID列表
  conditions?: Condition[];        // 流转条件
  
  // 节点属性
  isStart?: boolean;               // 是否开始节点
  isEnd?: boolean;                 // 是否结束节点
  
  // 高级配置
  config: {
    allowTransfer: boolean;        // 允许转交
    allowAddApprover: boolean;     // 允许加签
    allowRollback: boolean;        // 允许回退
    timeout: number;               // 超时时间（小时）
    timeoutAction: 'autoPass' | 'autoReject' | 'remind'; // 超时动作
    reminderInterval: number;      // 提醒间隔（小时）
  };
}

// 流转条件
interface Condition {
  id: string;
  name: string;
  field: string;                   // 表单字段
  operator: Operator;              // 操作符
  value: any;                      // 比较值
  nextNodeId: string;              // 满足条件后的下一节点
}

type Operator = 
  | 'eq'      // 等于
  | 'ne'      // 不等于
  | 'gt'      // 大于
  | 'gte'     // 大于等于
  | 'lt'      // 小于
  | 'lte'     // 小于等于
  | 'in'      // 包含
  | 'notIn'   // 不包含
  | 'contains'; // 包含字符串
```

#### 3.1.4 审批人配置
```typescript
interface Approver {
  type: ApproverType;        // 审批人类型
  value: string | string[];  // 审批人值
  priority: number;          // 优先级
}

type ApproverType = 
  | 'user'           // 指定用户
  | 'role'           // 指定角色
  | 'department'     // 部门负责人
  | 'supervisor'     // 直属上级
  | 'self'           // 发起人自己
  | 'auto';          // 自动审批
```

#### 3.1.5 多节点审批实例状态管理
```typescript
// 节点实例状态
interface NodeInstance {
  id: string;
  instanceId: string;              // 审批实例ID
  nodeId: string;                  // 节点定义ID
  nodeName: string;                // 节点名称
  status: NodeStatus;              // 节点状态
  
  // 审批人状态（并行审批时使用）
  approverStates: ApproverState[];
  
  // 处理结果
  result?: 'approved' | 'rejected' | 'transferred';
  comment?: string;
  
  // 时间记录
  startTime: Date;
  endTime?: Date;
  
  // 下一节点
  nextNodeId?: string;
}

interface ApproverState {
  approverId: string;
  approverName: string;
  status: 'pending' | 'approved' | 'rejected' | 'transferred';
  comment?: string;
  actionTime?: Date;
}

type NodeStatus = 
  | 'waiting'      // 等待执行
  | 'processing'   // 进行中
  | 'completed'    // 已完成
  | 'skipped';     // 已跳过（条件分支）

// 审批流程执行引擎
class ApprovalFlowEngine {
  // 启动流程
  async startFlow(flowId: string, formData: object): Promise<ApprovalInstance>;
  
  // 执行节点
  async executeNode(instanceId: string, nodeId: string): Promise<void>;
  
  // 处理审批动作
  async handleAction(
    instanceId: string, 
    nodeId: string, 
    action: ApprovalAction,
    operator: string,
    comment?: string
  ): Promise<void>;
  
  // 流转到下一节点
  async transitionToNext(instanceId: string, currentNodeId: string): Promise<void>;
  
  // 获取当前待审批节点
  getCurrentNodes(instanceId: string): NodeInstance[];
  
  // 判断是否可以流转
  canTransition(nodeInstance: NodeInstance): boolean;
}
```

#### 3.1.6 典型多节点审批流程配置示例

**示例1：三级审批流程（串行）**
```json
{
  "name": "三级审批流程",
  "code": "THREE_LEVEL_APPROVAL",
  "nodes": [
    {
      "id": "start",
      "name": "开始",
      "type": "start",
      "nextNodes": ["supervisor"]
    },
    {
      "id": "supervisor",
      "name": "直属上级审批",
      "type": "serial",
      "approvers": [{ "type": "supervisor" }],
      "nextNodes": ["dept_manager"]
    },
    {
      "id": "dept_manager",
      "name": "部门经理审批",
      "type": "serial",
      "approvers": [{ "type": "role", "value": "dept_manager" }],
      "nextNodes": ["gm"]
    },
    {
      "id": "gm",
      "name": "总经理审批",
      "type": "serial",
      "approvers": [{ "type": "user", "value": "general_manager" }],
      "nextNodes": ["end"]
    },
    {
      "id": "end",
      "name": "结束",
      "type": "end"
    }
  ]
}
```

**示例2：财务报销审批（条件+并行）**
```json
{
  "name": "财务报销审批",
  "code": "REIMBURSEMENT_APPROVAL",
  "nodes": [
    {
      "id": "start",
      "name": "开始",
      "type": "start",
      "nextNodes": ["dept_approval"]
    },
    {
      "id": "dept_approval",
      "name": "部门审批",
      "type": "serial",
      "approvers": [{ "type": "department" }],
      "nextNodes": ["amount_check"]
    },
    {
      "id": "amount_check",
      "name": "金额判断",
      "type": "condition",
      "conditions": [
        { "field": "amount", "operator": "lt", "value": 5000, "nextNodeId": "parallel_approval" },
        { "field": "amount", "operator": "gte", "value": 5000, "nextNodeId": "gm_approval" }
      ]
    },
    {
      "id": "parallel_approval",
      "name": "财务人事并行审批",
      "type": "parallel",
      "parallelType": "and",
      "approvers": [
        { "type": "role", "value": "finance" },
        { "type": "role", "value": "hr" }
      ],
      "nextNodes": ["end"]
    },
    {
      "id": "gm_approval",
      "name": "总经理审批",
      "type": "serial",
      "approvers": [{ "type": "user", "value": "gm" }],
      "nextNodes": ["parallel_approval"]
    },
    {
      "id": "end",
      "name": "结束",
      "type": "end"
    }
  ]
}
```

**示例3：请假审批（动态条件）**
```json
{
  "name": "请假审批",
  "code": "LEAVE_APPROVAL",
  "nodes": [
    {
      "id": "start",
      "name": "开始",
      "type": "start",
      "nextNodes": ["leave_type_check"]
    },
    {
      "id": "leave_type_check",
      "name": "请假类型判断",
      "type": "condition",
      "conditions": [
        { "field": "leaveType", "operator": "eq", "value": "年假", "nextNodeId": "supervisor" },
        { "field": "leaveType", "operator": "eq", "value": "病假", "nextNodeId": "hr_check" },
        { "field": "leaveType", "operator": "eq", "value": "婚假", "nextNodeId": "hr_approval" }
      ]
    },
    {
      "id": "supervisor",
      "name": "直属上级审批",
      "type": "serial",
      "approvers": [{ "type": "supervisor" }],
      "nextNodes": ["days_check"]
    },
    {
      "id": "days_check",
      "name": "天数判断",
      "type": "condition",
      "conditions": [
        { "field": "days", "operator": "lte", "value": 3, "nextNodeId": "end" },
        { "field": "days", "operator": "gt", "value": 3, "nextNodeId": "dept_manager" }
      ]
    },
    {
      "id": "dept_manager",
      "name": "部门经理审批",
      "type": "serial",
      "approvers": [{ "type": "role", "value": "dept_manager" }],
      "nextNodes": ["end"]
    },
    {
      "id": "hr_check",
      "name": "HR材料审核",
      "type": "serial",
      "approvers": [{ "type": "role", "value": "hr" }],
      "nextNodes": ["supervisor"]
    },
    {
      "id": "hr_approval",
      "name": "HR审批",
      "type": "serial",
      "approvers": [{ "type": "role", "value": "hr_manager" }],
      "nextNodes": ["end"]
    },
    {
      "id": "end",
      "name": "结束",
      "type": "end"
    }
  ]
}
```

### 3.2 申请表单设计

#### 3.2.1 请假申请表
| 字段名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| applicant | string | 是 | 申请人 |
| leaveType | enum | 是 | 请假类型 |
| startDate | date | 是 | 开始日期 |
| endDate | date | 是 | 结束日期 |
| days | number | 是 | 请假天数 |
| reason | text | 是 | 请假原因 |
| approver | string | 是 | 审批人 |
| attachment | file | 否 | 附件（病假需上传证明）|

#### 3.2.2 报销申请表
| 字段名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| applicant | string | 是 | 申请人 |
| reimburseType | enum | 是 | 报销类型 |
| amount | decimal | 是 | 报销金额 |
| reimburseDate | date | 是 | 报销日期 |
| reason | text | 是 | 报销事由 |
| approver | string | 是 | 审批人 |
| invoices | file[] | 否 | 发票附件 |

#### 3.2.3 会议申请表
| 字段名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| title | string | 是 | 会议主题 |
| organizer | string | 是 | 组织者 |
| meetingDate | date | 是 | 会议日期 |
| meetingTime | time | 是 | 会议时间 |
| location | string | 是 | 会议地点 |
| participants | string | 是 | 参会人员 |
| agenda | text | 是 | 会议议程 |
| approver | string | 是 | 审批人 |

### 3.3 审批实例管理

#### 3.3.1 审批实例数据结构
```typescript
interface ApprovalInstance {
  id: string;
  flowId: string;            // 流程定义ID
  flowName: string;          // 流程名称
  applicant: string;         // 申请人
  currentNodeId: string;     // 当前节点ID
  status: ApprovalStatus;    // 审批状态
  formData: Record<string, any>; // 表单数据
  history: ApprovalHistory[]; // 审批历史
  createdAt: Date;
  completedAt?: Date;
}

interface ApprovalHistory {
  nodeId: string;
  nodeName: string;
  operator: string;
  action: ApprovalAction;
  comment?: string;
  attachments?: string[];
  createdAt: Date;
}

type ApprovalStatus = 
  | 'draft'      // 草稿
  | 'pending'    // 审批中
  | 'approved'   // 已批准
  | 'rejected'   // 已拒绝
  | 'cancelled'  // 已取消
  | 'completed'; // 已完成

type ApprovalAction = 
  | 'submit'     // 提交
  | 'approve'    // 通过
  | 'reject'     // 拒绝
  | 'transfer'   // 转交
  | 'cancel'     // 撤回
  | 'comment';   // 评论
```

---

## 四、数据库设计

### 4.1 审批流程定义表 (approval_flows)
```sql
CREATE TABLE approval_flows (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(255) NOT NULL COMMENT '流程名称',
  code VARCHAR(100) NOT NULL UNIQUE COMMENT '流程编码',
  description TEXT COMMENT '流程描述',
  category VARCHAR(100) COMMENT '流程分类',
  form_schema JSON COMMENT '表单配置',
  node_config JSON COMMENT '节点配置',
  is_active TINYINT DEFAULT 1 COMMENT '是否启用',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) COMMENT='审批流程定义表';
```

### 4.2 审批实例表 (approval_instances)
```sql
CREATE TABLE approval_instances (
  id INT PRIMARY KEY AUTO_INCREMENT,
  flow_id INT NOT NULL COMMENT '流程定义ID',
  flow_name VARCHAR(255) COMMENT '流程名称',
  applicant VARCHAR(255) NOT NULL COMMENT '申请人',
  current_node_id VARCHAR(100) COMMENT '当前节点ID',
  status VARCHAR(50) DEFAULT 'pending' COMMENT '审批状态',
  form_data JSON COMMENT '表单数据',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  completed_at DATETIME COMMENT '完成时间',
  FOREIGN KEY (flow_id) REFERENCES approval_flows(id)
) COMMENT='审批实例表';
```

### 4.3 审批节点实例表 (approval_node_instances)
```sql
CREATE TABLE approval_node_instances (
  id INT PRIMARY KEY AUTO_INCREMENT,
  instance_id INT NOT NULL COMMENT '审批实例ID',
  node_id VARCHAR(100) NOT NULL COMMENT '节点定义ID',
  node_name VARCHAR(255) COMMENT '节点名称',
  node_type VARCHAR(50) COMMENT '节点类型',
  status VARCHAR(50) DEFAULT 'waiting' COMMENT '节点状态：waiting/processing/completed/skipped',
  parallel_type VARCHAR(10) COMMENT '并行类型：and/or',
  result VARCHAR(50) COMMENT '处理结果：approved/rejected/transferred',
  comment TEXT COMMENT '审批意见',
  start_time DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '开始时间',
  end_time DATETIME COMMENT '结束时间',
  next_node_id VARCHAR(100) COMMENT '下一节点ID',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (instance_id) REFERENCES approval_instances(id)
) COMMENT='审批节点实例表';
```

### 4.4 审批人状态表 (approval_approver_states)
```sql
CREATE TABLE approval_approver_states (
  id INT PRIMARY KEY AUTO_INCREMENT,
  node_instance_id INT NOT NULL COMMENT '节点实例ID',
  approver_id VARCHAR(255) NOT NULL COMMENT '审批人ID',
  approver_name VARCHAR(255) COMMENT '审批人名称',
  approver_type VARCHAR(50) COMMENT '审批人类型',
  status VARCHAR(50) DEFAULT 'pending' COMMENT '状态：pending/approved/rejected/transferred',
  comment TEXT COMMENT '审批意见',
  action_time DATETIME COMMENT '操作时间',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (node_instance_id) REFERENCES approval_node_instances(id)
) COMMENT='审批人状态表（用于并行审批）';
```

### 4.5 审批历史表 (approval_history)
```sql
CREATE TABLE approval_history (
  id INT PRIMARY KEY AUTO_INCREMENT,
  instance_id INT NOT NULL COMMENT '审批实例ID',
  node_instance_id INT COMMENT '节点实例ID',
  node_id VARCHAR(100) COMMENT '节点ID',
  node_name VARCHAR(255) COMMENT '节点名称',
  operator VARCHAR(255) COMMENT '操作人',
  action VARCHAR(50) COMMENT '操作类型',
  comment TEXT COMMENT '审批意见',
  attachments JSON COMMENT '附件',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (instance_id) REFERENCES approval_instances(id),
  FOREIGN KEY (node_instance_id) REFERENCES approval_node_instances(id)
) COMMENT='审批历史表';
```

### 4.6 流程定义节点表 (approval_flow_nodes)
```sql
CREATE TABLE approval_flow_nodes (
  id INT PRIMARY KEY AUTO_INCREMENT,
  flow_id INT NOT NULL COMMENT '流程定义ID',
  node_id VARCHAR(100) NOT NULL COMMENT '节点ID',
  node_name VARCHAR(255) COMMENT '节点名称',
  node_type VARCHAR(50) COMMENT '节点类型：start/serial/parallel/condition/end',
  approver_config JSON COMMENT '审批人配置',
  parallel_type VARCHAR(10) COMMENT '并行类型：and/or',
  conditions JSON COMMENT '流转条件配置',
  next_nodes JSON COMMENT '下一节点ID列表',
  is_start TINYINT DEFAULT 0 COMMENT '是否开始节点',
  is_end TINYINT DEFAULT 0 COMMENT '是否结束节点',
  node_config JSON COMMENT '节点高级配置',
  sort_order INT DEFAULT 0 COMMENT '排序',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (flow_id) REFERENCES approval_flows(id)
) COMMENT='流程定义节点表';
```

### 4.7 请假申请表 (leave_applications)
```sql
CREATE TABLE leave_applications (
  id INT PRIMARY KEY AUTO_INCREMENT,
  instance_id INT COMMENT '审批实例ID',
  applicant VARCHAR(255) NOT NULL COMMENT '申请人',
  leave_type VARCHAR(50) NOT NULL COMMENT '请假类型',
  start_date DATE NOT NULL COMMENT '开始日期',
  end_date DATE NOT NULL COMMENT '结束日期',
  days INT NOT NULL COMMENT '请假天数',
  reason TEXT NOT NULL COMMENT '请假原因',
  approver VARCHAR(255) COMMENT '审批人',
  status VARCHAR(50) DEFAULT '审批中' COMMENT '状态',
  result VARCHAR(50) COMMENT '审批结果',
  comment TEXT COMMENT '审批意见',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (instance_id) REFERENCES approval_instances(id)
) COMMENT='请假申请表';
```

### 4.8 报销申请表 (reimbursements)
```sql
CREATE TABLE reimbursements (
  id INT PRIMARY KEY AUTO_INCREMENT,
  instance_id INT COMMENT '审批实例ID',
  applicant VARCHAR(255) NOT NULL COMMENT '申请人',
  reimburse_type VARCHAR(50) NOT NULL COMMENT '报销类型',
  amount DECIMAL(10,2) NOT NULL COMMENT '报销金额',
  reimburse_date DATE NOT NULL COMMENT '报销日期',
  reason TEXT NOT NULL COMMENT '报销事由',
  approver VARCHAR(255) COMMENT '审批人',
  status VARCHAR(50) DEFAULT '审批中' COMMENT '状态',
  result VARCHAR(50) COMMENT '审批结果',
  comment TEXT COMMENT '审批意见',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (instance_id) REFERENCES approval_instances(id)
) COMMENT='报销申请表';
```

### 4.9 会议申请表 (meetings)
```sql
CREATE TABLE meetings (
  id INT PRIMARY KEY AUTO_INCREMENT,
  instance_id INT COMMENT '审批实例ID',
  title VARCHAR(255) NOT NULL COMMENT '会议主题',
  organizer VARCHAR(255) NOT NULL COMMENT '组织者',
  meeting_date DATE NOT NULL COMMENT '会议日期',
  meeting_time TIME NOT NULL COMMENT '会议时间',
  location VARCHAR(255) NOT NULL COMMENT '会议地点',
  participants TEXT COMMENT '参会人员',
  agenda TEXT COMMENT '会议议程',
  approver VARCHAR(255) COMMENT '审批人',
  status VARCHAR(50) DEFAULT '审批中' COMMENT '状态',
  result VARCHAR(50) COMMENT '审批结果',
  comment TEXT COMMENT '审批意见',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (instance_id) REFERENCES approval_instances(id)
) COMMENT='会议申请表';
```

---

## 五、API接口设计

### 5.1 流程定义接口

#### 获取流程列表
```http
GET /api/approval-flows
Response: {
  success: boolean,
  data: ApprovalFlow[]
}
```

#### 获取流程详情
```http
GET /api/approval-flows/:id
Response: {
  success: boolean,
  data: ApprovalFlow
}
```

#### 创建流程
```http
POST /api/approval-flows
Body: {
  name: string,
  code: string,
  category: string,
  formSchema: object,
  nodes: ApprovalNode[]
}
```

### 5.2 审批实例接口

#### 发起审批
```http
POST /api/approval-instances
Body: {
  flowId: string,
  formData: object
}
```

#### 获取我的申请
```http
GET /api/approval-instances/my-applications
Query: { status?: string, page?: number, size?: number }
Response: {
  success: boolean,
  data: {
    list: ApprovalInstance[],
    total: number
  }
}
```

#### 获取待我审批
```http
GET /api/approval-instances/pending-approval
Response: {
  success: boolean,
  data: ApprovalInstance[]
}
```

#### 执行审批
```http
PUT /api/approval-instances/:id/approve
Body: {
  action: 'approve' | 'reject' | 'transfer',
  comment?: string,
  nextApprover?: string
}
```

#### 撤回申请
```http
PUT /api/approval-instances/:id/cancel
Response: {
  success: boolean,
  message: string
}
```

#### 获取审批详情
```http
GET /api/approval-instances/:id
Response: {
  success: boolean,
  data: {
    instance: ApprovalInstance,
    nodes: NodeInstance[],       // 所有节点实例
    currentNodes: NodeInstance[], // 当前活跃节点
    history: ApprovalHistory[]
  }
}
```

#### 获取流程图
```http
GET /api/approval-instances/:id/flow-chart
Response: {
  success: boolean,
  data: {
    nodes: FlowChartNode[],      // 流程图节点
    edges: FlowChartEdge[],      // 流程图连线
    activeNodeIds: string[]      // 当前活跃节点ID
  }
}
```

#### 转交审批
```http
PUT /api/approval-instances/:id/transfer
Body: {
  nodeId: string,              // 当前节点ID
  fromApprover: string,        // 原审批人
  toApprover: string,          // 新审批人
  reason?: string              // 转交原因
}
```

#### 加签审批
```http
PUT /api/approval-instances/:id/add-approver
Body: {
  nodeId: string,              // 当前节点ID
  approver: string,            // 加签审批人
  addType: 'before' | 'after', // 加签位置
  reason?: string              // 加签原因
}
```

#### 回退到指定节点
```http
PUT /api/approval-instances/:id/rollback
Body: {
  toNodeId: string,            // 回退目标节点ID
  reason: string               // 回退原因
}
```

### 5.3 流程定义管理接口

#### 获取流程节点列表
```http
GET /api/approval-flows/:id/nodes
Response: {
  success: boolean,
  data: ApprovalNode[]
}
```

#### 保存流程节点
```http
POST /api/approval-flows/:id/nodes
Body: {
  nodes: ApprovalNode[]
}
```

#### 发布流程
```http
PUT /api/approval-flows/:id/publish
Response: {
  success: boolean,
  message: string
}
```

#### 验证流程配置
```http
POST /api/approval-flows/validate
Body: {
  nodes: ApprovalNode[]
}
Response: {
  success: boolean,
  valid: boolean,
  errors?: string[]           // 验证错误信息
}
```

### 5.4 具体业务接口

#### 请假申请
```http
POST /api/leave-applications
GET /api/leave-applications
GET /api/leave-applications/:id
PUT /api/leave-applications/:id
DELETE /api/leave-applications/:id
PUT /api/leave-applications/:id/approve
```

#### 报销申请
```http
POST /api/reimbursements
GET /api/reimbursements
GET /api/reimbursements/:id
PUT /api/reimbursements/:id
DELETE /api/reimbursements/:id
PUT /api/reimbursements/:id/approve
```

#### 会议申请
```http
POST /api/meetings
GET /api/meetings
GET /api/meetings/:id
PUT /api/meetings/:id
DELETE /api/meetings/:id
PUT /api/meetings/:id/approve
```

---

## 六、多节点审批流程可视化

### 6.1 流程图展示
```
┌─────────────────────────────────────────────────────────────────────────┐
│                           请假审批流程图                                  │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│   ┌─────────┐      ┌─────────┐      ┌─────────┐      ┌─────────┐      │
│   │  🟢开始  │─────▶│ 🟡直属上级 │─────▶│ 🟡条件分支 │      │         │      │
│   └─────────┘      └─────────┘      └────┬────┘      │         │      │
│                                          │            │         │      │
│                    ┌─────────────────────┼────────────┘         │      │
│                    │                     │                      │      │
│                    ▼                     ▼                      ▼      │
│              ┌─────────┐           ┌─────────┐            ┌─────────┐ │
│         年假  │ 🟢部门经理│      病假 │ 🟢HR审核  │       婚假 │ 🟢HR审批  │ │
│              └────┬────┘           └────┬────┘            └────┬────┘ │
│                   │                     │                      │      │
│                   │                     └──────────────────────┘      │
│                   │                              │                    │
│                   └──────────────────────────────┘                    │
│                                                  │                    │
│                                                  ▼                    │
│                                            ┌─────────┐               │
│                                            │ 🟢 结束  │               │
│                                            └─────────┘               │
│                                                                         │
│  图例: 🟢 已完成  🟡 进行中  ⚪ 未开始                                   │
└─────────────────────────────────────────────────────────────────────────┘
```

### 6.2 节点状态流转
```
┌───────────┐    启动    ┌───────────┐   开始审批   ┌───────────┐
│  waiting  │───────────▶│processing │────────────▶│completed  │
│  (等待中)  │            │ (进行中)   │             │ (已完成)   │
└───────────┘            └─────┬─────┘             └───────────┘
                               │
                    ┌──────────┼──────────┐
                    │          │          │
                    ▼          ▼          ▼
              ┌─────────┐ ┌─────────┐ ┌─────────┐
              │approved │ │rejected │ │transferred
              │ (通过)  │ │ (拒绝)  │ │ (转交)  │
              └────┬────┘ └────┬────┘ └────┬────┘
                   │           │           │
                   └───────────┴───────────┘
                               │
                               ▼
                         ┌───────────┐
                         │ 流转到下一节点 │
                         └───────────┘
```

### 6.3 并行审批状态计算
```typescript
// 会签（AND）- 全部通过才算通过
function calculateAndResult(approverStates: ApproverState[]): 'approved' | 'rejected' | 'pending' {
  const allApproved = approverStates.every(s => s.status === 'approved');
  const anyRejected = approverStates.some(s => s.status === 'rejected');
  
  if (anyRejected) return 'rejected';
  if (allApproved) return 'approved';
  return 'pending';
}

// 或签（OR）- 任一通过即算通过
function calculateOrResult(approverStates: ApproverState[]): 'approved' | 'rejected' | 'pending' {
  const anyApproved = approverStates.some(s => s.status === 'approved');
  const allRejected = approverStates.every(s => s.status === 'rejected');
  
  if (anyApproved) return 'approved';
  if (allRejected) return 'rejected';
  return 'pending';
}
```

---

## 七、前端组件设计

### 7.1 组件结构
```
src/
├── views/
│   ├── OAOfficeView.vue           # OA办公首页
│   ├── OAWorkflowView.vue         # 工作流管理
│   ├── ApprovalManagementView.vue # 审批管理
│   ├── LeaveApplicationView.vue   # 请假申请
│   ├── ReimbursementView.vue      # 报销申请
│   └── MeetingManagementView.vue  # 会议管理
├── components/
│   ├── approval/
│   │   ├── ApprovalForm.vue       # 通用审批表单
│   │   ├── ApprovalList.vue       # 审批列表
│   │   ├── ApprovalDetail.vue     # 审批详情
│   │   ├── ApprovalTimeline.vue   # 审批时间线
│   │   └── ApprovalStats.vue      # 审批统计
│   └── forms/
│       ├── LeaveForm.vue          # 请假表单
│       ├── ReimbursementForm.vue  # 报销表单
│       └── MeetingForm.vue        # 会议表单
```

### 7.2 核心组件说明

#### ApprovalForm 通用审批表单
```typescript
interface ApprovalFormProps {
  flowCode: string;          // 流程编码
  initialData?: object;      // 初始数据
  readonly?: boolean;        // 是否只读
}

interface ApprovalFormEmits {
  submit: (data: object) => void;
  cancel: () => void;
}
```

#### ApprovalList 审批列表
```typescript
interface ApprovalListProps {
  type: 'my' | 'pending' | 'approved' | 'all'; // 列表类型
  flowCode?: string;         // 流程编码筛选
  pageSize?: number;         // 每页条数
}
```

#### ApprovalTimeline 审批时间线
```typescript
interface ApprovalTimelineProps {
  history: ApprovalHistory[]; // 审批历史
  currentNode?: string;       // 当前节点
}
```

#### ApprovalFlowDesigner 流程设计器
```typescript
interface ApprovalFlowDesignerProps {
  flowData?: ApprovalFlow;     // 流程数据
  readonly?: boolean;          // 是否只读
}

interface ApprovalFlowDesignerEmits {
  save: (flow: ApprovalFlow) => void;
  publish: (flow: ApprovalFlow) => void;
  preview: (flow: ApprovalFlow) => void;
}
```

#### ApprovalNodeConfig 节点配置
```typescript
interface ApprovalNodeConfigProps {
  node: ApprovalNode;          // 节点数据
  allNodes: ApprovalNode[];    // 所有节点（用于选择下一节点）
}

interface ApprovalNodeConfigEmits {
  update: (node: ApprovalNode) => void;
  delete: (nodeId: string) => void;
}
```

#### ParallelApproverPanel 并行审批面板
```typescript
interface ParallelApproverPanelProps {
  approvers: Approver[];       // 审批人列表
  parallelType: 'and' | 'or';  // 并行类型
}
```

#### ConditionConfigurator 条件配置器
```typescript
interface ConditionConfiguratorProps {
  conditions: Condition[];     // 条件列表
  formFields: FormField[];     // 表单字段列表
  targetNodes: ApprovalNode[]; // 目标节点列表
}
```

---

## 八、权限控制设计

### 8.1 功能权限
| 功能 | 员工 | 部门主管 | 管理员 |
|------|------|----------|--------|
| 发起申请 | ✓ | ✓ | ✗ |
| 查看我的申请 | ✓ | ✓ | ✓ |
| 审批申请 | ✗ | ✓ | ✓ |
| 查看所有申请 | ✗ | ✗ | ✓ |
| 流程配置 | ✗ | ✗ | ✓ |
| 数据统计 | ✗ | ✗ | ✓ |

### 8.2 数据权限
- **员工**：只能查看自己发起的申请
- **部门主管**：可查看本部门员工的申请，审批需要本部门审批的申请
- **管理员**：可查看所有申请，拥有所有操作权限

### 8.3 审批权限
```typescript
interface ApprovalPermission {
  canSubmit: boolean;        // 能否提交申请
  canApprove: boolean;       // 能否审批
  canCancel: boolean;        // 能否撤回
  canTransfer: boolean;      // 能否转交
  canViewAll: boolean;       // 能否查看所有
  canConfigure: boolean;     // 能否配置流程
}
```

---

## 九、通知机制

### 9.1 通知场景
| 场景 | 通知对象 | 通知方式 |
|------|----------|----------|
| 申请提交 | 审批人 | 站内信、邮件 |
| 审批通过 | 申请人、抄送人 | 站内信、邮件 |
| 审批拒绝 | 申请人 | 站内信、邮件 |
| 申请撤回 | 审批人 | 站内信 |
| 审批转交 | 新审批人 | 站内信、邮件 |
| 即将超时 | 审批人 | 站内信、邮件 |

### 9.2 通知模板
```typescript
interface NotificationTemplate {
  id: string;
  code: string;
  name: string;
  title: string;
  content: string;
  variables: string[];       // 变量列表
  channels: Channel[];       // 通知渠道
}

type Channel = 'web' | 'email' | 'sms' | 'app';
```

---

## 十、数据统计

### 10.1 统计维度
- **个人维度**：我的申请统计、我的审批统计
- **部门维度**：部门申请量、部门审批效率
- **流程维度**：各流程使用量、各流程平均耗时
- **时间维度**：日/周/月/年统计

### 10.2 关键指标
| 指标 | 说明 | 计算公式 |
|------|------|----------|
| 申请总量 | 统计周期内的申请总数 | COUNT(*) |
| 平均审批时长 | 从提交到完成的平均时间 | AVG(completedAt - createdAt) |
| 通过率 | 已批准申请占总申请的比例 | approved / total * 100% |
| 及时审批率 | 在时限内完成的审批比例 | onTime / total * 100% |
| 驳回率 | 被拒绝申请占总申请的比例 | rejected / total * 100% |

---

## 十一、扩展设计

### 11.1 流程扩展
- 支持自定义流程模板
- 支持条件分支
- 支持会签/或签
- 支持加签/转交
- 支持超时自动处理

### 11.2 表单扩展
- 支持拖拽式表单设计器
- 支持自定义字段类型
- 支持字段校验规则
- 支持公式计算

### 11.3 集成扩展
- 与企业微信/钉钉集成
- 与HR系统对接
- 与财务系统对接
- 与考勤系统对接

---

## 十二、安全设计

### 12.1 数据安全
- 敏感数据加密存储
- 审批数据不可篡改
- 操作日志完整记录
- 定期数据备份

### 12.2 访问安全
- 基于角色的访问控制（RBAC）
- 接口权限校验
- 防止越权访问
- 操作审计日志

### 12.3 传输安全
- HTTPS传输加密
- 接口防重放攻击
- 敏感操作二次确认

---

## 十三、部署与运维

### 13.1 环境要求
- Node.js 14+
- MySQL 8.0+
- Redis 6.0+（缓存）
- Nginx（反向代理）

### 13.2 性能优化
- 数据库索引优化
- 审批列表分页加载
- 热点数据缓存
- 静态资源CDN加速

### 13.3 监控告警
- 系统性能监控
- 审批流程监控
- 异常告警机制
- 日志收集分析

---

## 十四、附录

### 14.1 状态码定义
| 状态码 | 说明 |
|--------|------|
| 200 | 操作成功 |
| 400 | 请求参数错误 |
| 401 | 未授权 |
| 403 | 禁止访问 |
| 404 | 资源不存在 |
| 409 | 状态冲突（如重复提交）|
| 500 | 服务器内部错误 |

### 14.2 错误码定义
| 错误码 | 说明 |
|--------|------|
| A001 | 流程不存在 |
| A002 | 流程已禁用 |
| A003 | 无权发起该流程 |
| A004 | 无权审批该申请 |
| A005 | 申请状态不允许此操作 |
| A006 | 审批人配置错误 |
| A007 | 节点不存在 |
| A008 | 节点状态不允许操作 |
| A009 | 并行审批未完成 |
| A010 | 条件分支配置错误 |
| A011 | 流程图存在循环依赖 |
| A012 | 审批人未找到 |
| A013 | 转交失败 |
| A014 | 加签失败 |
| A015 | 回退失败 |

### 14.3 相关文档
- [企业管理系统设计说明](./DESIGN.md)
- [API接口文档](./API.md)
- [数据库设计文档](./DATABASE.md)

---

**文档版本**: v1.0.0  
**最后更新**: 2026-03-14  
**编写人**: 架构师  
**审核人**: 技术负责人
