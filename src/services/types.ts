export interface ApiResponse<T = any> {
  success: boolean
  data: T
  message?: string
  total?: number
}

export interface Employee {
  id?: number
  name: string
  department: string
  position: string
  phone?: string
  email?: string
  status?: string
  roleId?: number
}

export interface Department {
  id: number
  name: string
  description?: string
}

export interface MonthlyReport {
  id?: number
  title: string
  content: string
  author: string
  week?: string
  createdAt?: string
}

export interface FileCategory {
  id: number
  name: string
  description?: string
}

export interface FileItem {
  id: number
  fileName: string
  category: string
  categoryId: number
  filePath?: string
  fileSize?: number
  uploader?: string
  createdAt?: string
}

export interface ProjectCategory {
  id: number
  name: string
  description?: string
}

export interface Project {
  id: number
  name: string
  projectType?: string
  project_type?: string
  description?: string
  status?: string
  applicant?: string
  createdAt?: string
}

export interface Tool {
  id: number
  name: string
  category: string
  quantity?: number
  status?: string
}

export interface Customer {
  id: number
  name: string
  phone?: string
  company?: string
  createdAt?: string
}

export interface CustomerActivity {
  id: number
  customerId: number
  content: string
  createdAt?: string
}

export interface SalesFunnel {
  id: number
  stage: string
  customerName: string
  amount?: number
  probability?: number
}

export interface CitySales {
  id: number
  cityName: string
  amount?: number
  year?: number
}

export interface CountySales {
  id: number
  cityId: number
  countyName: string
  amount?: number
}

export interface TownSales {
  id: number
  countyId: number
  townName: string
  amount?: number
}

export interface LeaveApplication {
  id: number
  applicant: string
  leaveType?: string
  startDate?: string
  endDate?: string
  reason?: string
  status?: string
  approver?: string
  createdAt?: string
}

export interface Reimbursement {
  id: number
  applicant: string
  type?: string
  amount?: number
  description?: string
  status?: string
  approver?: string
  createdAt?: string
}

export interface Meeting {
  id: number
  title: string
  applicant: string
  startTime?: string
  endTime?: string
  location?: string
  participants?: string
  status?: string
  approver?: string
  createdAt?: string
}

export interface OfficeSupply {
  id: number
  applicant: string
  itemName: string
  quantity?: number
  reason?: string
  status?: string
  approver?: string
  createdAt?: string
}

export interface ClosingProject {
  id: number
  name: string
  dealTime?: string
  amount?: number
  status?: string
}

export interface BusinessTrip {
  id: number
  applicant: string
  destination?: string
  startDate?: string
  endDate?: string
  purpose?: string
  status?: string
  approver?: string
  createdAt?: string
}

export interface Province {
  id: number
  name: string
  code?: string
}

export interface City {
  id: number
  provinceId: number
  name: string
  code?: string
}

export interface County {
  id: number
  cityId: number
  name: string
  code?: string
}

export interface CountyProject {
  id: number
  countyId: number
  name: string
  description?: string
  status?: string
  price?: number
  dealTime?: string
  serviceEndTime?: string
  nextYearFeeStatus?: string
  contractFeeStatus?: string
  remainingAmount?: number
}

export interface Role {
  id: number
  name: string
  code: string
  description?: string
  status?: string
}

export interface Menu {
  id: number
  parentId: number
  name: string
  path: string
  component?: string
  icon?: string
  sort?: number
  status?: string
  children?: Menu[]
}

export interface User {
  id: number
  name: string
  department: string
  position: string
  roleId?: number
  phone?: string
  email?: string
  status?: string
}

export interface DistributedRecord {
  id: number
  applicationId: number
  applicationType: string
  targetUser: string
  comment?: string
  status?: string
  createdAt?: string
}

export interface ApprovalStats {
  pending: number
  approved: number
  rejected: number
  total: number
}

export interface OaApprovalPathNode {
  order: number
  type: string
  position: string
  name: string
  userId: number
}

export interface OaApprovalInstance {
  id: number
  flowCode: string
  applicantId: number
  applicantName: string
  applicantDept: string
  applicantPosition: string
  businessType: string
  businessData: any
  currentApproverType: string | null
  currentApproverId: number | null
  currentApproverName: string | null
  approvalPath: OaApprovalPathNode[] | string
  status: string
  createdAt: string
  completedAt: string | null
}

export interface OaApprovalHistory {
  id: number
  instanceId: number
  nodeOrder: number
  approverType: string
  approverId: number
  approverName: string
  approverPosition: string
  action: string
  comment: string | null
  createdAt: string
}

export interface OaFlow {
  id: number
  flowCode: string
  flowName: string
  description: string | null
  status: string
}
