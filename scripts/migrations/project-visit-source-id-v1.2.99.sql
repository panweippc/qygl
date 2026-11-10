-- v1.2.99 拜访记录删除同步：大项目进展·拜访记录子表增加来源标识
-- 用途：删除全局 visit_records 时按 source_visit_id 精确删掉子表镜像行，避免按内容匹配误删手工录入的拜访
-- 幂等写法：information_schema 预检，已存在则跳过（run-migrations multipleStatements + PREPARE/EXECUTE）
SET @col = (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'sales_project_visit_records' AND column_name = 'source_visit_id');
SET @sql = IF(@col = 0, 'ALTER TABLE `sales_project_visit_records` ADD COLUMN `source_visit_id` INT DEFAULT NULL COMMENT ''来源全局拜访记录ID（visit_records.id），手工录入为空''', 'SELECT 1');
PREPARE _s FROM @sql; EXECUTE _s; DEALLOCATE PREPARE _s;

SET @idx = (SELECT COUNT(*) FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = 'sales_project_visit_records' AND index_name = 'idx_source_visit');
SET @sql2 = IF(@idx = 0, 'ALTER TABLE `sales_project_visit_records` ADD INDEX `idx_source_visit` (`source_visit_id`)', 'SELECT 1');
PREPARE _s2 FROM @sql2; EXECUTE _s2; DEALLOCATE PREPARE _s2;
