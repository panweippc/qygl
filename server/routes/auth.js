import express from 'express';
import rateLimit from 'express-rate-limit';
const router = express.Router();

import { createOperationLog } from '../utils/audit.js';
import { signToken, isHashed, hashPassword, verifyPassword } from '../utils/security.js';
import { writeSecurityAlert, notifyAdmins } from '../utils/security-alert.js';

// 登录接口 IP 级限流（防同一 IP 爆破不同账号）
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,   // 15分钟窗口
  max: 30,                     // 每 IP 最多30次尝试
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // 成功登录不计入限流
  message: { success: false, message: '登录尝试过于频繁，请稍后再试' }
});

// 登录失败锁定（内存记录，重启后重置）
const FAILED_LIMIT = 5;
const LOCK_MINUTES = 15;
const loginFailures = new Map();

const failKey = (username, ip) => `${String(username || '').toLowerCase()}|${ip || ''}`;

const isLocked = (username, ip) => {
  const rec = loginFailures.get(failKey(username, ip));
  if (!rec) return false;
  if (rec.lockedUntil && Date.now() < rec.lockedUntil) return true;
  if (rec.lockedUntil && Date.now() >= rec.lockedUntil) loginFailures.delete(failKey(username, ip));
  return false;
};

const recordFailure = (username, ip) => {
  const key = failKey(username, ip);
  const rec = loginFailures.get(key) || { count: 0 };
  rec.count += 1;
  if (rec.count >= FAILED_LIMIT && !rec.lockedUntil) {
    rec.lockedUntil = Date.now() + LOCK_MINUTES * 60 * 1000;
    // 达到锁定阈值：写入独立安全告警日志（暴力破解/异常登录检测）
    writeSecurityAlert({
      level: 'HIGH',
      type: 'login_brute_force',
      username,
      ip,
      detail: `账号 ${username || '未知'} 连续 ${FAILED_LIMIT} 次登录失败，已被锁定 ${LOCK_MINUTES} 分钟（来源IP: ${ip}）`
    });
  }
  loginFailures.set(key, rec);
};

const clearFailures = (username, ip) => {
  loginFailures.delete(failKey(username, ip));
};

// 校验密码（兼容存量明文密码，成功后自动升级为 bcrypt 哈希）
const matchUser = (users, password) => {
  if (!Array.isArray(users)) return null;
  for (const u of users) {
    if (verifyPassword(password, u.password)) return u;
  }
  return null;
};

