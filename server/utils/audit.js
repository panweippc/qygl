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

export async function createOperationLog(pool, { userId, username, action, module, targetId = null, targetName = null, detail = null, ipAddress = null }) {
  try {
    await pool.execute(
      'INSERT INTO operation_logs (userId, username, action, module, targetId, targetName, detail, ipAddress, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())',
      [userId || '', username || '', action, module, targetId, targetName, detail, ipAddress || '']
    );
  } catch (error) {
    console.error('创建操作日志失败:', error.message);
  }
}
