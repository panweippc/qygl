-- 清理脚本：彻底移除「物资管理」旧模块（方案 A 归档后的彻底删除）
-- 执行顺序：先删角色权限关联，再删菜单，最后删 tools 表
-- 幂等：DELETE 按 path 精确匹配，DROP TABLE IF EXISTS 可重复执行

-- 1. 删除 /tool-inventory 菜单对应的角色权限
DELETE FROM role_permissions
WHERE menuId IN (SELECT id FROM menus WHERE path = '/tool-inventory');

-- 2. 删除「物资管理」菜单记录（菜单管理界面不再出现）
DELETE FROM menus
WHERE path = '/tool-inventory';

-- 3. 删除 tools 表（历史物资数据将永久丢失，已与用户确认彻底删除）
DROP TABLE IF EXISTS tools;
