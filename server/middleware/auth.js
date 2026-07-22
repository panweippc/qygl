export const requireRole = (...allowedRoles) => {
  return async (req, res, next) => {
    try {
      const { pool } = req.app.locals;
      const username = req.body.operator || req.body.username || req.query.username || null;
      if (!username) {
        return res.status(401).json({ success: false, message: '未登录' });
      }
      const [employees] = await pool.execute(
        'SELECT e.roleId, r.name as roleName FROM employees e LEFT JOIN roles r ON e.roleId = r.id WHERE e.name = ?',
        [username]
      );
      if (employees.length === 0) {
        const [users] = await pool.execute('SELECT id FROM users WHERE username = ?', [username]);
        if (users.length === 0) {
          return res.status(403).json({ success: false, message: '无权限' });
        }
        return next();
      }
      const roleName = employees[0].roleName || '';
      if (allowedRoles.length === 0 || allowedRoles.includes(roleName)) {
        return next();
      }
      res.status(403).json({ success: false, message: '无权限' });
    } catch (error) {
      console.error('权限验证失败:', error);
      res.status(500).json({ success: false, message: '权限验证失败' });
    }
  };
};
