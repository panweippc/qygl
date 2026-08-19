/**
 * 轻量级监控服务 - 方案A实现
 * 模拟 Uptime Kuma API，监控系统各组件状态
 * 端口: 3001
 */
import http from 'http';
import mysql from 'mysql2/promise';

const PORT = 3001;
const CHECK_INTERVAL = 30000; // 30秒检查一次

// 从环境变量或配置文件读取数据库配置
// 尝试从.env文件加载配置
import fs from 'fs';
import path from 'path';

function loadEnvConfig() {
  try {
    const envPath = path.resolve('.env');
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf-8');
      const lines = content.split('\n');
      const config = {};
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
          const [key, ...valueParts] = trimmed.split('=');
          config[key.trim()] = valueParts.join('=').trim();
        }
      }
      return config;
    }
  } catch (e) {
    console.warn('[监控服务] 加载.env配置失败:', e.message);
  }
  return {};
}

const envConfig = loadEnvConfig();
const DB_CONFIG = {
  host: process.env.DB_HOST || envConfig.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || envConfig.DB_PORT || '3306'),
  user: process.env.DB_USER || envConfig.DB_USER || 'HY',
  password: process.env.DB_PASSWORD || envConfig.DB_PASSWORD || 'HYruanjian01',
  database: process.env.DB_NAME || envConfig.DB_NAME || 'qyglfb'
};

// 监控目标配置
const monitors = [
  {
    id: 1,
    name: '后端API服务',
    type: 'http',
    url: 'http://localhost:3005/api/health',
    method: 'GET',
    checkParams: { heartbeatInterval: 20, timeout: 10 },
    status: 'unknown',
    uptime: 100,
    responseTime: 0,
    lastCheck: null,
    statusCode: null,
    errorMsg: null,
    details: null
  },
  {
    id: 2,
    name: '前端页面',
    type: 'http',
    url: 'http://localhost:3003/index.html',
    method: 'GET',
    checkParams: { heartbeatInterval: 30, timeout: 30 },
    status: 'unknown',
    uptime: 100,
    responseTime: 0,
    lastCheck: null,
    statusCode: null,
    errorMsg: null,
    details: null
  },
  {
    id: 3,
    name: 'MySQL数据库',
    type: 'mysql',
    config: DB_CONFIG,
    checkParams: { heartbeatInterval: 15, timeout: 10 },
    status: 'unknown',
    uptime: 100,
    responseTime: 0,
    lastCheck: null,
    statusCode: null,
    errorMsg: null,
    details: null
  }
];

// 状态历史记录
const statusHistory = {};
const MAX_HISTORY = 1440; // 保留24小时数据（30秒间隔）

// HTTP请求检查
async function checkHttp(url, timeout = 5000) {
  return new Promise((resolve) => {
    const start = Date.now();
    let responseData = '';
    const req = http.get(url, { timeout }, (res) => {
      const responseTime = Date.now() - start;
      res.on('data', (chunk) => { responseData += chunk; });
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 400) {
          let details = null;
          try {
            const parsed = JSON.parse(responseData);
            details = {
              version: parsed.version?.node || null,
              dbStatus: parsed.db?.status || null,
              dbLatency: parsed.db?.latencyMs || null,
              memUsed: parsed.memory?.system?.usedPercent || null,
              cpuUsage: parsed.cpu?.usagePercent || null
            };
          } catch { /* 非JSON响应，忽略 */ }
          resolve({
            status: 'up',
            responseTime,
            statusCode: res.statusCode,
            errorMsg: null,
            details
          });
        } else {
          resolve({
            status: 'down',
            responseTime,
            statusCode: res.statusCode,
            errorMsg: `HTTP ${res.statusCode}: ${res.statusMessage || '响应异常'}`,
            details: null
          });
        }
      });
    });

    req.on('error', (err) => {
      resolve({
        status: 'down',
        responseTime: Date.now() - start,
        statusCode: null,
        errorMsg: err.message,
        details: null
      });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({
        status: 'down',
        responseTime: timeout,
        statusCode: null,
        errorMsg: `请求超时（${timeout}ms）`,
        details: null
      });
    });
  });
}

// MySQL连接检查
async function checkMysql(config) {
  const start = Date.now();
  try {
    const connection = await mysql.createConnection({
      host: config.host,
      port: config.port,
      user: config.user,
      password: config.password,
      database: config.database,
      connectionLimit: 1
    });
    await connection.query('SELECT 1');
    // 获取数据库详细信息
    const [versionRows] = await connection.query('SELECT VERSION() as version');
    const [dbRows] = await connection.query('SELECT COUNT(*) as tableCount FROM information_schema.tables WHERE table_schema = ?', [config.database]);
    await connection.end();
    const responseTime = Date.now() - start;
    return {
      status: 'up',
      responseTime,
      statusCode: 200,
      errorMsg: null,
      details: {
        version: versionRows[0]?.version || null,
        tableCount: dbRows[0]?.tableCount || 0
      }
    };
  } catch (error) {
    const responseTime = Date.now() - start;
    return {
      status: 'down',
      responseTime,
      statusCode: null,
      errorMsg: error.message,
      details: null
    };
  }
}

