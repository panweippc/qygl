import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import LoginView from '../views/LoginView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: LoginView
    },
    {
      path: '/',
      name: 'home',
      component: HomeView
    },
    {
      path: '/monthly-report',
      name: 'monthly-report',
      component: () => import('../views/MonthlyReportView.vue')
    },
    {
      path: '/employee-management',
      name: 'employee-management',
      component: () => import('../views/EmployeeManagementView.vue')
    },
    {
      path: '/file-storage',
      name: 'file-storage',
      component: () => import('../views/FileStorageView.vue')
    },
    {
      path: '/project-category',
      name: 'project-category',
      component: () => import('../views/ProjectCategoryView.vue')
    },
    {
      path: '/tool-inventory',
      name: 'tool-inventory',
      component: () => import('../views/ToolInventoryView.vue')
    },
    {
      path: '/monthly-report-history',
      name: 'monthly-report-history',
      component: () => import('../views/MonthlyReportHistoryView.vue')
    },
    {
      path: '/closing-project',
      name: 'closing-project',
      component: () => import('../views/ProjectClassificationView.vue')
    },
    {
      path: '/sales-funnel',
      name: 'sales-funnel',
      component: () => import('../views/SalesFunnelView.vue')
    },
    {
      path: '/customer-management',
      name: 'customer-management',
      component: () => import('../views/CustomerManagementView.vue')
    },
    {
      path: '/sales-opportunity',
      name: 'sales-opportunity',
      component: () => import('../views/SalesOpportunityView.vue')
    },
    {
      path: '/sales-target',
      name: 'sales-target',
      component: () => import('../views/SalesTargetView.vue')
    },
    {
      path: '/knowledge-base',
      name: 'knowledge-base',
      component: () => import('../views/KnowledgeBaseView.vue')
    },
    {
      path: '/oa-office',
      name: 'oa-office',
      component: () => import('../views/OAWorkflowView.vue')
    },
    {
      path: '/oa-workflow',
      name: 'oa-workflow',
      component: () => import('../views/OAWorkflowView.vue')
    },
    {
      path: '/leave-application',
      name: 'leave-application',
      component: () => import('../views/LeaveApplicationView.vue')
    },
    {
      path: '/reimbursement',
      name: 'reimbursement',
      component: () => import('../views/ReimbursementView.vue')
    },
    {
      path: '/meeting-management',
      name: 'meeting-management',
      component: () => import('../views/MeetingManagementView.vue')
    },
    {
      path: '/office-supplies',
      name: 'office-supplies',
      component: () => import('../views/OfficeSuppliesView.vue')
    },
    {
      path: '/system',
      name: 'system-management',
      component: () => import('../views/SystemManagementView.vue')
    },
    {
      path: '/city-sales/:cityName',
      name: 'city-sales',
      component: () => import('../views/CitySalesDetailView.vue')
    },
    {
      path: '/city-sales/:cityName/:countyName',
      name: 'county-detail',
      component: () => import('../views/CountyDetailView.vue')
    },
    {
      path: '/town-detail/:cityName/:countyName/:townName',
      name: 'town-detail',
      component: () => import('../views/TownDetailView.vue')
    },
    {
      path: '/project-detail/:id',
      name: 'project-detail',
      component: () => import('../views/ProjectDetailView.vue')
    },
    {
      path: '/oa/project-apply',
      name: 'project-apply',
      component: () => import('../views/ProjectApplicationView.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/oa/project-apply/list',
      name: 'project-list',
      component: () => import('../views/ProjectListView.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/oa/business-trip',
      name: 'business-trip',
      component: () => import('../views/BusinessTripView.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/oa/business-trip/list',
      name: 'business-trip-list',
      component: () => import('../views/BusinessTripListView.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/message-center',
      name: 'message-center',
      component: () => import('../views/MessageCenterView.vue')
    },
    {
      path: '/operation-log',
      name: 'operation-log',
      component: () => import('../views/OperationLogView.vue')
    },
    {
      path: '/security-alerts',
      name: 'security-alerts',
      component: () => import('../views/SecurityAlertView.vue')
    },
    {
      path: '/oa/leave-apply',
      name: 'leave-apply',
      component: () => import('../views/LeaveApplicationPage.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/oa/reimbursement-apply',
      name: 'reimbursement-apply',
      component: () => import('../views/ReimbursementApplicationPage.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/oa/meeting-apply',
      name: 'meeting-apply',
      component: () => import('../views/MeetingApplicationPage.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/oa/entertainment-apply',
      name: 'entertainment-apply',
      component: () => import('../views/EntertainmentApplyPage.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/profile',
      name: 'profile',
      component: () => import('../views/ProfileView.vue')
    },
    {
      path: '/change-password',
      name: 'change-password',
      component: () => import('../views/ChangePasswordView.vue')
    }
  ]
})

// 本地解析 JWT，检查是否过期
function isTokenExpired(token: string): boolean {
  try {
    const payload = token.split('.')[1]
    if (!payload) return true
    const decoded = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')))
    if (!decoded.exp) return false
    return Date.now() >= decoded.exp * 1000
  } catch {
    return true // 无法解析视为无效
  }
}

router.beforeEach((to, from, next) => {
  const token = localStorage.getItem('token')
  const isPublic = to.path === '/login'
  // 未登录或 token 已过期 → 跳转登录页
  if (!isPublic && (!token || isTokenExpired(token))) {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    localStorage.removeItem('role')
    localStorage.removeItem('username')
    localStorage.removeItem('userId')
    next('/login')
  } else {
    next()
  }
})

export default router
