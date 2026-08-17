/**
 * 数据库自动备份脚本
 * - 用法：node scripts/auto-backup.js [--keep N]
 * - --keep N：保留最近 N 份备份，默认 14 份，超出的自动清理
 * - 自动备份写入 backups/auto/ 子目录（与系统"数据备份"的手动备份 backups/manual/ 分开）
 * - 建议配合 pm2 定时重启 或 Windows 计划任务每天运行一次
 */
import 'dotenv/config';
import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 自动备份目录：backups/auto（与系统手动备份 backups/manual 分离）
const BACKUP_DIR = path.join(__dirname, '..', 'backups', 'auto');
const BATCH_SIZE = 2000;
const KEEP = parseInt(process.argv.find(a => a.startsWith('--keep='))?.split('=')[1] || '14', 10);

// 异地备份目标目录（可选）：配置为另一台电脑的共享路径，如 \\192.168.2.100\backup
// 通过 .env 的 BACKUP_REMOTE_PATH 配置；留空则不执行异地备份
const REMOTE_PATH = (process.env.BACKUP_REMOTE_PATH || '').trim();

/**
 * 将备份文件复制到异地目标（另一台电脑的共享目录）
 * @param {string} localFile 本地备份文件完整路径
 * @param {string} remoteDir 异地目标目录（UNC 路径或本地路径）
 */
function copyToRemote(localFile, remoteDir) {
  if (!remoteDir) return;
  try {
    fs.mkdirSync(remoteDir, { recursive: true });
    const dest = path.join(remoteDir, path.basename(localFile));
    fs.copyFileSync(localFile, dest);
    const stat = fs.statSync(dest);
    console.log(`[auto-backup] 异地备份成功: ${dest} (${(stat.size / 1024 / 1024).toFixed(2)} MB)`);
  } catch (e) {
    console.error(`[auto-backup] 异地备份失败: ${e.message}`);
  }
}

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'qyglfb',
  charset: 'utf8mb4',
  dateStrings: true
};

