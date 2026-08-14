-- 操作日志表新增"变更前后值"字段，用于数据变更审计（审计日志细化）
ALTER TABLE operation_logs
  ADD COLUMN beforeValue TEXT NULL COMMENT '变更前的值(JSON)' AFTER detail,
  ADD COLUMN afterValue TEXT NULL COMMENT '变更后的值(JSON)' AFTER beforeValue;
