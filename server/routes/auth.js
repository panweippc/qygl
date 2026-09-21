import express from 'express';
import rateLimit from 'express-rate-limit';
import { randomBytes } from 'crypto';
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

// ===== 服务端验证码：后端生成码 + 一次性 token（5 分钟有效），登录时后端比对 =====
// 单实例 pm2（exec_mode: fork）下内存存储安全；多实例部署需改共享存储（redis 等）
const captchaStore = new Map();
const CAPTCHA_TTL = 5 * 60 * 1000;

// 生成验证码字符（去除易混的 0/O/1/l/I 等）
function genCaptchaCode(len = 4) {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  let s = '';
  for (let i = 0; i < len; i++) s += chars.charAt(Math.floor(Math.random() * chars.length));
  return s;
}

// 生成 SVG 验证码图片（纯文本 SVG，无原生依赖，直接内联/转 dataURL 展示）
function genCaptchaSvg(code) {
  const W = 110, H = 42;
  const colors = ['#1E5AA8', '#2E6FB8', '#2E9E83', '#C0392B', '#B77410', '#5B8FC9'];
  let noise = '';
  for (let i = 0; i < 4; i++) {
    const c = colors[Math.floor(Math.random() * colors.length)];
    const x1 = (Math.random() * W).toFixed(1), y1 = (Math.random() * H).toFixed(1);
    const x2 = (Math.random() * W).toFixed(1), y2 = (Math.random() * H).toFixed(1);
    noise += `<path d="M${x1} ${y1} L${x2} ${y2}" stroke="${c}" stroke-width="1" opacity="0.45"/>`;
  }
  for (let i = 0; i < 22; i++) {
    const c = colors[Math.floor(Math.random() * colors.length)];
    noise += `<circle cx="${(Math.random() * W).toFixed(1)}" cy="${(Math.random() * H).toFixed(1)}" r="1" fill="${c}" opacity="0.5"/>`;
  }
  const cw = W / code.length;
  let chars = '';
  for (let i = 0; i < code.length; i++) {
    const c = colors[Math.floor(Math.random() * colors.length)];
    const x = (cw * i + cw / 2).toFixed(1);
    const y = (H / 2 + (Math.random() - 0.5) * 8).toFixed(1);
    const rot = ((Math.random() - 0.5) * 40).toFixed(1);
    const fs = (20 + Math.random() * 8).toFixed(1);
    chars += `<text x="${x}" y="${(parseFloat(y) + parseFloat(fs) / 3).toFixed(1)}" font-family="Arial,Helvetica,sans-serif" font-size="${fs}" font-weight="bold" fill="${c}" text-anchor="middle" transform="rotate(${rot} ${x} ${y})">${code[i]}</text>`;
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">` +
    `<rect width="${W}" height="${H}" fill="#f3f6fb"/>` +
    `<path d="M0 21 Q27 8 55 21 T110 21" stroke="#cdd9e8" stroke-width="1" fill="none"/>` +
    `${noise}${chars}</svg>`;
  return svg;
}

// 获取验证码：返回一次性 token + SVG（dataURL）。免登录
router.get('/captcha', (req, res) => {
  const code = genCaptchaCode(4);
  const token = randomBytes(16).toString('hex');
  captchaStore.set(token, { code, expires: Date.now() + CAPTCHA_TTL });
  // 懒清理：小概率随请求剔除已过期项，避免长时间堆积
  if (Math.random() < 0.05) {
    for (const [k, v] of captchaStore) {
      if (v.expires < Date.now()) captchaStore.delete(k);
    }
  }
  const svg = genCaptchaSvg(code);
  res.json({ success: true, token, svg: `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}` });
});

// 校验密码（兼容存量明文密码，成功后自动升级为 bcrypt 哈希）
const matchUser = (users, password) => {
  if (!Array.isArray(users)) return null;
  for (const u of users) {
    if (verifyPassword(password, u.password)) return u;
  }
  return null;
};

router.post('/login', loginLimiter, async (req, res) => {
  let { username, password, captcha, captchaToken } = req.body;
  const { pool, userSessions } = req.app.locals;
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '';
  try {
    if (!username || !password) {
      return res.json({ success: false, message: '请输入用户名和密码' });
    }
    // 服务端验证码校验（一次性，5 分钟有效）；后端生成、后端比对，脚本无法绕过
    if (!captchaToken || !captcha) {
      return res.json({ success: false, message: '请输入验证码' });
    }
    const _cap = captchaStore.get(captchaToken);
    if (!_cap || _cap.expires < Date.now()) {
      captchaStore.delete(captchaToken);
      return res.json({ success: false, message: '验证码已过期，请刷新' });
    }
    if (String(_cap.code).toLowerCase() !== String(captcha).toLowerCase()) {
      captchaStore.delete(captchaToken);
      return res.json({ success: false, message: '验证码错误' });
    }
    captchaStore.delete(captchaToken); // 一次性消费，防重放

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
      // 离职员工账号自动禁用：关联员工若已离职则拒绝登录
      const empName = String(username).startsWith('emp_') ? String(username).slice(4) : String(username);
      const [erows] = await pool.execute('SELECT status FROM employees WHERE name = ?', [empName]);
      if (erows.length > 0 && String(erows[0].status).includes('离职')) {
        writeSecurityAlert({ level: 'WARN', type: 'account_disabled', username, ip, detail: `离职员工账号尝试登录被拒绝: ${username}` });
        return res.status(403).json({ success: false, message: '该账号对应的员工已离职，登录被禁止，请联系管理员' });
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
    // 按设备类型维度互踢：仅踢同类型（pc/mobile）的旧会话，跨类型（PC 与手机）共存
    const deviceType = req.body && req.body.deviceType === 'mobile' ? 'mobile' : 'pc';
    const sessionKey = `${user.username}|${deviceType}`;
    if (userSessions.has(sessionKey)) {
      const oldSocketId = userSessions.get(sessionKey);
      if (oldSocketId) {
        io.to(oldSocketId).emit('kickedOut', { message: '您的账号在其他设备登录，已被强制退出' });
      }
    }
    // 同设备类型旧会话由 socket 连接时的 setUserLogin 自然覆盖；
    // 这里不再把 key 设为 null，避免空值窗口期导致第二个同类型登录无法踢人。
    userSessions.delete(sessionKey);

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
        'SELECT e.*, r.name AS roleName, r.status AS roleStatus FROM employees e LEFT JOIN roles r ON e.roleId = r.id WHERE e.name = ?',
        [employeeName]
      );

      if (employees.length > 0) {
        employee = employees[0];
        department = employee.department;
        position = employee.position;
        roleName = employee.roleName || '';
        avatar = employee.avatar || '';

        // 角色被禁用：拒绝登录（系统管理员/总经理角色除外，防止误禁最高权限导致无法登录）
        const roleStatus = String(employee.roleStatus || '').trim();
        if (roleStatus === '禁用' && !['系统管理员', '总经理'].includes(roleName)) {
          writeSecurityAlert({ level: 'WARN', type: 'role_disabled', username, ip, detail: `关联角色「${roleName}」被禁用，拒绝登录: ${username}` });
          return res.status(403).json({ success: false, message: '您所属的角色已被禁用，请联系管理员' });
        }

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
            fallbackRoleName = '技术部经理';
          } else if (employee.department === '销售部') {
            fallbackRoleName = '销售部经理';
          } else if (employee.department === '财务部') {
            fallbackRoleName = employee.position === '财务总监' ? '财务总监' : '普通员工';
          } else if (employee.department === '人力资源部') {
            fallbackRoleName = '普通员工';
          } else {
            fallbackRoleName = '普通员工';
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
    // 必须携带当前 tokenVersion：否则被踢/角色禁用过的用户（tokenVersion>0）重新登录后
    // token 内 ver 恒为 0，requireAuth 校验必然 401，表现为"登录成功即被弹回登录页"
    const tokenUsername = employeeName || user.username;
    const token = signToken({ id: user.id, username: tokenUsername, roleName: roleName || '', password: user.password, tokenVersion: user.tokenVersion });
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
    const newToken = signToken({ id: user.id, username, roleName: roleName || '', password: user.password, tokenVersion: user.tokenVersion });
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

      // fallback：按部门/职位推断角色
      if (permissions.length === 0) {
        let fallbackRoleName = '';
        if (employee.department === '管理部门' && employee.position === '总经理') {
          fallbackRoleName = '总经理';
        } else if (employee.department === '技术部') {
          fallbackRoleName = '技术部经理';
        } else if (employee.department === '销售部') {
          fallbackRoleName = '销售部经理';
        } else if (employee.department === '财务部') {
          fallbackRoleName = employee.position === '财务总监' ? '财务总监' : '普通员工';
        } else {
          fallbackRoleName = '普通员工';
        }

        if (fallbackRoleName) {
          const [roles] = await pool.execute('SELECT id FROM roles WHERE name = ?', [fallbackRoleName]);
          if (roles.length > 0) {
            const [rolePerms] = await pool.execute(
              `SELECT m.id, m.name, m.path, m.component, m.icon
               FROM role_permissions rp
               JOIN menus m ON rp.menuId = m.id
               WHERE rp.roleId = ?`,
              [roles[0].id]
            );
            permissions = rolePerms;
          }
        }
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
