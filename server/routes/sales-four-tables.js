import express from 'express';
import xlsx from 'xlsx';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { createOperationLog, getOperator } from '../utils/audit.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();
const upload = multer({ dest: path.join(__dirname, '../../uploads/temp') });

const SALES_ROLES = ['系统管理员', '销售部经理', '业务中心经理'];
const VIEW_ROLES = ['系统管理员', '总经理', '销售部经理', '业务中心经理'];

// 判断是否是销售数据写入者（总经理仅查看）
async function getSalesPermission(pool, username) {
  if (!username) return { canWrite: false, canView: false };
  // 李智鑫（总经理）在销售漏斗仅查看、不写入
  if (username === '李智鑫') {
    return { canWrite: false, canView: true, isAdmin: true };
  }
  if (username === '管理员' || /^admin$/i.test(username)) {
    return { canWrite: true, canView: true, isAdmin: true };
  }
  const [employees] = await pool.execute(
    'SELECT r.name AS roleName FROM employees e LEFT JOIN roles r ON e.roleId = r.id WHERE e.name = ?',
    [username]
  );
  if (employees.length === 0) return { canWrite: false, canView: false };
  const roleName = employees[0].roleName || '';
  return {
    canWrite: SALES_ROLES.includes(roleName),
    canView: VIEW_ROLES.includes(roleName),
    isAdmin: roleName === '系统管理员'
  };
}

const requireSalesWriter = async (req, res, next) => {
  try {
    const { pool } = req.app.locals;
    let username = req.user?.username || null;
    if (username && /^emp_/.test(username)) {
      const parts = String(username).split('_');
      if (parts.length >= 2) username = parts[1];
    }
    const perm = await getSalesPermission(pool, username);
    if (!perm.canWrite) return res.status(403).json({ success: false, message: '无权限写入销售数据' });
    req.salesPerm = perm;
    next();
  } catch (error) {
    return res.status(500).json({ success: false, message: '权限验证失败' });
  }
};

const requireSalesView = async (req, res, next) => {
  try {
    const { pool } = req.app.locals;
    let username = req.user?.username || null;
    if (username && /^emp_/.test(username)) {
      const parts = String(username).split('_');
      if (parts.length >= 2) username = parts[1];
    }
    const perm = await getSalesPermission(pool, username);
    if (!perm.canView) {
      // 非管理角色：允许查看自己创建的数据，通过 controller 再过滤
      req.salesPerm = { canWrite: false, canView: false, isOwnerFilter: true, username };
      return next();
    }
    req.salesPerm = perm;
    next();
  } catch (error) {
    return res.status(500).json({ success: false, message: '权限验证失败' });
  }
};

const TABLE_META = {
  intention: {
    table: 'sales_intention_funnel',
    label: '意向漏斗',
    headers: ['owner', '销售类型', '收入类型', '申报日期', '产品类型', '合作伙伴名称', '主要竞争对手', '客户名单', '联系人', '电话', '站点数', '本月回款金额', '本月回款把握度', '预计总回款额', '进展状态百分比', '销售状态', '预计回款月份', '主观机会度判断', '成功/放弃', '公司级支持需求', '备注']
  },
  key: {
    table: 'sales_key_funnel',
    label: '重点漏斗',
    headers: ['owner', '销售类型', '收入类型', '申报日期', '产品类型', '合作伙伴名称', '主要竞争对手', '客户名单', '联系人', '电话', '站点数', '本月回款金额', '本月回款把握度', '预计总回款额', '进展状态百分比', '销售状态', '预计回款月份', '主观机会度判断', '成功/放弃', '公司级支持需求', '备注']
  },
  deal: {
    table: 'sales_deal_customers',
    label: '成交用户',
    headers: ['owner', '销售类型', '收入类型', '申报日期', '产品类型', '客户名单', '联系人', '电话', '站点数', '合同额', '实际金额', '回款金额', '未回款金额', '备注']
  }
};

// 漏斗类（意向/重点/成交）DB 字段 → 中文标签
const FUNNEL_FIELD_LABELS = {
  owner: '负责人',
  sales_type: '销售类型',
  revenue_type: '收入类型',
  report_date: '申报日期',
  product_type: '产品类型',
  partner_name: '合作伙伴名称',
  competitor: '主要竞争对手',
  customer_name: '客户名单',
  contact: '联系人',
  phone: '电话',
  site_count: '站点数',
  monthly_repayment: '本月回款金额',
  monthly_confidence: '本月回款把握度',
  estimated_total: '预计总回款额',
  progress_percent: '进展状态百分比',
  sales_status: '销售状态',
  estimated_repay_month: '预计回款月份',
  opportunity_assessment: '主观机会度判断',
  success_or_giveup: '成功/放弃',
  company_support: '公司级支持需求',
  remark: '备注',
  report_month: '申报月份',
  created_by: '提交人',
  created_at: '创建时间',
  updated_at: '更新时间'
};

