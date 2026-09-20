<template>
  <div class="myapply">
    <div class="m-card">
      <div class="m-title">我的申请</div>
      <div v-if="loading" class="m-muted">加载中…</div>
      <div v-else-if="list.length === 0" class="m-muted">暂无申请记录</div>

      <div v-for="it in list" :key="it.id" class="app-item">
        <div class="a-main">
          <div class="a-title">{{ it.businessType || '审批' }} · {{ it.applicantName || '' }}</div>
          <div class="m-muted">{{ (it.createdAt || '').slice(0, 16).replace('T', ' ') }}</div>
          <div class="m-muted a-bd" v-if="bd(it)">{{ bd(it) }}</div>
        </div>
        <span class="a-tag" :class="tagClass(it.status)">{{ it.status }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import api from '@/services/api'

const list = ref<any[]>([])
const loading = ref(true)

function bd(it: any) {
  const d = it.businessData || {}
  const parts: string[] = []
  if (d.title) parts.push(d.title)
  if (d.amount) parts.push('¥' + d.amount)
  return parts.join(' · ')
}

function tagClass(status: string) {
  if (['审批中', '待审批', 'pending'].includes(status)) return 't-doing'
  if (['已批准', '已通过', 'approved', '已同意'].includes(status)) return 't-ok'
  if (['已拒绝', '已退回', 'rejected', 'returned'].includes(status)) return 't-no'
  if (['已撤回', '已取消', 'withdrawn', 'cancelled'].includes(status)) return 't-grey'
  return 't-grey'
}

async function load() {
  loading.value = true
  const userId = localStorage.getItem('userId') || 0
  try {
    const res = await api.get(`/oa/all-my-applications/${userId}`)
    if (res.data && res.data.success) list.value = res.data.data || []
  } catch (e) { /* ignore */ }
  finally { loading.value = false }
}

onMounted(load)
</script>

<style scoped>
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
</style>
