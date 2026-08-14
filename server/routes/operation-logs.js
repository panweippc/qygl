import express from 'express';
import { requireRole } from '../middleware/auth.js';
const router = express.Router();

function escapeId(val) {
  return Number(val);
}

// 模块中文映射（用于筛选下拉显示）
const MODULE_LABELS = {
  auth: '登录认证',
  employee: '员工管理',
  attendance: '考勤管理',
  business_trip: '出差申请',
  reimbursement: '报销申请',
  entertainment: '业务招待',
  meeting: '会议管理',
  distribute: '任务下发',
  sales: '销售管理',
  deal: '成交管理',
  project: '项目管理',
  visit: '拜访管理',
  weekly_report: '周报',
  monthly_report: '月报',
  file: '文件管理',
  notification: '消息通知',
  tool: '工具管理',
  system: '系统管理',
  oa_approval: 'OA审批',
  chat: '聊天室',
  customer: '客户管理',
  office_supplies: '办公用品',
  knowledge: '知识库',
  region: '区域管理'
};

// 动作中文映射（用于筛选下拉显示）
const ACTION_LABELS = {
  create: '创建',
  update: '更新',
  delete: '删除',
  login: '登录',
  login_fail: '登录失败',
  login_new_ip: '新IP登录',
  logout: '退出',
  submit: '提交',
  approve: '审批通过',
  reject: '驳回',
  forward: '转发',
  withdraw: '撤回',
  backup_create: '创建备份',
  backup_delete: '删除备份',
  backup_restore: '恢复备份',
  restore: '恢复',
  assign: '分配权限',
  change_password: '修改密码'
};

// 获取操作日志（分页 + 筛选）——仅管理员/总经理可查看审计日志
router.get('/operation-logs', requireRole('系统管理员', '总经理'), async (req, res) => {
  const { pool } = req.app.locals;
  const { page = 1, pageSize = 30, module: mod, action, userId: uid, startDate, endDate } = req.query;
  try {
    const conditions = [];
    const params = [];
    if (mod) { conditions.push('module = ?'); params.push(mod); }
    if (action) { conditions.push('action = ?'); params.push(action); }
    if (uid) { conditions.push('userId = ?'); params.push(uid); }
    if (startDate) { conditions.push('createdAt >= ?'); params.push(startDate); }
    if (endDate) { conditions.push('createdAt <= ?'); params.push(endDate); }
    const where = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';
    const offset = escapeId((parseInt(page) - 1) * parseInt(pageSize));
    const limit = escapeId(parseInt(pageSize));

    const [list] = await pool.query(
      `SELECT * FROM operation_logs ${where} ORDER BY createdAt DESC LIMIT ${limit} OFFSET ${offset}`,
      params
    );
    const [[{ total }]] = await pool.query(
      `SELECT COUNT(*) as total FROM operation_logs ${where}`,
      params
    );
    // 解析变更前后值（存储为 JSON 字符串，解析为对象返回给前端展示）
    const listParsed = list.map(r => {
      let before = null, after = null;
      try { before = r.beforeValue ? JSON.parse(r.beforeValue) : null; } catch (e) { before = r.beforeValue || null; }
      try { after = r.afterValue ? JSON.parse(r.afterValue) : null; } catch (e) { after = r.afterValue || null; }
      return { ...r, beforeValue: before, afterValue: after };
    });
    res.success({ list: listParsed, total, page: parseInt(page), pageSize: limit });
  } catch (error) {
    console.error('获取操作日志失败:', error);
    res.fail('获取操作日志失败');
  }
});

// 获取操作日志模块列表（用于筛选下拉，显示中文）
router.get('/operation-logs/modules', requireRole('系统管理员', '总经理'), async (req, res) => {
  const { pool } = req.app.locals;
  try {
    const [rows] = await pool.query('SELECT DISTINCT module FROM operation_logs ORDER BY module');
    res.success(rows.map(r => ({ value: r.module, label: MODULE_LABELS[r.module] || r.module })));
  } catch (error) {
    console.error('获取模块列表失败:', error);
    res.fail('获取模块列表失败');
  }
});

// 获取操作日志操作类型列表（用于筛选下拉，显示中文）
router.get('/operation-logs/actions', requireRole('系统管理员', '总经理'), async (req, res) => {
  const { pool } = req.app.locals;
  try {
    const [rows] = await pool.query('SELECT DISTINCT action FROM operation_logs ORDER BY action');
    res.success(rows.map(r => ({ value: r.action, label: ACTION_LABELS[r.action] || r.action })));
  } catch (error) {
    console.error('获取操作类型列表失败:', error);
    res.fail('获取操作类型列表失败');
  }
});

export default router;
