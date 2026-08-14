import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createConnection } from 'mysql2/promise';
import { createOperationLog } from '../utils/audit.js';
import { verifyPassword } from '../utils/security.js';

const router = express.Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 系统"数据备份"手动备份目录：backups/manual（与自动备份 backups/auto 分离）
const BACKUP_DIR = path.join(__dirname, '..', '..', 'backups', 'manual');
const SAFE_NAME = /^[A-Za-z0-9_\-]+\.sql$/;
const BATCH_SIZE = 2000;
const ADMIN_ROLES = ['系统管理员', '总经理', 'admin'];

const getDbConfig = () => ({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'qyglfb',
  charset: 'utf8mb4',
  dateStrings: true
});

const isAdmin = (req) => {
  const role = (req.user && req.user.role) || '';
  const username = (req.user && req.user.username) || '';
  return ADMIN_ROLES.includes(role) || username === 'admin' || username === '管理员';
};

const adminOnly = (req, res, next) => {
  if (!isAdmin(req)) {
    return res.status(403).json({ success: false, message: '无权限，仅管理员可执行备份操作' });
  }
  next();
};

// E6: 敏感操作二次验证——校验当前登录管理员的密码，防会话劫持后的恶意操作
const verifyAdminPassword = async (req, res, next) => {
  const { adminPassword } = req.body || {};
  if (!adminPassword) {
    return res.status(400).json({ success: false, message: '请提供当前登录密码进行二次验证' });
  }
  try {
    const { pool } = req.app.locals;
    const username = req.user?.username || req.user?.name;
    const [users] = await pool.execute('SELECT password FROM users WHERE username = ?', [username]);
    if (users.length === 0 || !verifyPassword(String(adminPassword), users[0].password)) {
      return res.status(403).json({ success: false, message: '当前登录密码错误，操作已拒绝' });
    }
    next();
  } catch (error) {
    console.error('二次验证失败:', error);
    res.status(500).json({ success: false, message: '二次验证失败' });
  }
};

const safeResolve = (filename) => {
  if (!SAFE_NAME.test(filename)) return null;
  const full = path.join(BACKUP_DIR, filename);
  if (!full.startsWith(path.resolve(BACKUP_DIR) + path.sep)) return null;
  return full;
};

const backupHeader = (dbName, tables, rows) => {
  const lines = [
    `-- qygl 数据库备份`,
    `-- 数据库: ${dbName}`,
    `-- 备份时间: ${new Date().toISOString().replace('T', ' ').slice(0, 19)}`,
    `-- 表数量: ${tables}`,
    `-- 数据行数: ${rows}`,
    `-- 恢复时请通过"数据备份"页面执行，恢复前系统会自动生成恢复前快照`,
    `SET NAMES utf8mb4;`,
    `SET FOREIGN_KEY_CHECKS = 0;`
  ];
  return lines.join('\n') + '\n\n';
};

// 列出所有备份文件
router.get('/backups', adminOnly, async (req, res) => {
  try {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
    const files = fs.readdirSync(BACKUP_DIR)
      .filter(f => SAFE_NAME.test(f))
      .map(name => {
        const stat = fs.statSync(path.join(BACKUP_DIR, name));
        return {
          name,
          size: stat.size,
          sizeText: stat.size < 1024 * 1024
            ? `${(stat.size / 1024).toFixed(1)} KB`
            : `${(stat.size / 1024 / 1024).toFixed(2)} MB`,
          createdAt: stat.mtime
        };
      })
      .sort((a, b) => b.createdAt - a.createdAt);
    res.json({ success: true, data: files });
  } catch (error) {
    console.error('列出备份失败:', error);
    res.status(500).json({ success: false, message: '列出备份失败: ' + error.message });
  }
});

