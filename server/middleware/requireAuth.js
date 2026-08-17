import { verifyToken, pwdFingerprint } from '../utils/security.js';

const PUBLIC_PATHS = [
  { method: 'POST', path: '/login' },
  { method: 'GET', path: '/health' }
];

const isPublic = (method, path) => PUBLIC_PATHS.some(p => p.method === method && p.path === path);

export const requireAuth = async (req, res, next) => {
  if (req.method === 'OPTIONS') return next();
  if (isPublic(req.method, req.path)) return next();

  const headerToken = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  const queryToken = req.query.token || '';
  const token = headerToken || queryToken;

  if (!token) {
    return res.status(401).json({ success: false, message: '未登录' });
  }

  try {
    const decoded = verifyToken(token);
    // 统一提取真实姓名到 req.user.name，供业务逻辑使用（处理 emp_姓名_id 格式）
    let realName = decoded.username || '';
    if (realName && /^emp_/.test(realName)) {
      const parts = String(realName).split('_');
      if (parts.length >= 2) realName = parts[1];
    }
    // 密码指纹校验：改密后旧 token 的 pwd 与当前密码指纹不一致，判定为过期，强制重新登录
    if (decoded.pwd) {
      try {
        const { pool } = req.app.locals;
        const [users] = await pool.execute('SELECT password, tokenVersion FROM users WHERE username = ?', [realName]);
        if (users.length > 0 && pwdFingerprint(users[0].password) !== decoded.pwd) {
          return res.status(401).json({ success: false, message: '密码已修改，请重新登录' });
        }
        // 会话版本校验：管理员踢人（tokenVersion+1）后，旧 token 立即失效
        // 兼容旧 token（无 ver 字段）及旧数据库（无 tokenVersion 列）
        if (users.length > 0 && decoded.ver !== undefined && typeof users[0].tokenVersion === 'number') {
          if (users[0].tokenVersion !== decoded.ver) {
            return res.status(401).json({ success: false, message: '账号已在其他设备登录，请重新登录' });
          }
        }
      } catch (dbErr) {
        console.error('密码指纹/会话版本校验失败:', dbErr.message);
      }
    }
    req.user = { ...decoded, name: realName };
    next();
  } catch (e) {
    return res.status(401).json({ success: false, message: '登录已过期，请重新登录' });
  }
};

export default requireAuth;
