/**
 * 重新提交（撤回/退回后修改再提交）通用实现
 *
 * 设计要点：
 * - 仅申请人本人可操作，且仅「已撤回 / 已退回 / 草稿」状态允许重新提交
 * - 状态回到待审批（中文表用「待审批」，英文表用 pending），并清空退回理由
 * - 可更新字段通过 INFORMATION_SCHEMA 白名单校验，避免 SQL 注入；
 *   表名与申请人字段由调用方传入（均为代码内常量），不接受外部输入
 */

// 不允许通过重新提交覆盖的字段（流程字段 / 主键 / 审计字段）
const DENY_FIELDS = new Set([
  'id', 'is_deleted', 'status', 'return_reason',
  'created_at', 'createdAt', 'updated_at', 'updatedAt',
  'approval_history', 'current_step', 'current_approvers',
  'result', 'comment'
]);

// 允许重新提交的原始状态
const RESUBMITTABLE_STATUS = ['已撤回', '已退回', '草稿', 'withdrawn', 'draft', 'returned'];

export async function resubmitApplication(pool, { table, id, operator, applicantCol, data, newStatus }) {
  const [[rec]] = await pool.query(`SELECT * FROM ${table} WHERE id = ?`, [id]);
  if (!rec) return { code: 404, message: '申请不存在' };

  const applicantName = rec[applicantCol];
  if (applicantName !== operator) {
    return { code: 403, message: '仅申请人本人可重新提交' };
  }
  if (!RESUBMITTABLE_STATUS.includes(rec.status)) {
    return { code: 400, message: '当前状态不可重新提交' };
  }

  const [columns] = await pool.query(
    'SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?',
    [table]
  );
  const allowed = new Set(columns.map((c) => c.COLUMN_NAME));

  const sets = [];
  const values = [];
  for (const [key, value] of Object.entries(data || {})) {
    if (!allowed.has(key) || DENY_FIELDS.has(key)) continue;
    if (value === undefined) continue;
    sets.push(`${key} = ?`);
    values.push(value !== null && typeof value === 'object' ? JSON.stringify(value) : value);
  }

  sets.push('status = ?', 'return_reason = NULL');
  values.push(newStatus);
  values.push(id);

  await pool.execute(`UPDATE ${table} SET ${sets.join(', ')} WHERE id = ?`, values);
  return { code: 200, message: '重新提交成功' };
}
