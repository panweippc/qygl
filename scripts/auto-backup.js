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
    console.log(`[auto-backup] 备份成功: ${filename} (${tables} 张表, ${rows} 行, ${(stat.size / 1024 / 1024).toFixed(2)} MB)`);

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
