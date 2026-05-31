# 企业管理系统设计说明

## 一、系统概述

### 1.1 系统名称
企业管理系统（Enterprise Management System）

### 1.2 开发背景
本系统旨在为企业提供一站式的信息化管理平台，涵盖OA办公、项目管理、员工管理、文件存储等多个业务模块，实现企业内部流程的数字化和自动化。

### 1.3 技术架构
- **前端技术栈**：Vue 3 + TypeScript + Element Plus + Vite
- **后端技术栈**：Node.js + Express + MySQL
- **实时通信**：Socket.io（WebSocket）
- **开发环境**：VS Code + PowerShell

---

## 二、系统功能模块

### 2.1 用户认证模块

#### 2.1.1 功能描述
- 用户登录验证
- 用户信息存储（localStorage）
- 角色管理（admin/employee）

#### 2.1.2 数据库设计
**users表**
| 字段名 | 类型 | 说明 |
|--------|------|------|
| id | INT | 主键，自增 |
| username | VARCHAR(255) | 用户名 |
| password | VARCHAR(255) | 密码 |
| createdAt | DATETIME | 创建时间 |

#### 2.1.3 登录流程
1. 用户输入用户名和密码
2. 前端调用 `/api/login` 接口
3. 后端验证用户名和密码
4. 验证成功后返回用户信息
5. 前端存储用户数据到 localStorage
6. 建立 WebSocket 连接

---

### 2.2 成交项目区划模块

#### 2.2.1 功能描述
实现全国省-市-旗县三级行政区划管理，支持：
- 省份列表展示（带项目数量统计）
- 城市列表展示（带项目数量统计）
- 旗县列表展示（带项目数量统计）
- 项目列表展示
- 省份增删管理
- 城市增删管理

#### 2.2.2 数据库设计

**provinces表（省份）**
| 字段名 | 类型 | 说明 |
|--------|------|------|
| id | INT | 主键，自增 |
| name | VARCHAR(255) | 省份名称 |
| code | VARCHAR(50) | 省份代码 |
| createdAt | DATETIME | 创建时间 |

**cities表（城市）**
| 字段名 | 类型 | 说明 |
|--------|------|------|
| id | INT | 主键，自增 |
| name | VARCHAR(255) | 城市名称 |
| code | VARCHAR(50) | 城市代码 |
| provinceId | INT | 所属省份ID（外键）|
| createdAt | DATETIME | 创建时间 |

**counties表（旗县）**
| 字段名 | 类型 | 说明 |
|--------|------|------|
| id | INT | 主键，自增 |
| name | VARCHAR(255) | 旗县名称 |
| code | VARCHAR(50) | 旗县代码 |
| cityId | INT | 所属城市ID（外键）|
| createdAt | DATETIME | 创建时间 |

**closing_projects表（成交项目）**
| 字段名 | 类型 | 说明 |
|--------|------|------|
| id | INT | 主键，自增 |
| name | VARCHAR(255) | 项目名称 |
| description | TEXT | 项目描述 |
| status | VARCHAR(255) | 项目状态 |
| startDate | DATE | 开始日期 |
| dealTime | DATE | 成交时间 |
| price | DECIMAL(10,2) | 成交金额 |
| serviceEndTime | DATE | 服务结束时间 |
| nextYearFeeStatus | VARCHAR(255) | 次年费用状态 |
| provinceId | INT | 所属省份ID（外键）|
| cityId | INT | 所属城市ID（外键）|
| countyId | INT | 所属旗县ID（外键）|
| createdAt | DATETIME | 创建时间 |

#### 2.2.3 API接口设计

**省份相关**
- `GET /api/provinces` - 获取所有省份（带项目数量统计）
- `GET /api/provinces/:id` - 获取省份详情
- `POST /api/provinces` - 创建省份

**城市相关**
- `GET /api/provinces/:provinceId/cities` - 获取省份下的城市
- `GET /api/cities/:id` - 获取城市详情
- `POST /api/cities` - 创建城市
- `DELETE /api/cities/:id` - 删除城市（级联删除旗下旗县和项目）

**旗县相关**
- `GET /api/cities/:cityId/counties` - 获取城市下的旗县
- `GET /api/counties/:id` - 获取旗县详情
- `POST /api/counties` - 创建旗县

