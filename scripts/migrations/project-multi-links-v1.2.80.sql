-- v1.2.80 项目链接支持多个网址（方案A：单字段按换行分隔存多个链接）
-- 扩容两张表的链接字段：varchar(255) -> varchar(1000)，约可存 12+ 个网址
-- 幂等写法：information_schema 预检，长度已达 1000 则跳过（run-migrations multipleStatements + PREPARE/EXECUTE）

-- 1) projects.link（保持 NOT NULL 与 utf8mb4 字符集）
SET @ddl = (
  SELECT IF(COUNT(*) = 0,
    'SELECT 1',
    'ALTER TABLE projects MODIFY COLUMN link VARCHAR(1000) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL'
  )
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'projects'
    AND COLUMN_NAME = 'link'
    AND CHARACTER_MAXIMUM_LENGTH < 1000
);
PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 2) category_projects.project_link（保持 NULL 与 utf8mb4 字符集）
SET @ddl = (
  SELECT IF(COUNT(*) = 0,
    'SELECT 1',
    'ALTER TABLE category_projects MODIFY COLUMN project_link VARCHAR(1000) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL'
  )
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'category_projects'
    AND COLUMN_NAME = 'project_link'
    AND CHARACTER_MAXIMUM_LENGTH < 1000
);
PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;
