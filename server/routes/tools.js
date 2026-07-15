import express from 'express';
const router = express.Router();

router.get('/tools', async (req, res) => {
  try {
    const { pool } = req.app.locals;
    const [tools] = await pool.execute('SELECT * FROM tools');
    res.json({ success: true, data: tools });
  } catch (error) {
    res.status(500).json({ success: false, message: '获取工具数据失败' });
  }
});

router.post('/tools', async (req, res) => {
  const { name, category, quantity, price, supplier, location, status, entryDate } = req.body;
  try {
    const { pool } = req.app.locals;
    await pool.execute(
      'INSERT INTO tools (name, category, quantity, price, supplier, location, status, entryDate) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [name, category, quantity, price, supplier, location, status, (entryDate || new Date().toISOString()).replace('T', ' ').replace('Z', '')]
    );
    res.json({ success: true, message: '工具添加成功' });
  } catch (error) {
    res.status(500).json({ success: false, message: '添加工具失败' });
  }
});

router.delete('/tools/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const { pool } = req.app.locals;
    await pool.execute('DELETE FROM tools WHERE id = ?', [id]);
    res.json({ success: true, message: '工具删除成功' });
  } catch (error) {
    res.status(500).json({ success: false, message: '删除工具失败' });
  }
});

router.put('/tools/:id', async (req, res) => {
  const { id } = req.params;
  const { name, category, quantity, price, supplier, location, status, entryDate } = req.body;
  try {
    const { pool } = req.app.locals;
    await pool.execute(
      'UPDATE tools SET name = ?, category = ?, quantity = ?, price = ?, supplier = ?, location = ?, status = ?, entryDate = ? WHERE id = ?',
      [name, category, quantity, price, supplier, location, status, (entryDate || new Date().toISOString()).replace('T', ' ').replace('Z', ''), id]
    );
    res.json({ success: true, message: '工具更新成功' });
  } catch (error) {
    console.error('更新工具失败:', error);
    res.status(500).json({ success: false, message: '更新工具失败' });
  }
});

export default router;
