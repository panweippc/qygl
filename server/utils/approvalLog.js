// approvalLog.js
// 审批生命周期审计日志：记录每一条申请从「提交」到「最终归档」的完整动作链。
// 这是纠纷留证的唯一权威来源，包含操作人、角色、动作、前后状态、意见、目标人、时间戳。
//
// 动作(action)枚举：
//   submit     提交申请
//   approve    批准
//   reject     拒绝
//   forward    转交（转发给其他人审批）
//   return     退回申请人
//   withdraw   申请人撤回
//   resubmit   申请人重新提交（退回/撤回后修改再提交）
//   distribute 审批人下发（知会/交办）
//   process    被下发人处理

/**
 * 写入一条审批生命周期日志
 * @param {object} pool            mysql 连接池
 * @param {object} opts
 * @param {string} opts.applicationType  申请类型 leave/reimbursement/entertainment/meeting/businessTrip/project
 * @param {number} opts.applicationId    申请 id
 * @param {string} opts.actor            操作人姓名
 * @param {string} [opts.actorRole]      申请人 / 审批人 / 系统
 * @param {string} opts.action           动作枚举
 * @param {string} [opts.fromStatus]     变更前状态
 * @param {string} [opts.toStatus]       变更后状态
 * @param {string} [opts.comment]        审批意见 / 退回理由等
 * @param {string} [opts.targetUser]     转发/下发目标人
 */
export async function appendApprovalLog(pool, opts = {}) {
  const {
    applicationType, applicationId, actor, actorRole = '',
    action, fromStatus = '', toStatus = '', comment = '', targetUser = ''
  } = opts;
  if (!pool || !applicationType || !applicationId || !actor || !action) return;
  try {
    await pool.execute(
      `INSERT INTO approval_logs
        (application_type, application_id, actor, actor_role, action, from_status, to_status, comment, target_user, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [applicationType, applicationId, actor, actorRole, action, fromStatus || '', toStatus || '', comment || '', targetUser || '']
    );
  } catch (e) {
    // 审计日志失败不应阻断主流程
    console.error('[approvalLog] 写入失败:', e && e.message ? e.message : e);
  }
}
