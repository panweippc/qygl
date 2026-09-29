-- =============================================
-- 资产管理模块 —— 盘点单 status 枚举扩展 (v1.2.51)
-- 在 MySQL 数据库 qyglfb 中执行
-- 说明：作废盘点单接口 (PUT /asset-inventories/:id/void) 将 status 置为
--       '已作废'，但原建表 ENUM('进行中','已完成') 未包含该值，
--       strict 模式下写入报 "Data truncated for column 'status'"。
--       本迁移把 '已作废' 纳入合法枚举值。
-- 幂等：MODIFY COLUMN 使用相同定义 + 新增值，重复执行不会报错；
--       若枚举已含 '已作废'，再 MODIFY 回同一 ENUM 仍是 no-op（无害）。
-- =============================================

USE qyglfb;

ALTER TABLE asset_inventories
  MODIFY COLUMN status ENUM('进行中','已完成','已作废') NOT NULL DEFAULT '进行中';
