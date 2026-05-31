# ）

## 基于现有系统配置的开放式审批流程设计

***

## 一、设计原则

### 1.1 开放式审批理念

- **无固定分级**：不按照金额、天数等条件设置固定的审批层级
- **灵活路由**：根据申请人所在部门的组织架构动态确定审批路径
- **缺省处理**：当某个审批节点不存在时，自动跳转到合适的审批人

### 1.2 核心规则

1. **逐级上报**：申请默认按组织架构逐级向上审批
2. **缺省直达**：当申请人的直接上级不存在时，可直接向最高管理者（总经理）申请
3. **财务备案**：最高管理者（总经理）审批通过后，申请自动流转至财务总监处备案/处理

***

## 二、组织架构与审批角色

### 2.1 现有部门架构

```
                    ┌─────────────┐
                    │   总经理    │  ← 最高管理者
                    │  (管理部门) │
                    └──────┬──────┘
                           │
           ┌───────────────┼───────────────┐
           │               │               │
           ▼               ▼               ▼
    ┌─────────────┐ ┌─────────────┐ ┌─────────────┐
    │   技术部    │ │   销售部    │ │   财务部    │
    ├─────────────┤ ├─────────────┤ ├─────────────┤
    │ 技术部经理 │ │ 销售部经理 │ │  财务总监   │
    │  项目经理  │ │    销售     │ └─────────────┘
    │ 软件研发   │ └─────────────┘
    │ 系统运维   │
    └─────────────┘
           │
           ▼
    ┌─────────────┐
    │  人力资源部 │
    ├─────────────┤
    │  人事经理   │
    └─────────────┘
```

### 2.2 审批角色定义

| 审批角色      | 对应职位        | 职责说明            |
| --------- | ----------- | --------------- |
| **申请人**   | 全体员工        | 发起申请、查看进度、撤回申请  |
| **直接上级**  | 项目经理、部门经理   | 初审、真实性审核、工作协调   |
| **部门负责人** | 技术部经理、销售部经理 | 部门内审批、预算审核      |
| **财务总监**  | 财务总监        | 财务备案、资金处理、票据审核  |
| **最高管理者** | 总经理         | 最终审批、跨部门协调、特殊事项 |

***

## 三、开放式审批流程

### 3.1 审批流程模型

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           开放式审批流程模型                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   申请人提交申请                                                             │
│        │                                                                    │
│        ▼                                                                    │
│   ┌─────────────────────────────────────────────────────────────────────┐  │
│   │                        智能路由判断                                  │  │
│   │  ┌───────────────────────────────────────────────────────────────┐ │  │
│   │  │  判断1: 申请人是否有直接上级？                                 │ │  │
│   │  │  ├─ 是 → 流转至直接上级审批                                   │ │  │
│   │  │  └─ 否 → 流转至最高管理者（总经理）审批                       │ │  │
│   │  └───────────────────────────────────────────────────────────────┘ │  │
│   └─────────────────────────────────────────────────────────────────────┘  │
│        │                                                                    │
│        ▼                                                                    │
│   ┌─────────────────────────────────────────────────────────────────────┐  │
│   │                        逐级审批阶段                                  │  │
│   │                                                                      │  │
│   │   直接上级审批 ──► 部门负责人审批 ──► 最高管理者审批                 │  │
│   │        │                │                  │                        │  │
│   │        ├─ 驳回          ├─ 驳回            ├─ 驳回                  │  │
│   │        │                │                  │                        │  │
│   │        ▼                ▼                  ▼                        │  │
│   │   退回申请人      退回直接上级      退回部门负责人                   │  │
│   │                                                                      │  │
│   │   注：任一节点不存在时，自动跳过至下一级                             │  │
│   └─────────────────────────────────────────────────────────────────────┘  │
│        │                                                                    │
│        ▼ (最高管理者审批通过)                                               │
│   ┌─────────────────────────────────────────────────────────────────────┐  │
│   │                        财务备案阶段                                  │  │
│   │                                                                      │  │
│   │   最高管理者审批通过后，申请自动流转至财务总监                         │  │
│   │                                                                      │  │
│   │   财务总监处理：                                                     │  │
│   │   ├─ 费用类申请：审核票据、安排付款                                  │  │
│   │   ├─ 人事类申请：备案记录                                            │  │
│   │   └─ 采购类申请：资金安排                                            │  │
│   │                                                                      │  │
│   │   财务总监可执行：                                                   │  │
│   │   ├─ 确认备案（流程结束）                                            │  │
│   │   ├─ 退回补充资料                                                    │  │
│   │   └─ 转交其他部门处理                                                │  │
│   └─────────────────────────────────────────────────────────────────────┘  │
│        │                                                                    │
│        ▼                                                                    │
│   流程结束，归档备案                                                         │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 3.2 审批路径示例

