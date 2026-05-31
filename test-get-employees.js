import axios from 'axios';

async function testGetEmployees() {
  try {
    const response = await axios.get('http://localhost:3001/api/employees');
    console.log('获取员工数据成功:', response.data);
    console.log('员工数量:', response.data.data.length);
    console.log('员工数据:', response.data.data);
  } catch (error) {
    console.error('获取员工数据失败:', error.response ? error.response.data : error.message);
  }
}

testGetEmployees();