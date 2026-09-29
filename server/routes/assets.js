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
    // 折旧自动计算（直线法）：累计折旧 = (原值-残值)/年限/12 × 已计提月数(封顶总月数)；月折旧 = (原值-残值)/年限/12
    const [depRows] = await pool.execute(
      `SELECT
         COALESCE(SUM((originalValue - residualValue) / (usefulLifeYears * 12) *
           LEAST(usefulLifeYears * 12, GREATEST(0, TIMESTAMPDIFF(MONTH, COALESCE(acquireDate, createdAt), CURDATE())))), 0) AS dep,
         COALESCE(SUM((originalValue - residualValue) / (usefulLifeYears * 12)), 0) AS monthly
       FROM assets
       WHERE assetType = 'fixed' AND usefulLifeYears > 0 AND originalValue > residualValue`
    );
    const depRow = depRows[0] || { dep: 0, monthly: 0 };
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

    // 部门资产统计（数量 + 状态分布 + 原值/残值合计）
    const [deptRows] = await pool.execute(
      `SELECT department,
              COUNT(*) AS total,
              SUM(CASE WHEN status='在用' THEN 1 ELSE 0 END) AS inUse,
              SUM(CASE WHEN status='闲置' THEN 1 ELSE 0 END) AS idle,
              SUM(CASE WHEN status='维修' THEN 1 ELSE 0 END) AS repair,
              SUM(CASE WHEN status='报废' THEN 1 ELSE 0 END) AS scrap,
              COALESCE(SUM(originalValue),0) AS originalSum,
              COALESCE(SUM(residualValue),0) AS residualSum
       FROM assets GROUP BY department ORDER BY originalSum DESC`
    );
    const deptStats = deptRows.map(r => ({
      department: r.department || '未分配',
      total: Number(r.total || 0),
      inUse: Number(r.inUse || 0), idle: Number(r.idle || 0), repair: Number(r.repair || 0), scrap: Number(r.scrap || 0),
      originalSum: Number(r.originalSum || 0), residualSum: Number(r.residualSum || 0)
    }));

    // 分类分布
    const [catRows] = await pool.execute(
      `SELECT c.name AS categoryName, COUNT(*) AS count
       FROM assets a LEFT JOIN asset_categories c ON a.categoryId = c.id
       GROUP BY a.categoryId ORDER BY count DESC`
    );
    const byCategory = catRows.map(r => ({ categoryName: r.categoryName || '未分类', count: Number(r.count || 0) }));

    // 月度入库趋势
    const [monthRows] = await pool.execute(
      `SELECT DATE_FORMAT(acquireDate,'%Y-%m') AS month, COUNT(*) AS count
       FROM assets WHERE acquireDate IS NOT NULL GROUP BY month ORDER BY month`
    );
    const monthly = monthRows.map(r => ({ month: r.month, count: Number(r.count || 0) }));

    // 逾期未还（领用填写了预计归还日且已过期、资产仍在使用中）
    const [ovRows] = await pool.execute(
      `SELECT l.assetId, a.assetCode, a.name, l.recipient, l.recipientDept, l.planDate,
              DATEDIFF(CURDATE(), l.planDate) AS daysOverdue
       FROM asset_logs l
       JOIN assets a ON a.id = l.assetId
       WHERE l.action = '领用' AND l.planDate IS NOT NULL AND l.planDate < CURDATE() AND a.status = '在用'
       ORDER BY l.planDate ASC`
    );
    const overdueReturns = ovRows.map(r => ({
      assetId: r.assetId, assetCode: r.assetCode, name: r.name,
      recipient: r.recipient, recipientDept: r.recipientDept,
      planDate: String(r.planDate).slice(0, 10), daysOverdue: Number(r.daysOverdue || 0)
    }));

    // 闲置资产预警：状态为"闲置"且入库( acquireDate 优先，否则 createdAt )超过 180 天，提示处置/调配
    const [idleRows] = await pool.execute(
      `SELECT assetCode, name, department, responsibleUser, status,
              COALESCE(acquireDate, createdAt) AS inStockDate,
              DATEDIFF(CURDATE(), COALESCE(acquireDate, createdAt)) AS idleDays
       FROM assets
       WHERE status = '闲置' AND COALESCE(acquireDate, createdAt) IS NOT NULL
         AND DATEDIFF(CURDATE(), COALESCE(acquireDate, createdAt)) > 180
       ORDER BY idleDays DESC`
    );
    const idleWarnings = idleRows.map(r => ({
      assetCode: r.assetCode, name: r.name, department: r.department || '未分配',
      responsibleUser: r.responsibleUser || '—', status: r.status,
      inStockDate: String(r.inStockDate).slice(0, 10), idleDays: Number(r.idleDays || 0)
    }));

    res.json({
      success: true,
      data: {
        total: totalRow.total,
        byType: typeMap,
        byStatus: statusMap,
        depreciationTotal: Number(depRow.dep || 0),
        monthlyDepreciation: Number(depRow.monthly || 0),
        expiringIntangibles: expiring,
        overdueReturns,
        idleWarnings,
        deptStats,
        byCategory,
        monthly
      }
    });
  } catch (error) {
    console.error('资产概览统计失败:', error);
    res.status(500).json({ success: false, message: '资产概览统计失败' });
  }
});

