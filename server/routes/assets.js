import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import multer from 'multer';
import xlsx from 'xlsx';
import { createOperationLog, getOperator } from '../utils/audit.js';
import { computeNextRun, generateInventoryFromPlan, runDueInventoryPlans } from '../utils/inventoryPlan.js';
const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const UPLOAD_DIR = path.join(__dirname, '../../uploads/temp');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });
const upload = multer({ dest: UPLOAD_DIR });

// 资产列表（支持类型/状态/部门/分类/关键字筛选；支持后端分页）
// 分页参数：page / pageSize。两者均不传时返回全部（兼容导出场景）。
router.get('/assets', async (req, res) => {
  try {
    const { pool } = req.app.locals;
    const { type, status, department, keyword, categoryId, includeScrap, page, pageSize } = req.query;
    const where = ['1=1'];
    const params = [];
    if (type) { where.push('a.assetType = ?'); params.push(type); }
    if (status) { where.push('a.status = ?'); params.push(status); }
    if (department) { where.push('a.department = ?'); params.push(department); }
    if (categoryId) { where.push('a.categoryId = ?'); params.push(Number(categoryId)); }
    // 默认隐藏已报废资产（与前端 showScrap 开关一致）
    if (includeScrap !== 'true' && includeScrap !== '1') { where.push("a.status <> '报废'"); }
    if (keyword) {
      where.push('(a.name LIKE ? OR a.assetCode LIKE ? OR a.responsibleUser LIKE ?)');
      params.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`);
    }
    const whereSql = ' WHERE ' + where.join(' AND ');
    const [[{ total }]] = await pool.execute(
      `SELECT COUNT(*) AS total FROM assets a LEFT JOIN asset_categories c ON a.categoryId = c.id${whereSql}`,
      params
    );
    const p = Math.max(1, parseInt(page, 10) || 1);
    const ps = Math.min(200, Math.max(1, parseInt(pageSize, 10) || 10));
    const paginate = page !== undefined && pageSize !== undefined;
    let rows = [];
    if (total > 0) {
      const dataSql = `SELECT a.*, c.name AS categoryName, c.parentType FROM assets a LEFT JOIN asset_categories c ON a.categoryId = c.id${whereSql} ORDER BY a.id DESC`;
      const [dataRows] = paginate
        ? await pool.execute(dataSql + ' LIMIT ? OFFSET ?', [...params, ps, (p - 1) * ps])
        : await pool.execute(dataSql);
      rows = dataRows;
    }
    res.json({ success: true, data: rows, total, page: p, pageSize: ps });
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
    if (old && old.frozen && ((b.quantity !== undefined && Number(b.quantity) !== Number(old.quantity)) || (b.status !== undefined && b.status !== old.status))) {
      return res.status(409).json({ success: false, message: '资产处于盘点冻结期，盘点完成前不可变更数量或状态' });
    }
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

// 删除资产（保留生命周期轨迹：先写入「删除」事件再删主表，asset_logs.assetId 无外键约束，记录留存备查）
router.delete('/assets/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const { pool } = req.app.locals;
    const [[old]] = await pool.execute('SELECT * FROM assets WHERE id = ?', [id]);
    if (!old) return res.status(404).json({ success: false, message: '资产不存在' });
    const operator = getOperator(req);
    await pool.execute(
      'INSERT INTO asset_logs (assetId, action, fromStatus, toStatus, operator, detail) VALUES (?, ?, ?, ?, ?, ?)',
      [id, '删除', old.status, '已删除', operator, `删除资产 ${old.assetCode || ''} ${old.name}`]
    );
    await pool.execute('DELETE FROM assets WHERE id = ?', [id]);
    createOperationLog(pool, { userId: null, username: operator, action: 'delete', module: 'asset', targetId: id, targetName: old.name, detail: `删除资产 ID: ${id}`, ipAddress: req.ip });
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
    if (a.frozen) return res.status(409).json({ success: false, message: '资产处于盘点冻结期，盘点完成前不可领用' });
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
    if (a.frozen) return res.status(409).json({ success: false, message: '资产处于盘点冻结期，盘点完成前不可归还' });
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
    if (a.frozen) return res.status(409).json({ success: false, message: '资产处于盘点冻结期，盘点完成前不可维修' });
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
    if (a.frozen) return res.status(409).json({ success: false, message: '资产处于盘点冻结期，盘点完成前不可报废' });
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
    // 冻结库存：盘点进行中锁定全部资产，防止领用/归还/报废/编辑改动数量
    await pool.execute('UPDATE assets SET frozen = 1 WHERE frozen = 0');
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

// 历史对比：对比多期盘点单的实盘/差异（必须定义在 /:id 之前，避免被 :id 捕获）
router.get('/asset-inventories/compare', async (req, res) => {
  try {
    const { pool } = req.app.locals;
    const ids = (req.query.ids || '').toString().split(',').map(s => Number(s)).filter(n => n > 0);
    if (ids.length < 2) return res.status(400).json({ success: false, message: '请选择至少两期盘点单进行对比' });
    const [invs] = await pool.execute(
      `SELECT id, inventoryNo, title, status, createdAt FROM asset_inventories WHERE id IN (?) ORDER BY id`,
      [ids]
    );
    const [items] = await pool.execute(
      `SELECT it.inventoryId, it.assetId, it.bookQuantity, it.actualQuantity, it.diff,
              a.assetCode, a.name, c.name AS catName
       FROM asset_inventory_items it
       LEFT JOIN assets a ON it.assetId = a.id
       LEFT JOIN asset_categories c ON a.categoryId = c.id
       WHERE it.inventoryId IN (?)`,
      [ids]
    );
    const byAsset = {};
    for (const it of items) {
      const key = it.assetId;
      if (!byAsset[key]) byAsset[key] = { assetId: it.assetId, assetCode: it.assetCode, name: it.name, catName: it.catName, byInv: {} };
      byAsset[key].byInv[it.inventoryId] = {
        bookQuantity: it.bookQuantity, actualQuantity: it.actualQuantity, diff: it.diff
      };
    }
    res.json({
      success: true,
      data: {
        inventories: invs,
        rows: Object.values(byAsset)
      }
    });
  } catch (error) {
    console.error('盘点对比失败:', error);
    res.status(500).json({ success: false, message: '盘点对比失败' });
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
    let discrepancies = [];
    if (inv.status === '已完成') {
      const [disc] = await pool.execute('SELECT * FROM asset_inventory_discrepancies WHERE inventoryId = ? ORDER BY id', [id]);
      discrepancies = disc;
    }
    res.json({ success: true, data: { inventory: inv, items, discrepancies } });
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
    // 解冻全部资产（作废即结束盘点，释放库存冻结）
    await pool.execute('UPDATE assets SET frozen = 0 WHERE frozen = 1');
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

// 完成盘点（回写实盘数量到资产库存，记录变动，生成差异待处理，解冻库存）
router.put('/asset-inventories/:id/complete', async (req, res) => {
  try {
    const { pool } = req.app.locals;
    const { id } = req.params;
    const operator = getOperator(req);
    // 回写：实盘数成为新总数，可用数同步扣减（保持"非可用"部分不变）
    const [items] = await pool.execute(
      `SELECT it.id, it.assetId, it.actualQuantity, it.bookQuantity, it.diff, a.assetCode, a.name
       FROM asset_inventory_items it
       LEFT JOIN assets a ON it.assetId = a.id
       WHERE it.inventoryId = ?`,
      [id]
    );
    for (const it of items) {
      const actual = (it.actualQuantity === null || it.actualQuantity === undefined) ? null : Number(it.actualQuantity);
      if (actual === null) continue; // 未录入实盘的资产不回写
      const [[a]] = await pool.execute('SELECT quantity, availableQuantity, status FROM assets WHERE id = ?', [it.assetId]);
      if (!a) continue;
      const qty = Number(a.quantity || 0);
      const avail = a.availableQuantity == null ? qty : Number(a.availableQuantity);
      const inUse = Math.max(0, qty - avail); // 使用中/借出/维修等非可用量
      const newAvail = Math.max(0, actual - inUse);
      await pool.execute('UPDATE assets SET quantity = ?, availableQuantity = ? WHERE id = ?', [actual, newAvail, it.assetId]);
      // 资产变动记录：盘点调整写入 asset_logs（联动「变动记录」页）
      await pool.execute(
        'INSERT INTO asset_logs (assetId, action, fromStatus, toStatus, operator, detail, qty) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [it.assetId, '盘点调整', a.status, a.status, operator, `盘点调整：账面 ${qty} → 实盘 ${actual}`, Math.abs(actual - qty)]
      );
      createOperationLog(pool, {
        userId: null, username: operator, action: 'update', module: 'asset',
        targetId: Number(it.assetId), targetName: '资产', detail: `盘点调整：账面 ${qty} → 实盘 ${actual}`, ipAddress: req.ip
      });
      // 差异处理闭环：差异不为 0 时生成待处理差异记录
      const diff = Number(it.diff || 0);
      if (diff !== 0 && it.id) {
        const diffType = diff > 0 ? '盘盈' : '盘亏';
        await pool.execute(
          `INSERT INTO asset_inventory_discrepancies
            (inventoryId, itemId, assetId, assetCode, name, diffType, bookQuantity, actualQuantity, diff, status)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, '待处理')`,
          [id, it.id, it.assetId, it.assetCode, it.name, diffType, Number(it.bookQuantity || 0), actual, diff]
        );
      }
    }
    await pool.execute("UPDATE asset_inventories SET status = '已完成' WHERE id = ?", [id]);
    // 解冻全部资产（盘点结束，释放库存冻结）
    await pool.execute('UPDATE assets SET frozen = 0 WHERE frozen = 1');
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

// 差异处理闭环：获取盘点单的差异列表
router.get('/asset-inventories/:id/discrepancies', async (req, res) => {
  try {
    const { pool } = req.app.locals;
    const { id } = req.params;
    const [rows] = await pool.execute('SELECT * FROM asset_inventory_discrepancies WHERE inventoryId = ? ORDER BY id', [id]);
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('获取差异列表失败:', error);
    res.status(500).json({ success: false, message: '获取差异列表失败' });
  }
});

// 差异处理闭环：处置单条差异（盘盈入库 / 盘亏报废 / 备注说明）
router.post('/asset-inventories/:id/discrepancies/:did/handle', async (req, res) => {
  try {
    const { pool } = req.app.locals;
    const { id, did } = req.params;
    const { handleAction, handleNote } = req.body || {};
    const operator = getOperator(req);
    const [[disc]] = await pool.execute('SELECT * FROM asset_inventory_discrepancies WHERE id = ? AND inventoryId = ?', [did, id]);
    if (!disc) return res.status(404).json({ success: false, message: '差异记录不存在' });
    if (disc.status === '已处理') return res.status(400).json({ success: false, message: '该差异已处理' });
    await pool.execute(
      `UPDATE asset_inventory_discrepancies
       SET status = '已处理', handleAction = ?, handleNote = ?, handledBy = ?, handledAt = NOW()
       WHERE id = ?`,
      [handleAction || '备注说明', handleNote || '', operator, did]
    );
    createOperationLog(pool, {
      userId: null, username: operator, action: 'update', module: 'asset',
      targetId: Number(did), targetName: '盘点差异', detail: `处置差异(${disc.diffType}) ID:${did} - ${handleAction || '备注说明'}`, ipAddress: req.ip
    });
    res.json({ success: true, message: '差异已处置' });
  } catch (error) {
    console.error('处置差异失败:', error);
    res.status(500).json({ success: false, message: '处置差异失败' });
  }
});

// 周期盘点计划列表
router.get('/asset-inventory-plans', async (req, res) => {
  try {
    const { pool } = req.app.locals;
    const [rows] = await pool.execute('SELECT * FROM asset_inventory_plans ORDER BY id DESC');
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('获取盘点计划失败:', error);
    res.status(500).json({ success: false, message: '获取盘点计划失败' });
  }
});

// 新建周期盘点计划
router.post('/asset-inventory-plans', async (req, res) => {
  try {
    const { pool } = req.app.locals;
    const { name, frequency = '每月', dayOfMonth = 1, status = '启用' } = req.body || {};
    if (!name) return res.status(400).json({ success: false, message: '计划名称必填' });
    const operator = getOperator(req);
    const nextRunAt = computeNextRun(frequency, Number(dayOfMonth));
    const [r] = await pool.execute(
      'INSERT INTO asset_inventory_plans (name, frequency, dayOfMonth, status, nextRunAt, operator) VALUES (?, ?, ?, ?, ?, ?)',
      [name, frequency, Number(dayOfMonth), status, nextRunAt, operator]
    );
    res.json({ success: true, message: '计划已创建', planId: r.insertId, nextRunAt });
  } catch (error) {
    console.error('创建盘点计划失败:', error);
    res.status(500).json({ success: false, message: '创建盘点计划失败' });
  }
});

// 更新周期盘点计划
router.put('/asset-inventory-plans/:id', async (req, res) => {
  try {
    const { pool } = req.app.locals;
    const { id } = req.params;
    const { name, frequency, dayOfMonth, status } = req.body || {};
    const fields = [], params = [];
    if (name !== undefined) { fields.push('name = ?'); params.push(name); }
    if (frequency !== undefined) { fields.push('frequency = ?'); params.push(frequency); }
    if (dayOfMonth !== undefined) { fields.push('dayOfMonth = ?'); params.push(Number(dayOfMonth)); }
    if (status !== undefined) { fields.push('status = ?'); params.push(status); }
    if (frequency !== undefined || dayOfMonth !== undefined) {
      // 重新计算下次执行时间（基于当前最新频率/日）
      const [[cur]] = await pool.execute('SELECT frequency, dayOfMonth FROM asset_inventory_plans WHERE id = ?', [id]);
      const f = frequency !== undefined ? frequency : cur.frequency;
      const d = dayOfMonth !== undefined ? Number(dayOfMonth) : cur.dayOfMonth;
      fields.push('nextRunAt = ?');
      params.push(computeNextRun(f, d));
    }
    if (!fields.length) return res.json({ success: true, message: '无变更' });
    params.push(id);
    await pool.execute(`UPDATE asset_inventory_plans SET ${fields.join(', ')} WHERE id = ?`, params);
    res.json({ success: true, message: '计划已更新' });
  } catch (error) {
    console.error('更新盘点计划失败:', error);
    res.status(500).json({ success: false, message: '更新盘点计划失败' });
  }
});

// 删除周期盘点计划
router.delete('/asset-inventory-plans/:id', async (req, res) => {
  try {
    const { pool } = req.app.locals;
    const { id } = req.params;
    await pool.execute('DELETE FROM asset_inventory_plans WHERE id = ?', [id]);
    res.json({ success: true, message: '计划已删除' });
  } catch (error) {
    console.error('删除盘点计划失败:', error);
    res.status(500).json({ success: false, message: '删除盘点计划失败' });
  }
});

// 立即按计划生成盘点单
router.post('/asset-inventory-plans/:id/run', async (req, res) => {
  try {
    const { pool } = req.app.locals;
    const { id } = req.params;
    const operator = getOperator(req);
    const [[plan]] = await pool.execute('SELECT * FROM asset_inventory_plans WHERE id = ?', [id]);
    if (!plan) return res.status(404).json({ success: false, message: '计划不存在' });
    if (plan.status !== '启用') return res.status(400).json({ success: false, message: '计划已停用' });
    const dateStr = new Date().toISOString().slice(0, 10);
    const title = `${plan.name}（${dateStr}）`;
    const { inventoryId, inventoryNo } = await generateInventoryFromPlan(pool, title, operator);
    await pool.execute(
      'UPDATE asset_inventory_plans SET lastRunAt = NOW(), nextRunAt = ? WHERE id = ?',
      [computeNextRun(plan.frequency, plan.dayOfMonth), id]
    );
    createOperationLog(pool, {
      userId: null, username: operator, action: 'create', module: 'asset',
      targetId: inventoryId, targetName: inventoryNo, detail: `按计划「${plan.name}」生成盘点单 ${inventoryNo}`, ipAddress: req.ip
    });
    res.json({ success: true, message: `已生成盘点单 ${inventoryNo}`, inventoryId, inventoryNo });
  } catch (error) {
    console.error('按计划生成盘点单失败:', error);
    res.status(500).json({ success: false, message: error.message || '按计划生成盘点单失败' });
  }
});

// 自动执行到期计划（供前端手动触发 / pm2 cron 周期调用）
router.post('/asset-inventory-plans/auto', async (req, res) => {
  try {
    const { pool } = req.app.locals;
    const operator = req.body?.operator || '系统定时';
    const generated = await runDueInventoryPlans(pool, operator);
    res.json({ success: true, message: `已自动生成 ${generated.length} 张盘点单`, generated });
  } catch (error) {
    console.error('自动执行计划失败:', error);
    res.status(500).json({ success: false, message: '自动执行计划失败' });
  }
});

// ==================== 资产调拨（独立动作） ====================
// 调拨：变更责任人/部门/位置，记录轨迹，资产状态保持不变
router.post('/assets/:id/transfer', async (req, res) => {
  const { id } = req.params;
  const b = req.body || {};
  try {
    const { pool } = req.app.locals;
    const operator = getOperator(req);
    const [[a]] = await pool.execute('SELECT * FROM assets WHERE id = ?', [id]);
    if (!a) return res.status(404).json({ success: false, message: '资产不存在' });
    if (a.frozen) return res.status(409).json({ success: false, message: '资产处于盘点冻结期，盘点完成前不可调拨' });
    const newDept = b.department != null ? b.department : a.department;
    const newUser = b.responsibleUser != null ? b.responsibleUser : a.responsibleUser;
    const newLoc = b.location != null ? b.location : a.location;
    const remark = b.remark || '';
    await pool.execute(
      'UPDATE assets SET department = ?, responsibleUser = ?, location = ? WHERE id = ?',
      [newDept, newUser, newLoc, id]
    );
    await pool.execute(
      'INSERT INTO asset_logs (assetId, action, fromStatus, toStatus, operator, detail) VALUES (?, ?, ?, ?, ?, ?)',
      [id, '调拨', a.status, a.status, operator,
        `调拨：${a.department || '—'}→${newDept}；${a.responsibleUser || '—'}→${newUser}${remark ? '；' + remark : ''}`]
    );
    createOperationLog(pool, { userId: null, username: operator, action: 'update', module: 'asset', targetId: Number(id), targetName: a.name, detail: `调拨资产: ${a.name}`, ipAddress: req.ip });
    res.json({ success: true, message: '调拨成功' });
  } catch (error) {
    console.error('调拨失败:', error);
    res.status(500).json({ success: false, message: '调拨失败' });
  }
});

// ==================== 资产 Excel 批量导入 ====================
// 下载导入模板
router.get('/assets/import/template', (req, res) => {
  const wb = xlsx.utils.book_new();
  const headers = ['资产名称', '资产类型', '分类', '数量', '单位', '获取日期', '来源', '原值', '残值', '折旧方法', '责任人', '部门', '位置', '载体/账号', '状态', '到期日', '供应商', '发票号', '规格型号', '序列号', '备注'];
  const demo = [{
    资产名称: '示例-笔记本电脑', 资产类型: '固定资产', 分类: '电子设备', 数量: 1, 单位: '台', 获取日期: '2026-01-15',
    来源: '采购', 原值: 6000, 残值: 500, 折旧方法: '直线法', 责任人: '张三', 部门: '技术部', 位置: 'A座3层',
    载体账号: '', 状态: '闲置', 到期日: '', 供应商: '联想', 发票号: 'INV202601001', 规格型号: 'ThinkPad X1', 序列号: 'PF123456', 备注: '示例行，导入前请删除'
  }];
  const ws = xlsx.utils.json_to_sheet(demo, { header: headers });
  xlsx.utils.book_append_sheet(wb, ws, '资产导入模板');
  const buf = xlsx.write(wb, { bookType: 'xlsx', type: 'buffer' });
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename=asset_import_template.xlsx');
  res.send(buf);
});

// 批量导入：解析 Excel → 逐行生成资产编号(ZC-年-序号)并入库，写入入库轨迹
router.post('/assets/import', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: '请上传 Excel 文件' });
    const { pool } = req.app.locals;
    const operator = getOperator(req);
    const workbook = xlsx.readFile(req.file.path);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = xlsx.utils.sheet_to_json(sheet, { defval: '' });
    if (!rows.length) return res.status(400).json({ success: false, message: 'Excel 为空或无可识别的数据行' });

    const clean = (s) => (s == null ? '' : String(s).toString().trim());
    const typeMap = { 固定资产: 'fixed', 无形资产: 'intangible', 耗材: 'consumable', 耗材库存: 'consumable', fixed: 'fixed', intangible: 'intangible', consumable: 'consumable' };
    const statusMap = { 闲置: '闲置', 在用: '在用', 维修: '维修', 报废: '报废' };

    const [cats] = await pool.execute('SELECT id, name FROM asset_categories');
    const catByName = {};
    cats.forEach(c => { catByName[clean(c.name)] = c.id; });

    const year = new Date().getFullYear();
    const [[{ c: baseC }]] = await pool.execute('SELECT COUNT(*) AS c FROM assets WHERE YEAR(createdAt) = ?', [year]);
    let seq = baseC;
    const cols = ['assetCode', 'name', 'assetType', 'categoryId', 'quantity', 'unit', 'acquireDate', 'source', 'originalValue', 'residualValue', 'depMethod', 'responsibleUser', 'department', 'location', 'carrier', 'status', 'expireDate', 'supplier', 'invoiceNo', 'spec', 'sn', 'remark', 'createdBy', 'availableQuantity'];
    const placeholders = cols.map(() => '?').join(', ');

    let imported = 0, skipped = 0;
    const errors = [];
    for (const raw of rows) {
      const name = clean(raw['资产名称'] || raw['名称'] || raw.name);
      if (!name) { skipped++; continue; }
      const assetType = typeMap[clean(raw['资产类型'] || raw['类型'] || raw.assetType)] || 'fixed';
      const catName = clean(raw['分类'] || raw.categoryName);
      const categoryId = catName && catByName[catName] ? catByName[catName] : null;
      const unit = clean(raw['单位'] || raw.unit) || (assetType === 'consumable' ? '个' : '台');
      const quantity = Math.max(1, parseInt(raw['数量'] || raw.quantity, 10) || 1);
      const status = statusMap[clean(raw['状态'] || raw.status)] || '闲置';
      const acquireDate = clean(raw['获取日期'] || raw.acquireDate) || null;
      const expireDate = clean(raw['到期日'] || raw.expireDate) || null;
      const originalValue = parseFloat(raw['原值'] || raw.originalValue) || 0;
      const residualValue = parseFloat(raw['残值'] || raw.residualValue) || 0;
      const avail = assetType === 'consumable' ? quantity : null;
      seq += 1;
      const assetCode = `ZC-${year}-${String(seq).padStart(4, '0')}`;
      const params = [
        assetCode, name, assetType, categoryId, quantity, unit, acquireDate,
        clean(raw['来源'] || raw.source) || '', originalValue, residualValue,
        clean(raw['折旧方法'] || raw.depMethod) || '', clean(raw['责任人'] || raw.responsibleUser) || '',
        clean(raw['部门'] || raw.department) || '', clean(raw['位置'] || raw.location) || '',
        clean(raw['载体/账号'] || raw.carrier) || '', status, expireDate,
        clean(raw['供应商'] || raw.supplier) || '', clean(raw['发票号'] || raw.invoiceNo) || '',
        clean(raw['规格型号'] || raw.spec) || '', clean(raw['序列号'] || raw.sn) || '',
        clean(raw['备注'] || raw.remark) || '', operator, avail
      ];
      try {
        const [result] = await pool.execute(`INSERT INTO assets (${cols.join(', ')}) VALUES (${placeholders})`, params);
        await pool.execute(
          'INSERT INTO asset_logs (assetId, action, toStatus, operator, detail, qty) VALUES (?, ?, ?, ?, ?, ?)',
          [result.insertId, '入库', status, operator, `导入新增 ${assetCode} ${name}`, quantity]
        );
        imported++;
      } catch (e) {
        skipped++;
        errors.push(`「${name}」导入失败：${e.message}`);
      }
    }
    createOperationLog(pool, { userId: null, username: operator, action: 'import', module: 'asset', targetId: 0, targetName: '资产批量导入', detail: `导入资产: 成功${imported}条，跳过${skipped}条`, ipAddress: req.ip });
    res.json({ success: true, message: `导入完成：成功 ${imported} 条，跳过 ${skipped} 条`, data: { imported, skipped, errors: errors.slice(0, 20) } });
  } catch (error) {
    console.error('资产导入失败:', error);
    res.status(500).json({ success: false, message: '导入失败: ' + error.message });
  }
});

export default router;