router.post('/login', loginLimiter, async (req, res) => {
  let { username, password } = req.body;
  const { pool, userSessions } = req.app.locals;
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '';
  try {
    if (!username || !password) {
      return res.json({ success: false, message: '请输入用户名和密码' });
    }
    username = String(username).trim();

    if (isLocked(username, ip)) {
      return res.status(429).json({ success: false, message: `登录失败次数过多，请${LOCK_MINUTES}分钟后再试` });
    }

    let user = null;

    // 1. 用户名精确匹配
    try {
      const [users] = await pool.execute('SELECT * FROM users WHERE username = ?', [username]);
      user = matchUser(users, password);
    } catch (error) {
      console.log('直接查询失败:', error.message);
    }

    // 2. 用户名模糊匹配（保留历史业务习惯）
    if (!user) {
      try {
        const [users] = await pool.execute('SELECT * FROM users WHERE username LIKE ?', [`%${username}%`]);
        user = matchUser(users, password);
      } catch (error) {
        console.log('LIKE查询失败:', error.message);
      }
    }

    // 3. 通过员工姓名登录
    if (!user) {
      try {
        const [employees] = await pool.execute('SELECT * FROM employees WHERE name = ?', [username]);
        if (employees.length > 0) {
          const [users] = await pool.execute('SELECT * FROM users WHERE username = ?', [username]);
          user = matchUser(users, password);
          if (!user) {
            const [empUsers] = await pool.execute('SELECT * FROM users WHERE username LIKE ?', [`emp_${username}%`]);
            user = matchUser(empUsers, password);
          }
        }
      } catch (error) {
        console.log('员工查询失败:', error.message);
      }
    }

    if (!user) {
      recordFailure(username, ip);
      // A2: 记录登录失败审计日志（含尝试的账号名和IP，便于发现暴力破解）
      try {
        await createOperationLog(pool, {
          userId: null,
          username: username || '未知',
          action: 'login_fail',
          module: 'auth',
          targetId: null,
          targetName: username || '',
          detail: `登录失败（账号或密码错误），来源IP: ${ip}`,
          ipAddress: ip
        });
      } catch (logErr) {
        console.log('记录登录失败日志失败:', logErr.message);
      }
      return res.json({ success: false, message: '用户名或密码错误' });
    }

    clearFailures(username, ip);

    // 账号生命周期管理：检查账号是否被停用（长期未登录自动停用等）
    // users.status: 1=正常, 0=停用
    try {
      const [urows] = await pool.execute('SELECT status FROM users WHERE id = ?', [user.id]);
      if (urows.length > 0 && Number(urows[0].status) === 0) {
        // 记录被拒登录（可选）
        writeSecurityAlert({ level: 'WARN', type: 'account_disabled', username, ip, detail: `停用账号尝试登录被拒绝: ${username}` });
        return res.status(403).json({ success: false, message: '账号已被停用，请联系管理员' });
      }
    } catch (e) {
      console.log('账号状态检查失败:', e.message);
    }

    // 存量明文密码自动升级为 bcrypt 哈希
    if (!isHashed(user.password)) {
      try {
        const hashed = hashPassword(password);
        await pool.execute('UPDATE users SET password = ? WHERE id = ?', [hashed, user.id]);
        user.password = hashed;
      } catch (error) {
        console.log('密码升级失败:', error.message);
      }
    }

    const io = req.app.get('io');
    if (userSessions.has(user.username)) {
      const oldSocketId = userSessions.get(user.username);
      if (oldSocketId) {
        io.to(oldSocketId).emit('kickedOut', { message: '您的账号在其他设备登录，已被强制退出' });
      }
    }
    userSessions.set(user.username, null);

    let permissions = [];
    let department = '';
    let position = '';
    let roleName = '';
    let avatar = '';
    let employee = null;
    let employeeName = user.username || '';
    if (employeeName.startsWith('emp_')) {
      const parts = employeeName.split('_');
      if (parts.length >= 2) {
        employeeName = parts[1];
      }
    }
    try {
      const [employees] = await pool.execute(
        'SELECT e.*, r.name AS roleName FROM employees e LEFT JOIN roles r ON e.roleId = r.id WHERE e.name = ?',
        [employeeName]
      );

      if (employees.length > 0) {
        employee = employees[0];
        department = employee.department;
        position = employee.position;
        roleName = employee.roleName || '';
        avatar = employee.avatar || '';

        if (employee.roleId) {
          const [rolePerms] = await pool.execute(
            `SELECT m.id, m.name, m.path, m.component, m.icon
             FROM role_permissions rp
             JOIN menus m ON rp.menuId = m.id
             WHERE rp.roleId = ?`,
            [employee.roleId]
          );
          if (rolePerms.length > 0) {
            permissions = rolePerms;
          }
        }

        if (permissions.length === 0) {
          let fallbackRoleName = '';
          if (employee.department === '管理部门' && employee.position === '总经理') {
            fallbackRoleName = '总经理';
          } else if (employee.department === '技术部') {
            fallbackRoleName = '技术部员工';
          } else if (employee.department === '销售部') {
            fallbackRoleName = '销售';
          } else if (employee.department === '财务部') {
            fallbackRoleName = employee.position === '财务总监' ? '财务总监' : '财务';
          } else if (employee.department === '人力资源部') {
            fallbackRoleName = '人事经理';
          }

          if (fallbackRoleName) {
            const [roles] = await pool.execute('SELECT * FROM roles WHERE name = ?', [fallbackRoleName]);
            if (roles.length > 0) {
              const [rolePerms] = await pool.execute(
                `SELECT m.id, m.name, m.path, m.component, m.icon
                 FROM role_permissions rp
                 JOIN menus m ON rp.menuId = m.id
                 WHERE rp.roleId = ?`,
                [roles[0].id]
              );
              if (rolePerms.length > 0) {
                permissions = rolePerms;
              }
            }
          }
        }
      }
    } catch (permError) {
      console.error('获取用户权限失败:', permError.message);
    }

    // 更新最后登录时间与 IP（账号生命周期管理基础数据）
    try {
      await pool.execute(
        'UPDATE users SET lastLoginAt = NOW(), lastLoginIp = ? WHERE id = ?',
        [ip, user.id]
      );
    } catch (e) {
      console.log('更新最后登录信息失败:', e.message);
    }

    await createOperationLog(pool, {
      userId: String(user.id),
      username: user.username,
      action: 'login',
      module: 'auth',
      detail: '用户登录系统',
      ipAddress: ip
    });

    // E7: 登录 IP 异常检测——若当前 IP 不在该用户历史登录 IP 中，标记为"新设备/新IP登录"
    let isNewIpLogin = false;
    try {
      const [histIpRows] = await pool.execute(
        "SELECT DISTINCT ipAddress FROM operation_logs WHERE username = ? AND action = 'login' AND ipAddress IS NOT NULL AND ipAddress != '' AND ipAddress != ? ORDER BY id DESC LIMIT 20",
        [user.username, ip]
      );
      // 若无历史登录记录或当前 IP 不在历史 IP 中，视为新 IP 登录
      if (histIpRows.length === 0) {
        isNewIpLogin = true;
      }
      if (isNewIpLogin) {
        await createOperationLog(pool, {
          userId: String(user.id),
          username: user.username,
          action: 'login_new_ip',
          module: 'auth',
          detail: `检测到新 IP 登录（异常登录提醒）: ${ip}`,
          ipAddress: ip
        });
        // 写入独立安全告警日志（取证层）
        writeSecurityAlert({ level: 'HIGH', type: 'login_new_ip', username: user.username, ip, detail: `用户 ${user.username} 从新 IP ${ip} 登录（异常登录提醒）` });
        console.warn(`[安全提醒] 用户 ${user.username} 从新 IP ${ip} 登录`);
      }
    } catch (ipErr) {
      console.log('IP 异常检测失败:', ipErr.message);
    }

    let buttonPermissions = {};
    const empRoleId = employee ? employee.roleId : null;
    if (empRoleId) {
      try {
        const [btnPerms] = await pool.execute(
          'SELECT menuId, buttonKey FROM role_button_permissions WHERE roleId = ?',
          [empRoleId]
        );
        btnPerms.forEach(bp => {
          if (!buttonPermissions[bp.menuId]) buttonPermissions[bp.menuId] = [];
          buttonPermissions[bp.menuId].push(bp.buttonKey);
        });
      } catch (e) { /* ignore */ }
    }

    // 用真实姓名（纯姓名，不带 emp_ 前缀）签发 token，token 内 username 恒为姓名
    const tokenUsername = employeeName || user.username;
    const token = signToken({ id: user.id, username: tokenUsername, roleName: roleName || '', password: user.password });
    const { password: _pw, ...userSafe } = user;
    res.json({ success: true, user: { ...userSafe, username: tokenUsername, name: employeeName || user.username, permissions, department, position, roleName, avatar, buttonPermissions }, token });
  } catch (error) {
    console.error('登录失败:', error);
    res.status(500).json({ success: false, message: '登录失败' });
  }
});

