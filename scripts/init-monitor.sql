-- =====================================================
-- 监控系统数据库表结构
-- 运行方式: mysql -u root -p qyglfb < scripts/init-monitor.sql
-- 或者在数据库管理工具中执行
-- =====================================================

-- 创建监控指标表
CREATE TABLE IF NOT EXISTS `monitor_metrics` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `metric_type` VARCHAR(50) NOT NULL COMMENT '指标类型: system/database/application',
  `metric_name` VARCHAR(100) NOT NULL COMMENT '指标名称',
  `metric_value` DECIMAL(20,4) NOT NULL COMMENT '指标值',
  `metric_unit` VARCHAR(20) DEFAULT '' COMMENT '单位',
  `tags` JSON COMMENT '额外标签信息',
  `collected_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '采集时间',
  INDEX `idx_metric_type_name` (`metric_type`, `metric_name`),
  INDEX `idx_collected_at` (`collected_at`),
  INDEX `idx_metric_type_time` (`metric_type`, `collected_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='监控指标数据表';

-- 创建告警记录表
CREATE TABLE IF NOT EXISTS `monitor_alerts` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `alert_type` VARCHAR(50) NOT NULL COMMENT '告警类型',
  `alert_level` VARCHAR(20) NOT NULL COMMENT '告警级别: INFO/WARNING/HIGH/CRITICAL',
  `alert_message` TEXT NOT NULL COMMENT '告警消息',
  `alert_value` DECIMAL(20,4) COMMENT '触发告警的值',
  `threshold_value` DECIMAL(20,4) COMMENT '阈值',
  `metric_tags` JSON COMMENT '相关指标标签',
  `is_resolved` TINYINT DEFAULT 0 COMMENT '是否已解决: 0=未解决, 1=已解决',
  `resolved_at` TIMESTAMP NULL COMMENT '解决时间',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  INDEX `idx_alert_type` (`alert_type`),
  INDEX `idx_alert_level` (`alert_level`),
  INDEX `idx_is_resolved` (`is_resolved`),
  INDEX `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='监控告警记录表';

-- 插入初始化数据
INSERT INTO `monitor_metrics` (`metric_type`, `metric_name`, `metric_value`, `metric_unit`, `tags`) VALUES
('system', 'cpu_usage', 0, '%', '{"status": "initialized"}'),
('system', 'memory_usage', 0, '%', '{"status": "initialized"}'),
('database', 'db_latency', 0, 'ms', '{"status": "initialized"}'),
('application', 'node_memory', 0, '%', '{"status": "initialized"}')
ON DUPLICATE KEY UPDATE metric_value=metric_value;