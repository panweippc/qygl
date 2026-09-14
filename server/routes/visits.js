import express from 'express';
import { createOperationLog, getRecordBefore, logDataChange, getOperator } from '../utils/audit.js';
const router = express.Router();

// 按客户名获取拜访记录（销售漏斗联动）
router.get('/visit-records/customer/:customerName', async (req, res) => {
  const { customerName } = req.params;
  try {
    const { pool } = req.app.locals;
    const [data] = await pool.execute('SELECT * FROM visit_records WHERE customerName = ? ORDER BY visitDate DESC, id DESC', [customerName]);
    res.json({ success: true, data: data });
  } catch (error) {
    res.status(500).json({ success: false, message: '获取拜访记录失败' });
  }
});

// 获取乡镇的拜访记录
router.get('/visit-records/:townId', async (req, res) => {
  const { townId } = req.params;
  try {
    const { pool } = req.app.locals;
    const [data] = await pool.execute('SELECT * FROM visit_records WHERE townId = ? ORDER BY id DESC', [townId]);
    res.json({ success: true, data: data });
  } catch (error) {
    res.status(500).json({ success: false, message: '获取拜访记录失败' });
  }
});

// 按乡镇ID获取拜访记录（别名路由，避免与 :townId 参数冲突）
router.get('/visit-records/town/:townId', async (req, res) => {
  const { townId } = req.params;
  try {
    const { pool } = req.app.locals;
    const [data] = await pool.execute('SELECT * FROM visit_records WHERE townId = ? ORDER BY id DESC', [townId]);
    res.json({ success: true, data: data });
  } catch (error) {
    res.status(500).json({ success: false, message: '获取拜访记录失败' });
  }
});

// 添加拜访记录（支持按客户维度，townId 可空；自动解析 customer_id 为后续精确统计预留）
router.post('/visit-records', async (req, res) => {
  const { townId, customerName, address, visitDate, visitPerson, visitContent, nextPlan } = req.body;
  try {
    const { pool } = req.app.locals;
    if (!customerName || !visitDate || !visitPerson || !visitContent) {
      return res.status(400).json({ success: false, message: '客户名称、拜访日期、拜访人、拜访内容为必填' });
    }
    // 解析客户主数据 id（customers 为空时写 NULL，为后续精确统计预留）
    let customerId = null;
    try {
      const [cust] = await pool.execute('SELECT id FROM customers WHERE name = ? LIMIT 1', [customerName]);
      if (cust.length) customerId = cust[0].id;
    } catch {}
    const tid = townId != null && townId !== '' ? Number(townId) : null;
    let maxRow;
    if (tid) {
      [[maxRow]] = await pool.execute('SELECT COALESCE(MAX(visitNo), 0) AS maxNo FROM visit_records WHERE townId = ?', [tid]);
    } else {
      [[maxRow]] = await pool.execute('SELECT COALESCE(MAX(visitNo), 0) AS maxNo FROM visit_records WHERE customerName = ?', [customerName]);
    }
    const visitNo = Number(maxRow.maxNo) + 1;
    await pool.execute(
      'INSERT INTO visit_records (townId, customer_id, customerName, address, visitDate, visitPerson, visitContent, nextPlan, visitNo, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [tid, customerId, customerName, address || '', visitDate, visitPerson, visitContent, nextPlan || null, visitNo, new Date().toISOString().replace('T', ' ').replace('Z', '')]
    );
    // 同步到大项目进展的拜访记录子表（若该客户已建项目）
    try {
      const [proj] = await pool.execute('SELECT id FROM sales_project_analysis WHERE customer_name = ? LIMIT 1', [customerName]);
      if (proj.length) {
        const [[mx]] = await pool.execute('SELECT COALESCE(MAX(seq),0) AS m FROM sales_project_visit_records WHERE analysis_id = ?', [proj[0].id]);
        await pool.execute(
          'INSERT INTO sales_project_visit_records (analysis_id, seq, visit_time, communication_record, next_strategy) VALUES (?, ?, ?, ?, ?)',
          [proj[0].id, mx.m + 1, visitDate, visitContent, nextPlan || '']
        );
      }
    } catch (e) { console.error('同步项目拜访记录失败(不影响主流程):', e); }
    await createOperationLog(pool, {
      username: getOperator(req),
      action: 'create',
      module: 'visit',
      targetName: `拜访记录"${customerName}"`,
    });
    res.json({ success: true, message: '拜访记录添加成功' });
  } catch (error) {
    res.status(500).json({ success: false, message: '添加拜访记录失败' });
  }
});

// 更新拜访记录
router.put('/visit-records/:id', async (req, res) => {
  const { id } = req.params;
  const { customerName, address, visitDate, visitPerson, visitContent, nextPlan } = req.body;
  try {
    const { pool } = req.app.locals;
    const [old] = await pool.execute('SELECT customerName FROM visit_records WHERE id = ?', [id]);
    const name = customerName || (old.length > 0 ? old[0].customerName : id);
    // 更新前取旧值，用于变更审计
    const beforeValue = await getRecordBefore(pool, 'visit_records', id, { customerName: 1, address: 1, visitDate: 1, visitPerson: 1, visitContent: 1, nextPlan: 1 });
    await pool.execute(
      'UPDATE visit_records SET customerName = ?, address = ?, visitDate = ?, visitPerson = ?, visitContent = ?, nextPlan = ? WHERE id = ?',
      [customerName, address, visitDate, visitPerson, visitContent, nextPlan || null, id]
    );
    await createOperationLog(pool, {
      username: getOperator(req),
      action: 'update',
      module: 'visit',
      targetName: `拜访记录"${name}"`,
      targetId: parseInt(id),
    });
    await logDataChange(pool, {
      module: 'visit',
      username: getOperator(req),
      targetId: parseInt(id),
      targetName: `拜访记录"${name}"`,
      beforeValue,
      afterValue: { customerName, address, visitDate, visitPerson, visitContent, nextPlan: nextPlan || null },
      ipAddress: req.ip
    });
    res.json({ success: true, message: '拜访记录更新成功' });
  } catch (error) {
    res.status(500).json({ success: false, message: '更新拜访记录失败' });
  }
});

// 删除拜访记录
router.delete('/visit-records/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const { pool } = req.app.locals;
    const [rows] = await pool.execute('SELECT customerName FROM visit_records WHERE id = ?', [id]);
    const name = rows.length > 0 ? rows[0].customerName : id;
    await pool.execute('DELETE FROM visit_records WHERE id = ?', [id]);
    await createOperationLog(pool, {
      username: getOperator(req),
      action: 'delete',
      module: 'visit',
      targetName: `拜访记录"${name}"`,
      targetId: parseInt(id),
    });
    res.json({ success: true, message: '拜访记录删除成功' });
  } catch (error) {
    res.status(500).json({ success: false, message: '删除拜访记录失败' });
  }
});

export default router;
