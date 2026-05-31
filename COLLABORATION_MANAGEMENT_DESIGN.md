# 协同管理模块设计说明

## 一、模块概述

### 1.1 设计目标
"协同管理"模块是对原有"OA办公"模块的全面升级，整合请假、报销、会议等审批流程，增加协同办公能力，提升团队协作效率。

### 1.2 核心定位
- **流程中心**：统一审批入口，支持灵活配置
- **协同平台**：团队任务协作、文档共享
- **数据中心**：审批数据统计、效率分析
- **集成枢纽**：连接考勤、财务、邮件等系统

### 1.3 与OA办公模块的关系
```
┌─────────────────────────────────────────────────────────────┐
│                      协同管理模块                            │
│                    (CollaborationMgmt)                      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│   │  流程审批   │  │  任务协同   │  │  文档中心   │        │
│   │   (新)     │  │   (新)     │  │   (新)     │        │
│   └──────┬──────┘  └─────────────┘  └─────────────┘        │
│          │                                                  │
│          ▼                                                  │
│   ┌─────────────────────────────────────────────┐          │
│   │              原有OA办公功能                  │          │
│   │  ┌─────────┐ ┌─────────┐ ┌─────────┐       │          │
│   │  │请假申请 │ │报销申请 │ │会议管理 │       │          │
│   │  └─────────┘ └─────────┘ └─────────┘       │          │
│   └─────────────────────────────────────────────┘          │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 二、功能架构

### 2.1 功能模块全景图

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           协同管理模块                                   │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                        我的工作台                                 │   │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐           │   │
│  │  │ 待办事项 │ │ 我的申请 │ │ 我的任务 │ │ 我的文档 │           │   │
│  │  │   📥    │ │   📝    │ │   ✅    │ │   📁    │           │   │
│  │  │   12    │ │   8     │ │   5     │ │   23    │           │   │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘           │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  ┌──────────────────────────┐  ┌──────────────────────────┐            │
│  │      流程审批中心         │  │      任务协同中心         │            │
│  │  ┌──────────────────┐   │  │  ┌──────────────────┐   │            │
│  │  │ 📝 请假申请      │   │  │  │ 📋 任务看板      │   │            │
│  │  │ 💰 报销申请      │   │  │  │ 📊 项目进度      │   │            │
│  │  │ 📅 会议申请      │   │  │  │ 👥 团队协作      │   │            │
│  │  │ 📦 办公用品      │   │  │  │ ⏰ 日程安排      │   │            │
│  │  │ ➕ 自定义流程    │   │  │  │ 🔔 提醒通知      │   │            │
│  │  └──────────────────┘   │  │  └──────────────────┘   │            │
│  └──────────────────────────┘  └──────────────────────────┘            │
│                                                                         │
│  ┌──────────────────────────┐  ┌──────────────────────────┐            │
│  │      文档知识中心         │  │      数据分析中心         │            │
│  │  ┌──────────────────┐   │  │  ┌──────────────────┐   │            │
│  │  │ 📁 文档管理      │   │  │  │ 📊 审批统计      │   │            │
│  │  │ 🔍 知识库        │   │  │  │ 📈 效率分析      │   │            │
│  │  │ 📝 在线编辑      │   │  │  │ 👁️ 流程监控      │   │            │
│  │  │ 🔗 文件共享      │   │  │  │ ⚠️ 异常预警      │   │            │
│  │  └──────────────────┘   │  │  └──────────────────┘   │            │
│  └──────────────────────────┘  └──────────────────────────┘            │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                        系统管理                                   │   │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐           │   │
│  │  │流程配置  │ │权限管理  │ │组织架构  │ │日志审计  │           │   │
│  │  │  ⚙️    │ │  🔐    │ │  👥    │ │  📜    │           │   │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘           │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 三、五大功能模块详细设计

### 3.1 我的工作台模块

#### 3.1.1 模块定位
作为用户进入协同管理系统的默认首页，提供一站式工作入口，汇总展示与用户相关的所有待办事项、申请记录、任务和文档。

#### 3.1.2 功能架构

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           我的工作台                                     │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                      数据概览区                                   │   │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐           │   │
│  │  │ 待办事项 │ │ 我的申请 │ │ 我的任务 │ │ 我的文档 │           │   │
│  │  │   📥    │ │   📝    │ │   ✅    │ │   📁    │           │   │
│  │  │   12    │ │   8     │ │   5     │ │   23    │           │   │
│  │  │ 待审批   │ │ 审批中   │ │ 进行中   │ │ 我创建的 │           │   │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘           │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                      快捷操作区                                   │   │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐           │   │
│  │  │ 📝 请假  │ │ 💰 报销  │ │ 📅 会议  │ │ 📋 任务  │           │   │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘           │   │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐           │   │
│  │  │ 📤 上传  │ │ 📅 日程  │ │ 💬 消息  │ │ ⚙️ 更多  │           │   │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘           │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                      待办列表区                                   │   │
│  │  ┌─────────────────────────────────────────────────────────┐   │   │
│  │  │ 类型   标题              申请人   时间      操作       │   │   │
│  │  │ ─────────────────────────────────────────────────────── │   │   │
│  │  │ 请假   年假申请-5天      张三      10:30     [审批][查看]│   │   │
│  │  │ 报销   差旅费报销        李四      09:15     [审批][查看]│   │   │
│  │  │ 任务   完成项目文档      王五      昨天      [处理][查看]│   │   │
│  │  └─────────────────────────────────────────────────────────┘   │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                      最近动态区                                   │   │
│  │  ● 张三 通过了你的请假申请                    10分钟前         │   │
│  │  ● 你被分配了新任务：完成周报                  30分钟前        │   │
│  │  ● 李四 分享了一个文档给你                     1小时前         │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

#### 3.1.3 核心功能点

| 功能点 | 功能描述 | 优先级 | 数据交互 |
|--------|----------|--------|----------|
| **待办事项统计** | 显示待审批、待处理的任务数量 | P0 | 实时从审批表、任务表统计 |
| **我的申请统计** | 显示进行中的申请数量 | P0 | 统计用户发起的审批记录 |
| **我的任务统计** | 显示进行中的任务数量 | P1 | 统计分配给用户的任务 |
| **我的文档统计** | 显示用户创建的文档数量 | P1 | 统计用户上传的文档 |
| **快捷操作入口** | 一键发起常用申请和操作 | P0 | 跳转对应页面或打开弹窗 |
| **待办列表** | 展示待处理事项，支持快速操作 | P0 | 分页查询待办数据 |
| **最近动态** | 展示用户相关的系统消息 | P1 | 查询消息通知表 |

#### 3.1.4 数据模型

```sql
-- 工作台视图所需数据表（复用已有表）
-- 1. 待办事项：从 approval_instances 表查询 status='pending' 且 approver_id=当前用户
-- 2. 我的申请：从 approval_instances 表查询 applicant_id=当前用户
-- 3. 我的任务：从 collaboration_tasks 表查询 assignee_id=当前用户
-- 4. 我的文档：从 collaboration_documents 表查询 creator_id=当前用户
-- 5. 消息通知：从 user_notifications 表查询 user_id=当前用户
```

#### 3.1.5 API接口

```javascript
// 工作台数据聚合接口
GET    /api/collaboration/dashboard/stats           // 获取统计数据
GET    /api/collaboration/dashboard/todos            // 获取待办列表
GET    /api/collaboration/dashboard/activities       // 获取最近动态
GET    /api/collaboration/dashboard/shortcuts        // 获取快捷操作配置
```

---

### 3.2 流程审批中心模块

#### 3.2.1 模块定位
作为企业审批流程的统一入口和管理中心，支持请假、报销、会议、办公用品等多种审批类型，提供流程申请、审批处理、流程监控等全流程管理能力。

#### 3.2.2 功能架构

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          流程审批中心                                    │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                      审批工作台                                   │   │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐│   │
│  │  │  📥 待我审批 │ │  ✅ 我已审批 │ │  📝 我发起的 │ │  📧 抄送我的 ││   │
│  │  │    12      │ │    156     │ │     45     │ │     23     ││   │
│  │  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘│   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                      申请入口                                     │   │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐           │   │
│  │  │ 📝 请假  │ │ 💰 报销  │ │ 📅 会议  │ │ 📦 用品  │           │   │
│  │  │ •年假    │ │ •差旅费  │ │ •会议室  │ │ •申请    │           │   │
│  │  │ •病假    │ │ •交通费  │ │ •纪要    │ │ •领用    │           │   │
│  │  │ •事假    │ │ •餐饮费  │ │ •外部会  │ │ •归还    │           │   │
│  │  │ •婚假    │ │ •办公费  │ │          │ │          │           │   │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘           │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                      审批列表                                     │   │
│  │  ┌─────────────────────────────────────────────────────────┐   │   │
│  │  │ 编号    类型   标题         申请人   状态    操作       │   │   │
│  │  │ ─────────────────────────────────────────────────────── │   │   │
│  │  │ #202403001 请假  年假申请-5天  张三    审批中  [审批]    │   │   │
│  │  │ #202403002 报销  差旅费报销    李四    待审批  [审批]    │   │   │
│  │  │ #202403003 会议  周会预定      王五    已通过  [查看]    │   │   │
│  │  └─────────────────────────────────────────────────────────┘   │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                      审批操作                                     │   │
│  │  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐       │   │
│  │  │  ✅   │ │  ❌   │ │  🔄   │ │  ➕   │ │  💬   │       │   │
│  │  │ 通过  │ │ 拒绝  │ │ 转交  │ │ 加签  │ │ 评论  │       │   │
│  │  └────────┘ └────────┘ └────────┘ └────────┘ └────────┘       │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

#### 3.2.3 核心功能点

| 功能点 | 功能描述 | 优先级 | 数据交互 |
|--------|----------|--------|----------|
| **待我审批** | 展示需要当前用户审批的所有申请 | P0 | 查询审批实例表，筛选待审批状态 |
| **我已审批** | 展示当前用户已处理的审批记录 | P0 | 查询审批历史表 |
| **我发起的** | 展示当前用户发起的所有申请 | P0 | 查询审批实例表，按申请人筛选 |
| **抄送我的** | 展示抄送给当前用户的审批记录 | P1 | 查询抄送记录表 |
| **请假申请** | 支持多种请假类型的申请流程 | P0 | 创建请假审批实例 |
| **报销申请** | 支持多种费用类型的报销流程 | P0 | 创建报销审批实例，支持附件上传 |
| **会议申请** | 会议室预定和会议创建流程 | P0 | 创建会议审批实例，检测会议室冲突 |
| **办公用品** | 用品申请、领用、归还流程 | P1 | 创建设备用品审批实例 |
| **审批操作** | 通过、拒绝、转交、加签、评论 | P0 | 更新审批实例状态，记录审批历史 |

#### 3.2.4 审批流程状态机

```
                    ┌─────────────┐
                    │   草稿      │
                    │  (draft)    │
                    └──────┬──────┘
                           │ 提交申请
                           ▼
                    ┌─────────────┐
         ┌─────────│   审批中    │─────────┐
         │         │ (pending)   │         │
         │         └──────┬──────┘         │
         │                │                │
    拒绝  │           通过 │           撤回
         │                │                │
         ▼                ▼                ▼
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   已拒绝    │    │   已通过    │    │   已撤回    │
│ (rejected)  │    │ (approved)  │    │ (cancelled) │
└─────────────┘    └─────────────┘    └─────────────┘
```

#### 3.2.5 数据模型

```sql
-- 审批流程定义表
CREATE TABLE approval_flows (
  id INT PRIMARY KEY AUTO_INCREMENT,
  code VARCHAR(50) NOT NULL COMMENT '流程编码',
  name VARCHAR(100) NOT NULL COMMENT '流程名称',
  description TEXT COMMENT '流程描述',
  icon VARCHAR(50) COMMENT '图标',
  color VARCHAR(20) COMMENT '颜色标识',
  form_schema JSON COMMENT '表单配置JSON',
  flow_config JSON COMMENT '流程配置JSON',
  is_enabled TINYINT DEFAULT 1 COMMENT '是否启用',
  sort_order INT DEFAULT 0 COMMENT '排序',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) COMMENT='审批流程定义表';

