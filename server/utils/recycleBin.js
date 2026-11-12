// 全局回收站工具：删除登记 / 整组快照 / 模块恢复适配器 / 30 天过期清理
// 设计要点：
//  1. 不改动原有删除业务，只在「删除成功后」补一条登记；登记失败只记日志，绝不影响删除结果。
//  2. 删除前抓「主记录整行 + 关联子表行」快照，解决 42 处物理 DELETE FROM 删子表导致恢复残缺的问题。
//  3. 恢复按模块走适配器：软删表优先翻标记，行已不存在时按快照整行重建；物理删表直接按快照重建。
//  4. 权限：管理员（内置管理员 / 管理员角色白名单）可看可恢复全部；普通员工仅限自己删除的。
import { resolveIdentity, isBuiltinAdmin } from '../middleware/auth.js';
import { getOperator, createOperationLog } from './audit.js';

export const RECYCLE_KEEP_DAYS = 30;

// 管理员口径与资料中心保持一致（内置管理员 / 系统管理员 / 总经理 / 部门经理 / 财务总监）
const ADMIN_ROLES = ['系统管理员', '总经理', '技术部经理', '销售部经理', '财务总监'];

export async function getRecycleIdentity(pool, req) {
  const me = getOperator(req);
  let isAdmin = isBuiltinAdmin(me);
  try {
    if (!isAdmin) {
      const identity = await resolveIdentity(pool, req);
      if (identity) {
        isAdmin = identity.isBuiltinAdmin || ADMIN_ROLES.includes(identity.roleName) || /管理员/.test(identity.roleName || '');
      }
    }
  } catch (e) { /* 身份解析失败按普通员工处理 */ }
  return { me, isAdmin };
}

// 模块元数据：soft=true 表示表带 is_deleted 列；children 为删除时被物理清除的子表
export const RECYCLE_MODULES = {
  customer: {
    label: '客户', table: 'customers', title: 'name', mode: 'undelete', soft: true, unique: ['name'], children: []
  },
  asset: {
    label: '资产', table: 'assets', title: 'name', mode: 'undelete', soft: true, unique: ['assetCode'], children: []
  },
  'asset-plan': {
    label: '资产盘点计划', table: 'asset_inventory_plans', title: 'name', mode: 'undelete', soft: true, unique: ['name'], children: []
  },
  announcement: {
    label: '公告', table: 'announcements', title: 'title', mode: 'undelete', soft: true, unique: ['title'], children: []
  },
  'sales-intention': {
    label: '意向漏斗', table: 'sales_intention_funnel', title: 'customer_name', mode: 'undelete', soft: true, children: []
  },
  'sales-key': {
    label: '重点漏斗', table: 'sales_key_funnel', title: 'customer_name', mode: 'undelete', soft: true, children: []
  },
  'sales-deal': {
    label: '成交用户', table: 'sales_deal_customers', title: 'customer_name', mode: 'undelete', soft: true, children: []
  },
  'sales-project': {
    label: '大项目进展', table: 'sales_project_analysis', title: 'customer_name', mode: 'undelete', soft: true,
    children: [
      { table: 'sales_project_key_persons', fk: 'analysis_id' },
      { table: 'sales_project_competitors', fk: 'analysis_id' },
      { table: 'sales_project_visit_records', fk: 'analysis_id' }
    ]
  },
  file: {
    label: '资料文件', table: 'files', title: 'name', mode: 'reinsert', soft: false, children: []
  },
  article: {
    label: '知识文章', table: 'knowledge_articles', title: 'title', mode: 'reinsert', soft: false, children: []
  },
  'project-info': {
    label: '项目信息', table: 'category_projects', title: 'project_name', mode: 'reinsert', soft: false, children: []
  }
};

// 动态表模块（如成交子记录）：由调用方传 table 覆盖元数据
export function resolveModule(module, overrides = {}) {
  const base = RECYCLE_MODULES[module] || {};
  const meta = { ...base, ...overrides };
  if (!meta.table) return null;
  return meta;
}

