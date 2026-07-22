import axios from 'axios';
import type {
  ApiResponse, Employee, MonthlyReport, FileItem, FileCategory,
  Project, Tool, Customer, CustomerActivity, ClosingProject,
  LeaveApplication, Reimbursement, Meeting, OfficeSupply,
  Role, Menu, Department, DistributedRecord
} from './types';

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
  const response = await api.post('/login', { username, password });
  const data = response.data;
  if (data && data.user) {
    return data;
  }
  return { success: false, message: '登录失败' };
};

// 员工管理
export const getEmployees = async (): Promise<ApiResponse<Employee[]>> => {
  const response = await api.get('/employees');
  return response.data;
};

export const addEmployee = async (employee: Employee): Promise<ApiResponse> => {
  const response = await api.post('/employees', employee);
  return response.data;
};

export const deleteEmployee = async (name: string): Promise<ApiResponse> => {
  const response = await api.delete(`/employees/${name}`);
  return response.data;
};

export const updateEmployee = async (employee: Employee): Promise<ApiResponse> => {
  const response = await api.put(`/employees/${employee.name}`, employee);
  return response.data;
};

// 月报管理
export const getMonthlyReports = async (): Promise<ApiResponse<MonthlyReport[]>> => {
  const response = await api.get('/monthly-reports');
  return response.data;
};

export const addMonthlyReport = async (report: MonthlyReport): Promise<ApiResponse> => {
  const response = await api.post('/monthly-reports', report);
  return response.data;
};

export const updateMonthlyReport = async (report: MonthlyReport): Promise<ApiResponse> => {
  const response = await api.put(`/monthly-reports/${report.id}`, report);
  return response.data;
};

// 文件分类管理
export const getFileCategories = async (): Promise<ApiResponse<FileCategory[]>> => {
  const response = await api.get('/file-categories');
  return response.data;
};

export const addFileCategory = async (category: FileCategory): Promise<ApiResponse> => {
  const response = await api.post('/file-categories', category);
  return response.data;
};

export const deleteFileCategory = async (id: number): Promise<ApiResponse> => {
  const response = await api.delete(`/file-categories/${id}`);
  return response.data;
};

// 文件管理
export const getFiles = async (): Promise<ApiResponse<FileItem[]>> => {
  const response = await api.get('/files');
  return response.data;
};

export const addFile = async (file: FormData | any): Promise<ApiResponse> => {
  const response = await api.post('/files', file);
  return response.data;
};

export const deleteFile = async (id: number): Promise<ApiResponse> => {
  const response = await api.delete(`/files/${id}`);
  return response.data;
};

// 项目分类管理
export const getProjectCategories = async (): Promise<ApiResponse<Project[]>> => {
  const response = await api.get('/project-categories');
  return response.data;
};

export const addProject = async (project: Project): Promise<ApiResponse> => {
  const response = await api.post('/project-categories', project);
  return response.data;
};

export const addProjectApplication = async (project: Project): Promise<ApiResponse> => {
  const response = await api.post('/projects', project);
  return response.data;
};

export const deleteProjectCategory = async (category: string): Promise<ApiResponse> => {
  const response = await api.delete(`/project-categories/${category}`);
  return response.data;
};

export const updateProjectCategory = async (data: any): Promise<ApiResponse> => {
  const response = await api.put('/project-categories/update-type', data);
  return response.data;
};

// 项目申请管理
export const getProjects = async (): Promise<ApiResponse<{ list: Project[] }>> => {
  const response = await api.get('/projects');
  return response.data;
};

export const updateProject = async (id: number, data: any): Promise<ApiResponse> => {
  const userStr = localStorage.getItem('user');
  const approverId = userStr ? JSON.parse(userStr).id : null;
  const response = await api.post(`/projects/${id}/approve`, {
    action: data.result === '批准' ? 'agree' : 'reject',
    comment: data.comment,
    approverId,
    forwardTo: data.forwardTo || null
  });
  return response.data;
};

