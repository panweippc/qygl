import express from 'express';
import { createNotification, createOperationLog, getRecordBefore, logDataChange, getOperator } from '../utils/audit.js';
import { getRealName } from '../utils/identity.js';
const router = express.Router();

const APP_TYPE_CN = {
  leave: '请假',
  reimbursement: '报销',
  meeting: '会议',
  project: '项目',
  businessTrip: '出差',
  entertainment: '业务招待'
};

// 会议类下发记录，若 detail 缺参会人员/会议议程，则从 meetings 表补回（兼容早期下发的记录）
async function enrichMeetingDetail(pool, record) {
  if (record.applicationType !== 'meeting') return record;
  let detail = {};
  try { detail = record.detail ? JSON.parse(record.detail) : {}; } catch { detail = {}; }
  if (detail.participants && detail.agenda) return record;
  try {
    const [[mtg]] = await pool.execute('SELECT participants, agenda FROM meetings WHERE id = ?', [record.applicationId]);
    if (mtg) {
      if (!detail.participants && mtg.participants) detail.participants = mtg.participants;
      if (!detail.agenda && mtg.agenda) detail.agenda = mtg.agenda;
      record.detail = JSON.stringify(detail);
    }
  } catch (e) { /* 补强失败不影响主流程 */ }
  return record;
}

async function enrichRecords(pool, records) {
  const out = [];
  for (const r of records) out.push(await enrichMeetingDetail(pool, r));
  return out;
}

// 获取所有下发记录列表（管理员用）
router.get('/distributed-records', async (req, res) => {
  const { pool } = req.app.locals;
  try {
    console.log('收到获取所有下发记录请求');
    const [records] = await pool.execute(
      'SELECT * FROM distributed_records ORDER BY createdAt DESC'
    );
    console.log('查询到下发记录数量:', records.length);
    res.json({ success: true, data: records });
  } catch (error) {
    console.error('获取所有下发记录失败:', error);
    res.status(500).json({ success: false, message: '获取所有下发记录失败: ' + error.message });
  }
});

// 获取下发记录列表（根据目标用户）
router.get('/distributed-records/user/:targetUser', async (req, res) => {
  const { pool } = req.app.locals;
  try {
    let { targetUser } = req.params;
    console.log('接收到的targetUser:', targetUser);

    const match = targetUser.match(/^emp_(.+?)_\d+$/);
    if (match) {
      targetUser = match[1];
      console.log('提取后的真实姓名:', targetUser);
    }

    const [records] = await pool.execute(
      'SELECT * FROM distributed_records WHERE targetUser = ? ORDER BY createdAt DESC',
      [targetUser]
    );

    console.log('查询到的下发记录数量:', records.length);
    try {
      const [all] = await pool.execute('SELECT id, applicationType, applicationId, applicant, targetUser, status FROM distributed_records ORDER BY id DESC LIMIT 20');
      console.log('最近20条下发记录(targetUser字段值):', JSON.stringify(all.map(r => ({ id: r.id, type: r.applicationType, appId: r.applicationId, targetUser: r.targetUser, status: r.status }))));
    } catch (e) {}
    res.json({ success: true, data: records });
  } catch (error) {
    console.error('获取下发记录失败:', error);
    res.status(500).json({ success: false, message: '获取下发记录失败: ' + error.message });
  }
});

// 获取"我收到的下发"：仅返回当前登录用户作为下发目标(targetUser)的记录，只读、不可伪造他人
router.get('/distributed-records/mine', async (req, res) => {
  const { pool } = req.app.locals;
  try {
    const me = getRealName(req);
    if (!me) {
      return res.status(401).json({ success: false, message: '无法识别当前用户' });
    }
    const [records] = await pool.execute(
      'SELECT * FROM distributed_records WHERE targetUser = ? ORDER BY createdAt DESC',
      [me]
    );
    const enriched = await enrichRecords(pool, records);
    res.json({ success: true, data: enriched });
  } catch (error) {
    console.error('获取我的下发记录失败:', error);
    res.status(500).json({ success: false, message: '获取我的下发记录失败: ' + error.message });
  }
});

// 接收人处理自己收到的下发记录（标记为已处理），并通知下发人
router.post('/distributed-records/:id/process', async (req, res) => {
  const { pool } = req.app.locals;
  const username = getOperator(req);
  try {
    const { id } = req.params;
    const me = getRealName(req);
    if (!me) {
      return res.status(401).json({ success: false, message: '无法识别当前用户' });
    }
    const [[record]] = await pool.execute('SELECT * FROM distributed_records WHERE id = ?', [id]);
    if (!record) {
      return res.status(404).json({ success: false, message: '下发记录不存在' });
    }
    if (record.targetUser !== me) {
      return res.status(403).json({ success: false, message: '只能处理下发给自己的记录' });
    }
    const processComment = String(req.body.processComment || '').slice(0, 500);
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
    await pool.execute(
      'UPDATE distributed_records SET status = ?, processComment = ?, updatedAt = ? WHERE id = ?',
      ['已处理', processComment, now, id]
    );
    // 通知下发人：接收人已处理
    try {
      let detail = {};
      try { detail = record.detail ? JSON.parse(record.detail) : {}; } catch {}
      const title = detail.title || detail.meetingTitle || `${APP_TYPE_CN[record.applicationType] || record.applicationType}申请`;
      const appTypeCn = APP_TYPE_CN[record.applicationType] || record.applicationType;
      await createNotification(pool, {
        userId: record.distributedBy,
        title: '下发任务已处理',
        content: `${me} 已处理您下发的${appTypeCn}任务「${title}」`,
        type: 'approval',
        relatedId: parseInt(record.applicationId) || 0,
        relatedType: record.applicationType
      });
    } catch (e) {
      console.error('处理通知创建失败:', e.message);
    }
    await createOperationLog(pool, {
      username,
      action: 'update',
      module: 'distribute',
      targetId: id,
      targetName: `下发记录ID: ${id}`,
      detail: `接收人 ${me} 处理下发记录 ID: ${id}`,
      ipAddress: req.ip
    });
    res.json({ success: true, message: '处理成功' });
  } catch (error) {
    console.error('处理下发记录失败:', error);
    res.status(500).json({ success: false, message: '处理下发记录失败: ' + error.message });
  }
});

