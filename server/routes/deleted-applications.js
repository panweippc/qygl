/**
 * 已删除（软删除）OA 申请统一查询
 * 用于审批中心「已删除」统计卡片：管理员可见全部，普通用户仅可见本人申请
 */
import express from 'express';
const router = express.Router();

import { getRealName } from '../utils/identity.js';

// 各 OA 申请表：表名 / 类型标识 / 申请人字段（会议用 organizer，出差与项目用 applicant_name）
const DEFS = [
  { table: 'meetings', type: 'meeting', applicantCol: 'organizer' },
  { table: 'leave_applications', type: 'leave', applicantCol: 'applicant' },
  { table: 'reimbursements', type: 'reimbursement', applicantCol: 'applicant' },
  { table: 'office_supplies_applications', type: 'project', applicantCol: 'applicant' },
  { table: 'business_trip_applications', type: 'businessTrip', applicantCol: 'applicant_name' },
  { table: 'entertainment_expenses', type: 'entertainment', applicantCol: 'applicant' },
  { table: 'project_applications', type: 'project', applicantCol: 'applicant_name' }
];

// 管理角色判断（与业务路由保持一致）
const isManagerUser = async (req) => {
  try {
    const { pool } = req.app.locals;
    const name = getRealName(req);
    if (!name) return false;
    if (name === '管理员' || name === '总经理' || /^admin$/i.test(name)) return true;
    const [emp] = await pool.execute(
      'SELECT e.position, r.name AS roleName FROM employees e LEFT JOIN roles r ON e.roleId = r.id WHERE e.name = ?',
      [name]
    );
    if (emp.length === 0) return false;
    const roleName = emp[0].roleName || '';
    const position = String(emp[0].position || '');
    if (['系统管理员', '总经理', '业务中心经理', '技术部经理'].includes(roleName) || /总经理/.test(position)) return true;
    return false;
  } catch (e) { return false; }
};

router.get('/deleted-applications', async (req, res) => {
  const { pool } = req.app.locals;
  try {
    const operator = getRealName(req);
    if (!operator) return res.status(401).json({ success: false, message: '未登录' });
    const isManager = await isManagerUser(req);

    const result = [];
    for (const d of DEFS) {
      try {
        let sql = `SELECT * FROM ${d.table} WHERE is_deleted = 1`;
        const params = [];
        if (!isManager) {
          sql += ` AND ${d.applicantCol} = ?`;
          params.push(operator);
        }
        sql += ' ORDER BY id DESC';
        const [rows] = await pool.query(sql, params);
        rows.forEach((r) => {
          result.push({
            ...r,
            _type: d.type,
            applicant: r[d.applicantCol],
            createdAt: r.createdAt || r.created_at
          });
        });
      } catch (e) {
        // 单表结构差异不影响其余表
        console.error(`查询${d.table}软删除记录失败:`, e.message);
      }
    }

    res.json({ success: true, data: result });
  } catch (error) {
    console.error('获取已删除申请失败:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