**项目相关**
- `GET /api/counties/:countyId/projects` - 获取旗县下的项目列表
- `GET /api/closing-projects` - 获取所有成交项目
- `GET /api/closing-projects/:id` - 获取项目详情
- `POST /api/closing-projects` - 创建项目
- `PUT /api/closing-projects/:id` - 更新项目
- `DELETE /api/closing-projects/:id` - 删除项目

#### 2.2.4 页面交互设计

**全国页面（第0级）**
- 面包屑：全国
- 标题：全国成交项目区划
- 操作：添加省份按钮
- 内容：省份卡片网格，显示省份名称和项目数量

**省份页面（第1级）**
- 面包屑：全国 > 省份名称
- 标题：省份名称 - 市级分类
- 操作：添加城市按钮
- 内容：城市卡片网格，每张卡片右上角有删除按钮

**城市页面（第2级）**
- 面包屑：全国 > 省份名称 > 城市名称
- 标题：城市名称 - 旗县分类
- 内容：旗县卡片网格

**旗县页面（第3级）**
- 面包屑：全国 > 省份名称 > 城市名称 > 旗县名称
- 标题：旗县名称 - 项目列表
- 内容：项目列表，显示项目详情

---

### 2.3 OA工作流模块

#### 2.3.1 功能描述
- 请假申请管理
- 报销申请管理
- 会议管理
- 办公用品申请
- 审批流程管理

#### 2.3.2 数据库设计

**leave_applications表（请假申请）**
| 字段名 | 类型 | 说明 |
|--------|------|------|
| id | INT | 主键，自增 |
| applicant | VARCHAR(255) | 申请人 |
| leaveType | VARCHAR(255) | 请假类型 |
| startDate | DATE | 开始日期 |
| endDate | DATE | 结束日期 |
| days | INT | 请假天数 |
| reason | TEXT | 请假原因 |
| approver | VARCHAR(255) | 审批人 |
| status | VARCHAR(255) | 状态 |
| createdAt | DATETIME | 创建时间 |

---

### 2.4 员工管理模块

#### 2.4.1 功能描述
- 员工信息管理
- 员工增删改查
- 员工与系统用户关联

#### 2.4.2 数据库设计

**employees表（员工）**
| 字段名 | 类型 | 说明 |
|--------|------|------|
| id | INT | 主键，自增 |
| name | VARCHAR(255) | 姓名 |
| department | VARCHAR(255) | 部门 |
| position | VARCHAR(255) | 职位 |
| email | VARCHAR(255) | 邮箱 |
| phone | VARCHAR(255) | 电话 |
| entryDate | DATE | 入职日期 |
| createdAt | DATETIME | 创建时间 |

---

### 2.5 员工交流模块

#### 2.5.1 功能描述
- 实时在线聊天
- 公共聊天室
- 私聊功能
- 在线用户列表

#### 2.5.2 技术实现
- 使用 Socket.io 实现实时通信
- 支持多用户同时在线
- 消息持久化存储

#### 2.5.3 数据库设计

**chat_messages表（聊天记录）**
| 字段名 | 类型 | 说明 |
|--------|------|------|
| id | INT | 主键，自增 |
| sender | VARCHAR(255) | 发送者 |
| receiver | VARCHAR(255) | 接收者（公共聊天为NULL）|
| content | TEXT | 消息内容 |
| type | VARCHAR(50) | 消息类型 |
| createdAt | DATETIME | 创建时间 |

---

### 2.6 文件存储模块

#### 2.6.1 功能描述
- 文件上传下载
- 文件分类管理
- 文件预览

#### 2.6.2 数据库设计

**files表（文件）**
| 字段名 | 类型 | 说明 |
|--------|------|------|
| id | INT | 主键，自增 |
| name | VARCHAR(255) | 文件名 |
| originalName | VARCHAR(255) | 原始文件名 |
| path | VARCHAR(500) | 存储路径 |
| size | BIGINT | 文件大小 |
| type | VARCHAR(100) | 文件类型 |
| category | VARCHAR(100) | 文件分类 |
| uploadedBy | VARCHAR(255) | 上传者 |
| createdAt | DATETIME | 创建时间 |

