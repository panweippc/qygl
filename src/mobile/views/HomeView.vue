<template>
  <div class="home">
    <!-- 顶部复刻网页端 DashboardHeader：左侧平台名，右侧铃铛 + 账号 -->
    <header class="home-head">
      <div class="home-title">宏友智慧办公平台</div>
      <div class="home-actions">
        <div class="bell-wrap" @click="go('/message-center')">
          <span class="bell-icon">🔔</span>
          <span v-if="unreadCount > 0" class="bell-badge">{{ unreadCount > 99 ? '99+' : unreadCount }}</span>
        </div>
        <el-dropdown trigger="click" placement="bottom-end" @command="handleCommand">
          <div class="user">
            <div class="avatar">
              <img v-if="avatarUrl" :src="avatarUrl" class="avatar-img" />
              <span v-else>{{ avatarText }}</span>
            </div>
            <span class="uname">{{ realName }}</span>
            <el-icon class="drop-ico"><arrow-down /></el-icon>
          </div>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item command="profile"><el-icon><user /></el-icon>个人中心</el-dropdown-item>
              <el-dropdown-item command="changePassword"><el-icon><lock /></el-icon>修改密码</el-dropdown-item>
              <el-dropdown-item divided command="logout"><el-icon><switch-button /></el-icon>退出登录</el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </div>
    </header>

    <!-- 我的申请 / 审批概览：与 PC 端口径一致 -->
    <section class="m-card">
      <div class="m-title">
        {{ isApprover ? '审批概览' : '我的申请' }}
        <span class="m-sub">{{ tierLabel }}视角</span>
      </div>
      <div class="stat-grid">
        <div class="stat" v-for="t in todoStats" :key="t.label" @click="go(t.path)">
          <div class="stat-num" :style="{ color: t.color }">{{ t.value }}</div>
          <div class="m-muted">{{ t.label }}</div>
        </div>
      </div>
    </section>

    <!-- 常用操作：与 PC 端 employee 角色 100% 一致 -->
    <section class="m-card">
      <div class="m-title">常用操作</div>
      <div class="quick-grid">
        <div class="quick-item" v-for="a in quickActions" :key="a.path" @click="go(a.path)">
          <div class="quick-icon" v-html="a.icon"></div>
          <div class="quick-label">{{ a.label }}</div>
        </div>
      </div>
    </section>

    <!-- 通讯录 -->
    <section class="m-card">
      <div class="m-title">通讯录<span class="m-sub">（{{ contactsList.length }} 人）</span></div>
      <div class="contacts-list">
        <div v-for="c in contactsList" :key="c.name + '|' + c.department" class="contact-item" @click="openContact(c)">
          <div class="contact-name">{{ c.name }}</div>
          <div class="contact-dept">{{ c.department || '—' }} · {{ c.position || '—' }}</div>
        </div>
        <div v-if="contactsList.length === 0" class="empty">暂无通讯录数据</div>
      </div>
    </section>

    <!-- 通讯录详情弹窗 -->
    <el-dialog v-model="contactDialogVisible" :title="selectedContact ? (selectedContact.name + ' · 详细信息') : '通讯录详情'" width="90%" align-center destroy-on-close>
      <div v-if="selectedContact" class="contact-detail">
        <div class="cd-row"><span class="cd-label">姓名</span><span class="cd-value">{{ selectedContact.name }}</span></div>
        <div class="cd-row"><span class="cd-label">部门</span><span class="cd-value">{{ selectedContact.department || '—' }}</span></div>
        <div class="cd-row"><span class="cd-label">职位</span><span class="cd-value">{{ selectedContact.position || '—' }}</span></div>
        <div class="cd-row"><span class="cd-label">邮箱</span><span class="cd-value">{{ selectedContact.email || '—' }}</span></div>
        <div class="cd-row"><span class="cd-label">电话</span><span class="cd-value">{{ selectedContact.phone || '—' }}</span></div>
        <div class="cd-subtitle">负责项目（{{ selectedContact.projects?.length || 0 }}）</div>
        <div v-if="selectedContact.projects && selectedContact.projects.length" class="cd-projects">
          <div v-for="p in selectedContact.projects" :key="p.id" class="cd-project">
            <div class="cd-project-head">
              <span class="cd-project-name">{{ p.name }}</span>
              <el-tag size="small" :type="progressTagType(p.progress)">{{ progressStageText(p.progress) }}</el-tag>
            </div>
            <div class="cd-project-meta">
              <span>分类：{{ p.category || '未分类' }}</span>
              <span>负责人：{{ p.manager || '—' }}</span>
              <span>状态：{{ p.status }}</span>
              <span>进度：{{ p.progress }}%</span>
              <span v-if="p.startDate || p.endDate">周期：{{ p.startDate || '—' }} ~ {{ p.endDate || '—' }}</span>
              <span v-if="p.applicant">申请人：{{ p.applicant }}</span>
            </div>
          </div>
        </div>
        <div v-else class="empty">暂无负责项目</div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { ArrowDown, User, Lock, SwitchButton } from '@element-plus/icons-vue'
