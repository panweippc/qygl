import express from 'express';
import { createOperationLog, getOperator } from '../utils/audit.js';
const router = express.Router();

// 资产列表（支持类型/状态/部门/关键字筛选）
router.get('/assets', async (req, res) => {
  try {
    const { pool } = req.app.locals;
    const { type, status, department, keyword } = req.query;
    let sql = 'SELECT a.*, c.name AS categoryName, c.parentType FROM assets a LEFT JOIN asset_categories c ON a.categoryId = c.id WHERE 1=1';
    const params = [];
    if (type) { sql += ' AND a.assetType = ?'; params.push(type); }
    if (status) { sql += ' AND a.status = ?'; params.push(status); }
    if (department) { sql += ' AND a.department = ?'; params.push(department); }
    if (keyword) {
      sql += ' AND (a.name LIKE ? OR a.assetCode LIKE ? OR a.responsibleUser LIKE ?)';
      params.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`);
    }
    sql += ' ORDER BY a.id DESC';
    const [rows] = await pool.execute(sql, params);
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('获取资产列表失败:', error);
    res.status(500).json({ success: false, message: '获取资产列表失败' });
  }
});

// 资产概览统计（KPI / 类型分布 / 状态分布 / 无形资产到期预警 / 累计折旧）
router.get('/assets/summary', async (req, res) => {
  try {
    const { pool } = req.app.locals;
    const [[totalRow]] = await pool.execute('SELECT COUNT(*) AS total FROM assets');
    const [byType] = await pool.execute('SELECT assetType, COUNT(*) AS c FROM assets GROUP BY assetType');
    const [byStatus] = await pool.execute('SELECT status, COUNT(*) AS c FROM assets GROUP BY status');
    const [[depRow]] = await pool.execute(
      "SELECT COALESCE(SUM(originalValue - residualValue), 0) AS dep FROM assets WHERE assetType = 'fixed'"
    );
    const [expiring] = await pool.execute(
      `SELECT assetCode, name, expireDate, DATEDIFF(expireDate, CURDATE()) AS daysLeft
       FROM assets
       WHERE assetType = 'intangible' AND expireDate IS NOT NULL
         AND expireDate BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 30 DAY)
       ORDER BY expireDate ASC`
    );
    const typeMap = {};
    byType.forEach(r => { typeMap[r.assetType] = r.c; });
    const statusMap = {};
    byStatus.forEach(r => { statusMap[r.status] = r.c; });
    res.json({
      success: true,
      data: {
        total: totalRow.total,
        byType: typeMap,
        byStatus: statusMap,
        depreciationTotal: Number(depRow.dep || 0),
        expiringIntangibles: expiring
      }
    });
  } catch (error) {
    console.error('资产概览统计失败:', error);
    res.status(500).json({ success: false, message: '资产概览统计失败' });
  }
});

// 资产详情 + 生命周期轨迹
router.get('/assets/:id', async (req, res) => {
  try {
    const { pool } = req.app.locals;
    const { id } = req.params;
    const [[asset]] = await pool.execute(
      'SELECT a.*, c.name AS categoryName, c.parentType FROM assets a LEFT JOIN asset_categories c ON a.categoryId = c.id WHERE a.id = ?',
      [id]
    );
    if (!asset) return res.status(404).json({ success: false, message: '资产不存在' });
    const [logs] = await pool.execute('SELECT * FROM asset_logs WHERE assetId = ? ORDER BY createdAt DESC', [id]);
    res.json({ success: true, data: { asset, logs } });
  } catch (error) {
    console.error('获取资产详情失败:', error);
    res.status(500).json({ success: false, message: '获取资产详情失败' });
  }
});

// 新增资产（自动生成资产编号 ZC-YYYY-NNNN，记录入库轨迹）
router.post('/assets', async (req, res) => {
  const b = req.body;
  try {
    const { pool } = req.app.locals;
    const year = new Date().getFullYear();
    const [[{ c }]] = await pool.execute('SELECT COUNT(*) AS c FROM assets WHERE YEAR(createdAt) = ?', [year]);
    const assetCode = `ZC-${year}-${String(c + 1).padStart(4, '0')}`;
    const sql = `INSERT INTO assets
      (assetCode, name, assetType, categoryId, quantity, unit, acquireDate, source, originalValue, residualValue, depMethod, responsibleUser, department, location, carrier, status, expireDate, renewNoticeDate, remark, createdBy)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    const params = [
      assetCode, b.name, b.assetType || 'fixed', b.categoryId || null, b.quantity || 1, b.unit || '台',
      b.acquireDate || null, b.source || '', b.originalValue || 0, b.residualValue || 0, b.depMethod || '',
      b.responsibleUser || '', b.department || '', b.location || '', b.carrier || '', b.status || '在用',
      b.expireDate || null, b.renewNoticeDate || null, b.remark || '', getOperator(req)
    ];
    const [result] = await pool.execute(sql, params);
    await pool.execute(
      'INSERT INTO asset_logs (assetId, action, toStatus, operator, detail) VALUES (?, ?, ?, ?, ?)',
      [result.insertId, '入库', b.status || '在用', getOperator(req), `新增资产 ${assetCode} ${b.name}`]
    );
    const operator = getOperator(req);
    createOperationLog(pool, { userId: null, username: operator, action: 'create', module: 'asset', targetId: result.insertId, targetName: b.name, detail: `新增资产: ${b.name}`, ipAddress: req.ip });
    res.json({ success: true, message: '资产添加成功', assetCode });
  } catch (error) {
    console.error('新增资产失败:', error);
    res.status(500).json({ success: false, message: '新增资产失败' });
  }
});

