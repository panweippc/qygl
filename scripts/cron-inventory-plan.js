// 周期盘点计划自动执行（pm2 cron 周期调用）
// 与 POST /asset-inventory-plans/auto 复用同一套 DB 逻辑（server/utils/inventoryPlan.js），
// 不走 HTTP/鉴权，直接连库执行到期计划 → 生成盘点单并推进 nextRunAt。
//
// 注册方式（部署机）：
//   pm2 start scripts/cron-inventory-plan.js --name qygl-inventory-plan
//   pm2 save
// 说明：脚本已改造为常驻自调度，每天 02:00 自动执行；日志见 ~/.pm2/logs/qygl-inventory-plan-*.log

import 'dotenv/config';
import mysql from 'mysql2/promise';
import { runDueInventoryPlans } from '../server/utils/inventoryPlan.js';
import { startScheduler } from './scheduler.js';

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'qyglfb',
  waitForConnections: true,
  connectionLimit: 5,
  queueLimit: 0,
  charset: 'utf8mb4',
  dateStrings: true,
  timezone: '+08:00'
});

async function runInventoryPlan() {
  const ts = new Date().toISOString();
  try {
    const generated = await runDueInventoryPlans(pool, '系统定时');
    if (generated.length) {
      console.log(`[${ts}] 周期盘点计划自动执行：生成 ${generated.length} 张盘点单`, JSON.stringify(generated));
    } else {
      console.log(`[${ts}] 周期盘点计划：无到期计划，跳过`);
    }
  } catch (e) {
    console.error(`[${ts}] 周期盘点计划自动执行失败:`, e.message);
    throw e;
  }
}

// 改造为常驻自调度：每天 02:00 执行一次
startScheduler({ hour: 2, minute: 0 }, runInventoryPlan);
