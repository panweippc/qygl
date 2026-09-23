// scripts/run-migrations.js
// 自动化数据库迁移运行器（由 Jenkinsfile 在每次部署时调用）
// 机制：
//   1. 读取 scripts/migrations.json —— 显式登记的有序迁移文件列表（相对 scripts/ 目录）。
//   2. 对尚未执行的 .sql 用 mysql2 一次性执行（multipleStatements: true）。
//   3. 在 schema_migrations 表中记录已执行文件名，保证幂等、可重复运行、不会重复建表/插权限。
// 设计：不使用 *.sql 自动扫描。scripts/ 下存在大量一次性 fix/diagnose/truncate 脚本，
//       自动扫描会误执行，因此采用「显式登记」策略。
//       新增一次迁移 = 新增一个 .sql + 在 migrations.json 登记一行，Jenkins 下次部署自动执行。
// 凭证：复用后端同一套 .env 的 DB_HOST/DB_USER/DB_PASSWORD/DB_NAME，不硬编码。
import 'dotenv/config';
import mysql from 'mysql2/promise';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MANIFEST = path.join(__dirname, 'migrations.json');

async function main() {
  if (!fs.existsSync(MANIFEST)) {
    throw new Error(`migrations manifest not found: ${MANIFEST}`);
  }
  const manifest = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));
  const files = Array.isArray(manifest) ? manifest : manifest.migrations;
  if (!Array.isArray(files) || files.length === 0) {
    throw new Error('migrations.json must contain a non-empty array of filenames');
  }

  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'qyglfb',
    charset: 'utf8mb4',
    multipleStatements: true,
  });

  // 跟踪表（幂等核心）：记录已执行迁移，避免重复执行
  await conn.query(
    `CREATE TABLE IF NOT EXISTS schema_migrations (
      id INT AUTO_INCREMENT PRIMARY KEY,
      filename VARCHAR(255) NOT NULL UNIQUE,
      applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`
  );

  let applied = 0;
  let skipped = 0;
  for (const f of files) {
    const fp = path.join(__dirname, f);
    if (!fs.existsSync(fp)) {
      throw new Error(`migration file not found: ${fp}`);
    }
    const [rows] = await conn.query(
      'SELECT 1 FROM schema_migrations WHERE filename = ?',
      [f]
    );
    if (rows.length > 0) {
      console.log(`[migrate] skip (already applied): ${f}`);
      skipped++;
      continue;
    }
    const sql = fs.readFileSync(fp, 'utf8');
    await conn.query(sql);
    await conn.query('INSERT INTO schema_migrations (filename) VALUES (?)', [f]);
    console.log(`[migrate] applied: ${f}`);
    applied++;
  }

  console.log(`[migrate] done. applied=${applied} skipped=${skipped}`);
  await conn.end();
}

main().catch((err) => {
  console.error('[migrate] FAILED:', err && err.message ? err.message : err);
  process.exit(1);
});
