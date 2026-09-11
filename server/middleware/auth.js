// 解析当前登录用户的真实姓名与角色名
// 角色一律以数据库为准，不信任 token 内的角色声明（与 requireRole 保持同一安全口径）
async function resolveIdentity(pool, req) {
  let username = req.user?.username || req.user?.name || null;
  if (username && /^emp_/.test(username)) {
    const parts = String(username).split('_');
    if (parts.length >= 2) username = parts[1];
  }
  if (!username) return null;
  const [employees] = await pool.execute(
    'SELECT r.name as roleName FROM employees e LEFT JOIN roles r ON e.roleId = r.id WHERE e.name = ?',
    [username]
  );
  if (employees.length > 0) {
    return { username, roleName: employees[0].roleName || '', isBuiltinAdmin: false };
  }
  const [users] = await pool.execute('SELECT id FROM users WHERE username = ?', [username]);
  if (users.length === 0) return null;
  return {
    username,
    roleName: '',
    isBuiltinAdmin: username === '管理员' || username === '总经理' || /^admin$/i.test(username)
  };
}

/**
 * 「创建人本人 或 指定角色」校验。
 * @param {(pool: any, req: any) => Promise<string|null>} getOwnerName 返回记录创建人姓名的查询函数
 * @param {...string} allowedRoles 额外放行的角色名（如管理员/总经理白名单）
 */
export const requireOwnerOrRole = (getOwnerName, ...allowedRoles) => {
  return async (req, res, next) => {
    try {
      const { pool } = req.app.locals;
      const identity = await resolveIdentity(pool, req);
      if (!identity) {
        return res.status(401).json({ success: false, message: '未登录' });
      }
      if (identity.isBuiltinAdmin || allowedRoles.includes(identity.roleName)) {
        return next();
      }
      let owner = null;
      try {
        owner = await getOwnerName(pool, req);
      } catch (e) {
        owner = null;
      }
      const cleanOwner = String(owner || '').replace(/^emp_/, '').replace(/_\d+$/, '');
      if (cleanOwner && cleanOwner === identity.username) {
        return next();
      }
      return res.status(403).json({ success: false, message: '仅创建人本人或管理员可执行此操作' });
    } catch (error) {
      console.error('创建人/管理员权限校验失败:', error);
      res.status(500).json({ success: false, message: '权限验证失败' });
    }
  };
};

export const requireRole = (...allowedRoles) => {
  return async (req, res, next) => {
    try {
      const { pool } = req.app.locals;
      // 优先从 JWT（requireAuth 注入的 req.user）获取身份，禁止信任请求体中的身份标识
      let username = req.user?.username || null;
      // 处理 emp_姓名_id 格式，提取真实姓名
      if (username && /^emp_/.test(username)) {
        const parts = String(username).split('_');
        if (parts.length >= 2) username = parts[1];
      }
      if (!username) {
        return res.status(401).json({ success: false, message: '未登录' });
      }
      const [employees] = await pool.execute(
        'SELECT e.roleId, e.position, r.name as roleName FROM employees e LEFT JOIN roles r ON e.roleId = r.id WHERE e.name = ?',
        [username]
      );
      if (employees.length === 0) {
        const [users] = await pool.execute('SELECT id FROM users WHERE username = ?', [username]);
        if (users.length === 0) {
          return res.status(403).json({ success: false, message: '无权限' });
        }
        // users 表用户：若请求管理接口，仅"管理员"/"总经理"这类系统管理角色放行；否则按 allowedRoles 判定
        if (allowedRoles.length === 0) return next();
        // 系统内置管理账号（"管理员"、"总经理"、admin 等）默认拥有管理权限
        if (username === '管理员' || username === '总经理' || /^admin$/i.test(username)) return next();
        return res.status(403).json({ success: false, message: '无权限' });
      }
      const roleName = employees[0].roleName || '';
      const position = String(employees[0].position || '');
      // 兼容：职位为总经理，或 isTopManager 标记，视为管理员
      const isTopManager = /总经理/.test(position) || employees[0].isTopManager || employees[0].isTopMgr;
      if (allowedRoles.length === 0 || allowedRoles.includes(roleName) || isTopManager) {
        return next();
      }
      res.status(403).json({ success: false, message: '无权限' });
    } catch (error) {
      console.error('权限验证失败:', error);
      res.status(500).json({ success: false, message: '权限验证失败' });
    }
  };
};
