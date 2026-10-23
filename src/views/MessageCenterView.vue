<template>
  <div class="message-center">
    <PageHeaderBar title="消息中心">
      <template #actions>
        <div class="header-actions">
          <el-button size="small" @click="markAllRead" :disabled="unreadCount === 0">全部标记已读</el-button>
          <el-button size="small" @click="refresh">刷新</el-button>
        </div>
      </template>
    </PageHeaderBar>

    <div class="mc-body">
      <div class="tabs-bar">
      <button class="tab-btn" :class="{ active: activeTab === 'all' }" @click="activeTab = 'all'">全部 ({{ total }})</button>
      <button class="tab-btn" :class="{ active: activeTab === 'unread' }" @click="activeTab = 'unread'">未读 ({{ unreadCount }})</button>
    </div>

    <div class="notification-list" v-loading="loading">
      <div v-if="filteredList.length === 0" class="empty-state">
        <span class="empty-icon">📭</span>
        <p>暂无消息</p>
      </div>
      <div v-for="item in filteredList" :key="item.id" class="notification-item" :class="{ unread: !item.isRead }" @click="handleItemClick(item)">
        <div class="notif-dot" v-if="!item.isRead" />
        <div class="notif-icon" :class="'type-' + item.type">
          <span>{{ typeIcon(item.type) }}</span>
        </div>
        <div class="notif-body">
          <div class="notif-title">{{ item.title }}</div>
          <div class="notif-content" v-if="item.content">{{ item.content }}</div>
          <div class="notif-time">{{ formatTime(item.createdAt) }}</div>
        </div>
        <button class="notif-close" @click.stop="deleteNotif(item.id)">✕</button>
      </div>
      <div class="pagination-bar" v-if="total > pageSize">
        <el-pagination layout="prev, pager, next" :total="total" :page-size="pageSize" v-model:current-page="currentPage" background small />
      </div>
    </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import PageHeaderBar from '../components/PageHeaderBar.vue'
import { useNotificationStore } from '../stores/notifications'

const router = useRouter()
const ns = useNotificationStore()

// 从标题/内容推断审批类型
function inferTypeFromText(item) {
  const hay = (item?.title || '') + ' ' + (item?.content || '')
  if (/请假/.test(hay)) return 'leave'
  if (/报销/.test(hay)) return 'reimbursement'
  if (/会议/.test(hay)) return 'meeting'
  if (/出差/.test(hay)) return 'businessTrip'
  if (/招待|业务招待/.test(hay)) return 'entertainment'
  if (/协同|办公用品|项目申请|项目/.test(hay)) return 'project'
  if (/下发|分派|分发/.test(hay)) return 'distributed'
  return null
}

function resolveJumpRoute(item) {
  const t = item?.applicationType || inferTypeFromText(item)
  if (item?.type === 'distributed_read' && item?.relatedType && item?.relatedId) {
    return '/oa-office?tab=distributedByMe&expandKey=' + item.relatedType + '-' + item.relatedId
  }
  if (item?.type === 'collaboration' && item?.relatedType === 'project' && item?.relatedId) {
    return '/oa-office?tab=project&subTab=tome&expandKey=project-' + item.relatedId
  }
  if (item?.relatedType === 'distributed' && item?.relatedId) {
    if (t === 'project') return '/oa-office?tab=project&subTab=tome'
    if (['leave', 'reimbursement', 'meeting', 'businessTrip', 'entertainment'].includes(t)) {
      return '/oa-office?tab=' + t + '&subTab=received'
    }
    return '/oa-office'
  }
  if (item?.type === 'approval' || item?.type === 'notify') {
    if (['leave', 'reimbursement', 'meeting', 'project', 'businessTrip', 'entertainment'].includes(t)) {
      return '/oa-office?tab=' + t + '&subTab=received'
    }
    return '/oa-office'
  }
  const dt = inferTypeFromText(item)
  if (dt && dt !== 'distributed') return '/oa-office?tab=' + dt + '&subTab=received'
  if (dt === 'distributed') return '/oa-office?tab=distributedByMe'
  if (item?.type === 'mention' || item?.type === 'task') return '/'
  return '/'
}

const loading = computed(() => ns.loading)
const currentPage = ref(1)
const pageSize = 20
const activeTab = ref('all')
const unreadCount = computed(() => ns.unreadCount)
const total = computed(() => activeTab.value === 'unread' ? ns.unreadCount : ns.list.length)

const filteredList = computed(() => {
  const base = activeTab.value === 'unread' ? ns.list.filter((n: any) => !n.isRead) : ns.list
  const start = (currentPage.value - 1) * pageSize
  return base.slice(start, start + pageSize)
})

