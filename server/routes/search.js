import express from 'express';
const router = express.Router();

// 与 knowledge.js / files.js 保持一致的管理员白名单口径（文章阅读权限、分类管理口径）
const MANAGER_ROLES = ['系统管理员', '总经理', '技术部经理', '销售部经理', '财务总监'];

// 日期格式化：后端 mysql2 返回的 Date 转为 YYYY-MM-DD
function fmtDate(d) {
  if (!d) return '';
  try {
    const dt = (d instanceof Date) ? d : new Date(d);
    if (isNaN(dt.getTime())) return String(d);
    const p = (n) => String(n).padStart(2, '0');
    return `${dt.getFullYear()}-${p(dt.getMonth() + 1)}-${p(dt.getDate())}`;
  } catch (e) {
    return String(d);
  }
}

// 状态中文化：出差/协同等类型库中用英文状态，已是中文的原样透传
const STATUS_TEXT = {
  pending: '待审批', processing: '审批中', approved: '已批准', rejected: '已拒绝',
  closed: '已关闭', completed: '已完成', cancelled: '已取消', draft: '草稿',
  withdrawn: '已撤回', returned: '已退回'
};
function statusText(s) {
  if (!s) return '';
  return STATUS_TEXT[String(s).trim().toLowerCase()] || s;
}

// 操作日志模块名中文化（取值来自 operation_logs.module 实际统计）
const MODULE_TEXT = {
  auth: '登录认证', customer: '客户管理', notification: '消息通知',
  'sales-four-tables': '销售四表', project: '协同申请', system: '系统管理',
  file: '文件管理', deal: '成交管理', 'sales-deal-sub': '成交明细',
  employee: '员工管理', announcement: '公告管理'
};
function moduleText(m) {
  if (!m) return '';
  return MODULE_TEXT[String(m).trim().toLowerCase()] || m;
}

