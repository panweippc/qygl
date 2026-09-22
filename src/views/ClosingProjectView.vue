<template>
  <div class="closing-page">
    <PageHeaderBar title="成交项目">
      <template #actions>
        <el-tag v-if="perm.canWrite" type="success">可维护</el-tag>
        <el-tag v-else type="info">仅查看</el-tag>
      </template>
    </PageHeaderBar>

    <div class="cl-summary" v-loading="summaryLoading">
      <div class="cl-stat">
        <div class="cl-stat-label">成交总数</div>
        <div class="cl-stat-value">{{ summary.count }}</div>
      </div>
      <div class="cl-stat">
        <div class="cl-stat-label">合同总额</div>
        <div class="cl-stat-value">¥{{ fmt(summary.contract) }}</div>
      </div>
      <div class="cl-stat">
        <div class="cl-stat-label">实际金额</div>
        <div class="cl-stat-value">¥{{ fmt(summary.actual) }}</div>
      </div>
      <div class="cl-stat">
        <div class="cl-stat-label">已回款</div>
        <div class="cl-stat-value cl-pos">¥{{ fmt(summary.received) }}</div>
      </div>
      <div class="cl-stat">
        <div class="cl-stat-label">未回款</div>
        <div class="cl-stat-value cl-neg">¥{{ fmt(summary.unreceived) }}</div>
      </div>
    </div>

    <div class="cl-guide">
      <el-alert title="说明" type="info" :closable="false" show-icon>
        <p>本页面为「成交项目」独立视图，展示销售漏斗中「成交用户」表的全部项目信息，含客户、负责人、销售/代理类型、合同与回款金额、联系人、站点数、备注等详细内容。销售部成员与业务中心经理可新增/编辑，总经理/管理员可查看全部。</p>
      </el-alert>
    </div>

    <div class="cl-trend">
      <div class="trend-card">
        <h3 class="cl-card-title">成交趋势（按申报月份）</h3>
        <div ref="chartRef" class="trend-chart"></div>
      </div>
      <div class="rank-card">
        <h3 class="cl-card-title">负责人成交 TOP5（按合同额）</h3>
        <ul class="rank-list">
          <li v-for="(o, i) in topOwners" :key="o.owner">
            <span class="rank-no" :class="'rank-' + (i + 1)">{{ i + 1 }}</span>
            <span class="rank-name">{{ o.owner }}</span>
            <span class="rank-amt">¥{{ fmt(o.amount) }}</span>
          </li>
          <li v-if="!topOwners.length" class="rank-empty">暂无数据</li>
        </ul>
      </div>
    </div>

    <DealTable :perm="perm" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick, computed } from 'vue'
import * as echarts from 'echarts'
import { salesFetchJSON } from '../components/sales/salesApi'
import PageHeaderBar from '../components/PageHeaderBar.vue'
import DealTable from '../components/sales/DealTable.vue'

const perm = ref({ canWrite: false, canView: false, isAdmin: false })
const summary = ref({ count: 0, contract: 0, actual: 0, received: 0, unreceived: 0 })
const summaryLoading = ref(false)
const allRows = ref<any[]>([])
const chartRef = ref<HTMLElement | null>(null)
let trendChart: echarts.ECharts | null = null

const topOwners = computed(() => {
  const map = new Map<string, number>()
  for (const r of allRows.value) {
    const o = String(r.owner || '未分配')
    map.set(o, (map.get(o) || 0) + Number(r.contract_amount || 0))
  }
  return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([owner, amount]) => ({ owner, amount }))
})

async function loadPerm() {
  try {
    const json = await salesFetchJSON('/api/sales-four-tables/permission')
    if (json.success && json.data) {
      perm.value = {
        canWrite: Boolean(json.data.canWrite),
        canView: Boolean(json.data.canView || json.data.isOwnerFilter),
        isAdmin: Boolean(json.data.isAdmin)
      }
    }
  } catch (e: any) {
    console.error('获取成交项目权限失败:', e.message)
  }
}

async function loadSummary() {
  summaryLoading.value = true
  try {
    const json = await salesFetchJSON('/api/sales-four-tables/deal?pageSize=10000')
    if (json.success && json.data?.list) {
      const list = json.data.list
      allRows.value = list
      summary.value = {
        count: list.length,
        contract: list.reduce((s: number, r: any) => s + Number(r.contract_amount || 0), 0),
        actual: list.reduce((s: number, r: any) => s + Number(r.actual_amount || 0), 0),
        received: list.reduce((s: number, r: any) => s + Number(r.received_amount || 0), 0),
        unreceived: list.reduce((s: number, r: any) => s + Number(r.unreceived_amount || 0), 0)
      }
      await nextTick()
      initTrendChart()
    }
  } catch (e: any) {
    console.error('加载成交项目汇总失败:', e.message)
  } finally {
    summaryLoading.value = false
  }
}

