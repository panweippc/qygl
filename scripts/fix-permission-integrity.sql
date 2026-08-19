-- =============================================
-- 权限系统完整性修复脚本
-- 1. 清理 role_permissions 重复数据
-- 2. 添加 UNIQUE(roleId, menuId) 约束防止未来重复
-- 3. 验证权限数据完整性
-- =============================================

USE qyglfb;

-- 步骤1：删除 role_permissions 中的重复授权（同一角色同一菜单只保留最小 id）
DELETE rp1 FROM role_permissions rp1
INNER JOIN role_permissions rp2 ON rp1.roleId = rp2.roleId 
  AND rp1.menuId = rp2.menuId 
  AND rp1.id > rp2.id;

-- 步骤2：添加唯一约束（如果不存在）
-- 先检查是否已有此约束
SET @dbname = DATABASE();
SET @tablename = 'role_permissions';
SET @indexname = 'uk_role_menu';
SELECT COUNT(*) INTO @index_exists FROM information_schema.statistics 
WHERE table_schema = @dbname AND table_name = @tablename AND index_name = @indexname;

SET @sql = IF(@index_exists = 0,
  'ALTER TABLE role_permissions ADD UNIQUE INDEX uk_role_menu (roleId, menuId)',
  'SELECT "UNIQUE constraint already exists" AS info');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 步骤3：验证结果
SELECT '=== 权限数据验证 ===' AS info;

-- 检查是否还有重复
SELECT '重复检查' AS check_type, 
  COUNT(*) as duplicate_groups FROM (
  SELECT roleId, menuId, COUNT(*) as cnt 
  FROM role_permissions 
  GROUP BY roleId, menuId 
  HAVING cnt > 1
) AS dup;

-- 各角色权限统计
SELECT 
  r.name AS '角色',
  COUNT(rp.menuId) AS '菜单数量',
  GROUP_CONCAT(m.name ORDER BY m.sort SEPARATOR ', ') AS '菜单列表'
FROM roles r
LEFT JOIN role_permissions rp ON r.id = rp.roleId
LEFT JOIN menus m ON rp.menuId = m.id
GROUP BY r.id
ORDER BY r.id;
