import axios from 'axios';

// 测试添加员工
async function testAddEmployee() {
  try {
    const response = await axios.post('http://localhost:3002/api/employees', {
      name: '李四',
      department: '市场部',
      position: '经理',
      email: 'lisi@example.com',
      phone: '13900139000',
      entryDate: '2026-03-01',
      password: '123456'
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    console.log('添加员工成功:', response.data);
    return response.data.data;
  } catch (error) {
    console.error('添加员工失败:', error);
    return null;
  }
}

// 测试使用员工姓名登录
async function testLoginWithName(employeeName) {
  try {
    const response = await axios.post('http://localhost:3002/api/login', {
      username: employeeName,
      password: '123456'
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    console.log('使用员工姓名登录成功:', response.data);
  } catch (error) {
    console.error('使用员工姓名登录失败:', error);
  }
}

// 运行测试
testAddEmployee().then(employee => {
  if (employee) {
    testLoginWithName(employee.name);
  }
});