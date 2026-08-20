# =====================================================
# Fail2ban 安装与配置指南
# 适用环境：Linux服务器（Ubuntu/Debian/CentOS）
# =====================================================

## 一、安装 Fail2ban

### Ubuntu/Debian
```bash
sudo apt update
sudo apt install fail2ban -y
```

### CentOS/RHEL
```bash
sudo yum install epel-release -y
sudo yum install fail2ban -y
```

## 二、配置文件部署

### 1. 复制配置文件到系统目录
```bash
# 复制jail配置
sudo cp docs/fail2ban-jail.conf /etc/fail2ban/jail.d/qygl-local.conf

# 复制过滤规则
sudo cp docs/fail2ban-filters.conf /etc/fail2ban/filter.d/qygl.conf
```

### 2. 修改路径配置
根据实际部署路径，修改 `/etc/fail2ban/jail.d/qygl-local.conf` 中的日志路径：

```bash
sudo nano /etc/fail2ban/jail.d/qygl-local.conf
```

需要调整的路径：
- `logpath = /var/log/nginx/qygl-access.log` （Nginx访问日志路径）
- `logpath = /path/to/qy/logs/security-alert.log` （应用安全告警日志路径）

## 三、启动与验证

### 1. 启动服务
```bash
sudo systemctl enable fail2ban
sudo systemctl start fail2ban
```

### 2. 检查状态
```bash
# 查看整体状态
sudo fail2ban-client status

# 查看特定jail状态
sudo fail2ban-client status sshd
sudo fail2ban-client status nginx-login-ban

# 查看被封锁的IP
sudo fail2ban-client banned
```

### 3. 测试封禁功能
```bash
# 手动触发SSH封禁测试（故意输错密码5次）
ssh -p 22022 testuser@your_server_ip

# 检查是否被封禁
sudo fail2ban-client status sshd
```

## 四、常用管理命令

### 解封IP
```bash
# 解封特定IP
sudo fail2ban-client set sshd unbanip 1.2.3.4

# 解封所有jail中的IP
sudo fail2ban-client unban --all
```

### 查看日志
```bash
# 查看fail2ban日志
sudo tail -f /var/log/fail2ban.log

# 查看特定jail的日志
sudo grep "nginx-login-ban" /var/log/fail2ban.log
```

### 重启服务
```bash
sudo systemctl restart fail2ban
# 或
sudo fail2ban-client reload
```

## 五、白名单管理

### 添加信任IP（永不封禁）
编辑 `/etc/fail2ban/jail.d/qygl-local.conf`，在 `ignoreip` 中添加：

```ini
ignoreip = 127.0.0.1 192.168.0.0/16 10.0.0.0/8 你的固定IP
```

## 六、邮件通知配置（可选）

### 配置邮件发送
编辑 `/etc/fail2ban/jail.local`：

```ini
[DEFAULT]
destemail = admin@example.com
sender = fail2ban@example.com
mta = sendmail
action = %(action_mwl)s  # 封禁+邮件+whois查询
```

## 七、高级配置

### 调整容错参数
根据实际需求调整以下参数：
- `maxretry`：失败次数阈值
- `bantime`：封禁时长（秒）
- `findtime`：时间窗口（秒）

### 永久封禁
将 `bantime = -1` 设为永久封禁。

## 八、与现有安全机制协同

Fail2ban 与项目现有安全机制形成三层防护：

1. **应用层**：Express限流（30次/15分钟）+ 账号锁定（5次/15分钟）
2. **Nginx层**：访问限流 + 安全响应头
3. **系统层**：Fail2ban IP封禁（网络层阻断）

## 九、监控与维护

### 定期检查封禁情况
```bash
# 添加到crontab，每日早上检查
0 9 * * * /usr/bin/fail2ban-client status | mail -s "Fail2ban Daily Report" admin@example.com
```

### 日志轮转
Fail2ban会自动处理日志轮转，无需额外配置。

## 十、故障排除

### 封禁过于频繁
- 调整 `maxretry` 和 `findtime` 参数
- 添加更多IP到白名单

### 法规不生效
- 检查日志路径是否正确
- 检查正则表达式是否匹配日志格式
- 查看fail2ban日志：`sudo tail -f /var/log/fail2ban.log`

### 无法解封IP
- 确认IP格式正确
- 检查jail名称是否正确
- 重启fail2ban服务

## 十一、Windows Server替代方案

对于Windows Server环境，可以使用以下替代方案：

1. **Windows防火墙高级安全**
2. **IPSecurity Policy**
3. **第三方软件**：PeerBlock、SimpleWall
4. **IIS动态IP限制**（如果使用IIS）

## 注意事项

1. ⚠️ **测试环境先行**：在生产环境部署前，先在测试环境验证
2. ⚠️ **保留SSH访问**：确保至少有一个SSH连接未被封禁
3. ⚠️ **定期检查**：定期查看封禁日志，避免误封正常用户
4. ⚠️ **备份配置**：修改配置前先备份原文件