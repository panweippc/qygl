-- v1.2.103 客户生命周期：归档/复活留痕
-- 背景：客户可能跟进中、暂缓、放弃后过段时间再重新跟进。原状态字段是自由文本，
--       放弃原因与放弃时间无处保存，复活只能靠手动改状态再翻操作日志。
-- 内容：customers 加 3 列（归档时间/归档原因/状态变更时间），新建 customer_status_logs 状态流水表。
-- 幂等：列用 information_schema 预检 + PREPARE；表用 CREATE TABLE IF NOT EXISTS。
-- 历史数据一律不改写：status 旧值（活跃/意向/沉默/流失）保持原样，不自动归档。

SET @c1 = (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'customers' AND column_name = 'archived_at');
SET @sql1 = IF(@c1 = 0, 'ALTER TABLE `customers` ADD COLUMN `archived_at` DATETIME DEFAULT NULL COMMENT ''放弃跟进时间''', 'SELECT 1');
PREPARE _s1 FROM @sql1; EXECUTE _s1; DEALLOCATE PREPARE _s1;

SET @c2 = (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'customers' AND column_name = 'archive_reason');
SET @sql2 = IF(@c2 = 0, 'ALTER TABLE `customers` ADD COLUMN `archive_reason` VARCHAR(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT '''' COMMENT ''放弃跟进原因''', 'SELECT 1');
PREPARE _s2 FROM @sql2; EXECUTE _s2; DEALLOCATE PREPARE _s2;

SET @c3 = (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'customers' AND column_name = 'status_changed_at');
SET @sql3 = IF(@c3 = 0, 'ALTER TABLE `customers` ADD COLUMN `status_changed_at` DATETIME DEFAULT NULL COMMENT ''最近一次状态变更时间''', 'SELECT 1');
PREPARE _s3 FROM @sql3; EXECUTE _s3; DEALLOCATE PREPARE _s3;

CREATE TABLE IF NOT EXISTS `customer_status_logs` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `customer_id` INT NOT NULL COMMENT '客户ID',
  `from_status` VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '变更前状态',
  `to_status` VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '变更后状态',
  `action` VARCHAR(30) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'archive/reactivate/status_change',
  `reason` VARCHAR(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '放弃原因或备注',
  `operator` VARCHAR(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '操作人',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '发生时间',
  PRIMARY KEY (`id`),
  KEY `idx_csl_customer_id` (`customer_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='客户状态变更流水';
