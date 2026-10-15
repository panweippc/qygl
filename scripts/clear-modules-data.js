/**
 * 清空各业务模块相关表的数据（仅删数据，不删表结构）。
 *
 * 范围（按用户确认，共五个菜单）：
 *   审批中心 -> 7 张传统 OA 业务表 + 下发记录：
 *     leave_applications, reimbursements, meetings, business_trip_applications,
 *     office_supplies_applications, entertainment_expenses, distributed_records
 *   协同申请（project）三表（主表 + 子表，按依赖顺序级联清空）：
 *     project_collaborators（协同对象子表）、
 *     approval_logs（审批生命周期日志，含协同记录）、project_applications（主表）
 *     注：子表必须先于主表清空，且主表清空后 AUTO_INCREMENT 复位，
 *         避免“只清主表、子表残留”导致新申请自增 ID 复用时把旧子表数据串号。
 *   月报      -> weeklyReports
 *   销售漏斗  -> 四表（意向/重点漏斗、成交用户）+ 大项目进展（分析/关键人/竞争对手/拜访）+ 版本快照：
 *     sales_intention_funnel, sales_key_funnel, sales_deal_customers,
 *     sales_project_analysis, sales_project_key_persons, sales_project_competitors,
 *     sales_project_visit_records, sales_table_versions
 *   成交项目  -> closing_projects
 *   操作日志  -> operation_logs
 *
 * 安全设计：
 *   1. 默认【试运行 DRY-RUN】：只统计每张表当前行数并打印，不做任何删除。
 *   2. 必须显式传入 --execute 才会真正删除。
 *   3. 删除前先 SET FOREIGN_KEY_CHECKS=0，删除后恢复；每张表删除后重置 AUTO_INCREMENT。
 *   4. 表名用反引号包裹，规避 MySQL 保留字（如 distributed_records 的 read 列等）。
 *
 * 用法：
 *   node scripts/clear-modules-data.js            # 试运行，仅打印行数
 *   node scripts/clear-modules-data.js --execute  # 真正清空
 */
import 'dotenv/config'
import mysql from 'mysql2/promise'

const TABLES = [
  // —— 审批中心：7 张传统 OA 申请业务表 ——
  'leave_applications',
  'reimbursements',
  'meetings',
  'business_trip_applications',
  'office_supplies_applications',
  'entertainment_expenses',
  // —— 审批中心：协同申请三表（子表先于主表，级联清空避免自增 ID 复用串号） ——
  'project_collaborators',
  'approval_logs',
  'project_applications',
  // —— 审批中心：下发记录 ——
  'distributed_records',
  // —— 月报（实际表名 weeklyreports，Windows 下大小写不敏感） ——
  'weeklyreports',
  // —— 销售漏斗（四表 + 大项目进展 + 版本快照） ——
  'sales_intention_funnel',
  'sales_key_funnel',
  'sales_deal_customers',
  'sales_project_analysis',
  'sales_project_key_persons',
  'sales_project_competitors',
  'sales_project_visit_records',
  'sales_table_versions',
  // —— 成交项目 ——
  'closing_projects',
  // —— 操作日志 ——
  'operation_logs'
]

const DO_EXECUTE = process.argv.includes('--execute')

function sleep(ms) { return new Promise(r => setTimeout(r, ms)) }

async function main() {
  const pool = await mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 5
  })

  try {
    console.log('====================================================')
    console.log(`模式: ${DO_EXECUTE ? '【真实删除 EXECUTE】' : '【试运行 DRY-RUN，仅统计行数】'}`)
    console.log(`目标数据库: ${process.env.DB_NAME}`)
    console.log('====================================================')

    await pool.query('SET FOREIGN_KEY_CHECKS = 0')

    for (const t of TABLES) {
      const [[{ cnt }]] = await pool.query(`SELECT COUNT(*) AS cnt FROM \`${t}\``)
      if (DO_EXECUTE) {
        if (cnt > 0) {
          await pool.query(`DELETE FROM \`${t}\``)
          await pool.query(`ALTER TABLE \`${t}\` AUTO_INCREMENT = 1`)
        }
        const [[{ cnt2 }]] = await pool.query(`SELECT COUNT(*) AS cnt2 FROM \`${t}\``)
        console.log(`✓ 已清空 ${t.padEnd(32)} 删除 ${cnt} 行 → 剩余 ${cnt2} 行`)
      } else {
        console.log(`· 待清空 ${t.padEnd(32)} 当前 ${cnt} 行`)
      }
      await sleep(50)
    }

    await pool.query('SET FOREIGN_KEY_CHECKS = 1')

    console.log('====================================================')
    if (DO_EXECUTE) console.log('完成：以上表数据已清空（表结构保留）。')
    else console.log('以上为试运行结果。确认无误后执行：`node scripts/clear-modules-data.js --execute`')
    console.log('====================================================')
  } finally {
    await pool.end()
  }
}

main().catch(e => {
  console.error('执行失败:', e.message)
  process.exit(1)
})