// 添加下发记录
router.post('/distributed-records', async (req, res) => {
  const { pool } = req.app.locals;
  const username = getOperator(req);
  try {
    const { applicationId, applicationType, applicant, distributedBy, targetUser, comment, status, detail } = req.body;

    console.log('收到下发记录请求:', req.body);

    if (!applicationId || !applicationType || !applicant || !distributedBy || !targetUser) {
      return res.status(400).json({
        success: false,
        message: '缺少必填字段',
        required: ['applicationId', 'applicationType', 'applicant', 'distributedBy', 'targetUser'],
        received: { applicationId, applicationType, applicant, distributedBy, targetUser }
      });
    }

    // 检查是否已下发给该用户（需同时匹配类型，避免不同业务表 id 撞车误判重复）
    const [existing] = await pool.execute(
      'SELECT id FROM distributed_records WHERE applicationId = ? AND applicationType = ? AND targetUser = ?',
      [applicationId, applicationType, targetUser]
    );
    if (existing.length > 0) {
      return res.status(409).json({
        success: false,
        message: `该记录已下发给 ${targetUser}，不能重复下发`
      });
    }

    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');

    const [result] = await pool.execute(
      'INSERT INTO distributed_records (applicationId, applicationType, applicant, distributedBy, targetUser, comment, status, detail, approver, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [applicationId, applicationType, applicant, distributedBy, targetUser, comment || '', status || '待处理', detail || '', req.body.approver || '', now]
    );

    console.log('下发记录添加成功, ID:', result.insertId);

    try {
      // 将英文申请类型映射为对应中文，避免消息中心出现 "leave申请" 等英文
      const appTypeCn = APP_TYPE_CN[applicationType] || applicationType;
      await createNotification(pool, {
        userId: targetUser,
        title: '新任务下发',
        content: `${distributedBy} 给您下发了一条${appTypeCn}申请，请查看处理`,
        type: 'approval',
        relatedId: parseInt(applicationId),
        relatedType: applicationType
      });
    } catch (e) {
      console.error('下发通知创建失败:', e.message);
    }

    await createOperationLog(pool, {
      username,
      action: 'create',
      module: 'distribute',
      targetId: result.insertId,
      targetName: `${applicationType}-${applicationId}`,
      detail: `创建下发记录: ${applicationType}(${applicationId}) -> ${targetUser}`,
      ipAddress: req.ip
    });

    res.json({ success: true, message: '下发记录添加成功', data: { id: result.insertId } });
  } catch (error) {
    console.error('添加下发记录失败:', error);
    res.status(500).json({ success: false, message: '添加下发记录失败: ' + error.message });
  }
});

// 更新下发记录
router.put('/distributed-records/:id', async (req, res) => {
  const { pool } = req.app.locals;
  const username = getOperator(req);
  try {
    const { id } = req.params;
    const { status, comment, processComment } = req.body;
    const beforeValue = await getRecordBefore(pool, 'distributed_records', id, { status: 1, comment: 1, processComment: 1 });
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');

    const updates = [];
    const params = [];

    if (status !== undefined) {
      updates.push('status = ?');
      params.push(status);
    }
    if (comment !== undefined) {
      updates.push('comment = ?');
      params.push(comment);
    }
    if (processComment !== undefined) {
      updates.push('processComment = ?');
      params.push(processComment);
    }

    updates.push('updatedAt = ?');
    params.push(now);

    params.push(id);

    const sql = `UPDATE distributed_records SET ${updates.join(', ')} WHERE id = ?`;
    await pool.execute(sql, params);

    await createOperationLog(pool, {
      username,
      action: 'update',
      module: 'distribute',
      targetId: id,
      targetName: `下发记录ID: ${id}`,
      detail: `更新下发记录 ID: ${id}, 状态: ${status || '无变化'}`,
      ipAddress: req.ip
    });

    await logDataChange(pool, {
      module: 'distribute', username, targetId: id, targetName: `下发记录ID: ${id}`,
      beforeValue, afterValue: { status: status ?? beforeValue?.status ?? null, comment: comment ?? beforeValue?.comment ?? null, processComment: processComment ?? beforeValue?.processComment ?? null },
      ipAddress: req.ip
    });

    res.json({ success: true, message: '下发记录更新成功' });
  } catch (error) {
    console.error('更新下发记录失败:', error);
    res.status(500).json({ success: false, message: '更新下发记录失败: ' + error.message });
  }
});

export default router;
