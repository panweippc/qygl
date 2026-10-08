// 周期盘点计划：共享逻辑（路由 auto / run 与 pm2 cron 脚本共用）
// 抽离原因：避免 HTTP 端点依赖鉴权、且让独立 cron 脚本直接跑 DB 逻辑。

// 计算下次执行时间（本地时间）
export function computeNextRun(frequency, dayOfMonth, from = new Date()) {
  const d = new Date(from);
  const dom = Number(dayOfMonth) || 1;
  let next;
  if (frequency === '每季度') {
    const q = Math.floor(d.getMonth() / 3);
    next = new Date(d.getFullYear(), q * 3, dom);
    if (next <= d) next = new Date(d.getFullYear(), (q + 1) * 3, dom);
  } else if (frequency === '每年') {
    next = new Date(d.getFullYear(), 0, dom);
    if (next <= d) next = new Date(d.getFullYear() + 1, 0, dom);
  } else { // 每月
    next = new Date(d.getFullYear(), d.getMonth(), dom);
    if (next <= d) next = new Date(d.getFullYear(), d.getMonth() + 1, dom);
  }
  return next.toISOString().slice(0, 19).replace('T', ' ');
}

// 按计划生成盘点单（复用新建逻辑：并发守卫 + 快照 + 冻结）
export async function generateInventoryFromPlan(pool, title, operator) {
  const [ongoing] = await pool.execute("SELECT inventoryNo FROM asset_inventories WHERE status = '进行中' LIMIT 1");
  if (ongoing.length) throw new Error(`已有进行中的盘点单 ${ongoing[0].inventoryNo}，请先完成或作废后再生成`);
  const ymd = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const [[{ c }]] = await pool.execute('SELECT COUNT(*) AS c FROM asset_inventories WHERE DATE(createdAt) = CURDATE()');
  const inventoryNo = `PD-${ymd}-${String(c + 1).padStart(3, '0')}`;
  const [r] = await pool.execute(
    'INSERT INTO asset_inventories (inventoryNo, title, status, operator) VALUES (?, ?, ?, ?)',
    [inventoryNo, title || `${inventoryNo} 资产盘点`, '进行中', operator]
  );
  const [assets] = await pool.execute('SELECT id, quantity FROM assets');
  for (const a of assets) {
    await pool.execute(
      'INSERT INTO asset_inventory_items (inventoryId, assetId, bookQuantity, actualQuantity, diff, checked) VALUES (?, ?, ?, ?, ?, ?)',
      [r.insertId, a.id, a.quantity, null, 0, 0]
    );
  }
  await pool.execute('UPDATE assets SET frozen = 1 WHERE frozen = 0');
  return { inventoryId: r.insertId, inventoryNo };
}

// 自动执行到期计划：遍历启用且已到 nextRunAt 的计划，生成盘点单并推进 nextRunAt
// 供 POST /asset-inventory-plans/auto 与 pm2 cron 脚本 scripts/cron-inventory-plan.js 复用
export async function runDueInventoryPlans(pool, operator = '系统定时') {
  const [due] = await pool.execute(
    "SELECT * FROM asset_inventory_plans WHERE status = '启用' AND nextRunAt <= NOW()"
  );
  const generated = [];
  for (const plan of due) {
    try {
      const dateStr = new Date().toISOString().slice(0, 10);
      const title = `${plan.name}（${dateStr}）`;
      const { inventoryId, inventoryNo } = await generateInventoryFromPlan(pool, title, operator);
      await pool.execute(
        'UPDATE asset_inventory_plans SET lastRunAt = NOW(), nextRunAt = ? WHERE id = ?',
        [computeNextRun(plan.frequency, plan.dayOfMonth), plan.id]
      );
      generated.push({ planId: plan.id, inventoryId, inventoryNo });
    } catch (e) {
      console.error(`计划 ${plan.id} 生成失败:`, e.message);
    }
  }
  return generated;
}
