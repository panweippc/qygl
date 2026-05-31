/**
 * 工作流相关API服务
 */

import api from './api';

// 项目申请API
export const createProjectApplication = async (data: any) => {
  const response = await api.post('/projects', data);
  return response.data;
};

export const getProjectApplications = async (params?: any) => {
  const response = await api.get('/projects', { params });
  return response.data;
};

export const getProjectApplication = async (id: number) => {
  const response = await api.get(`/projects/${id}`);
  return response.data;
};

export const approveProject = async (id: number, data: any) => {
  const response = await api.post(`/projects/${id}/approve`, data);
  return response.data;
};

// 出差申请API
export const createBusinessTrip = async (data: any) => {
  const response = await api.post('/business-trips', data);
  return response.data;
};

export const getBusinessTrips = async (params?: any) => {
  const response = await api.get('/business-trips', { params });
  return response.data;
};

export const getBusinessTrip = async (id: number) => {
  const response = await api.get(`/business-trips/${id}`);
  return response.data;
};

export const approveBusinessTrip = async (id: number, data: any) => {
  const response = await api.post(`/business-trips/${id}/approve`, data);
  return response.data;
};

// 流程定义API
export const getProcessDefinitions = async () => {
  const response = await api.get('/process-definitions');
  return response.data;
};

export const createProcessDefinition = async (data: any) => {
  const response = await api.post('/process-definitions', data);
  return response.data;
};

export const publishProcessDefinition = async (id: number) => {
  const response = await api.post(`/process-definitions/${id}/publish`);
  return response.data;
};

// 审批中心API
export const getTodoTasks = async (employeeId: string) => {
  const response = await api.get('/approvals/todo', { params: { employeeId } });
  return response.data;
};

export const getDoneTasks = async (employeeId: string) => {
  const response = await api.get('/approvals/done', { params: { employeeId } });
  return response.data;
};

// 流程实例API
export const startProcessInstance = async (definitionId: number, data: any) => {
  const response = await api.post('/process-instances', { definitionId, ...data });
  return response.data;
};

export const getProcessInstance = async (id: number) => {
  const response = await api.get(`/process-instances/${id}`);
  return response.data;
};

// 任务处理API
export const processTask = async (taskId: number, data: any) => {
  const response = await api.post(`/tasks/${taskId}/process`, data);
  return response.data;
};

export const transferTask = async (taskId: number, transferTo: string) => {
  const response = await api.post(`/tasks/${taskId}/transfer`, { transferTo });
  return response.data;
};
