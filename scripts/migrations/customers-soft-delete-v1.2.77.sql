-- customers 表软删除列（客户管理删除改为软删除）
-- 幂等：列已存在则跳过
SET @col_exists = (
  SELECT COUNT(*) FROM information_schema.columns
  WHERE table_schema = DATABASE() AND table_name = 'customers' AND column_name = 'is_deleted'
);
SET @ddl = IF(
  @col_exists = 0,
  "ALTER TABLE customers ADD COLUMN `is_deleted` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '软删除标记（0=未删，1=已删）'",
  'SELECT 1'
);
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
