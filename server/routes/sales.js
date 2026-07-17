import express from 'express';
import { createOperationLog } from '../utils/audit.js';
const router = express.Router();

// 获取销售漏斗阶段
router.get('/sales-funnel/stages', async (req, res) => {
  try {
    const { pool } = req.app.locals;
    const [stages] = await pool.execute('SELECT * FROM sales_funnel_stages ORDER BY orderIndex');
    res.json({ success: true, data: stages });
  } catch (error) {
    res.status(500).json({ success: false, message: '获取销售漏斗阶段失败' });
  }
});

// 获取销售漏斗数据
router.get('/sales-funnel/data', async (req, res) => {
  try {
    const { pool } = req.app.locals;
    const [data] = await pool.execute('SELECT sfd.*, sfs.name FROM sales_funnel_data sfd JOIN sales_funnel_stages sfs ON sfd.stageId = sfs.id ORDER BY sfs.orderIndex');
    res.json({ success: true, data: data });
  } catch (error) {
    res.status(500).json({ success: false, message: '获取销售漏斗数据失败' });
  }
});

// 更新销售漏斗数据
router.put('/sales-funnel/data/:id', async (req, res) => {
  const { id } = req.params;
  const { count, amount } = req.body;
  try {
    const { pool } = req.app.locals;
    await pool.execute(
      'UPDATE sales_funnel_data SET count = ?, amount = ? WHERE id = ?',
      [count, amount, id]
    );
    res.json({ success: true, message: '销售漏斗数据更新成功' });
  } catch (error) {
    res.status(500).json({ success: false, message: '更新销售漏斗数据失败' });
  }
});

// 获取盟市销售数据
router.get('/city-sales', async (req, res) => {
  try {
    const { pool } = req.app.locals;
    const [data] = await pool.execute('SELECT * FROM city_sales');
    res.json({ success: true, data: data });
  } catch (error) {
    res.status(500).json({ success: false, message: '获取盟市销售数据失败' });
  }
});

// 获取单个盟市销售数据
router.get('/city-sales/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const { pool } = req.app.locals;
    const [data] = await pool.execute('SELECT * FROM city_sales WHERE id = ?', [id]);
    res.json({ success: true, data: data[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: '获取盟市销售数据失败' });
  }
});

// 添加盟市销售数据
router.post('/city-sales', async (req, res) => {
  const { name, sales, customers, growthRate } = req.body;
  try {
    const { pool } = req.app.locals;
    await pool.execute(
      'INSERT INTO city_sales (name, sales, customers, growthRate, createdAt) VALUES (?, ?, ?, ?, ?)',
      [name, sales, customers, growthRate, new Date().toISOString().replace('T', ' ').replace('Z', '')]
    );
    await createOperationLog(pool, {
      username: req.body.operator || '系统',
      action: 'create',
      module: 'sales',
      targetName: `盟市销售数据"${name}"`,
    });
    res.json({ success: true, message: '盟市销售数据添加成功' });
  } catch (error) {
    res.status(500).json({ success: false, message: '添加盟市销售数据失败' });
  }
});

// 更新盟市销售数据
router.put('/city-sales/:id', async (req, res) => {
  const { id } = req.params;
  const { name, sales, customers, growthRate } = req.body;
  try {
    const { pool } = req.app.locals;
    const [old] = await pool.execute('SELECT name FROM city_sales WHERE id = ?', [id]);
    const cityName = name || (old.length > 0 ? old[0].name : id);
    await pool.execute(
      'UPDATE city_sales SET name = ?, sales = ?, customers = ?, growthRate = ? WHERE id = ?',
      [name, sales, customers, growthRate, id]
    );
    await createOperationLog(pool, {
      username: req.body.operator || '系统',
      action: 'update',
      module: 'sales',
      targetName: `盟市销售数据"${cityName}"`,
      targetId: parseInt(id),
    });
    res.json({ success: true, message: '盟市销售数据更新成功' });
  } catch (error) {
    res.status(500).json({ success: false, message: '更新盟市销售数据失败' });
  }
});

// 删除盟市销售数据
router.delete('/city-sales/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const { pool } = req.app.locals;
    const [rows] = await pool.execute('SELECT name FROM city_sales WHERE id = ?', [id]);
    const cityName = rows.length > 0 ? rows[0].name : id;
    await pool.execute('DELETE FROM city_sales WHERE id = ?', [id]);
    await createOperationLog(pool, {
      username: req.query.operator || '系统',
      action: 'delete',
      module: 'sales',
      targetName: `盟市销售数据"${cityName}"`,
      targetId: parseInt(id),
    });
    res.json({ success: true, message: '盟市销售数据删除成功' });
  } catch (error) {
    res.status(500).json({ success: false, message: '删除盟市销售数据失败' });
  }
});

// 获取旗县销售数据
router.get('/county-sales/:cityId', async (req, res) => {
  const { cityId } = req.params;
  try {
    const { pool } = req.app.locals;
    const [data] = await pool.execute('SELECT * FROM county_sales WHERE cityId = ?', [cityId]);
    res.json({ success: true, data: data });
  } catch (error) {
    res.status(500).json({ success: false, message: '获取旗县销售数据失败' });
  }
});