#### 示例1：技术部员工（有完整上级）

```
软件研发工程师（申请人）
        │
        ▼
项目经理（直接上级）
        │
        ▼
技术部经理（部门负责人）
        │
        ▼
总经理（最高管理者）
        │
        ▼
财务总监（财务备案）
        │
        ▼
流程结束
```

#### 示例2：销售部员工（部门经理直接管理）

```
销售（申请人）
        │
        ▼
销售部经理（直接上级 + 部门负责人）
        │
        ▼
总经理（最高管理者）
        │
        ▼
财务总监（财务备案）
        │
        ▼
流程结束
```

#### 示例3：部门负责人申请（无更高部门上级）

```
技术部经理（申请人）
        │
        ▼
总经理（最高管理者） ← 直接上级不存在，直达最高管理者
        │
        ▼
财务总监（财务备案）
        │
        ▼
流程结束
```

#### 示例4：特殊职位（直接上级缺失）

```
项目经理（申请人）
        │
        ▼
技术部经理（直接上级）
        │
        ▼
总经理（最高管理者）
        │
        ▼
财务总监（财务备案）
        │
        ▼
流程结束

注：如果技术部经理职位空缺，则：
项目经理（申请人）
        │
        ▼
总经理（最高管理者） ← 直接上级缺失，直达最高管理者
        │
        ▼
财务总监（财务备案）
```

***

## 四、审批流程详细说明

### 4.1 请假审批流程

| 审批节点    | 审批人       | 操作          | 说明          |
| ------- | --------- | ----------- | ----------- |
| 申请提交    | 申请人       | 填写请假信息、上传附件 | 请假类型、时间、原因  |
| 直接上级审批  | 项目经理/部门经理 | 同意/驳回/退回    | 审核工作安排、人员调配 |
| 部门负责人审批 | 部门经理      | 同意/驳回/退回    | 部门整体工作协调    |
| 最高管理者审批 | 总经理       | 同意/驳回/退回    | 跨部门协调、特殊事项  |
| 财务备案    | 财务总监      | 确认/退回/转交    | 考勤记录、薪资核算   |

**特殊处理：**

- 病假需提供医院证明
- 年假需提前申请
- 紧急请假可先口头申请，后补单

### 4.2 报销审批流程

| 审批节点    | 审批人       | 操作         | 说明        |
| ------- | --------- | ---------- | --------- |
| 申请提交    | 申请人       | 填写报销单、上传票据 | 费用明细、发票附件 |
| 直接上级审批  | 项目经理/部门经理 | 同意/驳回/退回   | 审核费用真实性   |
| 部门负责人审批 | 部门经理      | 同意/驳回/退回   | 部门预算审核    |
| 最高管理者审批 | 总经理       | 同意/驳回/退回   | 大额费用审批    |
| 财务处理    | 财务总监      | 确认付款/退回/转交 | 票据审核、资金安排 |

**特殊处理：**

- 差旅费需附出差申请单
- 招待费需附清单
- 发票需真实有效

### 4.3 采购审批流程

| 审批节点    | 审批人       | 操作         | 说明         |
| ------- | --------- | ---------- | ---------- |
| 申请提交    | 申请人       | 填写采购申请     | 物品、数量、用途   |
| 直接上级审批  | 项目经理/部门经理 | 同意/驳回/退回   | 需求合理性审核    |
| 部门负责人审批 | 部门经理      | 同意/驳回/退回   | 部门预算审核     |
| 最高管理者审批 | 总经理       | 同意/驳回/退回   | 采购决策       |
| 财务处理    | 财务总监      | 确认/付款安排/退回 | 资金安排、供应商付款 |

**特殊处理：**

- 固定资产需单独标注
- 紧急采购可先执行后补单

### 4.4 出差审批流程