-- 审批实例表
CREATE TABLE approval_instances (
  id INT PRIMARY KEY AUTO_INCREMENT,
  flow_id INT NOT NULL COMMENT '流程ID',
  flow_code VARCHAR(50) COMMENT '流程编码',
  business_no VARCHAR(50) COMMENT '业务编号',
  
  -- 申请人信息
  applicant_id VARCHAR(255) COMMENT '申请人ID',
  applicant_name VARCHAR(255) COMMENT '申请人名称',
  applicant_dept VARCHAR(255) COMMENT '申请人部门',
  
  -- 表单数据
  title VARCHAR(255) COMMENT '申请标题',
  form_data JSON COMMENT '表单数据',
  attachments JSON COMMENT '附件列表',
  
  -- 审批状态
  status ENUM('draft', 'pending', 'approved', 'rejected', 'cancelled') DEFAULT 'draft' COMMENT '状态',
  current_node_id VARCHAR(50) COMMENT '当前节点ID',
  current_approver_id VARCHAR(255) COMMENT '当前审批人ID',
  
  -- 时间
  submit_time DATETIME COMMENT '提交时间',
  complete_time DATETIME COMMENT '完成时间',
  
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (flow_id) REFERENCES approval_flows(id)
) COMMENT='审批实例表';

-- 审批历史记录表
CREATE TABLE approval_history (
  id INT PRIMARY KEY AUTO_INCREMENT,
  instance_id INT NOT NULL COMMENT '审批实例ID',
  node_id VARCHAR(50) COMMENT '节点ID',
  node_name VARCHAR(100) COMMENT '节点名称',
  
  -- 操作人
  operator_id VARCHAR(255) COMMENT '操作人ID',
  operator_name VARCHAR(255) COMMENT '操作人名称',
  
  -- 操作信息
  action ENUM('submit', 'approve', 'reject', 'transfer', 'add_sign', 'comment', 'cancel') COMMENT '操作类型',
  comment TEXT COMMENT '审批意见',
  attachments JSON COMMENT '附件',
  
  -- 转交/加签信息
  transfer_to_id VARCHAR(255) COMMENT '转交给用户ID',
  transfer_to_name VARCHAR(255) COMMENT '转交给用户名称',
  
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (instance_id) REFERENCES approval_instances(id)
) COMMENT='审批历史记录表';

