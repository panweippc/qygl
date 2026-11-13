// 第 0 步：拜访记录丢失诊断（只读，不修改任何数据）
//
// 用法：
//   node scripts/diagnose-visit-loss.mjs                      # 连本机 .env 指向的库
//   node scripts/diagnose-visit-loss.mjs --host=192.168.2.142 # 连部署机数据库（凭据仍取本机 .env）
//   node scripts/diagnose-visit-loss.mjs --out=report.json    # 指定报告输出路径
//
// 在部署机上执行时，把本文件与 package.json 一起放到部署机项目根目录，用部署机自己的 .env 运行即可。
// 全程只读：只做 SELECT / information_schema 查询，不建表、不写库、不删除。

import 'dotenv/config';
import mysql from 'mysql2/promise';
import fs from 'node:fs';

const arg = (name) => {
  const hit = process.argv.find(a => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : null;
};
const host = arg('host') || process.env.DB_HOST || 'localhost';
const outPath = arg('out') || 'scripts/_visit_loss_report.json';

const cfg = {
  host,
  port: Number(arg('port') || process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'qyglfb',
  charset: 'utf8mb4',
  dateStrings: true,
  connectTimeout: 8000
};

const FOUR_TABLES = [
  ['intention', 'sales_intention_funnel'],
  ['key', 'sales_key_funnel'],
  ['deal', 'sales_deal_customers']
];

const pool = mysql.createPool(cfg);
const q = async (sql, params = []) => {
  const [rows] = await pool.execute(sql, params);
  return rows;
};
const hasColumn = async (table, col) => {
  const rows = await q(
    'SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?',
    [table, col]
  );
  return rows.length > 0;
};
const norm = (s) => String(s ?? '').trim();

// 从版本快照里抽取「同一记录相邻版本客户名不同」的改名对（与迁移 v1.2.106 口径一致）
const NAME_EXPR = `COALESCE(
  NULLIF(JSON_UNQUOTE(JSON_EXTRACT(v.data_json, '$.customer_name')), ''),
  NULLIF(JSON_UNQUOTE(JSON_EXTRACT(v.data_json, '$."客户名单"')), ''),
  NULLIF(JSON_UNQUOTE(JSON_EXTRACT(v.data_json, '$."客户名称"')), '')
)`;

async function collectRenamePairs() {
  try {
    return await q(`
      SELECT DISTINCT TRIM(prev.name) AS old_name, TRIM(curr.name) AS new_name,
                      prev.table_type, prev.record_id, prev.version AS from_version, curr.version AS to_version
      FROM (
        SELECT v.table_type, v.record_id, v.version, ${NAME_EXPR} AS name
        FROM sales_table_versions v
        WHERE v.data_json IS NOT NULL AND JSON_VALID(v.data_json) = 1
      ) prev
      JOIN (
        SELECT v.table_type, v.record_id, v.version, ${NAME_EXPR} AS name
        FROM sales_table_versions v
        WHERE v.data_json IS NOT NULL AND JSON_VALID(v.data_json) = 1
      ) curr
        ON curr.table_type = prev.table_type
       AND curr.record_id = prev.record_id
       AND curr.version = prev.version + 1
       AND curr.name IS NOT NULL AND prev.name IS NOT NULL
       AND TRIM(curr.name) <> '' AND TRIM(prev.name) <> ''
       AND TRIM(curr.name) <> TRIM(prev.name)
    `);
  } catch (e) {
    return { error: e.message };
  }
}

// 用改名对构造无向图，BFS 展开等价名集合
function buildAdjacency(pairs) {
  const adj = new Map();
  for (const p of pairs) {
    const a = norm(p.old_name), b = norm(p.new_name);
    if (!a || !b || a === b) continue;
    if (!adj.has(a)) adj.set(a, new Set());
    if (!adj.has(b)) adj.set(b, new Set());
    adj.get(a).add(b);
    adj.get(b).add(a);
  }
  return adj;
}
function expand(adj, seed) {
  const seen = new Set([seed]);
  const queue = [seed];
  while (queue.length) {
    const cur = queue.shift();
    for (const nb of adj.get(cur) || []) {
      if (!seen.has(nb)) { seen.add(nb); queue.push(nb); }
    }
  }
  return [...seen];
}

async function main() {
  const report = {
    generatedAt: new Date().toISOString(),
    database: { host: cfg.host, port: cfg.port, name: cfg.database },
    readOnly: true,
    summary: {},
    renamePairs: [],
    brokenLinks: [],
    orphanVisitNames: [],
    emptyProjects: [],
    warnings: []
  };

  try {
    // 连通性
    await q('SELECT 1');
  } catch (e) {
    console.error(`[诊断] 无法连接数据库 ${cfg.host}:${cfg.port}/${cfg.database} -> ${e.message}`);
    console.error('[诊断] 若目标为部署机数据库，请在部署机上用其自身 .env 运行本脚本，或检查网络/凭据。');
    await pool.end();
    process.exit(2);
  }

  // 1. 全局拜访记录概况
  const visitTotal = await q('SELECT COUNT(*) AS c FROM visit_records');
  const visitAlive = await q('SELECT COUNT(*) AS c FROM visit_records WHERE is_deleted = 0');
  const visitDeleted = await q('SELECT COUNT(*) AS c FROM visit_records WHERE is_deleted = 1');
  report.summary.visitTotal = visitTotal[0].c;
  report.summary.visitAlive = visitAlive[0].c;
  report.summary.visitSoftDeleted = visitDeleted[0].c;

  const byName = await q(`
    SELECT TRIM(customerName) AS name, COUNT(*) AS cnt,
           SUM(CASE WHEN customer_id IS NULL THEN 1 ELSE 0 END) AS without_customer_id
    FROM visit_records WHERE is_deleted = 0
    GROUP BY TRIM(customerName) ORDER BY cnt DESC
  `);
  report.summary.distinctVisitNames = byName.length;
  const nameCount = new Map(byName.map(r => [norm(r.name), Number(r.cnt)]));
  report.summary.visitWithoutCustomerId = byName.reduce((s, r) => s + Number(r.without_customer_id || 0), 0);

  // 2. 四表当前客户名
  const fourRows = [];
  for (const [type, table] of FOUR_TABLES) {
    try {
      const del = await hasColumn(table, 'is_deleted');
      const rows = await q(
        `SELECT id, TRIM(customer_name) AS name FROM ${table}${del ? ' WHERE is_deleted = 0' : ''}`
      );
      for (const r of rows) fourRows.push({ type, id: r.id, name: norm(r.name) });
    } catch (e) {
      report.warnings.push(`读取 ${table} 失败: ${e.message}`);
    }
  }
  report.summary.fourTableRows = fourRows.length;
  const currentNames = new Set(fourRows.map(r => r.name).filter(Boolean));

  // 3. 版本快照改名对
  const pairs = await collectRenamePairs();
  if (!Array.isArray(pairs)) {
    report.warnings.push(`读取版本快照失败: ${pairs.error}`);
    report.renamePairs = [];
  } else {
    report.renamePairs = pairs;
    report.summary.renamePairs = pairs.length;
  }
  const adj = buildAdjacency(Array.isArray(pairs) ? pairs : []);

  // 4. 断链清单：当前名字精确匹配为 0，但历史等价名下仍有拜访记录
  for (const r of fourRows) {
    if (!r.name) continue;
    const exact = nameCount.get(r.name) || 0;
    const group = expand(adj, r.name);
    const viaAlias = group.reduce((s, n) => s + (nameCount.get(n) || 0), 0);
    if (exact === 0 && viaAlias > 0) {
      report.brokenLinks.push({
        type: r.type, id: r.id, currentName: r.name,
        exactCount: 0, recoverableCount: viaAlias,
        equivalentNames: group.filter(n => n !== r.name)
      });
    }
  }
  report.summary.brokenLinks = report.brokenLinks.length;

  // 5. 孤儿名：全局表里有拜访，但四表当前客户名里已经没有这个名字
  for (const [name, cnt] of nameCount) {
    if (name && !currentNames.has(name)) {
      report.orphanVisitNames.push({ name, visitCount: cnt });
    }
  }
  report.orphanVisitNames.sort((a, b) => b.visitCount - a.visitCount);
  report.summary.orphanVisitNames = report.orphanVisitNames.length;

  // 6. 空壳项目：项目子表 0 条，但等价名下全局表还有拜访记录
  try {
    const projDeleted = await hasColumn('sales_project_analysis', 'is_deleted');
    const projs = await q(`
      SELECT p.id, TRIM(p.customer_name) AS name, COUNT(c.id) AS child_count
      FROM sales_project_analysis p
      LEFT JOIN sales_project_visit_records c ON c.analysis_id = p.id
      ${projDeleted ? 'WHERE p.is_deleted = 0' : ''}
      GROUP BY p.id, p.customer_name
    `);
    report.summary.projects = projs.length;
    for (const p of projs) {
      const name = norm(p.name);
      const group = expand(adj, name);
      const available = group.reduce((s, n) => s + (nameCount.get(n) || 0), 0);
      if (Number(p.child_count) === 0 && available > 0) {
        report.emptyProjects.push({
          projectId: p.id, customerName: name,
          currentChildCount: 0, recoverableVisitCount: available,
          equivalentNames: group.filter(n => n !== name)
        });
      }
    }
    report.summary.emptyProjects = report.emptyProjects.length;
  } catch (e) {
    report.warnings.push(`读取项目拜访子表失败: ${e.message}`);
  }

  fs.writeFileSync(outPath, JSON.stringify(report, null, 2), 'utf8');

  console.log('=== 拜访记录丢失诊断（只读）===');
  console.log(`目标库: ${cfg.host}:${cfg.port}/${cfg.database}`);
  console.log(`全局拜访记录: 共 ${report.summary.visitTotal} 条，未删 ${report.summary.visitAlive} 条，软删 ${report.summary.visitSoftDeleted} 条，涉及 ${report.summary.distinctVisitNames} 个客户名`);
  console.log(`其中未关联客户标识: ${report.summary.visitWithoutCustomerId} 条`);
  console.log(`四表当前记录: ${report.summary.fourTableRows} 行；快照改名对: ${report.summary.renamePairs ?? 0} 组`);
  console.log(`断链记录（当前名 0 条、旧名仍有数据）: ${report.summary.brokenLinks} 行`);
  console.log(`孤儿客户名（全局表有拜访、四表已无此名）: ${report.summary.orphanVisitNames} 个`);
  console.log(`空壳项目（子表 0 条但可恢复）: ${report.summary.emptyProjects ?? 0} 个`);
  if (report.brokenLinks.length) console.log('断链示例:', JSON.stringify(report.brokenLinks.slice(0, 5)));
  if (report.emptyProjects.length) console.log('空壳项目示例:', JSON.stringify(report.emptyProjects.slice(0, 5)));
  if (report.warnings.length) console.log('警告:', report.warnings.join(' | '));
  console.log(`完整报告: ${outPath}`);

  await pool.end();
}

main().catch(async (e) => {
  console.error('[诊断] 执行失败:', e);
  await pool.end().catch(() => {});
  process.exit(1);
});
