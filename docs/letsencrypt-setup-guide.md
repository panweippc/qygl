# =====================================================
# Let's Encrypt SSL 证书申请与自动续期指南
# 适用环境：Linux服务器（Ubuntu/Debian/CentOS）
# =====================================================

## 一、安装 Certbot

### Ubuntu/Debian
```bash
sudo apt update
sudo apt install certbot python3-certbot-nginx -y
```

### CentOS/RHEL
```bash
sudo yum install epel-release -y
sudo yum install certbot python3-certbot-nginx -y
```

## 二、获取 SSL 证书

### 方式1：自动配置 Nginx（推荐）
```bash
# 自动配置并获取证书（会修改nginx配置）
sudo certbot --nginx -d your-domain.com -d www.your-domain.com

# 按提示操作：
# 1. 输入邮箱地址（用于续期提醒）
# 2. 同意服务条款
# 3. 选择是否共享邮箱
# 4. 选择HTTP重定向到HTTPS（建议选择2）
```

### 方式2：仅获取证书（手动配置Nginx）
```bash
# 仅获取证书，不自动修改nginx配置
sudo certbot certonly --nginx -d your-domain.com -d www.your-domain.com

# 证书将保存在：/etc/letsencrypt/live/your-domain.com/
# - fullchain.pem：证书链（nginx需要）
# - privkey.pem：私钥
# - chain.pem：中间证书
```

### 方式3：使用 DNS 验证（适用通配符证书）
```bash
# 申请通配符证书：*.your-domain.com
sudo certbot certonly --manual --preferred-challenges dns -d "*.your-domain.com" -d your-domain.com

# 按提示添加DNS TXT记录，等待生效后继续
```

## 三、配置 Nginx 使用证书

### 1. 备份原配置
```bash
sudo cp /etc/nginx/sites-available/qygl /etc/nginx/sites-available/qygl.backup
```

### 2. 使用HTTPS模板配置
```bash
# 复制HTTPS模板
sudo cp docs/nginx-https-complete.conf /etc/nginx/sites-available/qygl-https

# 修改配置中的域名和路径
sudo nano /etc/nginx/sites-available/qygl-https
```

需要修改的内容：
- `server_name your-domain.com www.your-domain.com;` → 改为实际域名
- 证书路径 `/etc/letsencrypt/live/your-domain.com/` → 改为实际证书路径
- 前端路径 `root /path/to/qy/dist;` → 改为实际路径

### 3. 启用HTTPS配置
```bash
# 创建软链接（如果使用sites-enabled）
sudo ln -s /etc/nginx/sites-available/qygl-https /etc/nginx/sites-enabled/

# 或直接在主配置中include
sudo nano /etc/nginx/nginx.conf
# 添加：include /etc/nginx/sites-available/qygl-https;
```

### 4. 测试并重载Nginx
```bash
# 测试配置语法
sudo nginx -t

# 重载配置
sudo systemctl reload nginx
```

## 四、自动续期配置

### 1. 测试续期命令
```bash
sudo certbot renew --dry-run
```

### 2. Certbot自动创建续期任务
Certbot安装时会自动创建systemd timer或cron任务，检查：

```bash
# 查看systemd timer状态
sudo systemctl status certbot.timer

# 查看cron任务
sudo crontab -l
```

### 3. 手动配置续期（如果需要）
```bash
# 编辑crontab
sudo crontab -e

# 添加每天凌晨2点检查续期，续期成功后重载nginx
0 2 * * * certbot renew --quiet --post-hook "systemctl reload nginx"
```

### 4. 续期后钩子配置
在 `/etc/letsencrypt/renewal/your-domain.com.conf` 中添加：

```ini
[renewalparams]
post_hook = systemctl reload nginx
```

## 五、证书管理

### 查看证书信息
```bash
# 查看已安装的证书
sudo certbot certificates

# 查看证书到期时间
sudo certbot certificates | grep "Expiry"
```

### 手动续期
```bash
# 手动续期所有证书
sudo certbot renew

# 续期特定证书
sudo certbot renew --cert-name your-domain.com
```

### 撤销证书
```bash
# 撤销证书
sudo certbot revoke --cert-path /etc/letsencrypt/live/your-domain.com/cert.pem

# 删除证书文件
sudo certbot delete --cert-name your-domain.com
```

## 六、安全加固

### 1. 强制HTTPS
已在Nginx配置中添加HSTS头：
```nginx
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
```

### 2. SSL Labs测试
访问 https://www.ssllabs.com/ssltest/ 测试SSL配置安全性，目标A级。

### 3. 定期更新
```bash
# 更新certbot
sudo apt update && sudo apt upgrade certbot

# 或使用snap（如果通过snap安装）
sudo snap refresh certbot
```

## 七、多域名/子域名配置

### 主域名 + www
```bash
sudo certbot --nginx -d example.com -d www.example.com
```

### 多个子域名
```bash
sudo certbot --nginx -d example.com -d www.example.com -d api.example.com -d admin.example.com
```

### 通配符证书（需DNS验证）
```bash
sudo certbot certonly --manual --preferred-challenges dns -d "*.example.com" -d example.com
```

## 八、故障排除

### 证书申请失败
```bash
# 检查域名DNS解析
dig example.com
nslookup example.com

# 检查80端口是否开放
sudo netstat -tlnp | grep :80

# 检查防火墙
sudo ufw status
sudo firewall-cmd --list-all
```

### Nginx启动失败
```bash
# 查看错误日志
sudo tail -f /var/log/nginx/error.log

# 检查配置语法
sudo nginx -t

# 检查证书文件权限
sudo ls -la /etc/letsencrypt/live/your-domain.com/
```

### 续期失败
```bash
# 查看续期日志
sudo journalctl -u certbot.timer -f

# 手动测试续期
sudo certbot renew --force-renewal
```

### 证书链问题
```bash
# 检查证书链
openssl s_client -connect your-domain.com:443 -servername your-domain.com

# 验证证书
sudo certbot certificates
```

## 九、性能优化

### 启用HTTP/2
HTTPS配置中已启用 `http2`，验证：
```bash
curl -I -k --http2 https://your-domain.com
```

### OCSP Stapling
HTTPS配置中已启用，验证：
```bash
openssl s_client -connect your-domain.com:443 -status -tlsextdebug < /dev/null 2>&1 | grep "OCSP"
```

## 十、监控与告警

### 证书到期监控
```bash
# 添加到crontab，提前30天告警
0 9 * * * /usr/bin/certbot certificates | grep "EXPIRES" | awk '{if($NF < 30) print $0}' | mail -s "SSL Certificate Expiring Soon" admin@example.com
```

### SSL配置监控
使用 Uptime Robot 或类似服务监控HTTPS可用性。

## 注意事项

1. ⚠️ **域名解析**：确保域名已正确解析到服务器IP
2. ⚠️ **防火墙开放**：开放80和443端口
3. ⚠️ **自动续期**：确保续期任务正常运行
4. ⚠️ **备份证书**：定期备份 `/etc/letsencrypt/` 目录
5. ⚠️ **测试环境**：先在测试环境验证配置
6. ⚠️ **HSTS预加载**：添加到预加载列表前仔细测试