-- 抄送记录表
CREATE TABLE approval_cc (
  id INT PRIMARY KEY AUTO_INCREMENT,
  instance_id INT NOT NULL COMMENT '审批实例ID',
  user_id VARCHAR(255) COMMENT '抄送人ID',
  user_name VARCHAR(255) COMMENT '抄送人名称',
  is_read TINYINT DEFAULT 0 COMMENT '是否已读',
  read_time DATETIME COMMENT '阅读时间',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (instance_id) REFERENCES approval_instances(id)
) COMMENT='抄送记录表';
```

#### 3.2.6 API接口

```javascript
// 审批工作台接口
GET    /api/collaboration/approval/pending          // 获取待我审批列表
GET    /api/collaboration/approval/approved         // 获取我已审批列表
GET    /api/collaboration/approval/my               // 获取我发起的申请列表
GET    /api/collaboration/approval/cc               // 获取抄送我的列表

// 审批操作接口
POST   /api/collaboration/approval                  // 创建审批申请
GET    /api/collaboration/approval/:id              // 获取审批详情
PUT    /api/collaboration/approval/:id/submit       // 提交申请
PUT    /api/collaboration/approval/:id/approve      // 审批通过
PUT    /api/collaboration/approval/:id/reject       // 审批拒绝
PUT    /api/collaboration/approval/:id/transfer     // 转交审批
PUT    /api/collaboration/approval/:id/add-sign     // 加签
POST   /api/collaboration/approval/:id/comment      // 添加评论
PUT    /api/collaboration/approval/:id/cancel       // 撤回申请

