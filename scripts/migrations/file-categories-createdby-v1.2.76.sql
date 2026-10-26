-- Add createdBy column to file_categories to record category creator name
-- Used for resource-center permission control by category creator
-- Idempotent: skip if column already exists (compatible with all MySQL 5.7/8.x)

SET @db_name = DATABASE();
SELECT COUNT(*) INTO @col_exists
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = @db_name
  AND TABLE_NAME = 'file_categories'
  AND COLUMN_NAME = 'createdBy';

SET @stmt = IF(@col_exists = 0,
  'ALTER TABLE file_categories ADD COLUMN createdBy VARCHAR(100) NULL',
  'SELECT 1');
PREPARE _add_fc_createdBy FROM @stmt;
EXECUTE _add_fc_createdBy;
DEALLOCATE PREPARE _add_fc_createdBy;
