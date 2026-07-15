import express from 'express';
const router = express.Router();

// 获取请假申请列表
router.get('/leave-applications', async (req, res) => {
  try {
    const { pool } = req.app.locals;
    const [applications] = await pool.execute('SELECT * FROM leave_applications');
    res.json({ success: true, data: applications });
  } catch (error) {
    console.error('获取请假申请失败:', error);
    res.status(500).json({ success: false, message: '获取请假申请失败' });
  }
});

// 提交请假申请
router.post('/leave-applications', async (req, res) => {
  const { applicant, leaveType, startDate, endDate, days, reason, approver } = req.body;
  try {
    const { pool } = req.app.locals;
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
    await pool.execute(
      'INSERT INTO leave_applications (applicant, leaveType, startDate, endDate, days, reason, approver, status, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [applicant, leaveType, startDate, endDate, days, reason, approver, '审批中', now]
    );
    res.json({ success: true, message: '请假申请提交成功' });
  } catch (error) {
    console.error('提交请假申请失败:', error);
    res.status(500).json({ success: false, message: '提交请假申请失败' });
  }
});

// 更新请假申请
router.put('/leave-applications/:id', async (req, res) => {
  const { id } = req.params;
  const { comment, result, nextApprover } = req.body;
  try {
    const { pool } = req.app.locals;
    let status;
    if (result === '批准') {
      status = '已批准';
    } else if (result === '拒绝') {
      status = '已拒绝';
    } else if (result === '取消') {
      status = '已取消';
    } else {
      status = '审批中';
    }
    await pool.execute(
      'UPDATE leave_applications SET comment = ?, result = ?, status = ?, nextApprover = ? WHERE id = ?',
      [comment || null, result || null, status, nextApprover || null, id]
    );
    res.json({ success: true, message: '请假申请更新成功' });
  } catch (error) {
    console.error('更新请假申请失败:', error);
    res.status(500).json({ success: false, message: '更新请假申请失败' });
  }
});

// 删除请假申请
router.delete('/leave-applications/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const { pool } = req.app.locals;
    await pool.execute('DELETE FROM leave_applications WHERE id = ?', [id]);
    res.json({ success: true, message: '请假申请删除成功' });
  } catch (error) {
    console.error('删除请假申请失败:', error);
    res.status(500).json({ success: false, message: '删除请假申请失败' });
  }
});

export default router;
