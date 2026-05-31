# 员工聊天功能模块设计说明

## 一、模块概述

### 1.1 功能定位
员工聊天模块是企业管理系统中的即时通讯子系统，为企业内部员工提供实时在线交流平台，支持公共聊天室和在线状态显示功能。

### 1.2 设计目标
- 实现企业内部员工的实时在线沟通
- 提供稳定、低延迟的消息传输服务
- 支持在线状态实时显示
- 确保消息持久化存储
- 提供友好的用户交互界面

### 1.3 技术架构
- **前端技术栈**：Vue 3 + TypeScript + Element Plus + Socket.io-client
- **后端技术栈**：Node.js + Express + Socket.io
- **数据存储**：MySQL + localStorage（本地缓存）
- **通信协议**：WebSocket（Socket.io）

---

## 二、功能设计

### 2.1 核心功能

#### 2.1.1 公共聊天室
- 所有登录用户自动加入公共聊天室
- 支持文字消息实时发送和接收
- 显示在线用户数量
- 消息历史记录持久化存储

#### 2.1.2 消息管理
- 消息发送（支持文本消息）
- 消息接收与实时推送
- 消息状态追踪（已发送、已送达、已读）
- 消息本地缓存与持久化

#### 2.1.3 在线状态
- 实时显示在线用户数量
- 用户在线/离线状态检测
- 多设备登录管理

### 2.2 扩展功能（预留）
- 私聊功能（单对单聊天）
- 群聊功能（多人群组聊天）
- 文件传输（图片、文档等）
- 消息撤回
- 消息搜索
- 未读消息提醒

---

## 三、数据库设计

### 3.1 数据表结构

#### 3.1.1 聊天室表（chats）
| 字段名 | 类型 | 说明 |
|--------|------|------|
| id | BIGINT | 主键，自增 |
| name | VARCHAR(255) | 聊天室名称 |
| lastMessage | TEXT | 最后一条消息内容 |
| time | VARCHAR(50) | 最后消息时间 |
| createdAt | DATETIME | 创建时间 |

#### 3.1.2 消息表（messages）
| 字段名 | 类型 | 说明 |
|--------|------|------|
| id | BIGINT | 主键，自增 |
| chatId | BIGINT | 所属聊天室ID（外键）|
| senderId | VARCHAR(255) | 发送者ID（用户名）|
| text | TEXT | 消息内容 |
| time | VARCHAR(50) | 发送时间 |
| isOwn | BOOLEAN | 是否为自己发送的消息 |
| createdAt | DATETIME | 创建时间 |

### 3.2 表关系说明
```
┌─────────────┐       ┌─────────────┐
│   chats     │       │  messages   │
├─────────────┤       ├─────────────┤
│ id (PK)     │◄──────│ chatId (FK) │
│ name        │       │ senderId    │
│ lastMessage │       │ text        │
│ time        │       │ time        │
└─────────────┘       └─────────────┘
```

---

## 四、接口设计

### 4.1 RESTful API

#### 4.1.1 获取聊天数据
```
GET /api/chats
```
**响应格式：**
```json
{
  "success": true,
  "chats": [
    {
      "id": 1,
      "name": "公共聊天",
      "lastMessage": "欢迎消息",
      "time": "10:00"
    }
  ],
  "messages": [
    {
      "id": 1,
      "chatId": 1,
      "senderId": "系统",
      "text": "欢迎大家加入公共聊天！",
      "time": "10:00",
      "isOwn": false
    }
  ]
}
```

#### 4.1.2 发送消息
```
POST /api/messages
```
**请求参数：**
```json
{
  "chatId": 1,
  "senderId": "用户名",
  "text": "消息内容",
  "time": "10:30",
  "tempId": 1234567890
}
```

**响应格式：**
```json
{
  "success": true,
  "message": "消息发送成功"
}
```

### 4.2 WebSocket 事件

#### 4.2.1 客户端发送事件

| 事件名 | 说明 | 参数 |
|--------|------|------|
| setEmployeeId | 设置员工ID | employeeId: string |
| setUserLogin | 用户登录 | username: string |
| joinChat | 加入聊天室 | chatId: number |
| leaveChat | 离开聊天室 | chatId: number |

#### 4.2.2 服务端推送事件

