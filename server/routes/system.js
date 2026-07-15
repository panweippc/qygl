import express from 'express';
const router = express.Router();

// 获取所有角色
router.get('/roles', async (req, res) => {
  const { pool } = req.app.locals;
  try {
    const [roles] = await pool.execute('SELECT * FROM roles ORDER BY id');
    res.json({ success: true, data: roles });
  } catch (error) {
    console.error('获取角色列表失败:', error);
    res.status(500).json({ success: false, message: '获取角色列表失败' });
  }
});

// 获取单个角色
router.get('/roles/:id', async (req, res) => {
  const { pool } = req.app.locals;
  const { id } = req.params;
  try {
    const [roles] = await pool.execute('SELECT * FROM roles WHERE id = ?', [id]);
    if (roles.length === 0) {
      return res.status(404).json({ success: false, message: '角色不存在' });
    }
    res.json({ success: true, data: roles[0] });
  } catch (error) {
    console.error('获取角色失败:', error);
    res.status(500).json({ success: false, message: '获取角色失败' });
  }
});

// 创建角色
router.post('/roles', async (req, res) => {
  const { pool } = req.app.locals;
  const { name, code, description, status } = req.body;
  try {
    if (!name || !code) {
      return res.status(400).json({ success: false, message: '角色名称和编码不能为空' });
    }

    const [existingRoles] = await pool.execute('SELECT * FROM roles WHERE code = ?', [code]);
    if (existingRoles.length > 0) {
      return res.status(400).json({ success: false, message: '角色编码已存在' });
    }

    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
    const [result] = await pool.execute(
      'INSERT INTO roles (name, code, description, status, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?)',
      [name, code, description || '', status || '启用', now, now]
    );
    res.json({ success: true, message: '角色创建成功', data: { id: result.insertId } });
  } catch (error) {
    console.error('创建角色失败:', error);
    res.status(500).json({ success: false, message: '创建角色失败: ' + error.message });
  }
});

// 更新角色
router.put('/roles/:id', async (req, res) => {
  const { pool } = req.app.locals;
  const { id } = req.params;
  const { name, code, description, status } = req.body;
  try {
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
    await pool.execute(
      'UPDATE roles SET name = ?, code = ?, description = ?, status = ?, updatedAt = ? WHERE id = ?',
      [name, code, description || '', status || '启用', now, id]
    );
    res.json({ success: true, message: '角色更新成功' });
  } catch (error) {
    console.error('更新角色失败:', error);
    res.status(500).json({ success: false, message: '更新角色失败' });
  }
});

// 删除角色
router.delete('/roles/:id', async (req, res) => {
  const { pool } = req.app.locals;
  const { id } = req.params;
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    console.log(`开始删除角色 ID: ${id}`);

    const [permResult] = await connection.execute('DELETE FROM role_permissions WHERE roleId = ?', [id]);
    console.log(`删除权限记录: ${permResult.affectedRows} 条`);

    const [roleResult] = await connection.execute('DELETE FROM roles WHERE id = ?', [id]);
    console.log(`删除角色: ${roleResult.affectedRows} 条`);

    await connection.commit();
    console.log('事务提交成功');
    res.json({ success: true, message: '角色删除成功' });
  } catch (error) {
    await connection.rollback();
    console.error('删除角色失败:', error);
    console.error('错误详情:', error.message);
    console.error('错误码:', error.code);
    console.error('SQL状态:', error.sqlState);
    res.status(500).json({ success: false, message: '删除角色失败: ' + error.message });
  } finally {
    connection.release();
  }
});

// 获取所有菜单（树形结构）
router.get('/menus', async (req, res) => {
  const { pool } = req.app.locals;
  try {
    const [menus] = await pool.execute('SELECT * FROM menus ORDER BY sort, id');

    const buildTree = (menus, parentId = 0) => {
      return menus
        .filter(menu => menu.parentId === parentId)
        .map(menu => ({
          ...menu,
          children: buildTree(menus, menu.id)
        }));
    };

    const menuTree = buildTree(menus);
    res.json({ success: true, data: menuTree });
  } catch (error) {
    console.error('获取菜单列表失败:', error);
    res.status(500).json({ success: false, message: '获取菜单列表失败' });
  }
});

