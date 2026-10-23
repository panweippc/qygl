import express from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import xlsx from 'xlsx';
import { createOperationLog, getOperator, getRecordBefore, logDataChange, createNotification } from '../utils/audit.js';
import { check, firstError, checkTextField } from '../utils/validate.js';
const router = express.Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const upload = multer({ dest: path.join(__dirname, '../../uploads/temp') });

// 列自愈：确保 customers 表存在扩展字段（负责人/公海私海/下次跟进/提醒标记/来源）
let customerColsEnsured = false;
async function ensureCustomerColumns(pool) {
  if (customerColsEnsured) return;
  try {
    const [rows] = await pool.execute('SELECT COLUMN_NAME FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = ?', ['customers']);
    const existing = new Set(rows.map(r => r.COLUMN_NAME));
    const need = {
      source: "ALTER TABLE customers ADD COLUMN `source` VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '来源：销售漏斗/手动录入'",
      owner: "ALTER TABLE customers ADD COLUMN `owner` VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '负责人（私海归属，空表示公海）'",
      pool_status: "ALTER TABLE customers ADD COLUMN `pool_status` VARCHAR(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'private' COMMENT '公海/私海：public/private'",
      next_followup_at: "ALTER TABLE customers ADD COLUMN `next_followup_at` DATETIME DEFAULT NULL COMMENT '下次跟进时间'",
      followup_reminded: "ALTER TABLE customers ADD COLUMN `followup_reminded` TINYINT(1) DEFAULT 0 COMMENT '是否已生成跟进提醒，避免重复提醒'"
    };
    for (const [col, ddl] of Object.entries(need)) {
      if (!existing.has(col)) {
        await pool.execute(ddl);
        console.log('[ensureCustomerColumns] customers 补列', col);
      }
    }
    customerColsEnsured = true;
  } catch (e) {
    console.error('[ensureCustomerColumns] 失败(不影响主流程):', e.message);
  }
}

function currentUser(req) {
  return req.user?.name || getOperator(req) || '';
}
function isManager(req) {
  const role = req.user?.roleName || req.user?.role || '';
  return /管理员|经理|GM|admin/i.test(role) || req.user?.isAdmin === true;
}

const CUSTOMER_FIELDS = ['name', 'contact', 'phone', 'email', 'address', 'tags', 'status', 'owner', 'pool_status', 'source', 'next_followup_at'];