// 流程定义接口
GET    /api/collaboration/approval/flows            // 获取流程列表
GET    /api/collaboration/approval/flows/:id        // 获取流程详情
```

---

### 3.3 任务协同中心模块

#### 3.3.1 模块定位
提供团队任务协作能力，支持任务看板、项目进度跟踪、团队协作和日程安排，提升团队工作效率和协作透明度。

#### 3.3.2 功能架构

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          任务协同中心                                    │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                      视图切换                                     │   │
│  │  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐                  │   │
│  │  │ 📋看板 │ │ 📄列表 │ │ 📅日历 │ │ 📊甘特 │                  │   │
│  │  └────────┘ └────────┘ └────────┘ └────────┘                  │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                      任务看板                                     │   │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐│   │
│  │  │   待办      │ │   进行中    │ │   审核中    │ │   已完成    ││   │
│  │  │   (5)      │ │    (3)     │ │    (2)     │ │   (12)     ││   │
│  │  ├─────────────┤ ├─────────────┤ ├─────────────┤ ├─────────────┤│   │
│  │  │ ┌─────────┐ │ │ ┌─────────┐ │ │ ┌─────────┐ │ │ ┌─────────┐ ││   │
│  │  │ │任务1    │ │ │ │任务4    │ │ │ │任务6    │ │ │ │任务8    │ ││   │
│  │  │ │高优先级 │ │ │ │中优先级 │ │ │ │低优先级 │ │ │ │已完成   │ ││   │
│  │  │ │3/15截止 │ │ │ │3/20截止 │ │ │ │3/18截止 │ │ │ │3/10完成 │ ││   │
│  │  │ └─────────┘ │ │ └─────────┘ │ │ └─────────┘ │ │ └─────────┘ ││   │
│  │  │ ┌─────────┐ │ │ ┌─────────┐ │ │ └─────────┘ │ │ ┌─────────┐ ││   │
│  │  │ │任务2    │ │ │ │任务5    │ │ │             │ │ │任务9    │ ││   │
│  │  │ └─────────┘ │ │ └─────────┘ │ │             │ │ └─────────┘ ││   │
│  │  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘│   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                      任务卡片                                     │   │
│  │  ┌─────────────────────────────────────────────────────────┐   │   │
│  │  │ 🔴 高优先级                                              │   │   │
│  │  │ 完成项目需求文档编写                                      │   │   │
│  │  │ 👤 张三  📅 03-15  📎 2个附件                            │   │   │
│  │  │ [前端] [需求] [v1.0]                                     │   │   │
│  │  │ ████████░░░░░░░░ 50%                                     │   │   │
│  │  └─────────────────────────────────────────────────────────┘   │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

#### 3.3.3 核心功能点

| 功能点 | 功能描述 | 优先级 | 数据交互 |
|--------|----------|--------|----------|
| **看板视图** | 拖拽式任务管理，支持多列状态 | P0 | 支持拖拽更新任务状态 |
| **列表视图** | 表格形式展示任务，支持排序筛选 | P0 | 分页查询任务列表 |
| **日历视图** | 按日期展示任务，支持日/周/月视图 | P1 | 按时间范围查询任务 |
| **甘特图视图** | 项目进度时间轴展示 | P2 | 查询任务时间数据 |
| **任务CRUD** | 创建、查看、编辑、删除任务 | P0 | 任务表的增删改查 |
| **任务分配** | 将任务分配给团队成员 | P0 | 更新任务负责人字段 |
| **进度跟踪** | 更新和展示任务完成进度 | P0 | 更新任务进度字段 |
| **任务评论** | 任务讨论和评论功能 | P1 | 任务评论表的增删改查 |
| **任务标签** | 为任务添加分类标签 | P1 | 标签的增删改查 |
| **任务提醒** | 到期提醒和进度提醒 | P1 | 创建消息通知记录 |

#### 3.3.4 任务状态流转

```
┌─────────┐    开始    ┌─────────┐    提交    ┌─────────┐    通过    ┌─────────┐
│  待办   │ ────────▶ │  进行中 │ ────────▶ │  审核中 │ ────────▶ │  已完成 │
│  (todo) │           │(in_prog)│           │(review) │           │  (done) │
└────┬────┘           └────┬────┘           └────┬────┘           └─────────┘
     │                     │                     │
     │ 取消                │ 暂停                │ 驳回
     ▼                     ▼                     ▼
┌─────────┐           ┌─────────┐           ┌─────────┐
│  已取消 │           │  已暂停 │           │  重新做 │
│(cancel) │           │(paused) │           │(rework) │
└─────────┘           └─────────┘           └────┬────┘
                                                  │
                                                  └──────────▶ 进行中
```

#### 3.3.5 数据模型

```sql
-- 协同任务表
CREATE TABLE collaboration_tasks (
  id INT PRIMARY KEY AUTO_INCREMENT,
  title VARCHAR(255) NOT NULL COMMENT '任务标题',
  description TEXT COMMENT '任务描述',
  project_id INT COMMENT '所属项目ID',
  
  -- 负责人信息
  assignee_id VARCHAR(255) COMMENT '负责人ID',
  assignee_name VARCHAR(255) COMMENT '负责人名称',
  assignee_avatar VARCHAR(500) COMMENT '负责人头像',
  
  -- 创建人信息
  creator_id VARCHAR(255) COMMENT '创建人ID',
  creator_name VARCHAR(255) COMMENT '创建人名称',
  
  -- 任务属性
  priority ENUM('low', 'medium', 'high', 'urgent') DEFAULT 'medium' COMMENT '优先级',
  status ENUM('todo', 'in_progress', 'review', 'done', 'cancelled') DEFAULT 'todo' COMMENT '状态',
  progress INT DEFAULT 0 COMMENT '进度百分比(0-100)',
  
  -- 时间
  start_date DATE COMMENT '开始日期',
  due_date DATE COMMENT '截止日期',
  completed_at DATETIME COMMENT '完成时间',
  
  -- 其他
  tags JSON COMMENT '标签数组',
  attachments JSON COMMENT '附件列表',
  parent_id INT COMMENT '父任务ID（子任务）',
  
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) COMMENT='协同任务表';

-- 任务评论表
CREATE TABLE task_comments (
  id INT PRIMARY KEY AUTO_INCREMENT,
  task_id INT NOT NULL COMMENT '任务ID',
  user_id VARCHAR(255) COMMENT '用户ID',
  user_name VARCHAR(255) COMMENT '用户名称',
  user_avatar VARCHAR(500) COMMENT '用户头像',
  content TEXT COMMENT '评论内容',
  attachments JSON COMMENT '附件',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (task_id) REFERENCES collaboration_tasks(id) ON DELETE CASCADE
) COMMENT='任务评论表';

-- 任务操作日志表
CREATE TABLE task_logs (
  id INT PRIMARY KEY AUTO_INCREMENT,
  task_id INT NOT NULL COMMENT '任务ID',
  user_id VARCHAR(255) COMMENT '用户ID',
  user_name VARCHAR(255) COMMENT '用户名称',
  action VARCHAR(50) COMMENT '操作类型(create/update/delete/status_change)',
  old_value TEXT COMMENT '旧值',
  new_value TEXT COMMENT '新值',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (task_id) REFERENCES collaboration_tasks(id) ON DELETE CASCADE
) COMMENT='任务操作日志表';