import { useRoleGuard } from '@/composables/useRoleGuard'
import { getEmployeeDirectory, getHomeApprovalSummary } from '@/services/api'
import { disconnectSocket } from '@/services/socket'

const router = useRouter()
const guard = useRoleGuard()

const roleName = ref('')
const userName = ref('')
const dept = ref('')
const avatarUrl = ref('')
const unreadCount = ref(0)
let refreshInterval: ReturnType<typeof setInterval> | null = null

const isApprover = computed(() => guard.roleTier.value !== 'employee')
const role = computed(() => roleName.value)
const realName = computed(() => userName.value)
const avatarText = computed(() => (realName.value || '用').slice(0, 1))
const today = new Date().toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', weekday: 'short' })

const TIER_LABELS: Record<string, string> = {
  gm: '总经理 / 管理员',
  finance: '财务总监',
  biz: '业务中心经理',
  employee: '普通员工'
}
const tierLabel = computed(() => TIER_LABELS[guard.roleTier.value] || '普通员工')

// ---------- 待办概览（与 PC 端 HomeView 口径一致）----------
const summary = ref({
  myTotal: 0, myPending: 0, myApproved: 0, myRejected: 0,
  myReturned: 0, myWithdrawn: 0, todoTotal: 0, doneTotal: 0
})

const todoStats = computed(() => {
  if (isApprover.value) {
    return [
      { label: '待我审批', value: summary.value.todoTotal, color: '#ee0a24', path: '/todo' },
      { label: '我发起的', value: summary.value.myTotal, color: '#185fa5', path: '/todo' },
      { label: '已办', value: summary.value.doneTotal, color: '#07c160', path: '/todo' }
    ]
  }
  return [
    { label: '我发起的', value: summary.value.myTotal, color: '#185fa5', path: '/todo' },
    { label: '审批中', value: summary.value.myPending, color: '#ee0a24', path: '/todo' },
    { label: '已通过', value: summary.value.myApproved, color: '#07c160', path: '/todo' }
  ]
})

// ---------- 常用操作：与 PC 端按角色固定映射保持一致（移动端路由）----------
interface HomeOperation {
  label: string
  path: string
  icon: string
}

const opIcon = (d: string) => `<svg viewBox="0 0 24 24" fill="currentColor"><path d="${d}"/></svg>`

