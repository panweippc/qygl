-- 请假事后补录 v1.2.95
-- 支持员工突发请假时先口头报备、事后回系统补正式记录，并显式标记「补录」+ 必填补录说明。
-- 幂等：加列前校验 information_schema。

-- 1. leave_applications 增加「是否补录」标记
SET @db = DATABASE();
SET @c1 = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='leave_applications' AND COLUMN_NAME='is_supplementary');
SET @s1 = IF(@c1=0, 'ALTER TABLE leave_applications ADD COLUMN is_supplementary TINYINT(1) NOT NULL DEFAULT 0 COMMENT ''是否事后补录：0=正常请假，1=事后补录''', 'SELECT 1');
PREPARE stmt1 FROM @s1; EXECUTE stmt1; DEALLOCATE PREPARE stmt1;

-- 2. leave_applications 增加「补录说明」
SET @c2 = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='leave_applications' AND COLUMN_NAME='supplementary_reason');
SET @s2 = IF(@c2=0, 'ALTER TABLE leave_applications ADD COLUMN supplementary_reason VARCHAR(500) DEFAULT NULL COMMENT ''补录说明：开启补录时必填，说明口头报备时间/原因等''', 'SELECT 1');
PREPARE stmt2 FROM @s2; EXECUTE stmt2; DEALLOCATE PREPARE stmt2;