-- 项目表
CREATE TABLE collaboration_projects (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(255) NOT NULL COMMENT '项目名称',
  description TEXT COMMENT '项目描述',
  status ENUM('planning', 'ongoing', 'completed', 'paused') DEFAULT 'planning' COMMENT '状态',
  start_date DATE COMMENT '开始日期',
  end_date DATE COMMENT '结束日期',
  manager_id VARCHAR(255) COMMENT '项目经理ID',
  manager_name VARCHAR(255) COMMENT '项目经理名称',
  members JSON COMMENT '成员列表',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) COMMENT='协同项目表';
```

#### 3.3.6 API接口

```javascript
// 任务管理接口
GET    /api/collaboration/tasks                    // 获取任务列表
POST   /api/collaboration/tasks                    // 创建任务
GET    /api/collaboration/tasks/:id                // 获取任务详情
PUT    /api/collaboration/tasks/:id                // 更新任务
DELETE /api/collaboration/tasks/:id                // 删除任务
PUT    /api/collaboration/tasks/:id/status         // 更新任务状态
PUT    /api/collaboration/tasks/:id/progress       // 更新任务进度
PUT    /api/collaboration/tasks/:id/assign         // 分配任务

// 任务评论接口
GET    /api/collaboration/tasks/:id/comments       // 获取任务评论
POST   /api/collaboration/tasks/:id/comments       // 添加评论
DELETE /api/collaboration/comments/:id             // 删除评论

// 任务日志接口
GET    /api/collaboration/tasks/:id/logs           // 获取任务操作日志

// 项目管理接口
GET    /api/collaboration/projects                 // 获取项目列表
POST   /api/collaboration/projects                 // 创建项目
GET    /api/collaboration/projects/:id             // 获取项目详情
PUT    /api/collaboration/projects/:id             // 更新项目
DELETE /api/collaboration/projects/:id             // 删除项目
```

---

### 3.4 文档知识中心模块

#### 3.4.1 模块定位
提供企业文档管理和知识沉淀能力，支持文档上传下载、版本控制、在线预览、知识库管理和文件共享功能。

#### 3.4.2 功能架构

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          文档知识中心                                    │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                      文档管理                                     │   │
│  │  ┌─────────────┐ ┌─────────────────────────────────────────┐   │   │
│  │  │  📁 文件夹  │ │  📄 文件列表                            │   │   │
│  │  │             │ │                                         │   │   │
│  │  │ 📂 全部文件 │ │  ☑️ 名称          大小    时间    操作  │   │   │
│  │  │ 📂 我的文档 │ │  ─────────────────────────────────────  │   │   │
│  │  │ 📂 团队共享 │ │  📄 项目计划.docx  2.5MB  今天    [↓][✎]│   │   │
│  │  │ 📂 审批附件 │ │  📊 财务报表.xlsx  1.8MB  昨天    [↓][✎]│   │   │
│  │  │ 📂 知识库   │ │  📑 会议纪要.pdf   500KB  03-15   [↓][✎]│   │   │
│  │  │             │ │  📷 活动照片.jpg   3.2MB  03-10   [↓][✎]│   │   │
│  │  └─────────────┘ └─────────────────────────────────────────┘   │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                      知识库                                       │   │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐           │   │
│  │  │ 🔧 技术  │ │ 📋 产品  │ │ 🎨 设计  │ │ 📊 运营  │           │   │
│  │  │   12篇   │ │   8篇    │ │   5篇    │ │   15篇   │           │   │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘           │   │
│  │  ┌─────────────────────────────────────────────────────────┐   │   │
│  │  │ 📄 文章标题                        作者    时间    👁️ ❤️ │   │   │
│  │  │ ─────────────────────────────────────────────────────── │   │   │
│  │  │ Vue3 项目开发规范                   张三    03-15   128 45│   │   │
│  │  │ RESTful API 设计指南                李四    03-14   256 89│   │   │
│  │  │ 数据库性能优化总结                  王五    03-12   189 67│   │   │
│  │  └─────────────────────────────────────────────────────────┘   │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                      文件共享                                     │   │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐              │   │
│  │  │ 🔗 链接 │ │ 👥 成员 │ │ 🔐 权限 │ │ 📊 统计 │              │   │
│  │  │ 分享    │ │ 管理    │ │ 设置    │ │ 查看    │              │   │
│  │  └─────────┘ └─────────┘ └─────────┘ └─────────┘              │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

#### 3.4.3 核心功能点

| 功能点 | 功能描述 | 优先级 | 数据交互 |
|--------|----------|--------|----------|
| **文档上传** | 支持多文件上传，显示上传进度 | P0 | 文件存储到本地/OSS |
| **文档下载** | 支持单文件和批量下载 | P0 | 从存储服务获取文件 |
| **文档预览** | 支持常见格式在线预览 | P1 | 调用预览服务或转换PDF |
| **文件夹管理** | 创建、重命名、移动、删除文件夹 | P0 | 文件夹表的增删改查 |
| **文档分类** | 按文件夹和标签分类管理 | P1 | 分类关联查询 |
| **版本控制** | 文档多版本管理和回滚 | P2 | 版本链存储 |
| **知识库分类** | 知识库文章分类管理 | P1 | 分类表的增删改查 |
| **知识库文章** | 文章创建、编辑、发布 | P1 | 文章表的增删改查 |
| **文章搜索** | 全文搜索和标签筛选 | P1 | ES或数据库模糊查询 |
| **文件共享** | 生成分享链接，设置访问权限 | P1 | 分享记录表管理 |

#### 3.4.4 数据模型

```sql
-- 文档表
CREATE TABLE collaboration_documents (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(255) NOT NULL COMMENT '文档名称',
  original_name VARCHAR(255) COMMENT '原始文件名',
  type VARCHAR(50) COMMENT '文档类型',
  extension VARCHAR(20) COMMENT '文件扩展名',
  size BIGINT COMMENT '文件大小(字节)',
  
  -- 存储信息
  storage_type ENUM('local', 'oss', 'minio') DEFAULT 'local' COMMENT '存储类型',
  storage_path VARCHAR(500) COMMENT '存储路径',
  url VARCHAR(500) COMMENT '访问URL',
  
  -- 文件夹
  folder_id INT DEFAULT 0 COMMENT '所属文件夹ID(0为根目录)',
  
  -- 创建人信息
  creator_id VARCHAR(255) COMMENT '创建人ID',
  creator_name VARCHAR(255) COMMENT '创建人名称',
  
  -- 权限
  visibility ENUM('private', 'team', 'public') DEFAULT 'private' COMMENT '可见性',
  allowed_users JSON COMMENT '允许访问的用户ID列表',
  
  -- 版本
  version INT DEFAULT 1 COMMENT '版本号',
  parent_id INT COMMENT '父文档ID（版本链）',
  
  -- 分类
  category_id INT COMMENT '分类ID',
  tags JSON COMMENT '标签',
  
  -- 统计
  download_count INT DEFAULT 0 COMMENT '下载次数',
  view_count INT DEFAULT 0 COMMENT '查看次数',
  
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) COMMENT='协作文档表';

