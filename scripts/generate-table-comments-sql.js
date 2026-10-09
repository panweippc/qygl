// scripts/generate-table-comments-sql.js
// 读取 数据库表说明.md，提取每张表的「表名 — 说明」，生成 ALTER TABLE ... COMMENT SQL。
// 用法：
//   node scripts/generate-table-comments-sql.js
//      → 输出到 scripts/migrations/comment-all-tables-v1.2.61.sql（默认）
//   node scripts/generate-table-comments-sql.js --output=path.sql
//   node scripts/generate-table-comments-sql.js --stdout
//   node scripts/generate-table-comments-sql.js --execute
//      → 生成 SQL 并直接写入当前连接的数据库（需 .env 中 DB_*）
//
// 注意：
// - 解析规则：匹配 Markdown 三级标题 "### table_name — 说明"
// - 说明中若含英文破折号 "-" 或中文破折号 "—" 均可识别
// - 自动过滤实际数据库中不存在的表（执行模式）
// - 幂等：ALTER TABLE COMMENT 可重复执行

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 复用后端 .env
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const DOC_PATH = path.join(__dirname, '..', '数据库表说明.md');
const DEFAULT_OUTPUT = path.join(__dirname, 'migrations', 'comment-all-tables-v1.2.61.sql');

// 匹配 "### table_name — 说明" 或 "### table_name - 说明"（破折号前后可任意空格）
const TABLE_HEADING_RE = /^###\s+([A-Za-z_][A-Za-z0-9_]*)\s*[\u2014\u2013-]\s*(.+)$/;

async function extractComments() {
  const content = await fs.readFile(DOC_PATH, 'utf8');
  const lines = content.split('\n');
  const comments = [];
  for (const line of lines) {
    const m = line.match(TABLE_HEADING_RE);
    if (m) {
      const tableName = m[1].trim();
      let description = m[2].trim();
      // MySQL 表注释长度限制约 2048 字符，留足余量
      if (description.length > 2000) {
        description = description.slice(0, 1997) + '...';
      }
      comments.push({ tableName, description });
    }
  }
  return comments;
}

function escapeSqlString(str) {
  return str.replace(/'/g, "''");
}

function buildSql(comments) {
  const statements = comments.map(({ tableName, description }) =>
    `ALTER TABLE \`${tableName}\` COMMENT = '${escapeSqlString(description)}';`
  );
  return `-- 自动生成的表注释 SQL\n` +
    `-- 来源：数据库表说明.md\n` +
    `-- 生成脚本：scripts/generate-table-comments-sql.js\n` +
    `-- 表数量：${comments.length}\n` +
    `-- 说明：为所有业务表统一设置表级注释；幂等，可重复执行。\n` +
    `SET NAMES utf8mb4;\n` +
    `SET FOREIGN_KEY_CHECKS = 0;\n\n` +
    statements.join('\n') + '\n\n' +
    `SET FOREIGN_KEY_CHECKS = 1;\n`;
}

async function getExistingTables(conn, dbName) {
  const [rows] = await conn.query(
    'SELECT table_name AS name FROM information_schema.tables WHERE table_schema = ?',
    [dbName]
  );
  return new Set(rows.map(r => r.name));
}

async function ensureDir(filePath) {
  const dir = path.dirname(filePath);
  await fs.mkdir(dir, { recursive: true });
}

async function main() {
  const args = process.argv.slice(2);
  const stdout = args.includes('--stdout');
  const execute = args.includes('--execute');
  const outputArg = args.find(a => a.startsWith('--output='));
  const outputPath = outputArg ? outputArg.slice('--output='.length) : DEFAULT_OUTPUT;

  const comments = await extractComments();
  if (comments.length === 0) {
    console.error('未从 数据库表说明.md 中解析到任何表说明，请检查标题格式。');
    process.exit(1);
  }

  let effectiveComments = comments;
  let skipped = [];
  let conn;

  if (execute) {
    const mysqlModule = await import('mysql2/promise');
    conn = await mysqlModule.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: Number(process.env.DB_PORT || 3306),
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'qyglfb',
      charset: 'utf8mb4',
      multipleStatements: true,
    });
    const existing = await getExistingTables(conn, process.env.DB_NAME || 'qyglfb');
    effectiveComments = comments.filter(c => {
      if (existing.has(c.tableName)) return true;
      skipped.push(c.tableName);
      return false;
    });
  }

  const sql = buildSql(effectiveComments);

  if (stdout) {
    console.log(sql);
  } else {
    await ensureDir(outputPath);
    await fs.writeFile(outputPath, sql, 'utf8');
    console.log(`已生成 SQL 文件：${path.resolve(outputPath)}`);
    console.log(`包含表数量：${effectiveComments.length}`);
  }

  if (execute) {
    await conn.query(sql);
    console.log(`成功写入 ${effectiveComments.length} 张表的注释。`);
    if (skipped.length) {
      console.log(`跳过不存在的表：${skipped.join(', ')}`);
    }
    await conn.end();
  }
}

main().catch(err => {
  console.error(err && err.message ? err.message : err);
  process.exit(1);
});
