import sqlite3 from 'sqlite3';
const db = new sqlite3.Database('project_db.sqlite');

const testData = [
  { projectName: '智能办公系统', projectType: '软件开发', description: '基于Vue3的企业办公管理系统', applicant: '潘伟', createdAt: '2024-01-15' },
  { projectName: '数据分析平台', projectType: '数据服务', description: '企业数据可视化分析平台', applicant: '潘伟', createdAt: '2024-01-16' },
  { projectName: '移动APP开发', projectType: '移动端', description: '企业移动办公APP', applicant: '总经理', createdAt: '2024-01-17' },
  { projectName: 'CRM系统', projectType: '企业软件', description: '客户关系管理系统', applicant: '总经理', createdAt: '2024-01-18' },
  { projectName: 'ERP系统', projectType: '企业软件', description: '企业资源规划系统', applicant: '李经理', createdAt: '2024-01-19' },
  { projectName: '微信小程序', projectType: '移动端', description: '企业微信小程序', applicant: '潘伟', createdAt: '2024-01-20' },
  { projectName: '云存储服务', projectType: '数据服务', description: '企业云存储解决方案', applicant: '李经理', createdAt: '2024-01-21' },
];

let count = 0;
testData.forEach((data, index) => {
  db.run(
    'INSERT INTO project_applications (projectName, projectType, description, applicant, createdAt) VALUES (?, ?, ?, ?, ?)',
    [data.projectName, data.projectType, data.description, data.applicant, data.createdAt],
    function(err) {
      if (err) {
        console.error('插入数据失败:', err.message);
      } else {
        count++;
        console.log(`插入数据 ${count}/${testData.length}: ${data.projectName}`);
      }
      if (index === testData.length - 1) {
        db.close();
        console.log('测试数据添加完成！');
      }
    }
  );
});
