import express from 'express';
import { createOperationLog } from '../utils/audit.js';
const router = express.Router();

router.get('/project-categories', async (req, res) => {
  const { pool } = req.app.locals;
  try {
    const [projects] = await pool.execute('SELECT * FROM projects');
    res.json({ success: true, data: projects });
  } catch (error) {
    res.status(500).json({ success: false, message: '获取项目数据失败' });
  }
});

router.post('/project-categories', async (req, res) => {
  const { pool } = req.app.locals;
  const { name, category, description, manager, link } = req.body;
  try {
    await pool.execute(
      'INSERT INTO projects (name, category, description, manager, link, createdAt) VALUES (?, ?, ?, ?, ?, ?)',
      [name, category, description, manager || '', link || '', new Date().toISOString().replace('T', ' ').replace('Z', '')]
    );
    await createOperationLog(pool, {
      username: req.body.operator || '系统',
      action: 'create',
      module: 'project',
      targetName: name,
      detail: `添加项目: ${name}`
    });
    res.json({ success: true, message: '产品分类添加成功' });
  } catch (error) {
    res.status(500).json({ success: false, message: '添加产品分类失败' });
  }
});

router.delete('/project-categories/:category', async (req, res) => {
  const { pool } = req.app.locals;
  const { category } = req.params;
  try {
    await pool.execute('DELETE FROM project_applications WHERE project_type = ?', [category]);
    await createOperationLog(pool, {
      username: req.body.operator || '系统',
      action: 'delete',
      module: 'project',
      targetName: category,
      detail: `删除产品分类: ${category}`
    });
    res.json({ success: true, message: '产品分类删除成功' });
  } catch (error) {
    res.status(500).json({ success: false, message: '删除产品分类失败' });
  }
});

router.put('/project-categories/update-type', async (req, res) => {
  const { pool } = req.app.locals;
  const { oldType, newType } = req.body;
  try {
    await pool.execute(
      'UPDATE project_applications SET project_type = ? WHERE project_type = ?',
      [newType, oldType]
    );
    await createOperationLog(pool, {
      username: req.body.operator || '系统',
      action: 'update',
      module: 'project',
      targetName: newType,
      detail: `项目类型更新: ${oldType} -> ${newType}`
    });
    res.json({ success: true, message: '项目类型更新成功' });
  } catch (error) {
    console.error('更新项目类型失败:', error);
    res.status(500).json({ success: false, message: '更新项目类型失败' });
  }
});

router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  const { pool } = req.app.locals;
  try {
    const [rows] = await pool.execute('SELECT name FROM projects WHERE id = ?', [id]);
    const projectName = rows.length > 0 ? rows[0].name : id;
    await pool.execute('DELETE FROM projects WHERE id = ?', [id]);
    await createOperationLog(pool, {
      username: req.body.operator || '系统',
      action: 'delete',
      module: 'project',
      targetName: projectName,
      detail: `删除项目: ${projectName}`
    });
    res.json({ success: true, message: '项目删除成功' });
  } catch (error) {
    console.error('删除项目失败:', error);
    res.status(500).json({ success: false, message: '删除项目失败' });
  }
});

router.put('/project-categories/:id', async (req, res) => {
  const { pool } = req.app.locals;
  const { id } = req.params;
  const { name, description, link } = req.body;
  console.log('更新项目请求:', { id, name, description, link });
  try {
    await pool.execute(
      'UPDATE projects SET name = ?, description = ?, link = ? WHERE id = ?',
      [name, description, link, id]
    );
    console.log('项目更新成功:', id);
    await createOperationLog(pool, {
      username: req.body.operator || '系统',
      action: 'update',
      module: 'project',
      targetName: name,
      detail: `更新项目: ${name}`
    });
    res.json({ success: true, message: '项目更新成功' });
  } catch (error) {
    console.error('更新项目失败:', error);
    res.status(500).json({ success: false, message: '更新项目失败' });
  }
});

export default router;