// 获取单个菜单
router.get('/menus/:id', async (req, res) => {
  const { pool } = req.app.locals;
  const { id } = req.params;
  try {
    const [menus] = await pool.execute('SELECT * FROM menus WHERE id = ?', [id]);
    if (menus.length === 0) {
      return res.status(404).json({ success: false, message: '菜单不存在' });
    }
    res.json({ success: true, data: menus[0] });
  } catch (error) {
    console.error('获取菜单失败:', error);
    res.status(500).json({ success: false, message: '获取菜单失败' });
  }
});

// 创建菜单
router.post('/menus', async (req, res) => {
  const { pool } = req.app.locals;
  const { parentId, name, path, component, icon, sort, status } = req.body;
  try {
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
    const [result] = await pool.execute(
      'INSERT INTO menus (parentId, name, path, component, icon, sort, status, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [parentId || 0, name, path, component || '', icon || '', sort || 0, status || '启用', now, now]
    );
    res.json({ success: true, message: '菜单创建成功', data: { id: result.insertId } });
  } catch (error) {
    console.error('创建菜单失败:', error);
    res.status(500).json({ success: false, message: '创建菜单失败' });
  }
});

// 更新菜单
router.put('/menus/:id', async (req, res) => {
  const { pool } = req.app.locals;
  const { id } = req.params;
  const { parentId, name, path, component, icon, sort, status } = req.body;
  try {
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
    await pool.execute(
      'UPDATE menus SET parentId = ?, name = ?, path = ?, component = ?, icon = ?, sort = ?, status = ?, updatedAt = ? WHERE id = ?',
      [parentId || 0, name, path, component || '', icon || '', sort || 0, status || '启用', now, id]
    );
    res.json({ success: true, message: '菜单更新成功' });
  } catch (error) {
    console.error('更新菜单失败:', error);
    res.status(500).json({ success: false, message: '更新菜单失败' });
  }
});

// 删除菜单
router.delete('/menus/:id', async (req, res) => {
  const { pool } = req.app.locals;
  const { id } = req.params;
  try {
    await pool.execute('DELETE FROM menus WHERE parentId = ?', [id]);
    await pool.execute('DELETE FROM menus WHERE id = ?', [id]);
    res.json({ success: true, message: '菜单删除成功' });
  } catch (error) {
    console.error('删除菜单失败:', error);
    res.status(500).json({ success: false, message: '删除菜单失败' });
  }
});

// 获取角色的权限
router.get('/roles/:roleId/permissions', async (req, res) => {
  const { pool } = req.app.locals;
  const { roleId } = req.params;
  try {
    const [permissions] = await pool.execute(
      'SELECT menuId FROM role_permissions WHERE roleId = ?',
      [roleId]
    );
    res.json({ success: true, data: permissions.map(p => p.menuId) });
  } catch (error) {
    console.error('获取角色权限失败:', error);
    res.status(500).json({ success: false, message: '获取角色权限失败' });
  }
});

// 分配角色权限
router.post('/roles/:roleId/permissions', async (req, res) => {
  const { pool } = req.app.locals;
  const { roleId } = req.params;
  const { menuIds } = req.body;
  const connection = await pool.getConnection();
  try {
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');

    await connection.beginTransaction();

    await connection.execute('DELETE FROM role_permissions WHERE roleId = ?', [roleId]);
    console.log(`删除角色 ${roleId} 的所有权限`);

    if (menuIds && menuIds.length > 0) {
      for (const menuId of menuIds) {
        try {
          console.log(`插入权限: roleId=${roleId}, menuId=${menuId}`);
          await connection.execute(
            'INSERT INTO role_permissions (roleId, menuId, createdAt) VALUES (?, ?, ?)',
            [roleId, menuId, now]
          );
        } catch (insertError) {
          console.error('插入权限记录失败:', insertError.message);
        }
      }
    }

    await connection.commit();
    console.log('权限分配成功');
    res.json({ success: true, message: '权限分配成功' });
  } catch (error) {
    await connection.rollback();
    console.error('分配权限失败:', error);
    res.status(500).json({ success: false, message: '分配权限失败: ' + error.message });
  } finally {
    connection.release();
  }
});

export default router;
