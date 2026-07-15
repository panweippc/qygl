import express from 'express';
const router = express.Router();

// 获取报销记录列表
router.get('/reimbursements', async (req, res) => {
  try {
    const { pool } = req.app.locals;
    const [reimbursements] = await pool.execute('SELECT * FROM reimbursements');
    res.json({ success: true, data: reimbursements });
  } catch (error) {
    console.error('获取报销记录失败:', error);
    res.status(500).json({ success: false, message: '获取报销记录失败' });
  }
});

// 提交报销申请
router.post('/reimbursements', async (req, res) => {
  const { applicant, reimburseType, amount, reimburseDate, reason, approver } = req.body;
  try {
    const { pool } = req.app.locals;
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
    await pool.execute(
      'INSERT INTO reimbursements (applicant, reimburseType, amount, reimburseDate, reason, approver, status, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [applicant, reimburseType, amount, reimburseDate, reason, approver, '审批中', now]
    );
    res.json({ success: true, message: '报销申请提交成功' });
  } catch (error) {
    console.error('提交报销申请失败:', error);
    res.status(500).json({ success: false, message: '提交报销申请失败' });
  }
});

// 更新报销申请
router.put('/reimbursements/:id', async (req, res) => {
  const { id } = req.params;
  const { comment, result } = req.body;
  try {
    const { pool } = req.app.locals;
    const status = result === '批准' ? '已批准' : result === '拒绝' ? '已拒绝' : '审批中';
    await pool.execute(
      'UPDATE reimbursements SET comment = ?, result = ?, status = ? WHERE id = ?',
      [comment || null, result || null, status, id]
    );
    res.json({ success: true, message: '报销申请更新成功' });
  } catch (error) {
    console.error('更新报销申请失败:', error);
    res.status(500).json({ success: false, message: '更新报销申请失败' });
  }
});

// 删除报销申请
router.delete('/reimbursements/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const { pool } = req.app.locals;
    await pool.execute('DELETE FROM reimbursements WHERE id = ?', [id]);
    res.json({ success: true, message: '报销申请删除成功' });
  } catch (error) {
    console.error('删除报销申请失败:', error);
    res.status(500).json({ success: false, message: '删除报销申请失败' });
  }
});

export default router;
