-- v1.2.106 客户改名后拜访记录不断链：客户名等价对映射表
-- 背景：visit_records.customerName 与销售四表的 customer_name 是「字符串相等」关联。
--       用户在编辑弹窗里改了「客户名单」，原名下的历史拜访记录立即查不到（列表 1 条变 0 条，
--       点开弹窗也是空），用户感知就是「拜访记录被删了」。
--       多条四表记录可能共用同一个客户名，所以不能批量 UPDATE visit_records.customerName，
--       否则其它仍用旧名的记录会一起断链，且会污染历史数据。
-- 内容：新建 visit_customer_aliases（无向等价对）；查询时 BFS 展开连通分量一起匹配，
--       天然支持连续改名 A→B→C 与两组合并，历史数据零改动。
-- 回填：从 sales_table_versions 版本快照提取「同一记录相邻版本的客户名」，
--       把历史上已发生过的改名补登记，生产环境已断链的数据可自动找回。
--       兼容两种快照键名：导入快照用中文「客户名单/客户名称」，编辑快照用英文 customer_name。
-- 幂等：CREATE TABLE IF NOT EXISTS + INSERT ... NOT EXISTS 去重；用自连接模拟 LAG，兼容 MySQL 5.7。

CREATE TABLE IF NOT EXISTS `visit_customer_aliases` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name_a` VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '等价客户名 A',
  `name_b` VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '等价客户名 B',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_vca_a` (`name_a`(191)),
  INDEX `idx_vca_b` (`name_b`(191))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='客户改名等价名映射，保证拜访记录不因改名断链';

-- 历史改名回填：相邻版本客户名不同即视为一次改名，登记无向等价对（双向去重）。
INSERT INTO `visit_customer_aliases` (`name_a`, `name_b`)
SELECT DISTINCT prev.name, curr.name
FROM (
  SELECT v.table_type, v.record_id, v.version,
         COALESCE(
           NULLIF(JSON_UNQUOTE(JSON_EXTRACT(v.data_json, '$.customer_name')), ''),
           NULLIF(JSON_UNQUOTE(JSON_EXTRACT(v.data_json, '$."客户名单"')), ''),
           NULLIF(JSON_UNQUOTE(JSON_EXTRACT(v.data_json, '$."客户名称"')), '')
         ) AS name
  FROM sales_table_versions v
  WHERE v.data_json IS NOT NULL AND JSON_VALID(v.data_json) = 1
) prev
JOIN (
  SELECT v.table_type, v.record_id, v.version,
         COALESCE(
           NULLIF(JSON_UNQUOTE(JSON_EXTRACT(v.data_json, '$.customer_name')), ''),
           NULLIF(JSON_UNQUOTE(JSON_EXTRACT(v.data_json, '$."客户名单"')), ''),
           NULLIF(JSON_UNQUOTE(JSON_EXTRACT(v.data_json, '$."客户名称"')), '')
         ) AS name
  FROM sales_table_versions v
  WHERE v.data_json IS NOT NULL AND JSON_VALID(v.data_json) = 1
) curr
  ON curr.table_type = prev.table_type
 AND curr.record_id = prev.record_id
 AND curr.version = prev.version + 1
 AND curr.name IS NOT NULL AND prev.name IS NOT NULL
 AND TRIM(curr.name) <> '' AND TRIM(prev.name) <> ''
 AND TRIM(curr.name) <> TRIM(prev.name)
WHERE NOT EXISTS (
  SELECT 1 FROM visit_customer_aliases a
  WHERE (a.name_a = prev.name AND a.name_b = curr.name)
     OR (a.name_a = curr.name AND a.name_b = prev.name)
);
