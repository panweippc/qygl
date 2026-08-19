/**
 * 系统指标采集器
 * 每 60 秒采集一次 CPU/内存/磁盘/DB延迟/连接池指标，写入 monitor_metrics 表
 * 自动清理 7 天前的旧数据
 */

const METRIC_INTERVAL = 60 * 1000; // 60 秒
const RETENTION_DAYS = 7;

/**
 * 启动指标采集定时任务
 * @param {import('mysql2/promise').Pool} pool 数据库连接池
 */
export function startMetricsCollector(pool) {
  // 确保表存在
  const createTable = `
    CREATE TABLE IF NOT EXISTS monitor_metrics (
      id INT AUTO_INCREMENT PRIMARY KEY,
      metric_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      cpu_percent INT DEFAULT 0,
      mem_total_mb INT DEFAULT 0,
      mem_used_mb INT DEFAULT 0,
      mem_used_percent INT DEFAULT 0,
      disk_total_mb INT DEFAULT 0,
      disk_free_mb INT DEFAULT 0,
      disk_used_percent INT DEFAULT 0,
      db_latency_ms INT DEFAULT 0,
      db_status VARCHAR(10) DEFAULT 'up',
      pool_active INT DEFAULT 0,
      pool_idle INT DEFAULT 0,
      pool_pending INT DEFAULT 0,
      uptime_seconds INT DEFAULT 0,
      app_status VARCHAR(20) DEFAULT 'ok'
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `;

  return pool.query(createTable).then(() => {
    console.log('[监控] monitor_metrics 表已就绪');
    // 立即采集一次
    collectOnce(pool);
    // 定时采集
    setInterval(() => collectOnce(pool), METRIC_INTERVAL);
  }).catch(err => {
    console.error('[监控] 创建 monitor_metrics 表失败:', err.message);
  });
}

/**
 * 采集一次系统指标并写入数据库
 */
async function collectOnce(pool) {
  try {
    const os = await import('os');
    const fs = await import('fs');
    const path = await import('path');
    const { fileURLToPath } = await import('url');

    // 1. 数据库延迟
    let dbLatency = 0;
    let dbStatus = 'up';
    try {
      const t0 = Date.now();
      await pool.query('SELECT 1');
      dbLatency = Date.now() - t0;
    } catch (e) {
      dbStatus = 'down';
      dbLatency = -1;
    }

    // 2. 内存
    const memTotal = os.totalmem();
    const memFree = os.freemem();
    const memUsed = memTotal - memFree;
    const memUsedPercent = memTotal > 0 ? Math.round((memUsed / memTotal) * 100) : 0;

    // 3. 磁盘
    let diskTotal = 0, diskFree = 0, diskUsedPercent = 0;
    try {
      const __filename = fileURLToPath(import.meta.url);
      const __dirname = path.dirname(__filename);
      const stats = await fs.promises.statfs(path.join(__dirname, '..', '..'));
      diskTotal = Math.round(stats.blocks * stats.bsize / 1024 / 1024);
      diskFree = Math.round(stats.bavail * stats.bsize / 1024 / 1024);
      diskUsedPercent = diskTotal > 0 ? Math.round(((diskTotal - diskFree) / diskTotal) * 100) : 0;
    } catch (e) {
      // Windows 可能不支持 statfs，忽略
    }

    // 4. CPU 使用率（快速采样）
    let cpuPercent = 0;
    try {
      const cpus1 = os.cpus();
      const idle1 = cpus1.reduce((a, c) => a + c.times.idle, 0);
      const total1 = cpus1.reduce((a, c) => a + c.times.user + c.times.nice + c.times.sys + c.times.idle + c.times.irq, 0);
      await new Promise(r => setTimeout(r, 100));
      const cpus2 = os.cpus();
      const idle2 = cpus2.reduce((a, c) => a + c.times.idle, 0);
      const total2 = cpus2.reduce((a, c) => a + c.times.user + c.times.nice + c.times.sys + c.times.idle + c.times.irq, 0);
      const totalDiff = total2 - total1;
      const idleDiff = idle2 - idle1;
      cpuPercent = totalDiff > 0 ? Math.round((1 - idleDiff / totalDiff) * 100) : 0;
    } catch (e) {
      cpuPercent = -1;
    }

    // 5. 连接池
    const poolInfo = pool.pool || {};
    const poolActive = poolInfo._connectionCount ?? 0;
    const poolIdle = poolInfo._freeConnections?.length ?? 0;
    const poolPending = poolInfo._queue?.length ?? 0;

    // 6. 综合状态
    const isDegraded = dbStatus === 'down' || memUsedPercent >= 90 || cpuPercent >= 90 || diskUsedPercent >= 95;
    const appStatus = isDegraded ? 'degraded' : 'ok';

    // 写入数据库
    await pool.query(
      `INSERT INTO monitor_metrics 
       (cpu_percent, mem_total_mb, mem_used_mb, mem_used_percent, 
        disk_total_mb, disk_free_mb, disk_used_percent, 
        db_latency_ms, db_status, pool_active, pool_idle, pool_pending, 
        uptime_seconds, app_status) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [cpuPercent, Math.round(memTotal / 1024 / 1024), Math.round(memUsed / 1024 / 1024), memUsedPercent,
       diskTotal, diskFree, diskUsedPercent,
       dbLatency, dbStatus, poolActive, poolIdle, poolPending,
       Math.floor(process.uptime()), appStatus]
    );

    // 清理过期数据
    await pool.query(
      'DELETE FROM monitor_metrics WHERE metric_time < DATE_SUB(NOW(), INTERVAL ? DAY)',
      [RETENTION_DAYS]
    );
  } catch (error) {
    console.error('[监控] 采集指标失败:', error.message);
  }
}
