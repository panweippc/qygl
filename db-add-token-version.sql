-- =====================================================================
-- 迁移：为 users 表添加 tokenVersion 列（会话版本号，支持"管理员强制下线/踢人"）
-- 兼容 MySQL 5.7 / 8.0（用 information_schema 判断，避免 ADD COLUMN IF NOT EXISTS）
-- 直接复制执行即可
-- =====================================================================
SET @col_exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'tokenVersion'
);
SET @sql := IF(@col_exists = 0,
  'ALTER TABLE users ADD COLUMN tokenVersion INT NOT NULL DEFAULT 0 COMMENT ''会话版本号（管理员踢人用）''',
  'SELECT ''tokenVersion 列已存在，跳过'' AS message'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
