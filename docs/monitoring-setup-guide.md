# OA系统监控方案实施指南

## 📋 方案概述

本监控方案结合了**Uptime Kuma**（外部服务监控）和**自建Dashboard**（内部系统指标监控），为OA系统提供全方位的监控解决方案。

### 方案特点
- **快速见效**：Uptime Kuma开箱即用，立即提供外部监控
- **深度分析**：自建Dashboard提供详细的系统指标
- **无缝集成**：与现有OA系统完美集成
- **零依赖**：不需要Docker，纯Node.js实现
- **Windows友好**：所有脚本都针对Windows优化

---

## 🚀 部署步骤

### 步骤1：安装Uptime Kuma

```bash
cd E:\AI\qy

# 全局安装Uptime Kuma（推荐）
npm install -g uptime-kuma

# 或作为项目依赖安装
npm install uptime-kuma
```

### 步骤2：初始化监控数据库

**方式一：命令行执行**
```bash
mysql -u root -p qyglfb < scripts\init-monitor.sql
```

**方式二：数据库管理工具**
在Navicat或其他数据库管理工具中打开 `scripts/init-monitor.sql` 文件并执行

### 步骤3：集成监控路由

监控路由已自动集成到 `server.js` 中，包括：
- `/api/monitor/metrics` - 获取监控指标数据
- `/api/monitor/summary` - 获取最新指标摘要
- `/api/monitor/alerts` - 获取告警记录
- `/api/monitor/health` - 获取系统健康状态

### 步骤4：配置Nginx

**修改 `nginx-1.22.1/conf/nginx.conf`**

在 `http{}` 块中添加：
```nginx
include uptime-kuma.conf;
```

### 步骤5：添加前端路由

**修改 `src/router/index.ts`**

添加监控页面路由：
```typescript
{
  path: '/monitor',
  name: 'Monitor',
  component: () => import('../views/MonitorView.vue'),
  meta: { 
    requiresAuth: true,
    title: '系统监控'
  }
}
```

**添加菜单项**

在侧边栏菜单中添加：
```javascript
{
  path: '/monitor',
  name: '系统监控',
  icon: 'Monitor',
  component: 'MonitorView'
}
```

### 步骤6：启动服务

**一键启动所有服务**
```bash
scripts\start-all.bat
```

**或分别启动**
```bash
# 启动Uptime Kuma
uptime-kuma

# 启动监控采集服务
node scripts\monitor-collector.js

# 启动后端服务
node server.js

# 启动Nginx
cd nginx-1.22.1
nginx.exe
```

### 步骤7：配置Uptime Kuma

访问 `http://localhost:8080/uptime-kuma/` 进行初始化：

1. **设置管理员账号**
   - 用户名：admin
   - 密码：设置强密码

2. **添加监控项**
   
   **OA前端服务**
   - 类型：HTTP(s)
   - 名称：OA前端服务
   - URL：`http://localhost:8080`
   - 检查频率：60秒
   
   **OA后端API**
   - 类型：HTTP(s)
   - 名称：OA后端API
   - URL：`http://localhost:3005/api/health`
   - 检查频率：30秒
   
   **MySQL数据库**
   - 类型：MySQL
   - 名称：MySQL数据库
   - 主机：localhost
   - 端口：3306
   - 数据库：qyglfb
   
   **后端端口**
   - 类型：TCP Port
   - 名称：后端API端口
   - 主机：localhost
   - 端口：3005

3. **配置告警通知**
   
   **企业微信**
   - 通知类型：Webhook
   - Webhook URL：企业微信机器人地址
   - 消息格式：默认
   
   **钉钉**
   - 通知类型：Webhook
   - Webhook URL：钉钉机器人地址
   - 安全设置：加签或关键词
   
   **邮件**
   - 通知类型：Email
   - SMTP服务器：smtp.qq.com
   - 端口：465
   - 发件人：你的邮箱
   - 密码：邮箱授权码

---

## 📊 监控功能说明

### Uptime Kuma（外部监控）

**监控类型**
- HTTP(s) - Web服务监控
- TCP Port - 端口连通性监控
- MySQL - 数据库连接监控
- Ping - 网络连通性监控

**告警通知**
- 企业微信机器人
- 钉钉机器人
- 邮件通知
- Webhook自定义

**状态页面**
- 公开状态页：`http://localhost:8080/status/`
- 可自定义状态页面样式
- 支持多种显示模式

### 自建Dashboard（内部监控）

**监控指标**
- **系统指标**：CPU使用率、内存使用率、系统负载、磁盘使用率
- **数据库指标**：连接延迟、活跃连接数
- **应用指标**：Node.js内存使用、事件循环延迟

**告警管理**
- 自动告警检测
- 告警级别：INFO/WARNING/HIGH/CRITICAL
- 告警历史记录
- 手动解决告警

**数据可视化**
- 实时指标卡片
- 历史趋势图表
- 健康状态面板
- 响应式设计

---

## 🎯 访问地址

| 服务 | 地址 | 说明 |
|------|------|------|
| 前端应用 | http://localhost:8080 | OA系统前端 |
| Uptime Kuma管理 | http://localhost:8080/uptime-kuma/ | Uptime Kuma管理界面 |
| 系统监控 | http://localhost:8080/#/monitor | 自建监控仪表板 |
| Uptime Kuma状态页 | http://localhost:8080/status/ | 公开状态页面 |
| 后端API | http://localhost:3005 | 后端API接口 |

---

## 🔧 常用管理命令

### 服务管理

**启动所有服务**
```bash
scripts\start-all.bat
```

**停止所有服务**
```bash
scripts\stop-all.bat
```