-- 文件夹表
CREATE TABLE document_folders (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL COMMENT '文件夹名称',
  parent_id INT DEFAULT 0 COMMENT '父文件夹ID(0为根目录)',
  path VARCHAR(500) COMMENT '完整路径',
  
  -- 创建人
  creator_id VARCHAR(255) COMMENT '创建人ID',
  creator_name VARCHAR(255) COMMENT '创建人名称',
  
  -- 权限
  visibility ENUM('private', 'team', 'public') DEFAULT 'private' COMMENT '可见性',
  
  sort_order INT DEFAULT 0 COMMENT '排序',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) COMMENT='文档文件夹表';

-- 知识库文章表
CREATE TABLE knowledge_articles (
  id INT PRIMARY KEY AUTO_INCREMENT,
  title VARCHAR(255) NOT NULL COMMENT '文章标题',
  content LONGTEXT COMMENT '文章内容(Markdown)',
  summary TEXT COMMENT '摘要',
  cover VARCHAR(500) COMMENT '封面图',
  
  -- 作者信息
  author_id VARCHAR(255) COMMENT '作者ID',
  author_name VARCHAR(255) COMMENT '作者名称',
  
  -- 分类和标签
  category_id INT COMMENT '分类ID',
  tags JSON COMMENT '标签',
  
  -- 状态
  status ENUM('draft', 'published', 'archived') DEFAULT 'draft' COMMENT '状态',
  
  -- 统计
  view_count INT DEFAULT 0 COMMENT '浏览次数',
  like_count INT DEFAULT 0 COMMENT '点赞数',
  comment_count INT DEFAULT 0 COMMENT '评论数',
  
  published_at DATETIME COMMENT '发布时间',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) COMMENT='知识库文章表';

-- 知识库分类表
CREATE TABLE knowledge_categories (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL COMMENT '分类名称',
  description TEXT COMMENT '分类描述',
  icon VARCHAR(50) COMMENT '图标',
  parent_id INT DEFAULT 0 COMMENT '父分类ID',
  sort_order INT DEFAULT 0 COMMENT '排序',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) COMMENT='知识库分类表';

-- 文件分享表
CREATE TABLE document_shares (
  id INT PRIMARY KEY AUTO_INCREMENT,
  document_id INT NOT NULL COMMENT '文档ID',
  share_code VARCHAR(50) COMMENT '分享码',
  share_type ENUM('link', 'password') DEFAULT 'link' COMMENT '分享类型',
  share_password VARCHAR(20) COMMENT '分享密码',
  
  -- 权限
  permission ENUM('view', 'download') DEFAULT 'view' COMMENT '权限',
  expire_time DATETIME COMMENT '过期时间',
  access_count INT DEFAULT 0 COMMENT '访问次数',
  max_access_count INT COMMENT '最大访问次数',
  
  -- 创建人
  creator_id VARCHAR(255) COMMENT '创建人ID',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (document_id) REFERENCES collaboration_documents(id) ON DELETE CASCADE
) COMMENT='文件分享表';
```

#### 3.4.5 API接口

```javascript
// 文档管理接口
GET    /api/collaboration/documents                // 获取文档列表
POST   /api/collaboration/documents/upload         // 上传文档
GET    /api/collaboration/documents/:id            // 获取文档详情
PUT    /api/collaboration/documents/:id            // 更新文档
DELETE /api/collaboration/documents/:id            // 删除文档
GET    /api/collaboration/documents/:id/download   // 下载文档
GET    /api/collaboration/documents/:id/preview    // 预览文档

// 文件夹接口
GET    /api/collaboration/folders                  // 获取文件夹列表
POST   /api/collaboration/folders                  // 创建文件夹
PUT    /api/collaboration/folders/:id              // 更新文件夹
DELETE /api/collaboration/folders/:id              // 删除文件夹

// 知识库接口
GET    /api/collaboration/knowledge                // 获取文章列表
POST   /api/collaboration/knowledge                // 创建文章
GET    /api/collaboration/knowledge/:id            // 获取文章详情
PUT    /api/collaboration/knowledge/:id            // 更新文章
DELETE /api/collaboration/knowledge/:id            // 删除文章
POST   /api/collaboration/knowledge/:id/like       // 点赞文章
GET    /api/collaboration/knowledge/search         // 搜索知识库

