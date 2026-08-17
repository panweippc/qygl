/**
 * 服务健康监控脚本
 * 定期检查后端 API / 前端 / 数据库健康状态，异常时通过邮箱 + 日志告警。
 * 用法：node scripts/monitor-health.js
 * 建议：加入 Windows 计划任务（如每 30 分钟一次）
 * 依赖 .env 中的 MAIL_* 邮箱配置（可选，未配置则仅记录日志）
 */
import 'dotenv/config';
import nodemailer from 'nodemailer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const ALERT_FILE = path.join(root, 'logs', 'security-alert.log');

// 目标地址（通过环境变量可覆盖，默认本机）
const API_URL = process.env.MONITOR_API_URL || 'http://localhost:3005/api/health';
const FRONT_URL = process.env.MONITOR_FRONT_URL || 'http://localhost:8080';
const TIMEOUT = 8000;

const PAD = (n) => String(n).padStart(2, '0');
const now = () => { const d = new Date(); return `${d.getFullYear()}-${PAD(d.getMonth() + 1)}-${PAD(d.getDate())} ${PAD(d.getHours())}:${PAD(d.getMinutes())}:${PAD(d.getSeconds())}`; };

const log = (line) => {
  try { fs.appendFileSync(ALERT_FILE, JSON.stringify({ time: now(), level: 'MONITOR', type: 'service_monitor', detail: line }) + '\n', 'utf8'); } catch (e) {}
  console.log(`[monitor] ${line}`);
};

// 发送告警邮件（复用 .env 邮箱配置）
async function sendEmail(subject, text) {
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
    log('告警邮件发送失败: ' + e.message);
    return false;
  }
}

async function check() {
  let apiOk = false, dbOk = false, frontOk = false;
  const problems = [];

  // 1. 后端 API + 数据库
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), TIMEOUT);
    const resp = await fetch(API_URL, { signal: ctrl.signal });
    clearTimeout(t);
    if (resp.ok) {
      const data = await resp.json();
      apiOk = data.status === 'ok' || data.status === 'degraded';
      dbOk = !!(data.db && data.db.status === 'up');
      if (data.status === 'degraded') problems.push('后端状态 degraded');
      if (!dbOk) problems.push('数据库连接异常');
    } else {
      problems.push(`后端 API 返回 ${resp.status}`);
    }
  } catch (e) {
    apiOk = false;
    problems.push('后端 API 无法访问: ' + e.message);
  }

  // 2. 前端
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), TIMEOUT);
    const resp = await fetch(FRONT_URL, { signal: ctrl.signal });
    clearTimeout(t);
    frontOk = resp.ok;
    if (!resp.ok) problems.push(`前端页面返回 ${resp.status}`);
  } catch (e) {
    frontOk = false;
    problems.push('前端页面无法访问');
  }

  const statusLine = `API=${apiOk ? '正常' : '异常'} | DB=${dbOk ? '正常' : '异常'} | 前端=${frontOk ? '正常' : '异常'}`;

  if (apiOk && dbOk && frontOk) {
    log(`✅ 服务正常 ${statusLine}`);
    return;
  }

  // 有异常：告警
  const detail = `服务监控异常：${problems.join('; ')}\n${statusLine}`;
  log(`❌ ${detail}`);
  await sendEmail('【告警】智慧办公平台服务异常', detail);
}

check().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
