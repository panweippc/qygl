import express from 'express';
const router = express.Router();

// 与 knowledge.js 保持同一套管理员白名单口径（文章阅读权限判断用）
const MANAGER_ROLES = ['系统管理员', '总经理', '技术部经理', '销售部经理', '财务总监'];

// 资料中心：统一分类视图
// 分类维度统一取 file_categories（业务线），知识文章通过 knowledge_articles.resourceCategoryId 挂到同一分类，
// 项目信息按 category_projects.category_name 与分类名对应，另有「未分类」桶兜住没有归属的数据。
router.get('/resource-center/categories', async (req, res) => {
  const { pool } = req.app.locals;
  try {
    const [categories] = await pool.execute('SELECT id, name, description FROM file_categories ORDER BY id');

    const [fileRows] = await pool.execute('SELECT categoryId, COUNT(*) AS cnt FROM files GROUP BY categoryId');

    // resourceCategoryId 由启动迁移补齐；若尚未执行则降级为 0，不影响页面渲染
    let articleRows = [];
    try {
      const [rows] = await pool.execute('SELECT resourceCategoryId, COUNT(*) AS cnt FROM knowledge_articles GROUP BY resourceCategoryId');
      articleRows = rows;
    } catch (e) {
      console.log('统计文章分类失败(可能未迁移):', e.message);
    }

    const [projectRows] = await pool.execute('SELECT category_name, COUNT(*) AS cnt FROM category_projects GROUP BY category_name');

    const toMap = (rows, key) => {
      const map = new Map();
      rows.forEach(r => {
        const k = r[key] === null || r[key] === undefined ? 'null' : String(r[key]);
        map.set(k, (map.get(k) || 0) + Number(r.cnt || 0));
      });
      return map;
    };

    const fileMap = toMap(fileRows, 'categoryId');
    const articleMap = toMap(articleRows, 'resourceCategoryId');

    const nameSet = new Set(categories.map(c => c.name));
    const projectMap = new Map();
    let uncategorizedProjects = 0;
    projectRows.forEach(r => {
      const name = (r.category_name || '').trim();
      if (!name || !nameSet.has(name)) {
        uncategorizedProjects += Number(r.cnt || 0);
        return;
      }
      projectMap.set(name, (projectMap.get(name) || 0) + Number(r.cnt || 0));
    });

    const data = categories.map(c => ({
      id: c.id,
      name: c.name,
      description: c.description || '',
      fileCount: fileMap.get(String(c.id)) || 0,
      articleCount: articleMap.get(String(c.id)) || 0,
      projectCount: projectMap.get(c.name) || 0
    }));

    res.json({
      success: true,
      data: {
        categories: data,
        uncategorized: {
          fileCount: fileMap.get('null') || 0,
          articleCount: articleMap.get('null') || 0,
          projectCount: uncategorizedProjects
        },
        totals: {
          files: fileRows.reduce((s, r) => s + Number(r.cnt || 0), 0),
          articles: articleRows.reduce((s, r) => s + Number(r.cnt || 0), 0),
          projects: projectRows.reduce((s, r) => s + Number(r.cnt || 0), 0)
        }
      }
    });
  } catch (error) {
    console.error('获取资料中心分类失败:', error);
    res.status(500).json({ success: false, message: '获取资料中心分类失败: ' + error.message });
  }
});

// 资料中心全局搜索：一次请求跨「文件 / 文章 / 项目」三类聚合，供顶栏搜索框使用
// 说明：文章沿用 /knowledge/articles 的阅读权限口径，非管理员只能搜到自己有权看到的文章
router.get('/resource-center/search', async (req, res) => {
  const { pool } = req.app.locals;
  const keyword = String(req.query.keyword || '').trim();
  const username = String(req.query.username || '').trim();
  const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 20));
  if (!keyword) {
    return res.json({
      success: true,
      data: { keyword: '', files: [], articles: [], projects: [], counts: { files: 0, articles: 0, projects: 0 } }
    });
  }
  const like = `%${keyword}%`;
  try {
    // ---- 文件：按文件名模糊匹配 ----
    const [files] = await pool.execute(
      `SELECT f.id, f.name, f.size, f.type, f.url, f.categoryId, f.createdAt, fc.name AS categoryName
       FROM files f LEFT JOIN file_categories fc ON f.categoryId = fc.id
       WHERE f.name LIKE ? ORDER BY f.createdAt DESC LIMIT ${limit}`,
      [like]
    );
    const [[fileCount]] = await pool.execute('SELECT COUNT(*) AS n FROM files WHERE name LIKE ?', [like]);

    // ---- 文章：标题/摘要/正文模糊匹配 + 阅读权限过滤 ----
    const articleWhere = ['(ka.title LIKE ? OR ka.summary LIKE ? OR ka.content LIKE ?)'];
    const articleParams = [like, like, like];
    let isManager = false;
    let roleName = '';
    let realName = username;
    if (username) {
      const [emps] = await pool.execute(
        'SELECT e.name, r.name AS roleName FROM employees e LEFT JOIN roles r ON e.roleId = r.id WHERE e.name = ?',
        [username]
      );
      if (emps.length > 0) { roleName = emps[0].roleName || ''; realName = emps[0].name; }
      isManager = roleName ? MANAGER_ROLES.includes(roleName) : false;
    }
    if (!isManager) {
      articleWhere.push("(ka.permission_type = 'public' OR (ka.permission_type = 'user' AND JSON_CONTAINS(COALESCE(ka.permission_targets, '[]'), ?)) OR (ka.permission_type = 'role' AND JSON_CONTAINS(COALESCE(ka.permission_targets, '[]'), ?)) OR ka.author = ?)");
      articleParams.push(JSON.stringify(realName || ''), JSON.stringify(roleName), realName || '');
    }
    const articleWhereStr = ' WHERE ' + articleWhere.join(' AND ');
    const [articles] = await pool.execute(
      `SELECT ka.id, ka.title, ka.summary, ka.author, ka.views, ka.createdAt, ka.resourceCategoryId, fc.name AS categoryName
       FROM knowledge_articles ka LEFT JOIN file_categories fc ON ka.resourceCategoryId = fc.id
       ${articleWhereStr} ORDER BY ka.createdAt DESC LIMIT ${limit}`,
      articleParams
    );
    const [[articleCount]] = await pool.execute('SELECT COUNT(*) AS n FROM knowledge_articles ka' + articleWhereStr, articleParams);

    // ---- 项目：名称/描述模糊匹配 ----
    const [projects] = await pool.execute(
      `SELECT id, category_id, category_name, project_name, description, manager, applicant_name, project_link, created_at
       FROM category_projects WHERE project_name LIKE ? OR description LIKE ? ORDER BY id DESC LIMIT ${limit}`,
      [like, like]
    );
    const [[projectCount]] = await pool.execute(
      'SELECT COUNT(*) AS n FROM category_projects WHERE project_name LIKE ? OR description LIKE ?',
      [like, like]
    );

    res.json({
      success: true,
      data: {
        keyword,
        files,
        articles,
        projects,
        counts: {
          files: Number(fileCount.n) || 0,
          articles: Number(articleCount.n) || 0,
          projects: Number(projectCount.n) || 0
        }
      }
    });
  } catch (error) {
    console.error('资料中心搜索失败:', error);
    res.status(500).json({ success: false, message: '搜索失败' });
  }
});

export default router;
