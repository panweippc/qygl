<template>
  <div class="home-container">
    <DashboardHeader />

    <div class="main-container">
      <DashboardSidebar />

      <main class="content">
        <div class="dashboard">
          <!-- 待办概览：按角色分流（员工无「待我审批/已办」） -->
          <section class="section-block">
            <div class="todo-bar">
              <div class="todo-head">
                <span class="th-title">{{ isApprover ? '审批概览' : '我的申请' }}</span>
                <span class="th-sub">{{ tierLabel }}视角</span>
              </div>
              <div class="todo-items">
                <div
                  v-for="t in todoStats"
                  :key="t.label"
                  class="todo-item"
                  :class="{ 'todo-strong': t.label === '待我审批' && t.value > 0 }"
                  @click="goOa"
                >
                  <span class="todo-value">{{ t.value }}</span>
                  <span class="todo-label">{{ t.label }}</span>
                </div>
              </div>
            </div>
          </section>

          <!-- 常用操作：按角色固定映射，直接定位到发起/高频页面 -->
          <section class="section-block">
            <div class="section-title">常用操作</div>
            <div class="quick-grid">
              <router-link
                v-for="a in quickActions"
                :key="a.path"
                :to="a.path"
                class="quick-tile"
              >
                <span class="quick-icon" v-html="a.icon"></span>
                <span class="quick-label">{{ a.label }}</span>
              </router-link>
            </div>
          </section>

          <!-- 通讯录：与上方「常用操作」磁贴样式保持一致 -->
          <section class="section-block">
            <div class="section-title">通讯录<span class="section-count">（{{ contactsStats.total }} 人）</span></div>
            <div class="contacts-grid">
              <div
                v-for="c in contactsList"
                :key="c.name + '|' + c.department"
                class="contact-tile"
                @click="openContact(c)"
              >
                <span class="contact-tile-name">{{ c.name }}</span>
                <span class="contact-tile-dept">{{ c.department }} · {{ c.position }}</span>
                <span class="contact-tile-meta">
                  <span class="ct-line"><span class="ct-label">邮箱</span><span class="ct-value">{{ c.email || '—' }}</span></span>
                  <span class="ct-line"><span class="ct-label">电话</span><span class="ct-value">{{ c.phone || '—' }}</span></span>
                  <span v-if="c.projects && c.projects.length" class="ct-line ct-projects"><span class="ct-label">项目</span><span class="ct-value">{{ c.projects.map(p => p.name).join('、') }}</span></span>
                </span>
              </div>
              <div v-if="contactsList.length === 0" class="contact-empty">暂无通讯录数据</div>
            </div>
          </section>
        </div>
      </main>
    </div>

    <!-- 通讯录个人详情弹窗 -->
    <el-dialog v-model="contactDialogVisible" :title="selectedContact ? (selectedContact.name + ' · 详细信息') : '通讯录详情'" width="640px" align-center destroy-on-close>
      <div v-if="selectedContact" class="contact-detail">
        <div class="cd-section">
          <div class="cd-row"><span class="cd-label">姓名</span><span class="cd-value">{{ selectedContact.name }}</span></div>
          <div class="cd-row"><span class="cd-label">部门</span><span class="cd-value">{{ selectedContact.department || '—' }}</span></div>
          <div class="cd-row"><span class="cd-label">职位</span><span class="cd-value">{{ selectedContact.position || '—' }}</span></div>
          <div class="cd-row"><span class="cd-label">邮箱</span><span class="cd-value">{{ selectedContact.email || '—' }}</span></div>
          <div class="cd-row"><span class="cd-label">电话</span><span class="cd-value">{{ selectedContact.phone || '—' }}</span></div>
        </div>
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
            <div v-if="p.description" class="cd-project-desc">{{ p.description }}</div>
            <div v-if="p.link" class="cd-project-link"><a :href="p.link" target="_blank" rel="noopener">项目链接</a></div>
          </div>
        </div>
        <div v-else class="contact-empty">暂无负责项目</div>
      </div>
    </el-dialog>

    <DashboardFooter />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import DashboardHeader from '../components/DashboardHeader.vue'
import DashboardSidebar from '../components/DashboardSidebar.vue'
import DashboardFooter from '../components/DashboardFooter.vue'
import { useRoleGuard } from '../composables/useRoleGuard'
import {
  getEmployeeDirectory,
  getHomeApprovalSummary
} from '../services/api'

const router = useRouter()
const guard = useRoleGuard()
const roleTier = guard.roleTier
const isApprover = computed(() => roleTier.value !== 'employee')