// 大项目进展 DB 字段 → 中文标签
const PROJECT_FIELD_LABELS = {
  customer_name: '客户名称',
  report_date: '申报日期',
  unit_nature: '单位性质',
  staff_size: '人员规模',
  financial_status: '资金状况',
  network_coverage: '现有网络覆盖',
  server_room: '服务器及机房',
  is_uf_customer: '是否用友老客户',
  informatization_plan: '信息化规划',
  plan_3_5_years: '3-5年规划',
  project_budget: '项目预算',
  other_intro: '客户其他情况',
  project_start_time: '项目启动时间',
  project_owner: '项目负责人',
  leader_attention: '领导关注',
  planned_online_modules: '计划上线模块',
  is_bidding: '是否招标',
  expandable_modules: '可扩展模块',
  project_value: '项目价值',
  current_progress: '当前进展',
  customer_evaluation: '客户评价',
  our_pros_cons: '我方优劣势',
  current_difficulties: '当前困难',
  pre_support_content: '前期支持内容',
  risk_customer_demand: '风险-客户需求',
  risk_business_relationship: '风险-商务关系',
  risk_competitor: '风险-竞争对手',
  risk_project_online: '风险-项目上线',
  action_plan_business: '行动计划-商务',
  action_plan_product: '行动计划-产品',
  action_plan_solution: '行动计划-方案',
  action_plan_meeting: '行动计划-会议',
  support_time: '支持时间',
  sales_plan: '销售计划',
  next_plan_arrangement: '下步安排',
  filler: '填写人',
  report_month: '申报月份',
  created_by: '提交人',
  created_at: '创建时间',
  updated_at: '更新时间'
};

function fieldLabelOf(type, key) {
  const map = type === 'project' ? PROJECT_FIELD_LABELS : FUNNEL_FIELD_LABELS;
  return map[key] || key;
}

function buildDiff(oldData, newData, type) {
  const diffs = [];
  const keys = new Set([...Object.keys(oldData || {}), ...Object.keys(newData || {})]);
  for (const k of keys) {
    const oldVal = oldData?.[k] ?? '';
    const newVal = newData?.[k] ?? '';
    if (String(oldVal) !== String(newVal)) {
      diffs.push({ field: k, label: fieldLabelOf(type, k), old: oldVal, new: newVal });
    }
  }
  return diffs;
}

function safeParseJSON(str) {
  try { return str ? JSON.parse(str) : {}; } catch { return {}; }
}


