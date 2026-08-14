import express from 'express';
import { createOperationLog, getRecordBefore, logDataChange, getOperator } from '../utils/audit.js';
const router = express.Router();

const localNow = () => {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
};

router.get('/monthly-reports', async (req, res) => {
  try {
    const { pool } = req.app.locals;
    const [reports] = await pool.execute(
      'SELECT w.*, u.username FROM weeklyReports w LEFT JOIN users u ON w.userId = u.id'
    );
    const decodeName = (s) => {
      if (typeof s !== 'string' || !s.includes('%')) return s;
      try { return decodeURIComponent(s); } catch (e) { return s; }
    };
    const reportsWithFiles = reports.map((report) => ({
      ...report,
      files: report.files
        ? JSON.parse(report.files).map((f) => ({ ...f, name: decodeName(f.name) }))
        : []
    }));
    res.json({ success: true, data: reportsWithFiles });
  } catch (error) {
    console.error('获取月报数据失败:', error);
    res.status(500).json({ success: false, message: '获取月报数据失败' });
  }
});

router.post('/monthly-reports', async (req, res) => {
  const { title, content, plan, userId, files, date } = req.body;
  try {
    const { pool } = req.app.locals;
    const filesJson = files ? JSON.stringify(files) : null;
    await pool.execute(
      'INSERT INTO weeklyReports (title, content, plan, files, userId, date, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [title, content, plan || '', filesJson, userId, date || null, localNow()]
    );
    await createOperationLog(pool, {
      username: getOperator(req),
      action: 'create',
      module: 'monthly_report',
      targetName: `月报: ${title}`,
      detail: `新增月报: ${title}`
    });
    res.json({ success: true, message: '月报上传成功' });
  } catch (error) {
    console.error('上传月报失败:', error);
    res.status(500).json({ success: false, message: '上传月报失败' });
  }
});

router.put('/monthly-reports/:id', async (req, res) => {
  const { id } = req.params;
  const { title, content, plan, userId, files, date } = req.body;
  try {
    const { pool } = req.app.locals;
    // 更新前取旧值，用于变更审计
    const beforeValue = await getRecordBefore(pool, 'weeklyReports', id, { title: 1, content: 1, plan: 1 });
    const filesJson = files ? JSON.stringify(files) : null;
    await pool.execute(
      'UPDATE weeklyReports SET title = ?, content = ?, plan = ?, files = ?, date = ? WHERE id = ? AND userId = ?',
      [title, content, plan || '', filesJson, date || null, id, userId]
    );
    await createOperationLog(pool, {
      username: getOperator(req),
      action: 'update',
      module: 'monthly_report',
      targetName: `月报: ${title}`,
      detail: `更新月报: ${title} (ID: ${id})`
    });
    await logDataChange(pool, {
      module: 'monthly_report',
      username: getOperator(req),
      targetId: id,
      targetName: `月报: ${title}`,
      beforeValue,
      afterValue: { title, content, plan: plan || '' },
      ipAddress: req.ip
    });
    res.json({ success: true, message: '月报更新成功' });
  } catch (error) {
    console.error('更新月报失败:', error);
    res.status(500).json({ success: false, message: '更新月报失败' });
  }
});

export default router;
