-- 资产管理优化（v1.2.67）
-- 1) 清理死枚举 '领用'：代码早已在领用后置状态为'在用'，'领用'不再作为有效状态使用；
--    历史若有遗留数据统一置为'在用'，避免非法枚举值残留。
UPDATE assets SET status = '在用' WHERE status = '领用';

-- 2) 收紧 status 枚举，移除不再使用的 '领用'。
ALTER TABLE assets MODIFY COLUMN status ENUM('在用','闲置','维修','报废') NOT NULL DEFAULT '在用';

-- 3) 台账/盘点查询加速索引（幂等：information_schema 预检 + PREPARE/EXECUTE 条件 DROP，避免重复执行报 Duplicate key name）。
SET @db = DATABASE();

SET @s1 = (SELECT IF(COUNT(*)>0,'DROP INDEX idx_assets_type_status ON assets','SELECT 1') FROM information_schema.statistics WHERE table_schema=@db AND table_name='assets' AND index_name='idx_assets_type_status');
PREPARE s1 FROM @s1; EXECUTE s1; DEALLOCATE PREPARE s1;
CREATE INDEX idx_assets_type_status ON assets (assetType, status);

SET @s2 = (SELECT IF(COUNT(*)>0,'DROP INDEX idx_assets_department ON assets','SELECT 1') FROM information_schema.statistics WHERE table_schema=@db AND table_name='assets' AND index_name='idx_assets_department');
PREPARE s2 FROM @s2; EXECUTE s2; DEALLOCATE PREPARE s2;
CREATE INDEX idx_assets_department ON assets (department);

SET @s3 = (SELECT IF(COUNT(*)>0,'DROP INDEX idx_assets_category ON assets','SELECT 1') FROM information_schema.statistics WHERE table_schema=@db AND table_name='assets' AND index_name='idx_assets_category');
PREPARE s3 FROM @s3; EXECUTE s3; DEALLOCATE PREPARE s3;
CREATE INDEX idx_assets_category ON assets (categoryId);
