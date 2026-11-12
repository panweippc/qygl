// 全局回收站：列表 / 恢复 / 单条彻底清除 / 模块清单
// 权限：管理员可看可恢复全部；普通员工仅限自己删除的条目。
// 保留期 30 天：列表前惰性清理过期登记，列表只查未过期且未恢复的条目。
import express from 'express';
import {
  RECYCLE_MODULES, RECYCLE_KEEP_DAYS, getRecycleIdentity,
  purgeExpired, restoreItem, logRestore
} from '../utils/recycleBin.js';

const router = express.Router();

// 模块清单（供前端筛选下拉）
router.get('/recycle-bin/modules', async (req, res) => {
  const modules = Object.entries(RECYCLE_MODULES).map(([key, m]) => ({ key, label: m.label }));
  res.json({ success: true, data: modules });
});

// 列表
router.get('/recycle-bin', async (req, res) => {
  const { pool } = req.app.locals;
  try {
    const { me, isAdmin } = await getRecycleIdentity(pool, req);
    await purgeExpired(pool);

    const where = ["status = 'deleted'", 'deleted_at >= DATE_SUB(NOW(), INTERVAL ? DAY)'];
    const params = [RECYCLE_KEEP_DAYS];
    if (!isAdmin) { where.push('deleted_by = ?'); params.push(me); }
    if (req.query.module) { where.push('module = ?'); params.push(String(req.query.module)); }
    if (req.query.keyword) {
      where.push('(title LIKE ? OR module_label LIKE ? OR deleted_by LIKE ?)');
      const kw = `%${String(req.query.keyword).trim()}%`;
      params.push(kw, kw, kw);
    }
    const page = Math.max(1, Number(req.query.page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(req.query.pageSize) || 20));
    const whereStr = 'WHERE ' + where.join(' AND ');

    const [countRows] = await pool.execute(`SELECT COUNT(*) AS total FROM recycle_bin_items ${whereStr}`, params);
    const offset = (page - 1) * pageSize;
    const [rows] = await pool.execute(
      `SELECT id, module, module_label, table_name, record_id, title, deleted_by, deleted_at, restore_mode, status,
              DATE_ADD(deleted_at, INTERVAL ? DAY) AS expire_at
       FROM recycle_bin_items ${whereStr}
       ORDER BY deleted_at DESC, id DESC LIMIT ${pageSize} OFFSET ${offset}`,
      [RECYCLE_KEEP_DAYS, ...params]
    );
    res.json({
      success: true,
      data: { list: rows, total: countRows[0].total, page, pageSize, isAdmin, keepDays: RECYCLE_KEEP_DAYS }
    });
  } catch (error) {
    console.error('获取回收站列表失败:', error);
    res.status(500).json({ success: false, message: '获取回收站列表失败' });
  }
});

// 恢复单条
router.post('/recycle-bin/:id/restore', async (req, res) => {
  const { pool } = req.app.locals;
  const { id } = req.params;
  try {
    const { me, isAdmin } = await getRecycleIdentity(pool, req);
    const [rows] = await pool.execute('SELECT * FROM recycle_bin_items WHERE id = ? LIMIT 1', [id]);
    if (!rows.length) return res.status(404).json({ success: false, message: '该记录不存在' });
    const item = rows[0];
    if (item.status !== 'deleted') return res.status(400).json({ success: false, message: '该记录已恢复或已清除' });
    if (!isAdmin && item.deleted_by !== me) {
      return res.status(403).json({ success: false, message: '只能恢复自己删除的记录' });
    }
    if (item.deleted_at < new Date(Date.now() - RECYCLE_KEEP_DAYS * 86400000)) {
      return res.status(400).json({ success: false, message: '超过 30 天保留期，无法恢复' });
    }

    const result = await restoreItem(pool, item);
    if (!result.ok) return res.status(409).json({ success: false, message: result.message });

    await pool.execute(
      "UPDATE recycle_bin_items SET status = 'restored', restored_at = NOW(), restored_by = ?, restored_id = ? WHERE id = ?",
      [me, result.restoredId, id]
    );
    await logRestore(pool, req, item, result.restoredId, result.message);
    res.json({ success: true, message: result.message, data: { restoredId: result.restoredId } });
  } catch (error) {
    console.error('恢复回收站记录失败:', error);
    res.status(500).json({ success: false, message: '恢复失败：' + error.message });
  }
});

// 彻底清除单条（不再可恢复）
router.delete('/recycle-bin/:id', async (req, res) => {
  const { pool } = req.app.locals;
  const { id } = req.params;
  try {
    const { me, isAdmin } = await getRecycleIdentity(pool, req);
    const [rows] = await pool.execute('SELECT id, deleted_by, status FROM recycle_bin_items WHERE id = ? LIMIT 1', [id]);
    if (!rows.length) return res.status(404).json({ success: false, message: '该记录不存在' });
    if (!isAdmin && rows[0].deleted_by !== me) {
      return res.status(403).json({ success: false, message: '只能清除自己删除的记录' });
    }
    await pool.execute("UPDATE recycle_bin_items SET status = 'purged' WHERE id = ?", [id]);
    res.json({ success: true, message: '已彻底清除' });
  } catch (error) {
    console.error('清除回收站记录失败:', error);
    res.status(500).json({ success: false, message: '清除失败' });
  }
});

export default router;
