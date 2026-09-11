import express from 'express';
import { createOperationLog, getRecordBefore, logDataChange, getOperator } from '../utils/audit.js';
import { getRealName } from '../utils/identity.js';
import { requireOwnerOrRole } from '../middleware/auth.js';
const router = express.Router();

// 与 knowledge.js 保持同一套管理员白名单口径
const MANAGER_ROLES = ['系统管理员', '总经理', '技术部经理', '销售部经理', '财务总监'];

// 供「创建人本人或管理员」校验使用：取分类项目的 applicant_name 字段
const getCategoryProjectOwner = async (pool, req) => {
  const [rows] = await pool.execute('SELECT applicant_name FROM category_projects WHERE id = ?', [req.params.id]);
  return rows.length > 0 ? rows[0].applicant_name : null;
};

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
      userId: req.user?.id || '',
      username: getOperator(req),
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
    // 同步删除 projects 表中该分类本身（新增分类时以 name/category 落库），
    // 否则分类会从 projects 表残留、刷新后“删除成功却仍存在”
    await pool.execute('DELETE FROM projects WHERE category = ? OR name = ?', [category, category]);
    await pool.execute('DELETE FROM project_applications WHERE project_type = ?', [category]);
    // 同步清理独立分类项目表，避免分类删除后残留
    await pool.execute('DELETE FROM category_projects WHERE category_name = ?', [category]);
    await createOperationLog(pool, {
      username: getOperator(req),
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
  const { oldType, newType, description } = req.body;
  try {
    // 1) 更新 projects 表里的分类本身（categories 列表的数据源）—— 这是修 bug 的关键
    //    新增分类时 name 与 category 都写分类名；编辑时只改 name，category 也跟着改以保持一致
    if (description !== undefined && description !== null) {
      await pool.execute(
        'UPDATE projects SET name = ?, category = ?, description = ? WHERE name = ? OR category = ?',
        [newType, newType, description, oldType, oldType]
      );
    } else {
      await pool.execute(
        'UPDATE projects SET name = ?, category = ? WHERE name = ? OR category = ?',
        [newType, newType, oldType, oldType]
      );
    }
    // 2) 仅在 oldType !== newType 时同步关联表，避免无意义写入
    if (oldType !== newType) {
      await pool.execute(
        'UPDATE project_applications SET project_type = ? WHERE project_type = ?',
        [newType, oldType]
      );
      await pool.execute(
        'UPDATE category_projects SET category_name = ? WHERE category_name = ?',
        [newType, oldType]
      );
    }
    await createOperationLog(pool, {
      username: getOperator(req),
      action: 'update',
      module: 'project',
      targetName: newType,
      detail: `项目类型更新: ${oldType} -> ${newType}${description !== undefined && description !== null ? ' (含详情)' : ''}`
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
      username: getOperator(req),
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
    const beforeValue = await getRecordBefore(pool, 'projects', id, { name: 1, description: 1, link: 1 });
    await pool.execute(
      'UPDATE projects SET name = ?, description = ?, link = ? WHERE id = ?',
      [name, description, link, id]
    );
    console.log('项目更新成功:', id);
    await createOperationLog(pool, {
      username: getOperator(req),
      action: 'update',
      module: 'project',
      targetName: name,
      detail: `更新项目: ${name}`
    });
    await logDataChange(pool, {
      module: 'project', username: getOperator(req), targetId: id, targetName: `项目: ${name}`,
      beforeValue, afterValue: { name, description, link }, ipAddress: req.ip
    });
    res.json({ success: true, message: '项目更新成功' });
  } catch (error) {
    console.error('更新项目失败:', error);
    res.status(500).json({ success: false, message: '更新项目失败' });
  }
});

// ===== 产品分类下的项目：独立存储，不写入 project_applications，不进 OA 审批流 =====
async function ensureCategoryProjectsTable(pool) {
  await pool.execute(`CREATE TABLE IF NOT EXISTS category_projects (
    id INT PRIMARY KEY AUTO_INCREMENT,
    category_id INT NOT NULL DEFAULT 0,
    category_name VARCHAR(255) NOT NULL,
    project_name VARCHAR(255) NOT NULL,
    description TEXT,
    manager VARCHAR(255),
    project_link VARCHAR(255),
    applicant_name VARCHAR(255),
    status VARCHAR(50) DEFAULT '未开始',
    progress INT DEFAULT 0,
    start_date VARCHAR(20),
    end_date VARCHAR(20),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  )`);
  await ensureCategoryProjectColumns(pool);
}

// 已存在的旧表需要补列（CREATE TABLE IF NOT EXISTS 不会改结构），逐列幂等添加
let cpColumnsReady = null;
async function ensureCategoryProjectColumns(pool) {
  if (cpColumnsReady) return cpColumnsReady;
  cpColumnsReady = (async () => {
    const columns = {
      status: "VARCHAR(50) DEFAULT '未开始'",
      progress: 'INT DEFAULT 0',
      start_date: 'VARCHAR(20)',
      end_date: 'VARCHAR(20)'
    };
    for (const [col, ddl] of Object.entries(columns)) {
      try {
        await pool.execute(`ALTER TABLE category_projects ADD COLUMN ${col} ${ddl}`);
      } catch (e) {
        if (e.code !== 'ER_DUP_FIELDNAME') {
          console.error('[projects] 补列失败:', col, e.message);
          cpColumnsReady = null; // 允许下次重试
          return;
        }
      }
    }
  })();
  return cpColumnsReady;
}

// 产品分类页卡统计（与产品分类菜单页同源：category_projects 表）
router.get('/project-categories/stats', async (req, res) => {
  const { pool } = req.app.locals;
  try {
    await ensureCategoryProjectsTable(pool);
    const [[{ total }]] = await pool.query('SELECT COUNT(*) AS total FROM category_projects');
    const [[{ categories }]] = await pool.query('SELECT COUNT(DISTINCT category_name) AS categories FROM category_projects');
    res.json({ success: true, data: { total: Number(total) || 0, categories: Number(categories) || 0 } });
  } catch (error) {
    console.error('获取产品分类统计失败:', error);
    res.status(500).json({ success: false, message: '获取产品分类统计失败' });
  }
});

// 列出某分类（或全部）下的项目
// 列表某分类（或全部）下的项目
router.get('/project-categories/projects', async (req, res) => {
  const { pool } = req.app.locals;
  try {
    await ensureCategoryProjectsTable(pool);
    const { category } = req.query;
    let rows;
    if (category) {
      [rows] = await pool.execute('SELECT * FROM category_projects WHERE category_name = ? ORDER BY id DESC', [category]);
    } else {
      [rows] = await pool.execute('SELECT * FROM category_projects ORDER BY id DESC');
    }
    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: '获取分类项目失败' });
  }
});