// 列表（支持 关键词/标签/公海私海/负责人 筛选）
router.get('/customers', async (req, res) => {
  const { pool } = req.app.locals;
  try {
    await ensureCustomerColumns(pool);
    const keyword = req.query.keyword || '';
    const tag = req.query.tag || '';
    const poolFilter = req.query.pool || ''; // ''=全部, public=公海, private=私海
    const owner = req.query.owner || '';
    const page = Math.max(1, Number(req.query.page) || 1);
    const pageSize = Math.min(200, Math.max(1, Number(req.query.pageSize) || 20));

    const where = [];
    const params = [];
    if (keyword) {
      where.push('(name LIKE ? OR contact LIKE ? OR phone LIKE ?)');
      params.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`);
    }
    if (tag) { where.push('(tags LIKE ?)'); params.push(`%${tag}%`); }
    if (poolFilter === 'public') where.push("pool_status = 'public'");
    else if (poolFilter === 'private') where.push("pool_status = 'private'");
    if (owner) { where.push('owner = ?'); params.push(owner); }

    const whereStr = where.length ? ' WHERE ' + where.join(' AND ') : '';
    const [countResult] = await pool.execute('SELECT COUNT(*) AS total FROM customers' + whereStr, params);
    const total = countResult[0].total;
    const offset = (page - 1) * pageSize;
    const [customers] = await pool.execute(
      'SELECT * FROM customers' + whereStr + ` ORDER BY createdAt DESC LIMIT ${pageSize} OFFSET ${offset}`,
      params
    );
    res.json({ success: true, data: { list: customers, total, page, pageSize } });
  } catch (error) {
    console.error('获取客户数据失败:', error);
    res.status(500).json({ success: false, message: '获取客户数据失败' });
  }
});

router.post('/customers', async (req, res) => {
  const { pool } = req.app.locals;
  const { name, contact, phone, email, address, tags, status, owner, pool_status, next_followup_at, source } = req.body;
  const vErr = firstError(
    check.str(name, '客户名称', { max: 100 }),
    check.strOptional(contact, '联系人', 50),
    check.phone(phone, '电话'),
    check.email(email, '邮箱'),
    check.strOptional(address, '地址', 255),
    check.strOptional(tags, '标签', 200)
  );
  if (vErr) return res.status(400).json({ success: false, message: vErr });
  try {
    await ensureCustomerColumns(pool);
    const ps = pool_status === 'public' ? 'public' : 'private';
    const own = ps === 'public' ? '' : (owner || currentUser(req));
    const [result] = await pool.execute(
      'INSERT INTO customers (name, contact, phone, email, address, tags, status, owner, pool_status, source, next_followup_at, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [name, contact, phone, email, address, tags, status, own, ps, source ?? null, next_followup_at || null, new Date().toISOString().replace('T', ' ').replace('Z', '')]
    );
    await createOperationLog(pool, {
      username: getOperator(req),
      action: 'create',
      module: 'customer',
      targetName: `客户: ${name}`,
      detail: `新增客户: ${name}`
    });
    res.json({ success: true, message: '客户添加成功', id: result.insertId });
  } catch (error) {
    res.status(500).json({ success: false, message: '添加客户失败' });
  }
});

router.put('/customers/:id', async (req, res) => {
  const { pool } = req.app.locals;
  const { id } = req.params;
  const { name, contact, phone, email, address, tags, status, owner, pool_status, next_followup_at } = req.body;
  const vErr = firstError(
    check.strOptional(name, '客户名称', 100),
    check.strOptional(contact, '联系人', 50),
    check.phone(phone, '电话'),
    check.email(email, '邮箱'),
    check.strOptional(address, '地址', 255),
    check.strOptional(tags, '标签', 200)
  );
  if (vErr) return res.status(400).json({ success: false, message: vErr });
  try {
    await ensureCustomerColumns(pool);
    const beforeValue = await getRecordBefore(pool, 'customers', id, { name: 1, contact: 1, phone: 1, email: 1, address: 1, tags: 1, status: 1, owner: 1, pool_status: 1, next_followup_at: 1 });
    const ps = pool_status ? (pool_status === 'public' ? 'public' : 'private') : undefined;
    const sets = ['name = ?', 'contact = ?', 'phone = ?', 'email = ?', 'address = ?', 'tags = ?', 'status = ?'];
    const values = [name, contact, phone, email, address, tags, status];
    if (ps) {
      sets.push('pool_status = ?');
      values.push(ps);
      sets.push('owner = ?');
      values.push(ps === 'public' ? '' : (owner || currentUser(req)));
    }
    if ('source' in req.body) { sets.push('source = ?'); values.push(req.body.source ?? null); }
    if (next_followup_at !== undefined) { sets.push('next_followup_at = ?'); values.push(next_followup_at || null); sets.push('followup_reminded = 0'); }
    values.push(id);
    await pool.execute(`UPDATE customers SET ${sets.join(', ')} WHERE id = ?`, values);
    await createOperationLog(pool, {
      username: getOperator(req),
      action: 'update',
      module: 'customer',
      targetName: `客户: ${name}`,
      detail: `更新客户: ${name} (ID: ${id})`
    });
    await logDataChange(pool, {
      module: 'customer', username: getOperator(req), targetId: id, targetName: `客户: ${name}`,
      beforeValue, afterValue: { name, contact, phone, email, address, tags, status }, ipAddress: req.ip
    });
    res.json({ success: true, message: '客户更新成功' });
  } catch (error) {
    res.status(500).json({ success: false, message: '更新客户失败' });
  }
});

router.delete('/customers/:id', async (req, res) => {
  const { pool } = req.app.locals;
  const { id } = req.params;
  try {
    const [rows] = await pool.execute('SELECT name FROM customers WHERE id = ?', [id]);
    const customerName = rows.length > 0 ? rows[0].name : `ID: ${id}`;
    await pool.execute('DELETE FROM customers WHERE id = ?', [id]);
    await createOperationLog(pool, {
      username: getOperator(req),
      action: 'delete',
      module: 'customer',
      targetName: `客户: ${customerName}`,
      detail: `删除客户: ${customerName} (ID: ${id})`
    });
    res.json({ success: true, message: '客户删除成功' });
  } catch (error) {
    res.status(500).json({ success: false, message: '删除客户失败' });
  }
});

// 公海私海：认领（公海→本人私海）
router.post('/customers/:id/claim', async (req, res) => {
  const { pool } = req.app.locals;
  const { id } = req.params;
  const user = currentUser(req);
  if (!user) return res.status(401).json({ success: false, message: '未登录' });
  try {
    const [rows] = await pool.execute('SELECT id, name, pool_status, owner FROM customers WHERE id = ?', [id]);
    if (rows.length === 0) return res.status(404).json({ success: false, message: '客户不存在' });
    if (rows[0].pool_status === 'private') return res.status(400).json({ success: false, message: '该客户已在私海' });
    await pool.execute("UPDATE customers SET pool_status = 'private', owner = ?, followup_reminded = 0 WHERE id = ?", [user, id]);
    await createOperationLog(pool, { username: getOperator(req), action: 'claim', module: 'customer', targetName: `客户: ${rows[0].name}`, detail: `${user} 认领客户 ${rows[0].name}` });
    res.json({ success: true, message: '认领成功' });
  } catch (error) {
    res.status(500).json({ success: false, message: '认领失败' });
  }
});

// 公海私海：释放（私海→公海，仅负责人或经理）
router.post('/customers/:id/release', async (req, res) => {
  const { pool } = req.app.locals;
  const { id } = req.params;
  const user = currentUser(req);
  if (!user) return res.status(401).json({ success: false, message: '未登录' });
  try {
    const [rows] = await pool.execute('SELECT id, name, pool_status, owner FROM customers WHERE id = ?', [id]);
    if (rows.length === 0) return res.status(404).json({ success: false, message: '客户不存在' });
    if (rows[0].pool_status !== 'private') return res.status(400).json({ success: false, message: '该客户已在公海' });
    if (rows[0].owner !== user && !isManager(req)) return res.status(403).json({ success: false, message: '无权释放该客户' });
    await pool.execute("UPDATE customers SET pool_status = 'public', owner = '' WHERE id = ?", [id]);
    await createOperationLog(pool, { username: getOperator(req), action: 'release', module: 'customer', targetName: `客户: ${rows[0].name}`, detail: `${user} 释放客户 ${rows[0].name} 到公海` });
    res.json({ success: true, message: '已释放到公海' });
  } catch (error) {
    res.status(500).json({ success: false, message: '释放失败' });
  }
});

// 公海私海：分配（经理将私海客户指派给某负责人）
router.post('/customers/:id/assign', async (req, res) => {
  const { pool } = req.app.locals;
  const { id } = req.params;
  const { owner } = req.body;
  if (!isManager(req)) return res.status(403).json({ success: false, message: '无权限' });
  if (!owner || !String(owner).trim()) return res.status(400).json({ success: false, message: '请指定负责人' });
  try {
    const [rows] = await pool.execute('SELECT id, name FROM customers WHERE id = ?', [id]);
    if (rows.length === 0) return res.status(404).json({ success: false, message: '客户不存在' });
    await pool.execute("UPDATE customers SET owner = ?, pool_status = 'private', followup_reminded = 0 WHERE id = ?", [String(owner).trim(), id]);
    await createOperationLog(pool, { username: getOperator(req), action: 'assign', module: 'customer', targetName: `客户: ${rows[0].name}`, detail: `分配给 ${owner}` });
    res.json({ success: true, message: '分配成功' });
  } catch (error) {
    res.status(500).json({ success: false, message: '分配失败' });
  }
});

// 跟进提醒：设置下次跟进时间
router.put('/customers/:id/followup', async (req, res) => {
  const { pool } = req.app.locals;
  const { id } = req.params;
  const { next_followup_at } = req.body;
  try {
    await ensureCustomerColumns(pool);
    const [rows] = await pool.execute('SELECT id, name FROM customers WHERE id = ?', [id]);
    if (rows.length === 0) return res.status(404).json({ success: false, message: '客户不存在' });
    await pool.execute('UPDATE customers SET next_followup_at = ?, followup_reminded = 0 WHERE id = ?', [next_followup_at || null, id]);
    res.json({ success: true, message: '已更新跟进时间' });
  } catch (error) {
    res.status(500).json({ success: false, message: '更新失败' });
  }
});

// 跟进提醒：获取到期/超期客户，并幂等生成通知（进消息中心）
router.get('/customers/followup-reminders', async (req, res) => {
  const { pool } = req.app.locals;
  try {
    await ensureCustomerColumns(pool);
    const [rows] = await pool.execute(
      "SELECT * FROM customers WHERE next_followup_at IS NOT NULL AND pool_status = 'private' AND next_followup_at <= DATE_ADD(NOW(), INTERVAL 3 DAY) ORDER BY next_followup_at ASC"
    );
    const now = new Date();
    const list = rows.map(r => ({
      id: r.id, name: r.name, owner: r.owner, next_followup_at: r.next_followup_at,
      overdue: new Date(r.next_followup_at) < now
    }));
    // 幂等生成通知：仅对未提醒过的记录提醒一次
    for (const r of rows) {
      if (r.followup_reminded) continue;
      const overdue = new Date(r.next_followup_at) < now;
      const title = overdue ? '客户跟进已超期' : '客户跟进即将到期';
      const content = `客户「${r.name}」的跟进时间 ${r.next_followup_at} ${overdue ? '已超期' : '即将到期'}，请及时处理。`;
      try {
        await createNotification(pool, { userId: r.owner, title, content, type: 'customer_followup', relatedId: r.id, relatedType: 'customer' });
        await pool.execute('UPDATE customers SET followup_reminded = 1 WHERE id = ?', [r.id]);
      } catch (e) { console.error('生成跟进提醒通知失败:', e.message); }
    }
    res.json({ success: true, data: list });
  } catch (error) {
    res.status(500).json({ success: false, message: '获取提醒失败' });
  }
});

// 标签筛选项（去重聚合）
router.get('/customers/tags', async (req, res) => {
  const { pool } = req.app.locals;
  try {
    const [rows] = await pool.execute('SELECT tags FROM customers WHERE tags IS NOT NULL AND tags <> ""');
    const set = new Set();
    for (const r of rows) {
      String(r.tags).split(',').map(t => t.trim()).filter(Boolean).forEach(t => set.add(t));
    }
    res.json({ success: true, data: [...set] });
  } catch (error) {
    res.status(500).json({ success: false, message: '获取标签失败' });
  }
});

// 导出 Excel（中文表头，应用当前筛选）
router.get('/customers/export', async (req, res) => {
  const { pool } = req.app.locals;
  try {
    await ensureCustomerColumns(pool);
    const keyword = req.query.keyword || '';
    const tag = req.query.tag || '';
    const poolFilter = req.query.pool || '';
    const owner = req.query.owner || '';
    const where = [];
    const params = [];
    if (keyword) { where.push('(name LIKE ? OR contact LIKE ? OR phone LIKE ?)'); params.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`); }
    if (tag) { where.push('(tags LIKE ?)'); params.push(`%${tag}%`); }
    if (poolFilter === 'public') where.push("pool_status = 'public'");
    else if (poolFilter === 'private') where.push("pool_status = 'private'");
    if (owner) { where.push('owner = ?'); params.push(owner); }
    const whereStr = where.length ? ' WHERE ' + where.join(' AND ') : '';
    const [rows] = await pool.execute('SELECT * FROM customers' + whereStr + ' ORDER BY createdAt DESC', params);
    const data = rows.map(r => ({
      '客户名称': r.name,
      '联系人': r.contact,
      '联系电话': r.phone,
      '邮箱': r.email,
      '地址': r.address,
      '标签': r.tags,
      '状态': r.status,
      '负责人': r.owner || '',
      '公海/私海': (r.pool_status === 'public' ? '公海' : '私海'),
      '下次跟进时间': r.next_followup_at || '',
      '来源': r.source || '',
      '创建时间': r.createdAt
    }));
    const ws = xlsx.utils.json_to_sheet(data.length ? data : [{ '客户名称': '', '联系人': '', '联系电话': '', '邮箱': '', '地址': '', '标签': '', '状态': '', '负责人': '', '公海/私海': '', '下次跟进时间': '', '来源': '', '创建时间': '' }]);
    const wb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(wb, ws, '客户管理');
    const buf = xlsx.write(wb, { bookType: 'xlsx', type: 'buffer' });
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=customers_export.xlsx');
    res.send(buf);
  } catch (error) {
    console.error('导出客户失败:', error);
    res.status(500).json({ success: false, message: '导出失败' });
  }
});

