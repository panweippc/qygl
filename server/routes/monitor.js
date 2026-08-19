/**
 * 监控仪表盘 API 路由
 * 提供系统指标历史数据 + 实时数据 + Uptime Kuma 状态代理
 * 仅管理员/总经理可访问
 */

import express from 'express';
import { getUserPrivilege } from '../utils/identity.js';

const router = express.Router();

/**
 * 权限校验中间件：仅系统管理员/总经理可访问
 */
const requireAdminOrManager = async (req, res, next) => {
  try {
    const name = req.user?.name || req.user?.username || '';
    if (!name) {
      return res.status(401).json({ success: false, message: '未登录' });
    }
    const { pool } = req.app.locals;
    const priv = await getUserPrivilege(pool, name);
    const isAllowed = priv.isSystemAdmin || priv.roleName === '系统管理员' || priv.roleName === '总经理' || /总经理/.test(priv.position);
    if (!isAllowed) {
      return res.status(403).json({ success: false, message: '无权限访问监控面板' });
    }
    next();
  } catch (error) {
    return res.status(500).json({ success: false, message: '权限校验失败' });
  }
};

/**
 * GET /api/monitor/metrics
 * 获取历史监控指标（默认最近 24 小时）
 * Query: hours=24
 */
router.get('/monitor/metrics', requireAdminOrManager, async (req, res) => {
  try {
    const { pool } = req.app.locals;
    const hours = parseInt(req.query.hours, 10) || 24;
    const [rows] = await pool.query(
      `SELECT * FROM monitor_metrics 
       WHERE metric_time >= DATE_SUB(NOW(), INTERVAL ? HOUR) 
       ORDER BY metric_time ASC`,
      [hours]
    );
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('获取监控历史数据失败:', error.message);
    res.status(500).json({ success: false, message: '获取监控数据失败' });
  }
});

/**
 * GET /api/monitor/latest
 * 获取最新一条监控指标（实时仪表盘用）
 */
router.get('/monitor/latest', requireAdminOrManager, async (req, res) => {
  try {
    const { pool } = req.app.locals;
    const [rows] = await pool.query(
      'SELECT * FROM monitor_metrics ORDER BY metric_time DESC LIMIT 1'
    );
    res.json({ success: true, data: rows[0] || null });
  } catch (error) {
    console.error('获取最新指标失败:', error.message);
    res.status(500).json({ success: false, message: '获取最新指标失败' });
  }
});

/**
 * GET /api/monitor/health
 * 实时健康检查（复用 /api/health 逻辑，增加权限控制）
 */
router.get('/monitor/health', requireAdminOrManager, async (req, res) => {
  try {
    const { pool } = req.app.locals;
    const os = await import('os');
    const fs = await import('fs');
    const path = await import('path');
    const { fileURLToPath } = await import('url');

    // 数据库延迟
    let dbLatency = 0, dbOk = true;
    try {
      const t0 = Date.now();
      await pool.query('SELECT 1');
      dbLatency = Date.now() - t0;
    } catch (e) { dbOk = false; }

    // 内存
    const memTotal = os.totalmem();
    const memFree = os.freemem();
    const memUsedPercent = Math.round(((memTotal - memFree) / memTotal) * 100);

    // 磁盘
    let diskUsedPercent = 0;
    try {
      const __filename = fileURLToPath(import.meta.url);
      const __dirname = path.dirname(__filename);
      const stats = await fs.promises.statfs(path.join(__dirname, '..', '..'));
      const total = stats.blocks * stats.bsize;
      const free = stats.bavail * stats.bsize;
      diskUsedPercent = total > 0 ? Math.round(((total - free) / total) * 100) : 0;
    } catch (e) {}

    // 连接池
    const poolInfo = pool.pool || {};
    const poolStatus = {
      active: poolInfo._connectionCount ?? 0,
      idle: poolInfo._freeConnections?.length ?? 0,
      pending: poolInfo._queue?.length ?? 0
    };

    res.json({
      success: true,
      data: {
        db: { status: dbOk ? 'up' : 'down', latencyMs: dbLatency },
        memory: {
          totalMb: Math.round(memTotal / 1024 / 1024),
          freeMb: Math.round(memFree / 1024 / 1024),
          usedPercent: memUsedPercent
        },
        disk: { usedPercent: diskUsedPercent },
        pool: poolStatus,
        uptime: Math.floor(process.uptime()),
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: '健康检查失败' });
  }
});

/**
 * GET /api/monitor/uptime-kuma-status
 * 方案A集成：代理获取监控服务状态
 */
router.get('/monitor/uptime-kuma-status', requireAdminOrManager, async (req, res) => {
  const monitorServiceUrl = process.env.MONITOR_SERVICE_URL || 'http://127.0.0.1:3001';
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const resp = await fetch(`${monitorServiceUrl}/api/status-page/1`, {
      signal: controller.signal,
      headers: { 'Accept': 'application/json' }
    });
    clearTimeout(timeout);
    if (resp.ok) {
      const data = await resp.json();
      // 转换数据格式以匹配前端需求
      const monitorList = data.monitors.map(m => ({
        id: m.id,
        name: m.name,
        type: m.type,
        url: m.url,
        status: m.status,
        uptime: m.uptime,
        responseTime: m.responseTime,
        lastCheck: m.lastCheck,
        statusCode: m.statusCode,
        errorMsg: m.errorMsg,
        details: m.details
      }));
      res.json({ 
        success: true, 
        data: { 
          monitorList,
          title: data.title,
          description: data.description 
        },
        monitorServiceUrl 
      });
    } else {
      res.json({ success: false, message: '监控服务未响应', monitorServiceUrl });
    }
  } catch (error) {
    res.json({ 
      success: false, 
      message: '监控服务未启动',
      monitorServiceUrl,
      hint: '监控服务启动命令: node monitor-service.js'
    });
  }
});

export default router;
