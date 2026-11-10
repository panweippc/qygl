-- v1.2.100 下线旧版内蒙古地图销售漏斗 / 机会跟进菜单
-- 用途：删除「机会跟进」(/sales-opportunity) 与「销售目标」(/sales-target) 两条死菜单及其角色授权，
--       并把「销售漏斗」菜单的 component 指向当前四表页，避免仍挂已删除的旧页面名。
-- 幂等写法：按 path 精确删除，重复执行影响 0 行；UPDATE 带旧值条件，只修一次。
-- 说明：/sales-target 曾由 v1.2.79 删过，但 server.js 的菜单种子会在每次启动时重新插入，
--       本轮已同步移除该种子条目，故此处再删一次即可彻底干净。

DELETE FROM role_button_permissions
WHERE menuId IN (SELECT id FROM menus WHERE path IN ('/sales-opportunity', '/sales-target'));

DELETE FROM role_permissions
WHERE menuId IN (SELECT id FROM menus WHERE path IN ('/sales-opportunity', '/sales-target'));

DELETE FROM menus
WHERE path IN ('/sales-opportunity', '/sales-target');

UPDATE menus
SET component = 'SalesFourTablesView', updatedAt = NOW()
WHERE path = '/sales-funnel' AND component = 'SalesFunnelView';
