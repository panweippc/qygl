import express from 'express';
const router = express.Router();

import { createNotification, createOperationLog, getOperator } from '../utils/audit.js';
import { resubmitApplication } from '../utils/resubmitHelper.js';

// ---- 报销/招待费数据访问控制：申请人本人 + 财务/总经理 可见 ----
const FINANCE_ROLES = ['财务总监', '财务经理', '总经理', '系统管理员'];

// 获取当前登录用户真实姓名（处理 emp_姓名_id 前缀）
const getRealName = (req) => {
  let username = req.user?.username || req.user?.name || '';
  if (username && /^emp_/.test(username)) {
    const parts = String(username).split('_');
    if (parts.length >= 2) username = parts[1];
  }
  return username || '';
};

// 判断是否财务/管理角色（从数据库读取最新角色，避免 token 角色过期）
const isFinanceManager = async (req) => {
  try {
    const { pool } = req.app.locals;
    const name = getRealName(req);
    if (!name) return false;
    if (name === '管理员' || name === '总经理' || /^admin$/i.test(name)) return true;
    const [emp] = await pool.execute(
      'SELECT e.position, r.name AS roleName FROM employees e LEFT JOIN roles r ON e.roleId = r.id WHERE e.name = ?',
      [name]
    );
    if (emp.length === 0) return false;
    const roleName = emp[0].roleName || '';
    const position = String(emp[0].position || '');
    if (FINANCE_ROLES.includes(roleName) || /总经理/.test(position)) return true;
    return false;
  } catch (e) {
    return false;
  }
};

// 获取报销记录列表：财务/总经理看全部，普通员工只看自己
router.get('/reimbursements', async (req, res) => {
  try {
    const { pool } = req.app.locals;
    const isManager = await isFinanceManager(req);
    if (isManager) {
      const [reimbursements] = await pool.execute('SELECT * FROM reimbursements WHERE is_deleted = 0 OR is_deleted IS NULL ORDER BY createdAt DESC');
      return res.json({ success: true, data: reimbursements });
    }
    const name = getRealName(req);
    const [reimbursements] = await pool.execute('SELECT * FROM reimbursements WHERE applicant = ? AND (is_deleted = 0 OR is_deleted IS NULL) ORDER BY createdAt DESC', [name]);
    res.json({ success: true, data: reimbursements });
  } catch (error) {
    console.error('获取报销记录失败:', error);
    res.status(500).json({ success: false, message: '获取报销记录失败' });
  }
});

// 获取单个报销记录：仅本人或财务/总经理可见
router.get('/reimbursements/:id', async (req, res) => {
  try {
    const { pool } = req.app.locals;
    const [records] = await pool.execute('SELECT * FROM reimbursements WHERE id = ?', [req.params.id]);
    if (records.length === 0) {
      return res.status(404).json({ success: false, message: '报销记录不存在' });
    }
    const isManager = await isFinanceManager(req);
    const name = getRealName(req);
    if (!isManager && records[0].applicant !== name) {
      return res.status(403).json({ success: false, message: '无权限查看该报销记录' });
    }
    res.json({ success: true, data: records[0] });
  } catch (error) {
    console.error('获取报销记录详情失败:', error);
    res.status(500).json({ success: false, message: '获取报销记录详情失败' });
  }
});