// 与 PC 端 HomeView 的 ROLE_OPERATIONS 一一对应，仅把 PC 路由替换为移动端等价路由：
// 申请类 → /oa/*-apply；审批中心/查询 → /todo（PcScaleView 复用 OAWorkflowView）；
// 物资/资料 → /tool-inventory、/resource（带 action 参数）；销售/客户/员工/公告/系统 → 新增 PcScaleView 复用页。
const ROLE_OPERATIONS: Record<string, HomeOperation[]> = {
  employee: [
    { label: '请假申请', path: '/oa/leave-apply', icon: opIcon('M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z') },
    { label: '报销申请', path: '/oa/reimbursement-apply', icon: opIcon('M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 2.7-1.85 1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-1.94.42-3.5 1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 4.13 2.5.6 3 1.48 3 2.41 0 .69-.49 1.79-2.7 1.79-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c1.95-.37 3.5-1.5 3.5-3.55 0-2.84-2.43-3.81-4.7-4.4z') },
    { label: '会议申请', path: '/oa/meeting-apply', icon: opIcon('M17 12h-5v5h5v-5zM16 1v4H8V1H6v4H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2h-1V1h-2zm3 18H5V8h14v11z') },
    { label: '出差申请', path: '/oa/business-trip', icon: opIcon('M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z') },
    { label: '招待申请', path: '/oa/entertainment-apply', icon: opIcon('M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-5.5-2.5l7.51-3.22-7.52-3.22 7.52 3.22zM12 6c-3.31 0-6 2.69-6 6h2c0-2.21 1.79-4 4-4s4 1.79 4 4h2c0-3.31-2.69-6-6-6z') },
    { label: '项目申请', path: '/oa/project-apply', icon: opIcon('M19 3H5C3.9 3 3 3.9 3 5V19C3 20.1 3.9 21 5 21H19C20.1 21 21 20.1 21 19V5C21 3.9 20.1 3 19 3ZM11 17H7V10H11V17ZM17 17H13V7H17V17Z') },
    { label: '添加物资', path: '/tool-inventory?action=add', icon: opIcon('M19 3h-1V2h-2v1H8V2H6v1H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V9h14v10zM13 11h-2v2H9v2h2v2h2v-2h2v-2h-2z') },
    { label: '资料上传', path: '/resource?action=upload', icon: opIcon('M10 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2zm0 4h8v2h-8V8zm0 3h8v2h-8v-2zm0 3h5v2h-5v-2z') }
  ],
  biz: [
    { label: '请假申请', path: '/oa/leave-apply', icon: opIcon('M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z') },
    { label: '报销申请', path: '/oa/reimbursement-apply', icon: opIcon('M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 2.7-1.85 1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-1.94.42-3.5 1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 4.13 2.5.6 3 1.48 3 2.41 0 .69-.49 1.79-2.7 1.79-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c1.95-.37 3.5-1.5 3.5-3.55 0-2.84-2.43-3.81-4.7-4.4z') },
    { label: '会议申请', path: '/oa/meeting-apply', icon: opIcon('M17 12h-5v5h5v-5zM16 1v4H8V1H6v4H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2h-1V1h-2zm3 18H5V8h14v11z') },
    { label: '项目申请', path: '/oa/project-apply', icon: opIcon('M19 3H5C3.9 3 3 3.9 3 5V19C3 20.1 3.9 21 5 21H19C20.1 21 21 20.1 21 19V5C21 3.9 20.1 3 19 3ZM11 17H7V10H11V17ZM17 17H13V7H17V17Z') },
    { label: '待我审批', path: '/todo', icon: opIcon('M19 3h-4.18C14.4 1.84 13.3 1 12 1c-1.3 0-2.4.84-2.82 2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 0c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm2 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z') },
    { label: '销售漏斗', path: '/sales-funnel', icon: opIcon('M3 4h18l-7 8v6l-4 2v-8L3 4z') },
    { label: '客户管理', path: '/customer-management', icon: opIcon('M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z') },
    { label: '销售目标', path: '/sales-target', icon: opIcon('M12 2a10 10 0 100 20 10 10 0 000-20zm0 18a8 8 0 110-16 8 8 0 010 16zm0-13a5 5 0 100 10 5 5 0 000-10zm0 8a3 3 0 110-6 3 3 0 010 6zm0-4a1 1 0 100 2 1 1 0 000-2z') },
    { label: '成交项目', path: '/closing-project', icon: opIcon('M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z') },
    { label: '添加物资', path: '/tool-inventory?action=add', icon: opIcon('M19 3h-1V2h-2v1H8V2H6v1H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V9h14v10zM13 11h-2v2H9v2h2v2h2v-2h2v-2h-2z') },
    { label: '资料上传', path: '/resource?action=upload', icon: opIcon('M10 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2zm0 4h8v2h-8V8zm0 3h8v2h-8v-2zm0 3h5v2h-5v-2z') }
  ],
  finance: [
    { label: '接收单据处理', path: '/todo?tab=distributed', icon: opIcon('M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5v-3h3.56c.69 1.19 1.97 2 3.44 2s2.75-.81 3.44-2H19v3zm0-5h-4.06l-.61 1.02c-.42.7-1.18 1.13-2 1.13h-.66c-.82 0-1.58-.43-2-1.13L9.06 14H5V5h14v9z') },
    { label: '添加员工', path: '/employee-management?action=add', icon: opIcon('M15 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm-9-2V7H4v3H1v2h3v3h2v-3h3v-2H6zm9 4c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z') },
    { label: '添加物资', path: '/tool-inventory?action=add', icon: opIcon('M19 3h-1V2h-2v1H8V2H6v1H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V9h14v10zM13 11h-2v2H9v2h2v2h2v-2h2v-2h-2z') },
    { label: '资料上传', path: '/resource?action=upload', icon: opIcon('M10 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2zm0 4h8v2h-8V8zm0 3h8v2h-8v-2zm0 3h5v2h-5v-2z') }
  ],
  gm: [
    { label: '待我审批', path: '/todo', icon: opIcon('M19 3h-4.18C14.4 1.84 13.3 1 12 1c-1.3 0-2.4.84-2.82 2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 0c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm2 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z') },
    { label: '全部申请', path: '/todo', icon: opIcon('M4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6zm16-4H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-1 9h-4v4h-2v-4H9V9h4V5h2v4h4v2z') },
    { label: '员工管理', path: '/employee-management', icon: opIcon('M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z') },
    { label: '公告管理', path: '/announcement-management', icon: opIcon('M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 9H6V9h12v2zm0-4H6V5h12v2z') },
    { label: '系统管理', path: '/system', icon: opIcon('M19.14 12.94c.04-.3.06-.61.06-.94s-.02-.64-.07-.94l2.03-1.58a.49.49 0 00.12-.61l-1.92-3.32a.488.488 0 00-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54a.484.484 0 00-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58a.49.49 0 00-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z') },
    { label: '销售漏斗', path: '/sales-funnel', icon: opIcon('M3 4h18l-7 8v6l-4 2v-8L3 4z') },
    { label: '客户管理', path: '/customer-management', icon: opIcon('M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z') },
    { label: '添加物资', path: '/tool-inventory?action=add', icon: opIcon('M19 3h-1V2h-2v1H8V2H6v1H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V9h14v10zM13 11h-2v2H9v2h2v2h2v-2h2v-2h-2z') },
    { label: '资料上传', path: '/resource?action=upload', icon: opIcon('M10 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2zm0 4h8v2h-8V8zm0 3h8v2h-8v-2zm0 3h5v2h-5v-2z') }
  ]
}