---

### 2.7 销售漏斗模块

#### 2.7.1 功能描述
- 销售阶段管理
- 客户跟踪
- 销售数据分析

#### 2.7.2 数据库设计

**sales_funnel表（销售漏斗）**
| 字段名 | 类型 | 说明 |
|--------|------|------|
| id | INT | 主键，自增 |
| customerName | VARCHAR(255) | 客户名称 |
| contactInfo | VARCHAR(255) | 联系方式 |
| stage | VARCHAR(100) | 销售阶段 |
| expectedAmount | DECIMAL(10,2) | 预计金额 |
| expectedDate | DATE | 预计成交日期 |
| notes | TEXT | 备注 |
| createdAt | DATETIME | 创建时间 |

---

### 2.8 月报模块

#### 2.8.1 功能描述
- 月报提交
- 月报审批
- 历史月报查询

---

### 2.9 工具入库模块

#### 2.9.1 功能描述
- 工具登记
- 工具借用归还
- 库存管理

---

## 三、系统架构设计

### 3.1 整体架构
```
┌─────────────────────────────────────────────────────────────┐
│                        前端层 (Vue 3)                        │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐           │
│  │ 登录模块 │ │成交项目 │ │ OA办公  │ │员工管理 │           │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘           │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐           │
│  │员工交流 │ │文件存储 │ │销售漏斗 │ │  月报   │           │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘           │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼ HTTP/WebSocket
┌─────────────────────────────────────────────────────────────┐
│                      后端层 (Node.js)                        │
│  ┌──────────────────────────────────────────────────────┐  │
│  │                    Express Server                     │  │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐    │  │
│  │  │ API路由 │ │Socket.io│ │文件服务 │ │ 中间件  │    │  │
│  │  └─────────┘ └─────────┘ └─────────┘ └─────────┘    │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼ SQL
┌─────────────────────────────────────────────────────────────┐
│                      数据层 (MySQL)                          │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐           │
│  │  users  │ │provinces│ │ cities  │ │counties │           │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘           │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐           │
│  │employees│ │projects │ │messages │ │  files  │           │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘           │
└─────────────────────────────────────────────────────────────┘
```

### 3.2 前端架构

#### 3.2.1 项目结构
```
src/
├── views/              # 页面视图组件
│   ├── HomeView.vue           # 首页
│   ├── LoginView.vue          # 登录页
│   ├── ProjectClassificationView.vue  # 成交项目区划
│   ├── OAWorkflowView.vue     # OA工作流
│   ├── EmployeeManagementView.vue     # 员工管理
│   ├── EmployeeChatView.vue   # 员工交流
│   ├── FileStorageView.vue    # 文件存储
│   ├── SalesFunnelView.vue    # 销售漏斗
│   └── ...
├── components/         # 公共组件
├── services/           # API服务
│   └── api.ts
├── router/             # 路由配置
│   └── index.ts
├── App.vue             # 根组件
└── main.ts             # 入口文件
```

#### 3.2.2 路由设计
| 路径 | 组件 | 说明 |
|------|------|------|
| / | HomeView | 首页 |
| /login | LoginView | 登录页 |
| /closing-project | ProjectClassificationView | 成交项目区划 |
| /oa-workflow | OAWorkflowView | OA工作流 |
| /employee-management | EmployeeManagementView | 员工管理 |
| /employee-chat | EmployeeChatView | 员工交流 |
| /file-storage | FileStorageView | 文件存储 |
| /sales-funnel | SalesFunnelView | 销售漏斗 |
| /monthly-report | MonthlyReportView | 月报 |
| /tool-inventory | ToolInventoryView | 工具入库 |

### 3.3 后端架构

#### 3.3.1 项目结构
```
├── server.js           # 主服务器文件
├── uploads/            # 上传文件目录
└── package.json
```

#### 3.3.2 API设计规范
- RESTful API 设计
- 统一返回格式：`{ success: boolean, data?: any, message?: string }`
- HTTP 状态码规范使用

---

## 四、数据库设计

