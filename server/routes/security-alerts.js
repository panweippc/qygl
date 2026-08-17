/**
 * 安全告警查询接口
 * 读取 logs/security-alert.log（JSON 行格式），返回给前端安全事件 dashboard。
 * 仅管理员/总经理可见。
 */
import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { requireRole } from '../middleware/auth.js';

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 安全告警日志文件路径
const ALERT_FILE = path.join(__dirname, '..', '..', 'logs', 'security-alert.log');

// 读取告警日志（倒序，最新在前）
function readAlerts(limit = 500) {
  if (!fs.existsSync(ALERT_FILE)) return [];
  try {
    const raw = fs.readFileSync(ALERT_FILE, 'utf8');
    const lines = raw.split('\n').filter(l => l.trim());
    const alerts = lines.map(l => {
      try { return JSON.parse(l); } catch { return { raw: l, time: '', level: '', type: 'unknown', detail: l }; }
    }).filter(a => a.type !== 'service_monitor' && a.type !== 'generic'); // 过滤非安全事件的监控日志
    return alerts.slice(-limit).reverse();
  } catch (e) {
    console.error('读取安全告警日志失败:', e.message);
    return [];
  }
}

// 获取安全告警列表
router.get('/security-alerts', requireRole('系统管理员', '总经理'), (req, res) => {
  const limit = parseInt(req.query.limit) || 500;
  const level = req.query.level || '';
  let alerts = readAlerts(limit);
  if (level) alerts = alerts.filter(a => a.level === level);
  res.json({ success: true, data: alerts });
});

// 获取安全告警统计（用于 dashboard 卡片）
router.get('/security-alerts/stats', requireRole('系统管理员', '总经理'), (req, res) => {
  const alerts = readAlerts(1000);
  const stats = {
    total: alerts.length,
    high: alerts.filter(a => a.level === 'HIGH' || a.level === 'CRITICAL').length,
    brute_force: alerts.filter(a => a.type === 'login_brute_force').length,
    new_ip: alerts.filter(a => a.type === 'login_new_ip').length,
    disabled: alerts.filter(a => a.type === 'account_disabled').length,
    inactive: alerts.filter(a => a.type === 'inactive_account').length,
  };
  res.json({ success: true, data: stats });
});

export default router;
