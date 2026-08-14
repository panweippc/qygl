/**
 * 安全告警模块
 * 功能：
 *   1. 将安全事件（异常登录、暴力破解、高危操作等）写入独立告警日志文件 logs/security-alert.log
 *   2. 可选：通过站内通知告警管理员（需传入 pool）
 * 用途：作为业务审计日志之外的"取证层"，便于及时发现与追溯安全异常。
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 告警日志目录：项目根下 logs/
const LOG_DIR = path.join(__dirname, '..', '..', 'logs');
const ALERT_FILE = path.join(LOG_DIR, 'security-alert.log');

// 确保日志目录存在
try {
  fs.mkdirSync(LOG_DIR, { recursive: true });
} catch (e) { /* 忽略 */ }

const PAD = (n) => String(n).padStart(2, '0');
const fmtTime = (d = new Date()) =>
  `${d.getFullYear()}-${PAD(d.getMonth() + 1)}-${PAD(d.getDate())} ${PAD(d.getHours())}:${PAD(d.getMinutes())}:${PAD(d.getSeconds())}`;

/**
 * 写入安全告警日志（JSON 行格式，便于检索/分析）
 * @param {Object} data  { level, type, username, ip, detail }
 */
export function writeSecurityAlert({ level = 'WARN', type = 'generic', username = '', ip = '', detail = '' }) {
  try {
    const line = JSON.stringify({
      time: fmtTime(),
      level,
      type,
      username,
      ip,
      detail
    });
    fs.appendFileSync(ALERT_FILE, line + '\n', 'utf8');
  } catch (e) {
    console.log('写入安全告警日志失败:', e.message);
  }
}

/**
 * 站内通知管理员（可选；不阻塞主流程）
 * @param {Object} pool  数据库连接池
 * @param {Object} data  { username, detail }
 */
export async function notifyAdmins(pool, { username = '', detail = '' }) {
  if (!pool) return;
  try {
    // 查询所有管理员/总经理角色的用户，写入通知
    const [admins] = await pool.execute(
      `SELECT u.id FROM users u
       LEFT JOIN roles r ON u.roleId = r.id
       WHERE r.name IN ('系统管理员','总经理')`
    );
    if (!admins || admins.length === 0) return;
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
    for (const a of admins) {
      await pool.execute(
        'INSERT INTO notifications (userId, title, content, type, isRead, createdAt) VALUES (?, ?, ?, ?, 0, ?)',
        [a.id, '【安全告警】异常操作', detail, 'security', now]
      );
    }
  } catch (e) {
    // 通知失败不影响主流程
    console.log('安全告警通知失败:', e.message);
  }
}

export default { writeSecurityAlert, notifyAdmins };