### 4.1 ER图
```
┌─────────────┐       ┌─────────────┐       ┌─────────────┐
│  provinces  │       │   cities    │       │  counties   │
├─────────────┤       ├─────────────┤       ├─────────────┤
│ id (PK)     │◄──────│ id (PK)     │◄──────│ id (PK)     │
│ name        │       │ provinceId  │       │ cityId      │
│ code        │       │ name        │       │ name        │
└─────────────┘       │ code        │       │ code        │
                      └─────────────┘       └──────┬──────┘
                                                   │
                                                   ▼
                                            ┌─────────────┐
                                            │   projects  │
                                            ├─────────────┤
                                            │ id (PK)     │
                                            │ countyId    │
                                            │ cityId      │
                                            │ provinceId  │
                                            │ name        │
                                            │ ...         │
                                            └─────────────┘
```

### 4.2 外键关系
- `cities.provinceId` → `provinces.id`
- `counties.cityId` → `cities.id`
- `closing_projects.provinceId` → `provinces.id`
- `closing_projects.cityId` → `cities.id`
- `closing_projects.countyId` → `counties.id`

---

## 五、界面设计

### 5.1 设计原则
- 简洁现代的UI风格
- 统一的配色方案（蓝色主题 #6495ED）
- 卡片式布局
- 响应式设计
- 流畅的动画效果

### 5.2 配色方案
| 用途 | 颜色值 | 说明 |
|------|--------|------|
| 主色调 | #6495ED | 蓝色，用于按钮、链接 |
| 成功色 | #4CAF50 | 绿色，用于添加按钮 |
| 警告色 | #FFC107 | 黄色，用于进行中状态 |
| 危险色 | #F44336 | 红色，用于删除按钮 |
| 背景色 | #E4EDF2 | 浅蓝灰色 |
| 卡片背景 | rgba(255,255,255,0.8) | 半透明白色 |

### 5.3 布局规范
- 顶部导航栏：高度60px，固定定位
- 主内容区：最大宽度1200px，居中显示
- 卡片网格：自适应列数，最小宽度280px
- 间距：统一使用rem单位，基础间距1rem

---

## 六、安全设计

### 6.1 认证机制
- 基于Token的认证（模拟实现）
- 用户信息存储在localStorage
- 角色权限控制

### 6.2 数据安全
- SQL注入防护（使用参数化查询）
- XSS防护
- 文件上传类型限制

### 6.3 传输安全
- 开发环境使用HTTP
- 生产环境建议使用HTTPS

---

## 七、部署说明

### 7.1 环境要求
- Node.js 14+
- MySQL 8.0+
- 现代浏览器（Chrome/Firefox/Edge）

### 7.2 安装步骤
1. 克隆项目代码
2. 安装依赖：`npm install`
3. 配置数据库连接（server.js中修改）
4. 启动后端：`node server.js`
5. 启动前端：`npm run dev`

### 7.3 访问地址
- 前端：http://localhost:3003
- 后端：http://localhost:3002

---

## 八、开发规范

### 8.1 代码规范
- 使用ESLint进行代码检查
- 使用TypeScript进行类型检查
- 组件命名使用PascalCase
- 变量命名使用camelCase

### 8.2 Git规范
- 分支管理：main/dev/feature
- 提交信息：英文描述，简洁明了

### 8.3 注释规范
- 公共函数必须添加JSDoc注释
- 复杂逻辑添加行内注释
- 组件说明添加在文件头部

---

## 九、未来规划

### 9.1 功能扩展
- [ ] 权限管理模块（已删除，可根据需求重新添加）
- [ ] 数据统计报表
- [ ] 移动端适配
- [ ] 多语言支持
- [ ] 系统消息通知

### 9.2 性能优化
- [ ] 前端路由懒加载
- [ ] 数据库索引优化
- [ ] 图片资源压缩
- [ ] CDN加速

### 9.3 安全增强
- [ ] JWT认证
- [ ] 接口限流
- [ ] 操作日志记录
- [ ] 数据备份机制

---

## 十、附录

### 10.1 默认账号
| 用户名 | 密码 | 角色 |
|--------|------|------|
| 管理员 | 123456 | admin |
| 陈东 | 123456 | admin |
| 潘伟 | 123456 | admin |

### 10.2 联系方式
- 开发团队：宏友软件
- 系统版本：v1.0.0
- 最后更新：2026-03-14

---

**文档结束**