// 切换标签时回到第一页，避免停留在越界页
watch(activeTab, () => { currentPage.value = 1 })

function typeIcon(type) {
  const map = { approval: '📋', task: '✅', mention: '💬', system: '🔔' }
  return map[type] || '🔔'
}

function formatTime(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  if (diff < 60000) return '刚刚'
  if (diff < 3600000) return Math.floor(diff / 60000) + '分钟前'
  if (diff < 86400000) return Math.floor(diff / 3600000) + '小时前'
  if (diff < 172800000) return '昨天 ' + d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
  return d.toLocaleDateString('zh-CN') + ' ' + d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
}

async function refresh() {
  await ns.load()
}

async function markRead(item) {
  if (item.isRead) return
  await ns.markRead(item.id)
}

// 移动端补充：PC 端 /oa-office 路由在移动端对应 /todo（两路由复用同一组件 OAWorkflowView）
function mapToMobileRoute(route) {
  if (typeof window !== 'undefined' && window.__APP_DEVICE__ === 'mobile') {
    if (route.startsWith('/oa-office')) {
      return route.replace('/oa-office', '/todo')
    }
  }
  return route
}

async function handleItemClick(item) {
  try {
    if (!item.isRead) {
      await markRead(item)
    }
    const targetRoute = mapToMobileRoute(resolveJumpRoute(item))
    if (targetRoute) {
      const sep = targetRoute.includes('?') ? '&' : '?'
      router.push(targetRoute + sep + 'fromNotification=1')
    }
  } catch (e) {
    console.error('点击消息跳转失败:', e)
  }
}

async function markAllRead() {
  await ns.markAllRead()
  ElMessage.success('全部标记为已读')
}

async function deleteNotif(id) {
  try {
    await ElMessageBox.confirm('确定要删除这条消息吗？', '删除消息', {
      confirmButtonText: '确定', cancelButtonText: '取消', type: 'warning'
    })
    const item = ns.list.find((n: any) => n.id === id)
    await fetch('/api/notifications/' + id, { method: 'DELETE' })
    if (item && !item.isRead) ns.unreadCount = Math.max(0, ns.unreadCount - 1)
    ns.list = ns.list.filter((n: any) => n.id !== id)
  } catch (e) {}
}

onMounted(() => {
  ns.startPolling()
})
</script>

<style scoped>
.message-center { min-height: 100vh; display: flex; flex-direction: column; }
.mc-body { width: 100%; max-width: 800px; margin: 0 auto; padding: 24px; flex: 1; }
.header-actions { display: flex; gap: 8px; }
.tabs-bar { display: flex; gap: 0; margin-bottom: 16px; background: #f5f7fa; border-radius: 8px; overflow: hidden; }
.tab-btn { flex: 1; padding: 10px; border: none; background: transparent; cursor: pointer; font-size: 14px; color: #666; transition: all 0.3s; }
.tab-btn.active { background: #fff; color: #667eea; font-weight: 600; box-shadow: 0 2px 8px rgba(102,126,234,0.15); }
.notification-list { background: #fff; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.06); min-height: 200px; }
.empty-state { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 60px 20px; color: #999; }
.empty-icon { font-size: 48px; margin-bottom: 12px; }
.notification-item { display: flex; align-items: flex-start; gap: 12px; padding: 16px 20px; border-bottom: 1px solid #f0f2f5; cursor: pointer; transition: background 0.2s; position: relative; }
.notification-item:hover { background: #f8f9fb; }
.notification-item.unread { background: #f0f4ff; }
.notif-dot { position: absolute; left: 10px; top: 22px; width: 6px; height: 6px; border-radius: 50%; background: #667eea; }
.notif-icon { width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 18px; background: #f0f4ff; flex-shrink: 0; margin-left: 6px; }
.notif-body { flex: 1; min-width: 0; }
.notif-title { font-size: 14px; font-weight: 500; color: #1a1a2e; margin-bottom: 4px; }
.notif-content { font-size: 13px; color: #666; line-height: 1.5; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.notif-time { font-size: 12px; color: #bbb; margin-top: 6px; }
.notif-close { background: none; border: none; color: #ccc; cursor: pointer; font-size: 14px; padding: 4px; opacity: 0; transition: opacity 0.2s; }
.notification-item:hover .notif-close { opacity: 1; }
.notif-close:hover { color: #f44336; }
.pagination-bar { display: flex; justify-content: center; padding: 16px; }
</style>
