-- 其他 OA 申请事后补录 v1.2.96
-- 将「事后补录」能力从请假扩展到报销/招待/会议/出差 4 类（与请假 v1.2.95 同源）。
-- 每类新增 is_supplementary（是否补录）+ supplementary_reason（补录说明，开启时必填）。
-- 幂等：加列前校验 information_schema。

SET @db = DATABASE();

-- 1. reimbursements
SET @c1 = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='reimbursements' AND COLUMN_NAME='is_supplementary');
SET @s1 = IF(@c1=0, 'ALTER TABLE reimbursements ADD COLUMN is_supplementary TINYINT(1) NOT NULL DEFAULT 0 COMMENT ''是否事后补录：0=正常报销，1=事后补录''', 'SELECT 1');
PREPARE stmt1 FROM @s1; EXECUTE stmt1; DEALLOCATE PREPARE stmt1;

SET @c2 = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='reimbursements' AND COLUMN_NAME='supplementary_reason');
SET @s2 = IF(@c2=0, 'ALTER TABLE reimbursements ADD COLUMN supplementary_reason VARCHAR(500) DEFAULT NULL COMMENT ''补录说明：开启补录时必填''', 'SELECT 1');
PREPARE stmt2 FROM @s2; EXECUTE stmt2; DEALLOCATE PREPARE stmt2;

-- 2. entertainment_expenses
SET @c3 = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='entertainment_expenses' AND COLUMN_NAME='is_supplementary');
SET @s3 = IF(@c3=0, 'ALTER TABLE entertainment_expenses ADD COLUMN is_supplementary TINYINT(1) NOT NULL DEFAULT 0 COMMENT ''是否事后补录：0=正常招待，1=事后补录''', 'SELECT 1');
PREPARE stmt3 FROM @s3; EXECUTE stmt3; DEALLOCATE PREPARE stmt3;

SET @c4 = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='entertainment_expenses' AND COLUMN_NAME='supplementary_reason');
SET @s4 = IF(@c4=0, 'ALTER TABLE entertainment_expenses ADD COLUMN supplementary_reason VARCHAR(500) DEFAULT NULL COMMENT ''补录说明：开启补录时必填''', 'SELECT 1');
PREPARE stmt4 FROM @s4; EXECUTE stmt4; DEALLOCATE PREPARE stmt4;

-- 3. meetings
SET @c5 = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='meetings' AND COLUMN_NAME='is_supplementary');
SET @s5 = IF(@c5=0, 'ALTER TABLE meetings ADD COLUMN is_supplementary TINYINT(1) NOT NULL DEFAULT 0 COMMENT ''是否事后补录：0=正常会议，1=事后补录''', 'SELECT 1');
PREPARE stmt5 FROM @s5; EXECUTE stmt5; DEALLOCATE PREPARE stmt5;

SET @c6 = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='meetings' AND COLUMN_NAME='supplementary_reason');
SET @s6 = IF(@c6=0, 'ALTER TABLE meetings ADD COLUMN supplementary_reason VARCHAR(500) DEFAULT NULL COMMENT ''补录说明：开启补录时必填''', 'SELECT 1');
PREPARE stmt6 FROM @s6; EXECUTE stmt6; DEALLOCATE PREPARE stmt6;

-- 4. business_trip_applications
SET @c7 = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='business_trip_applications' AND COLUMN_NAME='is_supplementary');
SET @s7 = IF(@c7=0, 'ALTER TABLE business_trip_applications ADD COLUMN is_supplementary TINYINT(1) NOT NULL DEFAULT 0 COMMENT ''是否事后补录：0=正常出差，1=事后补录''', 'SELECT 1');
PREPARE stmt7 FROM @s7; EXECUTE stmt7; DEALLOCATE PREPARE stmt7;

SET @c8 = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='business_trip_applications' AND COLUMN_NAME='supplementary_reason');
SET @s8 = IF(@c8=0, 'ALTER TABLE business_trip_applications ADD COLUMN supplementary_reason VARCHAR(500) DEFAULT NULL COMMENT ''补录说明：开启补录时必填''', 'SELECT 1');
PREPARE stmt8 FROM @s8; EXECUTE stmt8; DEALLOCATE PREPARE stmt8;
