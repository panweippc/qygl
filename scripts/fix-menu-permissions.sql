-- =============================================
-- 菜单权限修复脚本 (v1.2.3)
-- 修复所有角色的菜单权限，确保非管理员用户也能看到侧边栏
-- 注意：role_permissions 表结构只有 id, roleId, menuId, createdAt 四列
-- 在 MySQL 中执行此脚本
-- =============================================

USE qyglfb;

-- 步骤1：确保所有侧边栏菜单存在
INSERT IGNORE INTO menus (parentId, name, path, component, icon, sort, status, createdAt, updatedAt) VALUES
(0, 'OA办公', '/oa-office', 'OAWorkflowView', '📝', 1, '启用', NOW(), NOW()),
(0, '月报', '/monthly-report', 'MonthlyReportView', '📅', 2, '启用', NOW(), NOW()),
(0, '工具入库', '/tool-inventory', 'ToolInventoryView', '🔧', 3, '启用', NOW(), NOW()),
(0, '文件存储', '/file-storage', 'FileStorageView', '📁', 4, '启用', NOW(), NOW()),
(0, '知识库', '/knowledge-base', 'KnowledgeBaseView', '📚', 5, '启用', NOW(), NOW()),
(0, '消息中心', '/message-center', 'MessageCenterView', '💬', 6, '启用', NOW(), NOW()),
(0, '产品分类', '/project-category', 'ProjectCategoryView', '📦', 7, '启用', NOW(), NOW()),
(0, '销售漏斗', '/sales-funnel', 'SalesFunnelView', '🔻', 8, '启用', NOW(), NOW()),
(0, '销售目标', '/sales-target', 'SalesTargetView', '🎯', 9, '启用', NOW(), NOW()),
(0, '客户管理', '/customer-management', 'CustomerManagementView', '👥', 10, '启用', NOW(), NOW()),
(0, '机会跟进', '/sales-opportunity', 'SalesOpportunityView', '💡', 11, '启用', NOW(), NOW()),
(0, '成交项目', '/closing-project', 'ClosingProjectView', '✅', 12, '启用', NOW(), NOW()),
(0, '员工管理', '/employee-management', 'EmployeeManagementView', '👤', 13, '启用', NOW(), NOW()),
(0, '操作日志', '/operation-log', 'OperationLogView', '📋', 14, '启用', NOW(), NOW()),
(0, '安全事件监控', '/security-alerts', 'SecurityAlertView', '🛡️', 15, '启用', NOW(), NOW()),
(0, '系统监控', '/monitor', 'MonitorDashboardView', '📊', 16, '启用', NOW(), NOW());

-- 步骤2：为系统管理员和总经理分配全部菜单权限
INSERT IGNORE INTO role_permissions (roleId, menuId, createdAt)
SELECT r.id, m.id, NOW()
FROM roles r
CROSS JOIN menus m
WHERE r.name IN ('系统管理员', '总经理')
  AND m.path IN (
    '/oa-office', '/monthly-report', '/tool-inventory', '/file-storage', '/knowledge-base', '/message-center',
    '/project-category', '/sales-funnel', '/sales-target', '/customer-management', '/sales-opportunity', '/closing-project',
    '/employee-management', '/operation-log', '/security-alerts', '/monitor'
  );

-- 步骤3：为其他所有角色分配基础菜单权限（办公管理）
INSERT IGNORE INTO role_permissions (roleId, menuId, createdAt)
SELECT r.id, m.id, NOW()
FROM roles r
CROSS JOIN menus m
WHERE r.name NOT IN ('系统管理员', '总经理')
  AND m.path IN ('/oa-office', '/monthly-report', '/tool-inventory', '/file-storage', '/knowledge-base', '/message-center');

-- 步骤4：销售部经理额外分配业务管理权限
INSERT IGNORE INTO role_permissions (roleId, menuId, createdAt)
SELECT r.id, m.id, NOW()
FROM roles r
CROSS JOIN menus m
WHERE r.name = '销售部经理'
  AND m.path IN ('/project-category', '/sales-funnel', '/sales-target', '/customer-management', '/sales-opportunity', '/closing-project');

-- 步骤5：财务总监额外分配系统管理权限
INSERT IGNORE INTO role_permissions (roleId, menuId, createdAt)
SELECT r.id, m.id, NOW()
FROM roles r
CROSS JOIN menus m
WHERE r.name = '财务总监'
  AND m.path IN ('/employee-management', '/operation-log');

-- 步骤6：技术部经理额外分配系统和业务权限
INSERT IGNORE INTO role_permissions (roleId, menuId, createdAt)
SELECT r.id, m.id, NOW()
FROM roles r
CROSS JOIN menus m
WHERE r.name = '技术部经理'
  AND m.path IN ('/employee-management', '/operation-log', '/project-category', '/closing-project');

-- 步骤7：验证结果
SELECT 
  r.name AS '角色',
  COUNT(rp.menuId) AS '菜单数量',
  GROUP_CONCAT(m.name ORDER BY m.sort SEPARATOR ', ') AS '菜单列表'
FROM roles r
LEFT JOIN role_permissions rp ON r.id = rp.roleId
LEFT JOIN menus m ON rp.menuId = m.id
GROUP BY r.id
ORDER BY r.id;
