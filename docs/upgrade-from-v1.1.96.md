# v1.1.96 → 当前版本 升级操作清单

> 当前版本：v1.2.0+（含安全加固、Nginx 反向代理、监控仪表盘、备份加密、邮件告警）
> 变更规模：137 个文件，32200 行新增代码

---

## 第 1 步：拉取最新代码

```bash
git fetch --all
git checkout v1.2.0    # 或直接 checkout main / master
```

如果另一台电脑没有 git 仓库，直接把当前项目的代码目录拷贝过去即可（排除 `node_modules/` 和 `backups/`）。

---

## 第 2 步：安装新增/升级的 npm 依赖

```bash
npm install
```

### 新增依赖（6 个）

| 包名 | 用途 |
|------|------|
| `bcryptjs` | 密码哈希（替代明文/简单 hash） |
| `helmet` | HTTP 安全响应头（CSP、X-Frame-Options 等） |
| `express-rate-limit` | API 限流防爆破 |
| `jsonwebtoken` | JWT 令牌签发与验证 |
| `nodemailer` | 邮件告警通知 |
| `dompurify` | 前端 XSS 防护（富文本输入净化） |

### 升级依赖（2 个）

| 包名 | 变更 | 注意 |
|------|------|------|
| `axios` | 0.27.2 → ^1.19.0 | API 大版本升级，但项目用法简单（get/post），无 breaking change |
| `mysql2` | ^2.3.3 → ^3.23.3 | API 兼容（promise 池用法不变），但需确认 Node.js >= 14 |

---

## 第 3 步：执行数据库迁移（5 个 SQL，全部幂等可重复执行）

按顺序执行，全部安全——已存在的列/表会跳过：

```bash
# 进入项目目录
cd 项目路径

# 1. v1.1.93 迁移（拜访记录 visitNo 固定序号）
mysql -h localhost -u 用户名 -p qyglfb < db-update-v1.1.93.sql

# 2. v1.1.96 迁移（visitNo 删除后不重排）
mysql -h localhost -u 用户名 -p qyglfb < db-update-v1.1.96.sql

# 3. 账号生命周期字段（status、failed_attempts、locked_until 等）
mysql -h localhost -u 用户名 -p qyglfb < db-add-account-fields.sql

# 4. 操作日志审计字段（beforeValue / afterValue）
mysql -h localhost -u 用户名 -p qyglfb < db-add-log-fields.sql

# 5. 会话版本号（tokenVersion，支持管理员强制下线/踢人）
mysql -h localhost -u 用户名 -p qyglfb < db-add-token-version.sql
```

### 可选 SQL

```bash
# 数据库最小权限账号（生产建议执行，从全权限切换到只读增删改）
mysql -h localhost -u root -p qyglfb < scripts/setup-db-permissions.sql
```

### 监控表（无需手动建）

`monitor_metrics` 表由后端启动时 `server/utils/metrics-collector.js` 自动创建，不用手动执行 SQL。

---

## 第 4 步：更新 .env 配置

v1.1.96 的 `.env` 只有 5 行数据库配置，当前版本扩展到完整安全配置。

### 必须配置

```ini
# ===== 数据库配置（原有，保持不变）=====
DB_HOST=localhost
DB_PORT=3306
DB_USER=你的数据库用户名
DB_PASSWORD=你的数据库密码
DB_NAME=qyglfb

# ===== 安全配置 =====
# JWT 密钥——必须换成强随机值！
# 生成命令: node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
JWT_SECRET=换成64位以上的随机hex字符串

# 管理员初始密码（仅首次创建管理员时生效）
ADMIN_INIT_PASSWORD=Admin@2026

# 前端跨域白名单——把这台机器的访问地址加进来
# 格式: 协议://IP:端口,逗号分隔
CORS_ORIGINS=http://localhost:3003,http://127.0.0.1:3003,http://localhost:8080,http://127.0.0.1:8080,http://本机IP:8080
```

### 可选配置（按需启用）

```ini
# JWT 密钥轮换（轮换时把旧密钥放这里，使旧 token 仍有效）
# JWT_SECRET_PREVIOUS=旧的JWT_SECRET值

# 邮件告警（SMTP）
# MAIL_HOST=smtp.qq.com
# MAIL_PORT=465
# MAIL_SECURE=true
# MAIL_USER=you@qq.com
# MAIL_PASS=邮箱授权码
# MAIL_TO=admin@qq.com

# 企业微信/钉钉告警 webhook
# ALERT_WEBHOOK_URL=https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=你的key

# 备份加密（AES-256-GCM）
# 生成命令: openssl rand -hex 32
# BACKUP_ENCRYPT_KEY=64位hex密钥

# 备份异地存储（Windows 共享目录路径）
# BACKUP_REMOTE_PATH=\\192.168.2.100\backup

# 日志保留天数
# LOG_RETENTION_DAYS=180

# 员工初始密码（不配置则自动生成随机强密码）
# EMPLOYEE_INIT_PASSWORD=
```

### CORS_ORIGINS 特别说明

