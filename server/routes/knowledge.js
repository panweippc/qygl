import express from 'express';
import { requireRole } from '../middleware/auth.js';
const router = express.Router();

const MANAGER_ROLES = ['系统管理员', '总经理', '技术部经理', '销售部经理', '财务总监'];

async function getUserRole(pool, username) {
  if (!username) return null;
  const [emps] = await pool.execute(
    'SELECT e.name, r.name AS roleName FROM employees e LEFT JOIN roles r ON e.roleId = r.id WHERE e.name = ?',
    [username]
  );
  if (emps.length > 0) return { username: emps[0].name, roleName: emps[0].roleName };
  const [users] = await pool.execute('SELECT id FROM users WHERE username = ?', [username]);
  if (users.length > 0) return { username, roleName: null };
  return null;
}

function hasArticlePermission(article, userInfo) {
  const permType = article.permission_type || 'public';
  if (permType === 'public') return true;
  if (userInfo && MANAGER_ROLES.includes(userInfo.roleName)) return true;
  if (userInfo && article.author === userInfo.username) return true;
  if (permType === 'role' && userInfo && article.permission_targets) {
    const roles = JSON.parse(article.permission_targets);
    if (Array.isArray(roles) && roles.includes(userInfo.roleName)) return true;
  }
  if (permType === 'user' && userInfo && article.permission_targets) {
    const users = JSON.parse(article.permission_targets);
    if (Array.isArray(users) && users.includes(userInfo.username)) return true;
  }
  return false;
}

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
router.post('/knowledge/categories', requireRole(...MANAGER_ROLES), async (req, res) => {
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
router.put('/knowledge/categories/:id', requireRole(...MANAGER_ROLES), async (req, res) => {
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
router.delete('/knowledge/categories/:id', requireRole(...MANAGER_ROLES), async (req, res) => {
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

// 获取文章列表（带权限过滤）
router.get('/knowledge/articles', async (req, res) => {
  const { pool } = req.app.locals;
  const username = req.query.username || '';
  const categoryId = req.query.categoryId ? Number(req.query.categoryId) : null;
  const keyword = req.query.keyword || '';
  const page = Math.max(1, Number(req.query.page) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(req.query.pageSize) || 20));
  try {
    const userInfo = await getUserRole(pool, username);
    let whereClauses = [];
    let params = [];
    if (categoryId) {
      whereClauses.push('ka.categoryId = ?');
      params.push(categoryId);
    }
    if (keyword) {
      whereClauses.push('(ka.title LIKE ? OR ka.summary LIKE ? OR ka.content LIKE ?)');
      params.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`);
    }
    // 非管理员只能看到有权限的文章
    const isManager = userInfo && MANAGER_ROLES.includes(userInfo.roleName);
    if (!isManager) {
      whereClauses.push("(ka.permission_type = 'public' OR (ka.permission_type = 'user' AND JSON_CONTAINS(COALESCE(ka.permission_targets, '[]'), ?)) OR (ka.permission_type = 'role' AND JSON_CONTAINS(COALESCE(ka.permission_targets, '[]'), ?)) OR ka.author = ?)");
      params.push(JSON.stringify(userInfo?.username || ''), JSON.stringify(userInfo?.roleName || ''), userInfo?.username || '');
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
  const username = req.query.username || '';
  try {
    const userInfo = await getUserRole(pool, username);
    const [articles] = await pool.execute(
      'SELECT ka.*, kc.name AS categoryName FROM knowledge_articles ka LEFT JOIN knowledge_categories kc ON ka.categoryId = kc.id WHERE ka.id = ?',
      [id]
    );
    if (articles.length === 0) return res.status(404).json({ success: false, message: '文章不存在' });
    if (!hasArticlePermission(articles[0], userInfo)) {
      return res.status(403).json({ success: false, message: '无权查看此文章' });
    }
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
  const { categoryId, title, content, summary, author, tags, sort, files, permission_type, permission_targets } = req.body;
  if (!title) return res.status(400).json({ success: false, message: '文章标题不能为空' });
  try {
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
    const [result] = await pool.execute(
      'INSERT INTO knowledge_articles (categoryId, title, content, files, permission_type, permission_targets, summary, author, tags, sort, status, views, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [categoryId || null, title, content || '', JSON.stringify(files || []), permission_type || 'public', permission_targets || null, summary || '', author || '', tags || '', sort || 0, 'published', 0, now, now]
    );
    res.json({ success: true, message: '文章创建成功', data: { id: result.insertId } });
  } catch (error) {
    console.error('创建文章失败:', error);
    res.status(500).json({ success: false, message: '创建文章失败' });
  }
});

// 更新文章
router.put('/knowledge/articles/:id', requireRole(...MANAGER_ROLES), async (req, res) => {
  const { pool } = req.app.locals;
  const { id } = req.params;
  const { categoryId, title, content, summary, author, tags, sort, files, permission_type, permission_targets } = req.body;
  try {
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
    await pool.execute(
      'UPDATE knowledge_articles SET categoryId = ?, title = ?, content = ?, files = ?, permission_type = ?, permission_targets = ?, summary = ?, author = ?, tags = ?, sort = ?, updatedAt = ? WHERE id = ?',
      [categoryId || null, title, content || '', JSON.stringify(files || []), permission_type || 'public', permission_targets || null, summary || '', author || '', tags || '', sort || 0, now, id]
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
    res.json({ success: true, message: '删除成功' });
  } catch (error) {
    console.error('删除文章失败:', error);
    res.status(500).json({ success: false, message: '删除文章失败' });
  }
});

export default router;
