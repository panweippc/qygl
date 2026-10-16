<template>
  <div class="mba-root">
    <transition name="mba-pop">
      <div v-if="open" class="mba-panel">
        <div class="mba-head">
          <span>最新消息</span>
          <span v-if="unreadCount" class="mba-unread">未读 {{ unreadCount }}</span>
        </div>
        <div class="mba-list">
          <div v-for="item in list" :key="item.id" class="mba-item" :class="{ unread: !item.isRead }" @click="onClick(item)">
            <span v-if="!item.isRead" class="mba-dot" />
            <div class="mba-main">
              <div class="mba-title">{{ item.title }}</div>
              <div class="mba-time">{{ fmt(item.createdAt) }}</div>
            </div>
          </div>
          <div v-if="!list.length" class="mba-empty">暂无消息</div>
        </div>
        <div class="mba-foot" @click="goAll">查看全部 →</div>
      </div>
    </transition>

    <div class="mba-ball" @click="toggle" title="消息助手">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
      <span v-if="unreadCount" class="mba-badge">{{ unreadCount > 99 ? '99+' : unreadCount }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const open = ref(false)
const list = ref<any[]>([])
const unreadCount = ref(0)
const userId = localStorage.getItem('username') || ''
let timer: any = null

function fmt(dateStr: string) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  if (diff < 60000) return '刚刚'
  if (diff < 3600000) return Math.floor(diff / 60000) + '分钟前'
  if (diff < 86400000) return Math.floor(diff / 3600000) + '小时前'
  return d.toLocaleDateString('zh-CN')
}

function inferTypeFromText(item: any): string | null {
  const hay = `${item?.title || ''} ${item?.content || ''}`.toLowerCase()
  if (/请假/.test(hay)) return 'leave'
  if (/报销/.test(hay)) return 'reimbursement'
  if (/会议/.test(hay)) return 'meeting'
  if (/出差/.test(hay)) return 'businessTrip'
  if (/招待|业务招待/.test(hay)) return 'entertainment'
  if (/协同|办公用品|项目申请|项目/.test(hay)) return 'project'
  if (/下发|分派|分发/.test(hay)) return 'distributed'
  return null
}

function resolveJumpRoute(item: any): string {
  const t = item?.applicationType || inferTypeFromText(item)
  if (item?.type === 'distributed_read' && item?.relatedType && item?.relatedId) {
    return `/oa-office?tab=distributedByMe&expandKey=${item.relatedType}-${item.relatedId}`
  }
  if (item?.type === 'collaboration' && item?.relatedType === 'project' && item?.relatedId) {
    return `/oa-office?tab=project&subTab=tome&expandKey=project-${item.relatedId}`
  }
  if (item?.relatedType === 'distributed' && item?.relatedId) {
    if (['leave', 'reimbursement', 'meeting', 'project', 'businessTrip', 'entertainment'].includes(t)) {
      return `/oa-office?tab=distributed&subType=${t}`
    }
    return '/oa-office?tab=distributed'
  }
  if (item?.type === 'approval' || item?.type === 'notify') {
    if (['leave', 'reimbursement', 'meeting', 'project', 'businessTrip', 'entertainment'].includes(t)) {
      return `/oa-office?tab=${t}&subTab=received`
    }
    return '/oa-office'
  }
  const dt = inferTypeFromText(item)
  if (dt && dt !== 'distributed') return `/oa-office?tab=${dt}&subTab=received`
  if (dt === 'distributed') return '/oa-office?tab=distributedByMe'
  return '/'
}

async function load() {
  if (!userId) return
  try {
    const r = await fetch(`/api/notifications?userId=${encodeURIComponent(userId)}&page=1&pageSize=5&unreadOnly=1`)
    const j = await r.json()
    if (j.success) list.value = j.data.list || []
  } catch { /* ignore */ }
  try {
    const r2 = await fetch(`/api/notifications/unread-count?userId=${encodeURIComponent(userId)}`)
    const j2 = await r2.json()
    if (j2.success) unreadCount.value = j2.data.count || 0
  } catch { /* ignore */ }
}

async function onClick(item: any) {
  try {
    if (!item.isRead) await fetch(`/api/notifications/${item.id}/read`, { method: 'PUT' })
    const route = resolveJumpRoute(item)
    if (route) router.push(`${route}${route.includes('?') ? '&' : '?'}fromNotification=1`)
  } catch { /* ignore */ }
  open.value = false
}

function goAll() {
  router.push('/message-center')
  open.value = false
}

function toggle() {
  open.value = !open.value
  if (open.value) load()
}

onMounted(() => {
  load()
  timer = setInterval(load, 30000)
})
onUnmounted(() => { if (timer) clearInterval(timer) })
</script>

<style scoped>
.mba-root { position: fixed; right: 20px; bottom: 20px; z-index: 2000; }
.mba-ball {
  width: 52px; height: 52px; border-radius: 50%; background: #409eff; color: #fff;
  display: flex; align-items: center; justify-content: center; cursor: pointer; position: relative;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.2); transition: transform 0.15s;
}
.mba-ball:hover { transform: scale(1.06); }
.mba-badge {
  position: absolute; top: -4px; right: -4px; min-width: 18px; height: 18px; padding: 0 4px;
  border-radius: 9px; background: #f56c6c; color: #fff; font-size: 12px; line-height: 18px; text-align: center;
  border: 2px solid #fff; box-sizing: content-box;
}
.mba-panel {
  position: absolute; right: 0; bottom: 64px; width: 300px; background: #fff;
  border: 1px solid #ebeef5; border-radius: 12px; box-shadow: 0 2px 12px rgba(0, 0, 0, 0.15); overflow: hidden;
}
.mba-head {
  display: flex; justify-content: space-between; align-items: center; padding: 10px 14px;
  border-bottom: 1px solid #f0f2f5; font-size: 14px; font-weight: 500; color: #303133;
}
.mba-unread { font-size: 12px; color: #f56c6c; }
.mba-list { max-height: 300px; overflow-y: auto; }
.mba-item {
  position: relative; display: flex; align-items: flex-start; gap: 8px;
  padding: 10px 14px 10px 22px; border-bottom: 1px solid #f5f7fa; cursor: pointer;
}
.mba-item:hover { background: #f8f9fb; }
.mba-dot { position: absolute; left: 10px; top: 16px; width: 6px; height: 6px; border-radius: 50%; background: #409eff; }
.mba-main { min-width: 0; flex: 1; }
.mba-title { font-size: 13px; color: #303133; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.mba-time { font-size: 12px; color: #bbb; margin-top: 4px; }
.mba-empty { padding: 30px; text-align: center; color: #999; font-size: 13px; }
.mba-foot { padding: 10px 14px; text-align: right; font-size: 12px; color: #409eff; cursor: pointer; }
.mba-foot:hover { text-decoration: underline; }
.mba-pop-enter-active, .mba-pop-leave-active { transition: opacity 0.18s, transform 0.18s; }
.mba-pop-enter-from, .mba-pop-leave-to { opacity: 0; transform: translateY(8px); }
</style>