const TIER_LABELS: Record<string, string> = {
  gm: '总经理 / 管理员',
  finance: '财务总监',
  biz: '业务中心经理',
  employee: '普通员工'
}
const tierLabel = computed(() => TIER_LABELS[roleTier.value] || '普通员工')

// ---------- 待办概览（对接真实业务审批数据） ----------
const summary = ref({
  myTotal: 0, myPending: 0, myApproved: 0, myRejected: 0,
  myReturned: 0, myWithdrawn: 0, todoTotal: 0, doneTotal: 0
})

const todoStats = computed(() => {
  if (isApprover.value) {
    return [
      { label: '待我审批', value: summary.value.todoTotal },
      { label: '我发起的', value: summary.value.myTotal },
      { label: '已办', value: summary.value.doneTotal }
    ]
  }
  return [
    { label: '我发起的', value: summary.value.myTotal },
    { label: '审批中', value: summary.value.myPending },
    { label: '已通过', value: summary.value.myApproved }
  ]
})

const goOa = () => router.push('/oa-office')

// ---------- 常用操作：按角色固定映射 ----------
interface HomeOperation {
  label: string
  path: string
  icon: string
}

const opIcon = (d: string) => `<svg viewBox="0 0 24 24" fill="currentColor"><path d="${d}"/></svg>`

