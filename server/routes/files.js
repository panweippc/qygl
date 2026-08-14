import express from 'express';
import { createOperationLog } from '../utils/audit.js';
import { requireRole } from '../middleware/auth.js';
const router = express.Router();

// 判断当前登录用户是否为文件上传者本人
const isOwner = (req, uploaderId, uploaderName) => {
  const me = req.user?.name || req.user?.username || '';
  if (me && (String(uploaderName) === me)) return true;
  if (me && uploaderId != null && String(req.user?.id) === String(uploaderId)) return true;
  return false;
};

router.get('/file-categories', async (req, res) => {
  const { pool } = req.app.locals;
  try {
    const [categories] = await pool.execute('SELECT * FROM file_categories');
    res.json({ success: true, data: categories });
  } catch (error) {
    res.status(500).json({ success: false, message: '获取文件分类失败' });
  }
});

router.post('/file-categories', requireRole('系统管理员', '总经理'), async (req, res) => {
  const { pool } = req.app.locals;
  const { name, description } = req.body;
  const username = req.user?.name || req.user?.username || '系统';
  try {
    const [result] = await pool.execute(
      'INSERT INTO file_categories (name, description, createdAt) VALUES (?, ?, ?)',
      [name, description || '', new Date().toISOString().replace('T', ' ').replace('Z', '')]
    );
    await createOperationLog(pool, {
      username,
      action: 'create',
      module: 'file',
      targetId: result.insertId,
      targetName: name,
      detail: `创建文件分类: ${name}`,
      ipAddress: req.ip
    });
    res.json({ success: true, message: '文件分类创建成功' });
  } catch (error) {
    res.status(500).json({ success: false, message: '创建文件分类失败' });
  }
});

router.delete('/file-categories/:id', requireRole('系统管理员', '总经理'), async (req, res) => {
  const { pool } = req.app.locals;
  const { id } = req.params;
  const username = req.user?.name || req.user?.username || '系统';
  try {
    await pool.execute('DELETE FROM files WHERE categoryId = ?', [id]);
    await pool.execute('DELETE FROM file_categories WHERE id = ?', [id]);
    await createOperationLog(pool, {
      username,
      action: 'delete',
      module: 'file',
      targetId: id,
      targetName: `文件分类ID: ${id}`,
      detail: `删除文件分类 ID: ${id}`,
      ipAddress: req.ip
    });
    res.json({ success: true, message: '文件分类删除成功' });
  } catch (error) {
    res.status(500).json({ success: false, message: '删除文件分类失败' });
  }
});

router.get('/files', async (req, res) => {
  const { pool } = req.app.locals;
  try {
    const [files] = await pool.execute(`
      SELECT f.*, fc.name as category 
      FROM files f 
      LEFT JOIN file_categories fc ON f.categoryId = fc.id
    `);
    res.json({ success: true, data: files });
  } catch (error) {
    res.status(500).json({ success: false, message: '获取文件数据失败' });
  }
});

router.post('/files', async (req, res) => {
  const { pool } = req.app.locals;
  const { name, size, type, url, categoryId } = req.body;
  // 上传者身份取自登录态（token），不信任请求体，防止伪造
  const username = req.user?.name || req.user?.username || '系统';
  const uploaderId = req.user?.id || null;
  try {
    const [result] = await pool.execute(
      'INSERT INTO files (name, size, type, url, uploaderId, categoryId, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [name, size, type, url, uploaderId, categoryId || null, new Date().toISOString().replace('T', ' ').replace('Z', '')]
    );
    await createOperationLog(pool, {
      userId: uploaderId,
      username,
      action: 'create',
      module: 'file',
      targetId: result.insertId,
      targetName: name,
      detail: `上传文件: ${name}`,
      ipAddress: req.ip
    });
    res.json({ success: true, message: '文件上传成功' });
  } catch (error) {
    res.status(500).json({ success: false, message: '上传文件失败' });
  }
});

router.delete('/files/:id', async (req, res) => {
  const { pool } = req.app.locals;
  const { id } = req.params;
  const username = req.user?.name || req.user?.username || '系统';
  try {
    // 权限控制：仅管理员/总经理，或文件上传者本人可删除
    const [fileRows] = await pool.execute('SELECT * FROM files WHERE id = ?', [id]);
    if (fileRows.length === 0) {
      return res.status(404).json({ success: false, message: '文件不存在' });
    }
    const file = fileRows[0];
    const isAdmin = username === '管理员' || username === '总经理' || /^admin$/i.test(username);
    if (!isAdmin && !isOwner(req, file.uploaderId, file.uploaderName)) {
      return res.status(403).json({ success: false, message: '无权删除该文件' });
    }
    await pool.execute('DELETE FROM files WHERE id = ?', [id]);
    await createOperationLog(pool, {
      username,
      action: 'delete',
      module: 'file',
      targetId: id,
      targetName: `文件ID: ${id}`,
      detail: `删除文件 ID: ${id}`,
      ipAddress: req.ip
    });
    res.json({ success: true, message: '文件删除成功' });
  } catch (error) {
    res.status(500).json({ success: false, message: '删除文件失败' });
  }
});

export default router;
