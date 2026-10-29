-- v1.2.83 方案E：成交用户一键转正，标记已生成的成交项目
-- 增加 closing_project_id 列，记录该成交用户已转正生成的成交项目ID（非空即表示已转正，幂等防重复生成）
-- 幂等写法：information_schema 预检，列已存在则跳过（run-migrations multipleStatements + PREPARE/EXECUTE）
SET @col = (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'sales_deal_customers' AND column_name = 'closing_project_id');
SET @sql = IF(@col = 0, 'ALTER TABLE `sales_deal_customers` ADD COLUMN `closing_project_id` INT DEFAULT NULL COMMENT ''该成交用户已转正生成的成交项目ID（方案E：成交用户一键转正，非空表示已转正，避免重复生成）''', 'SELECT 1');
PREPARE _s FROM @sql; EXECUTE _s; DEALLOCATE PREPARE _s;