const ROLE_OPERATIONS: Record<string, HomeOperation[]> = {
  employee: [
    { label: '请假申请', path: '/oa/leave-apply', icon: opIcon('M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z') },
    { label: '报销申请', path: '/oa/reimbursement-apply', icon: opIcon('M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 2.7-1.85 1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-1.94.42-3.5 1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 4.13 2.5.6 3 1.48 3 2.41 0 .69-.49 1.79-2.7 1.79-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c1.95-.37 3.5-1.5 3.5-3.55 0-2.84-2.43-3.81-4.7-4.4z') },
    { label: '会议申请', path: '/oa/meeting-apply', icon: opIcon('M17 12h-5v5h5v-5zM16 1v4H8V1H6v4H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2h-1V1h-2zm3 18H5V8h14v11z') },
    { label: '出差申请', path: '/oa/business-trip', icon: opIcon('M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z') },
    { label: '招待申请', path: '/oa/entertainment-apply', icon: opIcon('M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-5.5-2.5l7.51-3.22-7.52-3.22 7.52 3.22zM12 6c-3.31 0-6 2.69-6 6h2c0-2.21 1.79-4 4-4s4 1.79 4 4h2c0-3.31-2.69-6-6-6z') },
    { label: '项目申请', path: '/oa/project-apply', icon: opIcon('M19 3H5C3.9 3 3 3.9 3 5V19C3 20.1 3.9 21 5 21H19C20.1 21 21 20.1 21 19V5C21 3.9 20.1 3 19 3ZM11 17H7V10H11V17ZM17 17H13V7H17V17Z') },
    { label: '月报填写', path: '/monthly-report', icon: opIcon('M19 3H5C3.9 3 3 3.9 3 5V19C3 20.1 3.9 21 5 21H19C20.1 21 21 20.1 21 19V5C21 3.9 20.1 3 19 3ZM18 19H6V17H18V19ZM18 15H6V13H18V15ZM18 11H6V9H18V11ZM18 7H6V5H18V7Z') },
    { label: '审批中心', path: '/oa-office', icon: opIcon('M19 3h-4.18C14.4 1.84 13.3 1 12 1c-1.3 0-2.4.84-2.82 2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 0c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm2 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z') },
    { label: '资料中心', path: '/resource-center', icon: opIcon('M10 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2zm0 4h8v2h-8V8zm0 3h8v2h-8v-2zm0 3h5v2h-5v-2z') },
    { label: '消息中心', path: '/message-center', icon: opIcon('M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z') }
  ],
  biz: [
    { label: '请假申请', path: '/oa/leave-apply', icon: opIcon('M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z') },
    { label: '报销申请', path: '/oa/reimbursement-apply', icon: opIcon('M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 2.7-1.85 1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-1.94.42-3.5 1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 4.13 2.5.6 3 1.48 3 2.41 0 .69-.49 1.79-2.7 1.79-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c1.95-.37 3.5-1.5 3.5-3.55 0-2.84-2.43-3.81-4.7-4.4z') },
    { label: '会议申请', path: '/oa/meeting-apply', icon: opIcon('M17 12h-5v5h5v-5zM16 1v4H8V1H6v4H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2h-1V1h-2zm3 18H5V8h14v11z') },
    { label: '项目申请', path: '/oa/project-apply', icon: opIcon('M19 3H5C3.9 3 3 3.9 3 5V19C3 20.1 3.9 21 5 21H19C20.1 21 21 20.1 21 19V5C21 3.9 20.1 3 19 3ZM11 17H7V10H11V17ZM17 17H13V7H17V17Z') },
    { label: '月报填写', path: '/monthly-report', icon: opIcon('M19 3H5C3.9 3 3 3.9 3 5V19C3 20.1 3.9 21 5 21H19C20.1 21 21 20.1 21 19V5C21 3.9 20.1 3 19 3ZM18 19H6V17H18V19ZM18 15H6V13H18V15ZM18 11H6V9H18V11ZM18 7H6V5H18V7Z') },
    { label: '待我审批', path: '/oa-office?tab=leave&subTab=received', icon: opIcon('M19 3h-4.18C14.4 1.84 13.3 1 12 1c-1.3 0-2.4.84-2.82 2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 0c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm2 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z') },
    { label: '销售漏斗', path: '/sales-funnel', icon: opIcon('M3 4h18l-7 8v6l-4 2v-8L3 4z') },
    { label: '客户管理', path: '/customer-management', icon: opIcon('M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z') },
    { label: '销售目标', path: '/sales-target', icon: opIcon('M12 2a10 10 0 100 20 10 10 0 000-20zm0 18a8 8 0 110-16 8 8 0 010 16zm0-13a5 5 0 100 10 5 5 0 000-10zm0 8a3 3 0 110-6 3 3 0 010 6zm0-4a1 1 0 100 2 1 1 0 000-2z') },
    { label: '成交项目', path: '/closing-project', icon: opIcon('M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z') }
  ],
  finance: [
    { label: '待我审批', path: '/oa-office?tab=leave&subTab=received', icon: opIcon('M19 3h-4.18C14.4 1.84 13.3 1 12 1c-1.3 0-2.4.84-2.82 2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 0c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm2 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z') },
    { label: '报销查询', path: '/oa-office?tab=reimbursement&subTab=received', icon: opIcon('M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 2.7-1.85 1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-1.94.42-3.5 1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 4.13 2.5.6 3 1.48 3 2.41 0 .69-.49 1.79-2.7 1.79-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c1.95-.37 3.5-1.5 3.5-3.55 0-2.84-2.43-3.81-4.7-4.4z') },
    { label: '招待查询', path: '/oa-office?tab=entertainment&subTab=received', icon: opIcon('M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-5.5-2.5l7.51-3.22-7.52-3.22 7.52 3.22zM12 6c-3.31 0-6 2.69-6 6h2c0-2.21 1.79-4 4-4s4 1.79 4 4h2c0-3.31-2.69-6-6-6z') },
    { label: '月报审核', path: '/monthly-report', icon: opIcon('M19 3H5C3.9 3 3 3.9 3 5V19C3 20.1 3.9 21 5 21H19C20.1 21 21 20.1 21 19V5C21 3.9 20.1 3 19 3ZM18 19H6V17H18V19ZM18 15H6V13H18V15ZM18 11H6V9H18V11ZM18 7H6V5H18V7Z') },
    { label: '资料中心', path: '/resource-center', icon: opIcon('M10 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2zm0 4h8v2h-8V8zm0 3h8v2h-8v-2zm0 3h5v2h-5v-2z') },
    { label: '消息中心', path: '/message-center', icon: opIcon('M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z') }
  ],
  gm: [
    { label: '待我审批', path: '/oa-office?tab=leave&subTab=received', icon: opIcon('M19 3h-4.18C14.4 1.84 13.3 1 12 1c-1.3 0-2.4.84-2.82 2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 0c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm2 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z') },
    { label: '全部申请', path: '/oa-office', icon: opIcon('M4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6zm16-4H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-1 9h-4v4h-2v-4H9V9h4V5h2v4h4v2z') },
    { label: '员工管理', path: '/employee-management', icon: opIcon('M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z') },
    { label: '公告管理', path: '/announcement-management', icon: opIcon('M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 9H6V9h12v2zm0-4H6V5h12v2z') },
    { label: '系统管理', path: '/system', icon: opIcon('M19.14 12.94c.04-.3.06-.61.06-.94s-.02-.64-.07-.94l2.03-1.58a.49.49 0 00.12-.61l-1.92-3.32a.488.488 0 00-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54a.484.484 0 00-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58a.49.49 0 00-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z') },
    { label: '销售漏斗', path: '/sales-funnel', icon: opIcon('M3 4h18l-7 8v6l-4 2v-8L3 4z') },
    { label: '客户管理', path: '/customer-management', icon: opIcon('M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z') },
    { label: '月报审核', path: '/monthly-report', icon: opIcon('M19 3H5C3.9 3 3 3.9 3 5V19C3 20.1 3.9 21 5 21H19C20.1 21 21 20.1 21 19V5C21 3.9 20.1 3 19 3ZM18 19H6V17H18V19ZM18 15H6V13H18V15ZM18 11H6V9H18V11ZM18 7H6V5H18V7Z') },
    { label: '资料中心', path: '/resource-center', icon: opIcon('M10 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2zm0 4h8v2h-8V8zm0 3h8v2h-8v-2zm0 3h5v2h-5v-2z') }
  ]
}

