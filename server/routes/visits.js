import express from 'express';
const router = express.Router();

// 获取乡镇的拜访记录
router.get('/visit-records/:townId', async (req, res) => {
  const { townId } = req.params;
  try {
    const { pool } = req.app.locals;
    const [data] = await pool.execute('SELECT * FROM visit_records WHERE townId = ? ORDER BY visitDate DESC', [townId]);
    res.json({ success: true, data: data });
  } catch (error) {
    res.status(500).json({ success: false, message: '获取拜访记录失败' });
  }
});

// 添加拜访记录
router.post('/visit-records', async (req, res) => {
  const { townId, customerName, address, visitDate, visitPerson, visitContent, nextPlan } = req.body;
  try {
    const { pool } = req.app.locals;
    await pool.execute(
      'INSERT INTO visit_records (townId, customerName, address, visitDate, visitPerson, visitContent, nextPlan, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [townId, customerName, address, visitDate, visitPerson, visitContent, nextPlan || null, new Date().toISOString().replace('T', ' ').replace('Z', '')]
    );
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
    await pool.execute(
      'UPDATE visit_records SET customerName = ?, address = ?, visitDate = ?, visitPerson = ?, visitContent = ?, nextPlan = ? WHERE id = ?',
      [customerName, address, visitDate, visitPerson, visitContent, nextPlan || null, id]
    );
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
    await pool.execute('DELETE FROM visit_records WHERE id = ?', [id]);
    res.json({ success: true, message: '拜访记录删除成功' });
  } catch (error) {
    res.status(500).json({ success: false, message: '删除拜访记录失败' });
  }
});

export default router;
