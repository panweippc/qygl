-- v1.2.101 客户管理：把销售四表同步产生的「负责人为空的私海客户」回填为公海
-- 背景：旧版 syncCustomerFromFunnel 新建客户时未写 pool_status，落到列默认值 private 且 owner 为空；
--       客户管理前端的认领/分配/编辑/删除按钮都要求「公海」或「负责人=当前用户」，
--       这类客户因此永远没有任何操作按钮。新版同步 INSERT 已显式写 public，本脚本只修历史数据。
-- 幂等：UPDATE 带完整条件，第二次执行影响 0 行。
-- 限定范围：仅来源为销售漏斗的自动同步客户，不动手动新增、Excel 导入、已有负责人的私海客户。

UPDATE customers
SET pool_status = 'public', owner = ''
WHERE is_deleted = 0
  AND IFNULL(pool_status, 'private') = 'private'
  AND source = '销售漏斗'
  AND (owner IS NULL OR TRIM(owner) = '');
