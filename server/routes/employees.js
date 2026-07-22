import express from 'express';
import { createOperationLog } from '../utils/audit.js';
import xlsx from 'xlsx';
const router = express.Router();

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
    res.json({ success: true, data: employees });
  } catch (error) {
    console.error('获取员工数据失败:', error);
    res.status(500).json({ success: false, message: '获取员工数据失败' });
  }
});

router.post('/employees', async (req, res) => {
  const { name, department, position, email, phone, entryDate, password, role, roleId: directRoleId, status, employeeType, education, birthDate, idCard, address, emergencyContact, emergencyPhone } = req.body;
  try {
    const { pool } = req.app.locals;
    const connection = await pool.getConnection();
    await connection.execute('SET NAMES utf8mb4');
    await connection.execute('SET CHARACTER SET utf8mb4');

    const now = new Date();
    const formattedDate = now.toISOString().slice(0, 19).replace('T', ' ');
    const formattedEntryDate = entryDate ? new Date(entryDate).toISOString().slice(0, 19).replace('T', ' ') : formattedDate;
    const formattedBirthDate = birthDate ? new Date(birthDate).toISOString().slice(0, 19).replace('T', ' ') : null;

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

    if (password) {
      const [existingUser] = await connection.execute('SELECT id FROM users WHERE username = ?', [name]);
      if (existingUser.length === 0) {
        await connection.execute('INSERT INTO users (username, password, createdAt) VALUES (?, ?, ?)', [name, password, formattedDate]);
      }
    }

    const operator = req.body.operator || req.body.username || '系统';
    createOperationLog(pool, { userId: null, username: operator, action: 'create', module: 'employee', targetId: newEmployee[0]?.id, targetName: name, detail: `添加员工: ${name}`, ipAddress: req.ip });
    connection.release();
    res.json({ success: true, message: '员工添加成功', data: newEmployee[0] });
  } catch (error) {
    console.error('添加员工失败:', error);
    res.status(500).json({ success: false, message: '添加员工失败' });
  }
});

router.delete('/employees/:name', async (req, res) => {
  const { name } = req.params;
  try {
    const { pool } = req.app.locals;
    await pool.execute('DELETE FROM employees WHERE name = ?', [name]);
    const operator = '系统';
    createOperationLog(pool, { userId: null, username: operator, action: 'delete', module: 'employee', targetId: null, targetName: name, detail: `删除员工: ${name}`, ipAddress: req.ip });
    res.json({ success: true, message: '员工删除成功' });
  } catch (error) {
    res.status(500).json({ success: false, message: '删除员工失败' });
  }
});

router.put('/employees/:name', async (req, res) => {
  const { name } = req.params;
  const { id, department, position, email, phone, entryDate, password, role, roleId: directRoleId, status, employeeType, education, birthDate, idCard, address, emergencyContact, emergencyPhone } = req.body;
  try {
    const { pool } = req.app.locals;
    const connection = await pool.getConnection();
    await connection.execute('SET NAMES utf8mb4');
    await connection.execute('SET CHARACTER SET utf8mb4');

    const formattedEntryDate = entryDate ? new Date(entryDate).toISOString().slice(0, 19).replace('T', ' ') : new Date().toISOString().slice(0, 19).replace('T', ' ');
    const formattedBirthDate = birthDate ? new Date(birthDate).toISOString().slice(0, 19).replace('T', ' ') : null;

    const oldName = req.params.name;
    const newName = req.body.name;

    let roleId = directRoleId || null;
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

    if (password) {
      const [users] = await connection.execute('SELECT * FROM users WHERE username = ?', [oldName]);
      if (users.length > 0) {
        await connection.execute('UPDATE users SET username = ?, password = ? WHERE username = ?', [newName, password, oldName]);
      }
    }

    const operator = req.body.operator || req.body.username || '系统';
    createOperationLog(pool, { userId: null, username: operator, action: 'update', module: 'employee', targetId: id || null, targetName: newName, detail: `更新员工: ${newName}`, ipAddress: req.ip });
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
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
    await connection.execute(
      'UPDATE departments SET name = ?, code = ?, description = ?, status = ?, updatedAt = ? WHERE id = ?',
      [name, code, description || '', status || '启用', now, id]
    );
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
    const [employees] = await connection.execute(
      'SELECT * FROM employees WHERE department = (SELECT name FROM departments WHERE id = ?)', [id]
    );
    if (employees.length > 0) {
      connection.release();
      return res.status(400).json({ success: false, message: '该部门下有员工，无法删除' });
    }
    await connection.execute('DELETE FROM departments WHERE id = ?', [id]);
    connection.release();
    res.json({ success: true, message: '部门删除成功' });
  } catch (error) {
    console.error('删除部门失败:', error);
    res.status(500).json({ success: false, message: '删除部门失败' });
  }
});

export default router;