| 事件名 | 说明 | 参数 |
|--------|------|------|
| newMessage | 新消息通知 | Message 对象 |
| onlineUsers | 在线用户数量 | count: number |
| onlineEmployeeIds | 在线员工ID列表 | employeeIds: string[] |
| messageDelivered | 消息已送达 | { messageId, chatId } |
| messageRead | 消息已读 | { messageId, chatId } |
| kickedOut | 强制下线通知 | { message: string } |

---

## 五、前端设计

### 5.1 组件结构
```
EmployeeChatView.vue
├── Header（顶部导航）
│   ├── Logo
│   └── Nav（返回按钮）
├── MainContent（主内容区）
│   ├── ChatSidebar（左侧聊天列表）
│   │   ├── SidebarHeader（标题）
│   │   └── EmployeeList（聊天列表）
│   │       └── EmployeeItem（聊天项）
│   └── ChatContent（右侧聊天内容）
│       ├── ChatHeader（聊天头部）
│       ├── MessageList（消息列表）
│       │   └── MessageItem（消息项）
│       └── MessageInput（消息输入区）
└── Footer（页脚）
```

### 5.2 状态管理

#### 5.2.1 响应式数据
```typescript
// 聊天列表
const chats = ref<Chat[]>([])

// 当前激活的聊天ID
const activeChatId = ref<number | null>(null)

// 消息输入文本
const messageText = ref('')

// 员工列表
const employees = ref<Employee[]>([])

// 未读消息计数
const unreadCount = ref<Record<number, number>>({})

// 在线用户数量
const onlineUsers = ref<number>(0)

// 在线员工ID集合
const onlineEmployeeIds = ref<Set<string>>(new Set())
```

#### 5.2.2 计算属性
```typescript
// 当前激活的聊天
const activeChat = computed(() => {
  return chats.value.find(chat => chat.id === activeChatId.value) || null
})
```

### 5.3 核心方法

#### 5.3.1 数据加载
```typescript
// 加载员工数据
const loadEmployees = async () => { ... }

// 加载聊天数据
const loadChats = async () => { ... }

// 从本地存储加载
const loadChatsFromLocalStorage = () => { ... }

// 保存到本地存储
const saveChatsToLocalStorage = () => { ... }
```

#### 5.3.2 WebSocket 管理
```typescript
// 连接 WebSocket
const connectWebSocket = () => { ... }

// 重新连接
const reconnectWebSocket = () => { ... }

// 加入聊天室
const joinChat = (chatId: number) => { ... }

// 离开聊天室
const leaveChat = (chatId: number) => { ... }
```

#### 5.3.3 消息处理
```typescript
// 发送消息
const sendMessage = async () => { ... }

// 选择聊天
const selectEmployeeChat = (chatId: number, ...) => { ... }

// 滚动到最新消息
const scrollToLatestMessage = () => { ... }
```

### 5.4 界面布局

#### 5.4.1 整体布局
- 采用左右分栏布局
- 左侧：300px 宽度的聊天列表
- 右侧：自适应宽度的聊天内容区
- 高度：100vh 全屏显示

#### 5.4.2 消息气泡样式
- 自己发送的消息：右侧显示，蓝色渐变背景
- 他人发送的消息：左侧显示，浅蓝色背景
- 系统消息：居中显示，灰色背景

#### 5.4.3 响应式设计
- 移动端适配（预留）
- 消息列表自适应滚动
- 输入框固定在底部

---

## 六、后端设计

### 6.1 Socket.io 服务配置
```javascript
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});
```

### 6.2 连接管理

#### 6.2.1 在线用户跟踪
```javascript
let onlineUserCount = 0;
const onlineEmployeeIds = new Set();
const userSessions = new Map(); // 用户名 -> socket.id
```

#### 6.2.2 连接事件处理
```javascript
io.on('connection', (socket) => {
  // 增加在线用户数
  onlineUserCount++;
  
  // 广播在线用户数
  io.emit('onlineUsers', onlineUserCount);
  
  // 断开连接处理
  socket.on('disconnect', () => {
    onlineUserCount--;
    // 清理在线状态
    // 广播更新
  });
});
```

### 6.3 消息广播机制

#### 6.3.1 聊天室模式
- 使用 Socket.io 的 Room 功能
- 用户加入聊天室：`socket.join(`chat_${chatId}`)`
- 向聊天室广播：`io.to(`chat_${chatId}`).emit('newMessage', message)`

