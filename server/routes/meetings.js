import express from 'express';
const router = express.Router();

router.get('/meetings', async (req, res) => {
  try {
    const { pool } = req.app.locals;
    const [meetings] = await pool.execute('SELECT * FROM meetings');
    res.json({ success: true, data: meetings });
  } catch (error) {
    console.error('获取会议记录失败:', error);
    res.status(500).json({ success: false, message: '获取会议记录失败' });
  }
});

router.post('/meetings', async (req, res) => {
  const { title, organizer, meetingDate, meetingTime, location, participants, agenda, approver } = req.body;
  try {
    const { pool } = req.app.locals;
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
    await pool.execute(
      'INSERT INTO meetings (title, organizer, meetingDate, meetingTime, location, participants, agenda, approver, status, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [title, organizer, meetingDate, meetingTime, location, participants, agenda, approver, '待审批', now]
    );
    res.json({ success: true, message: '会议创建成功' });
  } catch (error) {
    console.error('创建会议失败:', error);
    res.status(500).json({ success: false, message: '创建会议失败' });
  }
});

router.put('/meetings/:id', async (req, res) => {
  const { id } = req.params;
  const { comment, result } = req.body;
  try {
    const { pool } = req.app.locals;
    const status = result === '批准' ? '已批准' : result === '拒绝' ? '已拒绝' : '待审批';
    await pool.execute(
      'UPDATE meetings SET comment = ?, result = ?, status = ? WHERE id = ?',
      [comment || null, result || null, status, id]
    );
    res.json({ success: true, message: '会议审批更新成功' });
  } catch (error) {
    console.error('更新会议审批失败:', error);
    res.status(500).json({ success: false, message: '更新会议审批失败' });
  }
});

router.get('/meetings/pending/:approver', async (req, res) => {
  const { approver } = req.params;
  try {
    const { pool } = req.app.locals;
    const [meetings] = await pool.execute('SELECT * FROM meetings WHERE approver = ? AND status = ?', [approver, '待审批']);
    res.json({ success: true, data: meetings });
  } catch (error) {
    console.error('获取待审批会议失败:', error);
    res.status(500).json({ success: false, message: '获取待审批会议失败' });
  }
});

export default router;
