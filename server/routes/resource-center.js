import express from 'express';
const router = express.Router();

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

export default router;
