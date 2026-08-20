# 监控系统快速开始指南

## 🚀 5分钟快速部署

### 1. 安装Uptime Kuma（2分钟）
```bash
cd E:\AI\qy
npm install -g uptime-kuma
```

### 2. 初始化数据库（1分钟）
```bash
mysql -u root -p qyglfb < scripts\init-monitor.sql
```

### 3. 启动服务（1分钟）
```bash
scripts\start-all.bat
```

### 4. 配置Uptime Kuma（1分钟）
访问 http://localhost:8080/uptime-kuma/
- 设置管理员账号
- 添加监控项
- 配置告警通知

## 📊 访问监控

| 监控类型 | 访问地址 | 说明 |
|---------|---------|------|
| Uptime Kuma管理 | http://localhost:8080/uptime-kuma/ | 外部服务监控 |
| 自建Dashboard | http://localhost:8080/#/monitor | 系统指标监控 |
| 状态页面 | http://localhost:8080/status/ | 公开状态页 |

## ⚡ 常用命令

```bash
# 启动所有服务
scripts\start-all.bat

# 停止所有服务
scripts\stop-all.bat

# 单独启动监控采集
scripts\start-monitor.bat

# 手动采集一次
node scripts\monitor-collector.js once

# 清理历史数据
node scripts\monitor-collector.js cleanup
```

## 🔍 快速检查

### 检查服务状态
```bash
# 检查Node.js进程
tasklist | findstr node

# 检查Nginx
cd nginx-1.22.1 && nginx -t

# 检查端口占用
netstat -ano | findstr :3005
netstat -ano | findstr :3001
netstat -ano | findstr :8080
```

### 检查监控数据
```bash
# 登录MySQL查看
mysql -u root -p qyglfb

# 查看最新指标
SELECT * FROM monitor_metrics ORDER BY collected_at DESC LIMIT 10;

# 查看告警记录
SELECT * FROM monitor_alerts ORDER BY created_at DESC LIMIT 10;
```

## 🎯 Uptime Kuma基础配置

### 必须添加的监控项

1. **OA前端服务**
   - 类型：HTTP(s)
   - URL：`http://localhost:8080`
   - 间隔：60秒

2. **OA后端API**
   - 类型：HTTP(s)
   - URL：`http://localhost:3005/api/health`
   - 间隔：30秒

3. **MySQL数据库**
   - 类型：MySQL
   - 主机：localhost
   - 端口：3306
   - 数据库：qyglfb

## ⚠️ 常见问题

**Q: 监控数据不更新？**
A: 检查监控采集服务是否运行，查看服务日志

**Q: Uptime Kuma无法访问？**
A: 检查端口3001是否被占用，重启Uptime Kuma服务

**Q: 前端监控页面显示404？**
A: 检查路由配置，确认 `/monitor` 路由已添加

**Q: 告警不生效？**
A: 检查Uptime Kuma的通知配置，确认webhook地址正确

## 📞 需要帮助？

查看详细文档：`docs/monitoring-setup-guide.md`

---

**监控系统已准备就绪，开始监控你的OA系统吧！** 🎉