/**
 * 日志维护脚本
 * 1. 清理数据库 operation_logs 表中 N 天前的记录（默认 90 天，可通过 LOG_RETENTION_DAYS 覆盖）
 * 2. 轮转 logs/ 目录下全部 *.log（统一规则：超过 ROTATE_BYTES 则压缩归档，保留 LOG_KEEP 份）
 * 3. 轮转 Nginx 访问/错误日志（nginx-1.22.1/logs/qygl-access.log、qygl-error.log），规则同上
 * 用法：node scripts/cleanup-logs.js
 * 建议：加入 Windows 计划任务，每天执行一次
 */
import 'dotenv/config';
import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

const RETENTION_DAYS = parseInt(process.env.LOG_RETENTION_DAYS || '90', 10);
const LOG_KEEP = parseInt(process.env.LOG_KEEP || '10', 10);       // 日志归档保留份数
const ROTATE_BYTES = 10 * 1024 * 1024;                              // 单日志超过 10MB 触发轮转
const NGINX_LOG_DIR = path.join(root, 'nginx-1.22.1', 'logs');
const CLEANUP_LOG = path.join(root, 'logs', 'cleanup-logs.log'); // 自身执行日志（带时间戳，便于追溯每次轮转动作）

const PAD = (n) => String(n).padStart(2, '0');
const now = () => { const d = new Date(); return `${d.getFullYear()}${PAD(d.getMonth() + 1)}${PAD(d.getDate())}-${PAD(d.getHours())}${PAD(d.getMinutes())}${PAD(d.getSeconds())}`; };

let summary = [];
const note = (line) => { summary.push(line); console.log(`[cleanup] ${line}`); };

// 轮转单个日志文件：超过阈值则压缩为 .gz 归档
function rotateFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  const stat = fs.statSync(filePath);
  if (stat.size < ROTATE_BYTES) return;
  const stamp = now();
  const gz = `${filePath}.${stamp}.gz`;
  const out = fs.createWriteStream(gz);
  const gzip = zlib.createGzip();
  fs.createReadStream(filePath).pipe(gzip).pipe(out);
  out.on('finish', () => {
    fs.truncateSync(filePath, 0); // 清空原日志（Nginx/进程继续写）
    note(`已轮转 ${path.basename(filePath)} -> ${path.basename(gz)} (${(stat.size / 1024 / 1024).toFixed(1)}MB)`);
    pruneOldRotations(filePath);
  });
}

// 清理同前缀的旧归档，仅保留最近 LOG_KEEP 份
function pruneOldRotations(baseFile) {
  const dir = path.dirname(baseFile);
  const base = path.basename(baseFile);
  if (!fs.existsSync(dir)) return;
  const archives = fs.readdirSync(dir)
    .filter(f => f.startsWith(base + '.') && f.endsWith('.gz'))
    .sort();
  const excess = archives.length - LOG_KEEP;
  for (let i = 0; i < excess; i++) {
    const f = path.join(dir, archives[i]);
    try { fs.unlinkSync(f); note(`删除旧归档 ${path.basename(f)}`); } catch (e) {}
  }
}

async function main() {
  // 1. 清理数据库操作日志
  try {
    const pool = mysql.createPool({
      host: process.env.DB_HOST || 'localhost',
      port: Number(process.env.DB_PORT || 3306),
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      connectionLimit: 2
    });
    const [r] = await pool.execute(
      'DELETE FROM operation_logs WHERE createdAt < DATE_SUB(NOW(), INTERVAL ? DAY)',
      [RETENTION_DAYS]
    );
    note(`操作日志：删除 ${RETENTION_DAYS} 天前的记录 ${r.affectedRows} 条`);
    await pool.end();
  } catch (e) {
    note(`操作日志清理失败: ${e.message}`);
  }

  // 2. 轮转 logs/ 下全部 *.log（统一规则：超过 ROTATE_BYTES 压缩归档，保留 LOG_KEEP 份）
  const logDir = path.join(root, 'logs');
  if (fs.existsSync(logDir)) {
    for (const f of fs.readdirSync(logDir)) {
      if (f.endsWith('.log')) rotateFile(path.join(logDir, f));
    }
  } else {
    note(`日志目录不存在: ${logDir}`);
  }

  // 3. 轮转 Nginx 日志（与上方共用同一套轮转规则）
  rotateFile(path.join(NGINX_LOG_DIR, 'qygl-access.log'));
  rotateFile(path.join(NGINX_LOG_DIR, 'qygl-error.log'));

  // 写执行日志到 logs/cleanup-logs.log（带时间戳，便于追溯每次轮转动作）
  try {
    const ts = new Date().toISOString();
    const header = `\n===== [${ts}] 日志轮转执行 =====`;
    const body = summary.length ? summary.map(l => `  - ${l}`).join('\n') : '  - 本次无需清理，一切正常';
    fs.appendFileSync(CLEANUP_LOG, `${header}\n${body}\n`, 'utf8');
    // 自我保护：超过 2MB 时仅保留末尾 500 行，避免无限增长
    if (fs.existsSync(CLEANUP_LOG) && fs.statSync(CLEANUP_LOG).size > 2 * 1024 * 1024) {
      const lines = fs.readFileSync(CLEANUP_LOG, 'utf8').split('\n');
      fs.writeFileSync(CLEANUP_LOG, lines.slice(-500).join('\n'));
    }
  } catch (e) {
    console.error('[cleanup] 写入 cleanup-logs.log 失败:', e.message);
  }

  // 完成
  if (summary.length === 0) {
    console.log('[cleanup] 本次无需清理，一切正常');
  }
}

main().catch(e => { console.error('[cleanup] 执行失败:', e.message); process.exit(1); });
