import express from 'express';
const router = express.Router();

function escapeId(val) {
  return Number(val);
}

// 获取操作日志（分页 + 筛选）
router.get('/operation-logs', async (req, res) => {
  const { pool } = req.app.locals;
  const { page = 1, pageSize = 30, module: mod, action, userId: uid, startDate, endDate } = req.query;
  try {
    const conditions = [];
    const params = [];
    if (mod) { conditions.push('module = ?'); params.push(mod); }
    if (action) { conditions.push('action = ?'); params.push(action); }
    if (uid) { conditions.push('userId = ?'); params.push(uid); }
    if (startDate) { conditions.push('createdAt >= ?'); params.push(startDate); }
    if (endDate) { conditions.push('createdAt <= ?'); params.push(endDate); }
    const where = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';
    const offset = escapeId((parseInt(page) - 1) * parseInt(pageSize));
    const limit = escapeId(parseInt(pageSize));

    const [list] = await pool.query(
      `SELECT * FROM operation_logs ${where} ORDER BY createdAt DESC LIMIT ${limit} OFFSET ${offset}`,
      params
    );
    const [[{ total }]] = await pool.query(
      `SELECT COUNT(*) as total FROM operation_logs ${where}`,
      params
    );
    res.success({ list, total, page: parseInt(page), pageSize: limit });
  } catch (error) {
    console.error('获取操作日志失败:', error);
    res.fail('获取操作日志失败');
  }
});

// 获取操作日志模块列表（用于筛选下拉）
router.get('/operation-logs/modules', async (req, res) => {
  const { pool } = req.app.locals;
  try {
    const [rows] = await pool.query('SELECT DISTINCT module FROM operation_logs ORDER BY module');
    res.success(rows.map(r => r.module));
  } catch (error) {
    console.error('获取模块列表失败:', error);
    res.fail('获取模块列表失败');
  }
});

export default router;