// 撤回报销申请：申请人本人（审批中）可撤回
router.post('/reimbursements/:id/withdraw', async (req, res) => {
  try {
    const { id } = req.params;
    const { pool } = req.app.locals;
    const operator = getRealName(req);
    if (!operator) return res.status(401).json({ success: false, message: '未登录' });
    const [[rec]] = await pool.query('SELECT * FROM reimbursements WHERE id = ?', [id]);
    if (!rec) return res.status(404).json({ success: false, message: '报销记录不存在' });
    if (rec.applicant !== operator) return res.status(403).json({ success: false, message: '仅申请人本人可撤回' });
    if (!['待审批', '审批中', 'pending', '待审核'].includes(rec.status)) {
      return res.status(400).json({ success: false, message: '当前状态不可撤回' });
    }
    await pool.execute('UPDATE reimbursements SET status = ?, result = ? WHERE id = ?', ['已撤回', '已撤回', id]);
    // withdrawNotify: 撤回后通知审批人，并给申请人一条消息中心回执
    try {
      const notifyTargets = new Set([rec.approver, operator].filter(Boolean));
      for (const uid of notifyTargets) {
        await createNotification(pool, {
          userId: uid,
          title: '申请已撤回',
          content: uid === operator
            ? `您已撤回自己的报销申请（编号 ${id}）`
            : `${operator} 撤回了一份报销申请（编号 ${id}），该申请已从您的待办中移除`,
          type: 'approval',
          relatedId: parseInt(id),
          relatedType: 'reimbursement'
        });
      }
    } catch (e) { /* 通知失败不影响撤回主流程 */ }
    await createOperationLog(pool, { username: operator, action: 'withdraw', module: 'reimbursement', targetName: `${rec.reimburseType || ''}报销`, detail: '申请人撤回' });
    res.json({ success: true, message: '撤回成功' });
  } catch (error) {
    console.error('撤回报销失败:', error);
    res.status(500).json({ success: false, message: '撤回失败' });
  }
});

// 退回报销申请：当前审批人退回，记录理由
router.post('/reimbursements/:id/return', async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const { pool } = req.app.locals;
    const operator = getRealName(req);
    if (!operator) return res.status(401).json({ success: false, message: '未登录' });
    if (!reason || !String(reason).trim()) return res.status(400).json({ success: false, message: '退回理由不能为空' });
    const isManager = await isFinanceManager(req);
    const [[rec]] = await pool.query('SELECT * FROM reimbursements WHERE id = ?', [id]);
    if (!rec) return res.status(404).json({ success: false, message: '报销记录不存在' });
    if (!isManager && rec.approver !== operator) return res.status(403).json({ success: false, message: '仅当前审批人可退回' });
    if (!['待审批', '审批中', 'pending', '待审核'].includes(rec.status)) {
      return res.status(400).json({ success: false, message: '当前状态不可退回' });
    }
    await pool.execute('UPDATE reimbursements SET status = ?, result = ?, return_reason = ? WHERE id = ?', ['已退回', '已退回', reason, id]);
    await createNotification(pool, { userId: rec.applicant, title: '报销申请被退回', content: `您的${rec.reimburseType || ''}报销被${operator}退回，原因：${reason}`, type: 'approval' });
    await createOperationLog(pool, { username: operator, action: 'return', module: 'reimbursement', targetName: `${rec.reimburseType || ''}报销`, detail: reason });
    res.json({ success: true, message: '已退回' });
  } catch (error) {
    console.error('退回报销失败:', error);
    res.status(500).json({ success: false, message: '退回失败' });
  }
});

// 提交报销申请：申请人身份从 token 读取，禁止伪造他人名义提交
router.post('/reimbursements', async (req, res) => {
  const { reimburseType, amount, reimburseDate, reason, approver, attachments, detail } = req.body;
  const applicant = getRealName(req);
  if (!applicant) {
    return res.status(401).json({ success: false, message: '未登录' });
  }
  if (!reimburseType || !amount) {
    return res.status(400).json({ success: false, message: '报销类型和金额不能为空' });
  }
  try {
    const { pool } = req.app.locals;
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
    await pool.execute(
      'INSERT INTO reimbursements (applicant, reimburseType, amount, reimburseDate, reason, approver, attachments, detail, status, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [applicant, reimburseType, amount, reimburseDate, reason, approver, attachments || null, detail ? JSON.stringify(detail) : null, '审批中', now]
    );

    await createNotification(pool, {
      userId: approver, title: '报销审批提醒', content: `${applicant} 提交了${amount}元的${reimburseType}报销申请，请审批`, type: 'approval',
    });
    await createOperationLog(pool, { username: applicant, action: 'submit', module: 'reimbursement', targetName: `${reimburseType}报销(${amount}元)`, detail: `提交给${approver}审批` });

    res.json({ success: true, message: '报销申请提交成功' });
  } catch (error) {
    console.error('提交报销申请失败:', error);
    res.status(500).json({ success: false, message: '提交报销申请失败' });
  }
});