v1.1.96 之前，CORS 白名单是**硬编码在代码里**的 IP。当前版本改为完全由 `.env` 的 `CORS_ORIGINS` 控制。如果不配置此项，除 localhost 外的来源将被拒绝。**必须把这台机器的实际访问地址（IP:端口）加进来。**

---

## 第 5 步：更新 Nginx 配置

v1.1.96 **没有 Nginx 配置文件**，当前版本新增了完整的反向代理配置。

### 文件清单

| 文件 | 说明 |
|------|------|
| `nginx-1.22.1/conf/qygl.conf` | 站点配置（监听 8080，反代 3005，SPA fallback） |
| `nginx-1.22.1/conf/security-headers.conf` | 安全响应头（CSP、X-Frame-Options 等） |
| `nginx-1.22.1/conf/nginx.conf` | 主配置（需 include qygl.conf） |

### 操作步骤

1. 确认 `nginx-1.22.1/conf/nginx.conf` 的 `http` 块中有：
   ```nginx
   include qygl.conf;
   ```

2. 如果之前用的是 Apache 或直接 `node server.js`，现在切换到 Nginx 反代：
   - Nginx 监听 8080，对外提供服务
   - 后端 Node.js 监听 3005（仅本机访问）
   - 前端静态文件由 Nginx 直接服务（`dist/` 目录）

3. IP 白名单：`qygl.conf` 中已配置 `allow 192.168.1.0/24; allow 192.168.2.0/24;`，根据实际内网网段修改。

4. 重载 Nginx：
   ```bash
   cd nginx-1.22.1
   nginx -t          # 测试配置
   nginx -s reload   # 重载
   ```

---

## 第 6 步：重新构建前端

```bash
npm run build
```

构建产物输出到 `dist/` 目录，Nginx 配置已指向此目录。

### 新增前端页面

| 页面 | 路由 | 说明 |
|------|------|------|
| 安全告警 | `/security-alerts` | 安全事件日志查看 |
| 监控仪表盘 | `/monitor` | CPU/内存/磁盘/DB 延迟曲线（ECharts） |
| 操作日志 | `/operation-log` | 审计日志（含变更前后值） |
| 修改密码 | `/change-password` | 用户自助改密 |
| 系统管理 | `/system` | 用户/角色/权限/菜单/备份管理 |

---

## 第 7 步：重启服务

### 后端（pm2 管理）

```bash
# 如果之前用 pm2
pm2 restart ecosystem.config.cjs --update-env

# 如果之前直接 node server.js，先停掉旧进程，再：
pm2 start ecosystem.config.cjs
pm2 save
```

### 前端（Nginx）

```bash
nginx -s reload
```

### Windows 计划任务（可选）

如果之前没有配置开机自启，运行：

```bash
node scripts/install-tasks.js
```

这会创建以下计划任务：
- 开机自启后端（pm2）+ 前端（Nginx）
- 每日备份（`auto-backup.js`）
- 每日日志清理（`cleanup-logs.js`）
- 每 30 分钟健康检查（`monitor-health.js`）
- 每周安全审计（`security-audit.js`）
- 每日停用账号检查（`inactive-account-check.js`）

---

## 新增的运维脚本

| 命令 | 用途 | 频率 |
|------|------|------|
| `npm run security:audit` | 安全审计（检查弱密钥、过期 token 等） | 每周 |
| `npm run account:check` | 停用账号检测（90 天未登录） | 每日 |
| `npm run monitor:health` | 健康检查 + 邮件告警 | 每 30 分钟 |
| `npm run backup:crypto` | 备份加密 | 随备份自动执行 |
| `npm run cleanup:logs` | 日志清理（默认保留 180 天） | 每日 |
| `npm run security:schedule` | 安装上述所有计划任务 | 一次性 |

---

## 新增的后端中间件

| 文件 | 说明 |
|------|------|
| `server/middleware/auth.js` | 认证中间件（token 校验、密码指纹、会话版本） |
| `server/middleware/csrf.js` | CSRF 防护 |
| `server/middleware/requireAuth.js` | 路由级鉴权（需登录才能访问的接口） |
| `server/middleware/verifyAdminPassword.js` | 管理员操作二次验证 |

---

## 升级后验证清单

- [ ] 访问 `http://服务器IP:8080` 能正常打开登录页
- [ ] 用管理员账号登录成功
- [ ] 普通用户登录成功（特别是潘伟——已修复 tokenVersion bug）
- [ ] 登录后不会被踢回登录页
- [ ] 访问 `/monitor` 能看到监控仪表盘（需等待 1 分钟采集首次数据）
- [ ] 访问 `/security-alerts` 能看到安全事件日志
- [ ] 访问 `/operation-log` 能看到操作审计日志
- [ ] 数据库 `users` 表有 `tokenVersion` 列
- [ ] 数据库 `operation_logs` 表有 `beforeValue` / `afterValue` 列
- [ ] 数据库 `monitor_metrics` 表存在（后端启动后自动创建）
- [ ] `pm2 list` 显示 qygl-backend 状态为 online
- [ ] Nginx `nginx -t` 通过
