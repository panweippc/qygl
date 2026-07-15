import express from 'express';
const router = express.Router();

router.get('/provinces', async (req, res) => {
  try {
    const { pool } = req.app.locals;
    const [provinces] = await pool.execute(`
      SELECT p.id, p.name, p.code, COUNT(cp.id) as projectCount
      FROM provinces p
      LEFT JOIN closing_projects cp ON p.id = cp.provinceId
      GROUP BY p.id, p.name, p.code
      ORDER BY p.id
    `);
    res.json({ success: true, data: provinces });
  } catch (error) {
    console.error('获取省份数据失败:', error);
    res.status(500).json({ success: false, message: '获取省份数据失败' });
  }
});

router.get('/provinces/:provinceId/cities', async (req, res) => {
  const { provinceId } = req.params;
  try {
    const { pool } = req.app.locals;
    const [cities] = await pool.execute(`
      SELECT c.id, c.name, c.code, COUNT(cp.id) as projectCount
      FROM cities c
      LEFT JOIN counties co ON c.id = co.cityId
      LEFT JOIN closing_projects cp ON co.id = cp.countyId
      WHERE c.provinceId = ?
      GROUP BY c.id, c.name, c.code
      ORDER BY c.id
    `, [provinceId]);
    res.json({ success: true, data: cities });
  } catch (error) {
    console.error('获取城市数据失败:', error);
    res.status(500).json({ success: false, message: '获取城市数据失败' });
  }
});

router.get('/cities/:cityId/counties', async (req, res) => {
  const { cityId } = req.params;
  try {
    const { pool } = req.app.locals;
    const [counties] = await pool.execute(`
      SELECT c.id, c.name, c.code, COUNT(cp.id) as projectCount
      FROM counties c
      LEFT JOIN closing_projects cp ON c.id = cp.countyId
      WHERE c.cityId = ?
      GROUP BY c.id, c.name, c.code
      ORDER BY c.id
    `, [cityId]);
    res.json({ success: true, data: counties });
  } catch (error) {
    console.error('获取旗县数据失败:', error);
    res.status(500).json({ success: false, message: '获取旗县数据失败' });
  }
});

router.get('/counties/:countyId/projects', async (req, res) => {
  const { countyId } = req.params;
  try {
    const { pool } = req.app.locals;
    const [projects] = await pool.execute(`
      SELECT cp.*, p.name as provinceName, c.name as cityName, co.name as countyName
      FROM closing_projects cp
      LEFT JOIN provinces p ON cp.provinceId = p.id
      LEFT JOIN cities c ON cp.cityId = c.id
      LEFT JOIN counties co ON cp.countyId = co.id
      WHERE cp.countyId = ?
      ORDER BY cp.createdAt DESC
    `, [countyId]);
    res.json({ success: true, data: projects });
  } catch (error) {
    console.error('获取项目列表失败:', error);
    res.status(500).json({ success: false, message: '获取项目列表失败' });
  }
});

router.get('/provinces/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const { pool } = req.app.locals;
    const [provinces] = await pool.execute('SELECT * FROM provinces WHERE id = ?', [id]);
    if (provinces.length > 0) {
      res.json({ success: true, data: provinces[0] });
    } else {
      res.json({ success: false, message: '省份不存在' });
    }
  } catch (error) {
    console.error('获取省份信息失败:', error);
    res.status(500).json({ success: false, message: '获取省份信息失败' });
  }
});

router.get('/cities/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const { pool } = req.app.locals;
    const [cities] = await pool.execute('SELECT * FROM cities WHERE id = ?', [id]);
    if (cities.length > 0) {
      res.json({ success: true, data: cities[0] });
    } else {
      res.json({ success: false, message: '城市不存在' });
    }
  } catch (error) {
    console.error('获取城市信息失败:', error);
    res.status(500).json({ success: false, message: '获取城市信息失败' });
  }
});

router.get('/counties/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const { pool } = req.app.locals;
    const [counties] = await pool.execute('SELECT * FROM counties WHERE id = ?', [id]);
    if (counties.length > 0) {
      res.json({ success: true, data: counties[0] });
    } else {
      res.json({ success: false, message: '旗县不存在' });
    }
  } catch (error) {
    console.error('获取旗县信息失败:', error);
    res.status(500).json({ success: false, message: '获取旗县信息失败' });
  }
});

router.post('/provinces', async (req, res) => {
  const { name, code } = req.body;
  try {
    const { pool } = req.app.locals;
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
    const [result] = await pool.execute(
      'INSERT INTO provinces (name, code, createdAt) VALUES (?, ?, ?)',
      [name, code, now]
    );
    res.json({ success: true, message: '省份创建成功', data: { id: result.insertId, name, code } });
  } catch (error) {
    console.error('创建省份失败:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      res.status(400).json({ success: false, message: '省份名称或代码已存在' });
    } else {
      res.status(500).json({ success: false, message: '创建省份失败' });
    }
  }
});

router.put('/provinces/:id', async (req, res) => {
  const { id } = req.params;
  const { name, code } = req.body;
  try {
    const { pool } = req.app.locals;
    const [existingProvinces] = await pool.execute('SELECT id FROM provinces WHERE id = ?', [id]);
    if (existingProvinces.length === 0) {
      return res.json({ success: false, message: '省份不存在' });
    }

    const [existingNames] = await pool.execute('SELECT id FROM provinces WHERE name = ? AND id != ?', [name, id]);
    if (existingNames.length > 0) {
      return res.json({ success: false, message: '省份名称已存在' });
    }

    const [existingCodes] = await pool.execute('SELECT id FROM provinces WHERE code = ? AND id != ?', [code, id]);
    if (existingCodes.length > 0) {
      return res.json({ success: false, message: '省份代码已存在' });
    }

    await pool.execute('UPDATE provinces SET name = ?, code = ? WHERE id = ?', [name, code, id]);
    res.json({ success: true, message: '省份编辑成功' });
  } catch (error) {
    console.error('编辑省份失败:', error);
    res.status(500).json({ success: false, message: '编辑省份失败' });
  }
});

