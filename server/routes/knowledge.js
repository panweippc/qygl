import express from 'express';
import { requireRole } from '../middleware/auth.js';
const router = express.Router();

// 获取所有分类
router.get('/knowledge/categories', async (req, res) => {
  const { pool } = req.app.locals;
  try {
    const [categories] = await pool.execute(
      'SELECT kc.*, (SELECT COUNT(*) FROM knowledge_articles WHERE categoryId = kc.id) AS articleCount FROM knowledge_categories kc ORDER BY kc.sort, kc.id'
    );
    res.json({ success: true, data: categories });
  } catch (error) {
    console.error('获取知识库分类失败:', error);
    res.status(500).json({ success: false, message: '获取分类失败' });
  }
});

// 创建分类
router.post('/knowledge/categories', requireRole('系统管理员', '总经理', '技术部经理', '销售部经理', '财务总监'), async (req, res) => {
  const { pool } = req.app.locals;
  const { name, description, sort } = req.body;
  if (!name) return res.status(400).json({ success: false, message: '分类名称不能为空' });
  try {
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
    const [result] = await pool.execute(
      'INSERT INTO knowledge_categories (name, description, sort, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?)',
      [name, description || '', sort || 0, now, now]
    );
    res.json({ success: true, message: '分类创建成功', data: { id: result.insertId } });
  } catch (error) {
    console.error('创建分类失败:', error);
    res.status(500).json({ success: false, message: '创建分类失败' });
  }
});

// 更新分类
router.put('/knowledge/categories/:id', requireRole('系统管理员', '总经理', '技术部经理', '销售部经理', '财务总监'), async (req, res) => {
  const { pool } = req.app.locals;
  const { id } = req.params;
  const { name, description, sort } = req.body;
  try {
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
    await pool.execute(
      'UPDATE knowledge_categories SET name = ?, description = ?, sort = ?, updatedAt = ? WHERE id = ?',
      [name, description || '', sort || 0, now, id]
    );
    res.json({ success: true, message: '分类更新成功' });
  } catch (error) {
    console.error('更新分类失败:', error);
    res.status(500).json({ success: false, message: '更新分类失败' });
  }
});

// 删除分类
router.delete('/knowledge/categories/:id', requireRole('系统管理员', '总经理', '技术部经理', '销售部经理', '财务总监'), async (req, res) => {
  const { pool } = req.app.locals;
  const { id } = req.params;
  try {
    await pool.execute('UPDATE knowledge_articles SET categoryId = NULL WHERE categoryId = ?', [id]);
    await pool.execute('DELETE FROM knowledge_categories WHERE id = ?', [id]);
    res.json({ success: true, message: '分类删除成功' });
  } catch (error) {
    console.error('删除分类失败:', error);
    res.status(500).json({ success: false, message: '删除分类失败' });
  }
});

// 获取文章列表
router.get('/knowledge/articles', async (req, res) => {
  const { pool } = req.app.locals;
  const categoryId = req.query.categoryId ? Number(req.query.categoryId) : null;
  const keyword = req.query.keyword || '';
  const page = Math.max(1, Number(req.query.page) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(req.query.pageSize) || 20));
  try {
    let whereClauses = [];
    let params = [];
    if (categoryId) {
      whereClauses.push('ka.categoryId = ?');
      params.push(categoryId);
    }
    if (keyword) {
      whereClauses.push('(ka.title LIKE ? OR ka.summary LIKE ?)');
      params.push(`%${keyword}%`, `%${keyword}%`);
    }
    const whereStr = whereClauses.length > 0 ? ' WHERE ' + whereClauses.join(' AND ') : '';

    const countSql = 'SELECT COUNT(*) AS total FROM knowledge_articles ka' + whereStr;
    const [countResult] = await pool.execute(countSql, params);
    const total = countResult[0].total;

    const offset = (page - 1) * pageSize;
    const dataSql = 'SELECT ka.*, kc.name AS categoryName FROM knowledge_articles ka LEFT JOIN knowledge_categories kc ON ka.categoryId = kc.id' + whereStr + ' ORDER BY ka.sort, ka.createdAt DESC LIMIT ' + Number(pageSize) + ' OFFSET ' + Number(offset);
    const [articles] = await pool.execute(dataSql, params);

    res.json({ success: true, data: { list: articles, total, page, pageSize } });
  } catch (error) {
    console.error('获取文章列表失败:', error.message);
    console.error('SQL:', error.sql);
    res.status(500).json({ success: false, message: '获取文章列表失败' });
  }
});

// 获取单篇文章
router.get('/knowledge/articles/:id', async (req, res) => {
  const { pool } = req.app.locals;
  const { id } = req.params;
  try {
    const [articles] = await pool.execute(
      'SELECT ka.*, kc.name AS categoryName FROM knowledge_articles ka LEFT JOIN knowledge_categories kc ON ka.categoryId = kc.id WHERE ka.id = ?',
      [id]
    );
    if (articles.length === 0) return res.status(404).json({ success: false, message: '文章不存在' });
    await pool.execute('UPDATE knowledge_articles SET views = views + 1 WHERE id = ?', [id]);
    res.json({ success: true, data: articles[0] });
  } catch (error) {
    console.error('获取文章失败:', error);
    res.status(500).json({ success: false, message: '获取文章失败' });
  }
});

// 创建文章
router.post('/knowledge/articles', async (req, res) => {
  const { pool } = req.app.locals;
  const { categoryId, title, content, summary, author, tags, sort, files } = req.body;
  if (!title) return res.status(400).json({ success: false, message: '文章标题不能为空' });
  try {
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
    const [result] = await pool.execute(
      'INSERT INTO knowledge_articles (categoryId, title, content, files, summary, author, tags, sort, status, views, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [categoryId || null, title, content || '', JSON.stringify(files || []), summary || '', author || '', tags || '', sort || 0, 'published', 0, now, now]
    );
    res.json({ success: true, message: '文章创建成功', data: { id: result.insertId } });
  } catch (error) {
    console.error('创建文章失败:', error);
    res.status(500).json({ success: false, message: '创建文章失败' });
  }
});

// 更新文章
router.put('/knowledge/articles/:id', requireRole('系统管理员', '总经理', '技术部经理', '销售部经理', '财务总监'), async (req, res) => {
  const { pool } = req.app.locals;
  const { id } = req.params;
  const { categoryId, title, content, summary, author, tags, sort, files } = req.body;
  try {
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
    await pool.execute(
      'UPDATE knowledge_articles SET categoryId = ?, title = ?, content = ?, files = ?, summary = ?, author = ?, tags = ?, sort = ?, updatedAt = ? WHERE id = ?',
      [categoryId || null, title, content || '', JSON.stringify(files || []), summary || '', author || '', tags || '', sort || 0, now, id]
    );
    res.json({ success: true, message: '文章更新成功' });
  } catch (error) {
    console.error('更新文章失败:', error);
    res.status(500).json({ success: false, message: '更新文章失败' });
  }
});

// 删除文章
router.delete('/knowledge/articles/:id', async (req, res) => {
  const { pool } = req.app.locals;
  const { id } = req.params;
  try {
    await pool.execute('DELETE FROM knowledge_articles WHERE id = ?', [id]);
    res.json({ success: true, message: '文章删除成功' });
  } catch (error) {
    console.error('删除文章失败:', error);
    res.status(500).json({ success: false, message: '删除文章失败' });
  }
});

export default router;
