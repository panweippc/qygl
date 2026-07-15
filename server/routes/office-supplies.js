import express from 'express';
const router = express.Router();

router.get('/office-supplies', async (req, res) => {
  try {
    const { pool } = req.app.locals;
    const [applications] = await pool.execute('SELECT * FROM office_supplies_applications');
    res.json({ success: true, data: applications });
  } catch (error) {
    console.error('获取办公用品申请失败:', error);
    res.status(500).json({ success: false, message: '获取办公用品申请失败' });
  }
});

router.post('/office-supplies', async (req, res) => {
  const { applicant, itemName, quantity, reason, approver } = req.body;
  try {
    const { pool } = req.app.locals;
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
    await pool.execute(
      'INSERT INTO office_supplies_applications (applicant, itemName, quantity, reason, approver, status, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [applicant, itemName, quantity, reason, approver, '审批中', now]
    );
    res.json({ success: true, message: '办公用品申请提交成功' });
  } catch (error) {
    console.error('提交办公用品申请失败:', error);
    res.status(500).json({ success: false, message: '提交办公用品申请失败' });
  }
});

router.put('/office-supplies/:id', async (req, res) => {
  const { id } = req.params;
  const { comment, result } = req.body;
  try {
    const { pool } = req.app.locals;
    await pool.execute(
      'UPDATE office_supplies_applications SET comment = ?, result = ? WHERE id = ?',
      [comment, result, id]
    );
    res.json({ success: true, message: '办公用品申请更新成功' });
  } catch (error) {
    console.error('更新办公用品申请失败:', error);
    res.status(500).json({ success: false, message: '更新办公用品申请失败' });
  }
});

router.get('/office-supplies/pending/:approver', async (req, res) => {
  const { approver } = req.params;
  try {
    const { pool } = req.app.locals;
    const [applications] = await pool.execute('SELECT * FROM office_supplies_applications WHERE approver = ? AND status = ?', [approver, '审批中']);
    res.json({ success: true, data: applications });
  } catch (error) {
    console.error('获取待审批办公用品申请失败:', error);
    res.status(500).json({ success: false, message: '获取待审批办公用品申请失败' });
  }
});

export default router;
