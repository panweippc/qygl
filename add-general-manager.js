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
    console.log('检查员工表中的总经理...');
    
    const [employees] = await connection.execute('SELECT * FROM employees WHERE position = ?', ['总经理']);
    console.log('找到总经理:', employees.length);
    
    if (employees.length === 0) {
      console.log('添加总经理员工...');
      await connection.execute(
        'INSERT INTO employees (name, department, position, email, phone, entryDate, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)',
        ['总经理', '管理部门', '总经理', 'general@manager.com', '13800138000', new Date().toISOString().slice(0, 19).replace('T', ' '), new Date().toISOString().slice(0, 19).replace('T', ' ')]
      );
      console.log('总经理添加成功');
      
      // 为总经理创建用户账户
      const [users] = await connection.execute('SELECT * FROM users WHERE username = ?', ['总经理']);
      if (users.length === 0) {
        await connection.execute(
          'INSERT INTO users (username, password, createdAt) VALUES (?, ?, ?)',
          ['总经理', '123456', new Date().toISOString().slice(0, 19).replace('T', ' ')]
        );
        console.log('总经理用户账户创建成功');
      }
    }
    
    connection.release();
    console.log('操作完成');
  } catch (error) {
    console.error('错误:', error);
  } finally {
    await pool.end();
  }
})();