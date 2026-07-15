import express from 'express';
const router = express.Router();

router.get('/weekly-reports', async (req, res) => {
  try {
    const { pool } = req.app.locals;
    const [reports] = await pool.execute('SELECT * FROM weeklyReports');
    const reportsWithFiles = reports.map((report) => ({
      ...report,
      files: report.files ? JSON.parse(report.files) : []
    }));
    res.json({ success: true, data: reportsWithFiles });
  } catch (error) {
    console.error('获取周报数据失败:', error);
    res.status(500).json({ success: false, message: '获取周报数据失败' });
  }
});

router.post('/weekly-reports', async (req, res) => {
  const { title, content, plan, userId, files, date } = req.body;
  try {
    const { pool } = req.app.locals;
    const filesJson = files ? JSON.stringify(files) : null;
    await pool.execute(
      'INSERT INTO weeklyReports (title, content, plan, files, userId, date, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [title, content, plan || '', filesJson, userId, date || null, new Date().toISOString().replace('T', ' ').replace('Z', '')]
    );
    res.json({ success: true, message: '月报上传成功' });
  } catch (error) {
    console.error('上传月报失败:', error);
    res.status(500).json({ success: false, message: '上传月报失败' });
  }
});

router.put('/weekly-reports/:id', async (req, res) => {
  const { id } = req.params;
  const { title, content, plan, userId, files, date } = req.body;
  try {
    const { pool } = req.app.locals;
    const filesJson = files ? JSON.stringify(files) : null;
    await pool.execute(
      'UPDATE weeklyReports SET title = ?, content = ?, plan = ?, files = ?, date = ? WHERE id = ? AND userId = ?',
      [title, content, plan || '', filesJson, date || null, id, userId]
    );
    res.json({ success: true, message: '月报更新成功' });
  } catch (error) {
    console.error('更新月报失败:', error);
    res.status(500).json({ success: false, message: '更新月报失败' });
  }
});

export default router;