// 新增分类下的项目（不写 project_applications，不进 OA 审批流）
router.post('/project-categories/projects', async (req, res) => {
  const { pool } = req.app.locals;
  const { categoryId, categoryName, projectName, description, link, manager, status, progress, startDate, endDate } = req.body;
  try {
    await ensureCategoryProjectsTable(pool);
    if (!projectName || !categoryName) {
      return res.status(400).json({ success: false, message: '缺少项目名或分类名' });
    }
    const applicant = getRealName(req) || '';
    // 负责人：优先取前端选择的值；未选时默认当前登录用户（保持历史行为）
    const owner = (manager && String(manager).trim()) || applicant;
    const safeProgress = Math.min(100, Math.max(0, Number(progress) || 0));
    const [result] = await pool.execute(
      `INSERT INTO category_projects (category_id, category_name, project_name, description, manager, project_link, applicant_name, status, progress, start_date, end_date, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [categoryId || 0, categoryName, projectName, description || '', owner, link || '', applicant,
        status || '未开始', safeProgress, startDate || null, endDate || null]
    );
    await createOperationLog(pool, {
      username: getOperator(req),
      action: 'create',
      module: 'project',
      targetName: projectName,
      detail: `添加分类项目(${categoryName}): ${projectName}`
    });
    res.json({ success: true, data: { id: result.insertId } });
  } catch (error) {
    res.status(500).json({ success: false, message: '添加分类项目失败' });
  }
});

// 编辑分类下的项目（创建人本人或管理员）
router.put('/project-categories/projects/:id', requireOwnerOrRole(getCategoryProjectOwner, ...MANAGER_ROLES), async (req, res) => {
  const { pool } = req.app.locals;
  const { id } = req.params;
  const { projectName, description, link, manager, status, progress, startDate, endDate } = req.body;
  try {
    await ensureCategoryProjectsTable(pool);
    // 动态组装更新字段：未提交的字段保持原值，避免把历史数据覆盖为空
    const fields = ['project_name = ?', 'description = ?', 'project_link = ?', 'updated_at = NOW()'];
    const params = [projectName, description || '', link || ''];
    if (manager !== undefined && manager !== null && String(manager).trim() !== '') {
      fields.push('manager = ?');
      params.push(String(manager).trim());
    }
    if (status !== undefined) {
      fields.push('status = ?');
      params.push(status || '未开始');
    }
    if (progress !== undefined) {
      fields.push('progress = ?');
      params.push(Math.min(100, Math.max(0, Number(progress) || 0)));
    }
    if (startDate !== undefined) {
      fields.push('start_date = ?');
      params.push(startDate || null);
    }
    if (endDate !== undefined) {
      fields.push('end_date = ?');
      params.push(endDate || null);
    }
    params.push(id);
    await pool.execute(`UPDATE category_projects SET ${fields.join(', ')} WHERE id = ?`, params);
    res.json({ success: true, message: '分类项目更新成功' });
  } catch (error) {
    res.status(500).json({ success: false, message: '更新分类项目失败' });
  }
});

// 将项目重新归入其它资料分类（用于「未分类」项目整理）
router.put('/project-categories/projects/:id/category', async (req, res) => {
  const { pool } = req.app.locals;
  const { id } = req.params;
  const { categoryId, categoryName } = req.body;
  try {
    await ensureCategoryProjectsTable(pool);
    if (!categoryName) return res.status(400).json({ success: false, message: '缺少分类名' });
    await pool.execute('UPDATE category_projects SET category_id = ?, category_name = ? WHERE id = ?', [categoryId || 0, categoryName, id]);
    res.json({ success: true, message: '已归入分类' });
  } catch (error) {
    console.error('归入分类失败:', error);
    res.status(500).json({ success: false, message: '归入分类失败' });
  }
});

// 删除分类下的项目（创建人本人或管理员）
router.delete('/project-categories/projects/:id', requireOwnerOrRole(getCategoryProjectOwner, ...MANAGER_ROLES), async (req, res) => {
  const { pool } = req.app.locals;
  const { id } = req.params;
  try {
    await ensureCategoryProjectsTable(pool);
    await pool.execute('DELETE FROM category_projects WHERE id = ?', [id]);
    res.json({ success: true, message: '分类项目删除成功' });
  } catch (error) {
    res.status(500).json({ success: false, message: '删除分类项目失败' });
  }
});

export default router;