// 更新资产（状态变更时记录轨迹）
router.put('/assets/:id', async (req, res) => {
  const { id } = req.params;
  const b = req.body;
  try {
    const { pool } = req.app.locals;
    const [[old]] = await pool.execute('SELECT status FROM assets WHERE id = ?', [id]);
    const sql = `UPDATE assets SET name=?, assetType=?, categoryId=?, quantity=?, unit=?, acquireDate=?, source=?, originalValue=?, residualValue=?, depMethod=?, responsibleUser=?, department=?, location=?, carrier=?, status=?, expireDate=?, renewNoticeDate=?, remark=? WHERE id=?`;
    await pool.execute(sql, [
      b.name, b.assetType, b.categoryId || null, b.quantity, b.unit, b.acquireDate || null, b.source,
      b.originalValue, b.residualValue, b.depMethod, b.responsibleUser, b.department, b.location, b.carrier,
      b.status, b.expireDate || null, b.renewNoticeDate || null, b.remark, id
    ]);
    if (old && old.status !== b.status) {
      await pool.execute(
        'INSERT INTO asset_logs (assetId, action, fromStatus, toStatus, operator, detail) VALUES (?, ?, ?, ?, ?, ?)',
        [id, '状态变更', old.status, b.status, getOperator(req), `状态 ${old.status} → ${b.status}`]
      );
    }
    const operator = getOperator(req);
    createOperationLog(pool, { userId: null, username: operator, action: 'update', module: 'asset', targetId: id, targetName: b.name, detail: `更新资产: ${b.name}`, ipAddress: req.ip });
    res.json({ success: true, message: '资产更新成功' });
  } catch (error) {
    console.error('更新资产失败:', error);
    res.status(500).json({ success: false, message: '更新资产失败' });
  }
});

// 删除资产（级联删除其生命周期轨迹）
router.delete('/assets/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const { pool } = req.app.locals;
    const [[old]] = await pool.execute('SELECT name FROM assets WHERE id = ?', [id]);
    await pool.execute('DELETE FROM asset_logs WHERE assetId = ?', [id]);
    await pool.execute('DELETE FROM assets WHERE id = ?', [id]);
    const operator = getOperator(req);
    createOperationLog(pool, { userId: null, username: operator, action: 'delete', module: 'asset', targetId: id, targetName: old ? old.name : `资产ID:${id}`, detail: `删除资产 ID: ${id}`, ipAddress: req.ip });
    res.json({ success: true, message: '资产删除成功' });
  } catch (error) {
    console.error('删除资产失败:', error);
    res.status(500).json({ success: false, message: '删除资产失败' });
  }
});

// 资产分类
router.get('/asset-categories', async (req, res) => {
  try {
    const { pool } = req.app.locals;
    const [rows] = await pool.execute('SELECT * FROM asset_categories ORDER BY parentType, sort');
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('获取资产分类失败:', error);
    res.status(500).json({ success: false, message: '获取资产分类失败' });
  }
});

router.post('/asset-categories', async (req, res) => {
  const { parentType, name, sort } = req.body;
  try {
    const { pool } = req.app.locals;
    await pool.execute('INSERT INTO asset_categories (parentType, name, sort) VALUES (?, ?, ?)', [parentType || 'fixed', name, sort || 0]);
    res.json({ success: true, message: '分类添加成功' });
  } catch (error) {
    console.error('新增资产分类失败:', error);
    res.status(500).json({ success: false, message: '新增资产分类失败' });
  }
});

