-- v1.2.102 销售四表：新增「合作伙伴」字段（partner）
-- 背景：原「合作伙伴」列 partner_name 实际存的是客户所属地域（如「左中-努日木镇」），
--       显示名已改为「客户所属」，DB 列名保留以兼容历史数据；另新增独立 partner 列存真正的合作伙伴单位。
-- 三张漏斗表都加列：按进展百分比跨表迁移（意向→重点→成交）时新字段才不会丢。
-- 幂等：information_schema 预检 + PREPARE，列已存在则执行 SELECT 1 空操作。

SET @c1 = (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'sales_intention_funnel' AND column_name = 'partner');
SET @sql1 = IF(@c1 = 0, 'ALTER TABLE `sales_intention_funnel` ADD COLUMN `partner` VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT '''' COMMENT ''合作伙伴单位''', 'SELECT 1');
PREPARE _s1 FROM @sql1; EXECUTE _s1; DEALLOCATE PREPARE _s1;

SET @c2 = (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'sales_key_funnel' AND column_name = 'partner');
SET @sql2 = IF(@c2 = 0, 'ALTER TABLE `sales_key_funnel` ADD COLUMN `partner` VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT '''' COMMENT ''合作伙伴单位''', 'SELECT 1');
PREPARE _s2 FROM @sql2; EXECUTE _s2; DEALLOCATE PREPARE _s2;

SET @c3 = (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'sales_deal_customers' AND column_name = 'partner');
SET @sql3 = IF(@c3 = 0, 'ALTER TABLE `sales_deal_customers` ADD COLUMN `partner` VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT '''' COMMENT ''合作伙伴单位''', 'SELECT 1');
PREPARE _s3 FROM @sql3; EXECUTE _s3; DEALLOCATE PREPARE _s3;
