// 精确执行「单条」迁移并登记（不做全量扫描，避免重跑历史 DDL）
//
// 用法：
//   node scripts/apply-one-migration.mjs --file=migrations/xxx.sql --version=v1.2.106
//   node scripts/apply-one-migration.mjs --file=migrations/xxx.sql --version=v1.2.106 --check=visit_customer_aliases:name_a
//
// 特点：
//   - 路径相对 scripts/ 目录，与 migrations.json 的写法一致；
//   - 用 multipleStatements 执行该文件；DDL 本身需幂等，可重复运行验证；
//   - 自动探测 schema_migrations 的列结构并按需登记（已存在则跳过，不会重复插入）；
//   - --check=表:列 时额外用 information_schema 校验对象确实存在。
//   - 不扫描、不执行 migrations.json 里的其它迁移。

import 'dotenv/config';
import mysql from 'mysql2/promise';
import fs from 'node:fs';
import path from 'node:path';

const arg = (name) => {
  const hit = process.argv.find(a => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : null;
};
const relFile = arg('file');
const version = arg('version');
const check = arg('check');
const host = arg('host') || process.env.DB_HOST || 'localhost';

if (!relFile || !version) {
  console.error('缺少参数：--file=migrations/xxx.sql --version=v1.2.xxx');
  process.exit(1);
}

const absFile = path.resolve('scripts', relFile);
if (!fs.existsSync(absFile)) {
  console.error(`迁移文件不存在: ${absFile}`);
  process.exit(1);
}
const sql = fs.readFileSync(absFile, 'utf8');

const pool = mysql.createPool({
  host,
  port: Number(arg('port') || process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'qyglfb',
  charset: 'utf8mb4',
  dateStrings: true,
  connectTimeout: 8000,
  multipleStatements: true
});
const q = async (s, p = []) => (await pool.execute(s, p))[0];
// 与部署机 run-migrations.js 保持一致：multipleStatements + conn.query(sql) 整文件执行
const raw = async (s) => (await pool.query(s))[0];

async function main() {
  console.log(`目标库: ${host}/${process.env.DB_NAME || 'qyglfb'}`);
  console.log(`执行迁移: ${relFile} (${version})`);
  await q('SELECT 1');

  // 1. 执行 DDL / 回填（整文件，与部署机 run-migrations.js 完全一致）
  try {
    await raw(sql);
    console.log('SQL 执行成功（整文件 multipleStatements）');
  } catch (e) {
    console.error('SQL 执行失败:', e.message);
    throw e;
  }

  // 2. 登记 schema_migrations（自动适配列结构）
  const cols = await q(
    `SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'schema_migrations' ORDER BY ORDINAL_POSITION`
  );
  if (!cols.length) {
    console.warn('未找到 schema_migrations 表，跳过登记（请确认部署机迁移机制）');
  } else {
    const names = cols.map(c => c.COLUMN_NAME);
    // 本项目 schema_migrations 用 filename 记录已执行的迁移文件（id 是自增主键，不能塞版本号）
    const fileCol = ['filename', 'file_name', 'file', 'path', 'migration_file', 'script'].find(n => names.includes(n));
    const versionCol = ['version', 'migration_version', 'name', 'migration_name'].find(n => names.includes(n));
    const keyCol = fileCol || versionCol;
    const keyVal = fileCol ? relFile : version;
    if (!keyCol) {
      console.warn('未识别登记列，跳过登记，现有列:', names.join(', '));
    } else {
      const exists = await q(`SELECT COUNT(*) AS c FROM schema_migrations WHERE ${keyCol} = ?`, [keyVal]);
      if (exists[0].c > 0) {
        console.log(`登记已存在（${keyCol}=${keyVal}），跳过插入`);
      } else {
        const payload = { [keyCol]: keyVal };
        const appliedCol = ['applied_at', 'executed_at', 'created_at', 'appliedAt'].find(n => names.includes(n));
        if (appliedCol) payload[appliedCol] = new Date().toISOString().replace('T', ' ').slice(0, 19);
        const keys = Object.keys(payload);
        await q(
          `INSERT INTO schema_migrations (${keys.join(', ')}) VALUES (${keys.map(() => '?').join(', ')})`,
          keys.map(k => payload[k])
        );
        console.log(`已登记: ${JSON.stringify(payload)}`);
      }
    }
  }

  // 3. 可选对象校验
  if (check) {
    const [table, column] = check.split(':');
    if (column) {
      const r = await q(
        `SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE FROM information_schema.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
        [table, column]
      );
      console.log(r.length
        ? `校验通过: ${table}.${column} (${r[0].COLUMN_TYPE}, nullable=${r[0].IS_NULLABLE})`
        : `校验失败: ${table}.${column} 不存在`);
      if (!r.length) throw new Error('对象校验失败');
    } else {
      const r = await q(
        `SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?`,
        [table]
      );
      console.log(r.length ? `校验通过: 表 ${table} 存在` : `校验失败: 表 ${table} 不存在`);
      if (!r.length) throw new Error('对象校验失败');
    }
  }

  console.log('完成');
}

main().catch(async (e) => {
  console.error('迁移失败:', e);
  await pool.end().catch(() => {});
  process.exit(1);
}).finally(async () => {
  await pool.end().catch(() => {});
});
