# 部署机配置修复说明

## 问题总结
1. **3003端口登录CSRF防护** - CORS_ORIGINS 白名单不完整
2. **角色管理No Data** - roles 表可能没有初始化数据
3. **数据备份不显示** - 前端dist未更新或备份目录不存在

---

## 步骤1：修复 .env 配置

在部署机（192.168.2.142）上编辑 `.env` 文件，修改 `CORS_ORIGINS`：

```bash
# Windows 编辑 .env
notepad .env
```

将 CORS_ORIGINS 修改为：

```
CORS_ORIGINS=http://localhost:3003,http://127.0.0.1:3003,http://localhost:8080,http://127.0.0.1:8080,http://192.168.2.142:3003,http://192.168.2.142:8080,http://192.168.1.13:3003,http://192.168.1.13:8080
```

> ⚠️ 将上面的 `192.168.1.13` 替换为你实际使用的访问IP

---

## 步骤2：初始化数据库角色数据

在部署机上执行以下 SQL（插入默认角色）：

```sql
USE qyglfb;

-- 检查角色表是否有数据
SELECT COUNT(*) FROM roles;

-- 如果为空，插入默认角色
INSERT INTO roles (name, code, description, status, createdAt, updatedAt) VALUES
('系统管理员', 'admin', '系统管理员角色', '启用', NOW(), NOW()),
('总经理', 'manager', '总经理角色', '启用', NOW(), NOW()),
('部门经理', 'dept_manager', '部门经理角色', '启用', NOW(), NOW()),
('普通员工', 'employee', '普通员工角色', '启用', NOW(), NOW());
```

---

## 步骤3：创建备份目录

```bash
# 在部署机上创建备份目录
mkdir backups\manual
mkdir backups\auto
```

---

## 步骤4：重新构建前端（如果8080是Nginx生产环境）

```bash
# 在部署机上执行
cd E:\qygl\qygl
npm run build
```

---

## 步骤5：重启服务

```bash
# PM2 重启后端
pm2 restart qygl

# 如果有 Nginx，也需要重启 Nginx
net stop nginx
net start nginx
```

---

## 步骤6：验证

1. 访问 http://192.168.2.142:3003 测试登录
2. 访问角色管理页面，确认有数据
3. 访问数据备份页面，确认功能正常