// 更新状态历史
function updateHistory(monitorId, status, responseTime) {
  if (!statusHistory[monitorId]) {
    statusHistory[monitorId] = [];
  }
  
  statusHistory[monitorId].push({
    timestamp: new Date().toISOString(),
    status,
    responseTime
  });

  // 限制历史记录长度
  if (statusHistory[monitorId].length > MAX_HISTORY) {
    statusHistory[monitorId].shift();
  }

  // 计算可用性（最近100条记录）
  const recent = statusHistory[monitorId].slice(-100);
  const upCount = recent.filter(h => h.status === 'up').length;
  monitors.find(m => m.id === monitorId).uptime = recent.length > 0 
    ? Math.round((upCount / recent.length) * 10000) / 100 
    : 100;
}

// 执行所有检查
async function performChecks() {
  for (const monitor of monitors) {
    try {
      let result;
      if (monitor.type === 'http') {
        result = await checkHttp(monitor.url, monitor.checkParams.timeout * 1000);
      } else if (monitor.type === 'mysql') {
        result = await checkMysql(monitor.config);
      } else {
        result = { status: 'unknown', responseTime: 0, statusCode: null, errorMsg: '未知监控类型', details: null };
      }

      monitor.status = result.status;
      monitor.responseTime = result.responseTime;
      monitor.lastCheck = new Date().toISOString();
      monitor.statusCode = result.statusCode;
      monitor.errorMsg = result.errorMsg;
      monitor.details = result.details;

      updateHistory(monitor.id, result.status, result.responseTime);
      console.log(`[监控] ${monitor.name}: ${result.status} (${result.responseTime}ms)${result.errorMsg ? ' - ' + result.errorMsg : ''}`);
    } catch (error) {
      monitor.status = 'down';
      monitor.lastCheck = new Date().toISOString();
      monitor.errorMsg = error.message;
      updateHistory(monitor.id, 'down', 0);
      console.error(`[监控] ${monitor.name}: 检查失败 - ${error.message}`);
    }
  }
}

// 获取状态页数据（模拟 Uptime Kuma API）
function getStatusPageData() {
  return {
    id: 1,
    title: '宏友智慧办公平台监控',
    description: '系统服务状态监控面板',
    monitors: monitors.map(m => ({
      id: m.id,
      name: m.name,
      type: m.type,
      url: m.url || `${m.config?.host}:${m.config?.port}/${m.config?.database}`,
      status: m.status,
      uptime: m.uptime,
      responseTime: m.responseTime,
      lastCheck: m.lastCheck,
      statusCode: m.statusCode,
      errorMsg: m.errorMsg,
      details: m.details
    })),
    updatedAt: new Date().toISOString()
  };
}

// 创建HTTP服务器
const server = http.createServer(async (req, res) => {
  // 设置CORS头
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const path = url.pathname;

    // 状态页API
    if (path === '/api/status-page/1' || path === '/api/status') {
      res.writeHead(200);
      res.end(JSON.stringify(getStatusPageData(), null, 2));
      return;
    }

    // 健康检查
    if (path === '/health') {
      const allUp = monitors.every(m => m.status === 'up');
      res.writeHead(200);
      res.end(JSON.stringify({
        status: allUp ? 'ok' : 'degraded',
        monitors: monitors.map(m => ({ name: m.name, status: m.status })),
        timestamp: new Date().toISOString()
      }));
      return;
    }

    // 触发立即检查
    if (path === '/api/check-now') {
      res.writeHead(200);
      res.end(JSON.stringify({ success: true, message: '检查已触发' }));
      performChecks(); // 异步执行
      return;
    }

    // 监控列表
    if (path === '/api/monitors') {
      res.writeHead(200);
      res.end(JSON.stringify({
        success: true,
        data: monitors.map(m => ({
          id: m.id,
          name: m.name,
          type: m.type,
          status: m.status,
          url: m.url || `${m.config?.host}:${m.config?.port}`
        }))
      }));
      return;
    }

    // 404
    res.writeHead(404);
    res.end(JSON.stringify({ success: false, message: 'Not found' }));
  } catch (error) {
    res.writeHead(500);
    res.end(JSON.stringify({ success: false, message: error.message }));
  }
});

// 启动服务器
server.listen(PORT, () => {
  console.log(`[监控服务] 状态监控服务已启动: http://localhost:${PORT}`);
  console.log(`[监控服务] API端点: http://localhost:${PORT}/api/status-page/1`);
  
  // 立即执行一次检查
  performChecks();
  
  // 定期检查
  setInterval(performChecks, CHECK_INTERVAL);
});

// 优雅关闭
process.on('SIGINT', () => {
  console.log('[监控服务] 正在关闭...');
  server.close();
  process.exit(0);
});