const quickActions = computed<HomeOperation[]>(() => {
  return ROLE_OPERATIONS[guard.roleTier.value] || ROLE_OPERATIONS.employee
})

// ---------- 通讯录 ----------
const contactsList = ref<any[]>([])
const selectedContact = ref<any>(null)
const contactDialogVisible = ref(false)

function go(p: string) {
  router.push(p)
}

// ---------- 账号菜单（复刻网页端 DashboardHeader 下拉）----------
function handleCommand(command: string) {
  if (command === 'logout') {
    handleLogout()
  } else if (command === 'changePassword') {
    router.push('/change-password')
  } else if (command === 'profile') {
    router.push('/profile')
  }
}

async function fetchUnreadCount() {
  const userId = localStorage.getItem('username')
  if (!userId) return
  try {
    const res = await fetch(`/api/notifications/unread-count?userId=${encodeURIComponent(userId)}`)
    const json = await res.json()
    if (json.success) unreadCount.value = json.data.count
  } catch { /* ignore */ }
}

async function loadAvatar() {
  const username = localStorage.getItem('username') || ''
  if (!username) return
  try {
    const res = await fetch(`/api/user/avatar/${encodeURIComponent(username)}`)
    const json = await res.json()
    if (json.success && json.data.avatar) {
      avatarUrl.value = json.data.avatar
    } else {
      const userStr = localStorage.getItem('user')
      if (userStr) {
        try {
          const userInfo = JSON.parse(userStr)
          if (userInfo.avatar) avatarUrl.value = userInfo.avatar
        } catch { /* ignore */ }
      }
    }
  } catch { /* ignore */ }
}

