-- v1.2.1 升级修复脚本
-- 在 MySQL 中执行此脚本，修复数据库表结构缺失字段的问题

-- 1. 修复 distributed_records 表：添加 approver 和 detail 列
ALTER TABLE `distributed_records` 
  ADD COLUMN `detail` text NULL COMMENT '详情(JSON)' AFTER `status`,
  ADD COLUMN `approver` varchar(255) NULL DEFAULT NULL COMMENT '审批人' AFTER `detail`;

-- 验证修复
-- DESCRIBE distributed_records;
