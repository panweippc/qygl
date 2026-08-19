-- =============================================
-- 菜单去重修复脚本 (v1.2.4)
-- 1. 删除 menus 表中的重复记录（保留每组 path 最小的 id）
-- 2. 清理 role_permissions 中的孤儿数据
-- 3. 添加 UNIQUE INDEX 防止未来重复
-- 在 MySQL 中执行此脚本
-- =============================================

USE qyglfb;

-- 步骤1：删除重复菜单，保留每个 path 最小的 id
DELETE m1 FROM menus m1
INNER JOIN menus m2 ON m1.path = m2.path AND m1.id > m2.id;

-- 步骤2：删除 role_permissions 中指向已删除菜单的孤儿记录
DELETE rp FROM role_permissions rp
LEFT JOIN menus m ON rp.menuId = m.id
WHERE m.id IS NULL;

-- 步骤3：删除 role_permissions 中的重复授权（同一角色同一菜单只保留最小 id）
DELETE rp1 FROM role_permissions rp1
INNER JOIN role_permissions rp2 ON rp1.roleId = rp2.roleId 
  AND rp1.menuId = rp2.menuId 
  AND rp1.id > rp2.id;

-- 步骤4：添加唯一索引防止未来重复（如果不存在）
-- 注意：如果已有重复数据未清理干净会报错，上面的步骤已经清理完毕
ALTER TABLE menus ADD UNIQUE INDEX idx_path (path);

-- 步骤5：验证去重结果
SELECT '菜单去重结果' AS info;
SELECT path, COUNT(*) AS cnt FROM menus GROUP BY path HAVING cnt > 1;
SELECT * FROM menus ORDER BY id;

SELECT '权限去重结果' AS info;
SELECT roleId, menuId, COUNT(*) AS cnt FROM role_permissions GROUP BY roleId, menuId HAVING cnt > 1;