// 下载导入模板
router.get('/customers/template', (req, res) => {
  const data = [{ '客户名称': '示例客户', '联系人': '张三', '联系电话': '13800000001', '邮箱': 'zhangsan@example.com', '地址': '内蒙古乌兰察布市', '标签': '重点,A类', '状态': '活跃', '负责人': '', '公海/私海': '私海', '下次跟进时间': '2026-11-01 10:00:00' }];
  const ws = xlsx.utils.json_to_sheet(data);
  const wb = xlsx.utils.book_new();
  xlsx.utils.book_append_sheet(wb, ws, '客户导入模板');
  const buf = xlsx.write(wb, { bookType: 'xlsx', type: 'buffer' });
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename=customers_import_template.xlsx');
  res.send(buf);
});

// 导入 Excel（服务端解析，列名模糊匹配）
router.post('/customers/import', upload.single('file'), async (req, res) => {
  const { pool } = req.app.locals;
  try {
    await ensureCustomerColumns(pool);
    if (!req.file) return res.status(400).json({ success: false, message: '请上传 Excel 文件' });
    const user = currentUser(req);
    const workbook = xlsx.readFile(req.file.path);
    const rawData = xlsx.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { header: 1, defval: '' });
    let headerRow = null, headerIndex = -1;
    for (let i = 0; i < rawData.length; i++) {
      const row = rawData[i];
      const nonEmpty = row.filter(c => c && c.toString().trim()).length;
      if (nonEmpty >= 3 && !row.some(c => c.toString().startsWith('__EMPTY'))) { headerRow = row; headerIndex = i; break; }
    }
    if (!headerRow) return res.status(400).json({ success: false, message: '未找到有效列名行' });
    const headers = headerRow.map(h => h.toString().trim());
    const clean = (s) => s.replace(/[\s\u00A0\u2000-\u200F\u2028-\u202F\uFEFF]+/g, '');
    const matchCol = (names) => {
      for (const raw of headers) {
        const t = clean(raw);
        for (const n of names) if (t.includes(n) || n.includes(t)) return raw;
      }
      return null;
    };
    const cols = {
      name: matchCol(['客户名称', '客户名', '名称']),
      contact: matchCol(['联系人', '姓名']),
      phone: matchCol(['联系电话', '电话', '手机']),
      email: matchCol(['邮箱', '邮件']),
      address: matchCol(['地址']),
      tags: matchCol(['标签']),
      status: matchCol(['状态']),
      owner: matchCol(['负责人', '归属人', 'owner']),
      pool: matchCol(['公海', '私海', '池']),
      next: matchCol(['下次跟进', '跟进时间', '计划跟进'])
    };
    if (!cols.name) return res.status(400).json({ success: false, message: '找不到「客户名称」列' });
    let imported = 0;
    for (let i = headerIndex + 1; i < rawData.length; i++) {
      const row = rawData[i];
      if (!row.some(c => c && c.toString().trim())) continue;
      const obj = {};
      headers.forEach((h, idx) => { obj[h] = row[idx] !== undefined ? row[idx] : ''; });
      const name = cols.name ? String(obj[cols.name]).trim() : '';
      if (!name) continue;
      const poolStatus = cols.pool && /公海/.test(String(obj[cols.pool])) ? 'public' : 'private';
      const owner = poolStatus === 'public' ? '' : (cols.owner ? String(obj[cols.owner]).trim() : (user || ''));
      await pool.execute(
        'INSERT INTO customers (name, contact, phone, email, address, tags, status, owner, pool_status, source, next_followup_at, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [
          name,
          cols.contact ? String(obj[cols.contact]).trim() : '',
          cols.phone ? String(obj[cols.phone]).trim() : '',
          cols.email ? String(obj[cols.email]).trim() : '',
          cols.address ? String(obj[cols.address]).trim() : '',
          cols.tags ? String(obj[cols.tags]).trim() : '',
          cols.status ? String(obj[cols.status]).trim() : '活跃',
          owner, poolStatus, '导入',
          cols.next ? String(obj[cols.next]).trim() || null : null,
          new Date().toISOString().replace('T', ' ').replace('Z', '')
        ]
      );
      imported++;
    }
    await createOperationLog(pool, { username: getOperator(req), action: 'import', module: 'customer', targetName: '客户导入', detail: `导入客户 ${imported} 条` });
    res.json({ success: true, message: `导入成功：${imported} 条`, data: { imported } });
  } catch (error) {
    console.error('导入客户失败:', error);
    res.status(500).json({ success: false, message: '导入失败: ' + error.message });
  }
});

