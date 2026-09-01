#!/usr/bin/env node
/**
 * 监控指标采集脚本
 * 功能：采集系统、应用、数据库指标，存入MySQL
 * 用途：配合自建Dashboard进行监控
 * 运行方式：node scripts/monitor-collector.js
 */

import os from 'os';
import fs from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';
import mysql from 'mysql2/promise';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 数据库连接配置
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

// 指标采集函数集合
const collectors = {
  // 系统CPU使用率
  async cpuUsage() {
    const cpus = os.cpus();
    let totalIdle = 0;
    let totalTick = 0;

    cpus.forEach(cpu => {
      for (let type in cpu.times) {
        totalTick += cpu.times[type];
      }
      totalIdle += cpu.times.idle;
    });

    const idle = totalIdle / cpus.length;
    const total = totalTick / cpus.length;
    const usage = 100 - (100 * idle / total);

    return {
      type: 'system',
      name: 'cpu_usage',
      value: parseFloat(usage.toFixed(2)),
      unit: '%',
      tags: { 
        hostname: os.hostname(),
        cpu_count: cpus.length 
      }
    };
  },

  // 系统内存使用率
  async memoryUsage() {
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    const usage = (usedMem / totalMem) * 100;

    return {
      type: 'system',
      name: 'memory_usage',
      value: parseFloat(usage.toFixed(2)),
      unit: '%',
      tags: {
        total_gb: Math.round(totalMem / 1024 / 1024 / 1024),
        used_gb: Math.round(usedMem / 1024 / 1024 / 1024),
        free_gb: Math.round(freeMem / 1024 / 1024 / 1024)
      }
    };
  },

  // 系统负载
  async systemLoad() {
    const loadavg = os.loadavg();
    return {
      type: 'system',
      name: 'system_load',
      value: parseFloat(loadavg[0].toFixed(2)),
      unit: '',
      tags: {
        '1min': parseFloat(loadavg[0].toFixed(2)),
        '5min': parseFloat(loadavg[1].toFixed(2)),
        '15min': parseFloat(loadavg[2].toFixed(2))
      }
    };
  },

  // 磁盘使用率（简化版）
  async diskUsage() {
    try {
      const projectPath = process.cwd();
      const stats = fs.statSync(projectPath);
      const drive = projectPath.split(':')[0];
      const drivePath = drive + ':\\';

      return {
        type: 'system',
        name: 'disk_usage',
        value: 75.0, // 简化处理，实际可用node-disk-info等库
        unit: '%',
        tags: { drive: drive, path: projectPath }
      };
    } catch (error) {
      console.error('获取磁盘使用率失败:', error.message);
      return null;
    }
  },

  // 数据库连接延迟
  async dbLatency() {
    try {
      const startTime = Date.now();
      const connection = await mysql.createConnection(dbConfig);
      const latency = Date.now() - startTime;
      await connection.end();

      return {
        type: 'database',
        name: 'db_latency',
        value: parseFloat(latency.toFixed(2)),
        unit: 'ms',
        tags: { 
          host: dbConfig.host, 
          database: dbConfig.database 
        }
      };
    } catch (error) {
      console.error('获取数据库延迟失败:', error.message);
      return {
        type: 'database',
        name: 'db_latency',
        value: -1, // -1表示连接失败
        unit: 'ms',
        tags: { 
          status: 'error',
          host: dbConfig.host 
        }
      };
    }
  },

  // 活跃连接数
  async activeConnections() {
    try {
      const connection = await mysql.createConnection(dbConfig);
      const [rows] = await connection.execute('SHOW STATUS LIKE "Threads_connected"');
      await connection.end();

      const connections = rows.length > 0 ? parseInt(rows[0].Value) : 0;

      return {
        type: 'database',
        name: 'active_connections',
        value: connections,
        unit: '',
        tags: {}
      };
    } catch (error) {
      console.error('获取活跃连接数失败:', error.message);
      return null;
    }
  },

  // Node.js进程内存
  async nodeMemory() {
    const memoryUsage = process.memoryUsage();
    const heapUsed = memoryUsage.heapUsed / 1024 / 1024;
    const heapTotal = memoryUsage.heapTotal / 1024 / 1024;
    const usage = (heapUsed / heapTotal) * 100;

    return {
      type: 'application',
      name: 'node_memory',
      value: parseFloat(usage.toFixed(2)),
      unit: '%',
      tags: {
        heap_used_mb: parseFloat(heapUsed.toFixed(2)),
        heap_total_mb: parseFloat(heapTotal.toFixed(2)),
        rss_mb: parseFloat((memoryUsage.rss / 1024 / 1024).toFixed(2))
      }
    };
  },

  // 事件循环延迟
  async eventLoopLag() {
    const start = process.hrtime();
    await new Promise(resolve => setImmediate(resolve));
    const delta = process.hrtime(start);
    const lag = delta[0] * 1000 + delta[1] / 1000000;

    return {
      type: 'application',
      name: 'event_loop_lag',
      value: parseFloat(lag.toFixed(2)),
      unit: 'ms',
      tags: {}
    };
  }
};

// 保存指标到数据库
async function saveMetrics(metrics) {
  try {
    const connection = await mysql.createConnection(dbConfig);

    for (const metric of metrics) {
      if (!metric) continue;

      await connection.execute(
        `INSERT INTO monitor_metrics (metric_type, metric_name, metric_value, metric_unit, tags)
         VALUES (?, ?, ?, ?, ?)`,
        [
          metric.type,
          metric.name,
          metric.value,
          metric.unit,
          JSON.stringify(metric.tags || {})
        ]
      );
    }

    await connection.end();
    console.log(`[${new Date().toLocaleString('zh-CN')}] 采集并保存了 ${metrics.length} 个指标`);
  } catch (error) {
    console.error('保存指标失败:', error.message);
  }
}

