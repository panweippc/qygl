-- v1.2.82 方案B：成交用户(sales_deal_customers) 关联客户
-- 增加 customerId 列，销售四表↔客户双向绑定（syncCustomerFromFunnel 回写该列）
-- 幂等写法：information_schema 预检，列已存在则跳过（run-migrations multipleStatements + PREPARE/EXECUTE）
SET @col = (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'sales_deal_customers' AND column_name = 'customerId');
SET @sql = IF(@col = 0, 'ALTER TABLE `sales_deal_customers` ADD COLUMN `customerId` INT DEFAULT NULL COMMENT ''关联客户ID（销售四表↔客户 双向绑定，由 syncCustomerFromFunnel 回写）''', 'SELECT 1');
PREPARE _s FROM @sql; EXECUTE _s; DEALLOCATE PREPARE _s;
