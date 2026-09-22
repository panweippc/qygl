import express from 'express';
import { createOperationLog, getRecordBefore, logDataChange, getOperator } from '../utils/audit.js';
import { check, firstError, checkTextField } from '../utils/validate.js';
const router = express.Router();

// 列自愈：确保 customers 表存在 source 列（来源标记），避免手动迁移遗漏
let customerColsEnsured = false;
async function ensureCustomerColumns(pool) {
  if (customerColsEnsured) return;
  try {
    const [rows] = await pool.execute('SELECT COLUMN_NAME FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = ?', ['customers']);
    const existing = new Set(rows.map(r => r.COLUMN_NAME));
    if (!existing.has('source')) {
      await pool.execute("ALTER TABLE customers ADD COLUMN `source` VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '来源：销售漏斗/手动录入'");
      console.log('[ensureCustomerColumns] customers 补列 source');
    }
    customerColsEnsured = true;
  } catch (e) {
    console.error('[ensureCustomerColumns] 失败(不影响主流程):', e.message);
  }
}

router.get('/customers', async (req, res) => {
  const { pool } = req.app.locals;
  try {
    const keyword = req.query.keyword || '';
    const page = Math.max(1, Number(req.query.page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(req.query.pageSize) || 20));

    let whereClauses = [];
    let params = [];
    if (keyword) {
      whereClauses.push('(name LIKE ? OR contact LIKE ? OR phone LIKE ?)');
      params.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`);
    }
    const whereStr = whereClauses.length > 0 ? ' WHERE ' + whereClauses.join(' AND ') : '';

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
  const { name, contact, phone, email, address, tags, status, source } = req.body;
  // 输入校验
  const vErr = firstError(
    check.str(name, '客户名称', { max: 100 }),
    check.strOptional(contact, '联系人', 50),
    check.phone(phone, '电话'),
    check.email(email, '邮箱'),
    check.strOptional(address, '地址', 255),
    check.strOptional(tags, '标签', 200)
  );
  if (vErr) {
    return res.status(400).json({ success: false, message: vErr });
  }
  try {
    await ensureCustomerColumns(pool);
    const [result] = await pool.execute(
      'INSERT INTO customers (name, contact, phone, email, address, tags, status, source, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [name, contact, phone, email, address, tags, status, source ?? null, new Date().toISOString().replace('T', ' ').replace('Z', '')]
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
  const { name, contact, phone, email, address, tags, status, source } = req.body;
  // 输入校验
  const vErr = firstError(
    check.strOptional(name, '客户名称', 100),
    check.strOptional(contact, '联系人', 50),
    check.phone(phone, '电话'),
    check.email(email, '邮箱'),
    check.strOptional(address, '地址', 255),
    check.strOptional(tags, '标签', 200)
  );
  if (vErr) {
    return res.status(400).json({ success: false, message: vErr });
  }
  try {
    const beforeValue = await getRecordBefore(pool, 'customers', id, { name: 1, contact: 1, phone: 1, email: 1, address: 1, tags: 1, status: 1 });
    await ensureCustomerColumns(pool);
    const sets = ['name = ?', 'contact = ?', 'phone = ?', 'email = ?', 'address = ?', 'tags = ?', 'status = ?'];
    const values = [name, contact, phone, email, address, tags, status];
    if ('source' in req.body) { sets.push('source = ?'); values.push(source ?? null); }
    values.push(id);
    await pool.execute(
      `UPDATE customers SET ${sets.join(', ')} WHERE id = ?`,
      values
    );
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
