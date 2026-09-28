-- 资产轨迹字段扩充迁移（v1.2.51）
-- 由 Jenkinsfile 部署时通过 scripts/run-migrations.js 自动执行（方案 D）。
-- 幂等：通过 information_schema 判断列是否存在，已存在则跳过 ALTER。

SET @db = DATABASE();

-- ============ asset_logs 表新增列（领用/归还/维修/报废操作明细） ============
SET @o1 = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='asset_logs' AND COLUMN_NAME='opDate');
SET @so1 = IF(@o1=0, 'ALTER TABLE asset_logs ADD COLUMN opDate DATE NULL COMMENT ''操作日期''', 'SELECT 1');
PREPARE stmt FROM @so1; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @o2 = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='asset_logs' AND COLUMN_NAME='planDate');
SET @so2 = IF(@o2=0, 'ALTER TABLE asset_logs ADD COLUMN planDate DATE NULL COMMENT ''预计归还/完成日期''', 'SELECT 1');
PREPARE stmt FROM @so2; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @o3 = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='asset_logs' AND COLUMN_NAME='purpose');
SET @so3 = IF(@o3=0, 'ALTER TABLE asset_logs ADD COLUMN purpose VARCHAR(255) NULL COMMENT ''用途/原因/故障描述''', 'SELECT 1');
PREPARE stmt FROM @so3; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @o4 = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='asset_logs' AND COLUMN_NAME='disposal');
SET @so4 = IF(@o4=0, 'ALTER TABLE asset_logs ADD COLUMN disposal VARCHAR(50) NULL COMMENT ''处置方式(变卖/销毁/回收/捐赠/其他)''', 'SELECT 1');
PREPARE stmt FROM @so4; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @o5 = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='asset_logs' AND COLUMN_NAME='vendor');
SET @so5 = IF(@o5=0, 'ALTER TABLE asset_logs ADD COLUMN vendor VARCHAR(100) NULL COMMENT ''维修供应商/回收处置方''', 'SELECT 1');
PREPARE stmt FROM @so5; EXECUTE stmt; DEALLOCATE PREPARE stmt;
