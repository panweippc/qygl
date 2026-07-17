import express from 'express';
import { createOperationLog } from '../utils/audit.js';
const router = express.Router();

router.get('/file-categories', async (req, res) => {
  const { pool } = req.app.locals;
  try {
    const [categories] = await pool.execute('SELECT * FROM file_categories');
    res.json({ success: true, data: categories });
  } catch (error) {
    res.status(500).json({ success: false, message: '获取文件分类失败' });
  }
});

router.post('/file-categories', async (req, res) => {
  const { pool } = req.app.locals;
  const { name, description } = req.body;
  const username = req.body.operator || req.body.username || '系统';
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

router.delete('/file-categories/:id', async (req, res) => {
  const { pool } = req.app.locals;
  const { id } = req.params;
  const username = req.body.operator || req.body.username || '系统';
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
  const { name, size, type, url, uploaderId, categoryId } = req.body;
  const username = req.body.operator || req.body.username || '系统';
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
  const username = req.body.operator || req.body.username || '系统';
  try {
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
