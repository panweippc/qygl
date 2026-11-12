-- v1.2.104 全局回收站登记表 + 资料中心共享分类开关
-- 背景：系统 22 张表带软删标记、31 个删除端点、42 处物理 DELETE FROM，删除后无任何恢复入口。
--       方案B 采用「删除成功后统一登记 + 整行快照 + 模块恢复适配器」，不改动原有删除逻辑。
-- 内容：新建 recycle_bin_items；file_categories 加 is_shared（共享分类：所有登录用户可编辑该分类下内容）。
-- 幂等：表用 CREATE TABLE IF NOT EXISTS；列用 information_schema 预检 + PREPARE。

CREATE TABLE IF NOT EXISTS `recycle_bin_items` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `module` VARCHAR(50) NOT NULL COMMENT '模块标识（customer/asset/announcement/sales/file/article/project-info）',
  `module_label` VARCHAR(100) DEFAULT '' COMMENT '模块中文名',
  `table_name` VARCHAR(100) NOT NULL COMMENT '主记录所在表',
  `record_id` INT NOT NULL COMMENT '主记录ID',
  `title` VARCHAR(500) DEFAULT '' COMMENT '记录标题（列表展示）',
  `deleted_by` VARCHAR(100) DEFAULT '' COMMENT '删除人真实姓名',
  `deleted_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '删除时间',
  `snapshot` LONGTEXT COMMENT '整组快照 JSON：{ main: 主记录整行, children: [{ table, rows }] }',
  `restore_mode` VARCHAR(20) NOT NULL DEFAULT 'undelete' COMMENT 'undelete=翻软删标记 / reinsert=按快照重建',
  `status` VARCHAR(20) NOT NULL DEFAULT 'deleted' COMMENT 'deleted/restored/purged',
  `restored_at` DATETIME DEFAULT NULL COMMENT '恢复时间',
  `restored_by` VARCHAR(100) DEFAULT NULL COMMENT '恢复人',
  `restored_id` INT DEFAULT NULL COMMENT '重建后的新记录ID（reinsert 时可能变化）',
  PRIMARY KEY (`id`),
  KEY `idx_rbi_status` (`status`, `deleted_at`),
  KEY `idx_rbi_deleted_by` (`deleted_by`),
  KEY `idx_rbi_module` (`module`, `record_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='全局回收站登记表（30 天保留）';

SET @c1 = (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'file_categories' AND column_name = 'is_shared');
SET @sql1 = IF(@c1 = 0, 'ALTER TABLE `file_categories` ADD COLUMN `is_shared` TINYINT(1) NOT NULL DEFAULT 0 COMMENT ''共享分类：1=所有登录用户均可编辑该分类下的内容''', 'SELECT 1');
PREPARE _s1 FROM @sql1; EXECUTE _s1; DEALLOCATE PREPARE _s1;
