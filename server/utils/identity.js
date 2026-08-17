/**
 * 身份工具：统一从 JWT token（req.user）解析当前登录用户身份。
 * 安全原则：绝不信任请求体（req.body）中的 applicant/approver/operator 等身份字段，
 * 防止伪造他人身份进行审批、提交、删除等操作。
 */
import { hashPassword } from './security.js';

// 从 req.user 获取真实姓名（处理 emp_姓名_id 前缀，如 emp_张三_1 -> 张三）
export function getRealName(req) {
  let username = req.user?.name || req.user?.username || '';
  if (username && /^emp_/.test(username)) {
    const parts = String(username).split('_');
    if (parts.length >= 2) username = parts[1];
  }
  return username || '';
}

// 从 req.user 获取用户 ID（JWT 中的 id，对应 users/employees 表主键）
export function getRealUserId(req) {
  return req.user?.id ?? null;
}

// 角色权限等级（数值越大权限越高）
// 用于"删除/禁用账号"等管理操作的保护：不能删除/禁用比自己权限高的用户
export const ROLE_LEVEL = {
  '系统管理员': 100,
  '总经理': 90,
  '财务总监': 80,
  '业务中心经理': 75,
  '技术部经理': 75,
  '销售部经理': 75,
  '人事经理': 70,
  '行政经理': 70,
  '部门经理': 65,
  '普通员工': 10,
};

// 根据员工姓名查询其权限等级（通过角色名 + 职位判断）
// 返回 { level, roleName, position, isSystemAdmin }
export async function getUserPrivilege(pool, name) {
  const clean = String(name || '').replace(/^emp_/, '').replace(/_\d+$/, '');
  if (!clean) return { level: 0, roleName: '', position: '', isSystemAdmin: false };
  const [emp] = await pool.execute(
    'SELECT e.position, r.name AS roleName FROM employees e LEFT JOIN roles r ON e.roleId = r.id WHERE e.name = ?',
    [clean]
  );
  if (emp.length === 0) {
    // users 表内置账号
    if (clean === '管理员' || /^admin$/i.test(clean)) {
      return { level: 100, roleName: '系统管理员', position: '管理员', isSystemAdmin: true };
    }
    if (clean === '总经理') {
      return { level: 90, roleName: '总经理', position: '总经理', isSystemAdmin: false };
    }
    return { level: 0, roleName: '', position: '', isSystemAdmin: false };
  }
  const roleName = emp[0].roleName || '';
  const position = String(emp[0].position || '');
  // 职位含"总经理"视为总经理
  if (/总经理/.test(position)) {
    return { level: 90, roleName, position, isSystemAdmin: false };
  }
  const level = ROLE_LEVEL[roleName] ?? (ROLE_LEVEL[position] ?? 10);
  return {
    level,
    roleName,
    position,
    isSystemAdmin: roleName === '系统管理员' || clean === '管理员' || /^admin$/i.test(clean),
  };
}

/**
 * 校验"操作者"是否可以管理（删除/禁用）"目标用户"。
 * 规则：
 *   1. 目标为系统管理员 → 禁止（保护最高权限账号）
 *   2. 目标为操作者自己 → 禁止（防止误删自己）
 *   3. 目标权限等级 > 操作者权限等级 → 禁止（不能删比自己权限高的）
 * @returns {{ok: boolean, message: string}}
 */
export async function checkManagePermission(pool, operatorName, targetName) {
  const operator = await getUserPrivilege(pool, operatorName);
  const target = await getUserPrivilege(pool, targetName);

  // 1. 不能操作系统管理员
  if (target.isSystemAdmin) {
    return { ok: false, message: '系统管理员账号受保护，不允许删除或禁用' };
  }
  // 2. 不能操作自己
  const opClean = String(operatorName || '').replace(/^emp_/, '').replace(/_\d+$/, '');
  const tgClean = String(targetName || '').replace(/^emp_/, '').replace(/_\d+$/, '');
  if (opClean === tgClean) {
    return { ok: false, message: '不能删除或禁用当前登录账号自身' };
  }
  // 3. 不能操作权限比自己高的用户
  if (target.level > operator.level) {
    return { ok: false, message: `无权操作权限更高的用户「${tgClean}」（${target.roleName || '未知角色'}）` };
  }
  return { ok: true, message: '' };
}

/**
 * 校验请求体的 adminPassword 是否为当前登录用户的密码（高危操作二次验证）
 * @param {object} req express 请求对象（需含 req.app.locals.pool、req.user）
 * @param {object} [res] 可选，若提供则在校验失败时直接响应；否则返回 {ok, message}
 * @returns {Promise<boolean>} 校验是否通过
 */
export async function verifyCurrentPassword(req) {
  const { pool } = req.app.locals;
  const username = getRealName(req);
  if (!username) return false;
  const [users] = await pool.execute('SELECT password FROM users WHERE username = ?', [username]);
  if (users.length === 0) return false;
  const { verifyPassword } = await import('./security.js');
  return verifyPassword(String(req.body?.adminPassword || ''), users[0].password);
}

// 兼容旧引用（部分文件 import 自 security.js 的 hashPassword）
export { hashPassword };
