# OA 系统 · 服务器部署运维安全加固指南

本文档面向将 OA 系统部署到 **Linux 服务器**（本机为 Windows 开发环境，服务器为 Linux 或 Windows Server）时，需执行的**操作系统与运维层面**安全加固。应用层（认证、注入、CSRF、上传、备份、日志、限流等）已由代码内置，本文档聚焦服务器侧。

---

## 一、数据库最小权限（强烈建议）

应用连接数据库目前使用全权限账号。请改用最小权限账号：

1. 以 root 登录 MySQL，执行 `scripts/setup-db-permissions.sql`（先替换账号名/密码/库名）。
2. 将 `.env` 中 `DB_USER` / `DB_PASSWORD` 改为新建的最小权限账号。
3. 重启后端验证功能正常后，锁定旧的 DBA 全权限账号（避免应用端使用）。

**验证**：
```sql
SHOW GRANTS FOR 'qygl_app'@'localhost';
```
应仅看到 `SELECT, INSERT, UPDATE, DELETE`（及可选的 `EXECUTE`），**不包含** `CREATE/DROP/ALTER/GRANT`。

---

## 二、SSH 远程登录加固（Linux 服务器）

编辑 `/etc/ssh/sshd_config`：

```ini
# 禁止 root 直接登录（改用普通用户 + sudo）
PermitRootLogin no
# 启用密钥登录、禁止密码登录（防暴力破解）
PasswordAuthentication no
PubkeyAuthentication yes
# 修改默认端口（可选，降低被扫描概率），改为如 22022，并同步防火墙放行
Port 22022
```

修改后重启 SSH：`systemctl restart sshd`（**务必先用新配置保留一个已验证的连接**，避免锁死）。

---

## 三、防火墙最小化开放（Linux）

仅开放业务所需端口，其余一律拒绝：

```bash
# 放行 SSH（若已改端口则同步）
ufw allow 22022/tcp
# 放行 OA 前端端口（Nginx 监听 8080）
ufw allow 8080/tcp
# 放行后端 API（若前端通过 Nginx 反代，则后端 3005 仅需内网，可不对外）
ufw allow from 192.168.1.0/24 to any port 3005 proto tcp
# 数据库 3306 禁止公网暴露，仅限内网/本机
ufw allow from 127.0.0.1 to any port 3306 proto tcp
# 默认拒绝入站
ufw default deny incoming
ufw enable
ufw status verbose
```

> **关键**：MySQL 3306 端口**绝不应**直接暴露公网。确保 MySQL `bind-address = 127.0.0.1`（在 `my.cnf` 的 `[mysqld]` 段）。

---

## 四、防暴力破解（fail2ban，Linux）

安装并配置 fail2ban 保护 SSH：

```bash
apt install fail2ban -y
```

`/etc/fail2ban/jail.local`：
```ini
[sshd]
enabled  = true
maxretry = 5
bantime  = 3600
```

`systemctl enable --now fail2ban`

---

## 五、pm2 以非 root 运行

**切勿**用 root 运行 pm2/后端进程，防止应用被攻破后直接获得 root 权限：

```bash
# 创建专用系统用户
useradd -m -s /bin/bash qygl
# 将项目目录归属该用户，并收紧 .env 权限
chown -R qygl:qygl /path/to/qy
chmod 600 /path/to/qy/.env          # 仅属主可读写
chmod 700 /path/to/qy/.env
# 切换到该用户后启动
su - qygl
cd /path/to/qy && pm2 start ecosystem.config.cjs
pm2 save
pm2 startup                            # 生成开机自启命令并执行其输出
```

---

## 六、敏感文件与配置保护

- `.env` 含数据库密码、JWT 密钥等，**严禁提交到 git**（确认 `.gitignore` 已排除），且文件权限设为仅属主可读（`chmod 600`）。
- 项目根下的 `backups/` 备份目录建议放在项目目录之外或加密（应用已支持 AES-256 加密备份）。
- 定期轮换 `JWT_SECRET`、数据库密码、邮箱授权码。

---

## 七、依赖漏洞持续监控

应用已内置依赖审计脚本：

```bash
npm run security:audit
```

本机已提供计划任务安装脚本，注册后**每周一自动审计**：

```bash
npm run security:schedule   # Windows 上会注册计划任务（需管理员权限）
```

Linux 服务器可改用 crontab：
```bash
0 4 * * 1 cd /path/to/qy && /usr/bin/node scripts/security-audit.js >> logs/security-audit.log 2>&1
```

发现 high/critical 漏洞时，及时升级依赖：`npm audit fix`（或针对性 `npm install 包名@安全版本`）。

---

## 八、日志审计与监控

- 应用内置：操作日志（保留 180 天自动清理）、安全告警日志、服务健康监控（异常邮件告警）。
- 本机计划任务已注册：每日日志清理、每日备份、每周依赖审计、每 30 分钟健康监控。
- 生产建议同时接入企业微信/钉钉告警（`.env` 配置 `ALERT_WEBHOOK_URL`），高危事件即时推送。

---

## 九、HTTPS（推荐，作为纵深补充）

内网可暂时 HTTP，但对外/敏感环境强烈建议启用 HTTPS（Nginx 配 Let's Encrypt 或自签证书），并升级 HTTP/2。本指南未含数据库 SSL（如需要可基于项目现有加密备份能力单独评估）。

---

## 快速自查清单

- [ ] 数据库使用最小权限账号（无 DDL 权限）
- [ ] MySQL 3306 仅内网/本机，禁止公网暴露
- [ ] SSH 禁止 root 登录、禁用密码登录、已改端口
- [ ] 防火墙仅开放 8080/SSH/内网端口，默认拒绝入站
- [ ] fail2ban 已启用
- [ ] pm2 以非 root 用户运行
- [ ] `.env` 权限 600，未入库
- [ ] 已配置依赖审计 + 日志清理 + 自动备份计划任务
- [ ] 已配置邮箱/企业微信高危告警