router.get('/customer-activities/:customerId', async (req, res) => {
  const { pool } = req.app.locals;
  const { customerId } = req.params;
  try {
    const [activities] = await pool.execute('SELECT * FROM customer_activities WHERE customerId = ?', [customerId]);
    res.json({ success: true, data: activities });
  } catch (error) {
    res.status(500).json({ success: false, message: '获取客户跟进记录失败' });
  }
});

// 客户管理 ↔ 销售漏斗 双向关联：按客户名称反查其漏斗记录（意向 / 重点 / 成交）
router.get('/customers/funnel-link', async (req, res) => {
  const { pool } = req.app.locals;
  const { name } = req.query;
  if (!name) return res.json({ success: true, data: [] });
  try {
    const tables = [
      { table: 'sales_intention_funnel', stage: '意向' },
      { table: 'sales_key_funnel', stage: '重点' },
      { table: 'sales_deal_customers', stage: '成交' }
    ];
    const out = [];
    for (const { table, stage } of tables) {
      try {
      const [rows] = await pool.execute(
        `SELECT id, customer_name, contact, phone, owner, progress_percent, sales_status, success_or_giveup, contract_amount, actual_amount, report_month FROM \`${table}\` WHERE customer_name = ? ORDER BY created_at DESC`,
        [name]
      );
      for (const r of rows) {
        out.push({
          stage,
          table,
          id: r.id,
          customerName: r.customer_name,
          contact: r.contact,
          phone: r.phone,
          owner: r.owner,
          progress: r.progress_percent,
          salesStatus: r.sales_status,
          successOrGiveup: r.success_or_giveup,
          contractAmount: r.contract_amount,
          actualAmount: r.actual_amount,
          reportMonth: r.report_month
        });
      }
      } catch (e) {
        console.error('funnel-link 表查询失败(' + table + '):', e.message);
      }
    }
    res.json({ success: true, data: out });
  } catch (error) {
    res.status(500).json({ success: false, message: '获取关联漏斗失败' });
  }
});

router.get('/customer-activities/by-town/:townId', async (req, res) => {
  const { pool } = req.app.locals;
  const { townId } = req.params;
  try {
    const [activities] = await pool.execute(
      'SELECT ca.* FROM customer_activities ca JOIN customers c ON ca.customerId = c.id WHERE c.id = ?',
      [townId]
    );
    res.json({ success: true, data: activities });
  } catch (error) {
    res.status(500).json({ success: false, data: [] });
  }
});

router.post('/customer-activities', async (req, res) => {
  const { pool } = req.app.locals;
  const { customerId, content, followUpMethod, followUpTime } = req.body;
  try {
    await pool.execute(
      'INSERT INTO customer_activities (customerId, content, followUpMethod, followUpTime, createdAt) VALUES (?, ?, ?, ?, ?)',
      [customerId, content, followUpMethod, followUpTime, new Date().toISOString().replace('T', ' ').replace('Z', '')]
    );
    res.json({ success: true, message: '跟进记录添加成功' });
  } catch (error) {
    res.status(500).json({ success: false, message: '添加跟进记录失败' });
  }
});

export { ensureCustomerColumns };
export default router;
