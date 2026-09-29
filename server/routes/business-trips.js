import express from 'express';
const router = express.Router();

import { createNotification, createOperationLog, getOperator } from '../utils/audit.js';
import { resubmitApplication } from '../utils/resubmitHelper.js';
import { getRealName } from '../utils/identity.js';
import { appendReturnHistory } from '../utils/returnHistory.js';

// 仅当前审批人或管理角色可操作（退回/软删判断用）
const isManagerUser = async (req) => {
  try {
    const { pool } = req.app.locals;
    const name = getRealName(req);
    if (!name) return false;
    if (name === '管理员' || name === '总经理' || /^admin$/i.test(name)) return true;
    const [emp] = await pool.execute('SELECT e.position, r.name AS roleName FROM employees e LEFT JOIN roles r ON e.roleId = r.id WHERE e.name = ?', [name]);
    if (emp.length === 0) return false;
    const roleName = emp[0].roleName || '';
    const position = String(emp[0].position || '');
    if (['系统管理员', '总经理', '业务中心经理', '技术部经理'].includes(roleName) || /总经理/.test(position)) return true;
    return false;
  } catch (e) { return false; }
};

// 获取出差列表

// 创建出差申请

// 获取出差详情

// 审批出差申请

// 撤回出差申请：申请人本人（待审批/审批中）可撤回，状态置为「已撤回」
router.post('/business-trips/:id/withdraw', async (req, res) => {
  try {
    const { id } = req.params;
    const { pool } = req.app.locals;
    const operator = getRealName(req);
    if (!operator) return res.status(401).json({ success: false, message: '未登录' });
    const [[rec]] = await pool.query('SELECT * FROM business_trip_applications WHERE id = ?', [id]);
    if (!rec) return res.status(404).json({ success: false, message: '出差申请不存在' });
    if (rec.applicant_name !== operator) return res.status(403).json({ success: false, message: '仅申请人本人可撤回' });
    if (!['待审批', '审批中', 'pending', '待审核'].includes(rec.status)) {
      return res.status(400).json({ success: false, message: '当前状态不可撤回' });
    }
    await pool.execute('UPDATE business_trip_applications SET status = ? WHERE id = ?', ['已撤回', id]);
    // withdrawNotify: 撤回后通知审批人，并给申请人一条消息中心回执
    try {
      const notifyTargets = new Set([rec.approver, operator].filter(Boolean));
      for (const uid of notifyTargets) {
        await createNotification(pool, {
          userId: uid,
          title: '申请已撤回',
          content: uid === operator
            ? `您已撤回自己的出差申请（编号 ${id}）`
            : `${operator} 撤回了一份出差申请（编号 ${id}），该申请已从您的待办中移除`,
          type: 'approval',
          relatedId: parseInt(id),
          relatedType: 'business_trip'
        });
      }
    } catch (e) { /* 通知失败不影响撤回主流程 */ }
    await createOperationLog(pool, { username: operator, action: 'withdraw', module: 'business_trip', targetName: `${rec.destination}出差(${rec.trip_code})`, detail: '申请人撤回' });
    res.json({ success: true, message: '撤回成功' });
  } catch (error) {
    console.error('撤回出差失败:', error);
    res.status(500).json({ success: false, message: '撤回失败' });
  }
});

// 退回出差申请：当前审批人将申请退回给申请人，状态置为「已退回」，记录退回理由
router.post('/business-trips/:id/return', async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const { pool } = req.app.locals;
    const operator = getRealName(req);
    if (!operator) return res.status(401).json({ success: false, message: '未登录' });
    if (!reason || !String(reason).trim()) return res.status(400).json({ success: false, message: '退回理由不能为空' });
    const isManager = await isManagerUser(req);
    const [[rec]] = await pool.query('SELECT * FROM business_trip_applications WHERE id = ?', [id]);
    if (!rec) return res.status(404).json({ success: false, message: '出差申请不存在' });
    if (!isManager && rec.approver !== operator) return res.status(403).json({ success: false, message: '仅当前审批人可退回' });
    if (!['待审批', '审批中', 'pending', '待审核'].includes(rec.status)) {
      return res.status(400).json({ success: false, message: '当前状态不可退回' });
    }
    await pool.execute('UPDATE business_trip_applications SET status = ?, return_reason = ? WHERE id = ?', ['已退回', reason, id]);
    await appendReturnHistory(pool, 'business_trip_applications', id, operator, reason);
    await createNotification(pool, { userId: rec.applicant_name, title: '出差申请被退回', content: `您的${rec.destination}出差申请(${rec.trip_code})被${operator}退回，原因：${reason}`, type: 'approval', relatedId: parseInt(id), relatedType: 'business_trip' });
    await createOperationLog(pool, { username: operator, action: 'return', module: 'business_trip', targetName: `${rec.destination}出差(${rec.trip_code})`, detail: reason });
    res.json({ success: true, message: '已退回' });
  } catch (error) {
    console.error('退回出差失败:', error);
    res.status(500).json({ success: false, message: '退回失败' });
  }
});

