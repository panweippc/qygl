-- =============================================
-- 资产盘点增强 (v1.2.57)
-- 在 MySQL 数据库 qyglfb 中执行
-- 包含：冻结库存标记、盘点差异处理闭环、周期盘点计划
-- 幂等：ALTER 用信息_schema 预检；CREATE TABLE IF NOT EXISTS
-- =============================================

USE qyglfb;

-- 1) 资产冻结标记：盘点进行中时锁定库存，防止其他操作改动数量
SET @col_exists = (SELECT COUNT(*) FROM information_schema.columns
  WHERE table_schema = 'qyglfb' AND table_name = 'assets' AND column_name = 'frozen');
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE assets ADD COLUMN frozen TINYINT NOT NULL DEFAULT 0 COMMENT ''盘点冻结标记(1=盘点中锁定)''',
  'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 2) 盘点差异处理闭环：完成盘点后，对差异项生成待处理记录，可逐条处置闭环
CREATE TABLE IF NOT EXISTS asset_inventory_discrepancies (
  id INT AUTO_INCREMENT PRIMARY KEY,
  inventoryId INT NOT NULL COMMENT '关联 asset_inventories.id',
  itemId INT NOT NULL COMMENT '关联 asset_inventory_items.id',
  assetId INT NULL COMMENT '关联 assets.id',
  assetCode VARCHAR(30) NULL,
  name VARCHAR(100) NULL,
  diffType ENUM('盘盈','盘亏','账实相符') NOT NULL DEFAULT '盘盈',
  bookQuantity INT NOT NULL DEFAULT 0 COMMENT '账面数量',
  actualQuantity INT NULL COMMENT '实盘数量',
  diff INT NOT NULL DEFAULT 0 COMMENT '差异 = 实盘 - 账面',
  status ENUM('待处理','已处理') NOT NULL DEFAULT '待处理',
  handleAction VARCHAR(30) NULL COMMENT '处置方式：盘盈入库/盘亏报废/备注说明',
  handleNote VARCHAR(255) NULL COMMENT '处置说明',
  handledBy VARCHAR(50) NULL,
  handledAt DATETIME NULL,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  KEY idx_disc_inv (inventoryId),
  KEY idx_disc_asset (assetId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3) 周期盘点计划：支持设定周期性盘点，按计划生成盘点单
CREATE TABLE IF NOT EXISTS asset_inventory_plans (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL COMMENT '计划名称',
  frequency ENUM('每月','每季度','每年') NOT NULL DEFAULT '每月',
  dayOfMonth TINYINT NOT NULL DEFAULT 1 COMMENT '执行日（当月的第几日）',
  status ENUM('启用','停用') NOT NULL DEFAULT '启用',
  lastRunAt DATETIME NULL COMMENT '上次生成时间',
  nextRunAt DATETIME NULL COMMENT '下次计划生成时间',
  operator VARCHAR(50) NULL COMMENT '创建人',
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