async function ensureSchema(pool) {
  const commonCols = `
    id INT AUTO_INCREMENT PRIMARY KEY,
    owner VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT '',
    sales_type VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT '',
    revenue_type VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT '',
    report_date DATE,
    product_type VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT '',
    partner_name VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT '',
    competitor VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT '',
    customer_name VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT '',
    contact VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT '',
    phone VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT '',
    site_count INT DEFAULT 0,
    monthly_repayment DECIMAL(18,2) DEFAULT 0,
    monthly_confidence VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT '',
    estimated_total DECIMAL(18,2) DEFAULT 0,
    progress_percent INT DEFAULT 0,
    sales_status VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT '',
    estimated_repay_month VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT '',
    opportunity_assessment VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT '',
    success_or_giveup VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT '',
    company_support TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
    remark TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
    report_month VARCHAR(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT '',
    created_by VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT '',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_owner (owner),
    INDEX idx_report_month (report_month)
  `;

  const tables = [
    `CREATE TABLE IF NOT EXISTS sales_intention_funnel (${commonCols}) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
    `CREATE TABLE IF NOT EXISTS sales_key_funnel (${commonCols}) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
    `CREATE TABLE IF NOT EXISTS sales_deal_customers (
      id INT AUTO_INCREMENT PRIMARY KEY,
      owner VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT '',
      sales_type VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT '',
      revenue_type VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT '',
      report_date DATE,
      product_type VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT '',
      customer_name VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT '',
      contact VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT '',
      phone VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT '',
      site_count INT DEFAULT 0,
      contract_amount DECIMAL(18,2) DEFAULT 0,
      actual_amount DECIMAL(18,2) DEFAULT 0,
      received_amount DECIMAL(18,2) DEFAULT 0,
      unreceived_amount DECIMAL(18,2) DEFAULT 0,
      remark TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
      report_month VARCHAR(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT '',
      created_by VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT '',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_owner (owner),
      INDEX idx_report_month (report_month)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
    `CREATE TABLE IF NOT EXISTS sales_project_analysis (
      id INT AUTO_INCREMENT PRIMARY KEY,
      customer_name VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT '',
      report_date DATE,
      unit_nature VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT '',
      staff_size VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT '',
      financial_status TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
      network_coverage TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
      server_room TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
      is_uf_customer VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT '',
      informatization_plan TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
      plan_3_5_years TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
      project_budget VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT '',
      other_intro TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
      project_start_time VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT '',
      project_owner VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT '',
      leader_attention VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT '',
      planned_online_modules TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
      is_bidding VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT '',
      expandable_modules TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
      project_value TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
      current_progress TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
      customer_evaluation TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
      our_pros_cons TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
      current_difficulties TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
      pre_support_content TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
      risk_customer_demand TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
      risk_business_relationship TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
      risk_competitor TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
      risk_project_online TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
      action_plan_business TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
      action_plan_product TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
      action_plan_solution TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
      action_plan_meeting TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
      support_time VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT '',
      sales_plan TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
      next_plan_arrangement TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
      filler VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT '',
      report_month VARCHAR(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT '',
      created_by VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT '',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_customer (customer_name),
      INDEX idx_report_month (report_month)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
    `CREATE TABLE IF NOT EXISTS sales_project_key_persons (
      id INT AUTO_INCREMENT PRIMARY KEY,
      analysis_id INT NOT NULL,
      role_type VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT '',
      position VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT '',
      name VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT '',
      phone VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT '',
      office VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT '',
      support_level VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT '',
      influenced_by VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT '',
      can_influence VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT '',
      focus TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
      relationship TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
      personal_hobby TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
      INDEX idx_analysis (analysis_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
    `CREATE TABLE IF NOT EXISTS sales_project_competitors (
      id INT AUTO_INCREMENT PRIMARY KEY,
      analysis_id INT NOT NULL,
      seq INT DEFAULT 1,
      name VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT '',
      recognition VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT '',
      price TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
      relationship TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
      advantage TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
      disadvantage TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
      INDEX idx_analysis (analysis_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
    `CREATE TABLE IF NOT EXISTS sales_project_visit_records (
      id INT AUTO_INCREMENT PRIMARY KEY,
      analysis_id INT NOT NULL,
      seq INT DEFAULT 1,
      visit_time VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT '',
      communication_record TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
      next_strategy TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
      INDEX idx_analysis (analysis_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
    `CREATE TABLE IF NOT EXISTS sales_table_versions (
      id INT AUTO_INCREMENT PRIMARY KEY,
      table_type VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
      record_id INT NOT NULL,
      version INT NOT NULL,
      data_json LONGTEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
      created_by VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT '',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_type_record (table_type, record_id),
      INDEX idx_created_at (created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
  ];

  for (const sql of tables) {
    try {
      await pool.execute(sql);
    } catch (error) {
      console.error('销售四表建表失败:', error.message);
    }
  }
}

function cleanOwner(username) {
  if (!username) return '';
  let name = String(username);
  if (/^emp_/.test(name)) {
    const parts = name.split('_');
    if (parts.length >= 2) name = parts[1];
  }
  return name;
}

function parseDate(v) {
  if (!v && v !== 0) return null;
  if (v instanceof Date) {
    const d = new Date(v);
    if (isNaN(d.getTime())) return null;
    const year = d.getFullYear();
    if (year < 1900 || year > 2100) return null;
    return d.toISOString().slice(0, 10);
  }
  const s = String(v).trim();
  if (!s) return null;
  // 2024-01-01 / 2024/01/01 / Excel serial handled by xlsx
  const m = s.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (m) return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`;
  return null;
}

function parseNum(v) {
  if (v === undefined || v === null || v === '') return 0;
  if (typeof v === 'number') return isNaN(v) ? 0 : v;
  const s = String(v).replace(/,/g, '').trim();
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
}

function getReportMonth(reportDate) {
  const d = parseDate(reportDate);
  if (!d) return '';
  return d.slice(0, 7);
}

// 按进展状态百分比归属到对应表：10-40%意向漏斗 / 41-90%重点漏斗 / 91-100%成交用户
function destTypeByProgress(p) {
  if (p >= 91 && p <= 100) return 'deal';
  if (p >= 41 && p <= 90) return 'key';
  if (p >= 10 && p <= 40) return 'intention';
  return 'intention'; // 0 或无效值默认归意向漏斗
}

// 当前用户销售四表权限（供前端统一判断）
router.get('/sales-four-tables/permission', requireSalesView, async (req, res) => {
  res.json({ success: true, data: req.salesPerm });
});

// 按客户名称跨四表联查（必须在 /:type 之前）
router.get('/sales-four-tables/cross-reference', requireSalesView, async (req, res) => {
  const { pool } = req.app.locals;
  const customer = String(req.query.customer || '').trim();
  if (!customer) return res.status(400).json({ success: false, message: '缺少 customer 参数' });
  try {
    await ensureSchema(pool);
    const ownerFilter = req.salesPerm.isOwnerFilter ? 'AND created_by = ?' : '';
    const ownerParam = req.salesPerm.isOwnerFilter ? [req.salesPerm.username] : [];
    const like = `%${customer}%`;
    const results = {};
    for (const [type, meta] of Object.entries(TABLE_META)) {
      const [rows] = await pool.execute(
        `SELECT id, customer_name, owner, sales_type, product_type, report_date, report_month, created_by, created_at
         FROM ${meta.table} WHERE customer_name LIKE ? ${ownerFilter} ORDER BY updated_at DESC LIMIT 20`,
        [like, ...ownerParam]
      );
      results[type] = rows;
    }
    // 大项目进展
    const [projectRows] = await pool.execute(
      `SELECT id, customer_name, project_owner, unit_nature, project_budget, report_date, report_month, created_by, created_at
       FROM sales_project_analysis WHERE customer_name LIKE ? ${ownerFilter} ORDER BY updated_at DESC LIMIT 20`,
      [like, ...ownerParam]
    );
    results.project = projectRows;
    res.json({ success: true, data: results });
  } catch (error) {
    console.error('客户联查失败:', error);
    res.status(500).json({ success: false, message: '客户联查失败' });
  }
});

// 销售漏斗统计指标（必须在 /:type 之前）
router.get('/sales-four-tables/stats', requireSalesView, async (req, res) => {
  const { pool } = req.app.locals;
  try {
    await ensureSchema(pool);
    const ownerCond = req.salesPerm.isOwnerFilter ? 'WHERE created_by = ?' : '';
    const ownerParam = req.salesPerm.isOwnerFilter ? [req.salesPerm.username] : [];
    const stats = {};
    for (const [type, meta] of Object.entries(TABLE_META)) {
      const [[countRow]] = await pool.execute(`SELECT COUNT(*) AS total FROM ${meta.table} ${ownerCond}`, ownerParam);
      stats[type] = { total: countRow.total };
    }
    // 各表金额汇总
    const buildSum = (table, sums) =>
      `SELECT ${sums.map(s => `COALESCE(SUM(${s.col}),0) AS ${s.alias}`).join(', ')} FROM ${table} ${ownerCond}`;
    const [[intentionMoney]] = await pool.execute(
      buildSum('sales_intention_funnel', [{ col: 'monthly_repayment', alias: 'monthly' }, { col: 'estimated_total', alias: 'estimated' }]),
      ownerParam
    );
    const [[keyMoney]] = await pool.execute(
      buildSum('sales_key_funnel', [{ col: 'monthly_repayment', alias: 'monthly' }, { col: 'estimated_total', alias: 'estimated' }]),
      ownerParam
    );
    const [[dealMoney]] = await pool.execute(
      buildSum('sales_deal_customers', [{ col: 'contract_amount', alias: 'contract' }, { col: 'received_amount', alias: 'received' }, { col: 'unreceived_amount', alias: 'unreceived' }]),
      ownerParam
    );
    const [[projectCount]] = await pool.execute(`SELECT COUNT(*) AS total FROM sales_project_analysis ${ownerCond}`, ownerParam);
    stats.intention = { ...stats.intention, ...intentionMoney };
    stats.key = { ...stats.key, ...keyMoney };
    stats.deal = { ...stats.deal, ...dealMoney };
    stats.project = { total: projectCount.total };
    res.json({ success: true, data: stats });
  } catch (error) {
    console.error('统计失败:', error);
    res.status(500).json({ success: false, message: '统计失败' });
  }
});

// 通用列表查询
router.get('/sales-four-tables/:type', requireSalesView, async (req, res) => {
  const { pool } = req.app.locals;
  const { type } = req.params;
  const meta = TABLE_META[type];
  if (!meta && type !== 'project') return res.status(400).json({ success: false, message: '未知表类型' });
  try {
    await ensureSchema(pool);
    const { month, owner, keyword, page = 1, pageSize = 20 } = req.query;
    const table = meta ? meta.table : 'sales_project_analysis';
    const conditions = [];
    const params = [];
    if (month) { conditions.push('report_month = ?'); params.push(month); }
    if (owner) { conditions.push('owner = ?'); params.push(owner); }
    if (keyword) {
      if (type === 'project') {
        conditions.push('(customer_name LIKE ? OR filler LIKE ?)');
        params.push(`%${keyword}%`, `%${keyword}%`);
      } else {
        conditions.push('(customer_name LIKE ? OR partner_name LIKE ? OR owner LIKE ?)');
        params.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`);
      }
    }
    // 非管理角色仅查看自己
    if (req.salesPerm.isOwnerFilter) {
      conditions.push('created_by = ?');
      params.push(req.salesPerm.username);
    }
    const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';
    const [countRows] = await pool.execute(`SELECT COUNT(*) AS total FROM ${table} ${where}`, params);
    const total = countRows[0].total;
    const pageNum = Math.max(1, parseInt(page));
    const sizeNum = parseInt(pageSize);
    const offset = (pageNum - 1) * sizeNum;
    // MySQL 5.7 在 prepared statement 中对 LIMIT/OFFSET 占位符校验严格，这里直接拼接整数
    const [rows] = await pool.execute(
      `SELECT *, (SELECT COUNT(*) FROM visit_records WHERE customerName = ${table}.customer_name) AS visit_count FROM ${table} ${where} ORDER BY updated_at DESC LIMIT ${sizeNum} OFFSET ${offset}`,
      params
    );
    res.json({ success: true, data: { list: rows, total, page: parseInt(page), pageSize: parseInt(pageSize) } });
  } catch (error) {
    console.error('查询销售四表失败:', error);
    res.status(500).json({ success: false, message: '查询失败' });
  }
});

// 单条详情
router.get('/sales-four-tables/:type/:id', requireSalesView, async (req, res) => {
  const { pool } = req.app.locals;
  const { type, id } = req.params;
  const meta = TABLE_META[type];
  if (!meta && type !== 'project') return res.status(400).json({ success: false, message: '未知表类型' });
  try {
    await ensureSchema(pool);
    const table = meta ? meta.table : 'sales_project_analysis';
    const [rows] = await pool.execute(`SELECT * FROM ${table} WHERE id = ?`, [id]);
    if (rows.length === 0) return res.status(404).json({ success: false, message: '记录不存在' });
    const record = rows[0];
    if (req.salesPerm.isOwnerFilter && record.created_by !== req.salesPerm.username) {
      return res.status(403).json({ success: false, message: '无权限查看' });
    }
    if (type === 'project') {
      const [persons] = await pool.execute('SELECT * FROM sales_project_key_persons WHERE analysis_id = ? ORDER BY id', [id]);
      const [competitors] = await pool.execute('SELECT * FROM sales_project_competitors WHERE analysis_id = ? ORDER BY seq', [id]);
      const [visits] = await pool.execute('SELECT * FROM sales_project_visit_records WHERE analysis_id = ? ORDER BY seq', [id]);
      record.key_persons = persons;
      record.competitors = competitors;
      record.visit_records = visits;
    }
    res.json({ success: true, data: record });
  } catch (error) {
    console.error('查询详情失败:', error);
    res.status(500).json({ success: false, message: '查询失败' });
  }
});

function extractFunnelBody(req, type) {
  const b = req.body;
  return {
    owner: b.owner || cleanOwner(req.user?.username) || '',
    sales_type: b.sales_type || '',
    revenue_type: b.revenue_type || '',
    report_date: parseDate(b.report_date),
    product_type: b.product_type || '',
    partner_name: b.partner_name || '',
    competitor: b.competitor || '',
    customer_name: b.customer_name || '',
    contact: b.contact || '',
    phone: b.phone || '',
    site_count: parseNum(b.site_count),
    monthly_repayment: parseNum(b.monthly_repayment),
    monthly_confidence: b.monthly_confidence || '',
    estimated_total: parseNum(b.estimated_total),
    progress_percent: parseNum(b.progress_percent),
    sales_status: b.sales_status || '',
    estimated_repay_month: b.estimated_repay_month || '',
    opportunity_assessment: b.opportunity_assessment || '',
    success_or_giveup: b.success_or_giveup || '',
    company_support: b.company_support || '',
    remark: b.remark || '',
    report_month: getReportMonth(b.report_date) || b.report_month || '',
  };
}

function extractDealBody(req) {
  const b = req.body;
  return {
    owner: b.owner || cleanOwner(req.user?.username) || '',
    sales_type: b.sales_type || '',
    revenue_type: b.revenue_type || '',
    report_date: parseDate(b.report_date),
    product_type: b.product_type || '',
    customer_name: b.customer_name || '',
    contact: b.contact || '',
    phone: b.phone || '',
    site_count: parseNum(b.site_count),
    contract_amount: parseNum(b.contract_amount),
    actual_amount: parseNum(b.actual_amount),
    received_amount: parseNum(b.received_amount),
    unreceived_amount: parseNum(b.unreceived_amount),
    remark: b.remark || '',
    report_month: getReportMonth(b.report_date) || b.report_month || '',
  };
}

function extractProjectBody(req) {
  const b = req.body;
  return {
    customer_name: b.customer_name || '',
    report_date: parseDate(b.report_date),
    unit_nature: b.unit_nature || '',
    staff_size: b.staff_size || '',
    financial_status: b.financial_status || '',
    network_coverage: b.network_coverage || '',
    server_room: b.server_room || '',
    is_uf_customer: b.is_uf_customer || '',
    informatization_plan: b.informatization_plan || '',
    plan_3_5_years: b.plan_3_5_years || '',
    project_budget: b.project_budget || '',
    other_intro: b.other_intro || '',
    project_start_time: b.project_start_time || '',
    project_owner: b.project_owner || '',
    leader_attention: b.leader_attention || '',
    planned_online_modules: b.planned_online_modules || '',
    is_bidding: b.is_bidding || '',
    expandable_modules: b.expandable_modules || '',
    project_value: b.project_value || '',
    current_progress: b.current_progress || '',
    customer_evaluation: b.customer_evaluation || '',
    our_pros_cons: b.our_pros_cons || '',
    current_difficulties: b.current_difficulties || '',
    pre_support_content: b.pre_support_content || '',
    risk_customer_demand: b.risk_customer_demand || '',
    risk_business_relationship: b.risk_business_relationship || '',
    risk_competitor: b.risk_competitor || '',
    risk_project_online: b.risk_project_online || '',
    action_plan_business: b.action_plan_business || '',
    action_plan_product: b.action_plan_product || '',
    action_plan_solution: b.action_plan_solution || '',
    action_plan_meeting: b.action_plan_meeting || '',
    support_time: b.support_time || '',
    sales_plan: b.sales_plan || '',
    next_plan_arrangement: b.next_plan_arrangement || '',
    filler: b.filler || '',
    report_month: getReportMonth(b.report_date) || b.report_month || '',
  };
}

async function insertVersion(pool, tableType, recordId, data, createdBy) {
  try {
    const [max] = await pool.execute(
      'SELECT COALESCE(MAX(version), 0) AS v FROM sales_table_versions WHERE table_type = ? AND record_id = ?',
      [tableType, recordId]
    );
    const version = (max[0].v || 0) + 1;
    await pool.execute(
      'INSERT INTO sales_table_versions (table_type, record_id, version, data_json, created_by) VALUES (?, ?, ?, ?, ?)',
      [tableType, recordId, version, JSON.stringify(data), createdBy]
    );
  } catch (error) {
    console.error('版本快照失败:', error);
  }
}

// 新增
router.post('/sales-four-tables/:type', requireSalesWriter, async (req, res) => {
  const { pool } = req.app.locals;
  const { type } = req.params;
  const meta = TABLE_META[type];
  if (!meta && type !== 'project') return res.status(400).json({ success: false, message: '未知表类型' });
  try {
    await ensureSchema(pool);
    const createdBy = cleanOwner(req.user?.username);
    let table, body, columns, values, params;
    let destType = type;
    if (type === 'project') {
      table = 'sales_project_analysis';
      body = extractProjectBody(req);
    } else if (type === 'deal') {
      table = meta.table;
      body = extractDealBody(req);
    } else {
      // 意向/重点漏斗：按进展百分比自动归属到对应表（10-40%意向 / 41-90%重点 / 91-100%成交）
      const progress = parseNum(req.body.progress_percent);
      destType = destTypeByProgress(progress);
      if (destType === 'deal') {
        table = 'sales_deal_customers';
        body = extractDealBody(req);
      } else {
        table = TABLE_META[destType].table;
        body = extractFunnelBody(req, destType);
      }
    }
    columns = Object.keys(body);
    values = columns.map(() => '?');
    params = Object.values(body);
    const sql = `INSERT INTO ${table} (${columns.join(', ')}, created_by) VALUES (${values.join(', ')}, ?)`;
    const [result] = await pool.execute(sql, [...params, createdBy]);
    const recordId = result.insertId;
    await insertVersion(pool, destType, recordId, { ...body, created_by: createdBy }, createdBy);

    // 大项目子表
    if (type === 'project') {
      const { key_persons = [], competitors = [], visit_records = [] } = req.body;
      for (const p of key_persons) {
        await pool.execute(
          'INSERT INTO sales_project_key_persons (analysis_id, role_type, position, name, phone, office, support_level, influenced_by, can_influence, focus, relationship, personal_hobby) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [recordId, p.role_type || '', p.position || '', p.name || '', p.phone || '', p.office || '', p.support_level || '', p.influenced_by || '', p.can_influence || '', p.focus || '', p.relationship || '', p.personal_hobby || '']
        );
      }
      let seq = 1;
      for (const c of competitors) {
        await pool.execute(
          'INSERT INTO sales_project_competitors (analysis_id, seq, name, recognition, price, relationship, advantage, disadvantage) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
          [recordId, seq++, c.name || '', c.recognition || '', c.price || '', c.relationship || '', c.advantage || '', c.disadvantage || '']
        );
      }
      seq = 1;
      for (const v of visit_records) {
        await pool.execute(
          'INSERT INTO sales_project_visit_records (analysis_id, seq, visit_time, communication_record, next_strategy) VALUES (?, ?, ?, ?, ?)',
          [recordId, seq++, v.visit_time || '', v.communication_record || '', v.next_strategy || '']
        );
      }
    }

    createOperationLog(pool, { username: getOperator(req), action: 'create', module: 'sales-four-tables', targetId: recordId, targetName: `${type} 数据`, detail: `创建${type}记录` });
    res.json({ success: true, message: '创建成功', data: { id: recordId, destType } });
  } catch (error) {
    console.error('创建销售数据失败:', error);
    res.status(500).json({ success: false, message: '创建失败' });
  }
});

// 更新
router.put('/sales-four-tables/:type/:id', requireSalesWriter, async (req, res) => {
  const { pool } = req.app.locals;
  const { type, id } = req.params;
  const meta = TABLE_META[type];
  if (!meta && type !== 'project') return res.status(400).json({ success: false, message: '未知表类型' });
  try {
    await ensureSchema(pool);
    const createdBy = cleanOwner(req.user?.username);
    let table, body;
    if (type === 'project') {
      table = 'sales_project_analysis';
      body = extractProjectBody(req);
    } else if (type === 'deal') {
      table = meta.table;
      body = extractDealBody(req);
    } else {
      table = meta.table;
      body = extractFunnelBody(req, type);
    }
    const [check] = await pool.execute(`SELECT created_by FROM ${table} WHERE id = ?`, [id]);
    if (check.length === 0) return res.status(404).json({ success: false, message: '记录不存在' });

    // 意向/重点漏斗：按进展百分比重新归属到对应表
    let destType = type;
    let recordId = parseInt(id);
    if ((type === 'intention' || type === 'key') && req.body.progress_percent !== undefined) {
      destType = destTypeByProgress(parseNum(req.body.progress_percent));
    }

    if (destType !== type) {
      // 迁移到目标表
      const destTable = destType === 'deal' ? 'sales_deal_customers' : TABLE_META[destType].table;
      const destBody = destType === 'deal' ? extractDealBody(req) : extractFunnelBody(req, destType);
      const destColumns = Object.keys(destBody);
      const destValues = destColumns.map(() => '?');
      const originalCreator = check[0].created_by || createdBy;
      const insertSql = `INSERT INTO ${destTable} (${destColumns.join(', ')}, created_by) VALUES (${destValues.join(', ')}, ?)`;
      const [insertResult] = await pool.execute(insertSql, [...Object.values(destBody), originalCreator]);
      recordId = insertResult.insertId;

      // 迁移历史版本快照到新记录
      await pool.execute(
        'UPDATE sales_table_versions SET table_type = ?, record_id = ? WHERE table_type = ? AND record_id = ?',
        [destType, recordId, type, id]
      );
      // 追加当前状态版本
      await insertVersion(pool, destType, recordId, { ...destBody, id: recordId, created_by: originalCreator }, createdBy);
      // 删除原表记录
      await pool.execute(`DELETE FROM ${table} WHERE id = ?`, [id]);

      createOperationLog(pool, { username: getOperator(req), action: 'update', module: 'sales-four-tables', targetId: recordId, targetName: `${type} 数据`, detail: `更新${type}记录并迁移到${destType}(原id=${id})` });
      return res.json({ success: true, message: '更新成功', data: { id: recordId, destType } });
    }

    const sets = Object.keys(body).map(k => `${k} = ?`).join(', ');
    const params = [...Object.values(body), id];
    await pool.execute(`UPDATE ${table} SET ${sets} WHERE id = ?`, params);
    await insertVersion(pool, type, id, { ...body, id: parseInt(id), created_by: check[0].created_by }, createdBy);

    if (type === 'project') {
      const { key_persons = [], competitors = [], visit_records = [] } = req.body;
      await pool.execute('DELETE FROM sales_project_key_persons WHERE analysis_id = ?', [id]);
      await pool.execute('DELETE FROM sales_project_competitors WHERE analysis_id = ?', [id]);
      await pool.execute('DELETE FROM sales_project_visit_records WHERE analysis_id = ?', [id]);
      for (const p of key_persons) {
        await pool.execute(
          'INSERT INTO sales_project_key_persons (analysis_id, role_type, position, name, phone, office, support_level, influenced_by, can_influence, focus, relationship, personal_hobby) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [id, p.role_type || '', p.position || '', p.name || '', p.phone || '', p.office || '', p.support_level || '', p.influenced_by || '', p.can_influence || '', p.focus || '', p.relationship || '', p.personal_hobby || '']
        );
      }
      let seq = 1;
      for (const c of competitors) {
        await pool.execute(
          'INSERT INTO sales_project_competitors (analysis_id, seq, name, recognition, price, relationship, advantage, disadvantage) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
          [id, seq++, c.name || '', c.recognition || '', c.price || '', c.relationship || '', c.advantage || '', c.disadvantage || '']
        );
      }
      seq = 1;
      for (const v of visit_records) {
        await pool.execute(
          'INSERT INTO sales_project_visit_records (analysis_id, seq, visit_time, communication_record, next_strategy) VALUES (?, ?, ?, ?, ?)',
          [id, seq++, v.visit_time || '', v.communication_record || '', v.next_strategy || '']
        );
      }
    }

    createOperationLog(pool, { username: getOperator(req), action: 'update', module: 'sales-four-tables', targetId: id, targetName: `${type} 数据`, detail: `更新${type}记录(id=${id})` });
    res.json({ success: true, message: '更新成功' });
  } catch (error) {
    console.error('更新销售数据失败:', error);
    res.status(500).json({ success: false, message: '更新失败' });
  }
});

// 删除
router.delete('/sales-four-tables/:type/:id', requireSalesWriter, async (req, res) => {
  const { pool } = req.app.locals;
  const { type, id } = req.params;
  const meta = TABLE_META[type];
  if (!meta && type !== 'project') return res.status(400).json({ success: false, message: '未知表类型' });
  try {
    await ensureSchema(pool);
    const table = meta ? meta.table : 'sales_project_analysis';
    await pool.execute(`DELETE FROM ${table} WHERE id = ?`, [id]);
    await pool.execute('DELETE FROM sales_table_versions WHERE table_type = ? AND record_id = ?', [type, id]);
    if (type === 'project') {
      await pool.execute('DELETE FROM sales_project_key_persons WHERE analysis_id = ?', [id]);
      await pool.execute('DELETE FROM sales_project_competitors WHERE analysis_id = ?', [id]);
      await pool.execute('DELETE FROM sales_project_visit_records WHERE analysis_id = ?', [id]);
    }
    createOperationLog(pool, { username: getOperator(req), action: 'delete', module: 'sales-four-tables', targetId: id, targetName: `${type} 数据`, detail: `删除${type}记录(id=${id})` });
    res.json({ success: true, message: '删除成功' });
  } catch (error) {
    console.error('删除销售数据失败:', error);
    res.status(500).json({ success: false, message: '删除失败' });
  }
});

// 版本列表
router.get('/sales-four-tables/:type/:id/versions', requireSalesView, async (req, res) => {
  const { pool } = req.app.locals;
  const { type, id } = req.params;
  try {
    await ensureSchema(pool);
    const [rows] = await pool.execute(
      'SELECT id, version, created_by, created_at FROM sales_table_versions WHERE table_type = ? AND record_id = ? ORDER BY version DESC',
      [type, id]
    );
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('获取版本失败:', error);
    res.status(500).json({ success: false, message: '获取版本失败' });
  }
});

// diff 对比：支持 mode=chain（每次提交与上一版链式差异）与显式 oldVersion/newVersion 任意两版对比
router.get('/sales-four-tables/:type/:id/diff', requireSalesView, async (req, res) => {
  const { pool } = req.app.locals;
  const { type, id } = req.params;
  const { oldVersion, newVersion, mode } = req.query;
  try {
    await ensureSchema(pool);
    const [rows] = await pool.execute(
      'SELECT version, data_json, created_by, created_at FROM sales_table_versions WHERE table_type = ? AND record_id = ? ORDER BY version ASC',
      [type, id]
    );
    if (rows.length === 0) return res.json({ success: true, data: [], chain: [] });
    const versionsData = rows.map(r => ({
      version: r.version,
      created_by: r.created_by,
      created_at: r.created_at,
      data: safeParseJSON(r.data_json)
    }));

    // 链式对比：返回每个版本相对上一版的差异（覆盖每一次提交）
    if (mode === 'chain') {
      const chain = [];
      for (let i = 0; i < versionsData.length; i++) {
        const cur = versionsData[i];
        const prev = i > 0 ? versionsData[i - 1] : null;
        const changes = prev ? buildDiff(prev.data, cur.data, type) : [];
        chain.push({
          version: cur.version,
          created_by: cur.created_by,
          created_at: cur.created_at,
          prevVersion: prev ? prev.version : null,
          changedCount: changes.length,
          changes
        });
      }
      return res.json({ success: true, chain });
    }

    // 显式两版对比：oldVersion → 旧值，newVersion → 新值（方向由调用方决定）
    let a, b;
    if (oldVersion != null && newVersion != null) {
      const pick = (v) => versionsData.find(x => x.version === parseInt(v));
      a = pick(oldVersion);
      b = pick(newVersion);
      if (!a || !b) return res.json({ success: true, data: [] });
    } else {
      // 默认：最新两版（次新为旧值，最新为新值）
      if (versionsData.length < 2) return res.json({ success: true, data: [] });
      a = versionsData[versionsData.length - 2];
      b = versionsData[versionsData.length - 1];
    }
    const data = buildDiff(a.data, b.data, type);
    res.json({ success: true, data });
  } catch (error) {
    console.error('diff 失败:', error);
    res.status(500).json({ success: false, message: '对比失败' });
  }
});

// Excel 导入
router.post('/sales-four-tables/:type/import', requireSalesWriter, upload.single('file'), async (req, res) => {
  const { pool } = req.app.locals;
  const { type } = req.params;
  const meta = TABLE_META[type];
  if (!meta) return res.status(400).json({ success: false, message: '该类型暂不支持导入' });
  if (!req.file) return res.status(400).json({ success: false, message: '请上传 Excel 文件' });
  try {
    await ensureSchema(pool);
    const workbook = xlsx.readFile(req.file.path, { cellDates: true });
    const createdBy = cleanOwner(req.user?.username);
    let imported = 0;
    let skipped = 0;
    const errors = [];

    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName];
      const raw = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: '' });
      // 查找表头行
      let headerIdx = -1;
      for (let i = 0; i < Math.min(10, raw.length); i++) {
        const row = raw[i].map(c => String(c).trim());
        if (meta.headers.every(h => row.includes(h))) { headerIdx = i; break; }
      }
      if (headerIdx === -1) continue;
      const headers = raw[headerIdx].map(c => String(c).trim());
      const dataRows = raw.slice(headerIdx + 1).filter(r => r.some(c => String(c).trim() !== ''));
      for (const row of dataRows) {
        const obj = {};
        headers.forEach((h, i) => { obj[h] = row[i]; });
        const reportDate = parseDate(obj['申报日期']);
        const reportMonth = reportDate ? reportDate.slice(0, 7) : '';
        if (!reportDate) { skipped++; continue; }
        try {
          let sql, params;
          if (type === 'deal') {
            sql = `INSERT INTO ${meta.table}
              (owner, sales_type, revenue_type, report_date, product_type, customer_name, contact, phone, site_count, contract_amount, actual_amount, received_amount, unreceived_amount, remark, report_month, created_by)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
            params = [
              obj['owner'] || createdBy, obj['销售类型'] || '', obj['收入类型'] || '', reportDate, obj['产品类型'] || '',
              obj['客户名单'] || '', obj['联系人'] || '', obj['电话'] || '', parseNum(obj['站点数']),
              parseNum(obj['合同额']), parseNum(obj['实际金额']), parseNum(obj['回款金额']), parseNum(obj['未回款金额']),
              obj['备注'] || '', reportMonth, createdBy
            ];
          } else {
            sql = `INSERT INTO ${meta.table}
              (owner, sales_type, revenue_type, report_date, product_type, partner_name, competitor, customer_name, contact, phone, site_count, monthly_repayment, monthly_confidence, estimated_total, progress_percent, sales_status, estimated_repay_month, opportunity_assessment, success_or_giveup, company_support, remark, report_month, created_by)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
            params = [
              obj['owner'] || createdBy, obj['销售类型'] || '', obj['收入类型'] || '', reportDate, obj['产品类型'] || '',
              obj['合作伙伴名称'] || '', obj['主要竞争对手'] || '', obj['客户名单'] || '', obj['联系人'] || '', obj['电话'] || '',
              parseNum(obj['站点数']), parseNum(obj['本月回款金额']), obj['本月回款把握度'] || '', parseNum(obj['预计总回款额']),
              parseNum(obj['进展状态百分比']), obj['销售状态'] || '', obj['预计回款月份'] || '', obj['主观机会度判断'] || '',
              obj['成功/放弃'] || '', obj['公司级支持需求'] || '', obj['备注'] || '', reportMonth, createdBy
            ];
          }
          const [result] = await pool.execute(sql, params);
          await insertVersion(pool, type, result.insertId, { ...obj, created_by: createdBy }, createdBy);
          imported++;
        } catch (e) {
          skipped++;
          errors.push(String(e.message));
        }
      }
    }
    fs.unlink(req.file.path, () => {});
    createOperationLog(pool, { username: getOperator(req), action: 'import', module: 'sales-four-tables', targetName: `${type} Excel导入`, detail: `导入${type}，成功${imported}条，跳过${skipped}条` });
    res.json({ success: true, message: `导入完成：成功 ${imported} 条，跳过 ${skipped} 条`, data: { imported, skipped, errors: errors.slice(0, 10) } });
  } catch (error) {
    console.error('导入失败:', error);
    res.status(500).json({ success: false, message: '导入失败' });
  }
});

export { ensureSchema };
export default router;
