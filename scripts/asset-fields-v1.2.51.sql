-- 资产管理字段扩充迁移（v1.2.51）
-- 由 Jenkinsfile 部署时通过 scripts/run-migrations.js 自动执行（方案 D）。
-- 幂等：通过 information_schema 判断列是否存在，已存在则跳过 ALTER。

SET @db = DATABASE();

-- ============ assets 表新增列 ============
SET @c1 = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='assets' AND COLUMN_NAME='spec');
SET @s1 = IF(@c1=0, 'ALTER TABLE assets ADD COLUMN spec VARCHAR(100) NULL COMMENT ''规格型号''', 'SELECT 1');
PREPARE stmt FROM @s1; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @c2 = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='assets' AND COLUMN_NAME='sn');
SET @s2 = IF(@c2=0, 'ALTER TABLE assets ADD COLUMN sn VARCHAR(100) NULL COMMENT ''序列号''', 'SELECT 1');
PREPARE stmt FROM @s2; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @c3 = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='assets' AND COLUMN_NAME='unitPrice');
SET @s3 = IF(@c3=0, 'ALTER TABLE assets ADD COLUMN unitPrice DECIMAL(12,2) NULL COMMENT ''单价''', 'SELECT 1');
PREPARE stmt FROM @s3; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @c4 = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='assets' AND COLUMN_NAME='supplier');
SET @s4 = IF(@c4=0, 'ALTER TABLE assets ADD COLUMN supplier VARCHAR(100) NULL COMMENT ''供应商''', 'SELECT 1');
PREPARE stmt FROM @s4; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @c5 = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='assets' AND COLUMN_NAME='invoiceNo');
SET @s5 = IF(@c5=0, 'ALTER TABLE assets ADD COLUMN invoiceNo VARCHAR(100) NULL COMMENT ''发票号''', 'SELECT 1');
PREPARE stmt FROM @s5; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @c6 = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='assets' AND COLUMN_NAME='warrantyDate');
SET @s6 = IF(@c6=0, 'ALTER TABLE assets ADD COLUMN warrantyDate DATE NULL COMMENT ''保修到期日''', 'SELECT 1');
PREPARE stmt FROM @s6; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @c7 = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='assets' AND COLUMN_NAME='usefulLifeYears');
SET @s7 = IF(@c7=0, 'ALTER TABLE assets ADD COLUMN usefulLifeYears INT NULL COMMENT ''折旧/摊销年限(年)''', 'SELECT 1');
PREPARE stmt FROM @s7; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @c8 = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='assets' AND COLUMN_NAME='availableQuantity');
SET @s8 = IF(@c8=0, 'ALTER TABLE assets ADD COLUMN availableQuantity INT NULL COMMENT ''可用数量(耗材)''', 'SELECT 1');
PREPARE stmt FROM @s8; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @c9 = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='assets' AND COLUMN_NAME='accountKey');
SET @s9 = IF(@c9=0, 'ALTER TABLE assets ADD COLUMN accountKey VARCHAR(200) NULL COMMENT ''账号密钥(无形资产)''', 'SELECT 1');
PREPARE stmt FROM @s9; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 历史耗材记录补充可用数量（避免 NULL 影响领用校验）
UPDATE assets SET availableQuantity = quantity WHERE assetType='consumable' AND availableQuantity IS NULL;

-- ============ asset_logs 表新增列（出入库/领用/报废明细台账） ============
SET @l1 = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='asset_logs' AND COLUMN_NAME='qty');
SET @sl1 = IF(@l1=0, 'ALTER TABLE asset_logs ADD COLUMN qty INT NULL DEFAULT 1 COMMENT ''操作数量''', 'SELECT 1');
PREPARE stmt FROM @sl1; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @l2 = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='asset_logs' AND COLUMN_NAME='recipient');
SET @sl2 = IF(@l2=0, 'ALTER TABLE asset_logs ADD COLUMN recipient VARCHAR(50) NULL COMMENT ''领用人''', 'SELECT 1');
PREPARE stmt FROM @sl2; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @l3 = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='asset_logs' AND COLUMN_NAME='recipientDept');
SET @sl3 = IF(@l3=0, 'ALTER TABLE asset_logs ADD COLUMN recipientDept VARCHAR(50) NULL COMMENT ''领用部门''', 'SELECT 1');
PREPARE stmt FROM @sl3; EXECUTE stmt; DEALLOCATE PREPARE stmt;
