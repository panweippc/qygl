import express from 'express';
import { createOperationLog } from '../utils/audit.js';
const router = express.Router();

router.get('/closing-projects', async (req, res) => {
  try {
    const { pool } = req.app.locals;
    const [projects] = await pool.execute('SELECT * FROM closing_projects');
    res.json({ success: true, data: projects });
  } catch (error) {
    console.error('获取成交项目数据失败:', error);
    res.status(500).json({ success: false, message: '获取成交项目数据失败' });
  }
});

router.post('/closing-projects', async (req, res) => {
  try {
    const { pool } = req.app.locals;
    const { name, description, status, dealTime, price, serviceEndTime, nextYearFeeStatus, contractFeeStatus, remainingAmount, provinceId, cityId, countyId, applicant } = req.body;

    console.log('接收到的请求数据:', req.body);

    function formatDate(dateString) {
      if (!dateString) return null;
      const date = new Date(dateString);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }

    const formattedDealTime = formatDate(dealTime);
    const formattedServiceEndTime = formatDate(serviceEndTime);
    const formattedStartDate = formattedDealTime;

    const query = `INSERT INTO closing_projects (name, description, status, startDate, dealTime, price, serviceEndTime, nextYearFeeStatus, contractFeeStatus, remainingAmount, provinceId, cityId, countyId, applicant, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    const values = [name, description, status, formattedStartDate, formattedDealTime, price, formattedServiceEndTime, nextYearFeeStatus, contractFeeStatus || '未结', remainingAmount || 0, provinceId, cityId, countyId, applicant || '', new Date().toISOString().replace('T', ' ').replace('Z', '')];

    console.log('SQL查询:', query);
    console.log('SQL参数:', values);

    await pool.execute(query, values);
    await createOperationLog(pool, {
      username: req.body.operator || req.body.applicant || '系统',
      action: 'create',
      module: 'deal',
      targetName: `成交项目"${name}"`,
    });
    res.json({ success: true, message: '成交项目添加成功' });
  } catch (error) {
    console.error('添加成交项目失败:', error);
    res.status(500).json({ success: false, message: '添加成交项目失败' });
  }
});

router.put('/closing-projects/:id', async (req, res) => {
  const { id } = req.params;
  const { name, description, status, dealTime, price, serviceEndTime, nextYearFeeStatus, contractFeeStatus, remainingAmount, provinceId, cityId, countyId, applicant } = req.body;
  try {
    const { pool } = req.app.locals;
    const [old] = await pool.execute('SELECT name FROM closing_projects WHERE id = ?', [id]);
    const projectName = name || (old.length > 0 ? old[0].name : id);
    const formatDate = (dateString) => {
      if (!dateString) return null;
      return new Date(dateString).toISOString().split('T')[0];
    };

    await pool.execute(
      'UPDATE closing_projects SET name = ?, description = ?, status = ?, startDate = ?, dealTime = ?, price = ?, serviceEndTime = ?, nextYearFeeStatus = ?, contractFeeStatus = ?, remainingAmount = ?, provinceId = ?, cityId = ?, countyId = ?, applicant = ? WHERE id = ?',
      [name, description, status, formatDate(dealTime), formatDate(dealTime), price, formatDate(serviceEndTime), nextYearFeeStatus, contractFeeStatus || '未结', remainingAmount || 0, provinceId, cityId, countyId, applicant || '', id]
    );
    await createOperationLog(pool, {
      username: req.body.operator || req.body.applicant || '系统',
      action: 'update',
      module: 'deal',
      targetName: `成交项目"${projectName}"`,
      targetId: parseInt(id),
    });
    res.json({ success: true, message: '成交项目更新成功' });
  } catch (error) {
    console.error('更新成交项目失败:', error);
    res.status(500).json({ success: false, message: '更新成交项目失败' });
  }
});

router.delete('/closing-projects/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const { pool } = req.app.locals;
    const [rows] = await pool.execute('SELECT name FROM closing_projects WHERE id = ?', [id]);
    const projectName = rows.length > 0 ? rows[0].name : id;
    await pool.execute('DELETE FROM closing_projects WHERE id = ?', [id]);
    await createOperationLog(pool, {
      username: req.query.operator || '系统',
      action: 'delete',
      module: 'deal',
      targetName: `成交项目"${projectName}"`,
      targetId: parseInt(id),
    });
    res.json({ success: true, message: '成交项目删除成功' });
  } catch (error) {
    console.error('删除成交项目失败:', error);
    res.status(500).json({ success: false, message: '删除成交项目失败' });
  }
});

router.get('/closing-projects/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const { pool } = req.app.locals;
    const [projects] = await pool.execute('SELECT * FROM closing_projects WHERE id = ?', [id]);
    if (projects.length > 0) {
      res.json({ success: true, data: projects[0] });
    } else {
      res.json({ success: false, message: '项目不存在' });
    }
  } catch (error) {
    console.error('获取成交项目详情失败:', error);
    res.status(500).json({ success: false, message: '获取成交项目详情失败' });
  }
});

export default router;