// 软删除出差申请：仅已撤回/草稿状态可删，置 is_deleted=1（管理员后台仍可查）
router.post('/business-trips/:id/soft-delete', async (req, res) => {
  try {
    const { id } = req.params;
    const { pool } = req.app.locals;
    const operator = getRealName(req);
    if (!operator) return res.status(401).json({ success: false, message: '未登录' });
    const [[rec]] = await pool.query('SELECT * FROM business_trip_applications WHERE id = ?', [id]);
    if (!rec) return res.status(404).json({ success: false, message: '出差申请不存在' });
    const isManager = await isManagerUser(req);
    if (!isManager && rec.applicant_name !== operator) return res.status(403).json({ success: false, message: '无权限删除他人的申请' });
    if (!isManager && !['已撤回', '草稿', 'withdrawn', 'draft'].includes(rec.status)) {
      return res.status(400).json({ success: false, message: '仅「已撤回/草稿」状态可删除' });
    }
    await pool.execute('UPDATE business_trip_applications SET is_deleted = 1 WHERE id = ?', [id]);
    await createOperationLog(pool, { username: operator, action: 'soft_delete', module: 'business_trip', targetName: `${rec.destination}出差(${rec.trip_code})`, detail: '软删除（逻辑删除）' });
    res.json({ success: true, message: '删除成功' });
  } catch (error) {
    console.error('删除出差失败:', error);
    res.status(500).json({ success: false, message: '删除失败' });
  }
});

// 删除出差申请（软删除）：仅已撤回/草稿状态可删，置 is_deleted=1
router.delete('/business-trips/:id', async (req, res) => {
  const { pool } = req.app.locals;
  try {
    const { id } = req.params;

    const [trips] = await pool.execute(
      'SELECT * FROM business_trip_applications WHERE id = ?',
      [id]
    );

    if (trips.length === 0) {
      return res.status(404).json({ success: false, message: '出差申请不存在' });
    }

    // 安全加固：仅申请人本人（且已撤回/草稿）或管理角色可删除，防越权删除
    const operatorName = getRealName(req);
    const [selfRoles] = await pool.execute(
      'SELECT r.name AS roleName, e.position FROM employees e LEFT JOIN roles r ON e.roleId = r.id WHERE e.name = ?',
      [operatorName]
    );
    const isManager = operatorName === '管理员' || operatorName === '总经理' || /^admin$/i.test(operatorName)
      || /总经理/.test(String(selfRoles[0]?.position || ''))
      || ['系统管理员', '总经理', '业务中心经理', '技术部经理'].includes(String(selfRoles[0]?.roleName || ''));
    const isOwner = trips[0].applicant_name === operatorName;
    if (!isManager && !isOwner) {
      return res.status(403).json({ success: false, message: '无权限删除他人的出差申请' });
    }
    if (!isManager && !['已撤回', '草稿', 'withdrawn', 'draft'].includes(trips[0].status)) {
      return res.status(400).json({ success: false, message: '仅「已撤回/草稿」状态可删除' });
    }

    await pool.execute('UPDATE business_trip_applications SET is_deleted = 1 WHERE id = ?', [id]);

    // 删除出差申请审计
    createOperationLog(pool, { userId: String(req.user?.id || ''), username: getOperator(req), action: 'delete', module: 'business_trip', targetId: id, targetName: `${trips[0].destination}出差(${trips[0].trip_code})`, detail: `删除出差申请: ${trips[0].destination}`, ipAddress: req.ip });
    res.json({ success: true, message: '出差申请删除成功' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});


// 重新提交申请：申请人（已撤回 / 已退回 / 草稿）修改后再次提交，状态回到待审批
router.post('/business-trips/:id/resubmit', async (req, res) => {
  try {
    const { id } = req.params;
    const { pool } = req.app.locals;
    const operator = getRealName(req);
    if (!operator) return res.status(401).json({ success: false, message: '未登录' });
    const r = await resubmitApplication(pool, {
      table: 'business_trip_applications',
      id,
      operator,
      applicantCol: 'applicant_name',
      data: req.body,
      newStatus: 'pending'
    });
    if (r.code !== 200) return res.status(r.code).json({ success: false, message: r.message });
    if (req.body.approver) {
      await createNotification(pool, {
        userId: req.body.approver,
        title: '审批提醒',
        content: `${operator} 重新提交了一份出差申请，请审批`,
        type: 'approval'
      });
    }
    await createOperationLog(pool, {
      username: operator,
      action: 'resubmit',
      module: 'business_trip',
      targetName: `${operator}的出差申请`,
      detail: '撤回/退回后重新提交'
    });
    res.json({ success: true, message: r.message });
  } catch (error) {
    console.error('重新提交失败:', error);
    res.status(500).json({ success: false, message: '重新提交失败' });
  }
});

export default router;