// 文件分享接口
POST   /api/collaboration/documents/:id/share      // 创建分享
GET    /api/collaboration/shares/:code             // 通过分享码获取文件
DELETE /api/collaboration/shares/:id               // 取消分享
```

---

### 3.5 数据分析中心模块

#### 3.5.1 模块定位
提供审批数据的可视化分析和效率监控能力，帮助企业管理者了解审批流程运行状况，发现瓶颈并优化流程。

#### 3.5.2 功能架构

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          数据分析中心                                    │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                      审批统计                                     │   │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐│   │
│  │  │  本月申请   │ │  本月通过   │ │  平均耗时   │ │  通过率     ││   │
│  │  │   156     │ │   142     │ │   2.3天   │ │   91%     ││   │
│  │  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘│   │
│  │  ┌─────────────────────────────────────────────────────────┐   │   │
│  │  │  📊 申请趋势图（近30天）                                 │   │   │
│  │  │    ████████████████████████████████████████████████     │   │   │
│  │  │    申请数: ████████████████████ 通过数: ████████████    │   │   │
│  │  └─────────────────────────────────────────────────────────┘   │   │
│  │  ┌─────────────────────┐ ┌─────────────────────┐              │   │
│  │  │  📊 类型分布        │ │  📊 部门分布        │              │   │
│  │  │  请假 ████████ 45%  │ │  技术 ████████ 35%  │              │   │
│  │  │  报销 ██████   30%  │ │  销售 ██████   28%  │              │   │
│  │  │  会议 ████     15%  │ │  人事 ████     18%  │              │   │
│  │  │  其他 ██       10%  │ │  财务 ███      12%  │              │   │
│  │  └─────────────────────┘ └─────────────────────┘              │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                      效率分析                                     │   │
│  │  ┌─────────────────────────────────────────────────────────┐   │   │
│  │  │  排名  审批人     审批数   平均耗时   及时率   满意度   │   │   │
│  │  │  ─────────────────────────────────────────────────────  │   │   │
│  │  │   1    张经理      45       1.2天      98%      4.9    │   │   │
│  │  │   2    李主管      38       1.5天      95%      4.8    │   │   │
│  │  │   3    王经理      32       1.8天      92%      4.7    │   │   │
│  │  └─────────────────────────────────────────────────────────┘   │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                      流程监控                                     │   │
│  │  ┌─────────────────────────────────────────────────────────┐   │   │
│  │  │  ⚠️ 异常预警                                             │   │   │
│  │  │  • 有 3 条审批已超时 3 天未处理                          │   │   │
│  │  │  • 有 2 条审批被多次驳回                                 │   │   │
│  │  │  • 报销流程平均耗时超过阈值                              │   │   │
│  │  └─────────────────────────────────────────────────────────┘   │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

#### 3.5.3 核心功能点

| 功能点 | 功能描述 | 优先级 | 数据交互 |
|--------|----------|--------|----------|
| **审批概览** | 展示关键指标：申请数、通过率、平均耗时 | P0 | 聚合统计审批实例表 |
| **趋势分析** | 按时间维度展示申请和审批趋势 | P0 | 按日期分组统计 |
| **类型分布** | 各审批类型的占比分析 | P1 | 按流程类型分组统计 |
| **部门分布** | 各部门的审批数据分析 | P1 | 按部门分组统计 |
| **审批人效率** | 审批人的处理效率排行 | P1 | 按审批人统计耗时和及时率 |
| **流程耗时分析** | 各流程节点的平均耗时 | P2 | 分析审批历史记录 |
| **异常预警** | 超时、堆积、异常流程预警 | P2 | 定时扫描审批实例 |
| **数据导出** | 支持报表数据导出 | P1 | 生成Excel/PDF报表 |

#### 3.5.4 数据模型

```sql
-- 审批统计视图（基于已有表创建视图）
-- 1. 审批概览统计：从 approval_instances 表按状态统计
-- 2. 趋势分析：从 approval_instances 表按日期分组统计
-- 3. 类型分布：从 approval_instances 表按 flow_code 分组统计
-- 4. 审批人效率：从 approval_history 表按 operator_id 统计

-- 预警规则表
CREATE TABLE alert_rules (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100) COMMENT '规则名称',
  rule_type ENUM('timeout', 'backlog', 'efficiency') COMMENT '规则类型',
  condition_config JSON COMMENT '条件配置',
  notify_users JSON COMMENT '通知用户列表',
  is_enabled TINYINT DEFAULT 1 COMMENT '是否启用',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) COMMENT='预警规则表';

-- 预警记录表
CREATE TABLE alert_records (
  id INT PRIMARY KEY AUTO_INCREMENT,
  rule_id INT COMMENT '规则ID',
  alert_type VARCHAR(50) COMMENT '预警类型',
  alert_content TEXT COMMENT '预警内容',
  related_data JSON COMMENT '相关数据',
  is_resolved TINYINT DEFAULT 0 COMMENT '是否已处理',
  resolved_at DATETIME COMMENT '处理时间',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) COMMENT='预警记录表';

-- 统计报表配置表
CREATE TABLE report_templates (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100) COMMENT '报表名称',
  report_type VARCHAR(50) COMMENT '报表类型',
  config JSON COMMENT '报表配置',
  creator_id VARCHAR(255) COMMENT '创建人ID',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) COMMENT='报表模板表';
```

#### 3.5.5 API接口

```javascript
// 审批统计接口
GET    /api/collaboration/analytics/overview       // 获取审批概览
GET    /api/collaboration/analytics/trend          // 获取趋势分析
GET    /api/collaboration/analytics/by-type        // 获取类型分布
GET    /api/collaboration/analytics/by-dept        // 获取部门分布
GET    /api/collaboration/analytics/efficiency     // 获取审批人效率排行
GET    /api/collaboration/analytics/duration       // 获取流程耗时分析

// 流程监控接口
GET    /api/collaboration/analytics/alerts         // 获取异常预警列表
PUT    /api/collaboration/analytics/alerts/:id/resolve // 处理预警

