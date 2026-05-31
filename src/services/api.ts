import axios from 'axios';

// 使用相对路径，这样在任何电脑上都能正确连接到后端服务器
const api = axios.create({
  baseURL: '/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json; charset=utf-8',
    'Accept': 'application/json'
  }
});

// 认证相关
export const login = async (username: string, password: string) => {
  try {
    console.log('API Login called with:', username, password);
    // 使用api实例发送请求，确保使用正确的代理配置
    const response = await api.post('/login', { username, password });
    console.log('API response status:', response.status);
    const data = response.data;
    console.log('API response data:', data);
    // 确保返回的数据格式正确
    if (data && data.user) {
      return data;
    } else {
      return { success: false, message: '登录失败' };
    }
  } catch (error) {
    console.error('API Login error:', error);
    throw error;
  }
};

// 员工管理
export const getEmployees = async () => {
  const response = await api.get('/employees');
  return response.data;
};

export const addEmployee = async (employee: any) => {
  const response = await api.post('/employees', employee);
  return response.data;
};

export const deleteEmployee = async (name: string) => {
  const response = await api.delete(`/employees/${name}`);
  return response.data;
};

export const updateEmployee = async (employee: any) => {
  const response = await api.put(`/employees/${employee.name}`, employee);
  return response.data;
};

// 周报管理
export const getWeeklyReports = async () => {
  const response = await api.get('/weekly-reports');
  return response.data;
};

export const addWeeklyReport = async (report: any) => {
  const response = await api.post('/weekly-reports', report);
  return response.data;
};

export const updateWeeklyReport = async (report: any) => {
  const response = await api.put(`/weekly-reports/${report.id}`, report);
  return response.data;
};

// 文件分类管理
export const getFileCategories = async () => {
  const response = await api.get('/file-categories');
  return response.data;
};

export const addFileCategory = async (category: any) => {
  const response = await api.post('/file-categories', category);
  return response.data;
};

export const deleteFileCategory = async (id: number) => {
  const response = await api.delete(`/file-categories/${id}`);
  return response.data;
};

// 文件管理
export const getFiles = async () => {
  const response = await api.get('/files');
  return response.data;
};

export const addFile = async (file: any) => {
  const response = await api.post('/files', file);
  return response.data;
};

export const deleteFile = async (id: number) => {
  const response = await api.delete(`/files/${id}`);
  return response.data;
};

// 聊天管理
export const getChats = async () => {
  const response = await api.get('/chats');
  return response.data;
};

export const addMessage = async (message: any) => {
  const response = await api.post('/messages', message);
  return response.data;
};

// 项目分类管理
export const getProjectCategories = async () => {
  const response = await api.get('/project-categories');
  return response.data;
};

export const addProject = async (project: any) => {
  const response = await api.post('/project-categories', project);
  return response.data;
};

export const addProjectApplication = async (project: any) => {
  const response = await api.post('/projects', project);
  return response.data;
};

export const deleteProjectCategory = async (category: string) => {
  const response = await api.delete(`/project-categories/${category}`);
  return response.data;
};
// 项目分类管理
export const updateProjectCategory = async (data: any) => {
  const response = await api.put('/project-categories/update-type', data);
  return response.data;
};

// 项目申请管理
export const getProjects = async () => {
  const response = await api.get('/projects');
  return response.data;
};

export const updateProject = async (id: number, data: any) => {
  const response = await api.post(`/projects/${id}/approve`, {
    action: data.result === '批准' ? 'agree' : 'reject',
    comment: data.comment,
    approverId: localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')).id : null
  });
  return response.data;
};

export const deleteProject = async (id: number) => {
  const response = await api.delete(`/projects/${id}`);
  return response.data;
};

// 出差申请管理
export const getBusinessTrips = async () => {
  const response = await api.get('/business-trips');
  return response.data;
};

export const updateBusinessTrip = async (id: number, data: any) => {
  const response = await api.post(`/business-trips/${id}/approve`, {
    action: data.result === '批准' ? 'agree' : 'reject',
    comment: data.comment,
    approverId: localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')).id : null
  });
  return response.data;
};

// 工具管理
export const getTools = async () => {
  const response = await api.get('/tools');
  return response.data;
};

export const addTool = async (tool: any) => {
  const response = await api.post('/tools', tool);
  return response.data;
};

export const deleteTool = async (id: number) => {
  const response = await api.delete(`/tools/${id}`);
  return response.data;
};

export const updateTool = async (tool: any) => {
  console.log('调用updateTool API:', tool);
  try {
    const response = await api.put(`/tools/${tool.id}`, tool);
    console.log('updateTool API响应:', response.data);
    return response.data;
  } catch (error) {
    console.error('updateTool API错误:', error);
    throw error;
  }
};

// 客户管理
export const getCustomers = async () => {
  const response = await api.get('/customers');
  return response.data;
};

export const addCustomer = async (customer: any) => {
  const response = await api.post('/customers', customer);
  return response.data;
};