// 全局搜索：一次请求跨 员工/通讯录、OA 六类申请、资料中心、客户、公告、操作日志 聚合
// 权限：员工/通讯录全员可见；OA 申请仅本人(或管理员)可见；资料中心沿用阅读权限；
//       客户全员可见；公告仅管理员；操作日志仅本人(或管理员)。GET 不受 CSRF 限制。
router.get('/search', async (req, res) => {
  const { pool } = req.app.locals;
  const keyword = String(req.query.q || req.query.keyword || '').trim();
  const like = keyword ? `%${keyword}%` : null;
  const user = req.user || {};
  const userName = user.name || '';
  const userRole = user.roleName || '';
  const isManager = MANAGER_ROLES.includes(userRole);
  const limit = Math.min(20, Math.max(1, Number(req.query.limit) || 10));
  try {
    const groups = [];
    const pushGroup = (module, label, items) => {
      if (items && items.length) groups.push({ module, label, items });
    };
    // 本人限定条件（管理员不限）
    const ownerCond = (field) => isManager ? '' : ` AND (${field} = ?)`;
    const ownerVal = (field) => isManager ? [] : [userName];

    // 1. 员工 / 通讯录（全员可见）
    {
      const w = keyword
        ? 'WHERE e.name LIKE ? OR e.phone LIKE ? OR e.department LIKE ? OR e.position LIKE ? OR e.email LIKE ?'
        : '';
      const p = keyword ? [like, like, like, like, like] : [];
      const [rows] = await pool.execute(
        `SELECT e.id, e.name, e.department, e.position, e.phone, e.email
         FROM employees e LEFT JOIN roles r ON e.roleId = r.id ${w} ORDER BY e.id DESC LIMIT ${limit}`, p);
      pushGroup('employee', '员工 / 通讯录', rows.map(r => ({
        id: r.id, type: 'employee', title: r.name,
        sub: `${r.department || ''} · ${r.position || ''} · ${r.phone || ''}`,
        route: '/employee-management', query: {}
      })));
    }

    // 2. OA 申请（六类，仅本人或管理员）
    const oaItems = [];
    // 2.1 请假
    {
      const w = keyword
        ? `WHERE (applicant LIKE ? OR leaveType LIKE ? OR reason LIKE ?)${ownerCond('applicant')}`
        : `WHERE 1=1${ownerCond('applicant')}`;
      const p = keyword ? [like, like, like, ...ownerVal('applicant')] : [...ownerVal('applicant')];
      const [rows] = await pool.execute(
        `SELECT id, applicant, leaveType, status, createdAt FROM leave_applications ${w} ORDER BY id DESC LIMIT ${limit}`, p);
      rows.forEach(r => oaItems.push({ id: r.id, type: 'leave', title: `请假 - ${r.applicant}`,
        sub: `${r.leaveType || ''} · ${statusText(r.status)} · ${fmtDate(r.createdAt)}`, route: '/leave-application', query: { id: r.id } }));
    }
    // 2.2 报销
    {
      const w = keyword
        ? `WHERE (applicant LIKE ? OR reason LIKE ? OR status LIKE ?)${ownerCond('applicant')}`
        : `WHERE 1=1${ownerCond('applicant')}`;
      const p = keyword ? [like, like, like, ...ownerVal('applicant')] : [...ownerVal('applicant')];
      const [rows] = await pool.execute(
        `SELECT id, applicant, status, createdAt FROM reimbursements ${w} ORDER BY id DESC LIMIT ${limit}`, p);
      rows.forEach(r => oaItems.push({ id: r.id, type: 'reimbursement', title: `报销 - ${r.applicant}`,
        sub: `${statusText(r.status)} · ${fmtDate(r.createdAt)}`, route: '/reimbursement', query: { id: r.id } }));
    }
    // 2.3 招待
    {
      const w = keyword
        ? `WHERE (applicant LIKE ? OR purpose LIKE ? OR status LIKE ?)${ownerCond('applicant')}`
        : `WHERE 1=1${ownerCond('applicant')}`;
      const p = keyword ? [like, like, like, ...ownerVal('applicant')] : [...ownerVal('applicant')];
      const [rows] = await pool.execute(
        `SELECT id, applicant, status, createdAt FROM entertainment_expenses ${w} ORDER BY id DESC LIMIT ${limit}`, p);
      rows.forEach(r => oaItems.push({ id: r.id, type: 'entertainment', title: `招待 - ${r.applicant}`,
        sub: `${statusText(r.status)} · ${fmtDate(r.createdAt)}`, route: '/oa/entertainment-apply', query: { id: r.id } }));
    }
    // 2.4 会议
    {
      const w = keyword
        ? `WHERE (title LIKE ? OR organizer LIKE ? OR location LIKE ?)${ownerCond('organizer')}`
        : `WHERE 1=1${ownerCond('organizer')}`;
      const p = keyword ? [like, like, like, ...ownerVal('organizer')] : [...ownerVal('organizer')];
      const [rows] = await pool.execute(
        `SELECT id, title, organizer, status, createdAt FROM meetings ${w} ORDER BY id DESC LIMIT ${limit}`, p);
      rows.forEach(r => oaItems.push({ id: r.id, type: 'meeting', title: `会议 - ${r.title || ''}`,
        sub: `${r.organizer || ''} · ${statusText(r.status)} · ${fmtDate(r.createdAt)}`, route: '/meeting-management', query: { id: r.id } }));
    }
    // 2.5 出差
    {
      const w = keyword
        ? `WHERE (destination LIKE ? OR applicant_name LIKE ? OR purpose LIKE ?)${ownerCond('applicant_name')}`
        : `WHERE 1=1${ownerCond('applicant_name')}`;
      const p = keyword ? [like, like, like, ...ownerVal('applicant_name')] : [...ownerVal('applicant_name')];
      const [rows] = await pool.execute(
        `SELECT id, destination, applicant_name, purpose, status, created_at FROM business_trip_applications ${w} ORDER BY id DESC LIMIT ${limit}`, p);
      rows.forEach(r => oaItems.push({ id: r.id, type: 'business-trip', title: `出差 - ${r.applicant_name}`,
        sub: `${r.destination || ''} · ${statusText(r.status)} · ${fmtDate(r.created_at)}`, route: '/oa/business-trip/list', query: { id: r.id } }));
    }
    // 2.6 协同
    {
      const w = keyword
        ? `WHERE (project_name LIKE ? OR project_type LIKE ? OR applicant_name LIKE ? OR department LIKE ?)${ownerCond('applicant_name')}`
        : `WHERE 1=1${ownerCond('applicant_name')}`;
      const p = keyword ? [like, like, like, like, ...ownerVal('applicant_name')] : [...ownerVal('applicant_name')];
      const [rows] = await pool.execute(
        `SELECT id, project_name, project_type, applicant_name, department, status, created_at FROM project_applications ${w} ORDER BY id DESC LIMIT ${limit}`, p);
      rows.forEach(r => oaItems.push({ id: r.id, type: 'project', title: `协同 - ${r.project_name}`,
        sub: `${r.project_type || ''} · ${r.applicant_name || ''} · ${statusText(r.status)}`, route: '/oa/project-apply/list', query: { id: r.id } }));
    }
    pushGroup('oa', 'OA 申请', oaItems);

    // 3. 资料中心（文件 / 文章 / 项目，沿用阅读权限）
    {
      const rcItems = [];
      // 3.1 文件（全员可见）
      const fw = keyword ? 'WHERE f.name LIKE ?' : '';
      const fp = keyword ? [like] : [];
      const [files] = await pool.execute(
        `SELECT f.id, f.name, f.createdAt, fc.name AS categoryName FROM files f LEFT JOIN file_categories fc ON f.categoryId = fc.id ${fw} ORDER BY f.createdAt DESC LIMIT ${limit}`, fp);
      files.forEach(r => rcItems.push({ id: r.id, type: 'file', title: r.name,
        sub: `文件 · ${r.categoryName || '未分类'} · ${fmtDate(r.createdAt)}`, route: '/resource-center', query: { id: r.id, tab: 'file' } }));
      // 3.2 文章（非管理员按阅读权限过滤）
      const aw = []; const ap = [];
      if (keyword) { aw.push('(ka.title LIKE ? OR ka.summary LIKE ? OR ka.content LIKE ?)'); ap.push(like, like, like); }
      if (!isManager) {
        aw.push("(ka.permission_type = 'public' OR (ka.permission_type = 'user' AND JSON_CONTAINS(COALESCE(ka.permission_targets, '[]'), ?)) OR (ka.permission_type = 'role' AND JSON_CONTAINS(COALESCE(ka.permission_targets, '[]'), ?)) OR ka.author = ?)");
        ap.push(JSON.stringify(userName || ''), JSON.stringify(userRole), userName || '');
      }
      const awStr = aw.length ? ' WHERE ' + aw.join(' AND ') : '';
      const [articles] = await pool.execute(
        `SELECT ka.id, ka.title, ka.author, ka.createdAt FROM knowledge_articles ka${awStr} ORDER BY ka.createdAt DESC LIMIT ${limit}`, ap);
      articles.forEach(r => rcItems.push({ id: r.id, type: 'article', title: r.title,
        sub: `文章 · ${r.author || ''} · ${fmtDate(r.createdAt)}`, route: '/resource-center', query: { id: r.id, tab: 'article' } }));
      // 3.3 项目信息（全员可见）
      const pw = keyword ? 'WHERE project_name LIKE ? OR description LIKE ?' : '';
      const pp = keyword ? [like, like] : [];
      const [projects] = await pool.execute(
        `SELECT id, project_name, manager, created_at FROM category_projects ${pw} ORDER BY id DESC LIMIT ${limit}`, pp);
      projects.forEach(r => rcItems.push({ id: r.id, type: 'project-info', title: r.project_name,
        sub: `项目信息 · ${r.manager || ''} · ${fmtDate(r.created_at)}`, route: '/resource-center', query: { id: r.id, tab: 'project' } }));
      pushGroup('resource', '资料中心', rcItems);
    }

    // 4. 客户（全员可见）
    {
      const w = keyword ? 'WHERE name LIKE ? OR contact LIKE ? OR phone LIKE ? OR email LIKE ?' : '';
      const p = keyword ? [like, like, like, like] : [];
      const [rows] = await pool.execute(
        `SELECT id, name, contact, phone, owner FROM customers ${w} ORDER BY id DESC LIMIT ${limit}`, p);
      pushGroup('customer', '客户', rows.map(r => ({
        id: r.id, type: 'customer', title: r.name,
        sub: `客户 · ${r.contact || ''} · ${r.owner || ''}`, route: '/customer-management', query: { id: r.id }
      })));
    }

    // 5. 公告（仅管理员）
    if (isManager) {
      const w = keyword ? 'WHERE title LIKE ? OR content LIKE ?' : '';
      const p = keyword ? [like, like] : [];
      const [rows] = await pool.execute(
        `SELECT id, title, publisher, created_at FROM announcements ${w} ORDER BY id DESC LIMIT ${limit}`, p);
      pushGroup('announcement', '公告', rows.map(r => ({
        id: r.id, type: 'announcement', title: r.title,
        sub: `公告 · ${r.publisher || ''} · ${fmtDate(r.createdAt)}`, route: '/announcement-management', query: { id: r.id }
      })));
    }

    // 6. 操作日志（本人或管理员）
    {
      const lw = []; const lp = [];
      if (keyword) {
        lw.push('(username LIKE ? OR action LIKE ? OR module LIKE ? OR targetName LIKE ? OR detail LIKE ?)');
        lp.push(like, like, like, like, like);
      }
      if (!isManager) { lw.push('username = ?'); lp.push(userName); }
      const lwStr = lw.length ? ' WHERE ' + lw.join(' AND ') : '';
      const [rows] = await pool.execute(
        `SELECT id, username, action, module, targetName, createdAt FROM operation_logs${lwStr} ORDER BY createdAt DESC LIMIT ${limit}`, lp);
      pushGroup('log', '操作日志', rows.map(r => ({
        id: r.id, type: 'log', title: `${r.username} ${r.targetName || ''}`,
        sub: `日志 · ${moduleText(r.module)} · ${fmtDate(r.createdAt)}`, route: '/operation-log', query: { id: r.id }
      })));
    }

    res.json({
      success: true,
      data: {
        keyword,
        groups,
        total: groups.reduce((s, g) => s + g.items.length, 0)
      }
    });
  } catch (error) {
    console.error('全局搜索失败:', error.message);
    res.json({ success: false, message: '搜索失败，请稍后重试' });
  }
});

export default router;