const quickActions = computed<HomeOperation[]>(() => {
  return ROLE_OPERATIONS[roleTier.value] || ROLE_OPERATIONS.employee
})

// ---------- 通讯录 ----------
const contactsList = ref<any[]>([])
const contactsStats = computed(() => ({
  total: contactsList.value.length
}))

const loadSummary = async () => {
  try {
    const res = await getHomeApprovalSummary()
    if (res.success && res.data) {
      summary.value = { ...summary.value, ...res.data }
    }
  } catch (error) {
    console.error('加载首页审批聚合数据失败:', error)
  }
}

onMounted(async () => {
  // 校正角色（登录流程可能漏写 role），再加载角色化数据
  await guard.refresh()
  loadContactsData()
  loadSummary()
})

const loadContactsData = async () => {
  try {
    const res = await getEmployeeDirectory()
    if (res.success && Array.isArray(res.data)) {
      contactsList.value = res.data
    }
  } catch { /* 忽略：不影响主面板 */ }
}

// 通讯录个人详情弹窗
const selectedContact = ref<any>(null)
const contactDialogVisible = ref(false)
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
</script>

<style scoped>
.home-container {
  width: 100%;
  height: 100vh;
  display: flex;
  flex-direction: column;
  color: #333;
  position: relative;
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
  overflow: hidden;
  animation: pageFadeIn 0.8s ease-out;
}

