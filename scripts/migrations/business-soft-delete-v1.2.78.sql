-- 业务数据软删除：为以下表追加 is_deleted 列（MySQL 5.7 兼容，幂等）
-- closing_projects / visit_records / assets / asset_inventory_plans / city_sales / county_sales / town_sales
-- 销售四表(sales_intention_funnel/sales_key_funnel/sales_deal_customers/sales_project_analysis) 由 sales-four-tables.js 的 ensureSchema 自动补列，无需此处处理

SET @db = DATABASE();

-- 1. closing_projects
SET @c = (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = @db AND table_name = 'closing_projects' AND column_name = 'is_deleted');
SET @sql = IF(@c = 0, 'ALTER TABLE closing_projects ADD COLUMN is_deleted TINYINT(1) NOT NULL DEFAULT 0 COMMENT ''软删除标记(0未删,1已删)''', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 2. visit_records
SET @c = (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = @db AND table_name = 'visit_records' AND column_name = 'is_deleted');
SET @sql = IF(@c = 0, 'ALTER TABLE visit_records ADD COLUMN is_deleted TINYINT(1) NOT NULL DEFAULT 0 COMMENT ''软删除标记(0未删,1已删)''', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 3. assets
SET @c = (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = @db AND table_name = 'assets' AND column_name = 'is_deleted');
SET @sql = IF(@c = 0, 'ALTER TABLE assets ADD COLUMN is_deleted TINYINT(1) NOT NULL DEFAULT 0 COMMENT ''软删除标记(0未删,1已删)''', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 4. asset_inventory_plans
SET @c = (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = @db AND table_name = 'asset_inventory_plans' AND column_name = 'is_deleted');
SET @sql = IF(@c = 0, 'ALTER TABLE asset_inventory_plans ADD COLUMN is_deleted TINYINT(1) NOT NULL DEFAULT 0 COMMENT ''软删除标记(0未删,1已删)''', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 5. city_sales
SET @c = (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = @db AND table_name = 'city_sales' AND column_name = 'is_deleted');
SET @sql = IF(@c = 0, 'ALTER TABLE city_sales ADD COLUMN is_deleted TINYINT(1) NOT NULL DEFAULT 0 COMMENT ''软删除标记(0未删,1已删)''', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 6. county_sales
SET @c = (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = @db AND table_name = 'county_sales' AND column_name = 'is_deleted');
SET @sql = IF(@c = 0, 'ALTER TABLE county_sales ADD COLUMN is_deleted TINYINT(1) NOT NULL DEFAULT 0 COMMENT ''软删除标记(0未删,1已删)''', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 7. town_sales
SET @c = (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = @db AND table_name = 'town_sales' AND column_name = 'is_deleted');
SET @sql = IF(@c = 0, 'ALTER TABLE town_sales ADD COLUMN is_deleted TINYINT(1) NOT NULL DEFAULT 0 COMMENT ''软删除标记(0未删,1已删)''', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
