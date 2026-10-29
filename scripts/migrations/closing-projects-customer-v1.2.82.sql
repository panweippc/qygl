-- v1.2.82 方案A：成交项目(closing_projects) 关联客户
-- 增加 customerId 列，与 customers 表双向绑定（成交项目归属客户，可由客户详情下钻）
-- 幂等写法：information_schema 预检，列已存在则跳过（run-migrations multipleStatements + PREPARE/EXECUTE）
SET @col = (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'closing_projects' AND column_name = 'customerId');
SET @sql = IF(@col = 0, 'ALTER TABLE `closing_projects` ADD COLUMN `customerId` INT DEFAULT NULL COMMENT ''关联客户ID（closing_projects↔customers 双向绑定，成交项目归属客户）''', 'SELECT 1');
PREPARE _s FROM @sql; EXECUTE _s; DEALLOCATE PREPARE _s;
