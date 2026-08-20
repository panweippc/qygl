-- v1.2.1 升级修复脚本（幂等版，兼容 MySQL 5.7 / 8.0）
-- 修复 distributed_records 表：detail / approver 列可能在旧版本数据库中缺失
-- 可重复执行：已存在的列会自动跳过

SET NAMES utf8b4;

-- ---------- detail 列 ----------
SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'distributed_records' AND COLUMN_NAME = 'detail');
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE `distributed_records` ADD COLUMN `detail` text NULL COMMENT ''下发详情'' AFTER `comment`',
  'SELECT ''detail 列已存在，跳过'' AS msg');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ---------- approver 列 ----------
SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'distributed_records' AND COLUMN_NAME = 'approver');
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE `distributed_records` ADD COLUMN `approver` varchar(255) NULL DEFAULT NULL COMMENT ''审批人'' AFTER `detail`',
  'SELECT ''approver 列已存在，跳过'' AS msg');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ---------- 验证 ----------
SELECT COLUMN_NAME, COLUMN_TYPE, COLUMN_COMMENT
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'distributed_records'
ORDER BY ORDINAL_POSITION;