export const updateProjectDetail = async (id: number, data: { project_name: string; description: string; project_link: string }): Promise<ApiResponse> => {
  const response = await api.put(`/projects/${id}`, data);
  return response.data;
};

export const updateProjectManager = async (data: { projectType: string; manager: string }): Promise<ApiResponse> => {
  const response = await api.put('/projects/update-manager', data);
  return response.data;
};

export const deleteProject = async (id: number): Promise<ApiResponse> => {
  const response = await api.delete(`/projects/${id}`);
  return response.data;
};

// 出差申请管理
export const getBusinessTrips = async (): Promise<ApiResponse<any[]>> => {
  const response = await api.get('/business-trips');
  return response.data;
};

export const updateBusinessTrip = async (id: number, data: any): Promise<ApiResponse> => {
  const userStr = localStorage.getItem('user');
  const approverId = userStr ? JSON.parse(userStr).id : null;
  const response = await api.post(`/business-trips/${id}/approve`, {
    action: data.result === '批准' ? 'agree' : 'reject',
    comment: data.comment,
    approverId,
    forwardTo: data.forwardTo || null
  });
  return response.data;
};

// 工具管理
export const getTools = async (): Promise<ApiResponse<Tool[]>> => {
  const response = await api.get('/tools');
  return response.data;
};

export const addTool = async (tool: Tool): Promise<ApiResponse> => {
  const response = await api.post('/tools', tool);
  return response.data;
};

export const deleteTool = async (id: number): Promise<ApiResponse> => {
  const response = await api.delete(`/tools/${id}`);
  return response.data;
};

export const updateTool = async (tool: Tool): Promise<ApiResponse> => {
  const response = await api.put(`/tools/${tool.id}`, tool);
  return response.data;
};

// 客户管理
export const getCustomers = async (): Promise<ApiResponse<Customer[]>> => {
  const response = await api.get('/customers');
  return response.data;
};

export const addCustomer = async (customer: Customer): Promise<ApiResponse> => {
  const response = await api.post('/customers', customer);
  return response.data;
};

export const updateCustomer = async (customer: Customer): Promise<ApiResponse> => {
  const response = await api.put(`/customers/${customer.id}`, customer);
  return response.data;
};

export const deleteCustomer = async (id: number): Promise<ApiResponse> => {
  const response = await api.delete(`/customers/${id}`);
  return response.data;
};

// 客户跟进记录
export const getCustomerActivities = async (customerId: number): Promise<ApiResponse<CustomerActivity[]>> => {
  const response = await api.get(`/customer-activities/${customerId}`);
  return response.data;
};

export const addCustomerActivity = async (activity: CustomerActivity): Promise<ApiResponse> => {
  const response = await api.post('/customer-activities', activity);
  return response.data;
};

// 成交项目管理
export const getClosingProjects = async (): Promise<ApiResponse<ClosingProject[]>> => {
  const response = await api.get('/closing-projects');
  return response.data;
};

// 请假申请管理
export const getLeaveApplications = async (): Promise<ApiResponse<LeaveApplication[]>> => {
  const response = await api.get('/leave-applications');
  return response.data;
};

export const addLeaveApplication = async (application: LeaveApplication): Promise<ApiResponse> => {
  const response = await api.post('/leave-applications', application);
  return response.data;
};

export const updateLeaveApplication = async (id: number, data: Partial<LeaveApplication>): Promise<ApiResponse> => {
  const response = await api.put(`/leave-applications/${id}`, data);
  return response.data;
};

export const getPendingLeaveApplications = async (approver: string): Promise<ApiResponse<LeaveApplication[]>> => {
  const response = await api.get(`/leave-applications/pending/${approver}`);
  return response.data;
};

// 报销管理
export const getReimbursements = async (): Promise<ApiResponse<Reimbursement[]>> => {
  const response = await api.get('/reimbursements');
  return response.data;
};