| 审批节点    | 审批人       | 操作       | 说明           |
| ------- | --------- | -------- | ------------ |
| 申请提交    | 申请人       | 填写出差计划   | 目的地、时间、目的    |
| 直接上级审批  | 项目经理/部门经理 | 同意/驳回/退回 | 工作安排审核       |
| 部门负责人审批 | 部门经理      | 同意/驳回/退回 | 部门工作协调       |
| 最高管理者审批 | 总经理       | 同意/驳回/退回 | 重要出差审批       |
| 财务备案    | 财务总监      | 确认/退回    | 差旅费标准确认、借款安排 |

### 4.5 办公用品申请流程

| 审批节点    | 审批人       | 操作         | 说明       |
| ------- | --------- | ---------- | -------- |
| 申请提交    | 申请人       | 填写申请单      | 物品、数量、用途 |
| 直接上级审批  | 项目经理/部门经理 | 同意/驳回/退回   | 需求合理性    |
| 部门负责人审批 | 部门经理      | 同意/驳回/退回   | 部门预算审核   |
| 最高管理者审批 | 总经理       | 同意/驳回/退回   | 大额用品审批   |
| 财务处理    | 财务总监      | 确认/采购安排/退回 | 采购资金安排   |

***

## 五、智能路由规则

### 5.1 审批人查找逻辑

```javascript
// 审批人智能查找算法
function findNextApprover(applicant, currentNode = null) {
  const { department, position } = applicant;
  
  // 定义组织架构关系
  const orgStructure = {
    '技术部': {
      hierarchy: ['软件研发工程师', '系统运维工程师', '项目经理', '技术部经理'],
      manager: '技术部经理'
    },
    '销售部': {
      hierarchy: ['销售', '销售部经理'],
      manager: '销售部经理'
    },
    '财务部': {
      hierarchy: ['财务总监'],
      manager: '财务总监'
    },
    '人力资源部': {
      hierarchy: ['人事经理'],
      manager: '人事经理'
    }
  };
  
  // 最高管理者
  const topManager = '总经理';
  const financeDirector = '财务总监';
  
  // 如果没有当前节点（首次提交）
  if (!currentNode) {
    // 查找申请人的直接上级
    const directSuperior = findDirectSuperior(department, position);
    
    // 如果直接上级存在，返回直接上级
    if (directSuperior && directSuperior.exists) {
      return {
        type: 'direct_superior',
        position: directSuperior.position,
        name: directSuperior.name
      };
    }
    
    // 如果直接上级不存在，直达最高管理者
    return {
      type: 'top_manager',
      position: topManager,
      note: '直接上级缺失，直达最高管理者'
    };
  }
  
  // 根据当前节点确定下一级
  switch(currentNode.type) {
    case 'direct_superior':
      // 直接上级审批后，流转至部门负责人
      const deptManager = orgStructure[department]?.manager;
      if (deptManager && deptManager !== currentNode.position) {
        return {
          type: 'dept_manager',
          position: deptManager
        };
      }
      // 如果直接上级就是部门负责人，直接到最高管理者
      return {
        type: 'top_manager',
        position: topManager
      };
      
    case 'dept_manager':
      // 部门负责人审批后，流转至最高管理者
      return {
        type: 'top_manager',
        position: topManager
      };
      
    case 'top_manager':
      // 最高管理者审批通过后，流转至财务总监
      return {
        type: 'finance_director',
        position: financeDirector
      };
      
    case 'finance_director':
      // 财务总监处理后，流程结束
      return {
        type: 'end',
        message: '流程结束'
      };
      
    default:
      return null;
  }
}

// 查找直接上级
function findDirectSuperior(department, position) {
  const superiorMap = {
    '技术部': {
      '软件研发工程师': '项目经理',
      '系统运维工程师': '项目经理',
      '项目经理': '技术部经理'
    },
    '销售部': {
      '销售': '销售部经理'
    },
    '财务部': {
      '财务总监': null  // 财务总监无部门内上级
    },
    '人力资源部': {
      '人事经理': null  // 人事经理无部门内上级
    },
    '管理部门': {
      '总经理': null  // 总经理为最高管理者
    }
  };
  
  const superiorPosition = superiorMap[department]?.[position];
  
  if (!superiorPosition) {
    return {
      exists: false,
      message: '该职位无部门内直接上级'
    };
  }
  
  // 检查该职位是否有人任职
  const superiorUser = findUserByPosition(department, superiorPosition);
  
  return {
    exists: !!superiorUser,
    position: superiorPosition,
    name: superiorUser?.name,
    message: superiorUser ? '找到直接上级' : '直接上级职位空缺'
  };
}
```

