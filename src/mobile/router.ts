import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: () => import('./views/LoginView.vue')
    },
    {
      path: '/',
      name: 'home',
      component: () => import('./views/HomeView.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/profile',
      name: 'profile',
      component: () => import('@/views/ProfileView.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/change-password',
      name: 'change-password',
      component: () => import('@/views/ChangePasswordView.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/message-center',
      name: 'message-center',
      component: () => import('@/views/MessageCenterView.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/todo',
      name: 'todo',
      component: () => import('./views/PcScaleView.vue'),
      meta: { requiresAuth: true, pcComponent: () => import('@/views/OAWorkflowView.vue') }
    },
    {
      path: '/resource',
      name: 'resource',
      component: () => import('./views/PcScaleView.vue'),
      meta: { requiresAuth: true, pcComponent: () => import('@/views/ResourceCenterView.vue') }
    },
    // 以下为 GM / 经理角色「常用操作」所需的 PC 复用页（与 /todo、/resource 同机制：PcScaleView 缩放渲染 PC 组件）
    {
      path: '/sales-funnel',
      name: 'm-sales-funnel',
      component: () => import('./views/PcScaleView.vue'),
      meta: { requiresAuth: true, pcComponent: () => import('@/views/SalesFourTablesView.vue') }
    },
    {
      path: '/customer-management',
      name: 'm-customer-management',
      component: () => import('./views/PcScaleView.vue'),
      meta: { requiresAuth: true, pcComponent: () => import('@/views/CustomerManagementView.vue') }
    },
    {
      path: '/sales-target',
      name: 'm-sales-target',
      component: () => import('./views/PcScaleView.vue'),
      meta: { requiresAuth: true, pcComponent: () => import('@/views/SalesTargetView.vue') }
    },
    {
      path: '/closing-project',
      name: 'm-closing-project',
      component: () => import('./views/PcScaleView.vue'),
      meta: { requiresAuth: true, pcComponent: () => import('@/views/ClosingProjectView.vue') }
    },
    {
      path: '/employee-management',
      name: 'm-employee-management',
      component: () => import('./views/PcScaleView.vue'),
      meta: { requiresAuth: true, pcComponent: () => import('@/views/EmployeeManagementView.vue') }
    },
    {
      path: '/announcement-management',
      name: 'm-announcement-management',
      component: () => import('./views/PcScaleView.vue'),
      meta: { requiresAuth: true, pcComponent: () => import('@/views/AnnouncementManagementView.vue') }
    },
    {
      path: '/system',
      name: 'm-system',
      component: () => import('./views/PcScaleView.vue'),
      meta: { requiresAuth: true, pcComponent: () => import('@/views/SystemManagementView.vue') }
    },
    {
      path: '/monthly-report',
      name: 'monthly-report',
      component: () => import('./views/MonthlyReportView.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/monthly-report-history',
      name: 'monthly-report-history',
      component: () => import('./views/MonthlyReportHistoryView.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/tool-inventory',
      name: 'tool-inventory',
      component: () => import('@/views/ToolInventoryView.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/oa/leave-apply',
      name: 'mobile-leave-apply',
      component: () => import('@/views/LeaveApplicationPage.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/oa/reimbursement-apply',
      name: 'mobile-reimbursement-apply',
      component: () => import('@/views/ReimbursementApplicationPage.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/oa/meeting-apply',
      name: 'mobile-meeting-apply',
      component: () => import('@/views/MeetingApplicationPage.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/oa/business-trip',
      name: 'mobile-business-trip',
      component: () => import('@/views/BusinessTripView.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/oa/entertainment-apply',
      name: 'mobile-entertainment-apply',
      component: () => import('@/views/EntertainmentApplyPage.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/oa/project-apply',
      name: 'mobile-project-apply',
      component: () => import('@/views/ProjectApplicationView.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/operation-log',
      name: 'operation-log',
      component: () => import('@/views/OperationLogView.vue'),
      meta: { requiresAuth: true }
    }
  ]
})

router.beforeEach((to) => {
  const token = localStorage.getItem('token')
  if (to.meta.requiresAuth && !token) return '/login'
  if (to.path === '/login' && token) return '/'
  return true
})

export default router