**启动Uptime Kuma**
```bash
uptime-kuma
# 或
scripts\start-uptime-kuma.bat
```

**启动监控采集服务**
```bash
node scripts\monitor-collector.js
# 或
scripts\start-monitor.bat
```

### 数据管理

**单次采集指标**
```bash
node scripts\monitor-collector.js once
```

**清理历史数据**
```bash
node scripts\monitor-collector.js cleanup
```

**查看监控数据**
```bash
# 登录MySQL
mysql -u root -p qyglfb

# 查看最新指标
SELECT * FROM monitor_metrics ORDER BY collected_at DESC LIMIT 20;

# 查看告警记录
SELECT * FROM monitor_alerts ORDER BY created_at DESC LIMIT 20;
```

---

## ⚙️ 配置说明

### 监控采集配置

**采集间隔**：60秒（在 `scripts/monitor-collector.js` 中修改）
**数据保留**：30天（自动清理）
**告警阈值**：在 `scripts/monitor-collector.js` 中配置

### 告警规则

**系统告警**
- CPU使用率 > 80%
- 内存使用率 > 85%
- 磁盘使用率 > 85%

**数据库告警**
- 连接延迟 > 1000ms
- 连接失败（延迟 = -1ms）

**应用告警**
- Node.js内存使用率 > 90%
- 事件循环延迟 > 100ms

---

## 🐛 故障处理

### 监控数据不更新

**检查监控采集服务**
```bash
# 检查服务是否运行
tasklist | findstr node

# 查看服务日志
# 在运行中的命令行窗口查看输出
```

**检查数据库连接**
```bash
# 测试数据库连接
mysql -u root -p qyglfb -e "SELECT 1"

# 检查监控表是否存在
mysql -u root -p qyglfb -e "SHOW TABLES LIKE 'monitor_%'"
```

### Uptime Kuma无法访问

**检查Uptime Kuma服务**
```bash
# 检查端口3001是否被占用
netstat -ano | findstr :3001

# 重启Uptime Kuma
taskkill /F /IM node.exe
uptime-kuma
```

**检查Nginx配置**
```bash
# 测试Nginx配置
cd nginx-1.22.1
nginx -t

# 重启Nginx
nginx -s reload
```

### 前端无法访问监控API

**检查路由配置**
```bash
# 确认监控路由已集成
# 检查 server.js 中是否包含：
# import monitorRouter from './server/routes/monitor.js';
# app.use('/api', monitorRouter);
```

**测试API接口**
```bash
# 测试健康检查接口
curl http://localhost:3005/api/monitor/health

# 测试监控摘要接口
curl http://localhost:3005/api/monitor/summary
```

---

## 📈 性能优化

### 数据库优化

**添加索引**
```sql
-- 已在初始化脚本中创建
-- idx_metric_type_name
-- idx_collected_at
-- idx_metric_type_time
-- idx_alert_type
-- idx_alert_level
```

**定期清理**
```bash
# 自动清理30天前的数据（每天执行）
# 已在监控采集服务中自动执行
```

### 应用优化

**监控采集优化**
- 减少采集频率（修改 `setInterval` 时间）
- 减少采集指标数量（注释不需要的采集函数）
- 使用数据库连接池（已配置）

---

## 🔒 安全建议

### 访问控制

**Uptime Kuma**
- 设置强密码
- 启用双因素认证（如需要）
- 限制管理界面访问IP

**自建Dashboard**
- 已集成到OA系统认证体系
- 仅登录用户可访问
- 管理员权限才能解决告警

### 数据安全

**敏感信息保护**
- 数据库密码存储在 `.env` 文件
- 监控数据不包含敏感信息
- 告警消息脱敏处理

---

## 📝 维护计划

### 日常维护
- 每日检查监控状态
- 每周查看告警记录
- 每月分析性能趋势

### 定期优化
- 每季度调整告警阈值
- 每半年清理历史数据
- 每年升级监控组件

---

## 🎓 扩展功能

### 添加自定义监控指标

**在 `scripts/monitor-collector.js` 中添加**
```javascript
// 自定义采集函数
async customMetric() {
  return {
    type: 'custom',
    name: 'custom_metric',
    value: 100,
    unit: 'count',
    tags: {}
  };
}

// 在采集循环中添加
const metrics = await Promise.all([
  // 现有指标...
  collectors.customMetric() // 添加自定义指标
]);
```

### 集成第三方监控

**Prometheus**
- 使用 `prom-client` 库
- 暴露 `/metrics` 端点
- 配置 Prometheus 抓取

**Grafana**
- 部署 Grafana
- 配置数据源
- 创建自定义仪表板

---

## 📞 技术支持

### 文档资源
- Uptime Kuma文档：https://github.com/louislam/uptime-kuma/wiki
- 项目安全文档：`docs/安全加固说明文档.md`
- 部署运维文档：`docs/部署运维说明.md`

### 问题反馈
如遇到问题，请提供：
1. 错误信息
2. 操作步骤
3. 环境信息（Windows版本、Node.js版本等）

---

## ✅ 部署检查清单

- [ ] 安装Uptime Kuma
- [ ] 初始化监控数据库表
- [ ] 集成监控路由到server.js
- [ ] 配置Nginx反向代理
- [ ] 添加前端路由和菜单
- [ ] 启动所有服务
- [ ] 配置Uptime Kuma监控项
- [ ] 配置告警通知
- [ ] 验证监控功能
- [ ] 测试告警通知

---

**部署完成后，你将拥有一个完整的OA系统监控解决方案！**

**版本**：v1.0  
**更新日期**：2026-08-17  
**适用环境**：Windows Server + Node.js + MySQL + Nginx