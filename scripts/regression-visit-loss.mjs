// 拜访记录丢失修复 · 端到端回归（方案8 + 方案7）
//
// 用法：TEST_USER=李智鑫 TEST_PASS=*** node scripts/regression-visit-loss.mjs
//       TEST_BASE=http://127.0.0.1:3099 可指定后端地址
//
// 覆盖：
//   1. 改名后列表拜访条数不为 0、弹窗仍能查到旧名记录；
//   2. 改名不新增客户档案/项目骨架，客户标识保持不变；
//   3. 项目保存不带 replace_children 时绝不删子表；带标记时仍可显式清空；
//   4. 镜像只补不删且幂等；
//   5. 抢救脚本能把空壳项目补回，且重复执行不新增。
// 测试数据全部带「测试拜访关联」前缀，finally 中严格清理并复核 COUNT=0。

import 'dotenv/config';
import mysql from 'mysql2/promise';
import { execFileSync } from 'node:child_process';

const BASE = process.env.TEST_BASE || 'http://127.0.0.1:3099';
const USER = process.env.TEST_USER || '李智鑫';
const PASS = process.env.TEST_PASS || '';
const TAG = '测试拜访关联';
const NAME_A = `${TAG}甲公司`;
const NAME_B = `${TAG}乙公司`;
const NAMES = [NAME_A, NAME_B];

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'qyglfb',
  charset: 'utf8mb4',
  dateStrings: true,
  multipleStatements: true
});
const q = async (s, p = []) => (await pool.execute(s, p))[0];

const created = { visitIds: [], customerIds: [], funnelIds: [], projectIds: [] };
const results = [];
let token = null;