// 添加旗县销售数据
router.post('/county-sales', async (req, res) => {
  const { cityId, name, sales = 100000, customers = 5 } = req.body;
  try {
    const { pool } = req.app.locals;
    await pool.execute(
      'INSERT INTO county_sales (cityId, name, sales, customers, createdAt) VALUES (?, ?, ?, ?, ?)',
      [cityId, name, sales, customers, new Date().toISOString().replace('T', ' ').replace('Z', '')]
    );
    await createOperationLog(pool, {
      username: req.body.operator || '系统',
      action: 'create',
      module: 'sales',
      targetName: `旗县销售数据"${name}"`,
    });
    res.json({ success: true, message: '旗县销售数据添加成功' });
  } catch (error) {
    res.status(500).json({ success: false, message: '添加旗县销售数据失败' });
  }
});

// 更新旗县销售数据
router.put('/county-sales/:id', async (req, res) => {
  const { id } = req.params;
  const { name, sales, customers } = req.body;
  try {
    const { pool } = req.app.locals;
    const [old] = await pool.execute('SELECT name FROM county_sales WHERE id = ?', [id]);
    const countyName = name || (old.length > 0 ? old[0].name : id);
    const updates = [];
    const values = [];

    if (name !== undefined) {
      updates.push('name = ?');
      values.push(name);
    }
    if (sales !== undefined) {
      updates.push('sales = ?');
      values.push(sales);
    }
    if (customers !== undefined) {
      updates.push('customers = ?');
      values.push(customers);
    }

    if (updates.length === 0) {
      res.json({ success: true, message: '没有需要更新的字段' });
      return;
    }

    values.push(id);

    await pool.execute(
      `UPDATE county_sales SET ${updates.join(', ')} WHERE id = ?`,
      values
    );
    await createOperationLog(pool, {
      username: req.body.operator || '系统',
      action: 'update',
      module: 'sales',
      targetName: `旗县销售数据"${countyName}"`,
      targetId: parseInt(id),
    });
    res.json({ success: true, message: '旗县销售数据更新成功' });
  } catch (error) {
    res.status(500).json({ success: false, message: '更新旗县销售数据失败' });
  }
});

// 删除旗县销售数据
router.delete('/county-sales/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const { pool } = req.app.locals;
    const [rows] = await pool.execute('SELECT name FROM county_sales WHERE id = ?', [id]);
    const countyName = rows.length > 0 ? rows[0].name : id;
    await pool.execute('DELETE FROM county_sales WHERE id = ?', [id]);
    await createOperationLog(pool, {
      username: req.query.operator || '系统',
      action: 'delete',
      module: 'sales',
      targetName: `旗县销售数据"${countyName}"`,
      targetId: parseInt(id),
    });
    res.json({ success: true, message: '旗县销售数据删除成功' });
  } catch (error) {
    res.status(500).json({ success: false, message: '删除旗县销售数据失败' });
  }
});

// 获取乡镇销售数据
router.get('/town-sales/:countyId', async (req, res) => {
  const { countyId } = req.params;
  try {
    const { pool } = req.app.locals;
    const [data] = await pool.execute('SELECT * FROM town_sales WHERE countyId = ?', [countyId]);
    res.json({ success: true, data: data });
  } catch (error) {
    res.status(500).json({ success: false, message: '获取乡镇销售数据失败' });
  }
});

// 添加乡镇销售数据
router.post('/town-sales', async (req, res) => {
  const { countyId, name, contactPerson, contactPhone, manager = '', intention, requirement = '', isDealed = false } = req.body;
  const dealStatus = (isDealed === true || isDealed === 'true') ? 1 : 0;
  try {
    const { pool } = req.app.locals;
    await pool.execute(
      'INSERT INTO town_sales (countyId, name, contactPerson, contactPhone, manager, intention, requirement, isDealed, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [countyId, name, contactPerson, contactPhone, manager, intention, requirement, dealStatus, new Date().toISOString().replace('T', ' ').replace('Z', '')]
    );
    res.json({ success: true, message: '乡镇销售数据添加成功' });
  } catch (error) {
    res.status(500).json({ success: false, message: '添加乡镇销售数据失败' });
  }
});

// 更新乡镇销售数据
router.put('/town-sales/:id', async (req, res) => {
  const { id } = req.params;
  const { name, contactPerson, contactPhone, manager = '', intention, requirement = '', isDealed = false } = req.body;
  const dealStatus = (isDealed === true || isDealed === 'true') ? 1 : 0;
  try {
    const { pool } = req.app.locals;
    await pool.execute(
      'UPDATE town_sales SET name = ?, contactPerson = ?, contactPhone = ?, manager = ?, intention = ?, requirement = ?, isDealed = ? WHERE id = ?',
      [name, contactPerson, contactPhone, manager, intention, requirement, dealStatus, id]
    );
    res.json({ success: true, message: '乡镇销售数据更新成功' });
  } catch (error) {
    res.status(500).json({ success: false, message: '更新乡镇销售数据失败' });
  }
});

// 删除乡镇销售数据
router.delete('/town-sales/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const { pool } = req.app.locals;
    await pool.execute('DELETE FROM town_sales WHERE id = ?', [id]);
    res.json({ success: true, message: '乡镇销售数据删除成功' });
  } catch (error) {
    res.status(500).json({ success: false, message: '删除乡镇销售数据失败' });
  }
});

export default router;
