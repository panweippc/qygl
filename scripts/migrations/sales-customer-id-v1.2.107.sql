-- v1.2.107 销售四表/大项目进展接入「客户标识」关联（方案7）
-- 背景：拜访记录长期靠 visit_records.customerName 与四表 customer_name 字符串相等来关联，
--       客户一改名就断链，还会按新名另建项目骨架与客户档案，产生一堆孤儿数据。
--       别名等价表(v1.2.106)解决「找回」，本迁移解决「不再依赖名字」：给记录落一个稳定的
--       customers.id，查询时优先按标识关联，名称/等价名作为兜底，两者取并集。
-- 内容：意向/重点/大项目进展三表加 customer_id；成交表已有 customerId 列，沿用不重复加。
--       回填历史：按 TRIM 后的客户名匹配 customers，只补 NULL 的行，不覆盖已有标识。
-- 幂等：information_schema 预检 + PREPARE（兼容 MySQL 5.7）；UPDATE 只处理 NULL，可重复执行。

SET @c1 = (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'sales_intention_funnel' AND column_name = 'customer_id');
SET @sql1 = IF(@c1 = 0, 'ALTER TABLE `sales_intention_funnel` ADD COLUMN `customer_id` INT NULL COMMENT ''客户主数据标识，改名后保持稳定''', 'SELECT 1');
PREPARE _s1 FROM @sql1; EXECUTE _s1; DEALLOCATE PREPARE _s1;

SET @c2 = (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'sales_key_funnel' AND column_name = 'customer_id');
SET @sql2 = IF(@c2 = 0, 'ALTER TABLE `sales_key_funnel` ADD COLUMN `customer_id` INT NULL COMMENT ''客户主数据标识，改名后保持稳定''', 'SELECT 1');
PREPARE _s2 FROM @sql2; EXECUTE _s2; DEALLOCATE PREPARE _s2;

SET @c3 = (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'sales_project_analysis' AND column_name = 'customer_id');
SET @sql3 = IF(@c3 = 0, 'ALTER TABLE `sales_project_analysis` ADD COLUMN `customer_id` INT NULL COMMENT ''客户主数据标识，改名后保持稳定''', 'SELECT 1');
PREPARE _s3 FROM @sql3; EXECUTE _s3; DEALLOCATE PREPARE _s3;

-- 回填三张新列
UPDATE `sales_intention_funnel` f
JOIN `customers` c ON TRIM(c.name) = TRIM(f.customer_name) AND c.is_deleted = 0
SET f.customer_id = c.id WHERE f.customer_id IS NULL;

UPDATE `sales_key_funnel` f
JOIN `customers` c ON TRIM(c.name) = TRIM(f.customer_name) AND c.is_deleted = 0
SET f.customer_id = c.id WHERE f.customer_id IS NULL;

UPDATE `sales_project_analysis` p
JOIN `customers` c ON TRIM(c.name) = TRIM(p.customer_name) AND c.is_deleted = 0
SET p.customer_id = c.id WHERE p.customer_id IS NULL;

-- 成交表沿用历史 customerId 列（列不存在时跳过，避免迁移失败）
SET @c4 = (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'sales_deal_customers' AND column_name = 'customerId');
SET @sql4 = IF(@c4 > 0, 'UPDATE `sales_deal_customers` d JOIN `customers` c ON TRIM(c.name) = TRIM(d.customer_name) AND c.is_deleted = 0 SET d.customerId = c.id WHERE d.customerId IS NULL', 'SELECT 1');
PREPARE _s4 FROM @sql4; EXECUTE _s4; DEALLOCATE PREPARE _s4;

-- 全局拜访记录已有 customer_id 列，但历史行可能为空，按客户名补齐
SET @c5 = (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'visit_records' AND column_name = 'customer_id');
SET @sql5 = IF(@c5 > 0, 'UPDATE `visit_records` v JOIN `customers` c ON TRIM(c.name) = TRIM(v.customerName) AND c.is_deleted = 0 SET v.customer_id = c.id WHERE v.customer_id IS NULL', 'SELECT 1');
PREPARE _s5 FROM @sql5; EXECUTE _s5; DEALLOCATE PREPARE _s5;

-- 给拜访记录按客户标识查询补索引（幂等）
SET @i1 = (SELECT COUNT(*) FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = 'visit_records' AND index_name = 'idx_vr_customer_id');
SET @isql1 = IF(@i1 = 0, 'ALTER TABLE `visit_records` ADD INDEX `idx_vr_customer_id` (`customer_id`)', 'SELECT 1');
PREPARE _is1 FROM @isql1; EXECUTE _is1; DEALLOCATE PREPARE _is1;