function initTrendChart() {
  if (!chartRef.value) return
  if (trendChart) trendChart.dispose()
  trendChart = echarts.init(chartRef.value)
  const map = new Map<string, { contract: number; actual: number; received: number }>()
  for (const r of allRows.value) {
    const m = String(r.report_month || '未知')
    const cur = map.get(m) || { contract: 0, actual: 0, received: 0 }
    cur.contract += Number(r.contract_amount || 0)
    cur.actual += Number(r.actual_amount || 0)
    cur.received += Number(r.received_amount || 0)
    map.set(m, cur)
  }
  const months = [...map.keys()].sort()
  const contractData = months.map(m => map.get(m)!.contract)
  const actualData = months.map(m => map.get(m)!.actual)
  const receivedData = months.map(m => map.get(m)!.received)
  trendChart.setOption({
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, valueFormatter: (v: number) => '¥' + Number(v || 0).toLocaleString() },
    legend: { data: ['合同额', '实际金额', '回款金额'], bottom: 0 },
    grid: { left: '3%', right: '4%', bottom: '12%', top: '8%', containLabel: true },
    xAxis: { type: 'category', data: months, axisLabel: { color: '#666', rotate: months.length > 8 ? 35 : 0 } },
    yAxis: { type: 'value', axisLabel: { color: '#666', formatter: (v: number) => v >= 10000 ? (v / 10000) + '万' : String(v) } },
    series: [
      { name: '合同额', type: 'bar', data: contractData, itemStyle: { color: '#1E5AA8' }, barMaxWidth: 28 },
      { name: '实际金额', type: 'bar', data: actualData, itemStyle: { color: '#5B8FC9' }, barMaxWidth: 28 },
      { name: '回款金额', type: 'bar', data: receivedData, itemStyle: { color: '#67c23a' }, barMaxWidth: 28 }
    ]
  })
}

function fmt(n: number): string {
  return Number(n || 0).toLocaleString()
}

onMounted(() => { loadPerm(); loadSummary() })

const handleResize = () => { trendChart?.resize() }
window.addEventListener('resize', handleResize)
onUnmounted(() => { window.removeEventListener('resize', handleResize); trendChart?.dispose() })
</script>

<style scoped>
.closing-page { background: #E4EDF2; min-height: 100vh; display: flex; flex-direction: column; }
.cl-summary {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
  padding: 1rem 1.5rem 0;
}
.cl-stat {
  flex: 1 1 160px;
  background: rgba(255,255,255,0.95);
  border: 1px solid rgba(30, 90, 168,0.25);
  border-radius: 10px;
  padding: 0.8rem 1rem;
  box-shadow: 0 2px 8px rgba(0,0,0,0.06);
}
.cl-stat-label { font-size: 0.82rem; color: rgba(51,51,51,0.6); }
.cl-stat-value { font-size: 1.4rem; font-weight: 700; color: #333; margin-top: 0.25rem; }
.cl-stat-value.cl-pos { color: #2e7d32; }
.cl-stat-value.cl-neg { color: #c62828; }
.cl-guide { padding: 0.75rem 1.5rem; background: rgba(255,255,255,0.6); }
.cl-guide p { margin: 0.4rem 0 0; line-height: 1.6; color: #4a5568; font-size: 0.9rem; }
.cl-trend { display: flex; gap: 1rem; padding: 0 1.5rem 1rem; flex-wrap: wrap; }
.trend-card { flex: 3 1 460px; background: rgba(255,255,255,0.95); border: 1px solid rgba(30,90,168,0.25); border-radius: 10px; padding: 0.8rem 1rem 1rem; box-shadow: 0 2px 8px rgba(0,0,0,0.06); }
.rank-card { flex: 1 1 240px; background: rgba(255,255,255,0.95); border: 1px solid rgba(30,90,168,0.25); border-radius: 10px; padding: 0.8rem 1rem 1rem; box-shadow: 0 2px 8px rgba(0,0,0,0.06); }
.cl-card-title { margin: 0 0 0.6rem; font-size: 0.95rem; color: #16487F; border-bottom: 2px solid rgba(30,90,168,0.3); padding-bottom: 0.5rem; }
.trend-chart { width: 100%; height: 300px; }
.rank-list { list-style: none; margin: 0; padding: 0; }
.rank-list li { display: flex; align-items: center; gap: 0.6rem; padding: 0.55rem 0.2rem; border-bottom: 1px dashed #e6eef7; }
.rank-list li:last-child { border-bottom: none; }
.rank-no { flex: 0 0 22px; height: 22px; line-height: 22px; text-align: center; border-radius: 50%; font-size: 0.8rem; font-weight: 700; color: #fff; background: #b0bec5; }
.rank-no.rank-1 { background: #f5a623; }
.rank-no.rank-2 { background: #9aa7b3; }
.rank-no.rank-3 { background: #cd7f32; }
.rank-name { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: #333; font-size: 0.9rem; }
.rank-amt { color: #1E5AA8; font-weight: 600; font-size: 0.9rem; }
.rank-empty { color: #909399; font-size: 0.85rem; justify-content: center; }
</style>
