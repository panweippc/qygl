/**
 * 长期未登录账号自动停用脚本（账号生命周期管理）
 * 功能：扫描 users 表中长期未登录（超过阈值天数）且非管理角色的账号，自动停用。
 * 用法：node scripts/inactive-account-check.js [--days 180] [--dry-run]
 *   --days     未登录天数阈值，默认 180 天
 *   --dry-run  仅报告不实际停用（安全演练）
 * 建议：加入 Windows 计划任务每周运行一次。
 */
import 'dotenv/config';
import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

// 解析参数（兼容 --days=180 和 --days 180 两种写法）
const args = process.argv.slice(2);
let INACTIVE_DAYS = 180;
const eqArg = args.find(a => a.startsWith('--days='));
if (eqArg) {
  INACTIVE_DAYS = parseInt(eqArg.split('=')[1], 10);
} else {
  const idx = args.indexOf('--days');
  if (idx !== -1 && args[idx + 1]) INACTIVE_DAYS = parseInt(args[idx + 1], 10);
}
if (!Number.isFinite(INACTIVE_DAYS) || INACTIVE_DAYS <= 0) INACTIVE_DAYS = 180;
const DRY_RUN = args.includes('--dry-run');

// 告警日志
const ALERT_FILE = path.join(root, 'logs', 'security-alert.log');
const ALERT = (line) => {
  try { fs.appendFileSync(ALERT_FILE, JSON.stringify({ time: new Date().toISOString(), level: 'MEDIUM', type: 'inactive_account', detail: line }) + '\n', 'utf8'); } catch (e) {}
};

(async () => {
  let conn;
  try {
    conn = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: Number(process.env.DB_PORT || 3306),
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
    });

    const threshold = `DATE_SUB(NOW(), INTERVAL ${INACTIVE_DAYS} DAY)`;

    // 查询长期未登录的正常账号（排除管理/总经理角色，避免误停管理账号）
    // 角色通过 employees.roleId 关联（users.username 对应 employees.name，可能有 emp_ 前缀）
    const [rows] = await conn.query(
      `SELECT u.id, u.username, u.lastLoginAt
       FROM users u
       LEFT JOIN employees e ON e.name = REPLACE(u.username, 'emp_', '')
       LEFT JOIN roles r ON e.roleId = r.id
       WHERE u.status = 1
         AND (u.lastLoginAt IS NULL OR u.lastLoginAt < ${threshold})
         AND (r.name IS NULL OR (r.name NOT IN ('系统管理员','总经理')))`
    );

    console.log(`=== 长期未登录(${INACTIVE_DAYS}天)账号检测 ===`);
    console.log(`符合条件的账号数: ${rows.length}`);
    if (rows.length === 0) {
      console.log('✅ 无需停用的账号');
      process.exit(0);
    }

    for (const u of rows) {
      const last = u.lastLoginAt ? u.lastLoginAt.toISOString().slice(0, 10) : '(从未登录)';
      if (DRY_RUN) {
        console.log(`[演练] ${u.username} 上次登录 ${last} → 将被停用`);
      } else {
        await conn.query('UPDATE users SET status = 0 WHERE id = ?', [u.id]);
        console.log(`[停用] ${u.username} 上次登录 ${last} → 已停用`);
        ALERT(`长期未登录账号已停用: ${u.username} (上次登录 ${last})`);
      }
    }

    if (DRY_RUN) {
      console.log(`\n[演练模式] 未实际停用任何账号，共 ${rows.length} 个将受影响`);
    } else {
      console.log(`\n已停用 ${rows.length} 个长期未登录账号`);
    }
    process.exit(0);
  } catch (err) {
    console.error('[FATAL]', err.message);
    process.exitCode = 1;
  } finally {
    if (conn) await conn.end();
  }
})();
