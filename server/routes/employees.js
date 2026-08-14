import express from 'express';
import { createOperationLog, getRecordBefore, logDataChange, getOperator } from '../utils/audit.js';
import { hashPassword, validatePassword, generateRandomPassword, verifyPassword } from '../utils/security.js';
import { check, firstError } from '../utils/validate.js';
import { requireRole } from '../middleware/auth.js';
import xlsx from 'xlsx';
const router = express.Router();

// 高危操作二次验证：校验当前登录用户的密码（防会话劫持后的恶意操作）
// 需在 requireAuth 之后使用（req.user 有登录身份）
const verifyAdminPassword = async (req, res, next) => {
  const { adminPassword } = req.body || {};
  if (!adminPassword) {
    return res.status(400).json({ success: false, message: '请提供当前登录密码进行二次验证' });
  }
  try {
    const { pool } = req.app.locals;
    const username = req.user?.name || req.user?.username;
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
};

// 统一按东八区将日期/时间转换为 'YYYY-MM-DD HH:MM:SS'，避免 UTC 解析导致日期偏移一天
const toLocalDateTime = (value) => {
  if (!value) return null;
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value + ' 00:00:00';
  const d = value instanceof Date ? value : new Date(value);
  if (isNaN(d.getTime())) return String(value);
  const local = new Date(d.getTime() + 8 * 60 * 60 * 1000);
  const pad = (n) => String(n).padStart(2, '0');
  return `${local.getUTCFullYear()}-${pad(local.getUTCMonth() + 1)}-${pad(local.getUTCDate())} ${pad(local.getUTCHours())}:${pad(local.getUTCMinutes())}:${pad(local.getUTCSeconds())}`;
};

// 判断调用者是否拥有完整敏感信息查看权限（管理员 / 总经理 / 财务 / 人事等管理角色）
const SENSITIVE_ROLES = ['系统管理员', '总经理', '财务总监', '财务经理', '人事经理', '人事专员', '业务中心经理', '技术部经理', '销售部经理'];
const isSensitiveAllowed = (req) => {
  const name = req.user?.name || req.user?.username || '';
  // token 中的角色字段名为 role
  const role = (req.user?.role || req.user?.roleName || '').toString();
  // 系统管理员账号直接放行
  if (name === '管理员' || name === '总经理' || /^admin$/i.test(name)) return true;
  // 按角色名判断（含财务等管理岗位）
  if (SENSITIVE_ROLES.includes(role)) return true;
  return false;
};

// C1: 普通员工脱敏函数——隐藏身份证、电话、地址等敏感信息
const maskSensitive = (emp) => {
  if (!emp) return emp;
  const masked = { ...emp };
  masked.idCard = emp.idCard ? String(emp.idCard).replace(/^(.{6}).*(.{4})$/, '$1********$2') : '';
  masked.phone = emp.phone ? String(emp.phone).replace(/^(\d{3})\d{4}(\d{4})$/, '$1****$2') : '';
  masked.address = emp.address ? '(隐藏)' : '';
  masked.emergencyContact = emp.emergencyContact ? String(emp.emergencyContact).replace(/^(.)(.*)$/, '$1**') : '';
  masked.emergencyPhone = emp.emergencyPhone ? String(emp.emergencyPhone).replace(/^(\d{3})\d{4}(\d{4})$/, '$1****$2') : '';
  masked.birthDate = emp.birthDate ? '' : '';
  return masked;
};

router.get('/employees', async (req, res) => {
  try {
    const { pool } = req.app.locals;
    const connection = await pool.getConnection();
    await connection.execute('SET NAMES utf8mb4');
    await connection.execute('SET CHARACTER SET utf8mb4');
    const [employees] = await connection.execute(`
      SELECT e.*, r.name as role
      FROM employees e
      LEFT JOIN roles r ON e.roleId = r.id
    `);
    connection.release();
    // C1: 非管理员/总经理查看时，对敏感字段脱敏
    const data = isSensitiveAllowed(req) ? employees : employees.map(maskSensitive);
    res.json({ success: true, data });
  } catch (error) {
    console.error('获取员工数据失败:', error);
    res.status(500).json({ success: false, message: '获取员工数据失败' });
  }
});

router.post('/employees', async (req, res) => {
  const { name, department, position, email, phone, entryDate, password, role, roleId: directRoleId, status, employeeType, education, birthDate, idCard, address, emergencyContact, emergencyPhone } = req.body;
  // 输入校验：核心字段必填且限长，选填字段限长
  const vErr = firstError(
    check.str(name, '姓名', { max: 50 }),
    check.str(department, '部门', { max: 50 }),
    check.strOptional(position, '职位', 50),
    check.email(email, '邮箱'),
    check.phone(phone, '手机号'),
    check.strOptional(status, '状态', 20),
    check.strOptional(employeeType, '员工类型', 20),
    check.strOptional(education, '学历', 20),
    check.strOptional(idCard, '身份证号', 18),
    check.strOptional(address, '地址', 255),
    check.strOptional(emergencyContact, '紧急联系人', 50),
    check.strOptional(emergencyPhone, '紧急联系电话', 20)
  );
  if (vErr) {
    return res.status(400).json({ success: false, message: vErr });
  }
  try {
    const { pool } = req.app.locals;
    const connection = await pool.getConnection();
    await connection.execute('SET NAMES utf8mb4');
    await connection.execute('SET CHARACTER SET utf8mb4');

    const now = new Date();
    const formattedDate = now.toISOString().slice(0, 19).replace('T', ' ');
    const formattedEntryDate = entryDate ? toLocalDateTime(entryDate) : formattedDate;
    const formattedBirthDate = birthDate ? toLocalDateTime(birthDate) : null;

    let roleId = directRoleId || null;
    if (!roleId && role) {
      const [roles] = await connection.execute('SELECT id FROM roles WHERE name = ?', [role]);
      if (roles.length > 0) {
        roleId = roles[0].id;
      }
    }

    await connection.execute(
      'INSERT INTO employees (name, department, position, email, phone, entryDate, roleId, status, employeeType, education, birthDate, idCard, address, emergencyContact, emergencyPhone, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [name, department, position, email, phone, formattedEntryDate, roleId, status || '在职', employeeType || '正式员工', education || '', formattedBirthDate, idCard || '', address || '', emergencyContact || '', emergencyPhone || '', formattedDate]
    );

    const [newEmployee] = await connection.execute('SELECT * FROM employees WHERE name = ?', [name]);

    // 初始密码：优先用传入的 password；若未填则自动生成随机强密码
    let initPassword = password;
    let autoGenerated = false;
    if (!initPassword) {
      initPassword = generateRandomPassword(14);
      autoGenerated = true;
    } else {
      // 手动填写密码时校验复杂度
      const pwdErr = validatePassword(initPassword);
      if (pwdErr) {
        connection.release();
        return res.status(400).json({ success: false, message: pwdErr });
      }
    }

    // 同步创建/更新登录账号（users 表），保证新增员工即可登录
    const [existingUser] = await connection.execute('SELECT id FROM users WHERE username = ?', [name]);
    if (existingUser.length === 0) {
      await connection.execute('INSERT INTO users (username, password, createdAt) VALUES (?, ?, ?)', [name, hashPassword(String(initPassword)), formattedDate]);
    } else {
      // 账号已存在：手动填了密码才更新，自动生成的密码不覆盖已有账号密码
      if (!autoGenerated) {
        await connection.execute('UPDATE users SET password = ? WHERE username = ?', [hashPassword(String(initPassword)), name]);
      }
    }

    const operator = getOperator(req);
    createOperationLog(pool, { userId: null, username: operator, action: 'create', module: 'employee', targetId: newEmployee[0]?.id, targetName: name, detail: `添加员工: ${name}`, ipAddress: req.ip });
    connection.release();
    // 返回初始密码（仅自动生成时返回给管理员，手动填的不回显）
    res.json({ success: true, message: '员工添加成功', data: newEmployee[0], initialPassword: autoGenerated ? initPassword : undefined });
  } catch (error) {
    console.error('添加员工失败:', error);
    res.status(500).json({ success: false, message: '添加员工失败' });
  }
});

router.delete('/employees/:name', requireRole('系统管理员', '总经理'), verifyAdminPassword, async (req, res) => {
  const { name } = req.params;
  try {
    const { pool } = req.app.locals;
    // 同时删除员工和对应登录账号（若存在）
    await pool.execute('DELETE FROM users WHERE username = ?', [name]);
    await pool.execute('DELETE FROM employees WHERE name = ?', [name]);
    const operator = getOperator(req);
    createOperationLog(pool, { userId: String(req.user?.id || ''), username: operator, action: 'delete', module: 'employee', targetId: null, targetName: name, detail: `删除员工: ${name}`, ipAddress: req.ip });
    res.json({ success: true, message: '员工删除成功' });
  } catch (error) {
    res.status(500).json({ success: false, message: '删除员工失败' });
  }
});

router.put('/employees/:name', requireRole('系统管理员', '总经理'), async (req, res) => {
  const { name } = req.params;
  const { id, department, position, email, phone, entryDate, password, role, roleId: directRoleId, status, employeeType, education, birthDate, idCard, address, emergencyContact, emergencyPhone } = req.body;
  // 输入校验（仅校验员工资料字段；密码由下方 validatePassword 单独校验）
  const vErr = firstError(
    check.strOptional(req.body.name, '姓名', 50),
    check.strOptional(department, '部门', 50),
    check.strOptional(position, '职位', 50),
    check.email(email, '邮箱'),
    check.phone(phone, '手机号'),
    check.strOptional(status, '状态', 20),
    check.strOptional(employeeType, '员工类型', 20),
    check.strOptional(education, '学历', 20),
    check.strOptional(idCard, '身份证号', 18),
    check.strOptional(address, '地址', 255),
    check.strOptional(emergencyContact, '紧急联系人', 50),
    check.strOptional(emergencyPhone, '紧急联系电话', 20)
  );
  if (vErr) {
    return res.status(400).json({ success: false, message: vErr });
  }
  try {
    const { pool } = req.app.locals;
    const connection = await pool.getConnection();
    await connection.execute('SET NAMES utf8mb4');
    await connection.execute('SET CHARACTER SET utf8mb4');

    const oldName = req.params.name;
    const newName = req.body.name || oldName;

    // 用户管理"重置密码"仅传 password：此时只更新登录密码，不触碰员工信息
    const hasEmployeeFields = id || department || position || email || phone || entryDate || role || directRoleId || status || employeeType || education || birthDate || idCard || address || emergencyContact || emergencyPhone;

    // 角色ID（函数级作用域，供审计记录权限变更使用）
    let roleId = directRoleId || null;

    // 变更前的员工数据，用于审计日志"变更前后对比"（函数级作用域）
    let beforeEmployee = null;
    try {
      const [beforeRows] = await connection.execute('SELECT * FROM employees WHERE name = ?', [oldName]);
      if (beforeRows.length > 0) beforeEmployee = beforeRows[0];
    } catch (e) { /* ignore */ }

    if (hasEmployeeFields) {
      const formattedEntryDate = entryDate ? toLocalDateTime(entryDate) : new Date().toISOString().slice(0, 19).replace('T', ' ');
      const formattedBirthDate = birthDate ? toLocalDateTime(birthDate) : null;

      if (!roleId && role) {
        const [roles] = await connection.execute('SELECT id FROM roles WHERE name = ?', [role]);
        if (roles.length > 0) {
          roleId = roles[0].id;
        }
      }

      if (id) {
        await connection.execute(
          'UPDATE employees SET name = ?, department = ?, position = ?, email = ?, phone = ?, entryDate = ?, roleId = ?, status = ?, employeeType = ?, education = ?, birthDate = ?, idCard = ?, address = ?, emergencyContact = ?, emergencyPhone = ? WHERE id = ?',
          [newName, department, position, email, phone, formattedEntryDate, roleId, status || '在职', employeeType || '正式员工', education || '', formattedBirthDate, idCard || '', address || '', emergencyContact || '', emergencyPhone || '', id]
        );
      } else {
        await connection.execute(
          'UPDATE employees SET department = ?, position = ?, email = ?, phone = ?, entryDate = ?, roleId = ?, status = ?, employeeType = ?, education = ?, birthDate = ?, idCard = ?, address = ?, emergencyContact = ?, emergencyPhone = ? WHERE name = ?',
          [department, position, email, phone, formattedEntryDate, roleId, status || '在职', employeeType || '正式员工', education || '', formattedBirthDate, idCard || '', address || '', emergencyContact || '', emergencyPhone || '', oldName]
        );
      }

      // 如果姓名变更，级联更新所有 OA 表中的审批人/申请人字段
      if (oldName !== newName) {
        const tableUpdates = [
          { sql: "UPDATE leave_applications SET applicant = REPLACE(applicant, ?, ?), approver = REPLACE(approver, ?, ?) WHERE applicant = ? OR approver = ?", params: [oldName, newName, oldName, newName, oldName, newName] },
          { sql: "UPDATE reimbursements SET applicant = REPLACE(applicant, ?, ?), approver = REPLACE(approver, ?, ?) WHERE applicant = ? OR approver = ?", params: [oldName, newName, oldName, newName, oldName, newName] },
          { sql: "UPDATE office_supplies_applications SET applicant = REPLACE(applicant, ?, ?), approver = REPLACE(approver, ?, ?) WHERE applicant = ? OR approver = ?", params: [oldName, newName, oldName, newName, oldName, newName] },
          { sql: "UPDATE entertainment_expenses SET applicant = REPLACE(applicant, ?, ?), approver = REPLACE(approver, ?, ?) WHERE applicant = ? OR approver = ?", params: [oldName, newName, oldName, newName, oldName, newName] },
          { sql: "UPDATE business_trip_applications SET approver = REPLACE(approver, ?, ?), current_approvers = REPLACE(current_approvers, ?, ?), approval_history = REPLACE(approval_history, ?, ?) WHERE approver LIKE ? OR current_approvers LIKE ? OR approval_history LIKE ?", params: [oldName, newName, oldName, newName, oldName, newName, oldName, newName, oldName] },
          { sql: "UPDATE project_applications SET approver = REPLACE(approver, ?, ?), current_approvers = REPLACE(current_approvers, ?, ?), approval_history = REPLACE(approval_history, ?, ?) WHERE approver LIKE ? OR current_approvers LIKE ? OR approval_history LIKE ?", params: [oldName, newName, oldName, newName, oldName, newName, oldName, newName, oldName] },
          { sql: "UPDATE meetings SET approver = REPLACE(approver, ?, ?) WHERE approver = ?", params: [oldName, newName, oldName] },
          { sql: "UPDATE closing_projects SET applicant = REPLACE(applicant, ?, ?) WHERE applicant = ?", params: [oldName, newName, oldName] },
          { sql: "UPDATE notifications SET userId = ? WHERE userId = ?", params: [newName, oldName] }
        ];
        for (const { sql, params } of tableUpdates) {
          try {
            await connection.execute(sql, params);
          } catch (syncErr) {
            console.error('级联更新失败:', syncErr.message);
          }
        }
      }
    }

    // 密码更新：账号存在则改密，不存在则创建（保证重置后能登录）
    if (password) {
      // 高危操作二次验证：重置密码需输入当前登录用户的密码
      const adminPassword = req.body.adminPassword;
      if (!adminPassword) {
        connection.release();
        return res.status(400).json({ success: false, message: '请提供当前登录密码进行二次验证' });
      }
      const [selfUsers] = await connection.execute('SELECT password FROM users WHERE username = ?', [req.user?.name || req.user?.username]);
      if (selfUsers.length === 0 || !verifyPassword(String(adminPassword), selfUsers[0].password)) {
        connection.release();
        return res.status(403).json({ success: false, message: '当前登录密码错误，操作已拒绝' });
      }
      // 密码复杂度校验：至少10位，含大小写、数字、特殊字符
      const pwdErr = validatePassword(password);
      if (pwdErr) {
        connection.release();
        return res.status(400).json({ success: false, message: pwdErr });
      }
      const hashed = hashPassword(String(password));
      const [users] = await connection.execute('SELECT * FROM users WHERE username = ?', [oldName]);
      if (users.length > 0) {
        await connection.execute('UPDATE users SET username = ?, password = ? WHERE username = ?', [newName, hashed, oldName]);
      } else {
        const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
        await connection.execute('INSERT INTO users (username, password, createdAt) VALUES (?, ?, ?)', [newName, hashed, now]);
      }
    }

    const operator = getOperator(req);
    // 变更前后值对比（只保留关键字段，避免存储过长）
    // 包含 roleId/roleName 用于追溯权限（角色）变更前后对比
    const pick = (e) => e ? {
      name: e.name, department: e.department, position: e.position, email: e.email,
      phone: e.phone, entryDate: e.entryDate, status: e.status, employeeType: e.employeeType,
      roleId: e.roleId, roleName: e.roleName
    } : null;
    const afterEmployee = { name: newName, department, position, email, phone, entryDate: toLocalDateTime(entryDate), status: status || '在职', employeeType: employeeType || '正式员工', roleId: roleId || null };
    createOperationLog(pool, { userId: String(req.user?.id || ''), username: operator, action: 'update', module: 'employee', targetId: id || null, targetName: newName, detail: `更新员工: ${newName}`, ipAddress: req.ip, beforeValue: pick(beforeEmployee), afterValue: afterEmployee });
    connection.release();
    res.json({ success: true, message: '员工更新成功' });
  } catch (error) {
    console.error('更新员工失败:', error);
    res.status(500).json({ success: false, message: '更新员工失败' });
  }
});

router.get('/employees/export', async (req, res) => {
  try {
    const { pool } = req.app.locals;
    const connection = await pool.getConnection();
    await connection.execute('SET NAMES utf8mb4');
    await connection.execute('SET CHARACTER SET utf8mb4');
    const [employees] = await connection.execute('SELECT * FROM employees');
    connection.release();

    const excelData = employees.map(emp => ({
      '姓名': emp.name,
      '部门': emp.department,
      '职位': emp.position,
      '邮箱': emp.email,
      '电话': emp.phone,
      '入职日期': emp.entryDate ? new Date(emp.entryDate).toLocaleDateString() : '',
      '状态': emp.status || '在职',
      '员工类型': emp.employeeType || '正式员工',
      '学历': emp.education || '',
      '出生日期': emp.birthDate ? new Date(emp.birthDate).toLocaleDateString() : '',
      '身份证号': emp.idCard || '',
      '联系地址': emp.address || '',
      '紧急联系人': emp.emergencyContact || '',
      '紧急联系电话': emp.emergencyPhone || ''
    }));

    const workbook = xlsx.utils.book_new();
    const worksheet = xlsx.utils.json_to_sheet(excelData);
    worksheet['!cols'] = [
      { wch: 15 }, { wch: 15 }, { wch: 20 }, { wch: 30 }, { wch: 15 },
      { wch: 15 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 15 },
      { wch: 20 }, { wch: 30 }, { wch: 15 }, { wch: 15 }
    ];
    xlsx.utils.book_append_sheet(workbook, worksheet, '员工数据');
    const excelBuffer = xlsx.write(workbook, { bookType: 'xlsx', type: 'buffer' });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    const safeDate = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    res.setHeader('Content-Disposition', `attachment; filename=employee_data_${safeDate}.xlsx`);
    res.setHeader('Content-Length', excelBuffer.length);
    res.send(excelBuffer);
  } catch (error) {
    console.error('导出员工数据失败:', error);
    res.status(500).json({ success: false, message: '导出员工数据失败' });
  }
});

router.get('/departments', async (req, res) => {
  try {
    const { pool } = req.app.locals;
    const connection = await pool.getConnection();
    await connection.execute('SET NAMES utf8mb4');
    await connection.execute('SET CHARACTER SET utf8mb4');
    const [departments] = await connection.execute('SELECT * FROM departments WHERE status = ?', ['启用']);
    connection.release();
    res.json({ success: true, data: departments });
  } catch (error) {
    console.error('获取部门数据失败:', error);
    res.status(500).json({ success: false, message: '获取部门数据失败' });
  }
});

router.post('/departments', async (req, res) => {
  const { name, code, description } = req.body;
  try {
    const { pool } = req.app.locals;
    const connection = await pool.getConnection();
    await connection.execute('SET NAMES utf8mb4');
    await connection.execute('SET CHARACTER SET utf8mb4');
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
    await connection.execute(
      'INSERT INTO departments (name, code, description, status, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?)',
      [name, code, description || '', '启用', now, now]
    );
    connection.release();
    res.json({ success: true, message: '部门添加成功' });
  } catch (error) {
    console.error('添加部门失败:', error);
    res.status(500).json({ success: false, message: '添加部门失败' });
  }
});

router.put('/departments/:id', async (req, res) => {
  const { id } = req.params;
  const { name, code, description, status } = req.body;
  try {
    const { pool } = req.app.locals;
    const connection = await pool.getConnection();
    await connection.execute('SET NAMES utf8mb4');
    await connection.execute('SET CHARACTER SET utf8mb4');
    const beforeValue = await getRecordBefore(pool, 'departments', id, { name: 1, code: 1, description: 1, status: 1 });
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
    await connection.execute(
      'UPDATE departments SET name = ?, code = ?, description = ?, status = ?, updatedAt = ? WHERE id = ?',
      [name, code, description || '', status || '启用', now, id]
    );
    await logDataChange(pool, {
      module: 'system', username: getOperator(req), targetId: id, targetName: `部门: ${name}`,
      beforeValue, afterValue: { name, code, description: description || '', status: status || '启用' }, ipAddress: req.ip
    });
    connection.release();
    res.json({ success: true, message: '部门更新成功' });
  } catch (error) {
    console.error('更新部门失败:', error);
    res.status(500).json({ success: false, message: '更新部门失败' });
  }
});

router.delete('/departments/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const { pool } = req.app.locals;
    const connection = await pool.getConnection();
    // 删除前获取部门信息，用于审计记录
    const [deptRows] = await connection.execute('SELECT name FROM departments WHERE id = ?', [id]);
    const deptName = deptRows.length > 0 ? deptRows[0].name : `部门#${id}`;
    const [employees] = await connection.execute(
      'SELECT * FROM employees WHERE department = (SELECT name FROM departments WHERE id = ?)', [id]
    );
    if (employees.length > 0) {
      connection.release();
      return res.status(400).json({ success: false, message: '该部门下有员工，无法删除' });
    }
    await connection.execute('DELETE FROM departments WHERE id = ?', [id]);
    connection.release();
    // 删除部门审计
    createOperationLog(pool, { userId: String(req.user?.id || ''), username: getOperator(req), action: 'delete', module: 'system', targetId: id, targetName: `部门: ${deptName}`, detail: `删除部门: ${deptName}`, ipAddress: req.ip });
    res.json({ success: true, message: '部门删除成功' });
  } catch (error) {
    console.error('删除部门失败:', error);
    res.status(500).json({ success: false, message: '删除部门失败' });
  }
});

export default router;