// ==================== 资产盘点 ====================
// 盘点单列表（含明细数 / 差异数）
router.get('/asset-inventories', async (req, res) => {
  try {
    const { pool } = req.app.locals;
    const [rows] = await pool.execute(
      `SELECT i.*, COUNT(it.id) AS itemCount,
              SUM(CASE WHEN it.diff <> 0 THEN 1 ELSE 0 END) AS diffCount
       FROM asset_inventories i
       LEFT JOIN asset_inventory_items it ON it.inventoryId = i.id
       GROUP BY i.id ORDER BY i.id DESC`
    );
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('获取盘点单列表失败:', error);
    res.status(500).json({ success: false, message: '获取盘点单列表失败' });
  }
});

// 新建盘点单（快照当前资产为账面数量）
router.post('/asset-inventories', async (req, res) => {
  const { title } = req.body;
  try {
    const { pool } = req.app.locals;
    const operator = getOperator(req);
    const ymd = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const [[{ c }]] = await pool.execute(
      'SELECT COUNT(*) AS c FROM asset_inventories WHERE DATE(createdAt) = CURDATE()'
    );
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
    createOperationLog(pool, {
      userId: null, username: operator, action: 'create', module: 'asset',
      targetId: r.insertId, targetName: inventoryNo, detail: `新建盘点单 ${inventoryNo}`, ipAddress: req.ip
    });
    res.json({ success: true, message: '盘点单已创建', inventoryId: r.insertId, inventoryNo });
  } catch (error) {
    console.error('创建盘点单失败:', error);
    res.status(500).json({ success: false, message: '创建盘点单失败' });
  }
});

// 盘点单详情（含明细 + 资产信息）
router.get('/asset-inventories/:id', async (req, res) => {
  try {
    const { pool } = req.app.locals;
    const { id } = req.params;
    const [[inv]] = await pool.execute('SELECT * FROM asset_inventories WHERE id = ?', [id]);
    if (!inv) return res.status(404).json({ success: false, message: '盘点单不存在' });
    const [items] = await pool.execute(
      `SELECT it.*, a.assetCode, a.name, a.assetType, c.name AS catName
       FROM asset_inventory_items it
       LEFT JOIN assets a ON it.assetId = a.id
       LEFT JOIN asset_categories c ON a.categoryId = c.id
       WHERE it.inventoryId = ?
       ORDER BY it.id`,
      [id]
    );
    res.json({ success: true, data: { inventory: inv, items } });
  } catch (error) {
    console.error('获取盘点明细失败:', error);
    res.status(500).json({ success: false, message: '获取盘点明细失败' });
  }
});

// 更新盘点明细（记录实盘数量，自动算差异）
router.put('/asset-inventories/:id/items', async (req, res) => {
  try {
    const { pool } = req.app.locals;
    const { id } = req.params;
    const { items } = req.body; // [{ id, bookQuantity, actualQuantity, note }]
    if (Array.isArray(items)) {
      for (const it of items) {
        const actual = (it.actualQuantity === '' || it.actualQuantity === null || it.actualQuantity === undefined)
          ? null : Number(it.actualQuantity);
        const diff = actual === null ? 0 : actual - Number(it.bookQuantity || 0);
        await pool.execute(
          'UPDATE asset_inventory_items SET actualQuantity = ?, diff = ?, note = ?, checked = 1 WHERE id = ?',
          [actual, diff, it.note || '', it.id]
        );
      }
    }
    res.json({ success: true, message: '盘点明细已保存' });
  } catch (error) {
    console.error('保存盘点明细失败:', error);
    res.status(500).json({ success: false, message: '保存盘点明细失败' });
  }
});

// 完成盘点
router.put('/asset-inventories/:id/complete', async (req, res) => {
  try {
    const { pool } = req.app.locals;
    const { id } = req.params;
    await pool.execute("UPDATE asset_inventories SET status = '已完成' WHERE id = ?", [id]);
    const operator = getOperator(req);
    createOperationLog(pool, {
      userId: null, username: operator, action: 'update', module: 'asset',
      targetId: Number(id), targetName: '盘点单', detail: `完成盘点单 ID:${id}`, ipAddress: req.ip
    });
    res.json({ success: true, message: '盘点已完成' });
  } catch (error) {
    console.error('完成盘点失败:', error);
    res.status(500).json({ success: false, message: '完成盘点失败' });
  }
});

export default router;
