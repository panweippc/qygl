<template>
  <div class="todo">
    <!-- Tab 切换：普通员工只显示“我的申请”，审批角色才显示“待我审批” -->
    <div class="tabs" :class="{ single: !isApprover }">
      <div
        class="tab"
        :class="{ active: activeTab === 'my' }"
        @click="activeTab = 'my'"
      >
        我的申请
      </div>
      <div
        v-if="isApprover"
        class="tab"
        :class="{ active: activeTab === 'todo' }"
        @click="activeTab = 'todo'"
      >
        待我审批
        <span class="tab-badge" v-if="todoCount > 0">{{ todoCount > 99 ? '99+' : todoCount }}</span>
      </div>
    </div>

    <!-- 我的申请 -->
    <div v-if="activeTab === 'my'" class="m-card">
      <div v-if="myLoading" class="m-muted">加载中…</div>
      <div v-else-if="myList.length === 0" class="empty">
        <div class="m-muted">暂无申请记录</div>
        <button class="m-btn" style="margin-top: 14px" @click="go('/')">去发起申请</button>
      </div>

      <div v-for="it in myList" :key="it.id + '_' + it.source" class="app-item" @click="go('/')">
        <div class="a-main">
          <div class="a-title">{{ it.businessType || '申请' }} · {{ it.applicantName || '' }}</div>
          <div class="m-muted">{{ (it.createdAt || '').slice(0, 16).replace('T', ' ') }}</div>
          <div class="m-muted a-bd" v-if="bd(it)">{{ bd(it) }}</div>
        </div>
        <span class="a-tag" :class="tagClass(it.status)">{{ it.status }}</span>
      </div>
    </div>

    <!-- 待我审批 -->
    <div v-if="activeTab === 'todo'" class="m-card">
      <div v-if="loading" class="m-muted">加载中…</div>
      <div v-else-if="list.length === 0" class="m-muted">暂无待办 🎉</div>

      <div v-for="it in list" :key="it.id" class="todo-item">
        <div class="m-row">
          <div class="todo-main">
            <div class="todo-title">{{ it.applicantName || '申请人' }} · {{ it.businessType || '审批' }}</div>
            <div class="m-muted">
              状态：{{ it.status || '审批中' }}
              <template v-if="it.currentStepName"> · {{ it.currentStepName }}</template>
            </div>
          </div>
          <span class="todo-tag">待审</span>
        </div>

        <div class="todo-actions">
          <button class="m-btn ghost" @click="open(it, 'reject')">驳回</button>
          <button class="m-btn" @click="open(it, 'approve')">通过</button>
        </div>
      </div>
    </div>

    <!-- 审批意见弹层 -->
    <div class="sheet-mask" v-if="active" @click.self="active = null">
      <div class="sheet">
        <div class="sheet-title">{{ active?.action === 'approve' ? '通过审批' : '驳回审批' }}</div>
        <textarea
          class="m-input"
          style="height: 80px; padding: 8px"
          v-model="comment"
          :placeholder="active?.action === 'approve' ? '审批意见（可选）' : '驳回理由（必填）'"
        ></textarea>
        <div class="sheet-btns">
          <button class="m-btn ghost" @click="active = null">取消</button>
          <button
            class="m-btn"
            :class="{ danger: active?.action === 'reject' }"
            :disabled="active?.action === 'reject' && !comment.trim()"
            @click="submit"
          >
            提交
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import api from '@/services/api'
import { badge } from '@/mobile/badge'

interface TodoItem {
  id: number
  applicantName?: string
  businessType?: string
  status?: string
  currentStepName?: string
}

const router = useRouter()
const activeTab = ref<'my' | 'todo'>('my')

const list = ref<TodoItem[]>([])
const loading = ref(true)
const active = ref<{ item: TodoItem; action: 'approve' | 'reject' } | null>(null)
const comment = ref('')

const myList = ref<any[]>([])
const myLoading = ref(true)
const todoCount = ref(0)

const userId = Number(localStorage.getItem('userId') || 0)
const userName = localStorage.getItem('username') || ''
const role = localStorage.getItem('role') || ''

// 只有审批角色才显示“待我审批”tab：经理/总监/管理员/总经理/主管/部长/负责人
const APPROVER_KEYS = ['经理', '总监', '管理员', '总经理', '主管', '部长', '负责人']
const isApprover = computed(() =>
  APPROVER_KEYS.some(k => (role || '').includes(k)) || todoCount.value > 0
)

function go(p: string) {
  router.push(p)
}