function handleLogout() {
  // 断开 Socket 连接，释放设备维度在线状态
  disconnectSocket()
  localStorage.removeItem('token')
  localStorage.removeItem('userId')
  localStorage.removeItem('username')
  localStorage.removeItem('role')
  localStorage.removeItem('user')
  localStorage.removeItem('permissions')
  localStorage.removeItem('buttonPermissions')
  if (refreshInterval) {
    clearInterval(refreshInterval)
    refreshInterval = null
  }
  router.push('/login')
}

function openContact(c: any) {
  selectedContact.value = c
  contactDialogVisible.value = true
}

function progressStageText(p: number): string {
  if (!p || p <= 0) return '未开始'
  if (p <= 30) return '初期'
  if (p <= 70) return '中期'
  if (p < 100) return '收尾'
  return '已完成'
}

function progressTagType(p: number): 'info' | 'warning' | 'success' {
  if (!p || p <= 0) return 'info'
  if (p < 100) return 'warning'
  return 'success'
}

async function loadSummary() {
  try {
    const res = await getHomeApprovalSummary()
    if (res.success && res.data) {
      summary.value = { ...summary.value, ...res.data }
    }
  } catch (e) { /* ignore */ }
}

async function loadContacts() {
  try {
    const res = await getEmployeeDirectory()
    if (res.success && Array.isArray(res.data)) {
      contactsList.value = res.data
    }
  } catch { /* ignore */ }
}

onMounted(async () => {
  await guard.refresh()
  const raw = localStorage.getItem('user')
  if (raw) {
    try {
      const u = JSON.parse(raw)
      userName.value = u.name || u.username || ''
      dept.value = u.department || ''
    } catch { /* ignore */ }
  }
  roleName.value = localStorage.getItem('role') || ''
  loadAvatar()
  fetchUnreadCount()
  refreshInterval = setInterval(fetchUnreadCount, 30000)
  loadSummary()
  loadContacts()
})

onUnmounted(() => {
  if (refreshInterval) {
    clearInterval(refreshInterval)
    refreshInterval = null
  }
})
</script>

