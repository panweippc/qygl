-- 客户表扩展：公海私海(owner/pool_status) + 下次跟进(next_followup_at) + 提醒标记(followup_reminded) + 来源(source)
-- 与 server/routes/customers.js 中 ensureCustomerColumns 自愈逻辑保持一致；本迁移供部署机自动执行。
SET @db = DATABASE();

SET @col = (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = @db AND table_name = 'customers' AND column_name = 'source');
SET @sql = IF(@col = 0, 'ALTER TABLE customers ADD COLUMN `source` VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT ''来源：销售漏斗/手动录入/导入''', 'SELECT 1');
PREPARE _s FROM @sql; EXECUTE _s; DEALLOCATE PREPARE _s;

SET @col = (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = @db AND table_name = 'customers' AND column_name = 'owner');
SET @sql = IF(@col = 0, 'ALTER TABLE customers ADD COLUMN `owner` VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT '''' COMMENT ''负责人（私海归属，空表示公海）''', 'SELECT 1');
PREPARE _s FROM @sql; EXECUTE _s; DEALLOCATE PREPARE _s;

SET @col = (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = @db AND table_name = 'customers' AND column_name = 'pool_status');
SET @sql = IF(@col = 0, 'ALTER TABLE customers ADD COLUMN `pool_status` VARCHAR(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT ''private'' COMMENT ''公海/私海：public/private''', 'SELECT 1');
PREPARE _s FROM @sql; EXECUTE _s; DEALLOCATE PREPARE _s;

SET @col = (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = @db AND table_name = 'customers' AND column_name = 'next_followup_at');
SET @sql = IF(@col = 0, 'ALTER TABLE customers ADD COLUMN `next_followup_at` DATETIME DEFAULT NULL COMMENT ''下次跟进时间''', 'SELECT 1');
PREPARE _s FROM @sql; EXECUTE _s; DEALLOCATE PREPARE _s;

SET @col = (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = @db AND table_name = 'customers' AND column_name = 'followup_reminded');
SET @sql = IF(@col = 0, 'ALTER TABLE customers ADD COLUMN `followup_reminded` TINYINT(1) DEFAULT 0 COMMENT ''是否已生成跟进提醒''', 'SELECT 1');
PREPARE _s FROM @sql; EXECUTE _s; DEALLOCATE PREPARE _s;
