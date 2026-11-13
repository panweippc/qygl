// 第 0 步：拜访记录丢失数据抢救（幂等、只补不删）
//
// 用法：
//   node scripts/repair-visit-loss.mjs                       # 预览（默认，不写库）
//   node scripts/repair-visit-loss.mjs --apply              # 实际执行
//   node scripts/repair-visit-loss.mjs --apply --host=...   # 指定库
//
// 在部署机上执行时，把本文件放到部署机项目根目录，用部署机自己的 .env 运行。
// 安全措施：
//   1. 默认 dry-run，必须显式 --apply 才写库；
//   2. 写库前把 sales_project_visit_records 全表与 visit_records 未删行导出 JSON 备份；
//   3. 只 INSERT 缺失的镜像行，绝不 DELETE 任何现有行，不改 visit_records 主数据、不改四表；
//   4. 全程幂等，重复执行不会产生重复行；
//   5. 客户名等价关系来自版本快照 + visit_customer_aliases，支持连续改名 A→B→C。

import 'dotenv/config';
import mysql from 'mysql2/promise';
import fs from 'node:fs';

const arg = (name) => {
  const hit = process.argv.find(a => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : null;
};
const APPLY = process.argv.includes('--apply');
const host = arg('host') || process.env.DB_HOST || 'localhost';
const backupDir = arg('backup-dir') || 'scripts/_visit_repair_backups';

const cfg = {
  host,
  port: Number(arg('port') || process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'qyglfb',
  charset: 'utf8mb4',
  dateStrings: true,
  connectTimeout: 8000,
  multipleStatements: true
};

const pool = mysql.createPool(cfg);
const q = async (sql, params = []) => {
  const [rows] = await pool.execute(sql, params);
  return rows;
};
const norm = (s) => String(s ?? '').trim();

const CREATE_ALIAS_SQL = `
CREATE TABLE IF NOT EXISTS visit_customer_aliases (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name_a VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '等价客户名 A',
  name_b VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '等价客户名 B',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_vca_a (name_a(191)),
  INDEX idx_vca_b (name_b(191))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='客户改名等价名映射，保证拜访记录不因改名断链'
`;

const NAME_EXPR = `COALESCE(
  NULLIF(JSON_UNQUOTE(JSON_EXTRACT(v.data_json, '$.customer_name')), ''),
  NULLIF(JSON_UNQUOTE(JSON_EXTRACT(v.data_json, '$."客户名单"')), ''),
  NULLIF(JSON_UNQUOTE(JSON_EXTRACT(v.data_json, '$."客户名称"')), '')
)`;

function addEdge(adj, a, b) {
  a = norm(a); b = norm(b);
  if (!a || !b || a === b) return;
  if (!adj.has(a)) adj.set(a, new Set());
  if (!adj.has(b)) adj.set(b, new Set());
  adj.get(a).add(b);
  adj.get(b).add(a);
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
  console.log(`=== 拜访记录数据抢救 (${APPLY ? '实际执行' : '预览，不写库'}) ===`);
  console.log(`目标库: ${cfg.host}:${cfg.port}/${cfg.database}`);

  try {
    await q('SELECT 1');
  } catch (e) {
    console.error(`无法连接数据库: ${e.message}`);
    await pool.end();
    process.exit(2);
  }

  // ---- 只读盘点 ----
  const visits = await q(`
    SELECT id, TRIM(customerName) AS name, visitDate, visitContent, nextPlan
    FROM visit_records WHERE is_deleted = 0 ORDER BY visitDate DESC, id DESC
  `);
  const childrenBefore = await q('SELECT * FROM sales_project_visit_records ORDER BY analysis_id, seq');
  console.log(`全局未删拜访: ${visits.length} 条；项目拜访子表现有: ${childrenBefore.length} 行`);

  // 备份（预览模式也备份，便于先核对）
  fs.mkdirSync(backupDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14);
  const backupPath = `${backupDir}/before-${cfg.host.replace(/[^\w.-]/g, '_')}-${stamp}.json`;
  fs.writeFileSync(backupPath, JSON.stringify({
    createdAt: new Date().toISOString(),
    database: { host: cfg.host, name: cfg.database },
    visit_records_active: visits,
    sales_project_visit_records: childrenBefore
  }, null, 2), 'utf8');
  console.log(`备份已写入: ${backupPath}`);

  // ---- 构造等价名图 ----
  const adj = new Map();
  let snapshotPairs = [];
  try {
    snapshotPairs = await q(`
      SELECT DISTINCT TRIM(prev.name) AS old_name, TRIM(curr.name) AS new_name
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
    console.warn(`读取版本快照失败（跳过快照回填）: ${e.message}`);
  }
  for (const p of snapshotPairs) addEdge(adj, p.old_name, p.new_name);

  // 已有别名表（迁移执行过后才有）
  let aliasRows = [];
  try {
    // 预览模式绝不建表；只有 --apply 才补建，保证 dry-run 真正只读
    if (APPLY) await q(CREATE_ALIAS_SQL);
    aliasRows = await q('SELECT name_a, name_b FROM visit_customer_aliases');
    for (const r of aliasRows) addEdge(adj, r.name_a, r.name_b);
  } catch (e) {
    console.warn(APPLY
      ? `别名表读取失败（不影响按快照恢复）: ${e.message}`
      : `别名表尚未建立，预览模式不建表（不影响按快照推算）`);
  }
  console.log(`等价名关系: 快照 ${snapshotPairs.length} 对，已登记 ${aliasRows.length} 对`);

  // ---- 计算待补镜像行 ----
  // --only-project=1,2 可只处理指定项目（回归测试/定点恢复用），默认处理全部
  const onlyProject = arg('only-project');
  const onlyIds = onlyProject ? onlyProject.split(',').map(s => Number(s.trim())).filter(Boolean) : [];
  const whereProject = onlyIds.length ? ` WHERE id IN (${onlyIds.map(() => '?').join(',')})` : '';
  const projects = await q(
    `SELECT id, TRIM(customer_name) AS name, is_deleted FROM sales_project_analysis${whereProject} ORDER BY id`,
    onlyIds
  ).catch(async () => q(
    `SELECT id, TRIM(customer_name) AS name, 0 AS is_deleted FROM sales_project_analysis${whereProject} ORDER BY id`,
    onlyIds
  ));

  const existingByProject = new Map();
  for (const c of childrenBefore) {
    if (!existingByProject.has(c.analysis_id)) existingByProject.set(c.analysis_id, []);
    existingByProject.get(c.analysis_id).push(c);
  }

  const toInsert = [];
  const perProject = [];
  for (const p of projects) {
    const name = norm(p.name);
    if (!name) continue;
    const group = expand(adj, name);
    const groupSet = new Set(group);
    const matched = visits.filter(v => groupSet.has(norm(v.name)));
    const existing = existingByProject.get(p.id) || [];
    const linkedIds = new Set(existing.map(c => String(c.source_visit_id ?? '')));
    // 历史无来源标识的镜像行按内容比对，避免重复补入
    const contentKeys = new Set(existing.map(c =>
      `${norm(c.visit_time)}|${norm(c.communication_record)}|${norm(c.next_strategy)}`
    ));

    const missing = matched.filter(v => {
      if (linkedIds.has(String(v.id))) return false;
      const key = `${norm(v.visitDate)}|${norm(v.visitContent)}|${norm(v.nextPlan)}`;
      return !contentKeys.has(key);
    });
    if (missing.length) {
      let seq = existing.reduce((m, c) => Math.max(m, Number(c.seq) || 0), 0);
      for (const v of missing) {
        toInsert.push({
          analysis_id: p.id,
          seq: ++seq,
          visit_time: v.visitDate || '',
          communication_record: v.visitContent || '',
          next_strategy: v.nextPlan || '',
          source_visit_id: v.id,
          customer_name: name,
          source_visit_name: norm(v.name)
        });
      }
      perProject.push({ projectId: p.id, customerName: name, currentChildCount: existing.length, missingCount: missing.length, equivalentNames: group.filter(n => n !== name) });
    }
  }

  console.log(`待补镜像行: ${toInsert.length} 行，涉及 ${perProject.length} 个项目`);
  for (const p of perProject) {
    console.log(`  项目 ${p.projectId}「${p.customerName}」现有 ${p.currentChildCount} 行，补 ${p.missingCount} 行` +
      (p.equivalentNames.length ? `（等价名: ${p.equivalentNames.join(' / ')}）` : ''));
  }

  const planPath = `${backupDir}/plan-${cfg.host.replace(/[^\w.-]/g, '_')}-${stamp}.json`;
  fs.writeFileSync(planPath, JSON.stringify({
    createdAt: new Date().toISOString(), mode: APPLY ? 'apply' : 'dry-run',
    database: { host: cfg.host, name: cfg.database },
    snapshotPairs, perProject, toInsert
  }, null, 2), 'utf8');
  console.log(`恢复清单: ${planPath}`);

  if (!APPLY) {
    console.log('预览结束，未写库。确认无误后加 --apply 执行。');
    await pool.end();
    return;
  }

  // ---- 实际执行：登记改名对 + 只补不删 ----
  let registered = 0;
  for (const p of snapshotPairs) {
    const a = norm(p.old_name), b = norm(p.new_name);
    if (!a || !b || a === b) continue;
    const r = await q(`
      INSERT INTO visit_customer_aliases (name_a, name_b)
      SELECT ?, ? FROM DUAL WHERE NOT EXISTS (
        SELECT 1 FROM visit_customer_aliases
        WHERE (name_a = ? AND name_b = ?) OR (name_a = ? AND name_b = ?)
      )
    `, [a, b, a, b, b, a]);
    registered += Number(r.affectedRows || 0);
  }
  console.log(`新增登记改名对: ${registered} 组`);

  let inserted = 0;
  for (const row of toInsert) {
    // 二次去重：并发或重复执行时按来源标识跳过
    const dup = await q(
      'SELECT id FROM sales_project_visit_records WHERE analysis_id = ? AND source_visit_id = ? LIMIT 1',
      [row.analysis_id, row.source_visit_id]
    );
    if (dup.length) continue;
    await q(
      'INSERT INTO sales_project_visit_records (analysis_id, seq, visit_time, communication_record, next_strategy, source_visit_id) VALUES (?, ?, ?, ?, ?, ?)',
      [row.analysis_id, row.seq, row.visit_time, row.communication_record, row.next_strategy, row.source_visit_id]
    );
    inserted++;
  }

  const childrenAfter = await q('SELECT COUNT(*) AS c FROM sales_project_visit_records');
  console.log(`实际补入: ${inserted} 行；项目拜访子表 ${childrenBefore.length} → ${childrenAfter[0].c} 行`);
  console.log(`visit_records 主数据未改动（仍为 ${visits.length} 条未删）`);
  console.log('重复执行本脚本不会新增行（幂等）。');

  await pool.end();
}

main().catch(async (e) => {
  console.error('抢救脚本执行失败:', e);
  await pool.end().catch(() => {});
  process.exit(1);
});