// 更新报销申请（审批）：仅当前审批人或财务/总经理可操作
router.put('/reimbursements/:id', async (req, res) => {
  const { id } = req.params;
  const { comment, result, forwardTo } = req.body;
  try {
    const { pool } = req.app.locals;
    const operator = getRealName(req);
    const isManager = await isFinanceManager(req);
    const [[record]] = await pool.query('SELECT * FROM reimbursements WHERE id = ?', [id]);
    if (!record) {
      return res.status(404).json({ success: false, message: '报销记录不存在' });
    }
    // 非管理角色：仅当是当前审批人（或审批人之一）时允许操作
    if (!isManager && record.approver !== operator && record.applicant !== operator) {
      return res.status(403).json({ success: false, message: '您不是该报销的审批人，无权限操作' });
    }
    if (forwardTo) {
      const [[current]] = await pool.query('SELECT * FROM reimbursements WHERE id = ?', [id]);
      const currentApprover = current?.approver || '';
      const intermediateResult = result ? `${currentApprover}:${result}` : null;
      const newComment = current?.oldComment
        ? `${current.oldComment}\n---\n${currentApprover}: ${comment || ''}`
        : `${currentApprover}: ${comment || ''}`;
      await pool.execute(
        'UPDATE reimbursements SET comment = ?, result = ?, approver = ? WHERE id = ?',
        [newComment, intermediateResult, forwardTo, id]
      );
      const [[app]] = await pool.query('SELECT * FROM reimbursements WHERE id = ?', [id]);
      if (app) {
        await createNotification(pool, { userId: app.applicant, title: '报销已转发', content: `您的${app.reimburseType}报销(${app.amount}元)已转发至总经理审批`, type: 'approval' });
        await createNotification(pool, { userId: forwardTo, title: '报销审批提醒', content: `${app.applicant} 的${app.reimburseType}报销(${app.amount}元)已转发给您，请审批`, type: 'approval' });
        await createOperationLog(pool, { username: getOperator(req), action: 'forward', module: 'reimbursement', targetName: `${app.applicant}的${app.reimburseType}报销`, detail: comment || '' });
      }
    } else {
      const status = result === '批准' ? '已批准' : result === '拒绝' ? '已拒绝' : '审批中';
      const [[current]] = await pool.query('SELECT * FROM reimbursements WHERE id = ?', [id]);
      const currentApprover = current?.approver || '';
      const accumulatedResult = current?.oldResult && current.oldResult.includes(':')
        ? `${current.oldResult};${currentApprover}:${result}`
        : `${currentApprover}:${result}`;
      const newComment = current?.oldComment
        ? `${current.oldComment}\n---\n${currentApprover}: ${comment || ''}`
        : `${currentApprover}: ${comment || ''}`;
      await pool.execute(
        'UPDATE reimbursements SET comment = ?, result = ?, status = ? WHERE id = ?',
        [newComment, accumulatedResult, status, id]
      );
      const [[app]] = await pool.query('SELECT * FROM reimbursements WHERE id = ?', [id]);
      if (app) {
        const actionLabel = result === '批准' ? '已通过' : result === '拒绝' ? '被拒绝' : '已更新';
        await createNotification(pool, { userId: app.applicant, title: `报销${actionLabel}`, content: `您的${app.reimburseType}报销(${app.amount}元)${actionLabel}`, type: 'approval' });
        await createOperationLog(pool, { username: getOperator(req), action: result === '批准' ? 'approve' : result === '拒绝' ? 'reject' : 'update', module: 'reimbursement', targetName: `${app.applicant}的${app.reimburseType}报销`, detail: comment || '' });
      }
    }

    res.json({ success: true, message: '报销申请更新成功' });
  } catch (error) {
    console.error('更新报销申请失败:', error);
    res.status(500).json({ success: false, message: '更新报销申请失败' });
  }
});