export const addReimbursement = async (data: Reimbursement): Promise<ApiResponse> => {
  const response = await api.post('/reimbursements', data);
  return response.data;
};

export const updateReimbursement = async (id: number, data: Partial<Reimbursement>): Promise<ApiResponse> => {
  const response = await api.put(`/reimbursements/${id}`, data);
  return response.data;
};

export const getPendingReimbursements = async (approver: string): Promise<ApiResponse<Reimbursement[]>> => {
  const response = await api.get(`/reimbursements/pending/${approver}`);
  return response.data;
};

// 会议管理
export const getMeetings = async (): Promise<ApiResponse<Meeting[]>> => {
  const response = await api.get('/meetings');
  return response.data;
};

export const addMeeting = async (data: Meeting): Promise<ApiResponse> => {
  const response = await api.post('/meetings', data);
  return response.data;
};

export const updateMeeting = async (id: number, data: Partial<Meeting>): Promise<ApiResponse> => {
  const response = await api.put(`/meetings/${id}`, data);
  return response.data;
};

export const getPendingMeetings = async (approver: string): Promise<ApiResponse<Meeting[]>> => {
  const response = await api.get(`/meetings/pending/${approver}`);
  return response.data;
};

// 办公用品申请
export const getOfficeSupplies = async (): Promise<ApiResponse<OfficeSupply[]>> => {
  const response = await api.get('/office-supplies');
  return response.data;
};

export const addOfficeSupply = async (data: OfficeSupply): Promise<ApiResponse> => {
  const response = await api.post('/office-supplies', data);
  return response.data;
};

export const updateOfficeSupply = async (id: number, data: Partial<OfficeSupply>): Promise<ApiResponse> => {
  const response = await api.put(`/office-supplies/${id}`, data);
  return response.data;
};

export const getPendingOfficeSupplies = async (approver: string): Promise<ApiResponse<OfficeSupply[]>> => {
  const response = await api.get(`/office-supplies/pending/${approver}`);
  return response.data;
};

// 角色管理
export const getRoles = async (): Promise<ApiResponse<Role[]>> => {
  const response = await api.get('/roles');
  return response.data;
};

export const getRoleById = async (id: number): Promise<ApiResponse<Role>> => {
  const response = await api.get(`/roles/${id}`);
  return response.data;
};

export const addRole = async (role: Role): Promise<ApiResponse> => {
  const response = await api.post('/roles', role);
  return response.data;
};

export const updateRole = async (id: number, role: Partial<Role>): Promise<ApiResponse> => {
  const response = await api.put(`/roles/${id}`, role);
  return response.data;
};

export const deleteRole = async (id: number): Promise<ApiResponse> => {
  const response = await api.delete(`/roles/${id}`);
  return response.data;
};

// 部门管理
export const getDepartments = async (): Promise<ApiResponse<Department[]>> => {
  const response = await api.get('/departments');
  return response.data;
};

// 菜单管理
export const getMenus = async (): Promise<ApiResponse<Menu[]>> => {
  const response = await api.get('/menus');
  return response.data;
};

export const getMenuById = async (id: number): Promise<ApiResponse<Menu>> => {
  const response = await api.get(`/menus/${id}`);
  return response.data;
};

export const addMenu = async (menu: Menu): Promise<ApiResponse> => {
  const response = await api.post('/menus', menu);
  return response.data;
};

export const updateMenu = async (id: number, menu: Partial<Menu>): Promise<ApiResponse> => {
  const response = await api.put(`/menus/${id}`, menu);
  return response.data;
};

export const deleteMenu = async (id: number): Promise<ApiResponse> => {
  const response = await api.delete(`/menus/${id}`);
  return response.data;
};

// 角色权限管理
export const getRolePermissions = async (roleId: number): Promise<ApiResponse<number[]>> => {
  const response = await api.get(`/roles/${roleId}/permissions`);
  return response.data;
};

