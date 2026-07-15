import express from 'express';
const router = express.Router();

router.get('/customers', async (req, res) => {
  const { pool } = req.app.locals;
  try {
    const [customers] = await pool.execute('SELECT * FROM customers');
    res.json({ success: true, data: customers });
  } catch (error) {
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
    res.json({ success: true, message: '客户更新成功' });
  } catch (error) {
    res.status(500).json({ success: false, message: '更新客户失败' });
  }
});

router.delete('/customers/:id', async (req, res) => {
  const { pool } = req.app.locals;
  const { id } = req.params;
  try {
    await pool.execute('DELETE FROM customers WHERE id = ?', [id]);
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
