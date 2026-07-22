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
  const { countyId, name, contactPerson, contactPhone, contactType = '', manager = '', customer_manager = '', our_manager = '', intention, requirement = '', isDealed = false, sales = 0 } = req.body;
  const dealStatus = (isDealed === true || isDealed === 'true') ? 1 : 0;
  try {
    const { pool } = req.app.locals;
    await pool.execute(
      'INSERT INTO town_sales (countyId, name, contactPerson, contactPhone, contactType, manager, customer_manager, our_manager, intention, requirement, isDealed, sales, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [countyId, name, contactPerson, contactPhone, contactType, manager, customer_manager, our_manager, intention, requirement, dealStatus, sales, new Date().toISOString().replace('T', ' ').replace('Z', '')]
    );
    res.json({ success: true, message: '乡镇销售数据添加成功' });
  } catch (error) {
    res.status(500).json({ success: false, message: '添加乡镇销售数据失败' });
  }
});

// 更新乡镇销售数据
router.put('/town-sales/:id', async (req, res) => {
  const { id } = req.params;
  const { name, contactPerson, contactPhone, contactType = '', manager = '', customer_manager = '', our_manager = '', intention, requirement = '', isDealed = false, sales } = req.body;
  const dealStatus = (isDealed === true || isDealed === 'true') ? 1 : 0;
  try {
    const { pool } = req.app.locals;
    const updates = [];
    const values = [];
    if (name !== undefined) { updates.push('name = ?'); values.push(name); }
    if (contactPerson !== undefined) { updates.push('contactPerson = ?'); values.push(contactPerson); }
    if (contactPhone !== undefined) { updates.push('contactPhone = ?'); values.push(contactPhone); }
    if (req.body.contactType !== undefined) { updates.push('contactType = ?'); values.push(contactType); }
    if (req.body.manager !== undefined) { updates.push('manager = ?'); values.push(manager); }
    if (req.body.customer_manager !== undefined) { updates.push('customer_manager = ?'); values.push(customer_manager); }
    if (req.body.our_manager !== undefined) { updates.push('our_manager = ?'); values.push(our_manager); }
    if (intention !== undefined) { updates.push('intention = ?'); values.push(intention); }
    if (req.body.requirement !== undefined) { updates.push('requirement = ?'); values.push(requirement); }
    if (req.body.isDealed !== undefined) { updates.push('isDealed = ?'); values.push(dealStatus); }
    if (req.body.sales !== undefined) { updates.push('sales = ?'); values.push(sales); }
    if (updates.length === 0) return res.json({ success: true, message: '没有需要更新的字段' });
    values.push(id);
    await pool.execute(
      `UPDATE town_sales SET ${updates.join(', ')} WHERE id = ?`, values
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

// 销售机会列表（含分页、搜索、筛选）
router.get('/sales-opportunities', async (req, res) => {
  try {
    const { pool } = req.app.locals;
    const keyword = req.query.keyword || '';
    const stage = req.query.stage ? Number(req.query.stage) : null;
    const manager = req.query.manager || '';
    const page = Math.max(1, Number(req.query.page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(req.query.pageSize) || 20));

    let whereClauses = [];
    let params = [];
    if (keyword) {
      whereClauses.push('(ts.name LIKE ? OR ts.contactPerson LIKE ?)');
      params.push(`%${keyword}%`, `%${keyword}%`);
    }
    if (stage) {
      whereClauses.push('ts.intention = ?');
      params.push(stage);
    }
    if (manager) {
      whereClauses.push('ts.manager = ?');
      params.push(manager);
    }
    const whereStr = whereClauses.length > 0 ? ' WHERE ' + whereClauses.join(' AND ') : '';

    const [countResult] = await pool.execute('SELECT COUNT(*) AS total FROM town_sales ts' + whereStr, params);
    const total = countResult[0].total;
    const offset = (page - 1) * pageSize;

    const [rows] = await pool.execute(
      'SELECT ts.id, ts.name as townName, ts.contactPerson, ts.contactPhone, ts.manager, ts.intention, ts.sales, ts.countyId, cs.cityId, cs.name as countyName FROM town_sales ts LEFT JOIN county_sales cs ON ts.countyId = cs.id' + whereStr + ' ORDER BY ts.createdAt DESC LIMIT ? OFFSET ?',
      [...params, pageSize, offset]
    );

    // 获取每个乡镇的最后一条拜访记录
    for (const row of rows) {
      if (row.id) {
        const [visits] = await pool.execute(
          'SELECT visitContent, visitDate, visitPerson, nextPlan FROM visit_records WHERE townId = ? ORDER BY visitDate DESC LIMIT 1',
          [row.id]
        );
        row.lastVisit = visits.length > 0 ? visits[0] : null;
      }
    }

    // 获取可选负责人列表
    const [managers] = await pool.execute('SELECT DISTINCT ts.manager FROM town_sales ts WHERE ts.manager IS NOT NULL AND ts.manager != \'\' ORDER BY ts.manager');

    res.json({ success: true, data: { list: rows, total, page, pageSize, managers: managers.map(m => m.manager) } });
  } catch (error) {
    console.error('获取销售机会列表失败:', error);
    res.status(500).json({ success: false, message: '获取销售机会列表失败' });
  }
});

// 更新乡镇销售阶段
router.put('/town-sales/:id/stage', async (req, res) => {
  const { id } = req.params;
  const { intention } = req.body;
  try {
    const { pool } = req.app.locals;
    await pool.execute('UPDATE town_sales SET intention = ? WHERE id = ?', [intention, id]);
    res.json({ success: true, message: '阶段已更新' });
  } catch (error) {
    res.status(500).json({ success: false, message: '更新阶段失败' });
  }
});

// 销售目标管理
router.get('/sales-targets', async (req, res) => {
  try {
    const { pool } = req.app.locals;
    const year = Number(req.query.year) || new Date().getFullYear();
    const month = Number(req.query.month) || (new Date().getMonth() + 1);
    // 按客户负责人分组统计实际数据（优先用customer_manager，回退到manager）
    const [targets] = await pool.execute(
      `SELECT st.*, COALESCE(ts.cnt, 0) as actualCount, COALESCE(ts.totalSales, 0) as actualAmount FROM sales_targets st LEFT JOIN (SELECT COALESCE(NULLIF(customer_manager,''), manager) as cm, COUNT(*) as cnt, COALESCE(SUM(sales), 0) as totalSales FROM town_sales WHERE YEAR(createdAt) = ? AND MONTH(createdAt) = ? GROUP BY cm) ts ON st.managerId = ts.cm WHERE st.year = ? AND st.month = ? ORDER BY st.managerId`,
      [year, month, year, month]
    );
    // 获取所有客户负责人列表（含未设目标的），优先用customer_manager
    const [allManagers] = await pool.execute(
      `SELECT DISTINCT COALESCE(NULLIF(customer_manager,''), manager) as cm, our_manager FROM town_sales WHERE COALESCE(NULLIF(customer_manager,''), manager) IS NOT NULL AND COALESCE(NULLIF(customer_manager,''), manager) != '' ORDER BY cm REGEXP '^[0-9]+$' DESC, CAST(cm AS UNSIGNED), cm`
    );
    const managerList = allManagers.map(m => ({ id: m.cm, our: m.our_manager || '' }));
    const targetMap = new Map(targets.map(t => [t.managerId, t]));
    const merged = managerList.map(({ id, our }) => {
      const t = targetMap.get(id);
      return { managerId: id, managerName: id, ourManager: our, year, month, targetAmount: t?.targetAmount || 0, actualCount: t?.actualCount || 0, actualAmount: t?.actualAmount || 0, id: t?.id || null };
    });
    res.json({ success: true, data: merged });
  } catch (error) {
    console.error('获取销售目标失败:', error);
    res.status(500).json({ success: false, message: '获取销售目标失败' });
  }
});

router.put('/sales-targets', async (req, res) => {
  try {
    const { pool } = req.app.locals;
    const { targets } = req.body;
    if (!Array.isArray(targets)) return res.status(400).json({ success: false, message: '参数错误' });
    for (const t of targets) {
      if (t.id) {
        await pool.execute('UPDATE sales_targets SET targetAmount = ?, managerName = ? WHERE id = ?', [t.targetAmount || 0, t.managerName || '', t.id]);
      } else {
        await pool.execute(
          'INSERT INTO sales_targets (managerId, managerName, year, month, targetAmount) VALUES (?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE targetAmount = VALUES(targetAmount), managerName = VALUES(managerName)',
          [t.managerId, t.managerName || '', t.year, t.month, t.targetAmount || 0]
        );
      }
    }
    res.json({ success: true, message: '目标已保存' });
  } catch (error) {
    console.error('保存销售目标失败:', error);
    res.status(500).json({ success: false, message: '保存销售目标失败' });
  }
});

export default router;