// Token 自动刷新：用仍有效的登录态换取新 token（静默续期，避免频繁掉线）
// 受全局 requireAuth 保护，改密后旧 token 会因密码指纹不一致而刷新失败，需重新登录
router.post('/auth/refresh', async (req, res) => {
  try {
    const { pool } = req.app.locals;
    const username = req.user?.name || req.user?.username;
    if (!username) {
      return res.status(401).json({ success: false, message: '未登录' });
    }
    const [users] = await pool.execute('SELECT * FROM users WHERE username = ?', [username]);
    if (users.length === 0) {
      return res.status(401).json({ success: false, message: '用户不存在' });
    }
    const user = users[0];
    // 查询员工的部门、职位、角色（与登录逻辑一致）
    let department = '', position = '', roleName = '';
    let roleId = null;
    const [employees] = await pool.execute('SELECT * FROM employees WHERE name = ?', [username]);
    if (employees.length > 0) {
      department = employees[0].department || '';
      position = employees[0].position || '';
      roleId = employees[0].roleId || null;
    }
    if (roleId) {
      const [roleRows] = await pool.execute('SELECT name FROM roles WHERE id = ?', [roleId]);
      roleName = roleRows.length > 0 ? roleRows[0].name : '';
    }
    const newToken = signToken({ id: user.id, username, roleName: roleName || '', password: user.password });
    res.json({ success: true, token: newToken, expiresIn: 12 * 60 * 60, message: 'token 已刷新' });
  } catch (error) {
    console.error('刷新 token 失败:', error);
    res.status(500).json({ success: false, message: '刷新 token 失败' });
  }
});

router.get('/user/permissions', async (req, res) => {
  const { pool } = req.app.locals;
  const username = req.query.username || req.headers['x-username'];
  if (!username) {
    return res.json({ success: false, message: '未提供用户名' });
  }
  try {
    let permissions = [];
    const [employees] = await pool.execute('SELECT * FROM employees WHERE name = ?', [username]);
    if (employees.length > 0) {
      const employee = employees[0];
      if (employee.roleId) {
        const [rolePerms] = await pool.execute(
          `SELECT m.id, m.name, m.path, m.component, m.icon
           FROM role_permissions rp
           JOIN menus m ON rp.menuId = m.id
           WHERE rp.roleId = ?`,
          [employee.roleId]
        );
        permissions = rolePerms;
      }
    }
    res.json({ success: true, data: permissions });
  } catch (error) {
    console.error('获取权限失败:', error);
    res.status(500).json({ success: false, message: '获取权限失败' });
  }
});

router.get('/user/role', async (req, res) => {
  const { pool } = req.app.locals;
  const username = req.query.username;
  if (!username) return res.json({ success: true, data: { roleName: '' } });
  try {
    const [employees] = await pool.execute(
      'SELECT e.name, r.name AS roleName FROM employees e LEFT JOIN roles r ON e.roleId = r.id WHERE e.name = ?',
      [username]
    );
    const roleName = employees.length > 0 ? (employees[0].roleName || '') : '';
    res.json({ success: true, data: { roleName } });
  } catch (error) {
    res.json({ success: true, data: { roleName: '' } });
  }
});

export default router;
