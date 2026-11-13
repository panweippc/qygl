// 客户改名后拜访记录不断链。
//
// 背景：visit_records.customerName 与销售四表的 customer_name 是「字符串相等」关联，
// 一旦用户在编辑弹窗里改了「客户名单」，原名下的历史拜访记录就全部查不到（列表 1 条变 0 条、
// 点开弹窗也是空），用户感知就是「拜访记录被删了」。
// 多条四表记录可能共用同一个客户名，直接批量 UPDATE visit_records.customerName 会让其它
// 仍用旧名的记录一起断链，且污染历史数据 —— 所以这里绝不搬动/删除任何拜访记录数据。
//
// 做法：维护无向「客户名等价对」，改名时只登记 旧名 ↔ 新名；查询时用 BFS 展开整个连通分量，
// 把组内所有名字一起匹配。天然支持连续改名（A→B→C）与两组合并，历史数据零改动。
// 表由迁移 v1.2.106 建立，这里再做 CREATE TABLE IF NOT EXISTS 兜底，
// 避免部署机迁移未执行时相关接口 500。

let tableEnsured = false;

const CREATE_SQL = `
CREATE TABLE IF NOT EXISTS visit_customer_aliases (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name_a VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '等价客户名 A',
  name_b VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '等价客户名 B',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_vca_a (name_a(191)),
  INDEX idx_vca_b (name_b(191))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='客户改名等价名映射，保证拜访记录不因改名断链'
`;

async function ensureTable(pool) {
  if (tableEnsured) return;
  try {
    await pool.execute(CREATE_SQL);
    tableEnsured = true;
  } catch (e) {
    console.error('[visitAlias] 映射表建表失败:', e.message);
  }
}

// 生成 TRIM(col) IN (?, ?, ...) 条件，参数按 names 顺序返回
export function visitNameIn(names, column = 'customerName') {
  const list = names && names.length ? names.map(n => String(n || '').trim()).filter(Boolean) : [''];
  const unique = [...new Set(list.length ? list : [''])];
  return {
    sql: `TRIM(${column}) IN (${unique.map(() => '?').join(',')})`,
    params: unique
  };
}

// 登记一次改名（无向等价对）。失败不能影响主流程保存。
export async function recordVisitRename(pool, oldName, newName) {
  const oldN = String(oldName || '').trim();
  const newN = String(newName || '').trim();
  if (!oldN || !newN || oldN === newN) return;
  await ensureTable(pool);
  try {
    await pool.execute(
      `INSERT INTO visit_customer_aliases (name_a, name_b)
       SELECT ?, ? FROM DUAL WHERE NOT EXISTS (
         SELECT 1 FROM visit_customer_aliases
         WHERE (name_a = ? AND name_b = ?) OR (name_a = ? AND name_b = ?)
       )`,
      [oldN, newN, oldN, newN, newN, oldN]
    );
  } catch (e) {
    console.error('[visitAlias] 登记改名失败:', e.message);
  }
}

// 一次性加载全部等价对，BFS 求出每个名字所在的连通分量。
// 映射表只会存「改名事件」，行数很少，全表加载比逐名字查库更快也更简单。
async function loadComponents(pool) {
  await ensureTable(pool);
  try {
    const [edges] = await pool.execute('SELECT name_a, name_b FROM visit_customer_aliases');
    const adj = new Map();
    for (const e of edges) {
      const a = String(e.name_a || '').trim();
      const b = String(e.name_b || '').trim();
      if (!a || !b) continue;
      if (!adj.has(a)) adj.set(a, new Set());
      if (!adj.has(b)) adj.set(b, new Set());
      adj.get(a).add(b);
      adj.get(b).add(a);
    }
    return adj;
  } catch (e) {
    console.error('[visitAlias] 读取等价名失败:', e.message);
    return new Map();
  }
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

// 解析单个客户名的等价名集合（一定包含自身）
export async function resolveVisitNames(pool, customerName) {
  const name = String(customerName || '').trim();
  if (!name) return [];
  const adj = await loadComponents(pool);
  return expand(adj, name);
}

// 批量解析（列表页用），返回 Map<原名, 等价名数组>，只做 1 次查询
export async function resolveVisitNamesBatch(pool, names) {
  const unique = [...new Set((names || []).map(n => String(n || '').trim()).filter(Boolean))];
  const map = new Map(unique.map(n => [n, [n]]));
  if (!unique.length) return map;
  const adj = await loadComponents(pool);
  for (const n of unique) map.set(n, expand(adj, n));
  return map;
}