function bd(it: any) {
  const d = it.businessData || {}
  const parts: string[] = []
  if (d.title) parts.push(d.title)
  if (d.amount) parts.push('¥' + d.amount)
  if (d.reason) parts.push(d.reason)
  return parts.join(' · ')
}

function tagClass(status: string) {
  if (['审批中', '待审批', 'pending'].includes(status)) return 't-doing'
  if (['已批准', '已通过', 'approved', '已同意'].includes(status)) return 't-ok'
  if (['已拒绝', '已退回', 'rejected', 'returned'].includes(status)) return 't-no'
  if (['已撤回', '已取消', 'withdrawn', 'cancelled'].includes(status)) return 't-grey'
  return 't-grey'
}

async function loadTodo() {
  loading.value = true
  try {
    const res = await api.get(`/oa/todo/${userId}`)
    if (res.data && res.data.success) {
      list.value = res.data.data || []
      todoCount.value = list.value.length
      localStorage.setItem('todoCount', String(todoCount.value))
      badge.todo = todoCount.value
    }
  } catch (e) {
    /* ignore */
  } finally {
    loading.value = false
  }
}

async function loadMy() {
  myLoading.value = true
  try {
    const res = await api.get(`/oa/all-my-applications/${userId}`)
    if (res.data && res.data.success) {
      myList.value = res.data.data || []
    }
  } catch (e) {
    /* ignore */
  } finally {
    myLoading.value = false
  }
}

function open(item: TodoItem, action: 'approve' | 'reject') {
  active.value = { item, action }
  comment.value = ''
}

async function submit() {
  if (!active.value) return
  const { item, action } = active.value
  try {
    const res = await api.post('/oa/process', {
      instanceId: item.id,
      approverId: userId,
      approverName: userName,
      approverPosition: '',
      action: action === 'approve' ? 'agree' : 'reject',
      comment: comment.value.trim()
    })
    if (res.data && res.data.success) {
      active.value = null
      await loadTodo()
    } else {
      alert((res.data && res.data.message) || '操作失败')
    }
  } catch (e: any) {
    alert(e?.response?.data?.message || '网络错误')
  }
}

onMounted(() => {
  loadMy()
  if (isApprover.value) loadTodo()
})
</script>

<style scoped>
.tabs {
  display: flex;
  background: #fff;
  border-bottom: 1px solid #ebedf0;
  position: sticky;
  top: 0;
  z-index: 5;
}
.tab {
  flex: 1;
  text-align: center;
  padding: 12px 0;
  font-size: 15px;
  color: #646566;
  position: relative;
}
.tab.active {
  color: #185fa5;
  font-weight: 600;
}
.tab.active::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 28px;
  height: 3px;
  background: #185fa5;
  border-radius: 2px;
}
.tab-badge {
  display: inline-block;
  margin-left: 4px;
  background: #ee0a24;
  color: #fff;
  font-size: 10px;
  line-height: 14px;
  padding: 0 4px;
  border-radius: 7px;
}

.m-card {
  margin: 12px;
  background: #fff;
  border-radius: 12px;
  padding: 14px;
}
.app-item {
  display: flex; align-items: flex-start; justify-content: space-between;
  padding: 12px 0; border-top: 1px solid #f0f1f2;
}
.a-title { font-size: 15px; font-weight: 600; }
.a-bd { margin-top: 4px; }
.a-tag { font-size: 12px; padding: 2px 8px; border-radius: 6px; white-space: nowrap; margin-left: 8px; }
.t-doing { background: #e6f1fb; color: #185fa5; }
.t-ok { background: #eaf3de; color: #639922; }
.t-no { background: #fde8e8; color: #ee0a24; }
.t-grey { background: #f2f3f5; color: #969799; }

.todo-item {
  border-top: 1px solid #f0f1f2;
  padding: 12px 0;
}
.todo-title {
  font-size: 15px;
  font-weight: 600;
}
.todo-tag {
  font-size: 12px;
  color: #185fa5;
  background: #e6f1fb;
  border-radius: 6px;
  padding: 2px 8px;
}
.todo-actions {
  display: flex;
  gap: 10px;
  margin-top: 10px;
}
.todo-actions .m-btn {
  flex: 1;
}
.sheet-mask {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: flex-end;
  z-index: 20;
}
.sheet {
  width: 100%;
  background: #fff;
  border-radius: 14px 14px 0 0;
  padding: 16px;
}
.sheet-title {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 12px;
}
.sheet-btns {
  display: flex;
  gap: 10px;
  margin-top: 12px;
}
.sheet-btns .m-btn {
  flex: 1;
}
.empty {
  text-align: center;
  padding: 32px 0;
}
</style>