@keyframes pageFadeIn {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

.home-container::before {
  content: '';
  position: absolute;
  top: -50%;
  left: -50%;
  width: 200%;
  height: 200%;
  background: radial-gradient(circle, rgba(30, 90, 168, 0.1) 0%, transparent 70%);
  animation: float 20s ease-in-out infinite;
  z-index: 0;
}

@keyframes float {
  0% { transform: translate(0, 0) rotate(0deg); }
  50% { transform: translate(5%, 5%) rotate(180deg); }
  100% { transform: translate(0, 0) rotate(360deg); }
}

.main-container {
  flex: 1;
  display: flex;
  position: relative;
  z-index: 1;
  overflow: hidden;
  animation: mainContainerFadeIn 0.6s ease-out 0.2s both;
}

@keyframes mainContainerFadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.content {
  flex: 1;
  padding: 2rem;
  overflow-y: auto;
  position: relative;
  animation: contentFadeIn 0.6s ease-out 0.4s both;
}

@keyframes contentFadeIn {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

.dashboard {
  min-height: 100%;
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

/* 区块通用 */
.section-block {
  display: flex;
  flex-direction: column;
  gap: 0.9rem;
}
.section-title {
  font-size: 1.05rem;
  font-weight: 700;
  color: #1E5AA8;
  position: relative;
  padding-left: 0.7rem;
}
.section-title::before {
  content: '';
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 4px;
  height: 1.05rem;
  background: #1E5AA8;
  border-radius: 2px;
}

/* 待办条 */
.todo-bar {
  background: #fff;
  border: 1px solid rgba(30, 90, 168, 0.15);
  border-radius: 14px;
  padding: 1.1rem 1.4rem;
  box-shadow: 0 2px 12px rgba(30, 90, 168, 0.06);
  display: flex;
  align-items: center;
  gap: 1.5rem;
  flex-wrap: wrap;
}
.todo-head { display: flex; flex-direction: column; }
.todo-head .th-title { font-weight: 700; color: #333; font-size: 1rem; }
.todo-head .th-sub { font-size: 0.78rem; color: rgba(51, 51, 51, 0.55); }
.todo-items {
  display: flex;
  gap: 1.2rem;
  flex-wrap: wrap;
  margin-left: auto;
}
.todo-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 84px;
  padding: 0.4rem 0.9rem;
  border-radius: 10px;
  cursor: pointer;
  transition: background 0.2s;
}
.todo-item:hover { background: rgba(30, 90, 168, 0.08); }
.todo-value { font-size: 1.5rem; font-weight: 800; color: #1E5AA8; line-height: 1.1; }
.todo-label { font-size: 0.8rem; color: rgba(51, 51, 51, 0.7); margin-top: 0.2rem; }
.todo-strong .todo-value { color: #c0392b; }
.todo-strong:hover { background: rgba(192, 57, 43, 0.08); }

/* 常用操作 */
.quick-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(118px, 1fr));
  gap: 0.9rem;
}
.quick-tile {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  padding: 1rem 0.6rem;
  background: #fff;
  border: 1px solid rgba(30, 90, 168, 0.15);
  border-radius: 12px;
  text-decoration: none;
  color: #333;
  transition: all 0.2s;
}
.quick-tile:hover {
  border-color: #1E5AA8;
  box-shadow: 0 4px 14px rgba(30, 90, 168, 0.15);
  transform: translateY(-2px);
}
.quick-icon {
  width: 30px;
  height: 30px;
  color: #1E5AA8;
  display: flex;
  align-items: center;
  justify-content: center;
}
.quick-icon :deep(svg) { width: 26px; height: 26px; }
.quick-label { font-size: 0.85rem; font-weight: 600; }

/* 通讯录：与上方「常用操作」磁贴样式保持一致 */
.contacts-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 0.9rem;
}
.contact-tile {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  padding: 1rem 1.1rem;
  background: #fff;
  border: 1px solid rgba(30, 90, 168, 0.15);
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s;
}
.contact-tile:hover {
  border-color: #1E5AA8;
  box-shadow: 0 4px 14px rgba(30, 90, 168, 0.15);
  transform: translateY(-2px);
}
.contact-tile-name { font-size: 1rem; font-weight: 700; color: #333; }
.contact-tile-dept { font-size: 0.8rem; color: rgba(51, 51, 51, 0.6); }
.contact-tile-meta { display: flex; flex-direction: column; gap: 0.12rem; margin-top: 0.2rem; font-size: 0.8rem; color: rgba(51, 51, 51, 0.8); }
.ct-line { display: flex; gap: 0.4rem; }
.ct-label { flex: 0 0 32px; color: #1E5AA8; font-weight: 600; }
.ct-value { word-break: break-all; }

.contact-empty {
  text-align: center;
  color: rgba(51, 51, 51, 0.5);
  font-size: 0.85rem;
  padding: 1rem 0;
  width: 100%;
}

/* 通讯录详情弹窗 */
.contact-detail { display: flex; flex-direction: column; gap: 1rem; }
.cd-section { display: flex; flex-direction: column; gap: 0.5rem; }
.cd-row { display: flex; gap: 0.75rem; font-size: 0.92rem; }
.cd-label { flex: 0 0 48px; color: #1E5AA8; font-weight: 600; }
.cd-value { color: #333; word-break: break-all; }
.cd-subtitle { font-size: 0.98rem; font-weight: 600; color: #333; border-top: 1px dashed rgba(30, 90, 168,0.3); padding-top: 0.75rem; }
.cd-projects { display: flex; flex-direction: column; gap: 0.75rem; }
.cd-project { background: rgba(30, 90, 168,0.06); border: 1px solid rgba(30, 90, 168,0.2); border-radius: 10px; padding: 0.6rem 0.8rem; }
.cd-project-head { display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; margin-bottom: 0.4rem; }
.cd-project-name { font-weight: 600; color: #333; font-size: 0.95rem; }
.cd-project-meta { display: flex; flex-wrap: wrap; gap: 0.4rem 1rem; font-size: 0.82rem; color: rgba(51,51,51,0.75); }
.cd-project-desc { margin-top: 0.4rem; font-size: 0.82rem; color: rgba(51,51,51,0.7); line-height: 1.5; }
.cd-project-link { margin-top: 0.3rem; font-size: 0.82rem; }
.cd-project-link a { color: #2E6FB8; }

/* 区块标题计数后缀 */
.section-count { font-size: 0.82rem; font-weight: 500; color: rgba(51, 51, 51, 0.55); }

.content::-webkit-scrollbar { width: 8px; }
.content::-webkit-scrollbar-track { background: rgba(15, 23, 42, 0.6); border-radius: 4px; }
.content::-webkit-scrollbar-thumb { background: rgba(59, 130, 246, 0.5); border-radius: 4px; }
.content::-webkit-scrollbar-thumb:hover { background: rgba(59, 130, 246, 0.7); }
</style>
