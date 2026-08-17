import { verifyPassword } from '../utils/security.js';

// 高危操作二次验证中间件
// 用途：校验当前登录用户的密码，防止会话被劫持后的恶意操作（权限篡改、角色/菜单删除、用户删除、密码重置等）
// 依赖：必须在 requireAuth 之后使用（req.user 携带登录身份）
// 前端调用此类接口时需在请求体中额外携带 adminPassword = 当前登录用户的密码
export default async function verifyAdminPassword(req, res, next) {
  const { adminPassword } = req.body || {};
  if (!adminPassword) {
    return res.status(400).json({ success: false, message: '请提供当前登录密码进行二次验证' });
  }
  try {
    const { pool } = req.app.locals;
    const username = req.user?.name || req.user?.username;
    if (!username) {
      return res.status(403).json({ success: false, message: '无法识别当前登录用户' });
    }
    const [users] = await pool.execute('SELECT password FROM users WHERE username = ?', [username]);
    if (users.length === 0) {
      return res.status(403).json({ success: false, message: '无法验证当前登录用户' });
    }
    if (!verifyPassword(String(adminPassword), users[0].password)) {
      return res.status(403).json({ success: false, message: '当前登录密码错误，操作已拒绝' });
    }
    next();
  } catch (error) {
    console.error('二次验证失败:', error);
    res.status(500).json({ success: false, message: '二次验证失败' });
  }
}
