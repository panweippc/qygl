import api from './api';
import type { ApiResponse, Project, BusinessTrip } from './types';

export const createProjectApplication = async (data: Project): Promise<ApiResponse> => {
  const response = await api.post('/projects', data);
  return response.data;
};

export const getProjectApplications = async (params?: any): Promise<ApiResponse<{ list: Project[] }>> => {
  const response = await api.get('/projects', { params });
  return response.data;
};

export const getProjectApplication = async (id: number): Promise<ApiResponse<Project>> => {
  const response = await api.get(`/projects/${id}`);
  return response.data;
};

export const approveProject = async (id: number, data: any): Promise<ApiResponse> => {
  const response = await api.post(`/projects/${id}/approve`, data);
  return response.data;
};

export const createBusinessTrip = async (data: BusinessTrip): Promise<ApiResponse> => {
  const response = await api.post('/business-trips', data);
  return response.data;
};

export const getBusinessTrips = async (params?: any): Promise<ApiResponse<BusinessTrip[]>> => {
  const response = await api.get('/business-trips', { params });
  return response.data;
};

export const getBusinessTrip = async (id: number): Promise<ApiResponse<BusinessTrip>> => {
  const response = await api.get(`/business-trips/${id}`);
  return response.data;
};

export const approveBusinessTrip = async (id: number, data: any): Promise<ApiResponse> => {
  const response = await api.post(`/business-trips/${id}/approve`, data);
  return response.data;
};

export const getProcessDefinitions = async (): Promise<ApiResponse> => {
  const response = await api.get('/process-definitions');
  return response.data;
};

export const createProcessDefinition = async (data: any): Promise<ApiResponse> => {
  const response = await api.post('/process-definitions', data);
  return response.data;
};

export const publishProcessDefinition = async (id: number): Promise<ApiResponse> => {
  const response = await api.post(`/process-definitions/${id}/publish`);
  return response.data;
};

export const getTodoTasks = async (employeeId: string): Promise<ApiResponse> => {
  const response = await api.get('/approvals/todo', { params: { employeeId } });
  return response.data;
};

export const getDoneTasks = async (employeeId: string): Promise<ApiResponse> => {
  const response = await api.get('/approvals/done', { params: { employeeId } });
  return response.data;
};

export const startProcessInstance = async (definitionId: number, data: any): Promise<ApiResponse> => {
  const response = await api.post('/process-instances', { definitionId, ...data });
  return response.data;
};

export const getProcessInstance = async (id: number): Promise<ApiResponse> => {
  const response = await api.get(`/process-instances/${id}`);
  return response.data;
};

export const processTask = async (taskId: number, data: any): Promise<ApiResponse> => {
  const response = await api.post(`/tasks/${taskId}/process`, data);
  return response.data;
};

export const transferTask = async (taskId: number, transferTo: string): Promise<ApiResponse> => {
  const response = await api.post(`/tasks/${taskId}/transfer`, { transferTo });
  return response.data;
};
