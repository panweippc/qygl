// 客户标识关联工具（方案7）
//
// 目标：把「拜访记录 ↔ 销售四表」从客户名字符串相等，升级为稳定的 customers.id。
// 改名后只要标识不变，历史拜访依然能查到；等价名集合作为兜底，兼容尚未回填的历史数据。
// 设计约束：所有失败都必须降级而不是抛错 —— 保存主流程不能被关联回写拖垮。

import { resolveVisitNames, visitNameIn } from './visitAlias.js';

// 成交表历史上已有驼峰列 customerId，沿用，避免重复加列。
const COLUMN_BY_TABLE = {
  sales_intention_funnel: 'customer_id',
  sales_key_funnel: 'customer_id',
  sales_project_analysis: 'customer_id',
  sales_deal_customers: 'customerId'
};

export function customerIdColumn(table) {
  return COLUMN_BY_TABLE[table] || null;
}

// 从 SELECT * 的行对象里取标识，兼容两种列名
export function rowCustomerId(row) {
  if (!row) return null;
  const v = row.customer_id ?? row.customerId ?? null;
  return v === '' ? null : v;
}

// 按等价名集合找客户主数据标识（改名后旧名客户仍能被找到）
export async function resolveCustomerId(pool, customerName, names = null) {
  const group = names || await resolveVisitNames(pool, customerName);
  if (!group || !group.length) return null;
  const cond = visitNameIn(group, 'name');
  try {
    const [rows] = await pool.execute(
      `SELECT id FROM customers WHERE ${cond.sql} AND is_deleted = 0 ORDER BY id LIMIT 1`,
      cond.params
    );
    return rows.length ? rows[0].id : null;
  } catch (e) {
    console.error('[customerLink] 解析客户标识失败:', e.message);
    return null;
  }
}

// 找出该客户（含历史名）对应的全部客户标识
export async function resolveCustomerIds(pool, customerName) {
  try {
    const names = await resolveVisitNames(pool, customerName);
    if (!names.length) return [];
    const cond = visitNameIn(names, 'name');
    const [rows] = await pool.execute(
      `SELECT id FROM customers WHERE ${cond.sql} AND is_deleted = 0`,
      cond.params
    );
    return rows.map(r => r.id);
  } catch (e) {
    console.error('[customerLink] 批量解析客户标识失败:', e.message);
    return [];
  }
}

// 给四表/项目行回写客户标识。knownId 优先（同步客户档案时已经算好，省一次查询）。
export async function linkRowCustomerId(pool, table, recordId, customerName, knownId = null) {
  const col = customerIdColumn(table);
  if (!col || !recordId) return null;
  let cid = knownId != null ? knownId : await resolveCustomerId(pool, customerName);
  if (!cid) return null;
  try {
    await pool.execute(`UPDATE ${table} SET ${col} = ? WHERE id = ?`, [cid, recordId]);
    return cid;
  } catch (e) {
    // 部署机迁移尚未执行时列不存在，静默降级，不能影响保存主流程
    console.warn(`[customerLink] 回写 ${table}.${col} 失败（可忽略）: ${e.message}`);
    return null;
  }
}