### 5.2 审批路径动态生成

```javascript
// 动态生成审批路径
function generateApprovalPath(applicant) {
  const path = [];
  let currentNode = null;
  
  // 循环查找下一级审批人，直到流程结束
  while (true) {
    const nextApprover = findNextApprover(applicant, currentNode);
    
    if (!nextApprover || nextApprover.type === 'end') {
      break;
    }
    
    path.push({
      order: path.length + 1,
      type: nextApprover.type,
      position: nextApprover.position,
      name: nextApprover.name,
      note: nextApprover.note || ''
    });
    
    currentNode = nextApprover;
  }
  
  return path;
}

// 示例：生成审批路径
const applicant = {
  name: '张三',
  department: '技术部',
  position: '软件研发工程师'
};

const approvalPath = generateApprovalPath(applicant);
console.log('审批路径:', approvalPath);
// 输出:
// [
//   { order: 1, type: 'direct_superior', position: '项目经理', name: '李四' },
//   { order: 2, type: 'dept_manager', position: '技术部经理', name: '王五' },
//   { order: 3, type: 'top_manager', position: '总经理', name: '赵六' },
//   { order: 4, type: 'finance_director', position: '财务总监', name: '孙七' }
// ]
```

***

## 六、权限控制

### 6.1 操作权限

| 操作   | 申请人    | 直接上级 | 部门负责人 | 最高管理者 | 财务总监 |
| ---- | ------ | ---- | ----- | ----- | ---- |
| 提交申请 | ✓      | ✓    | ✓     | ✓     | ✓    |
| 查看进度 | ✓      | ✓    | ✓     | ✓     | ✓    |
| 撤回申请 | ✓(未审批) | ✗    | ✗     | ✗     | ✗    |
| 同意审批 | ✗      | ✓    | ✓     | ✓     | ✓    |
| 驳回审批 | ✗      | ✓    | ✓     | ✓     | ✓    |
| 退回修改 | ✗      | ✓    | ✓     | ✓     | ✓    |
| 转交他人 | ✗      | ✓    | ✓     | ✓     | ✓    |
| 加签审批 | ✗      | ✗    | ✓     | ✓     | ✓    |
| 流程催办 | ✓      | ✓    | ✓     | ✓     | ✓    |

### 6.2 数据权限

| 数据范围 | 申请人 | 直接上级 | 部门负责人 | 最高管理者 | 财务总监 |
| ---- | --- | ---- | ----- | ----- | ---- |
| 我的申请 | ✓   | ✓    | ✓     | ✓     | ✓    |
| 我的待办 | ✗   | ✓    | ✓     | ✓     | ✓    |
| 我的已办 | ✗   | ✓    | ✓     | ✓     | ✓    |
| 部门数据 | ✗   | 本部门  | 本部门   | 全部    | 财务相关 |
| 全部数据 | ✗   | ✗    | ✗     | ✓     | ✓    |

***

## 七、系统实现

### 7.1 数据库表结构