// 报表接口
GET    /api/collaboration/analytics/reports        // 获取报表列表
POST   /api/collaboration/analytics/reports        // 创建报表
GET    /api/collaboration/analytics/reports/:id/export // 导出报表
```

---

## 四、页面结构设计

### 4.1 页面路由规划

```
/collaboration                    # 协同管理首页（我的工作台）
/collaboration/approval           # 流程审批中心
/collaboration/approval/leave     # 请假申请
/collaboration/approval/expense   # 报销申请
/collaboration/approval/meeting   # 会议申请
/collaboration/approval/supplies  # 办公用品
/collaboration/approval/custom    # 自定义流程
/collaboration/task               # 任务协同中心
/collaboration/task/board         # 任务看板
/collaboration/task/list          # 任务列表
/collaboration/task/calendar      # 日程安排
/collaboration/task/gantt         # 甘特图
/collaboration/document           # 文档知识中心
/collaboration/document/files     # 文档管理
/collaboration/document/knowledge # 知识库
/collaboration/analytics          # 数据分析中心
/collaboration/analytics/overview # 审批统计
/collaboration/analytics/efficiency # 效率分析
/collaboration/analytics/monitor  # 流程监控
```

### 4.2 主导航菜单

```
┌─────────────────────────────────────────────────────────────┐
│  🏠 首页    🔧 系统管理    👤 个人中心    🚪 退出          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                                                     │   │
│  │  📊 我的工作台                                      │   │
│  │     ├─ 待办事项                                     │   │
│  │     ├─ 我的申请                                     │   │
│  │     ├─ 我的任务                                     │   │
│  │     ├─ 我的文档                                     │   │
│  │     └─ 消息通知                                     │   │
│  │                                                     │   │
│  │  📝 流程审批中心                                    │   │
│  │     ├─ 📝 请假申请                                  │   │
│  │     ├─ 💰 报销申请                                  │   │
│  │     ├─ 📅 会议申请                                  │   │
│  │     ├─ 📦 办公用品                                  │   │
│  │     └─ ⚙️ 流程配置（管理员）                        │   │
│  │                                                     │   │
│  │  ✅ 任务协同中心                                    │   │
│  │     ├─ 📋 任务看板                                  │   │
│  │     ├─ 📄 任务列表                                  │   │
│  │     ├─ 📅 日程安排                                  │   │
│  │     └─ 📊 甘特图                                    │   │
│  │                                                     │   │
│  │  📁 文档知识中心                                    │   │
│  │     ├─ 📁 文档管理                                  │   │
│  │     └─ 🔍 知识库                                    │   │
│  │                                                     │   │
│  │  📈 数据分析中心                                    │   │
│  │     ├─ 📊 审批统计                                  │   │
│  │     ├─ 📈 效率分析                                  │   │
│  │     └─ 👁️ 流程监控                                  │   │
│  │                                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 五、数据库设计汇总

### 5.1 核心数据表清单

| 表名 | 说明 | 所属模块 |
|------|------|----------|
| approval_flows | 审批流程定义表 | 流程审批中心 |
| approval_instances | 审批实例表 | 流程审批中心 |
| approval_history | 审批历史记录表 | 流程审批中心 |
| approval_cc | 抄送记录表 | 流程审批中心 |
| collaboration_tasks | 协同任务表 | 任务协同中心 |
| task_comments | 任务评论表 | 任务协同中心 |
| task_logs | 任务操作日志表 | 任务协同中心 |
| collaboration_projects | 协同项目表 | 任务协同中心 |
| collaboration_documents | 协作文档表 | 文档知识中心 |
| document_folders | 文档文件夹表 | 文档知识中心 |
| knowledge_articles | 知识库文章表 | 文档知识中心 |
| knowledge_categories | 知识库分类表 | 文档知识中心 |
| document_shares | 文件分享表 | 文档知识中心 |
| user_notifications | 用户消息通知表 | 我的工作台 |
| alert_rules | 预警规则表 | 数据分析中心 |
| alert_records | 预警记录表 | 数据分析中心 |

---

## 六、实施计划

### 6.1 阶段划分

| 阶段 | 内容 | 工期 | 优先级 |
|------|------|------|--------|
| **第一阶段** | 基础框架搭建 | 1周 | P0 |
| | - 创建协同管理模块框架 | | |
| | - 设计数据库表结构 | | |
| | - 配置路由和菜单 | | |
| **第二阶段** | 流程审批迁移 | 1周 | P0 |
| | - 迁移原有OA办公功能 | | |
| | - 整合请假、报销、会议 | | |
| | - 优化审批流程界面 | | |
| **第三阶段** | 任务协同开发 | 1周 | P1 |
| | - 任务看板功能 | | |
| | - 任务CRUD操作 | | |
| | - 任务拖拽排序 | | |
| **第四阶段** | 文档中心开发 | 1周 | P1 |
| | - 文档上传下载 | | |
| | - 文档分类管理 | | |
| | - 知识库基础功能 | | |
| **第五阶段** | 数据分析开发 | 1周 | P2 |
| | - 审批统计报表 | | |
| | - 数据可视化 | | |
| | - 流程监控功能 | | |

### 6.2 迁移计划

```
原有OA办公模块 → 协同管理模块

OAOfficeView.vue          → CollaborationHomeView.vue (我的工作台)
OAWorkflowView.vue        → ApprovalCenterView.vue (流程审批中心)
                           ├─ LeaveApprovalView.vue (请假申请)
                           ├─ ExpenseApprovalView.vue (报销申请)
                           └─ MeetingApprovalView.vue (会议申请)

新增功能：
├── TaskCenterView.vue    (任务协同中心)
├── DocumentCenterView.vue (文档知识中心)
└── AnalyticsCenterView.vue (数据分析中心)
```

---

## 七、总结

"协同管理"模块在原有OA办公功能基础上，进行了以下升级：

1. **功能扩展**：新增任务协同、文档中心、数据分析等功能
2. **体验优化**：统一的工作台入口，快捷操作，数据可视化
3. **流程增强**：支持灵活配置，可视化流程设计器
4. **协同能力**：任务看板、团队协作、文档共享
5. **数据驱动**：审批统计、效率分析、流程监控

**文档版本**: v2.0.0  
**最后更新**: 2026-03-17
