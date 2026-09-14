<template>
  <div class="stats-panel" v-loading="loading">
    <div class="stat-card">
      <div class="stat-label">意向漏斗</div>
      <div class="stat-value">{{ formatNumber(stats.intention?.total || 0) }}<span class="unit">条</span></div>
      <div class="stat-sub">本月回款 {{ formatMoney(stats.intention?.monthly) }} / 预计总额 {{ formatMoney(stats.intention?.estimated) }}</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">重点漏斗</div>
      <div class="stat-value">{{ formatNumber(stats.key?.total || 0) }}<span class="unit">条</span></div>
      <div class="stat-sub">本月回款 {{ formatMoney(stats.key?.monthly) }} / 预计总额 {{ formatMoney(stats.key?.estimated) }}</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">成交用户</div>
      <div class="stat-value">{{ formatNumber(stats.deal?.total || 0) }}<span class="unit">条</span></div>
      <div class="stat-sub">合同 {{ formatMoney(stats.deal?.contract) }} / 回款 {{ formatMoney(stats.deal?.received) }} / 未回 {{ formatMoney(stats.deal?.unreceived) }}</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">大项目进展</div>
      <div class="stat-value">{{ formatNumber(stats.project?.total || 0) }}<span class="unit">条</span></div>
      <div class="stat-sub">覆盖重点客户与拜访记录</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { salesFetchJSON } from './salesApi'

const stats = ref<any>({})
const loading = ref(false)

function formatNumber(n: any) {
  const num = Number(n || 0)
  return num.toLocaleString()
}
function formatMoney(n: any) {
  const num = Number(n || 0)
  return '¥' + num.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })
}

async function load() {
  loading.value = true
  try {
    const json = await salesFetchJSON('/api/sales-four-tables/stats')
    if (json.success) stats.value = json.data || {}
  } catch (e: any) {
    console.error('统计加载失败:', e.message)
  } finally {
    loading.value = false
  }
}

onMounted(load)
defineExpose({ load })
</script>

<style scoped>
.stats-panel { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 1rem; margin-bottom: 1rem; }
.stat-card { background: #fff; border-radius: 10px; padding: 1rem; box-shadow: 0 2px 8px rgba(0,0,0,0.06); }
.stat-label { font-size: 0.85rem; color: #666; margin-bottom: 0.4rem; }
.stat-value { font-size: 1.6rem; font-weight: 700; color: #2c3e50; }
.stat-value .unit { font-size: 0.85rem; font-weight: 400; color: #888; margin-left: 0.3rem; }
.stat-sub { margin-top: 0.4rem; font-size: 0.8rem; color: #888; }
</style>