```sql
-- 审批流程定义表
CREATE TABLE approval_flows (
  id INT AUTO_INCREMENT PRIMARY KEY,
  flowCode VARCHAR(255) NOT NULL COMMENT '流程编码(leave/reimburse/purchase等)',
  flowName VARCHAR(255) NOT NULL COMMENT '流程名称',
  description TEXT COMMENT '流程说明',
  status VARCHAR(50) DEFAULT '启用' COMMENT '状态',
  createdAt DATETIME NOT NULL,
  updatedAt DATETIME NOT NULL
);

-- 审批实例表
CREATE TABLE approval_instances (
  id INT AUTO_INCREMENT PRIMARY KEY,
  flowCode VARCHAR(255) NOT NULL COMMENT '流程编码',
  applicantId INT NOT NULL COMMENT '申请人ID',
  applicantName VARCHAR(255) NOT NULL COMMENT '申请人姓名',
  applicantDept VARCHAR(255) NOT NULL COMMENT '申请人部门',
  applicantPosition VARCHAR(255) NOT NULL COMMENT '申请人职位',
  businessType VARCHAR(255) NOT NULL COMMENT '业务类型',
  businessData JSON NOT NULL COMMENT '业务数据',
  currentApproverType VARCHAR(255) COMMENT '当前审批人类型',
  currentApproverId INT COMMENT '当前审批人ID',
  currentApproverName VARCHAR(255) COMMENT '当前审批人姓名',
  approvalPath JSON COMMENT '审批路径(动态生成)',
  status VARCHAR(50) DEFAULT '审批中' COMMENT '状态(审批中/已批准/已驳回/已撤回)',
  createdAt DATETIME NOT NULL,
  completedAt DATETIME COMMENT '完成时间'
);

-- 审批历史记录表
CREATE TABLE approval_history (
  id INT AUTO_INCREMENT PRIMARY KEY,
  instanceId INT NOT NULL COMMENT '实例ID',
  nodeOrder INT NOT NULL COMMENT '节点顺序',
  approverType VARCHAR(255) NOT NULL COMMENT '审批人类型',
  approverId INT NOT NULL COMMENT '审批人ID',
  approverName VARCHAR(255) NOT NULL COMMENT '审批人姓名',
  approverPosition VARCHAR(255) NOT NULL COMMENT '审批人职位',
  action VARCHAR(50) NOT NULL COMMENT '操作(agree/reject/return/transfer)',
  comment TEXT COMMENT '审批意见',
  createdAt DATETIME NOT NULL
);

-- 审批人配置表（用于动态查找）
CREATE TABLE approver_configs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  department VARCHAR(255) NOT NULL COMMENT '部门',
  position VARCHAR(255) NOT NULL COMMENT '职位',
  superiorPosition VARCHAR(255) COMMENT '上级职位',
  isDeptManager BOOLEAN DEFAULT FALSE COMMENT '是否部门负责人',
  isTopManager BOOLEAN DEFAULT FALSE COMMENT '是否最高管理者',
  isFinanceDirector BOOLEAN DEFAULT FALSE COMMENT '是否财务总监',
  createdAt DATETIME NOT NULL
);
```

### 7.2 核心流程代码

```javascript
// 提交申请
async function submitApplication(applicant, flowCode, businessData) {
  // 1. 生成审批路径
  const approvalPath = generateApprovalPath(applicant);
  
  if (approvalPath.length === 0) {
    throw new Error('无法生成审批路径，请检查组织架构配置');
  }
  
  // 2. 获取第一个审批人
  const firstApprover = approvalPath[0];
  
  // 3. 创建审批实例
  const instance = await createApprovalInstance({
    flowCode,
    applicantId: applicant.id,
    applicantName: applicant.name,
    applicantDept: applicant.department,
    applicantPosition: applicant.position,
    businessType: flowCode,
    businessData,
    currentApproverType: firstApprover.type,
    currentApproverId: firstApprover.userId,
    currentApproverName: firstApprover.name,
    approvalPath,
    status: '审批中'
  });
  
  // 4. 发送待办通知
  await sendTodoNotification(firstApprover.userId, instance);
  
  return instance;
}

// 处理审批
async function processApproval(instanceId, approver, action, comment) {
  const instance = await getApprovalInstance(instanceId);
  
  // 1. 验证审批人权限
  if (instance.currentApproverId !== approver.id) {
    throw new Error('您不是当前审批人，无权处理');
  }
  
  // 2. 记录审批历史
  await createApprovalHistory({
    instanceId,
    nodeOrder: getCurrentNodeOrder(instance),
    approverType: instance.currentApproverType,
    approverId: approver.id,
    approverName: approver.name,
    approverPosition: approver.position,
    action,
    comment,
    createdAt: new Date()
  });
  
  // 3. 根据操作处理
  switch(action) {
    case 'agree':
      await handleAgree(instance, approver);
      break;
    case 'reject':
      await handleReject(instance, approver, comment);
      break;
    case 'return':
      await handleReturn(instance, approver, comment);
      break;
    case 'transfer':
      await handleTransfer(instance, approver, comment);
      break;
    default:
      throw new Error('未知的审批操作');
  }
}

// 同意审批处理
async function handleAgree(instance, approver) {
  // 1. 查找下一个审批节点
  const nextNode = findNextNode(instance.approvalPath, instance.currentApproverType);
  
  if (!nextNode) {
    // 没有下一个节点，流程结束
    await completeApproval(instance, '已批准');
    return;
  }
  
  // 2. 更新当前审批人
  await updateInstanceApprover(instance.id, {
    currentApproverType: nextNode.type,
    currentApproverId: nextNode.userId,
    currentApproverName: nextNode.name
  });
  
  // 3. 发送待办通知给下一个审批人
  await sendTodoNotification(nextNode.userId, instance);
  
  // 4. 如果下一个节点是财务总监，发送特殊通知
  if (nextNode.type === 'finance_director') {
    await sendFinanceNotification(nextNode.userId, instance);
  }
}

// 驳回审批处理
async function handleReject(instance, approver, comment) {
  await completeApproval(instance, '已驳回', comment);
  await sendRejectNotification(instance.applicantId, instance, comment);
}

// 退回修改处理
async function handleReturn(instance, approver, comment) {
  // 退回给申请人
  await updateInstanceStatus(instance.id, '已退回', comment);
  await sendReturnNotification(instance.applicantId, instance, comment);
}

// 完成审批
async function completeApproval(instance, status, comment = '') {
  await updateInstanceStatus(instance.id, status, comment);
  await updateInstanceCompletedTime(instance.id, new Date());
  await sendCompleteNotification(instance.applicantId, instance, status);
}
```

