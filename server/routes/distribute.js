import express from 'express';
const router = express.Router();

// 获取所有下发记录列表（管理员用）
router.get('/distributed-records', async (req, res) => {
  const { pool } = req.app.locals;
  try {
    console.log('收到获取所有下发记录请求');
    const [records] = await pool.execute(
      'SELECT * FROM distributed_records ORDER BY createdAt DESC'
    );
    console.log('查询到下发记录数量:', records.length);
    res.json({ success: true, data: records });
  } catch (error) {
    console.error('获取所有下发记录失败:', error);
    res.status(500).json({ success: false, message: '获取所有下发记录失败: ' + error.message });
  }
});

// 获取下发记录列表（根据目标用户）
router.get('/distributed-records/user/:targetUser', async (req, res) => {
  const { pool } = req.app.locals;
  try {
    let { targetUser } = req.params;
    console.log('接收到的targetUser:', targetUser);

    const match = targetUser.match(/^emp_(.+?)_\d+$/);
    if (match) {
      targetUser = match[1];
      console.log('提取后的真实姓名:', targetUser);
    }

    const [records] = await pool.execute(
      'SELECT * FROM distributed_records WHERE targetUser = ? ORDER BY createdAt DESC',
      [targetUser]
    );

    console.log('查询到的下发记录数量:', records.length);
    res.json({ success: true, data: records });
  } catch (error) {
    console.error('获取下发记录失败:', error);
    res.status(500).json({ success: false, message: '获取下发记录失败: ' + error.message });
  }
});

// 添加下发记录
router.post('/distributed-records', async (req, res) => {
  const { pool } = req.app.locals;
  try {
    const { applicationId, applicationType, applicant, distributedBy, targetUser, comment, status } = req.body;

    console.log('收到下发记录请求:', req.body);

    if (!applicationId || !applicationType || !applicant || !distributedBy || !targetUser) {
      return res.status(400).json({
        success: false,
        message: '缺少必填字段',
        required: ['applicationId', 'applicationType', 'applicant', 'distributedBy', 'targetUser'],
        received: { applicationId, applicationType, applicant, distributedBy, targetUser }
      });
    }

    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');

    const [result] = await pool.execute(
      'INSERT INTO distributed_records (applicationId, applicationType, applicant, distributedBy, targetUser, comment, status, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [applicationId, applicationType, applicant, distributedBy, targetUser, comment || '', status || '待处理', now]
    );

    console.log('下发记录添加成功, ID:', result.insertId);
    res.json({ success: true, message: '下发记录添加成功', data: { id: result.insertId } });
  } catch (error) {
    console.error('添加下发记录失败:', error);
    res.status(500).json({ success: false, message: '添加下发记录失败: ' + error.message });
  }
});

// 更新下发记录
router.put('/distributed-records/:id', async (req, res) => {
  const { pool } = req.app.locals;
  try {
    const { id } = req.params;
    const { status, comment, processComment } = req.body;
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');

    const updates = [];
    const params = [];

    if (status !== undefined) {
      updates.push('status = ?');
      params.push(status);
    }
    if (comment !== undefined) {
      updates.push('comment = ?');
      params.push(comment);
    }
    if (processComment !== undefined) {
      updates.push('processComment = ?');
      params.push(processComment);
    }

    updates.push('updatedAt = ?');
    params.push(now);

    params.push(id);

    const sql = `UPDATE distributed_records SET ${updates.join(', ')} WHERE id = ?`;
    await pool.execute(sql, params);

    res.json({ success: true, message: '下发记录更新成功' });
  } catch (error) {
    console.error('更新下发记录失败:', error);
    res.status(500).json({ success: false, message: '更新下发记录失败: ' + error.message });
  }
});

export default router;
