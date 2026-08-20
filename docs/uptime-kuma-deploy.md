# Uptime Kuma 部署指南（方案 A：服务在线状态监控）

> 目标：监控 OA 系统"服务在不在、响应慢不慢"，自带状态页与通知。
> 与方案 B（自建 ECharts 仪表盘，项目内 `/monitor` 路由）互补：A 管在线状态，B 管指标曲线。
>
> 适用环境：Windows Server（本项目生产部署环境）。
> 若生产服务器是 Linux，建议用 Docker 部署（`docker run -d --restart=always -p 3001:3001 -v uptime-kuma:/app/data --name uptime-kuma louislam/uptime-kuma:1`）。

---

## 一、为什么在 Windows 上直接装（不推荐 Docker Desktop）

Docker Desktop for Windows 需要 WSL2 且占用较大，OA 服务器不建议引入。
Uptime Kuma 是纯 Node.js 应用，可直接用 npm 全局安装运行，与项目共用 Node 运行时。

## 二、Windows 部署步骤（生产服务器上执行）

### 1. 安装（Node.js ≥ 14 即可，项目 Node 20 满足）

```bat
npm install -g uptime-kuma
```

> 若 npm 全局安装失败（Windows 上该包曾有安装问题），改用官方推荐方式：
>
> ```bat
> git clone https://github.com/louislam/uptime-kuma.git
> cd uptime-kuma
> npm run setup
> ```

### 2. 启动

```bat
:: 前台运行（测试用）
uptime-kuma --port 3001

:: 或注册为计划任务/服务长期运行（推荐用 NSSM 注册 Windows 服务）
nssm install UptimeKuma "C:\Program Files\nodejs\node.exe" "C:\Users\Administrator\AppData\Roaming\npm\node_modules\uptime-kuma\server\server.js"
nssm set UptimeKuma AppParameters "--port 3001"
nssm set UptimeKuma AppDirectory "C:\Users\Administrator\AppData\Roaming\npm\node_modules\uptime-kuma\server"
nssm set UptimeKuma Start SERVICE_AUTO_START
nssm start UptimeKuma
```

> 备选：用 pm2 管理（与 OA 后端一致，便于统一管理）：
> ```bat
> pm2 start "uptime-kuma --port 3001" --name uptime-kuma
> pm2 save
> ```

### 3. 首次配置

1. 浏览器访问 `http://localhost:3001` → 创建管理员账号（**不要复用 OA 的管理员密码**）。
2. 设置页开启**两步验证（2FA）**——Uptime Kuma 管理后台本身会被外网扫描，务必保护。

## 三、配置监控项（添加监控）

在 Uptime Kuma 中点击「添加监控」，按下表逐项添加：

| 监控项 | 类型 | 地址/参数 | 说明 |
|--------|------|-----------|------|
| 前端站点 | HTTP(s) | `http://服务器IP:8080/` | OA 前端（Nginx） |
| 后端健康 | HTTP(s) | `http://127.0.0.1:3005/api/health` | 后端探活接口（公开免鉴权） |
| 后端端口 | 端口 | `127.0.0.1:3005` | TCP 连通性兜底 |
| MySQL | MySQL | 主机 `127.0.0.1` 端口 `3306` 库名 `qyglfb` | 数据库连通（可选，用只读账号） |
| 监控仪表盘 | HTTP(s) | `http://服务器IP:8080/monitor` | 方案 B 页面可达性 |

建议为每项设置：
- 间隔：**60 秒**（HTTP 探活不要低于 30 秒，避免对 OA 造成无意义压力）
- 重试：2 次（避免偶发抖动误报）
- 通知：选择下面配置的通知渠道

## 四、配置通知（替代方案中暂未启用的 webhook 告警）

Uptime Kuma 通知中心支持企业微信、钉钉、邮件、Webhook 等。

- **企业微信**：设置 → 通知 → 添加「企业微信机器人」，填入机器人 Webhook URL（group robot）
- **钉钉**：添加「钉钉机器人」，填入自定义机器人 Webhook + 加签密钥
- **邮件**：SMTP 配置（可与 OA 的 `MAIL_*` 同一套 QQ 邮箱）

触发时机建议：
- 监控项 **up → down**：通知（服务宕机）
- 监控项 **down → up**：通知（恢复）
- **不要**对每个失败都通知，避免告警轰炸

## 五、状态页（可选，对外展示）

1. 设置 → 状态页 → 新建状态页
2. 勾选要展示的监控项，可设置公开 URL（内网环境建议不公开或加访问密码）

## 六、与 Nginx 集成（可选，统一 8080 入口）

如果希望 Uptime Kuma 也走 8080 端口统一入口（避免再开 3001 端口），在
`E:\AI\qy\nginx-1.22.1\conf\qygl.conf` 的 server 块内增加：

```nginx
# Uptime Kuma（内网访问 8080/status 进入）
location /status/ {
    proxy_pass http://127.0.0.1:3001/;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_read_timeout 120s;
}
```

修改后 `nginx -s reload`。

## 七、安全注意事项

1. **Uptime Kuma 管理后台（/）不要暴露公网**——只允许内网访问（nginx 层已有 IP 白名单，若走 8080 自动继承）。
2. 数据库监控若使用 MySQL 账号，**使用只读账号**，不要用 root/应用账号。
3. 定期备份 Uptime Kuma 数据目录（Windows：`C:\Users\Administrator\AppData\Roaming\npm\node_modules\uptime-kuma\data\`）。
4. 保持 Uptime Kuma 升级：`npm update -g uptime-kuma`（该软件历史上有安全更新，及时跟进）。

## 八、部署后验证清单

- [ ] `http://服务器IP:3001` 可访问，管理后台已设置强密码 + 2FA
- [ ] 5 个监控项全部显示绿色（up）
- [ ] 手动停掉一次后端（`pm2 stop qygl-backend`），验证 1-2 分钟内收到通知
- [ ] 重新启动后端，验证恢复通知