export const assignRolePermissions = async (roleId: number, menuIds: number[]): Promise<ApiResponse> => {
  const response = await api.post(`/roles/${roleId}/permissions`, { menuIds });
  return response.data;
};

// 下发记录管理
export const getDistributedRecords = async (targetUser: string): Promise<ApiResponse<DistributedRecord[]>> => {
  const response = await api.get(`/distributed-records/user/${targetUser}`);
  return response.data;
};

export const getAllDistributedRecords = async (): Promise<ApiResponse<DistributedRecord[]>> => {
  const response = await api.get('/distributed-records');
  return response.data;
};

export const addDistributedRecord = async (data: DistributedRecord): Promise<ApiResponse> => {
  const response = await api.post('/distributed-records', data);
  return response.data;
};

export const updateDistributedRecord = async (id: number, data: Partial<DistributedRecord>): Promise<ApiResponse> => {
  const response = await api.put(`/distributed-records/${id}`, data);
  return response.data;
};

// 业务招待费管理
export const getEntertainmentExpenses = async (): Promise<ApiResponse<any[]>> => {
  const response = await api.get('/entertainment-expenses');
  return response.data;
};

export const addEntertainmentExpense = async (data: any): Promise<ApiResponse> => {
  const response = await api.post('/entertainment-expenses', data);
  return response.data;
};

export const updateEntertainmentExpense = async (id: number, data: any): Promise<ApiResponse> => {
  const response = await api.put(`/entertainment-expenses/${id}`, data);
  return response.data;
};

// ==================== 多级 OA 审批工作流 ====================

export const getOaFlows = async (): Promise<ApiResponse<import('./types').OaFlow[]>> => {
  const response = await api.get('/oa/flows');
  return response.data;
};

export const getOaTodoList = async (userId: number): Promise<ApiResponse<import('./types').OaApprovalInstance[]>> => {
  const response = await api.get(`/oa/todo/${userId}`);
  return response.data;
};

export const getOaDoneList = async (userId: number): Promise<ApiResponse<any[]>> => {
  const response = await api.get(`/oa/done/${userId}`);
  return response.data;
};

export const getOaMyApplications = async (userId: number): Promise<ApiResponse<import('./types').OaApprovalInstance[]>> => {
  const response = await api.get(`/oa/my-applications/${userId}`);
  return response.data;
};

export const getOaDetail = async (instanceId: number): Promise<ApiResponse<{ instance: import('./types').OaApprovalInstance; history: import('./types').OaApprovalHistory[] }>> => {
  const response = await api.get(`/oa/detail/${instanceId}`);
  return response.data;
};

export const submitOaApplication = async (data: {
  flowCode: string
  applicantId: number
  applicantName: string
  applicantDept: string
  applicantPosition: string
  businessType: string
  businessData: any
}): Promise<ApiResponse<{ instanceId: number; approvalPath: any[]; currentApprover: any }>> => {
  const response = await api.post('/oa/submit', data);
  return response.data;
};

export const processOaApproval = async (data: {
  instanceId: number
  approverId: number
  approverName: string
  approverPosition: string
  action: string
  comment: string
}): Promise<ApiResponse> => {
  const response = await api.post('/oa/process', data);
  return response.data;
};

export const withdrawOaApplication = async (instanceId: number, applicantId: number): Promise<ApiResponse> => {
  const response = await api.post('/oa/withdraw', { instanceId, applicantId });
  return response.data;
};

export const getOaApproverConfigs = async (): Promise<ApiResponse<import('./types').Employee[]>> => {
  const response = await api.get('/oa/approver-configs');
  return response.data;
};

// 销售目标管理
export const getSalesTargets = async (year?: number, month?: number): Promise<ApiResponse<any[]>> => {
  const response = await api.get('/sales-targets', { params: { year, month } });
  return response.data;
};

export const updateSalesTargets = async (targets: any[]): Promise<ApiResponse> => {
  const response = await api.put('/sales-targets', { targets });
  return response.data;
};

export default api;
