-- =============================================
-- 资产管理模块 —— 盘点明细表 (v1.2.51 二期)
-- 在 MySQL 数据库 qyglfb 中执行
-- 说明：资产盘点功能所需的明细表。asset_inventories 主表已在
--       asset-management-v1.2.51.sql 中建好（v2 预留），此处补明细表。
-- 幂等：CREATE TABLE IF NOT EXISTS + 跟踪表保证可重复执行。
-- =============================================

USE qyglfb;

-- 盘点明细：每张盘点单对应若干资产，记录账面数量 / 实盘数量 / 差异
CREATE TABLE IF NOT EXISTS asset_inventory_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  inventoryId INT NOT NULL COMMENT '关联 asset_inventories.id',
  assetId INT NULL COMMENT '关联 assets.id',
  bookQuantity INT NOT NULL DEFAULT 0 COMMENT '账面数量（建单时快照）',
  actualQuantity INT NULL COMMENT '实盘数量（盘点时录入，未盘为 NULL）',
  diff INT NOT NULL DEFAULT 0 COMMENT '差异 = 实盘 - 账面',
  note VARCHAR(255) NULL COMMENT '盘点备注',
  checked TINYINT NOT NULL DEFAULT 0 COMMENT '是否已盘',
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  KEY idx_inv_items (inventoryId),
  KEY idx_inv_items_asset (assetId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
