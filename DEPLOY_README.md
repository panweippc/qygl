# 企业管理系统部署说明

## CI/CD流程

本项目通过Jenkins实现自动化CI/CD流程：

### 触发方式
- 轮询检测：每5分钟检查一次代码变更（H/5 * * * *）

### 流水线阶段
1. **Checkout** - 拉取代码
2. **Install Dependencies** - 安装依赖
3. **Build** - 前端构建
4. **Stop Service** - 停止旧服务
5. **Deploy** - 部署应用
6. **Install Deploy Dependencies** - 安装部署环境依赖
7. **Start Service** - 启动服务
8. **Verify Backend** - 验证后端服务
9. **Verify Frontend** - 验证前端服务
10. **PM2 Status** - 检查PM2状态

### 部署配置
- 部署目录：D:/deploy/qygl
- 后端端口：3005
- PM2应用名：qygl-backend

### 版本标签规范
- 格式：vX.Y.Z（语义化版本）
- 每次提交必须打标签，便于版本回退
- 标签示例：v1.0.0, v1.0.1, v1.1.0
- CI/CD触发：每5分钟自动轮询检测代码变更

## 手动部署命令

```bash
# 构建前端
npm run build

# 启动后端服务
pm2 start server.js --name qygl-backend

# 停止服务
pm2 stop qygl-backend
pm2 delete qygl-backend
```