function check(name, ok, detail) {
  results.push({ name, ok: !!ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ' -> ' + detail : ''}`);
}

async function api(path, options = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const r = await fetch(BASE + path, {
    method: options.method || 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
    signal: AbortSignal.timeout(15000)
  });
  const text = await r.text();
  let json;
  try { json = JSON.parse(text); } catch { throw new Error(`${path} 非 JSON 响应(${r.status}): ${text.slice(0, 200)}`); }
  return { status: r.status, json };
}

async function login() {
  const cap = await api('/api/captcha');
  if (!cap.json.success) throw new Error('获取验证码失败');
  const svg = Buffer.from(String(cap.json.svg).split(',')[1], 'base64').toString('utf8');
  const code = [...svg.matchAll(/<text[^>]*>([\s\S]*?)<\/text>/g)]
    .map(m => m[1].replace(/<[^>]+>/g, ''))
    .join('').replace(/\s/g, '');
  const r = await api('/api/login', {
    method: 'POST',
    body: { username: USER, password: PASS, captcha: code, captchaToken: cap.json.token }
  });
  if (!r.json.success) throw new Error(`登录失败: ${r.json.message}`);
  token = r.json.token;
  console.log(`登录成功: ${USER}`);
}

async function waitBackend() {
  for (let i = 0; i < 20; i++) {
    try {
      const r = await fetch(BASE + '/api/captcha', { signal: AbortSignal.timeout(2000) });
      if (r.ok) return;
    } catch {}
    await new Promise(r => setTimeout(r, 1500));
  }
  throw new Error('后端未就绪: ' + BASE);
}

async function cleanup() {
  console.log('\n--- 清理测试数据 ---');
  // 先按名字找出本次可能产生的所有记录 id
  const cust = await q('SELECT id FROM customers WHERE TRIM(name) IN (?, ?)', NAMES);
  for (const c of cust) created.customerIds.push(c.id);
  const funnel = await q(
    'SELECT id FROM sales_key_funnel WHERE TRIM(customer_name) IN (?, ?) UNION SELECT id FROM sales_intention_funnel WHERE TRIM(customer_name) IN (?, ?)',
    [...NAMES, ...NAMES]
  );
  for (const f of funnel) created.funnelIds.push(f.id);
  const proj = await q('SELECT id FROM sales_project_analysis WHERE TRIM(customer_name) IN (?, ?)', NAMES);
  for (const p of proj) created.projectIds.push(p.id);

  for (const id of created.projectIds) {
    await q('DELETE FROM sales_project_visit_records WHERE analysis_id = ?', [id]);
    await q('DELETE FROM sales_project_key_persons WHERE analysis_id = ?', [id]);
    await q('DELETE FROM sales_project_competitors WHERE analysis_id = ?', [id]);
  }
  if (created.projectIds.length) {
    await q(`DELETE FROM sales_project_analysis WHERE id IN (${created.projectIds.map(() => '?').join(',')})`, created.projectIds);
  }
  for (const id of created.funnelIds) {
    await q('DELETE FROM sales_key_funnel WHERE id = ?', [id]);
    await q('DELETE FROM sales_intention_funnel WHERE id = ?', [id]);
  }
  await q('DELETE FROM sales_key_funnel WHERE TRIM(customer_name) IN (?, ?)', NAMES);
  await q('DELETE FROM sales_intention_funnel WHERE TRIM(customer_name) IN (?, ?)', NAMES);
  await q('DELETE FROM sales_deal_customers WHERE TRIM(customer_name) IN (?, ?)', NAMES);
  await q('DELETE FROM visit_records WHERE TRIM(customerName) IN (?, ?)', NAMES);
  await q('DELETE FROM visit_customer_aliases WHERE name_a IN (?, ?) OR name_b IN (?, ?)', [...NAMES, ...NAMES]);
  await q('DELETE FROM sales_table_versions WHERE data_json LIKE ?', [`%${TAG}%`]);
  for (const id of created.customerIds) {
    await q('DELETE FROM customer_activities WHERE customerId = ?', [id]).catch(() => {});
    await q('DELETE FROM customer_status_logs WHERE customer_id = ?', [id]).catch(() => {});
  }
  if (created.customerIds.length) {
    await q(`DELETE FROM customers WHERE id IN (${created.customerIds.map(() => '?').join(',')})`, created.customerIds);
  }
  await q('DELETE FROM customers WHERE TRIM(name) IN (?, ?)', NAMES);
  await q('DELETE FROM operation_logs WHERE detail LIKE ? OR target_name LIKE ?', [`%${TAG}%`, `%${TAG}%`]).catch(() => {});

  const leftovers = {};
  for (const [label, sql, params] of [
    ['visit_records', 'SELECT COUNT(*) c FROM visit_records WHERE TRIM(customerName) IN (?, ?)', NAMES],
    ['四表行', 'SELECT COUNT(*) c FROM sales_key_funnel WHERE TRIM(customer_name) IN (?, ?)', NAMES],
    ['项目', 'SELECT COUNT(*) c FROM sales_project_analysis WHERE TRIM(customer_name) IN (?, ?)', NAMES],
    ['客户', 'SELECT COUNT(*) c FROM customers WHERE TRIM(name) IN (?, ?)', NAMES],
    ['别名', 'SELECT COUNT(*) c FROM visit_customer_aliases WHERE name_a IN (?, ?) OR name_b IN (?, ?)', [...NAMES, ...NAMES]]
  ]) {
    const r = await q(sql, params);
    leftovers[label] = r[0].c;
  }
  const allZero = Object.values(leftovers).every(v => Number(v) === 0);
  console.log('残留复核:', JSON.stringify(leftovers), allZero ? '全部为 0' : '仍有残留！');
  if (!allZero) process.exitCode = 1;
}

async function main() {
  await waitBackend();
  await login();

  // ---- 构造初始数据 ----
  // 1) 两条全局拜访记录，挂在旧名下
  for (const content of ['测试拜访内容一', '测试拜访内容二']) {
    const r = await q(
      'INSERT INTO visit_records (customerName, address, visitDate, visitPerson, visitContent, nextPlan, visitNo, createdAt, is_deleted) VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), 0)',
      [NAME_A, '测试地址', '2026-11-01', '测试拜访人', content, '测试下一步', 1]
    );
    created.visitIds.push(r.insertId);
  }
  // 2) 通过真实接口新增一条「重点漏斗」，自动建客户档案 + 项目骨架 + 镜像拜访
  const add = await api('/api/sales-four-tables/intention', {
    method: 'POST',
    body: { customer_name: NAME_A, progress_percent: 50, owner: USER, contact: '测试联系人', phone: '测试电话' }
  });
  if (!add.json.success) throw new Error('新增四表记录失败: ' + JSON.stringify(add.json));
  console.log('新增四表记录:', JSON.stringify(add.json.data));

  const funnelRows = await q('SELECT id, customer_id FROM sales_key_funnel WHERE TRIM(customer_name) = ?', [NAME_A]);
  const custRows = await q('SELECT id, name FROM customers WHERE TRIM(name) = ?', [NAME_A]);
  const projRows = await q('SELECT id, customer_name, customer_id FROM sales_project_analysis WHERE TRIM(customer_name) = ?', [NAME_A]);
  const funnelId = funnelRows[0]?.id;
  const customerId = custRows[0]?.id;
  const projectId = projRows[0]?.id;
  created.funnelIds.push(funnelId);
  created.customerIds.push(customerId);
  created.projectIds.push(projectId);
  check('前置：自动建客户/项目/四表行', !!(funnelId && customerId && projectId),
    `funnel=${funnelId} customer=${customerId} project=${projectId}`);

  // 模拟迁移回填：把拜访记录挂到客户标识上
  await q('UPDATE visit_records SET customer_id = ? WHERE id IN (?, ?)', [customerId, ...created.visitIds]);
  const mirrorBefore = await q('SELECT COUNT(*) c FROM sales_project_visit_records WHERE analysis_id = ?', [projectId]);
  check('前置：项目拜访镜像已带出', Number(mirrorBefore[0].c) === 2, `镜像 ${mirrorBefore[0].c} 行`);

  const listBefore = await api('/api/sales-four-tables/key?page=1&pageSize=50');
  const rowBefore = listBefore.json?.data?.list?.find(r => r.id === funnelId);
  check('前置：列表拜访条数', Number(rowBefore?.visit_count) === 2, `visit_count=${rowBefore?.visit_count}`);

  // ---- 场景1：改客户名单 ----
  const put = await api(`/api/sales-four-tables/key/${funnelId}`, {
    method: 'PUT',
    body: { customer_name: NAME_B, owner: USER, contact: '测试联系人', phone: '测试电话' }
  });
  check('改名接口成功', !!put.json.success, JSON.stringify(put.json).slice(0, 160));

  const aliasRows = await q('SELECT name_a, name_b FROM visit_customer_aliases WHERE (name_a = ? AND name_b = ?) OR (name_a = ? AND name_b = ?)', [NAME_A, NAME_B, NAME_B, NAME_A]);
  check('改名登记了等价名映射', aliasRows.length === 1, JSON.stringify(aliasRows));

  const listAfter = await api('/api/sales-four-tables/key?page=1&pageSize=50');
  const rowAfter = listAfter.json?.data?.list?.find(r => r.id === funnelId);
  check('改名后列表拜访条数仍为 2（不再变 0）', Number(rowAfter?.visit_count) === 2, `visit_count=${rowAfter?.visit_count}`);

  const dialog = await api(`/api/visit-records/customer/${encodeURIComponent(NAME_B)}`);
  const dialogCount = Array.isArray(dialog.json?.data) ? dialog.json.data.length : -1;
  check('改名后拜访弹窗仍能查到旧名下的 2 条', dialogCount === 2, `返回 ${dialogCount} 条`);

  const custAfter = await q('SELECT id, name FROM customers WHERE TRIM(name) IN (?, ?)', NAMES);
  check('改名未新增孤儿客户档案', custAfter.length === 1 && String(custAfter[0].name).trim() === NAME_B && custAfter[0].id === customerId,
    JSON.stringify(custAfter));

  const projAfter = await q('SELECT id, customer_name, customer_id FROM sales_project_analysis WHERE TRIM(customer_name) IN (?, ?)', NAMES);
  check('改名未新增空壳项目骨架', projAfter.length === 1 && projAfter[0].id === projectId && String(projAfter[0].customer_name).trim() === NAME_B,
    JSON.stringify(projAfter));

  const funnelAfter = await q('SELECT customer_id FROM sales_key_funnel WHERE id = ?', [funnelId]);
  check('客户标识在改名后保持不变', String(funnelAfter[0]?.customer_id) === String(customerId), `customer_id=${funnelAfter[0]?.customer_id}`);
  const visitIdsAfter = await q('SELECT COUNT(*) c FROM visit_records WHERE id IN (?, ?) AND customer_id = ? AND is_deleted = 0', [...created.visitIds, customerId]);
  check('拜访记录标识未被搬动', Number(visitIdsAfter[0].c) === 2, `${visitIdsAfter[0].c} 条`);

  // ---- 场景2：真删护栏 ----
  const mirrorRows0 = (await q('SELECT COUNT(*) c FROM sales_project_visit_records WHERE analysis_id = ?', [projectId]))[0].c;
  const guard = await api(`/api/sales-four-tables/project/${projectId}`, {
    method: 'PUT',
    body: { customer_name: NAME_B, visit_records: [], key_persons: [], competitors: [] }
  });
  const mirrorRows1 = (await q('SELECT COUNT(*) c FROM sales_project_visit_records WHERE analysis_id = ?', [projectId]))[0].c;
  check('未带 replace_children 的空子表保存不会删数据',
    !!guard.json.success && Number(mirrorRows1) === Number(mirrorRows0), `${mirrorRows0} -> ${mirrorRows1}`);

  const explicit = await api(`/api/sales-four-tables/project/${projectId}`, {
    method: 'PUT',
    body: { customer_name: NAME_B, visit_records: [], key_persons: [], competitors: [], replace_children: true }
  });
  const mirrorRows2 = (await q('SELECT COUNT(*) c FROM sales_project_visit_records WHERE analysis_id = ?', [projectId]))[0].c;
  check('显式声明时仍可清空子表（能力未被误伤）', !!explicit.json.success && Number(mirrorRows2) === 0, `${mirrorRows1} -> ${mirrorRows2}`);

  // ---- 场景3：镜像幂等（改名后再保存一次重点漏斗） ----
  const put2 = await api(`/api/sales-four-tables/key/${funnelId}`, {
    method: 'PUT', body: { customer_name: NAME_B, owner: USER }
  });
  const mirrorRows3 = (await q('SELECT COUNT(*) c FROM sales_project_visit_records WHERE analysis_id = ?', [projectId]))[0].c;
  check('重复保存不会重复补入镜像', !!put2.json.success && Number(mirrorRows3) <= 2, `镜像 ${mirrorRows3} 行`);

  // ---- 场景4：抢救脚本恢复空壳项目 ----
  await q('DELETE FROM sales_project_visit_records WHERE analysis_id = ?', [projectId]);
  const repair1 = execFileSync(process.execPath, ['scripts/repair-visit-loss.mjs', '--apply', `--only-project=${projectId}`], { encoding: 'utf8' });
  const repaired = (await q('SELECT COUNT(*) c FROM sales_project_visit_records WHERE analysis_id = ?', [projectId]))[0].c;
  check('抢救脚本把空壳项目补回 2 条', Number(repaired) === 2, `${repaired} 行`);
  const repair2 = execFileSync(process.execPath, ['scripts/repair-visit-loss.mjs', '--apply', `--only-project=${projectId}`], { encoding: 'utf8' });
  const repaired2 = (await q('SELECT COUNT(*) c FROM sales_project_visit_records WHERE analysis_id = ?', [projectId]))[0].c;
  check('抢救脚本重复执行不新增（幂等）', Number(repaired2) === 2 && /实际补入: 0 行/.test(repair2), `第二次 ${repaired2} 行`);

  // ---- 汇总 ----
  const passed = results.filter(r => r.ok).length;
  console.log(`\n=== 回归结果: ${passed}/${results.length} 通过 ===`);
  console.log('抢救脚本输出摘录:', repair1.split('\n').filter(l => /补入|待补镜像|备份/.test(l)).join(' | '));
  if (passed !== results.length) process.exitCode = 1;
}

main()
  .catch(e => { console.error('回归执行异常:', e); process.exitCode = 1; })
  .finally(async () => {
    try { await cleanup(); } catch (e) { console.error('清理失败:', e); process.exitCode = 1; }
    await pool.end().catch(() => {});
  });
