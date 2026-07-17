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
      const username = `emp_${name}_${Date.now()}`;
      await connection.execute('INSERT INTO users (username, password, createdAt) VALUES (?, ?, ?)', [username, password, formattedDate]);

      const [existingUsers] = await connection.execute('SELECT * FROM users WHERE username = ?', [name]);
      let userId = null;
      if (existingUsers.length === 0) {
        const [result] = await connection.execute('INSERT INTO users (username, password, createdAt) VALUES (?, ?, ?)', [name, password, formattedDate]);
        userId = result.insertId;
      } else {
        userId = existingUsers[0].id;
      }

      if (role && userId) {
        try {
          const [roles] = await connection.execute('SELECT id FROM roles WHERE name = ?', [role]);
          if (roles.length > 0) {
            const roleId = roles[0].id;
            const [rolePermissions] = await connection.execute('SELECT menuId FROM role_permissions WHERE roleId = ?', [roleId]);
            for (const perm of rolePermissions) {
              await connection.execute('INSERT INTO role_permissions (roleId, menuId, createdAt) VALUES (?, ?, ?)', [userId, perm.menuId, formattedDate]);
            }
          }
        } catch (permError) {
          console.error('分配权限失败:', permError.message);
        }
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
        [name, department, position, email, phone, formattedEntryDate, roleId, status || '在职', employeeType || '正式员工', education || '', formattedBirthDate, idCard || '', address || '', emergencyContact || '', emergencyPhone || '', id]
      );
    } else {
      await connection.execute(
        'UPDATE employees SET department = ?, position = ?, email = ?, phone = ?, entryDate = ?, roleId = ?, status = ?, employeeType = ?, education = ?, birthDate = ?, idCard = ?, address = ?, emergencyContact = ?, emergencyPhone = ? WHERE name = ?',
        [department, position, email, phone, formattedEntryDate, roleId, status || '在职', employeeType || '正式员工', education || '', formattedBirthDate, idCard || '', address || '', emergencyContact || '', emergencyPhone || '', name]
      );
    }

    if (password) {
      const [users] = await connection.execute('SELECT * FROM users WHERE username = ?', [name]);
      if (users.length > 0) {
        await connection.execute('UPDATE users SET password = ? WHERE username = ?', [password, name]);
      }
    }

    const operator = req.body.operator || req.body.username || '系统';
    createOperationLog(pool, { userId: null, username: operator, action: 'update', module: 'employee', targetId: id || null, targetName: name, detail: `更新员工: ${name}`, ipAddress: req.ip });
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
