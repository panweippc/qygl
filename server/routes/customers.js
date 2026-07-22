import express from 'express';
import { createOperationLog } from '../utils/audit.js';
const router = express.Router();

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
      'SELECT * FROM customers' + whereStr + ' ORDER BY createdAt DESC LIMIT ? OFFSET ?',
      [...params, pageSize, offset]
    );
    res.json({ success: true, data: { list: customers, total, page, pageSize } });
  } catch (error) {
    console.error('获取客户数据失败:', error);
    res.status(500).json({ success: false, message: '获取客户数据失败' });
  }
});

router.post('/customers', async (req, res) => {
  const { pool } = req.app.locals;
  const { name, contact, phone, email, address, tags, status } = req.body;
  try {
    await pool.execute(
      'INSERT INTO customers (name, contact, phone, email, address, tags, status, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [name, contact, phone, email, address, tags, status, new Date().toISOString().replace('T', ' ').replace('Z', '')]
    );
    await createOperationLog(pool, {
      username: req.body.operator || req.body.applicant || '系统',
      action: 'create',
      module: 'customer',
      targetName: `客户: ${name}`,
      detail: `新增客户: ${name}`
    });
    res.json({ success: true, message: '客户添加成功' });
  } catch (error) {
    res.status(500).json({ success: false, message: '添加客户失败' });
  }
});

router.put('/customers/:id', async (req, res) => {
  const { pool } = req.app.locals;
  const { id } = req.params;
  const { name, contact, phone, email, address, tags, status } = req.body;
  try {
    await pool.execute(
      'UPDATE customers SET name = ?, contact = ?, phone = ?, email = ?, address = ?, tags = ?, status = ? WHERE id = ?',
      [name, contact, phone, email, address, tags, status, id]
    );
    await createOperationLog(pool, {
      username: req.body.operator || req.body.applicant || '系统',
      action: 'update',
      module: 'customer',
      targetName: `客户: ${name}`,
      detail: `更新客户: ${name} (ID: ${id})`
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
      username: req.body.operator || req.body.applicant || '系统',
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

export default router;