// 删除前调用：抓主记录整行 + 子表整组行。查不到主记录返回 null（端点应跳过登记）。
export async function captureSnapshot(pool, meta, recordId) {
  try {
    const [rows] = await pool.execute(`SELECT * FROM \`${meta.table}\` WHERE id = ? LIMIT 1`, [recordId]);
    if (!rows.length) return null;
    const main = rows[0];
    const children = [];
    for (const child of meta.children || []) {
      try {
        const [childRows] = await pool.execute(`SELECT * FROM \`${child.table}\` WHERE \`${child.fk}\` = ?`, [recordId]);
        children.push({ table: child.table, fk: child.fk, rows: childRows });
      } catch (e) {
        console.error('[recycleBin] 子表快照失败', child.table, e.message);
      }
    }
    return {
      main,
      children,
      title: String(main[meta.title] || main.name || main.title || main.project_name || `#${recordId}`).slice(0, 480)
    };
  } catch (e) {
    console.error('[recycleBin] 主表快照失败', meta.table, e.message);
    return null;
  }
}

// 删除成功后调用：写入登记表。任何异常都吞掉并记日志，不影响删除接口返回。
export async function recordDeletion(pool, req, { module, recordId, snapshot, overrides = {} }) {
  try {
    if (!snapshot) return;
    const meta = resolveModule(module, overrides);
    if (!meta) return;
    const { me } = await getRecycleIdentity(pool, req);
    await pool.execute(
      `INSERT INTO recycle_bin_items
        (module, module_label, table_name, record_id, title, deleted_by, deleted_at, snapshot, restore_mode, status)
       VALUES (?, ?, ?, ?, ?, ?, NOW(), ?, ?, 'deleted')`,
      [module, meta.label || module, meta.table, recordId, snapshot.title || '', me,
        JSON.stringify({ main: snapshot.main, children: snapshot.children || [] }), meta.mode || 'undelete']
    );
  } catch (e) {
    console.error('[recycleBin] 登记删除失败', module, recordId, e.message);
  }
}

// 惰性清理：超过 30 天的登记物理删除（每次列表/恢复时顺带执行，不依赖外部定时任务）
export async function purgeExpired(pool, days = RECYCLE_KEEP_DAYS) {
  try {
    const [r] = await pool.execute(
      'DELETE FROM recycle_bin_items WHERE deleted_at < DATE_SUB(NOW(), INTERVAL ? DAY)', [days]
    );
    return r.affectedRows || 0;
  } catch (e) {
    console.error('[recycleBin] 过期清理失败', e.message);
    return 0;
  }
}

// 唯一性预检：同名/同编号的未删除记录已存在时拒绝恢复，避免恢复出重复数据
async function checkUniqueConflict(pool, meta, main, recordId) {
  for (const field of meta.unique || []) {
    if (main[field] === undefined || main[field] === null || main[field] === '') continue;
    const softFilter = meta.soft ? ' AND (is_deleted = 0 OR is_deleted IS NULL)' : '';
    try {
      const [rows] = await pool.execute(
        `SELECT id FROM \`${meta.table}\` WHERE \`${field}\` = ? AND id <> ?${softFilter} LIMIT 1`,
        [main[field], recordId]
      );
      if (rows.length) return `已存在相同${field === 'name' ? '名称' : field === 'assetCode' ? '资产编号' : '标题'}的「${main[field]}」记录（ID ${rows[0].id}），请先处理后再恢复`;
    } catch (e) { /* 列不存在等异常跳过该字段 */ }
  }
  return null;
}