export const updateCustomer = async (customer: any) => {
  const response = await api.put(`/customers/${customer.id}`, customer);
  return response.data;
};

export const deleteCustomer = async (id: number) => {
  const response = await api.delete(`/customers/${id}`);
  return response.data;
};

// 客户跟进记录
export const getCustomerActivities = async (customerId: number) => {
  const response = await api.get(`/customer-activities/${customerId}`);
  return response.data;
};

export const addCustomerActivity = async (activity: any) => {
  const response = await api.post('/customer-activities', activity);
  return response.data;
};

// 成交项目管理
export const getClosingProjects = async () => {
  const response = await api.get('/closing-projects');
  return response.data;
};

// 请假申请管理
export const getLeaveApplications = async () => {
  const response = await api.get('/leave-applications');
  return response.data;
};

export const addLeaveApplication = async (application: any) => {
  const response = await api.post('/leave-applications', application);
  return response.data;
};

export const updateLeaveApplication = async (id: number, data: any) => {
  const response = await api.put(`/leave-applications/${id}`, data);
  return response.data;
};

export const getPendingLeaveApplications = async (approver: string) => {
  const response = await api.get(`/leave-applications/pending/${approver}`);
  return response.data;
};

// 报销管理API
export const getReimbursements = async () => {
  const response = await api.get('/reimbursements');
  return response.data;
};

export const addReimbursement = async (data: any) => {
  const response = await api.post('/reimbursements', data);
  return response.data;
};

export const updateReimbursement = async (id: number, data: any) => {
  const response = await api.put(`/reimbursements/${id}`, data);
  return response.data;
};

export const getPendingReimbursements = async (approver: string) => {
  const response = await api.get(`/reimbursements/pending/${approver}`);
  return response.data;
};

// 会议管理API
export const getMeetings = async () => {
  const response = await api.get('/meetings');
  return response.data;
};

export const addMeeting = async (data: any) => {
  const response = await api.post('/meetings', data);
  return response.data;
};

export const updateMeeting = async (id: number, data: any) => {
  const response = await api.put(`/meetings/${id}`, data);
  return response.data;
};

export const getPendingMeetings = async (approver: string) => {
  const response = await api.get(`/meetings/pending/${approver}`);
  return response.data;
};

// 办公用品申请API
export const getOfficeSupplies = async () => {
  const response = await api.get('/office-supplies');
  return response.data;
};

export const addOfficeSupply = async (data: any) => {
  const response = await api.post('/office-supplies', data);
  return response.data;
};

export const updateOfficeSupply = async (id: number, data: any) => {
  const response = await api.put(`/office-supplies/${id}`, data);
  return response.data;
};

export const getPendingOfficeSupplies = async (approver: string) => {
  const response = await api.get(`/office-supplies/pending/${approver}`);
  return response.data;
};

// 角色管理
export const getRoles = async () => {
  const response = await api.get('/roles');
  return response.data;
};

// 部门管理
export const getDepartments = async () => {
  const response = await api.get('/departments');
  return response.data;
};

export const getRoleById = async (id: number) => {
  const response = await api.get(`/roles/${id}`);
  return response.data;
};

export const addRole = async (role: any) => {
  const response = await api.post('/roles', role);
  return response.data;
};

export const updateRole = async (id: number, role: any) => {
  const response = await api.put(`/roles/${id}`, role);
  return response.data;
};

export const deleteRole = async (id: number) => {
  const response = await api.delete(`/roles/${id}`);
  return response.data;
};

// 菜单管理
export const getMenus = async () => {
  const response = await api.get('/menus');
  return response.data;
};

export const getMenuById = async (id: number) => {
  const response = await api.get(`/menus/${id}`);
  return response.data;
};

export const addMenu = async (menu: any) => {
  const response = await api.post('/menus', menu);
  return response.data;
};

export const updateMenu = async (id: number, menu: any) => {
  const response = await api.put(`/menus/${id}`, menu);
  return response.data;
};

export const deleteMenu = async (id: number) => {
  const response = await api.delete(`/menus/${id}`);
  return response.data;
};

// 角色权限管理
export const getRolePermissions = async (roleId: number) => {
  const response = await api.get(`/roles/${roleId}/permissions`);
  return response.data;
};

export const assignRolePermissions = async (roleId: number, menuIds: number[]) => {
  const response = await api.post(`/roles/${roleId}/permissions`, { menuIds });
  return response.data;
};

// 下发记录管理
export const getDistributedRecords = async (targetUser: string) => {
  const response = await api.get(`/distributed-records/user/${targetUser}`);
  return response.data;
};

// 获取所有下发记录（管理员用）
export const getAllDistributedRecords = async () => {
  const response = await api.get('/distributed-records');
  return response.data;
};

export const addDistributedRecord = async (data: any) => {
  const response = await api.post('/distributed-records', data);
  return response.data;
};

export const updateDistributedRecord = async (id: number, data: any) => {
  const response = await api.put(`/distributed-records/${id}`, data);
  return response.data;
};

export default api;