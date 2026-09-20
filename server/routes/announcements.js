/**
 * 公告模块
 *
 * 用途：
 *   1) 管理端（公告管理菜单）：公告的增删改查、发布/置顶 —— 需「系统管理员 / 总经理」角色；
 *   2) 公开端（登录页左侧面板）：免鉴权读取「已发布」公告列表/详情 + 平台概览指标。
 *
 * 公开接口挂在 /api/public/* 下，requireAuth 的 PUBLIC_PATHS 对其放行（见 middleware/requireAuth.js）。
 * 注意：公开端只读取 announcements 中 status='已发布' 且 is_deleted=0 的记录，绝不回传草稿。
 *
 * MySQL 5.7 兼容：不使用 JSON 类型；建表/补列均幂等。
 */
import express from 'express';
import { createOperationLog, getOperator, getRecordBefore, logDataChange } from '../utils/audit.js';

const router = express.Router();

// 公告管理权限：仅系统管理员与总经理（内置账号 管理员/admin 另在中间件内放行）
const ANNOUNCE_ADMIN_ROLES = ['系统管理员', '总经理'];
// 公告分类（管理页下拉与此保持一致）
const CATEGORIES = ['公司公告', '人事通知', '行政通知', '制度规范', '活动资讯'];
const STATUSES = ['草稿', '已发布'];
// 紧急程度：登录页据此着色（普通=蓝 / 重要=橙 / 紧急=红）
const PRIORITIES = ['普通', '重要', '紧急'];

let schemaReady = null;