// 按快照整行重建主记录；id 被占用时去掉 id 由自增生成，返回新 id
async function reinsertMain(pool, meta, main) {
  const entries = Object.entries(main).filter(([, v]) => v !== undefined);
  let cols = entries.map(([k]) => k);
  let vals = entries.map(([, v]) => (v && typeof v === 'object' && !Buffer.isBuffer(v) ? JSON.stringify(v) : v));
  try {
    const [r] = await pool.execute(
      `INSERT INTO \`${meta.table}\` (${cols.map(c => `\`${c}\``).join(', ')}) VALUES (${cols.map(() => '?').join(', ')})`,
      vals
    );
    return r.insertId || main.id;
  } catch (e) {
    if (!/Duplicate entry/i.test(e.message)) throw e;
    // 主键冲突：去掉 id 再插
    const idx = cols.indexOf('id');
    if (idx >= 0) { cols.splice(idx, 1); vals.splice(idx, 1); }
    const [r] = await pool.execute(
      `INSERT INTO \`${meta.table}\` (${cols.map(c => `\`${c}\``).join(', ')}) VALUES (${cols.map(() => '?').join(', ')})`,
      vals
    );
    return r.insertId;
  }
}

// 恢复适配器：返回 { restoredId, message }
export async function restoreItem(pool, item) {
  const meta = resolveModule(item.module, { table: item.table_name, mode: item.restore_mode });
  if (!meta) return { ok: false, message: `未知模块 ${item.module}` };
  let snapshot;
  try { snapshot = JSON.parse(item.snapshot || '{}'); } catch (e) { return { ok: false, message: '快照已损坏，无法恢复' }; }
  const main = snapshot.main;
  if (!main || typeof main !== 'object') return { ok: false, message: '快照缺少主记录' };

  // 软删表：记录还在就翻标记；记录已不在则按快照重建
  const [exist] = await pool.execute(`SELECT id FROM \`${meta.table}\` WHERE id = ? LIMIT 1`, [item.record_id]);
  if (exist.length && meta.mode === 'undelete' && meta.soft) {
    const conflict = await checkUniqueConflict(pool, meta, main, item.record_id);
    if (conflict) return { ok: false, message: conflict };
    await pool.execute(`UPDATE \`${meta.table}\` SET is_deleted = 0 WHERE id = ?`, [item.record_id]);
    const restoredId = item.record_id;
    await restoreChildren(pool, snapshot.children, restoredId);
    return { ok: true, restoredId, message: '已恢复（软删标记还原）' };
  }

  if (exist.length && meta.mode === 'reinsert') {
    return { ok: false, message: `记录 ID ${item.record_id} 已存在，可能已被重新创建，无需恢复` };
  }

  const conflict = await checkUniqueConflict(pool, meta, main, item.record_id);
  if (conflict) return { ok: false, message: conflict };
  let restoredId;
  try {
    restoredId = await reinsertMain(pool, meta, main);
  } catch (e) {
    return { ok: false, message: `按快照重建失败：${e.message}` };
  }
  await restoreChildren(pool, snapshot.children, restoredId);
  return { ok: true, restoredId, message: '已恢复（按快照整组重建）' };
}

// 子表整组重建：跳过已存在的同 id 行，外键统一替换为恢复后的主记录 ID
async function restoreChildren(pool, children, restoredId) {
  for (const child of children || []) {
    for (const row of child.rows || []) {
      try {
        const [dup] = await pool.execute(`SELECT id FROM \`${child.table}\` WHERE id = ? LIMIT 1`, [row.id]);
        if (dup.length) continue;
        const patched = { ...row, [child.fk]: restoredId };
        const cols = Object.keys(patched).filter(k => patched[k] !== undefined);
        const vals = cols.map(k => patched[k]);
        await pool.execute(
          `INSERT INTO \`${child.table}\` (${cols.map(c => `\`${c}\``).join(', ')}) VALUES (${cols.map(() => '?').join(', ')})`,
          vals
        );
      } catch (e) {
        console.error('[recycleBin] 子表恢复失败', child.table, row.id, e.message);
      }
    }
  }
}

export async function logRestore(pool, req, item, restoredId, message) {
  try {
    const { me } = await getRecycleIdentity(pool, req);
    await createOperationLog(pool, {
      username: me, action: 'restore', module: 'recycle-bin',
      targetId: item.id, targetName: item.title || item.module_label,
      detail: `从回收站恢复 ${item.module_label}「${item.title || ''}」(原ID ${item.record_id} → ${restoredId})；${message}`
    });
  } catch (e) { console.error('[recycleBin] 恢复日志失败', e.message); }
}