async function main() {
  const stamp = new Date();
  const filename = `${dbConfig.database}_auto_${stamp.toISOString().replace(/[-:T]/g, '').slice(0, 14)}.sql`;
  const full = path.join(BACKUP_DIR, filename);

  const conn = await mysql.createConnection(dbConfig);
  fs.mkdirSync(BACKUP_DIR, { recursive: true });

  let tables = 0;
  let rows = 0;
  try {
    await conn.query('SET SESSION group_concat_max_len = 1073741824');
    const [tableRows] = await conn.query(
      `SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() ORDER BY TABLE_NAME`
    );
    tables = tableRows.length;

    const out = fs.createWriteStream(full, { encoding: 'utf8' });
    out.write(`-- qygl 自动备份\n-- 时间: ${stamp.toISOString().replace('T', ' ').slice(0, 19)}\n`);
    out.write(`SET NAMES utf8mb4;\nSET FOREIGN_KEY_CHECKS = 0;\n\n`);

    for (const { TABLE_NAME } of tableRows) {
      const [createRes] = await conn.query(`SHOW CREATE TABLE \`${TABLE_NAME}\``);
      out.write(`DROP TABLE IF EXISTS \`${TABLE_NAME}\`;\n`);
      out.write(`${createRes[0]['Create Table']};\n\n`);
      let offset = 0;
      while (true) {
        const [batch] = await conn.query(`SELECT * FROM \`${TABLE_NAME}\` LIMIT ${BATCH_SIZE} OFFSET ${offset}`);
        if (batch.length === 0) break;
        rows += batch.length;
        const values = batch.map(r => {
          const cols = Object.keys(r).map(c => `\`${c}\``).join(', ');
          const vals = Object.keys(r).map(c => conn.escape(r[c])).join(', ');
          return `INSERT INTO \`${TABLE_NAME}\` (${cols}) VALUES (${vals});`;
        });
        out.write(values.join('\n') + '\n');
        offset += batch.length;
      }
      out.write('\n');
    }
    out.write('SET FOREIGN_KEY_CHECKS = 1;\n');
    await new Promise((resolve, reject) => { out.end(() => resolve()); out.on('error', reject); });
    await conn.end();

    const stat = fs.statSync(full);
    // ---- 备份完整性校验 ----
    let integrityOk = true;
    let integrityDetail = '';
    try {
      const content = fs.readFileSync(full, 'utf8');
      const checks = [];
      // 1. 文件非空且有内容
      if (stat.size === 0) { integrityOk = false; checks.push('文件为空'); }
      // 2. 包含预期的表数（CREATE TABLE 语句数）
      const createCount = (content.match(/CREATE TABLE/g) || []).length;
      if (createCount !== tables) { integrityOk = false; checks.push(`CREATE TABLE 数(${createCount})≠表数(${tables})`); }
      // 3. INSERT 行数与统计一致
      const insertCount = (content.match(/INSERT INTO/g) || []).length;
      if (insertCount !== rows) { integrityOk = false; checks.push(`INSERT 数(${insertCount})≠行数(${rows})`); }
      // 4. 文件有正确的结束标记（完整写出）
      if (!content.trim().endsWith('SET FOREIGN_KEY_CHECKS = 1;')) { integrityOk = false; checks.push('缺少结束标记(文件可能不完整)'); }
      integrityDetail = checks.length > 0 ? '；' + checks.join('；') : '';
    } catch (chkErr) {
      integrityOk = false;
      integrityDetail = `；校验异常: ${chkErr.message}`;
    }
    if (!integrityOk) {
      throw new Error(`备份文件完整性校验失败${integrityDetail}`);
    }
    console.log(`[auto-backup] 备份成功并通过完整性校验: ${filename} (${tables} 张表, ${rows} 行, ${(stat.size / 1024 / 1024).toFixed(2)} MB)`);

    // 备份加密（可选）：若配置了 BACKUP_ENCRYPT_KEY，则对备份进行 AES 加密
    // 加密后的文件为 <filename>.enc，本地保留原始 SQL 与 .enc，异地复制 .enc
    let backupForRemote = full; // 异地复制的文件（默认原始 SQL）
    const encKey = (process.env.BACKUP_ENCRYPT_KEY || '').trim();
    if (encKey) {
      const encFile = full + '.enc';
      try {
        const { encrypt: encryptFile } = await import('./backup-crypto.js');
        // backup-crypto.js 是命令行脚本，这里直接调用其内部逻辑较复杂，
        // 因此改用内联 AES-256-GCM 加密实现
        const crypto = await import('crypto');
        const keyBuf = Buffer.from(encKey, 'hex');
        const data = fs.readFileSync(full);
        const iv = crypto.randomBytes(12);
        const cipher = crypto.createCipheriv('aes-256-gcm', keyBuf, iv);
        const encrypted = Buffer.concat([cipher.update(data), cipher.final()]);
        const tag = cipher.getAuthTag();
        fs.writeFileSync(encFile, Buffer.concat([iv, tag, encrypted]));
        console.log(`[auto-backup] 备份已加密: ${encFile}`);
        backupForRemote = encFile;
      } catch (encErr) {
        console.error(`[auto-backup] 备份加密失败（继续保留明文备份）: ${encErr.message}`);
      }
    }

    // 异地备份：复制到另一台电脑的共享目录（若已配置 BACKUP_REMOTE_PATH）
    // 若启用了加密，则复制加密后的 .enc 文件
    if (REMOTE_PATH) {
      copyToRemote(backupForRemote, REMOTE_PATH);
    }

    // 清理超出保留数量的旧备份（只清理 auto_ 前缀的，不动手动备份）
    const autoFiles = fs.readdirSync(BACKUP_DIR)
      .filter(f => /_auto_\d{14}\.sql$/.test(f))
      .map(f => ({ name: f, time: fs.statSync(path.join(BACKUP_DIR, f)).mtimeMs }))
      .sort((a, b) => b.time - a.time);
    const toDelete = autoFiles.slice(KEEP);
    for (const f of toDelete) {
      fs.unlinkSync(path.join(BACKUP_DIR, f.name));
      console.log(`[auto-backup] 清理旧备份: ${f.name}`);
    }
    console.log(`[auto-backup] 当前保留 ${Math.min(autoFiles.length, KEEP)} 份自动备份`);
  } catch (e) {
    console.error('[auto-backup] 备份失败:', e.message);
    try { fs.unlinkSync(full); } catch (_) {}
    process.exit(1);
  }
}

main();
