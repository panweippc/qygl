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

          <!-- 快捷操作：基于真实权限派生，绝不出现未实现入口 -->
          <section class="section-block">
            <div class="section-title">常用功能</div>
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
              <div v-if="quickActions.length === 0" class="contact-empty">暂无可用功能</div>
            </div>
          </section>

          <!-- 通讯录：与上方「常用功能」磁贴样式一致 -->
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
  getOaTodoList,
  getOaMyApplications,
  getOaDoneList
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

// ---------- 待办概览 ----------
const myApps = ref<any[]>([])
const todoApps = ref<any[]>([])
const doneApps = ref<any[]>([])

const normStatus = (s: unknown) => String(s ?? '').trim()
const isPending = (s: unknown) => ['审批中', '待审批', 'pending'].includes(normStatus(s))
const isApproved = (s: unknown) => ['已批准', '已审批', 'approved'].includes(normStatus(s))

const todoStats = computed(() => {
  if (isApprover.value) {
    return [
      { label: '待我审批', value: todoApps.value.length },
      { label: '我发起的', value: myApps.value.length },
      { label: '已办', value: doneApps.value.length }
    ]
  }
  return [
    { label: '我发起的', value: myApps.value.length },
    { label: '审批中', value: myApps.value.filter(a => isPending(a.status)).length },
    { label: '已通过', value: myApps.value.filter(a => isApproved(a.status)).length }
  ]
})

const goOa = () => router.push('/oa-office')

// ---------- 快捷操作（基于真实权限派生） ----------
interface HomeAction {
  path: string
  label: string
  icon: string
  order: number
}

const HOME_ACTIONS: HomeAction[] = [
  { path: '/oa-office', label: '审批中心', order: 1, icon: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M19 3h-4.18C14.4 1.84 13.3 1 12 1c-1.3 0-2.4.84-2.82 2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 0c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm2 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/></svg>' },
  { path: '/monthly-report', label: '月报', order: 1, icon: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/></svg>' },
  { path: '/tool-inventory', label: '物资管理', order: 1, icon: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M20 2H4c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 18H4V8h16v12zM4 6V4h16v2H4zm9 9h-2v-2h2v2zm0-4h-2V9h2v2z"/></svg>' },
  { path: '/resource-center', label: '资料中心', order: 1, icon: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M10 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2zm0 4h8v2h-8V8zm0 3h8v2h-8v-2zm0 3h5v2h-5v-2z"/></svg>' },
  { path: '/message-center', label: '消息中心', order: 1, icon: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z"/></svg>' },
  { path: '/sales-funnel', label: '销售漏斗', order: 2, icon: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 4h18l-7 8v6l-4 2v-8L3 4z"/></svg>' },
  { path: '/sales-target', label: '销售目标', order: 2, icon: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 100 20 10 10 0 000-20zm0 18a8 8 0 110-16 8 8 0 010 16zm0-13a5 5 0 100 10 5 5 0 000-10zm0 8a3 3 0 110-6 3 3 0 010 6zm0-4a1 1 0 100 2 1 1 0 000-2z"/></svg>' },
  { path: '/customer-management', label: '客户管理', order: 2, icon: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/></svg>' },
  { path: '/closing-project', label: '成交项目', order: 2, icon: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>' },
  { path: '/employee-management', label: '员工管理', order: 3, icon: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M21 5h-2V3H5v2H3v4c0 4.5 3.5 8 8 8h2c4.5 0 8-3.5 8-8V5zM9 14c-2.76 0-5-2.24-5-5V5h5v9zm10 0c0 2.76-2.24 5-5 5H9.83C11.38 17.23 13 14.56 13 11V5h6v9z"/></svg>' },
  { path: '/announcement-management', label: '公告管理', order: 3, icon: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 9H6V9h12v2zm0-4H6V5h12v2z"/></svg>' },
  { path: '/system', label: '系统管理', order: 3, icon: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M19.14 12.94c.04-.3.06-.61.06-.94s-.02-.64-.07-.94l2.03-1.58a.49.49 0 00.12-.61l-1.92-3.32a.488.488 0 00-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54a.484.484 0 00-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58a.49.49 0 00-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/></svg>' }
]

function readPermissions(): any[] {
  try {
    const raw = localStorage.getItem('permissions')
    if (raw) return JSON.parse(raw) || []
  } catch { /* ignore */ }
  return []
}

const quickActions = computed<HomeAction[]>(() => {
  const isAdmin = localStorage.getItem('username') === '管理员'
  const perms = readPermissions()
  const allowed = HOME_ACTIONS.filter(a => isAdmin || perms.some(p => p.path === a.path))
  return allowed.sort((x, y) => x.order - y.order)
})

// ---------- 通讯录 ----------
const contactsList = ref<any[]>([])
const contactsStats = computed(() => ({
  total: contactsList.value.length
}))

const loadTodoData = async (userId: number) => {
  try {
    const [todoRes, myRes, doneRes] = await Promise.all([
      getOaTodoList(userId),
      getOaMyApplications(userId),
      getOaDoneList(userId)
    ])
    if (todoRes.success) todoApps.value = todoRes.data || []
    if (myRes.success) myApps.value = myRes.data || []
    if (doneRes.success) doneApps.value = doneRes.data || []
  } catch (error) {
    console.error('加载待办数据失败:', error)
  }
}

onMounted(async () => {
  // 校正角色（登录流程可能漏写 role），再加载角色化数据
  await guard.refresh()
  loadContactsData()
  loadTodoData(Number(localStorage.getItem('userId') || 0))
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

/* 快捷操作 */
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

/* 通讯录：与上方「常用功能」磁贴样式保持一致 */
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
