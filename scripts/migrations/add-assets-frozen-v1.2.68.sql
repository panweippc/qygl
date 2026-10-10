-- 为 assets 表补充盘点冻结标记 frozen（盘点开始/完成时批量置位）
-- 幂等：列已存在则跳过（部分 MySQL 版本不支持 ADD COLUMN IF NOT EXISTS，故用动态 SQL 预检）
SET @db = DATABASE();
SET @col = (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = @db AND table_name = 'assets' AND column_name = 'frozen');
SET @sql = IF(@col = 0,
  'ALTER TABLE assets ADD COLUMN frozen TINYINT NOT NULL DEFAULT 0 COMMENT ''盘点冻结标记：1=盘点冻结中，盘点完成前不可领用/归还/维修/报废/调拨''',
  'SELECT 1');
PREPARE _add_frozen FROM @sql;
EXECUTE _add_frozen;
DEALLOCATE PREPARE _add_frozen;
