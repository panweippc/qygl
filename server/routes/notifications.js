import express from 'express';
import { createOperationLog } from '../utils/audit.js';
const router = express.Router();

function escapeId(val) {
  return Number(val);
}

// 获取用户通知列表（分页）
router.get('/notifications', async (req, res) => {
  const { pool } = req.app.locals;
  const { userId, page = 1, pageSize = 20 } = req.query;
  if (!userId) return res.fail('缺少用户ID');
  try {
    const offset = escapeId((parseInt(page) - 1) * parseInt(pageSize));
    const limit = escapeId(parseInt(pageSize));
    const [list] = await pool.query(
      `SELECT * FROM notifications WHERE userId = ? ORDER BY createdAt DESC LIMIT ${limit} OFFSET ${offset}`,
      [userId]
    );
    const [[{ total }]] = await pool.query(
      'SELECT COUNT(*) as total FROM notifications WHERE userId = ?',
      [userId]
    );
    res.success({ list, total, page: parseInt(page), pageSize: limit });
  } catch (error) {
    console.error('获取通知失败:', error);
    res.fail('获取通知失败');
  }
});

// 获取未读通知数量
router.get('/notifications/unread-count', async (req, res) => {
  const { pool } = req.app.locals;
  const { userId } = req.query;
  if (!userId) return res.fail('缺少用户ID');
  try {
    const [[{ count }]] = await pool.execute(
      'SELECT COUNT(*) as count FROM notifications WHERE userId = ? AND isRead = 0',
      [userId]
    );
    res.success({ count });
  } catch (error) {
    console.error('获取未读数量失败:', error);
    res.fail('获取未读数量失败');
  }
});

// 标记单条通知为已读
router.put('/notifications/:id/read', async (req, res) => {
  const { pool } = req.app.locals;
  const { id } = req.params;
  const username = req.body.operator || req.body.username || '系统';
  try {
    await pool.execute('UPDATE notifications SET isRead = 1 WHERE id = ?', [id]);
    await createOperationLog(pool, {
      username,
      action: 'update',
      module: 'notification',
      targetId: id,
      targetName: `通知ID: ${id}`,
      detail: `标记通知已读 ID: ${id}`,
      ipAddress: req.ip
    });
    res.success(null, '已标记为已读');
  } catch (error) {
    console.error('标记已读失败:', error);
    res.fail('标记已读失败');
  }
});

// 标记全部为已读
router.put('/notifications/read-all', async (req, res) => {
  const { pool } = req.app.locals;
  const { userId } = req.body;
  const username = req.body.operator || req.body.username || '系统';
  if (!userId) return res.fail('缺少用户ID');
  try {
    await pool.execute('UPDATE notifications SET isRead = 1 WHERE userId = ?', [userId]);
    await createOperationLog(pool, {
      userId,
      username,
      action: 'update',
      module: 'notification',
      targetId: userId,
      targetName: `用户ID: ${userId}`,
      detail: '全部标记为已读',
      ipAddress: req.ip
    });
    res.success(null, '全部标记为已读');
  } catch (error) {
    console.error('标记全部已读失败:', error);
    res.fail('标记全部已读失败');
  }
});

// 删除通知
router.delete('/notifications/:id', async (req, res) => {
  const { pool } = req.app.locals;
  const { id } = req.params;
  const username = req.body.operator || req.body.username || '系统';
  try {
    await pool.execute('DELETE FROM notifications WHERE id = ?', [id]);
    await createOperationLog(pool, {
      username,
      action: 'delete',
      module: 'notification',
      targetId: id,
      targetName: `通知ID: ${id}`,
      detail: `删除通知 ID: ${id}`,
      ipAddress: req.ip
    });
    res.success(null, '通知已删除');
  } catch (error) {
    console.error('删除通知失败:', error);
    res.fail('删除通知失败');
  }
});

export default router;
