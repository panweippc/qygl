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
