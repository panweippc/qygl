export async function createNotification(pool, { userId, title, content, type = 'system', relatedId = null, relatedType = null }) {
  try {
    await pool.execute(
      'INSERT INTO notifications (userId, title, content, type, relatedId, relatedType, isRead, createdAt) VALUES (?, ?, ?, ?, ?, ?, 0, NOW())',
      [userId, title, content || '', type, relatedId, relatedType]
    );
  } catch (error) {
    console.error('创建通知失败:', error.message);
  }
}

export async function createOperationLog(pool, { userId, username, action, module, targetId = null, targetName = null, detail = null, ipAddress = null, beforeValue = null, afterValue = null }) {
  try {
    // 变更前后值仅记录关键字段，避免超长；转成 JSON 字符串存储
    const serialize = (v) => {
      if (v === null || v === undefined) return null;
      try { return typeof v === 'string' ? v : JSON.stringify(v); } catch (e) { return String(v); }
    };
    await pool.execute(
      'INSERT INTO operation_logs (userId, username, action, module, targetId, targetName, detail, beforeValue, afterValue, ipAddress, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())',
      [userId || '', username || '', action, module, targetId, targetName, detail, serialize(beforeValue), serialize(afterValue), ipAddress || '']
    );
  } catch (error) {
    console.error('创建操作日志失败:', error.message);
  }
}

/**
 * 获取真实操作人：优先取登录态（token），退回请求体/查询参数中的指定字段
 * 修复"操作人显示为系统"问题——很多接口直接取 req.body.operator 导致前端不传就显示"系统"
 * @param {object} req express 请求对象
 * @returns {string} 操作人姓名
 */
export function getOperator(req) {
  const fromUser = req.user?.name || req.user?.username;
  if (fromUser) return fromUser;
  // 退回请求体/查询参数中的常见操作人字段
  const fallback = req.body?.operator || req.query?.operator || req.body?.username || req.body?.applicant || req.query?.username;
  return fallback || '系统';
}

/**
 * 更新前获取记录旧值快照（供数据变更审计用）
 * @param {object} pool 连接池
 * @param {string} table 表名
 * @param {string|number} id 主键
 * @param {object} [fields] 要提取的字段白名单，如 {title:1, content:1}；不传则取全部字段
 * @returns {object|null} 旧值快照
 */
export async function getRecordBefore(pool, table, id, fields) {
  try {
    if (!pool || !table || id === undefined || id === null) return null;
    const [rows] = await pool.execute(`SELECT * FROM \`${table}\` WHERE id = ?`, [id]);
    if (rows.length === 0) return null;
    const row = rows[0];
    if (!fields) return { ...row };
    const out = {};
    Object.keys(fields).forEach(k => { if (k in row) out[k] = row[k]; });
    return out;
  } catch (e) {
    console.error('获取变更前记录失败:', e.message);
    return null;
  }
}

/**
 * 通用"数据变更审计"：写入 before/after 对比日志
 * 用法：更新前用 getRecordBefore 取旧值，更新后用本函数写入日志。
 * @param {object} pool 连接池
 * @param {object} opts
 * @param {string} opts.module 模块名
 * @param {string} opts.username 操作者
 * @param {string|number} opts.targetId 对象ID
 * @param {string} opts.targetName 对象名称
 * @param {object} opts.beforeValue 变更前的值（getRecordBefore 的返回值）
 * @param {object} opts.afterValue 变更后的值
 * @param {string} opts.action 动作，默认 update
 * @param {string} opts.ipAddress 来源IP
 */
export async function logDataChange(pool, { module, action = 'update', username, targetId, targetName, beforeValue, afterValue, ipAddress }) {
  try {
    await createOperationLog(pool, {
      userId: null,
      username: username || '系统',
      action,
      module,
      targetId,
      targetName: targetName || '',
      detail: `数据变更: ${targetName || module} (ID: ${targetId})`,
      ipAddress: ipAddress || '',
      beforeValue,
      afterValue: afterValue || null
    });
  } catch (error) {
    console.error('记录数据变更日志失败:', error.message);
  }
}

/**
 * 清理过期的操作日志，防止数据无限膨胀
 * @param {number} days 保留天数，默认 90 天
 */
export async function cleanupOldLogs(pool, days = 90) {
  try {
    const [r] = await pool.execute('DELETE FROM operation_logs WHERE createdAt < DATE_SUB(NOW(), INTERVAL ? DAY)', [days]);
    console.log(`[audit] 清理 ${days} 天前的操作日志，共删除 ${r.affectedRows} 条`);
  } catch (error) {
    console.error('清理操作日志失败:', error.message);
  }
}
