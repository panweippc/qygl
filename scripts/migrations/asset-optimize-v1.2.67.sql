-- 资产管理优化（v1.2.67）
-- 1) 清理死枚举 '领用'：代码早已在领用后置状态为'在用'，'领用'不再作为有效状态使用；
--    历史若有遗留数据统一置为'在用'，避免非法枚举值残留。
UPDATE assets SET status = '在用' WHERE status = '领用';

-- 2) 收紧 status 枚举，移除不再使用的 '领用'。
ALTER TABLE assets MODIFY COLUMN status ENUM('在用','闲置','维修','报废') NOT NULL DEFAULT '在用';

-- 3) 台账/盘点查询加速索引。
CREATE INDEX idx_assets_type_status ON assets (assetType, status);
CREATE INDEX idx_assets_department ON assets (department);
CREATE INDEX idx_assets_category ON assets (categoryId);
