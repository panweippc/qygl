import express from 'express';
import { createOperationLog, getRecordBefore, logDataChange, getOperator } from '../utils/audit.js';
import { resolveVisitNames, visitNameIn } from '../utils/visitAlias.js';
import { resolveCustomerId, resolveCustomerIds } from '../utils/customerLink.js';
const router = express.Router();

// visit_records 中 VARCHAR(255) 字段的长度上限。超长会触发
// ER_DATA_TOO_LONG 直接 500，前端只看到笼统的「添加拜访记录失败」，
// 因此在写库前先给出可读提示（POST/PUT 共用）。
const VARCHAR_FIELDS = { customerName: '客户名称', visitPerson: '拜访人', address: '地址' };
function checkVisitLengths(body) {
  for (const [key, label] of Object.entries(VARCHAR_FIELDS)) {
    const len = String(body?.[key] ?? '').length;
    if (len > 255) return `${label}不能超过 255 个字符（当前 ${len} 个）`;
  }
  return null;
}

// 按客户名获取拜访记录（销售漏斗联动）
// 客户名单被改过后，历史拜访仍挂在旧名下：按等价名集合 + 客户标识一起查，
// 保证「改名前的记录」依然可见；等效于不搬动任何历史数据就把断链接回来。
router.get('/visit-records/customer/:customerName', async (req, res) => {
  const { customerName } = req.params;
  try {
    const { pool } = req.app.locals;
    const names = await resolveVisitNames(pool, customerName);
    const cond = visitNameIn(names, 'customerName');
    // 按等价名找出该客户的全部主数据标识（改名前后可能对应不同档案），
    // 再按标识查拜访：即使客户名已经改过、拜访记录仍挂旧名，也能完整取回。
    const ids = await resolveCustomerIds(pool, customerName);
    const idCond = ids.length ? ` OR customer_id IN (${ids.map(() => '?').join(',')})` : '';
    const [data] = await pool.execute(
      `SELECT * FROM visit_records WHERE (${cond.sql}${idCond}) AND is_deleted = 0 ORDER BY visitDate DESC, id DESC`,
      [...cond.params, ...ids]
    );
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
    const [data] = await pool.execute('SELECT * FROM visit_records WHERE townId = ? AND is_deleted = 0 ORDER BY id DESC', [townId]);
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
    const [data] = await pool.execute('SELECT * FROM visit_records WHERE townId = ? AND is_deleted = 0 ORDER BY id DESC', [townId]);
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
    const lengthError = checkVisitLengths({ customerName, visitPerson, address });
    if (lengthError) return res.status(400).json({ success: false, message: lengthError });
    // 解析客户主数据标识（等价名集合，改名后仍能命中；customers 为空时写 NULL）
    const customerId = await resolveCustomerId(pool, customerName);
    const tid = townId != null && townId !== '' ? Number(townId) : null;
    let maxRow;
    if (tid) {
      [[maxRow]] = await pool.execute('SELECT COALESCE(MAX(visitNo), 0) AS maxNo FROM visit_records WHERE townId = ?', [tid]);
    } else {
      [[maxRow]] = await pool.execute('SELECT COALESCE(MAX(visitNo), 0) AS maxNo FROM visit_records WHERE customerName = ?', [customerName]);
    }
    const visitNo = Number(maxRow.maxNo) + 1;
    const [insertResult] = await pool.execute(
      'INSERT INTO visit_records (townId, customer_id, customerName, address, visitDate, visitPerson, visitContent, nextPlan, visitNo, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [tid, customerId, customerName, address || '', visitDate, visitPerson, visitContent, nextPlan || null, visitNo, new Date().toISOString().replace('T', ' ').replace('Z', '')]
    );
    const visitId = insertResult.insertId;
    // 同步到大项目进展的拜访记录子表，带上来源标识供删除时精确定位。
    // 按等价名集合 + 客户标识找项目：改名后旧项目骨架仍挂着历史拜访，新增拜访要同步到所有等价项目，
    // 且不再只取第一条（历史上改名会生成多个骨架）。
    try {
      const names = await resolveVisitNames(pool, customerName);
      const cond = visitNameIn(names, 'customer_name');
      const idCond = customerId ? ' OR customer_id = ?' : '';
      const [proj] = await pool.execute(
        `SELECT id FROM sales_project_analysis WHERE (${cond.sql}${idCond}) AND is_deleted = 0`,
        [...cond.params, ...(customerId ? [customerId] : [])]
      );
      for (const p of proj) {
        const [[mx]] = await pool.execute('SELECT COALESCE(MAX(seq),0) AS m FROM sales_project_visit_records WHERE analysis_id = ?', [p.id]);
        await pool.execute(
          'INSERT INTO sales_project_visit_records (analysis_id, seq, visit_time, communication_record, next_strategy, source_visit_id) VALUES (?, ?, ?, ?, ?, ?)',
          [p.id, mx.m + 1, visitDate, visitContent, nextPlan || '', visitId]
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
    console.error('添加拜访记录失败:', error);
    const tip = error?.code === 'ER_DATA_TOO_LONG' ? '：字段内容超过数据库长度限制，请缩短地址或拜访人' : '';
    res.status(500).json({ success: false, message: '添加拜访记录失败' + tip });
  }
});

// 更新拜访记录
router.put('/visit-records/:id', async (req, res) => {
  const { id } = req.params;
  const { customerName, address, visitDate, visitPerson, visitContent, nextPlan } = req.body;
  const lengthError = checkVisitLengths({ customerName, visitPerson, address });
  if (lengthError) return res.status(400).json({ success: false, message: lengthError });
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
    console.error('更新拜访记录失败:', error);
    const tip = error?.code === 'ER_DATA_TOO_LONG' ? '：字段内容超过数据库长度限制，请缩短地址或拜访人' : '';
    res.status(500).json({ success: false, message: '更新拜访记录失败' + tip });
  }
});

// 删除拜访记录（软删除全局表 + 同步删除大项目进展中的拜访记录镜像行）
router.delete('/visit-records/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const { pool } = req.app.locals;
    const [rows] = await pool.execute('SELECT customerName, visitContent, nextPlan FROM visit_records WHERE id = ?', [id]);
    const name = rows.length > 0 ? rows[0].customerName : id;
    await pool.execute('UPDATE visit_records SET is_deleted = 1 WHERE id = ?', [id]);
    if (rows.length > 0) {
      // 主路径：按来源标识精确删除；兜底：历史镜像行无来源标识时按内容匹配，且只限该客户名下项目
      const content = String(rows[0].visitContent ?? '');
      const strategy = String(rows[0].nextPlan ?? '');
      // 兜底路径同样按等价名集合匹配项目：客户改过名时，旧骨架下的镜像行也要能被清理到
      const names = await resolveVisitNames(pool, name);
      const cond = visitNameIn(names, 'customer_name');
      await pool.execute(
        `DELETE FROM sales_project_visit_records
         WHERE source_visit_id = ?
            OR (source_visit_id IS NULL
                AND analysis_id IN (SELECT id FROM sales_project_analysis WHERE ${cond.sql})
                AND communication_record = ?
                AND next_strategy = ?)`,
        [id, ...cond.params, content, strategy]
      );
    }
    await createOperationLog(pool, {
      username: getOperator(req),
      action: 'soft_delete',
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