router.delete('/provinces/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const { pool } = req.app.locals;
    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      const [cities] = await connection.execute('SELECT id FROM cities WHERE provinceId = ?', [id]);
      const cityIds = cities.map((city) => city.id);

      if (cityIds.length > 0) {
        const placeholders = cityIds.map(() => '?').join(',');
        const [counties] = await connection.execute(
          `SELECT id FROM counties WHERE cityId IN (${placeholders})`,
          cityIds
        );
        const countyIds = counties.map((county) => county.id);

        if (countyIds.length > 0) {
          const countyPlaceholders = countyIds.map(() => '?').join(',');
          await connection.execute(
            `DELETE FROM closing_projects WHERE countyId IN (${countyPlaceholders})`,
            countyIds
          );
        }

        await connection.execute(
          `DELETE FROM counties WHERE cityId IN (${placeholders})`,
          cityIds
        );
      }

      await connection.execute('DELETE FROM cities WHERE provinceId = ?', [id]);
      await connection.execute('DELETE FROM provinces WHERE id = ?', [id]);

      await connection.commit();
      connection.release();

      res.json({ success: true, message: '省份删除成功' });
    } catch (error) {
      await connection.rollback();
      connection.release();
      throw error;
    }
  } catch (error) {
    console.error('删除省份失败:', error);
    res.status(500).json({ success: false, message: '删除省份失败' });
  }
});

router.post('/cities', async (req, res) => {
  const { name, code, provinceId } = req.body;
  try {
    const { pool } = req.app.locals;
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
    const [result] = await pool.execute(
      'INSERT INTO cities (name, code, provinceId, createdAt) VALUES (?, ?, ?, ?)',
      [name, code, provinceId, now]
    );
    res.json({ success: true, message: '城市创建成功', data: { id: result.insertId, name, code, provinceId } });
  } catch (error) {
    console.error('创建城市失败:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      res.status(400).json({ success: false, message: '该省份下已存在同名城市' });
    } else {
      res.status(500).json({ success: false, message: '创建城市失败' });
    }
  }
});

router.put('/cities/:id', async (req, res) => {
  const { id } = req.params;
  const { name, code, provinceId } = req.body;
  try {
    const { pool } = req.app.locals;
    const [existingCities] = await pool.execute('SELECT id FROM cities WHERE id = ?', [id]);
    if (existingCities.length === 0) {
      return res.json({ success: false, message: '城市不存在' });
    }

    const [existingNames] = await pool.execute('SELECT id FROM cities WHERE name = ? AND id != ?', [name, id]);
    if (existingNames.length > 0) {
      return res.json({ success: false, message: '城市名称已存在' });
    }

    const [existingCodes] = await pool.execute('SELECT id FROM cities WHERE code = ? AND id != ?', [code, id]);
    if (existingCodes.length > 0) {
      return res.json({ success: false, message: '城市代码已存在' });
    }

    const updateParams = [name, code];
    let updateQuery = 'UPDATE cities SET name = ?, code = ?';

    if (provinceId !== undefined) {
      updateQuery += ', provinceId = ?';
      updateParams.push(provinceId);
    }

    updateQuery += ' WHERE id = ?';
    updateParams.push(id);

    await pool.execute(updateQuery, updateParams);
    res.json({ success: true, message: '城市编辑成功' });
  } catch (error) {
    console.error('编辑城市失败:', error);
    res.status(500).json({ success: false, message: '编辑城市失败' });
  }
});

router.delete('/cities/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const { pool } = req.app.locals;
    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      const [counties] = await connection.execute('SELECT id FROM counties WHERE cityId = ?', [id]);
      const countyIds = counties.map((county) => county.id);

      if (countyIds.length > 0) {
        const countyPlaceholders = countyIds.map(() => '?').join(',');
        await connection.execute(
          `DELETE FROM closing_projects WHERE countyId IN (${countyPlaceholders})`,
          countyIds
        );

        await connection.execute(
          `DELETE FROM counties WHERE cityId IN (?)`,
          [id]
        );
      }

      await connection.execute('DELETE FROM cities WHERE id = ?', [id]);

      await connection.commit();
      connection.release();

      res.json({ success: true, message: '城市删除成功' });
    } catch (error) {
      await connection.rollback();
      connection.release();
      throw error;
    }
  } catch (error) {
    console.error('删除城市失败:', error);
    res.status(500).json({ success: false, message: '删除城市失败' });
  }
});

router.post('/counties', async (req, res) => {
  const { name, code, cityId } = req.body;
  try {
    const { pool } = req.app.locals;
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
    const [result] = await pool.execute(
      'INSERT INTO counties (name, code, cityId, createdAt) VALUES (?, ?, ?, ?)',
      [name, code, cityId, now]
    );
    res.json({ success: true, message: '旗县创建成功', data: { id: result.insertId, name, code, cityId } });
  } catch (error) {
    console.error('创建旗县失败:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      res.status(400).json({ success: false, message: '该城市下已存在同名旗县' });
    } else {
      res.status(500).json({ success: false, message: '创建旗县失败' });
    }
  }
});

export default router;
