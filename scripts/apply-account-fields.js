/**
 * 数据库迁移执行脚本：为 users 表添加账号生命周期/登录异常检测字段
 * 兼容：MySQL 5.7 和 8.0（不使用 ADD COLUMN IF NOT EXISTS，改用 information_schema 判断，幂等）
 * 用法：node scripts/apply-account-fields.js
 * 说明：与 db-add-account-fields.sql 功能等价，但通过 Node 执行，无需 mysql 命令行。
 *       执行完成后脚本会打印结果，且不会残留存储过程。
 */
import 'dotenv/config';
import mysql from 'mysql2/promise';

(async () => {
  let conn;
  try {
    conn = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: Number(process.env.DB_PORT || 3306),
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      multipleStatements: true,
    });

    console.log('=== 数据库迁移：账号生命周期字段 ===');

    // 1. 获取 users 表当前列
    const [cols] = await conn.query(
      `SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users'`
    );
    const existingCols = new Set(cols.map(c => c.COLUMN_NAME));
    console.log('[信息] users 表现有列数:', cols.length);

    // 2. 添加缺失的列（保持顺序）
    const desired = ['lastLoginAt', 'lastLoginIp', 'status'];
    for (let i = 0; i < desired.length; i++) {
      const col = desired[i];
      if (existingCols.has(col)) {
        console.log(`[已存在] users.${col}`);
        continue;
      }
      const prev = i === 0 ? 'password' : desired[i - 1];
      let ddl;
      if (col === 'lastLoginAt') ddl = `ALTER TABLE users ADD COLUMN lastLoginAt DATETIME NULL DEFAULT NULL COMMENT '最后登录时间' AFTER ${prev}`;
      else if (col === 'lastLoginIp') ddl = `ALTER TABLE users ADD COLUMN lastLoginIp VARCHAR(45) NULL DEFAULT NULL COMMENT '最后登录IP' AFTER ${prev}`;
      else ddl = `ALTER TABLE users ADD COLUMN status TINYINT NOT NULL DEFAULT 1 COMMENT '账号状态: 1正常, 0停用' AFTER ${prev}`;
      await conn.query(ddl);
      console.log(`[已添加] users.${col}`);
    }

    // 3. 添加索引（若不存在）
    const [idx] = await conn.query(
      `SELECT INDEX_NAME FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND INDEX_NAME = 'idx_users_lastLoginAt'`
    );
    if (idx.length === 0) {
      await conn.query(`ALTER TABLE users ADD INDEX idx_users_lastLoginAt (lastLoginAt)`);
      console.log('[已添加] 索引 idx_users_lastLoginAt');
    } else {
      console.log('[已存在] 索引 idx_users_lastLoginAt');
    }

    // 4. 初始化存量账号 lastLoginAt（避免首次部署误判长期未登录）
    const [r] = await conn.query(`UPDATE users SET lastLoginAt = NOW() WHERE lastLoginAt IS NULL`);
    console.log('[OK] 初始化 lastLoginAt 影响行数:', r.affectedRows);

    // 5. 最终验证
    const [finalCols] = await conn.query(`SHOW COLUMNS FROM users`);
    console.log('[验证] users 表字段:', finalCols.map(c => c.Field).join(', '));
    console.log('\n✅ 数据库迁移完成（MySQL 5.7/8.0 兼容）');
    process.exit(0);
  } catch (err) {
    console.error('[FATAL]', err.message);
    process.exitCode = 1;
  } finally {
    if (conn) await conn.end();
  }
})();
