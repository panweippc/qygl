-- =============================================
-- 资产管理模块 (v1.2.51) 数据库迁移脚本
-- 在 MySQL 数据库 qyglfb 中执行
-- 说明：原「物资管理(tools)」菜单改名为「资产管理」，
--       旧 tools 表保留归档，不删除。
-- =============================================

USE qyglfb;

-- 资产分类（父类型 fixed/intangible/consumable + 子分类）
CREATE TABLE IF NOT EXISTS asset_categories (
  id INT AUTO_INCREMENT PRIMARY KEY,
  parentType ENUM('fixed','intangible','consumable') NOT NULL DEFAULT 'fixed',
  name VARCHAR(50) NOT NULL,
  sort INT NOT NULL DEFAULT 0,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 资产主表
CREATE TABLE IF NOT EXISTS assets (
  id INT AUTO_INCREMENT PRIMARY KEY,
  assetCode VARCHAR(30) NOT NULL,
  name VARCHAR(100) NOT NULL,
  assetType ENUM('fixed','intangible','consumable') NOT NULL DEFAULT 'fixed',
  categoryId INT NULL,
  quantity INT NOT NULL DEFAULT 1,
  unit VARCHAR(10) NOT NULL DEFAULT '台',
  acquireDate DATE NULL,
  source VARCHAR(100) NULL,
  originalValue DECIMAL(12,2) NOT NULL DEFAULT 0,
  residualValue DECIMAL(12,2) NOT NULL DEFAULT 0,
  depMethod VARCHAR(30) NULL,
  responsibleUser VARCHAR(50) NULL,
  department VARCHAR(50) NULL,
  location VARCHAR(100) NULL,
  carrier VARCHAR(200) NULL,
  status ENUM('在用','领用','闲置','维修','报废') NOT NULL DEFAULT '在用',
  expireDate DATE NULL,
  renewNoticeDate DATE NULL,
  remark VARCHAR(255) NULL,
  createdBy VARCHAR(50) NULL,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_asset_code (assetCode)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 资产生命周期轨迹
CREATE TABLE IF NOT EXISTS asset_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  assetId INT NOT NULL,
  action VARCHAR(30) NOT NULL,
  fromStatus VARCHAR(20) NULL,
  toStatus VARCHAR(20) NULL,
  operator VARCHAR(50) NULL,
  detail VARCHAR(255) NULL,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  KEY idx_asset_logs_asset (assetId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 盘点单（v2 功能预留）
CREATE TABLE IF NOT EXISTS asset_inventories (
  id INT AUTO_INCREMENT PRIMARY KEY,
  inventoryNo VARCHAR(30) NULL,
  title VARCHAR(100) NULL,
  status ENUM('进行中','已完成') NOT NULL DEFAULT '进行中',
  operator VARCHAR(50) NULL,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 默认分类
INSERT IGNORE INTO asset_categories (parentType, name, sort) VALUES
('fixed', '办公设备', 1),
('fixed', '电子设备', 2),
('fixed', '家具', 3),
('fixed', '车辆', 4),
('intangible', '软件授权', 1),
('intangible', '专利', 2),
('intangible', '商标/著作权', 3),
('intangible', '域名', 4),
('consumable', '办公文具', 1),
('consumable', '工具耗材', 2);

-- 菜单：物资管理 -> 资产管理（顺序接在月报之后，sort=3）
INSERT IGNORE INTO menus (parentId, name, path, component, icon, sort, status, createdAt, updatedAt)
VALUES (0, '资产管理', '/asset-management', 'AssetManagementView', '📦', 3, '启用', NOW(), NOW());

-- 为系统管理员、总经理分配全部菜单权限
INSERT IGNORE INTO role_permissions (roleId, menuId, createdAt)
SELECT r.id, m.id, NOW()
FROM roles r CROSS JOIN menus m
WHERE r.name IN ('系统管理员','总经理') AND m.path = '/asset-management';

-- 为其他所有角色分配基础办公菜单（含资产管理）
INSERT IGNORE INTO role_permissions (roleId, menuId, createdAt)
SELECT r.id, m.id, NOW()
FROM roles r CROSS JOIN menus m
WHERE r.name NOT IN ('系统管理员','总经理') AND m.path = '/asset-management';
