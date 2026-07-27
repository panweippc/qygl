-- 同步 role_permissions 表数据
-- 在另一台电脑上运行: mysql -u HY -pHYruanjian01 -h localhost qyglfb < scripts/sync_role_permissions.sql

DELETE FROM role_permissions;

-- 系统管理员 (roleId=1)
INSERT INTO role_permissions (roleId, menuId, createdAt) VALUES
(1, 1, NOW()), (1, 5, NOW()), (1, 6, NOW()), (1, 7, NOW()),
(1, 9, NOW()), (1, 10, NOW()), (1, 11, NOW()), (1, 12, NOW()),
(1, 13, NOW()), (1, 14, NOW()), (1, 15, NOW()), (1, 16, NOW()),
(1, 18, NOW()), (1, 19, NOW()), (1, 20, NOW());

-- 普通员工 (roleId=2)
INSERT INTO role_permissions (roleId, menuId, createdAt) VALUES
(2, 5, NOW()), (2, 6, NOW()), (2, 7, NOW()), (2, 9, NOW()),
(2, 10, NOW()), (2, 13, NOW()), (2, 14, NOW()), (2, 15, NOW()), (2, 16, NOW());

-- 财务总监 (roleId=3)
INSERT INTO role_permissions (roleId, menuId, createdAt) VALUES
(3, 5, NOW()), (3, 6, NOW()), (3, 7, NOW()), (3, 9, NOW()),
(3, 10, NOW()), (3, 11, NOW()), (3, 12, NOW()), (3, 13, NOW()),
(3, 14, NOW()), (3, 15, NOW()), (3, 16, NOW()),
(3, 18, NOW()), (3, 19, NOW()), (3, 20, NOW());

-- 技术部经理 (roleId=4)
INSERT INTO role_permissions (roleId, menuId, createdAt) VALUES
(4, 5, NOW()), (4, 6, NOW()), (4, 7, NOW()), (4, 9, NOW()),
(4, 10, NOW()), (4, 11, NOW()), (4, 13, NOW()), (4, 14, NOW()),
(4, 15, NOW()), (4, 16, NOW()),
(4, 18, NOW()), (4, 19, NOW()), (4, 20, NOW());

-- 销售部经理 (roleId=5)
INSERT INTO role_permissions (roleId, menuId, createdAt) VALUES
(5, 5, NOW()), (5, 6, NOW()), (5, 7, NOW()), (5, 9, NOW()),
(5, 10, NOW()), (5, 11, NOW()), (5, 12, NOW()), (5, 13, NOW()),
(5, 14, NOW()), (5, 15, NOW()), (5, 16, NOW()),
(5, 18, NOW()), (5, 19, NOW()), (5, 20, NOW());

-- 总经理 (roleId=6)
INSERT INTO role_permissions (roleId, menuId, createdAt) VALUES
(6, 1, NOW()), (6, 5, NOW()), (6, 6, NOW()), (6, 7, NOW()),
(6, 9, NOW()), (6, 10, NOW()), (6, 11, NOW()), (6, 12, NOW()),
(6, 13, NOW()), (6, 14, NOW()), (6, 15, NOW()), (6, 16, NOW()),
(6, 18, NOW()), (6, 19, NOW()), (6, 20, NOW());

-- 业务中心经理 (roleId=7)
INSERT INTO role_permissions (roleId, menuId, createdAt) VALUES
(7, 5, NOW()), (7, 6, NOW()), (7, 7, NOW()), (7, 9, NOW()),
(7, 10, NOW()), (7, 11, NOW()), (7, 12, NOW()), (7, 13, NOW()),
(7, 14, NOW()), (7, 15, NOW()), (7, 16, NOW()),
(7, 18, NOW()), (7, 19, NOW()), (7, 20, NOW());
