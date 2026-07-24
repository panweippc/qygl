-- =============================================
-- v1.1.39 迁移脚本
-- 1. 新增"业务中心经理"角色
-- 2. 将陈东从"工程师"变更为"业务中心经理"并分配角色
-- =============================================

-- 1. 创建"业务中心经理"角色（如不存在）
INSERT IGNORE INTO roles (name, createdAt)
SELECT '业务中心经理', NOW()
WHERE NOT EXISTS (SELECT 1 FROM roles WHERE name = '业务中心经理');

-- 2. 更新陈东的岗位和角色
UPDATE employees e
JOIN roles r ON r.name = '业务中心经理'
SET e.position = '业务中心经理',
    e.roleId = r.id,
    e.department = '业务中心'
WHERE e.name = '陈东';
