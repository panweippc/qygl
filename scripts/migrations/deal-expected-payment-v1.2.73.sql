-- 成交用户表扩展：约定回款日期(expected_payment_date)，用于回款超期预警
-- 与 server/routes/sales-four-tables.js 中 DEAL_COLS / ensureMissingColumns 自愈逻辑保持一致；本迁移供部署机自动执行。
SET @db = DATABASE();

SET @col = (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = @db AND table_name = 'sales_deal_customers' AND column_name = 'expected_payment_date');
SET @sql = IF(@col = 0, 'ALTER TABLE `sales_deal_customers` ADD COLUMN `expected_payment_date` DATE DEFAULT NULL COMMENT ''约定回款日期（用于回款超期预警）''', 'SELECT 1');
PREPARE _s FROM @sql; EXECUTE _s; DEALLOCATE PREPARE _s;
