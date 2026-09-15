// return_history 工具：把一次退回结构化地追加到申请的 return_history(JSON) 字段。
// 依次记录 { returnedBy(退回人), reason(理由), returnedAt(时间) }，
// 让申请人在多审批人场景下能清晰看到「是谁、何时、因何」退回。
// 同时保留单行 return_reason 字段（取最新一条退回理由），兼容既有逻辑。

/**
 * 向指定申请表追加一条退回记录
 * @param {object} pool         mysql 连接池
 * @param {string} table        表名
 * @param {number|string} id    申请 id
 * @param {string} returnedBy   退回人姓名（operator）
 * @param {string} reason       退回理由
 */
export async function appendReturnHistory(pool, table, id, returnedBy, reason) {
  const [[rec]] = await pool.query(`SELECT return_history FROM \`${table}\` WHERE id = ?`, [id]);
  let history = [];
  if (rec && rec.return_history) {
    try {
      history = JSON.parse(rec.return_history);
    } catch (e) {
      history = [];
    }
  }
  if (!Array.isArray(history)) history = [];
  history.push({ returnedBy, reason, returnedAt: new Date().toISOString() });
  await pool.execute(`UPDATE \`${table}\` SET return_history = ? WHERE id = ?`, [JSON.stringify(history), id]);
}
