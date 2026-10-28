-- 删除「销售目标」菜单及其权限关联（v1.2.79）
-- 理由：销售目标菜单的数据口径与成交项目/市县镇三级销售均对不上，按用户决策下线该菜单。
-- 幂等：按 path 精确删除菜单记录，并清理 role_permissions 中引用该菜单的关联行；若菜单不存在，子查询返回 NULL，DELETE 影响 0 行，安全可重复执行。
USE qyglfb;

DELETE FROM role_permissions
WHERE menuId = (SELECT id FROM menus WHERE path = '/sales-target');

DELETE FROM menus
WHERE path = '/sales-target';
