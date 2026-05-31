import mysql from 'mysql2/promise';

(async () => {
  const pool = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: '123456',
    database: 'qygl'
  });
  
  try {
    const connection = await pool.getConnection();
    
    // 检查用户表中的总经理
    console.log('检查用户表中的总经理...');
    const [users] = await connection.execute('SELECT * FROM users WHERE username = ?', ['总经理']);
    console.log('找到用户:', users.length);
    if (users.length > 0) {
      console.log('用户信息:', users[0]);
    }
    
    // 检查员工表中的总经理
    console.log('检查员工表中的总经理...');
    const [employees] = await connection.execute('SELECT * FROM employees WHERE position = ?', ['总经理']);
    console.log('找到员工:', employees.length);
    if (employees.length > 0) {
      console.log('员工信息:', employees[0]);
    }
    
    connection.release();
    console.log('操作完成');
  } catch (error) {
    console.error('错误:', error);
  } finally {
    await pool.end();
  }
})();