// 创建备份（Node/mysql2 遍历表导出，兼容 MySQL 5.7，不依赖 mysqldump）
router.post('/backups', adminOnly, async (req, res) => {
  const conn = await req.app.locals.pool.getConnection();
  const filename = `${process.env.DB_NAME || 'qyglfb'}_${new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14)}.sql`;
  const full = path.join(BACKUP_DIR, filename);
  let tables = 0;
  let rows = 0;
  try {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
    await conn.query('SET SESSION group_concat_max_len = 1073741824');
    const [tableRows] = await conn.query(
      `SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() ORDER BY TABLE_NAME`
    );
    const tableNames = tableRows.map(r => r.TABLE_NAME);
    tables = tableNames.length;

    const out = fs.createWriteStream(full, { encoding: 'utf8' });
    out.write(backupHeader(getDbConfig().database, tables, 0));

    for (const table of tableNames) {
      const [createRes] = await conn.query(`SHOW CREATE TABLE \`${table}\``);
      const createSql = createRes[0]['Create Table'];
      out.write(`DROP TABLE IF EXISTS \`${table}\`;\n`);
      out.write(`${createSql};\n\n`);

      let offset = 0;
      while (true) {
        const [batch] = await conn.query(`SELECT * FROM \`${table}\` LIMIT ${BATCH_SIZE} OFFSET ${offset}`);
        if (batch.length === 0) break;
        rows += batch.length;
        const values = batch.map(r => {
          const cols = Object.keys(r).map(c => `\`${c}\``).join(', ');
          const vals = Object.keys(r).map(c => conn.escape(r[c])).join(', ');
          return `INSERT INTO \`${table}\` (${cols}) VALUES (${vals});`;
        });
        out.write(values.join('\n') + '\n');
        offset += batch.length;
      }
      out.write('\n');
    }

    out.write('SET FOREIGN_KEY_CHECKS = 1;\n');
    await new Promise((resolve, reject) => {
      out.end(() => resolve());
      out.on('error', reject);
    });

    // 更新文件头中的行数
    const content = fs.readFileSync(full, 'utf8').replace('-- 数据行数: 0', `-- 数据行数: ${rows}`);
    fs.writeFileSync(full, content, 'utf8');

    const stat = fs.statSync(full);
    await createOperationLog(req.app.locals.pool, {
      userId: String(req.user.id || ''),
      username: req.user.username || '',
      action: 'backup_create',
      module: 'system',
      targetName: filename,
      detail: `创建数据库备份，共 ${tables} 张表、${rows} 行数据`,
      ipAddress: req.headers['x-forwarded-for'] || req.socket.remoteAddress || ''
    });

    res.json({
      success: true,
      message: `备份成功：${tables} 张表、${rows} 行数据`,
      data: { name: filename, size: stat.size, sizeText: `${(stat.size / 1024).toFixed(1)} KB`, createdAt: stat.mtime }
    });
  } catch (error) {
    console.error('创建备份失败:', error);
    try { fs.unlinkSync(full); } catch (e) { /* ignore */ }
    res.status(500).json({ success: false, message: '创建备份失败: ' + error.message });
  } finally {
    conn.release();
  }
});

// 下载备份文件
router.get('/backups/:file/download', adminOnly, async (req, res) => {
  const full = safeResolve(req.params.file);
  if (!full || !fs.existsSync(full)) {
    return res.status(404).json({ success: false, message: '备份文件不存在' });
  }
  res.download(full, req.params.file);
});

// 删除备份文件（需管理员 + 当前登录密码二次验证）
router.delete('/backups/:file', adminOnly, verifyAdminPassword, async (req, res) => {
  const full = safeResolve(req.params.file);
  if (!full || !fs.existsSync(full)) {
    return res.status(404).json({ success: false, message: '备份文件不存在' });
  }
  try {
    fs.unlinkSync(full);
    await createOperationLog(req.app.locals.pool, {
      userId: String(req.user.id || ''),
      username: req.user.username || '',
      action: 'backup_delete',
      module: 'system',
      targetName: req.params.file,
      detail: '删除数据库备份文件',
      ipAddress: req.headers['x-forwarded-for'] || req.socket.remoteAddress || ''
    });
    res.json({ success: true, message: '备份文件已删除' });
  } catch (error) {
    console.error('删除备份失败:', error);
    res.status(500).json({ success: false, message: '删除备份失败: ' + error.message });
  }
});

// 恢复备份（恢复前自动生成恢复前快照，需二次确认）
router.post('/backups/:file/restore', adminOnly, async (req, res) => {
  if (req.body.confirm !== 'RESTORE') {
    return res.status(400).json({ success: false, message: '请先确认恢复操作（confirm=RESTORE）' });
  }
  const full = safeResolve(req.params.file);
  if (!full || !fs.existsSync(full)) {
    return res.status(404).json({ success: false, message: '备份文件不存在' });
  }
  const snapName = `${process.env.DB_NAME || 'qyglfb'}_prerestore_${new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14)}.sql`;
  const snapFull = path.join(BACKUP_DIR, snapName);
  const restoreConn = await createConnection({ ...getDbConfig(), multipleStatements: true });
  try {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
    fs.copyFileSync(full, snapFull);

    const sql = fs.readFileSync(full, 'utf8');
    await restoreConn.query('SET FOREIGN_KEY_CHECKS = 0');
    await restoreConn.query(sql);
    await restoreConn.query('SET FOREIGN_KEY_CHECKS = 1');

    await createOperationLog(req.app.locals.pool, {
      userId: String(req.user.id || ''),
      username: req.user.username || '',
      action: 'backup_restore',
      module: 'system',
      targetName: req.params.file,
      detail: `从备份恢复数据库，恢复前快照：${snapName}`,
      ipAddress: req.headers['x-forwarded-for'] || req.socket.remoteAddress || ''
    });

    res.json({ success: true, message: '恢复成功', data: { snapshot: snapName } });
  } catch (error) {
    console.error('恢复备份失败:', error);
    res.status(500).json({ success: false, message: '恢复备份失败: ' + error.message });
  } finally {
    try { await restoreConn.end(); } catch (e) { /* ignore */ }
  }
});

export default router;