/** 幂等建表 + 补列，成功后缓存，失败允许重试 */
export async function ensureAnnouncementsSchema(pool) {
  if (schemaReady) return schemaReady;
  schemaReady = (async () => {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS announcements (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(200) NOT NULL,
        content TEXT,
        category VARCHAR(50) NOT NULL DEFAULT '公司公告',
        status VARCHAR(20) NOT NULL DEFAULT '已发布',
        is_top TINYINT NOT NULL DEFAULT 0,
        publisher VARCHAR(50) DEFAULT '',
        publish_at DATETIME NULL,
        view_count INT NOT NULL DEFAULT 0,
        is_deleted TINYINT NOT NULL DEFAULT 0,
        created_at DATETIME NOT NULL,
        updated_at DATETIME NOT NULL,
        INDEX idx_status_publish (status, is_deleted, is_top, publish_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    // 补列（兼容已存在的旧表；1060 = 列已存在，静默跳过）
    const cols = [
      ['category', "VARCHAR(50) NOT NULL DEFAULT '公司公告'"],
      ['status', "VARCHAR(20) NOT NULL DEFAULT '已发布'"],
      ['is_top', 'TINYINT NOT NULL DEFAULT 0'],
      ['publisher', "VARCHAR(50) DEFAULT ''"],
      ['publish_at', 'DATETIME NULL'],
      ['view_count', 'INT NOT NULL DEFAULT 0'],
      ['is_deleted', 'TINYINT NOT NULL DEFAULT 0'],
      ['updated_at', 'DATETIME NULL'],
      ['attachments', 'TEXT'], // 附件元信息 JSON 数组：[{name,url,size,ext,mime,group}]
      ['priority', "VARCHAR(10) NOT NULL DEFAULT '普通'"], // 紧急程度：普通/重要/紧急
    ];
    for (const [name, ddl] of cols) {
      try {
        await pool.query(`ALTER TABLE announcements ADD COLUMN ${name} ${ddl}`);
      } catch (e) {
        if (e.code !== 'ER_DUP_FIELDNAME' && e.errno !== 1060) {
          console.error(`[announcements] 补列 ${name} 失败:`, e.message);
        }
      }
    }
  })().catch((e) => {
    console.error('[announcements] 建表/补列失败，允许下次重试:', e.message);
    schemaReady = null;
    throw e;
  });
  return schemaReady;
}

/** 公告管理权限中间件（查库角色，不信任 token 角色） */
async function requireAnnounceAdmin(req, res, next) {
  try {
    const { pool } = req.app.locals;
    let username = req.user?.username || req.user?.name || '';
    if (username && /^emp_/.test(username)) {
      const parts = String(username).split('_');
      if (parts.length >= 2) username = parts[1];
    }
    if (!username) return res.status(401).json({ success: false, message: '未登录' });
    if (username === '管理员' || /^admin$/i.test(username)) return next();

    const [employees] = await pool.execute(
      'SELECT e.roleId, r.name AS roleName FROM employees e LEFT JOIN roles r ON e.roleId = r.id WHERE e.name = ?',
      [username]
    );
    if (employees.length === 0) {
      return res.status(403).json({ success: false, message: '无公告管理权限' });
    }
    const roleName = employees[0].roleName || '';
    if (!ANNOUNCE_ADMIN_ROLES.includes(roleName)) {
      return res.status(403).json({ success: false, message: '无公告管理权限' });
    }
    next();
  } catch (e) {
    return res.status(500).json({ success: false, message: '权限验证失败' });
  }
}

const now = () => new Date().toISOString().slice(0, 19).replace('T', ' ');
const cleanText = (v) => (v === undefined || v === null ? '' : String(v));
const toDate = (v) => {
  const s = cleanText(v).trim();
  if (!s) return null;
  return s.length >= 10 ? s.slice(0, 10) + (s.length > 10 ? ' ' + s.slice(11, 19) : ' 00:00:00') : s;
};
const stripHtml = (s) => cleanText(s).replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();

/** 安全解析 attachments（TEXT 存 JSON 数组），失败返回 [] */
function parseAttachments(v) {
  if (!v) return [];
  if (Array.isArray(v)) return v;
  try {
    const arr = JSON.parse(v);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

/* ============================ 公开端（登录页，免鉴权） ============================ */

// 平台概览指标（登录页「实时数据看板」）
router.get('/public/overview', async (req, res) => {
  const { pool } = req.app.locals;
  try {
    await ensureAnnouncementsSchema(pool);
    const safeCount = async (sql, params = []) => {
      try {
        const [rows] = await pool.query(sql, params);
        return Number(rows?.[0]?.c || 0);
      } catch { return 0; }
    };
    const data = {
      employees: await safeCount("SELECT COUNT(*) AS c FROM employees WHERE status IN ('在职','试用期')"),
      departments: await safeCount('SELECT COUNT(DISTINCT department) AS c FROM employees WHERE department IS NOT NULL AND department <> ""'),
      announcements: await safeCount("SELECT COUNT(*) AS c FROM announcements WHERE status = '已发布' AND is_deleted = 0"),
      files: await safeCount('SELECT COUNT(*) AS c FROM files'),
      // 今日一览（登录页）：只回数量，不回会议标题/参会人等明细，避免未登录态泄露内部信息
      meetingsToday: await safeCount(
        "SELECT COUNT(*) AS c FROM meetings WHERE (is_deleted = 0 OR is_deleted IS NULL) AND DATE(meetingDate) = CURDATE() AND status NOT IN ('已拒绝','已撤回','已退回')"
      ),
      announcementsToday: await safeCount(
        "SELECT COUNT(*) AS c FROM announcements WHERE status = '已发布' AND is_deleted = 0 AND DATE(COALESCE(publish_at, created_at)) = CURDATE()"
      ),
    };
    res.json({ success: true, data });
  } catch (error) {
    console.error('获取公开概览指标失败:', error);
    res.json({ success: false, message: '获取概览指标失败', data: { employees: 0, departments: 0, announcements: 0, files: 0, meetingsToday: 0, announcementsToday: 0 } });
  }
});

// 已发布公告列表（登录页动态公告栏）：置顶优先 → 发布时间倒序
router.get('/public/announcements', async (req, res) => {
  const { pool } = req.app.locals;
  try {
    await ensureAnnouncementsSchema(pool);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 8, 1), 50);
    const [rows] = await pool.execute(
      `SELECT id, title, content, category, priority, is_top, publisher, publish_at, created_at, attachments
       FROM announcements
       WHERE status = '已发布' AND is_deleted = 0
       ORDER BY is_top DESC, COALESCE(publish_at, created_at) DESC, id DESC
       LIMIT ${limit}`
    );
    const data = rows.map(r => {
      const attaches = parseAttachments(r.attachments);
      // 轮播封面：取第一个图片类附件
      const cover = attaches.find(a => a && a.group === 'image')?.url || '';
      return {
        id: r.id,
        title: r.title,
        summary: stripHtml(r.content).slice(0, 120),
        category: r.category,
        priority: r.priority || '普通',
        isTop: Number(r.is_top) === 1,
        publisher: r.publisher || '',
        publishAt: r.publish_at || r.created_at,
        attachments: attaches,
        cover,
      };
    });
    res.json({ success: true, data });
  } catch (error) {
    console.error('获取公开公告列表失败:', error);
    res.json({ success: false, message: '获取公告失败', data: [] });
  }
});

// 公告详情（登录页点击查看全文），同时累加阅读量
router.get('/public/announcements/:id', async (req, res) => {
  const { pool } = req.app.locals;
  try {
    await ensureAnnouncementsSchema(pool);
    const id = parseInt(req.params.id, 10);
    if (!id) return res.json({ success: false, message: '公告不存在' });
    const [rows] = await pool.execute(
      `SELECT id, title, content, category, priority, is_top, publisher, publish_at, created_at, attachments
       FROM announcements WHERE id = ? AND status = '已发布' AND is_deleted = 0 LIMIT 1`,
      [id]
    );
    if (rows.length === 0) return res.json({ success: false, message: '公告不存在或已下线' });
    pool.execute('UPDATE announcements SET view_count = view_count + 1 WHERE id = ?', [id]).catch(() => {});
    const r = rows[0];
    res.json({
      success: true,
      data: {
        id: r.id,
        title: r.title,
        content: cleanText(r.content),
        category: r.category,
        priority: r.priority || '普通',
        isTop: Number(r.is_top) === 1,
        publisher: r.publisher || '',
        publishAt: r.publish_at || r.created_at,
        attachments: parseAttachments(r.attachments),
      },
    });
  } catch (error) {
    console.error('获取公开公告详情失败:', error);
    res.json({ success: false, message: '获取公告失败' });
  }
});

/* ============================ 管理端（公告管理菜单） ============================ */

// 列表（分页 + 关键字 + 状态筛选）
router.get('/announcements', requireAnnounceAdmin, async (req, res) => {
  const { pool } = req.app.locals;
  try {
    await ensureAnnouncementsSchema(pool);
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const pageSize = Math.min(Math.max(parseInt(req.query.pageSize, 10) || 20, 1), 100);
    const where = ['is_deleted = 0'];
    const params = [];
    if (req.query.status) { where.push('status = ?'); params.push(String(req.query.status)); }
    if (req.query.category) { where.push('category = ?'); params.push(String(req.query.category)); }
    if (req.query.keyword) {
      where.push('(title LIKE ? OR content LIKE ?)');
      const kw = `%${String(req.query.keyword).trim()}%`;
      params.push(kw, kw);
    }
    const whereSql = 'WHERE ' + where.join(' AND ');

    const [countRows] = await pool.execute(`SELECT COUNT(*) AS total FROM announcements ${whereSql}`, params);
    const [rows] = await pool.execute(
      `SELECT id, title, content, category, priority, status, is_top, publisher, publish_at, view_count, created_at, updated_at, attachments
       FROM announcements ${whereSql}
       ORDER BY is_top DESC, COALESCE(publish_at, created_at) DESC, id DESC
       LIMIT ${pageSize} OFFSET ${(page - 1) * pageSize}`,
      params
    );
    res.json({
      success: true,
      data: {
        list: rows.map(r => ({ ...r, is_top: Number(r.is_top) === 1, view_count: Number(r.view_count || 0), attachments: parseAttachments(r.attachments) })),
        total: countRows[0].total,
        page,
        pageSize,
      },
    });
  } catch (error) {
    console.error('获取公告列表失败:', error);
    res.status(500).json({ success: false, message: '获取公告列表失败' });
  }
});

// 详情（编辑回填，含草稿）
router.get('/announcements/:id', requireAnnounceAdmin, async (req, res) => {
  const { pool } = req.app.locals;
  try {
    await ensureAnnouncementsSchema(pool);
    const [rows] = await pool.execute('SELECT * FROM announcements WHERE id = ? AND is_deleted = 0 LIMIT 1', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ success: false, message: '公告不存在' });
    res.json({ success: true, data: { ...rows[0], is_top: Number(rows[0].is_top) === 1, attachments: parseAttachments(rows[0].attachments) } });
  } catch (error) {
    console.error('获取公告详情失败:', error);
    res.status(500).json({ success: false, message: '获取公告详情失败' });
  }
});

// 新增
router.post('/announcements', requireAnnounceAdmin, async (req, res) => {
  const { pool } = req.app.locals;
  try {
    await ensureAnnouncementsSchema(pool);
    const title = cleanText(req.body.title).trim();
    if (!title) return res.status(400).json({ success: false, message: '请填写公告标题' });
    const status = STATUSES.includes(req.body.status) ? req.body.status : '已发布';
    const category = CATEGORIES.includes(req.body.category) ? req.body.category : '公司公告';
    const priority = PRIORITIES.includes(req.body.priority) ? req.body.priority : '普通';
    const isTop = req.body.is_top ? 1 : 0;
    const publishAt = toDate(req.body.publish_at) || (status === '已发布' ? now() : null);
    const ts = now();
    const attachmentsJson = JSON.stringify(Array.isArray(req.body.attachments) ? req.body.attachments : []);
    const [result] = await pool.execute(
      `INSERT INTO announcements (title, content, category, priority, status, is_top, publisher, publish_at, view_count, is_deleted, created_at, updated_at, attachments)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, 0, ?, ?, ?)`,
      [title, cleanText(req.body.content), category, priority, status, isTop, getOperator(req), publishAt, ts, ts, attachmentsJson]
    );
    createOperationLog(pool, {
      username: getOperator(req), action: 'create', module: 'announcement',
      targetId: result.insertId, targetName: title, detail: `新增公告《${title}》(${status})`,
    });
    res.json({ success: true, message: '公告已保存', data: { id: result.insertId } });
  } catch (error) {
    console.error('新增公告失败:', error);
    res.status(500).json({ success: false, message: '新增公告失败' });
  }
});

// 更新
router.put('/announcements/:id', requireAnnounceAdmin, async (req, res) => {
  const { pool } = req.app.locals;
  const { id } = req.params;
  try {
    await ensureAnnouncementsSchema(pool);
    const [rows] = await pool.execute('SELECT * FROM announcements WHERE id = ? AND is_deleted = 0 LIMIT 1', [id]);
    if (rows.length === 0) return res.status(404).json({ success: false, message: '公告不存在' });
    const old = rows[0];
    const title = cleanText(req.body.title ?? old.title).trim();
    if (!title) return res.status(400).json({ success: false, message: '请填写公告标题' });
    const status = STATUSES.includes(req.body.status) ? req.body.status : old.status;
    const category = CATEGORIES.includes(req.body.category) ? req.body.category : old.category;
    const priority = PRIORITIES.includes(req.body.priority) ? req.body.priority : (old.priority || '普通');
    const isTop = req.body.is_top === undefined ? old.is_top : (req.body.is_top ? 1 : 0);
    let publishAt = req.body.publish_at === undefined ? old.publish_at : toDate(req.body.publish_at);
    // 草稿首次发布：自动补发布时间
    if (status === '已发布' && !publishAt) publishAt = now();
    const hadPublished = old.status === '已发布' && old.publish_at;
    const attachmentsJson = req.body.attachments === undefined
      ? old.attachments
      : JSON.stringify(Array.isArray(req.body.attachments) ? req.body.attachments : []);

    const before = await getRecordBefore(pool, 'announcements', id);
    await pool.execute(
      `UPDATE announcements SET title = ?, content = ?, category = ?, priority = ?, status = ?, is_top = ?, publish_at = ?, updated_at = ?, attachments = ? WHERE id = ?`,
      [title, req.body.content === undefined ? old.content : cleanText(req.body.content), category, priority, status, isTop, hadPublished && req.body.publish_at === undefined ? old.publish_at : publishAt, now(), attachmentsJson, id]
    );
    const [after] = await pool.execute('SELECT * FROM announcements WHERE id = ?', [id]);
    logDataChange(pool, {
      module: 'announcement', action: 'update', username: getOperator(req),
      targetId: id, targetName: title, beforeValue: before, afterValue: after[0] || null,
    });
    res.json({ success: true, message: '公告已更新' });
  } catch (error) {
    console.error('更新公告失败:', error);
    res.status(500).json({ success: false, message: '更新公告失败' });
  }
});

// 删除（软删，与 OA 模块一致的 is_deleted 口径）
router.delete('/announcements/:id', requireAnnounceAdmin, async (req, res) => {
  const { pool } = req.app.locals;
  const { id } = req.params;
  try {
    await ensureAnnouncementsSchema(pool);
    const [rows] = await pool.execute('SELECT title FROM announcements WHERE id = ? AND is_deleted = 0 LIMIT 1', [id]);
    if (rows.length === 0) return res.status(404).json({ success: false, message: '公告不存在' });
    await pool.execute('UPDATE announcements SET is_deleted = 1, updated_at = ? WHERE id = ?', [now(), id]);
    createOperationLog(pool, {
      username: getOperator(req), action: 'delete', module: 'announcement',
      targetId: id, targetName: rows[0].title, detail: `删除公告《${rows[0].title}》`,
    });
    res.json({ success: true, message: '公告已删除' });
  } catch (error) {
    console.error('删除公告失败:', error);
    res.status(500).json({ success: false, message: '删除公告失败' });
  }
});

export default router;