// 清理历史数据（保留30天）
async function cleanupOldMetrics() {
  try {
    const connection = await mysql.createConnection(dbConfig);
    const [result] = await connection.execute(
      'DELETE FROM monitor_metrics WHERE collected_at < DATE_SUB(NOW(), INTERVAL 30 DAY)'
    );
    await connection.end();
    console.log(`[${new Date().toLocaleString('zh-CN')}] 清理了 ${result.affectedRows} 条历史数据`);
  } catch (error) {
    console.error('清理历史数据失败:', error.message);
  }
}

// 发送告警邮件（复用 .env 中的 MAIL_* 配置，与安全事件告警一致）
async function sendAlertEmail(subject, text) {
  const host = process.env.MAIL_HOST, user = process.env.MAIL_USER, pass = process.env.MAIL_PASS;
  const to = (process.env.MAIL_TO || '').split(',').map(s => s.trim()).filter(Boolean);
  if (!host || !user || !pass || to.length === 0) return false;
  try {
    const tr = nodemailer.createTransport({
      host, port: Number(process.env.MAIL_PORT || 465),
      secure: String(process.env.MAIL_SECURE).toLowerCase() !== 'false',
      auth: { user, pass },
    });
    await tr.sendMail({ from: `"${process.env.MAIL_FROM || '智慧办公平台监控'}" <${user}>`, to: to.join(', '), subject, text });
    return true;
  } catch (e) {
    console.error('系统监控告警邮件发送失败:', e.message);
    return false;
  }
}

// 告警检查
async function checkAlerts(metrics) {
  try {
    const connection = await mysql.createConnection(dbConfig);

    const alertRules = [
      { type: 'system', name: 'cpu_usage', threshold: 80, level: 'HIGH', message: 'CPU使用率过高' },
      { type: 'system', name: 'memory_usage', threshold: 85, level: 'HIGH', message: '内存使用率过高' },
      { type: 'database', name: 'db_latency', threshold: 1000, level: 'WARNING', message: '数据库连接延迟过高' },
      { type: 'database', name: 'db_latency', operator: 'equals', value: -1, level: 'CRITICAL', message: '数据库连接失败' },
      { type: 'application', name: 'node_memory', threshold: 90, level: 'HIGH', message: 'Node.js内存使用率过高' },
      { type: 'application', name: 'event_loop_lag', threshold: 100, level: 'WARNING', message: '事件循环延迟过高' }
    ];

    for (const metric of metrics) {
      if (!metric) continue;

      const rule = alertRules.find(r => 
        r.type === metric.type && 
        r.name === metric.name &&
        (r.operator === 'equals' ? metric.value === r.value : metric.value >= r.threshold)
      );

      if (rule) {
        // 检查是否已经有未解决的相同告警
        const [existingAlerts] = await connection.execute(
          `SELECT id FROM monitor_alerts 
           WHERE alert_type = ? AND is_resolved = 0 
           AND created_at > DATE_SUB(NOW(), INTERVAL 1 HOUR)`,
          [rule.name]
        );

        if (existingAlerts.length === 0) {
          await connection.execute(
            `INSERT INTO monitor_alerts (alert_type, alert_level, alert_message, alert_value, threshold_value, metric_tags)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [
              rule.name,
              rule.level,
              `${rule.message}: 当前值 ${metric.value}${metric.unit}`,
              metric.value,
              rule.threshold || 0,
              JSON.stringify(metric.tags || {})
            ]
          );
          // 触发邮件告警（与现有安全事件告警渠道一致）
          const mailSubject = `【系统监控告警】${rule.message}`;
          const mailText = `系统监控触发告警：\n${rule.message}\n当前值：${metric.value}${metric.unit}\n阈值：${rule.threshold || 0}\n级别：${rule.level}\n时间：${new Date().toLocaleString('zh-CN')}`;
          await sendAlertEmail(mailSubject, mailText);
          console.log(`[${new Date().toLocaleString('zh-CN')}] 触发告警: ${rule.message}`);
        }
      }
    }

    await connection.end();
  } catch (error) {
    console.error('告警检查失败:', error.message);
  }
}

// 主采集循环
async function collectAndSave() {
  try {
    // 并行采集所有指标
    const metrics = await Promise.all([
      collectors.cpuUsage(),
      collectors.memoryUsage(),
      collectors.systemLoad(),
      collectors.diskUsage(),
      collectors.dbLatency(),
      collectors.activeConnections(),
      collectors.nodeMemory(),
      collectors.eventLoopLag()
    ]);

    // 保存指标
    await saveMetrics(metrics.filter(m => m !== null));

    // 检查告警
    await checkAlerts(metrics.filter(m => m !== null));

  } catch (error) {
    console.error('采集失败:', error.message);
  }
}

// 启动采集服务
async function startCollector() {
  console.log('监控指标采集服务启动...');
  
  // 立即执行一次采集
  await collectAndSave();

  // 每分钟采集一次
  setInterval(collectAndSave, 60000);

  // 每天清理一次历史数据
  setInterval(cleanupOldMetrics, 24 * 60 * 60 * 1000);
}

// 命令行参数处理
const command = process.argv[2];
if (command === 'once') {
  // 单次采集
  collectAndSave();
} else if (command === 'cleanup') {
  // 清理历史数据
  cleanupOldMetrics();
} else {
  // 启动持续采集
  startCollector();
}

export { collectAndSave, checkAlerts, collectors };