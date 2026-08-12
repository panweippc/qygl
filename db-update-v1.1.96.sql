-- 增量更新脚本 v1.1.96（在已有数据库上安全执行，不会删除任何现有数据）
-- 用途：拜访记录标题基于固定序号(visitNo)，删除记录后不再重排
-- 用法: mysql -h localhost -u 用户名 -p qyglfb < db-update-v1.1.96.sql

SET NAMES utf8mb4;

-- 1. visit_records 表新增拜访序号列（已存在则跳过）
ALTER TABLE `visit_records` ADD COLUMN `visitNo` INT NULL DEFAULT NULL AFTER `townId`;

-- 2. 回填已有记录序号（按乡镇分组、按 id 添加顺序从 1 开始）
UPDATE visit_records vr
JOIN (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY townId ORDER BY id) AS rn
  FROM visit_records
) x ON vr.id = x.id
SET vr.visitNo = x.rn;