***

## 八、界面设计建议

### 8.1 申请提交页面

```
┌─────────────────────────────────────────────────────────────┐
│  申请提交                                                    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  申请人：张三（技术部-软件研发工程师）                        │
│                                                             │
│  审批路径预览：                                              │
│  ┌─────┐   ┌─────┐   ┌─────┐   ┌─────┐   ┌─────┐          │
│  │ 我  │ → │项目经理│ → │技术部经理│ → │ 总经理 │ → │财务总监│          │
│  └─────┘   └─────┘   └─────┘   └─────┘   └─────┘          │
│                                                             │
│  [表单内容区域]                                              │
│                                                             │
│  请假类型：[病假/事假/年假...]                                │
│  开始时间：[日期选择器]                                       │
│  结束时间：[日期选择器]                                       │
│  请假原因：[多行文本框]                                       │
│  附件上传：[上传按钮]                                         │
│                                                             │
│                    [提交申请]                                │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 8.2 审批处理页面

```
┌─────────────────────────────────────────────────────────────┐
│  审批处理                                                    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  申请信息：                                                  │
│  申请人：张三（技术部）                                       │
│  申请类型：请假申请                                           │
│  申请时间：2026-03-17                                         │
│                                                             │
│  审批进度：                                                  │
│  ●───○───○───○───○                                          │
│  我  项目经理 技术部经理 总经理 财务总监                       │
│  ✓    待审批   待审批   待审批   待审批                       │
│                                                             │
│  审批意见：                                                  │
│  [多行文本框]                                                │
│                                                             │
│  [同意]  [驳回]  [退回修改]  [转交他人]                       │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

***

## 九、实施建议

### 9.1 配置步骤

1. **配置审批人关系**
   - 在 `approver_configs` 表中配置各部门的职位关系
   - 设置每个职位的上级职位
   - 标记部门负责人、最高管理者、财务总监
2. **初始化流程模板**
   - 在 `approval_flows` 表中创建各类审批流程
3. **测试审批路径**
   - 使用不同职位的测试账号提交申请
   - 验证审批路径是否正确生成
   - 测试上级缺失时的直达逻辑

### 9.2 注意事项

1. **职位空缺处理**
   - 当某个审批职位空缺时，系统应自动跳过该节点
   - 记录跳过的原因，便于后续审计
2. **财务总监特殊处理**
   - 最高管理者审批通过后，必须流转至财务总监
   - 财务总监可进行财务相关的特殊处理
3. **流程回退**
   - 支持审批人退回给申请人修改
   - 支持申请人主动撤回未审批的申请

***

**文档版本：** V1.0\
**生效日期：** 2026年3月17日\
**制定依据：** 基于现有系统部门角色配置\
**审核人：** \_\_\_\_\_\_\_\_\_\_\_\_\_\
**批准人：** \_\_\_\_\_\_\_\_\_\_\_\_\_
