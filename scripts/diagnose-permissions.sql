-- =============================================
-- 权限诊断脚本
-- 用于排查权限修改不生效的问题
-- 在 MySQL 中执行此脚本，将结果发给我
-- =============================================

USE qyglfb;

SELECT '=== 1. 角色列表 ===' AS info;
SELECT id, name, status FROM roles ORDER BY id;

SELECT '=== 2. 菜单列表(去重后) ===' AS info;
SELECT id, name, path, parentId, sort, status FROM menus ORDER BY id;

SELECT '=== 3. 各角色权限数量 ===' AS info;
SELECT 
  r.id AS role_id,
  r.name AS role_name,
  COUNT(rp.menuId) AS permission_count,
  GROUP_CONCAT(m.name ORDER BY m.sort SEPARATOR ', ') AS menu_list
FROM roles r
LEFT JOIN role_permissions rp ON r.id = rp.roleId
LEFT JOIN menus m ON rp.menuId = m.id
GROUP BY r.id
ORDER BY r.id;

SELECT '=== 4. 员工角色分配 ===' AS info;
SELECT id, name, department, position, roleId FROM employees ORDER BY id;

SELECT '=== 5. 验证: 总经理角色的具体权限 ===' AS info;
SELECT m.id, m.name, m.path 
FROM role_permissions rp 
JOIN menus m ON rp.menuId = m.id 
JOIN roles r ON rp.roleId = r.id 
WHERE r.name = '总经理'
ORDER BY m.sort;