// 软删除报销申请：仅已撤回/草稿状态可删（逻辑删除，管理员后台仍可见）
router.post('/reimbursements/:id/soft-delete', async (req, res) => {
  const { id } = req.params;
  try {
    const { pool } = req.app.locals;
    const [rows] = await pool.execute('SELECT * FROM reimbursements WHERE id = ?', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: '报销记录不存在' });
    }
    const operator = getRealName(req);
    const isManager = await isFinanceManager(req);
    if (!isManager && rows[0].applicant !== operator) {
      return res.status(403).json({ success: false, message: '无权限删除他人的报销记录' });
    }
    if (!isManager && !['已撤回', '草稿', 'withdrawn', 'draft'].includes(rows[0].status)) {
      return res.status(400).json({ success: false, message: '仅「已撤回/草稿」状态可删除' });
    }
    const info = rows[0] || {};
    await pool.execute('UPDATE reimbursements SET is_deleted = 1 WHERE id = ?', [id]);
    createOperationLog(pool, { userId: String(req.user?.id || ''), username: getOperator(req), action: 'soft_delete', module: 'reimbursement', targetId: id, targetName: `${info.applicant || ''}的${info.reimburseType || ''}报销`, detail: `软删除报销申请: ${info.reimburseType || ''}报销`, ipAddress: req.ip });
    res.json({ success: true, message: '报销申请删除成功' });
  } catch (error) {
    console.error('删除报销申请失败:', error);
    res.status(500).json({ success: false, message: '删除报销申请失败' });
  }
});

// 兼容旧的真实 DELETE 调用：同样走软删除
router.delete('/reimbursements/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const { pool } = req.app.locals;
    const [rows] = await pool.execute('SELECT * FROM reimbursements WHERE id = ?', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: '报销记录不存在' });
    }
    const operator = getRealName(req);
    const isManager = await isFinanceManager(req);
    if (!isManager && rows[0].applicant !== operator) {
      return res.status(403).json({ success: false, message: '无权限删除他人的报销记录' });
    }
    if (!isManager && !['已撤回', '草稿', 'withdrawn', 'draft'].includes(rows[0].status)) {
      return res.status(400).json({ success: false, message: '仅「已撤回/草稿」状态可删除' });
    }
    const info = rows[0] || {};
    await pool.execute('UPDATE reimbursements SET is_deleted = 1 WHERE id = ?', [id]);
    createOperationLog(pool, { userId: String(req.user?.id || ''), username: getOperator(req), action: 'soft_delete', module: 'reimbursement', targetId: id, targetName: `${info.applicant || ''}的${info.reimburseType || ''}报销`, detail: `软删除报销申请: ${info.reimburseType || ''}报销`, ipAddress: req.ip });
    res.json({ success: true, message: '报销申请删除成功' });
  } catch (error) {
    console.error('删除报销申请失败:', error);
    res.status(500).json({ success: false, message: '删除报销申请失败' });
  }
});


// 重新提交申请：申请人（已撤回 / 已退回 / 草稿）修改后再次提交，状态回到待审批
router.post('/reimbursements/:id/resubmit', async (req, res) => {
  try {
    const { id } = req.params;
    const { pool } = req.app.locals;
    const operator = getRealName(req);
    if (!operator) return res.status(401).json({ success: false, message: '未登录' });
    const r = await resubmitApplication(pool, {
      table: 'reimbursements',
      id,
      operator,
      applicantCol: 'applicant',
      data: req.body,
      newStatus: '审批中'
    });
    if (r.code !== 200) return res.status(r.code).json({ success: false, message: r.message });
    if (req.body.approver) {
      await createNotification(pool, {
        userId: req.body.approver,
        title: '审批提醒',
        content: `${operator} 重新提交了一份报销申请，请审批`,
        type: 'approval'
      });
    }
    await createOperationLog(pool, {
      username: operator,
      action: 'resubmit',
      module: 'reimbursement',
      targetName: `${operator}的报销申请`,
      detail: '撤回/退回后重新提交'
    });
    res.json({ success: true, message: r.message });
  } catch (error) {
    console.error('重新提交失败:', error);
    res.status(500).json({ success: false, message: '重新提交失败' });
  }
});

export default router;