// 下拉选项（责任人 / 部门，避免与员工接口权限耦合）
router.get('/assets/options', async (req, res) => {
  try {
    const { pool } = req.app.locals;
    const [depts] = await pool.execute('SELECT name FROM departments WHERE name IS NOT NULL AND name <> "" ORDER BY name');
    // 排除内置账号（管理员）与可复现性测试账号（repro数字_数字）
    const [users] = await pool.execute("SELECT username FROM users WHERE username IS NOT NULL AND username <> '' AND username <> '管理员' AND username NOT REGEXP '^repro[0-9]+_[0-9]+$' ORDER BY username");
    res.json({
      success: true,
      data: { departments: depts.map(d => d.name), employees: users.map(u => u.username) }
    });
  } catch (error) {
    console.error('获取资产选项失败:', error);
    res.status(500).json({ success: false, message: '获取资产选项失败' });
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

// 资产变动记录（领用/归还/维修/恢复/报废/入库），联表取资产编号与名称，支持按动作过滤
router.get('/asset-logs', async (req, res) => {
  try {
    const { pool } = req.app.locals;
    const { action } = req.query;
    let sql = `SELECT l.*, a.assetCode, a.name AS assetName
               FROM asset_logs l
               LEFT JOIN assets a ON l.assetId = a.id
               WHERE 1=1`;
    const params = [];
    if (action) { sql += ' AND l.action = ?'; params.push(action); }
    sql += ' ORDER BY l.createdAt DESC, l.id DESC LIMIT 1000';
    const [rows] = await pool.execute(sql, params);
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('获取资产变动记录失败:', error);
    res.status(500).json({ success: false, message: '获取资产变动记录失败' });
  }
});

// 新增资产（自动生成资产编号 ZC-YYYY-NNNN；新增默认状态为「闲置(在库)」；
// 固定资产支持批量入库生成多条；耗材写入可用数量；记录入库轨迹）
router.post('/assets', async (req, res) => {
  const b = req.body;
  try {
    const { pool } = req.app.locals;
    const operator = getOperator(req);
    const assetType = b.assetType || 'fixed';
    const year = new Date().getFullYear();

    const cols = ['assetCode', 'name', 'assetType', 'categoryId', 'quantity', 'unit', 'acquireDate', 'source',
      'originalValue', 'residualValue', 'depMethod', 'responsibleUser', 'department', 'location', 'carrier',
      'accountKey', 'status', 'expireDate', 'renewNoticeDate', 'remark', 'spec', 'sn', 'unitPrice',
      'supplier', 'invoiceNo', 'warrantyDate', 'usefulLifeYears', 'availableQuantity', 'createdBy'];
    const placeholders = cols.map(() => '?').join(', ');

    const buildParams = (assetCode, qty, avail) => [
      assetCode, b.name, assetType, b.categoryId || null, qty,
      b.unit || (assetType === 'consumable' ? '个' : '台'),
      b.acquireDate || null, b.source || '', b.originalValue || 0, b.residualValue || 0, b.depMethod || '',
      b.responsibleUser || '', b.department || '', b.location || '', b.carrier || '', b.accountKey || '',
      '闲置', b.expireDate || null, b.renewNoticeDate || null, b.remark || '',
      b.spec || '', b.sn || '', b.unitPrice || null, b.supplier || '', b.invoiceNo || '',
      b.warrantyDate || null, b.usefulLifeYears || null, avail, operator
    ];

    const [[{ c: baseC }]] = await pool.execute('SELECT COUNT(*) AS c FROM assets WHERE YEAR(createdAt) = ?', [year]);
    let seq = baseC;
    const batch = (assetType === 'fixed' && Number(b.batchCount) > 1) ? Number(b.batchCount) : 1;
    const totalQty = Number(b.quantity || 1);
    const qtyPer = assetType === 'fixed' ? 1 : totalQty;
    const avail = assetType === 'consumable' ? totalQty : null;
    const codes = [];
    for (let i = 0; i < batch; i++) {
      seq += 1;
      const assetCode = `ZC-${year}-${String(seq).padStart(4, '0')}`;
      const [result] = await pool.execute(
        `INSERT INTO assets (${cols.join(', ')}) VALUES (${placeholders})`,
        buildParams(assetCode, qtyPer, avail)
      );
      await pool.execute(
        'INSERT INTO asset_logs (assetId, action, toStatus, operator, detail, qty) VALUES (?, ?, ?, ?, ?, ?)',
        [result.insertId, '入库', '闲置', operator, `新增资产 ${assetCode} ${b.name}`, qtyPer]
      );
      codes.push(assetCode);
    }
    createOperationLog(pool, { userId: null, username: operator, action: 'create', module: 'asset', targetId: 0, targetName: b.name, detail: `新增资产: ${b.name}（${codes.length} 条）`, ipAddress: req.ip });
    res.json({ success: true, message: batch > 1 ? `批量入库成功，生成 ${codes.length} 条资产` : '资产添加成功', assetCodes: codes });
  } catch (error) {
    console.error('新增资产失败:', error);
    res.status(500).json({ success: false, message: '新增资产失败' });
  }
});

// 更新资产（状态变更时记录轨迹；耗材可用数量随编辑同步）
router.put('/assets/:id', async (req, res) => {
  const { id } = req.params;
  const b = req.body;
  try {
    const { pool } = req.app.locals;
    const [[old]] = await pool.execute('SELECT * FROM assets WHERE id = ?', [id]);
    const status = b.status !== undefined ? b.status : (old ? old.status : '闲置');
    const avail = b.assetType === 'consumable'
      ? (b.availableQuantity !== undefined && b.availableQuantity !== null ? b.availableQuantity : b.quantity)
      : null;
    const sql = `UPDATE assets SET name=?, assetType=?, categoryId=?, quantity=?, unit=?, acquireDate=?, source=?, originalValue=?, residualValue=?, depMethod=?, responsibleUser=?, department=?, location=?, carrier=?, accountKey=?, status=?, expireDate=?, renewNoticeDate=?, remark=?, spec=?, sn=?, unitPrice=?, supplier=?, invoiceNo=?, warrantyDate=?, usefulLifeYears=?, availableQuantity=? WHERE id=?`;
    await pool.execute(sql, [
      b.name, b.assetType, b.categoryId || null, b.quantity, b.unit, b.acquireDate || null, b.source,
      b.originalValue, b.residualValue, b.depMethod, b.responsibleUser, b.department, b.location, b.carrier,
      b.accountKey || '', status, b.expireDate || null, b.renewNoticeDate || null, b.remark,
      b.spec || '', b.sn || '', b.unitPrice || null, b.supplier || '', b.invoiceNo || '',
      b.warrantyDate || null, b.usefulLifeYears || null, avail, id
    ]);
    if (old && old.status !== status) {
      await pool.execute(
        'INSERT INTO asset_logs (assetId, action, fromStatus, toStatus, operator, detail) VALUES (?, ?, ?, ?, ?, ?)',
        [id, '状态变更', old.status, status, getOperator(req), `状态 ${old.status} → ${status}`]
      );
    }
    // 字段变更留痕：比对关键字段，记录改动明细
    const fieldLabels = {
      name: '名称', assetType: '资产类型', categoryId: '分类', quantity: '数量', unit: '单位',
      acquireDate: '获取日期', source: '来源', originalValue: '原值', residualValue: '残值',
      depMethod: '折旧/摊销方式', responsibleUser: '责任人', department: '使用部门', location: '存放位置',
      carrier: '载体/账号', accountKey: '账号密钥', expireDate: '到期日', renewNoticeDate: '续费提醒日',
      remark: '备注', spec: '规格型号', sn: '序列号', unitPrice: '单价', supplier: '供应商',
      invoiceNo: '发票号', warrantyDate: '保修到期日', usefulLifeYears: '折旧/摊销年限'
    };
    const changed = [];
    for (const f of Object.keys(fieldLabels)) {
      let ov = old ? old[f] : undefined;
      let nv = b[f];
      if (f === 'availableQuantity') continue; // 由数量推导，不单独记录
      if (ov === null || ov === undefined) ov = '';
      if (nv === null || nv === undefined) nv = '';
      if (String(ov) !== String(nv)) changed.push(`${fieldLabels[f]}(${ov || '空'}→${nv || '空'})`);
    }
    if (changed.length) {
      await pool.execute(
        'INSERT INTO asset_logs (assetId, action, fromStatus, toStatus, operator, detail) VALUES (?, ?, ?, ?, ?, ?)',
        [id, '资产变更', old ? old.status : '', status, getOperator(req), `修改 ${changed.length} 项: ${changed.join('; ')}`]
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

// ==================== 资产生命周期操作（领用 / 归还 / 维修 / 恢复 / 报废） ====================
// 领用：固定资产按台指派责任人+部门→在用；耗材按数量扣减可用数量
router.post('/assets/:id/issue', async (req, res) => {
  const { id } = req.params;
  const b = req.body;
  try {
    const { pool } = req.app.locals;
    const operator = getOperator(req);
    const [[a]] = await pool.execute('SELECT * FROM assets WHERE id = ?', [id]);
    if (!a) return res.status(404).json({ success: false, message: '资产不存在' });
    const recipient = b.responsibleUser || a.responsibleUser || '';
    const recipientDept = b.department || a.department || '';
    const qty = Number(b.qty || 1);
    const opDate = b.opDate || null;
    const planDate = b.planDate || null;
    const purpose = b.purpose || null;
    const loc = b.location || null;
    if (a.assetType === 'consumable') {
      const avail = a.availableQuantity == null ? a.quantity : a.availableQuantity;
      if (qty > avail) return res.status(400).json({ success: false, message: `领用数量 ${qty} 超出可用数量 ${avail}` });
      await pool.execute('UPDATE assets SET availableQuantity = availableQuantity - ? WHERE id = ?', [qty, id]);
      await pool.execute(
        'INSERT INTO asset_logs (assetId, action, fromStatus, toStatus, operator, detail, qty, recipient, recipientDept, opDate, planDate, purpose, disposal, vendor) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [id, '领用', a.status, '闲置', operator, `领用 ${qty} ${a.unit || ''} 给 ${recipient}`, qty, recipient, recipientDept, opDate, planDate, purpose, null, null]
      );
    } else {
      const locSql = loc ? ", location = ?" : '';
      const locParams = loc ? [recipient, recipientDept, loc, id] : [recipient, recipientDept, id];
      await pool.execute(`UPDATE assets SET status = '在用', responsibleUser = ?, department = ?${locSql} WHERE id = ?`, locParams);
      await pool.execute(
        'INSERT INTO asset_logs (assetId, action, fromStatus, toStatus, operator, detail, qty, recipient, recipientDept, opDate, planDate, purpose, disposal, vendor) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [id, '领用', a.status, '在用', operator, `领用给 ${recipient}（${recipientDept}）`, 1, recipient, recipientDept, opDate, planDate, purpose, null, null]
      );
    }
    createOperationLog(pool, { userId: null, username: operator, action: 'update', module: 'asset', targetId: Number(id), targetName: a.name, detail: `领用资产: ${a.name} x${qty}`, ipAddress: req.ip });
    res.json({ success: true, message: '领用成功' });
  } catch (error) {
    console.error('领用失败:', error);
    res.status(500).json({ success: false, message: '领用失败' });
  }
});

// 归还：固定资产→闲置；耗材可用数量回补
router.post('/assets/:id/return', async (req, res) => {
  const { id } = req.params;
  const b = req.body || {};
  try {
    const { pool } = req.app.locals;
    const operator = getOperator(req);
    const [[a]] = await pool.execute('SELECT * FROM assets WHERE id = ?', [id]);
    if (!a) return res.status(404).json({ success: false, message: '资产不存在' });
    const qty = Number(b.qty || 1);
    const opDate = b.opDate || null;
    const purpose = b.purpose || null;
    const loc = b.location || null;
    if (a.assetType === 'consumable') {
      await pool.execute('UPDATE assets SET availableQuantity = availableQuantity + ? WHERE id = ?', [qty, id]);
    } else {
      const locSql = loc ? ", location = ?" : '';
      const locParams = loc ? ['闲置', loc, id] : ['闲置', id];
      await pool.execute(`UPDATE assets SET status = ?${locSql} WHERE id = ?`, locParams);
    }
    await pool.execute(
      'INSERT INTO asset_logs (assetId, action, fromStatus, toStatus, operator, detail, qty, opDate, purpose) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [id, '归还', a.status, '闲置', operator, `归还 ${qty} ${a.unit || ''}`, qty, opDate, purpose]
    );
    createOperationLog(pool, { userId: null, username: operator, action: 'update', module: 'asset', targetId: Number(id), targetName: a.name, detail: `归还资产: ${a.name}`, ipAddress: req.ip });
    res.json({ success: true, message: '归还成功' });
  } catch (error) {
    console.error('归还失败:', error);
    res.status(500).json({ success: false, message: '归还失败' });
  }
});

// 维修：状态→维修
router.post('/assets/:id/repair', async (req, res) => {
  const { id } = req.params;
  try {
    const { pool } = req.app.locals;
    const operator = getOperator(req);
    const [[a]] = await pool.execute('SELECT * FROM assets WHERE id = ?', [id]);
    if (!a) return res.status(404).json({ success: false, message: '资产不存在' });
    if (a.status === '报废') return res.status(400).json({ success: false, message: '已报废资产不可维修' });
    const opDate = b.opDate || null;
    const planDate = b.planDate || null;
    const purpose = b.purpose || null;
    const vendor = b.vendor || null;
    await pool.execute("UPDATE assets SET status = '维修' WHERE id = ?", [id]);
    await pool.execute(
      'INSERT INTO asset_logs (assetId, action, fromStatus, toStatus, operator, detail, opDate, planDate, purpose, vendor) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [id, '维修', a.status, '维修', operator, `送修 ${a.name}`, opDate, planDate, purpose, vendor]
    );
    res.json({ success: true, message: '已标记为维修' });
  } catch (error) {
    console.error('维修标记失败:', error);
    res.status(500).json({ success: false, message: '维修标记失败' });
  }
});

// 恢复：维修→闲置
router.post('/assets/:id/restore', async (req, res) => {
  const { id } = req.params;
  const b = req.body || {};
  try {
    const { pool } = req.app.locals;
    const operator = getOperator(req);
    const [[a]] = await pool.execute('SELECT * FROM assets WHERE id = ?', [id]);
    if (!a) return res.status(404).json({ success: false, message: '资产不存在' });
    const opDate = (b && b.opDate) || null;
    const purpose = (b && b.purpose) || null;
    await pool.execute("UPDATE assets SET status = '闲置' WHERE id = ?", [id]);
    await pool.execute(
      'INSERT INTO asset_logs (assetId, action, fromStatus, toStatus, operator, detail, opDate, purpose) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [id, '恢复', a.status, '闲置', operator, `维修完成恢复 ${a.name}`, opDate, purpose]
    );
    res.json({ success: true, message: '已恢复为闲置' });
  } catch (error) {
    console.error('恢复失败:', error);
    res.status(500).json({ success: false, message: '恢复失败' });
  }
});

// 报废：固定资产→报废；耗材扣减数量与可用数量
router.post('/assets/:id/scrap', async (req, res) => {
  const { id } = req.params;
  const b = req.body || {};
  try {
    const { pool } = req.app.locals;
    const operator = getOperator(req);
    const [[a]] = await pool.execute('SELECT * FROM assets WHERE id = ?', [id]);
    if (!a) return res.status(404).json({ success: false, message: '资产不存在' });
    if (a.status === '报废') return res.status(400).json({ success: false, message: '资产已报废' });
    const qty = Number(b.qty || 1);
    const opDate = b.opDate || null;
    const purpose = b.purpose || null;
    const disposal = b.disposal || null;
    const vendor = b.vendor || null;
    if (a.assetType === 'consumable') {
      if (qty > a.quantity) return res.status(400).json({ success: false, message: `报废数量 ${qty} 超出总数 ${a.quantity}` });
      const avail = a.availableQuantity == null ? a.quantity : a.availableQuantity;
      const scrapAvail = Math.min(qty, avail);
      await pool.execute('UPDATE assets SET quantity = quantity - ?, availableQuantity = availableQuantity - ? WHERE id = ?', [qty, scrapAvail, id]);
    } else {
      await pool.execute("UPDATE assets SET status = '报废' WHERE id = ?", [id]);
    }
    await pool.execute(
      'INSERT INTO asset_logs (assetId, action, fromStatus, toStatus, operator, detail, qty, opDate, purpose, disposal, vendor) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [id, '报废', a.status, '报废', operator, `报废 ${qty} ${a.unit || ''}`, qty, opDate, purpose, disposal, vendor]
    );
    createOperationLog(pool, { userId: null, username: operator, action: 'delete', module: 'asset', targetId: Number(id), targetName: a.name, detail: `报废资产: ${a.name} x${qty}`, ipAddress: req.ip });
    res.json({ success: true, message: '报废成功' });
  } catch (error) {
    console.error('报废失败:', error);
    res.status(500).json({ success: false, message: '报废失败' });
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
    // 并发守卫：已有进行中的盘点单时不允许再新建，避免重复生成
    const [ongoing] = await pool.execute("SELECT inventoryNo FROM asset_inventories WHERE status = '进行中' LIMIT 1");
    if (ongoing.length) {
      return res.status(409).json({ success: false, message: `已有进行中的盘点单 ${ongoing[0].inventoryNo}，请先完成或作废后再新建` });
    }
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

// 作废盘点单（仅进行中可作废）
router.put('/asset-inventories/:id/void', async (req, res) => {
  try {
    const { pool } = req.app.locals;
    const { id } = req.params;
    const [[inv]] = await pool.execute("SELECT status FROM asset_inventories WHERE id = ?", [id]);
    if (!inv) return res.status(404).json({ success: false, message: '盘点单不存在' });
    if (inv.status !== '进行中') return res.status(400).json({ success: false, message: '仅进行中的盘点单可作废' });
    await pool.execute("UPDATE asset_inventories SET status = '已作废' WHERE id = ?", [id]);
    const operator = getOperator(req);
    createOperationLog(pool, {
      userId: null, username: operator, action: 'delete', module: 'asset',
      targetId: Number(id), targetName: '盘点单', detail: `作废盘点单 ID:${id}`, ipAddress: req.ip
    });
    res.json({ success: true, message: '盘点单已作废' });
  } catch (error) {
    console.error('作废盘点单失败:', error);
    res.status(500).json({ success: false, message: '作废盘点单失败' });
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