<style scoped>
.home-head {
  background: linear-gradient(135deg, #185fa5, #2b7fc4);
  color: #fff;
  padding: 14px 16px 18px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.home-title {
  font-size: 18px;
  font-weight: 700;
  letter-spacing: 0.5px;
  text-shadow: 0 1px 4px rgba(0,0,0,0.2);
}
.home-actions {
  display: flex;
  align-items: center;
  gap: 14px;
}
.bell-wrap {
  position: relative;
  cursor: pointer;
  padding: 4px;
}
.bell-icon { font-size: 22px; line-height: 1; }
.bell-badge {
  position: absolute;
  top: -4px;
  right: -6px;
  background: #f44336;
  color: #fff;
  font-size: 10px;
  min-width: 16px;
  height: 16px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 4px;
  font-weight: 600;
  box-shadow: 0 2px 6px rgba(244,67,54,0.4);
}
.user {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  padding: 3px 10px 3px 3px;
  border-radius: 20px;
  background: rgba(255,255,255,0.15);
  border: 1px solid rgba(255,255,255,0.25);
}
.drop-ico { color: rgba(255,255,255,0.85); font-size: 12px; transition: transform .2s; }
.user:active .drop-ico { transform: rotate(180deg); }
.avatar {
  width: 32px; height: 32px; border-radius: 50%;
  background: rgba(255,255,255,0.25);
  display: flex; align-items: center; justify-content: center;
  font-size: 14px; font-weight: 700;
  overflow: hidden;
}
.avatar-img { width: 100%; height: 100%; object-fit: cover; }
.uname { font-size: 14px; font-weight: 500; max-width: 72px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.urole { font-size: 12px; opacity: 0.85; margin-top: 2px; }
.hdate { font-size: 12px; opacity: 0.9; }

.m-card {
  background: #fff;
  border-radius: 12px;
  margin: 12px;
  padding: 14px 12px;
}
.m-title {
  font-size: 15px;
  font-weight: 700;
  color: #1E5AA8;
  position: relative;
  padding-left: 10px;
  margin-bottom: 12px;
}
.m-title::before {
  content: '';
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 4px;
  height: 15px;
  background: #1E5AA8;
  border-radius: 2px;
}
.m-sub {
  margin-left: 6px;
  font-size: 12px;
  font-weight: 500;
  color: rgba(51, 51, 51, 0.55);
}
.m-muted { font-size: 12px; color: #969799; }

.stat-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
  text-align: center;
}
.stat {
  background: #f2f3f5;
  border-radius: 10px;
  padding: 14px 4px;
}
.stat-num { font-size: 22px; font-weight: 700; line-height: 1.2; }

.quick-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
}
.quick-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 12px 4px;
  background: #fff;
  border: 1px solid rgba(30, 90, 168, 0.12);
  border-radius: 12px;
  text-decoration: none;
  color: #333;
}
.quick-icon {
  width: 28px;
  height: 28px;
  color: #1E5AA8;
  display: flex;
  align-items: center;
  justify-content: center;
}
.quick-icon :deep(svg) { width: 24px; height: 24px; }
.quick-label { font-size: 12px; white-space: nowrap; }

.contacts-list { display: flex; flex-direction: column; gap: 10px; }
.contact-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 12px;
  background: #f8f9fa;
  border-radius: 10px;
}
.contact-name { font-size: 14px; font-weight: 600; color: #333; }
.contact-dept { font-size: 12px; color: #969799; }
.empty { text-align: center; color: #969799; font-size: 13px; padding: 12px 0; }

.contact-detail { display: flex; flex-direction: column; gap: 10px; }
.cd-row { display: flex; gap: 12px; font-size: 14px; }
.cd-label { flex: 0 0 48px; color: #1E5AA8; font-weight: 600; }
.cd-value { color: #333; word-break: break-all; }
.cd-subtitle { font-size: 14px; font-weight: 600; color: #333; border-top: 1px dashed rgba(30, 90, 168, 0.3); padding-top: 10px; }
.cd-projects { display: flex; flex-direction: column; gap: 10px; }
.cd-project { background: rgba(30, 90, 168, 0.05); border: 1px solid rgba(30, 90, 168, 0.15); border-radius: 8px; padding: 10px; }
.cd-project-head { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 6px; }
.cd-project-name { font-weight: 600; color: #333; font-size: 14px; }
.cd-project-meta { display: flex; flex-wrap: wrap; gap: 4px 12px; font-size: 12px; color: rgba(51,51,51,0.7); }
</style>
