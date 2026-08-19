-- =====================================================
-- OA系统 监控指标存储表
-- 用途：存储后端内置采集器每60秒采集的系统/应用指标
-- 供前端监控仪表盘（/monitor 路由）查询展示曲线
-- 部署：由 server/utils/metrics-collector.js 启动时自动创建
--       本文件仅作为参考与手动初始化用途
-- =====================================================

CREATE TABLE IF NOT EXISTS monitor_metrics (
  id          BIGINT AUTO_INCREMENT PRIMARY KEY,
  ts          DATETIME(3) NOT NULL COMMENT '采集时间（毫秒精度）',
  metric_key  VARCHAR(64) NOT NULL COMMENT '指标键，如 cpu.usage_percent',
  metric_value DOUBLE    NOT NULL COMMENT '指标数值',
  INDEX idx_key_ts (metric_key, ts),
  INDEX idx_ts (ts)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='监控指标时序数据';

-- 采集的指标键清单（供参考，采集器代码为准）：
-- cpu.usage_percent          CPU使用率(%)
-- cpu.load_avg_1m            系统1分钟负载
-- cpu.cores                  CPU核心数
-- memory.system.used_percent 系统内存使用率(%)
-- memory.system.free_mb      系统可用内存(MB)
-- memory.process.rss_mb      Node进程常驻内存(MB)
-- memory.process.heap_mb     Node进程堆使用(MB)
-- disk.used_percent          磁盘使用率(%)
-- disk.free_mb               磁盘可用空间(MB)
-- db.latency_ms              数据库查询延迟(ms)
-- db.status                  数据库连通状态(1=up,0=down)
-- db.pool.active             连接池活跃连接数
-- db.pool.idle               连接池空闲连接数
-- db.pool.pending            连接池等待队列长度
-- app.uptime_seconds         应用运行时长(秒)
-- app.status_ok              综合健康状态(1=ok,0=degraded)

-- 数据保留策略：默认保留30天，由采集器每日自动清理
-- 如需调整，修改 server/utils/metrics-collector.js 中的 RETENTION_DAYS