#### 6.3.2 消息发送函数
```javascript
const sendMessageToChat = (chatId, message) => {
  // 向特定聊天室广播消息
  io.to(`chat_${chatId}`).emit('newMessage', message);
  
  // 广播消息已送达状态
  io.to(`chat_${chatId}`).emit('messageDelivered', {
    messageId: message.id,
    chatId: message.chatId
  });
};
```

### 6.4 单设备登录控制
```javascript
// 检测重复登录
if (userSessions.has(user.username)) {
  const oldSocketId = userSessions.get(user.username);
  io.to(oldSocketId).emit('kickedOut', { 
    message: '您的账号在其他设备登录，已被强制退出' 
  });
}

// 记录新会话
userSessions.set(username, socket.id);
```

---

## 七、数据流设计

### 7.1 消息发送流程
```
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│  用户输入  │────▶│ 前端验证  │────▶│ API请求  │────▶│ 数据库存储 │
└──────────┘     └──────────┘     └──────────┘     └──────────┘
                                                          │
                              ┌───────────────────────────┘
                              ▼
┌──────────┐     ┌──────────┐     ┌──────────┐
│ 接收消息  │◀────│ WebSocket│◀────│ 消息广播  │
└──────────┘     └──────────┘     └──────────┘
```

### 7.2 消息接收流程
```
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│ 服务端推送 │────▶│ WebSocket│────▶│ 前端接收  │────▶│ 更新界面  │
└──────────┘     └──────────┘     └──────────┘     └──────────┘
                                                          │
                              ┌───────────────────────────┘
                              ▼
                        ┌──────────┐
                        │ 本地存储  │
                        └──────────┘
```

---

## 八、安全设计

### 8.1 传输安全
- 开发环境使用 HTTP
- 生产环境建议使用 HTTPS + WSS
- 消息内容转义防止 XSS

### 8.2 用户认证
- 基于登录状态的 WebSocket 连接
- 单设备登录限制
- 用户会话管理

### 8.3 数据安全
- SQL 注入防护（参数化查询）
- 消息内容长度限制
- 敏感词过滤（预留）

---

## 九、性能优化

### 9.1 前端优化
- 消息列表虚拟滚动（预留）
- 图片懒加载（预留）
- 本地存储缓存

### 9.2 后端优化
- 数据库索引优化
- 消息分页加载
- 连接池管理

### 9.3 网络优化
- WebSocket 自动重连
- 心跳检测机制
- 断线重连恢复

---

## 十、错误处理

### 10.1 前端错误处理
- WebSocket 连接失败提示
- 消息发送失败重试
- 网络异常处理

### 10.2 后端错误处理
- 数据库连接异常
- 消息广播异常
- 用户会话异常

---

## 十一、部署说明

### 11.1 环境要求
- Node.js 14+
- MySQL 8.0+
- 现代浏览器（支持 WebSocket）

### 11.2 配置说明
```javascript
// WebSocket 连接配置
{
  transports: ['websocket'],
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
  timeout: 5000
}
```

### 11.3 启动顺序
1. 启动 MySQL 数据库
2. 启动后端服务：`node server.js`
3. 启动前端服务：`npm run dev`

---

## 十二、未来规划

### 12.1 功能扩展
- [ ] 私聊功能实现
- [ ] 群聊功能实现
- [ ] 文件传输功能
- [ ] 语音消息支持
- [ ] 消息撤回功能
- [ ] 消息搜索功能
- [ ] @提及功能
- [ ] 消息表情支持

### 12.2 性能优化
- [ ] 消息列表虚拟滚动
- [ ] 历史消息分页加载
- [ ] 图片压缩与 CDN
- [ ] 消息已读回执优化

### 12.3 安全增强
- [ ] 端到端加密
- [ ] 敏感词过滤
- [ ] 消息审计日志
- [ ] 防刷屏机制

---

## 十三、附录

### 13.1 相关文件
- 前端页面：`src/views/EmployeeChatView.vue`
- WebSocket 服务：`src/services/websocket.ts`
- API 服务：`src/services/api.ts`
- 后端服务：`server.js`

### 13.2 版本历史
| 版本 | 日期 | 说明 |
|------|------|------|
| v1.0 | 2026-03-17 | 初始版本，公共聊天室功能 |

---

**文档结束**
