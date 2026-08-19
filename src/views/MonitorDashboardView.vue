<template>
  <div class="monitor-dashboard">
    <div class="dashboard-header">
      <h2>系统监控面板</h2>
      <div class="header-actions">
        <el-select v-model="selectedHours" @change="loadMetrics" style="width: 140px">
          <el-option label="最近 1 小时" :value="1" />
          <el-option label="最近 6 小时" :value="6" />
          <el-option label="最近 24 小时" :value="24" />
          <el-option label="最近 7 天" :value="168" />
        </el-select>
        <el-button @click="refreshAll" :loading="refreshing">刷新</el-button>
      </div>
    </div>

    <!-- 实时仪表盘卡片 -->
    <el-row :gutter="16" class="metric-cards">
      <el-col :span="6">
        <el-card shadow="hover" class="metric-card">
          <div class="metric-icon" :style="{ background: getStatusColor(latest?.app_status) }">
            <svg viewBox="0 0 24 24" fill="#fff" width="28" height="28"><path d="M19 3H5c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h5v2h2v-2h5c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 14H5V5h14v12z"/></svg>
          </div>
          <div class="metric-info">
            <div class="metric-label">系统状态</div>
            <div class="metric-value" :style="{ color: getStatusColor(latest?.app_status) }">
              {{ latest?.app_status === 'ok' ? '正常' : '降级' }}
            </div>
            <div class="metric-sub">运行 {{ formatUptime(latest?.uptime_seconds) }}</div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover" class="metric-card">
          <div class="metric-icon" :style="{ background: getMemColor(latest?.cpu_percent) }">
            <svg viewBox="0 0 24 24" fill="#fff" width="28" height="28"><path d="M4 6h4v4H4zm0 6h4v4H4zm6-6h4v4h-4zm0 6h4v4h-4zm6-6h4v4h-4zm0 6h4v4h-4z"/></svg>
          </div>
          <div class="metric-info">
            <div class="metric-label">CPU 使用率</div>
            <div class="metric-value" :style="{ color: getMemColor(latest?.cpu_percent) }">
              {{ latest?.cpu_percent ?? '--' }}%
            </div>
            <div class="metric-sub">内存 {{ latest?.mem_used_mb ?? '--' }} / {{ latest?.mem_total_mb ?? '--' }} MB</div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover" class="metric-card">
          <div class="metric-icon" :style="{ background: getMemColor(latest?.mem_used_percent) }">
            <svg viewBox="0 0 24 24" fill="#fff" width="28" height="28"><path d="M21 6H3c-1.1 0-2 .9-2 2v8c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm0 10H3V8h18v8zM6 15h2v-4H6v4zm4 0h2v-4h-2v4zm4 0h2v-4h-2v4z"/></svg>
          </div>
          <div class="metric-info">
            <div class="metric-label">内存使用率</div>
            <div class="metric-value" :style="{ color: getMemColor(latest?.mem_used_percent) }">
              {{ latest?.mem_used_percent ?? '--' }}%
            </div>
            <div class="metric-sub">磁盘 {{ latest?.disk_used_percent ?? '--' }}% 已用</div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover" class="metric-card">
          <div class="metric-icon" :style="{ background: getDbColor(latest?.db_status) }">
            <svg viewBox="0 0 24 24" fill="#fff" width="28" height="28"><path d="M12 3C7 3 2.73 4.82 1 7.5L1 16.5C2.73 19.18 7 21 12 21s9.27-1.82 11-4.5V7.5C21.27 4.82 17 3 12 3zM12 19c-4.41 0-8-1.79-8-4V8c3.58 2.29 8 3 8 3s4.42-.71 8-3v7c0 2.21-3.59 4-8 4z"/></svg>
          </div>
          <div class="metric-info">
            <div class="metric-label">数据库延迟</div>
            <div class="metric-value" :style="{ color: getDbColor(latest?.db_status) }">
              {{ latest?.db_latency_ms ?? '--' }} ms
            </div>
            <div class="metric-sub">连接池: {{ latest?.pool_active ?? 0 }} 活跃 / {{ latest?.pool_idle ?? 0 }} 空闲</div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 方案A：服务存活监控 -->
    <el-card shadow="hover" class="kuma-card">
      <template #header>
        <div class="card-header">
          <span>服务存活监控</span>
          <el-tag v-if="kumaStatus?.success" type="success" size="small">运行中</el-tag>
          <el-tag v-else type="warning" size="small">监控服务异常</el-tag>
        </div>
      </template>
      <div v-if="kumaStatus?.success && kumaMonitors.length > 0" class="kuma-services-detail">
        <el-table :data="kumaMonitors" style="width: 100%" :row-class-name="rowClassName">
          <el-table-column label="状态" width="100" align="center">
            <template #default="{ row }">
              <el-tag
                :type="row.status === 'up' ? 'success' : row.status === 'down' ? 'danger' : 'warning'"
                size="small"
                effect="dark"
              >
                {{ row.status === 'up' ? '● 正常' : row.status === 'down' ? '✕ 异常' : '○ 未知' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="name" label="服务名称" min-width="120" />
          <el-table-column label="类型" width="80" align="center">
            <template #default="{ row }">
              <el-tag :type="row.type === 'http' ? '' : 'info'" size="small">{{ row.type?.toUpperCase() }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="响应时间" width="120" align="center">
            <template #default="{ row }">
              <span :class="getResponseTimeClass(row.responseTime)">{{ row.responseTime }}ms</span>
            </template>
          </el-table-column>
          <el-table-column label="HTTP状态" width="100" align="center">
            <template #default="{ row }">
              <span v-if="row.statusCode" :class="row.statusCode >= 200 && row.statusCode < 400 ? 'text-success' : 'text-danger'">{{ row.statusCode }}</span>
              <span v-else class="text-muted">--</span>
            </template>
          </el-table-column>
          <el-table-column label="可用率" width="100" align="center">
            <template #default="{ row }">
              <span :class="row.uptime >= 99 ? 'text-success' : row.uptime >= 90 ? 'text-warning' : 'text-danger'">{{ row.uptime }}%</span>
            </template>
          </el-table-column>
          <el-table-column label="详细信息" min-width="200">
            <template #default="{ row }">
              <div v-if="row.errorMsg" class="error-msg">{{ row.errorMsg }}</div>
              <div v-else-if="row.details" class="service-details">
                <span v-if="row.details.version">版本: {{ row.details.version }}</span>
                <span v-if="row.details.dbStatus">数据库: {{ row.details.dbStatus }}</span>
                <span v-if="row.details.tableCount !== null && row.details.tableCount !== undefined">表数量: {{ row.details.tableCount }}</span>
                <span v-if="row.details.cpuUsage !== null && row.details.cpuUsage !== undefined">CPU: {{ row.details.cpuUsage }}%</span>
                <span v-if="row.details.memUsed !== null && row.details.memUsed !== undefined">内存: {{ row.details.memUsed }}%</span>
              </div>
              <span v-else class="text-muted">无附加信息</span>
            </template>
          </el-table-column>
          <el-table-column label="最后检查时间" width="180" align="center">
            <template #default="{ row }">
              <span v-if="row.lastCheck" class="text-muted">{{ formatTime(row.lastCheck) }}</span>
              <span v-else class="text-muted">--</span>
            </template>
          </el-table-column>
        </el-table>
      </div>
      <div v-else-if="kumaStatus?.success === false" class="kuma-notice">
        <div class="notice-header">
          <span class="notice-icon">⚠️</span>
          <span>监控服务连接异常</span>
        </div>
        <div class="notice-content">
          <p>{{ kumaStatus?.message || '无法连接到监控服务' }}</p>
        </div>
      </div>
    </el-card>

    <!-- 方案B：趋势图表 -->
    <el-row :gutter="16" class="chart-row">
      <el-col :span="12">
        <el-card shadow="hover">
          <template #header>CPU 使用率趋势</template>
          <div ref="cpuChartRef" style="height: 280px"></div>
        </el-card>
      </el-col>
      <el-col :span="12">
        <el-card shadow="hover">
          <template #header>内存使用率趋势</template>
          <div ref="memChartRef" style="height: 280px"></div>
        </el-card>
      </el-col>
    </el-row>
    <el-row :gutter="16" class="chart-row">
      <el-col :span="12">
        <el-card shadow="hover">
          <template #header>磁盘使用率趋势</template>
          <div ref="diskChartRef" style="height: 280px"></div>
        </el-card>
      </el-col>
      <el-col :span="12">
        <el-card shadow="hover">
          <template #header>数据库响应延迟趋势</template>
          <div ref="dbChartRef" style="height: 280px"></div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 连接池状态 -->
    <el-card shadow="hover" class="chart-row">
      <template #header>数据库连接池状态</template>
      <div ref="poolChartRef" style="height: 280px"></div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick } from 'vue'
import { ElMessage } from 'element-plus'
import { init } from 'echarts'
import { getMonitorMetrics, getMonitorLatest, getUptimeKumaStatus } from '@/services/api'

const selectedHours = ref(24)
const refreshing = ref(false)
const latest = ref<any>(null)
const kumaStatus = ref<any>(null)
const metricsData = ref<any[]>([])

const cpuChartRef = ref<HTMLElement | null>(null)
const memChartRef = ref<HTMLElement | null>(null)
const diskChartRef = ref<HTMLElement | null>(null)
const dbChartRef = ref<HTMLElement | null>(null)
const poolChartRef = ref<HTMLElement | null>(null)

let cpuChart: any = null
let memChart: any = null
let diskChart: any = null
let dbChart: any = null
let poolChart: any = null
let refreshTimer: ReturnType<typeof setInterval> | null = null

const kumaMonitors = ref<any[]>([])

const formatTime = (isoStr: string) => {
  const dt = new Date(isoStr)
  return `${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')} ${String(dt.getHours()).padStart(2, '0')}:${String(dt.getMinutes()).padStart(2, '0')}:${String(dt.getSeconds()).padStart(2, '0')}`
}

const getResponseTimeClass = (ms: number) => {
  if (ms <= 100) return 'text-success'
  if (ms <= 500) return 'text-warning'
  return 'text-danger'
}

const rowClassName = ({ row }: any) => {
  return row.status === 'down' ? 'row-danger' : ''
}

const formatUptime = (seconds?: number) => {
  if (!seconds && seconds !== 0) return '--'
  const days = Math.floor(seconds / 86400)
  const hours = Math.floor((seconds % 86400) / 3600)
  const mins = Math.floor((seconds % 3600) / 60)
  if (days > 0) return `${days}天${hours}小时`
  if (hours > 0) return `${hours}小时${mins}分钟`
  return `${mins}分钟`
}

const getStatusColor = (status?: string) => {
  if (status === 'ok') return '#67c23a'
  if (status === 'degraded') return '#f56c6c'
  return '#909399'
}
const getMemColor = (percent?: number) => {
  if (percent === undefined || percent === null) return '#909399'
  if (percent >= 90) return '#f56c6c'
  if (percent >= 75) return '#e6a23c'
  return '#67c23a'
}
const getDbColor = (status?: string) => {
  if (status === 'up') return '#67c23a'
  if (status === 'down') return '#f56c6c'
  return '#909399'
}

const loadLatest = async () => {
  try {
    const res = await getMonitorLatest()
    if (res.success) {
      latest.value = res.data
    }
  } catch (error) {
    console.error('获取最新指标失败:', error)
  }
}

const loadMetrics = async () => {
  try {
    const res = await getMonitorMetrics(selectedHours.value)
    if (res.success && res.data) {
      metricsData.value = res.data
      await nextTick()
      renderCharts()
    }
  } catch (error) {
    console.error('获取监控历史数据失败:', error)
  }
}

const loadKumaStatus = async () => {
  try {
    const res = await getUptimeKumaStatus()
    kumaStatus.value = res
    if (res.success && res.data?.monitorList) {
      kumaMonitors.value = res.data.monitorList.map((m: any) => ({
        id: m.id,
        name: m.name,
        type: m.type,
        url: m.url,
        status: m.status,
        uptime: m.uptime,
        responseTime: m.responseTime,
        lastCheck: m.lastCheck,
        statusCode: m.statusCode,
        errorMsg: m.errorMsg,
        details: m.details
      }))
    }
  } catch (error) {
    console.error('获取 Uptime Kuma 状态失败:', error)
  }
}

const renderCharts = () => {
  if (metricsData.value.length === 0) {
    const placeholder = init(cpuChartRef.value!)
    placeholder.setOption({ title: { text: '暂无数据', left: 'center', top: 'center', textStyle: { color: '#999', fontSize: 14 } } })
    return
  }

  const times = metricsData.value.map(d => {
    const dt = new Date(d.metric_time)
    return `${String(dt.getHours()).padStart(2, '0')}:${String(dt.getMinutes()).padStart(2, '0')}`
  })

  const cpuData = metricsData.value.map(d => d.cpu_percent || 0)
  const memData = metricsData.value.map(d => d.mem_used_percent || 0)
  const diskData = metricsData.value.map(d => d.disk_used_percent || 0)
  const dbData = metricsData.value.map(d => d.db_latency_ms || 0)
  const poolActive = metricsData.value.map(d => d.pool_active || 0)
  const poolIdle = metricsData.value.map(d => d.pool_idle || 0)

  const baseOption = {
    tooltip: { trigger: 'axis' },
    grid: { left: '8%', right: '5%', bottom: '10%', top: '15%' },
    xAxis: { type: 'category', data: times, axisLabel: { fontSize: 11 } },
    yAxis: { type: 'value', axisLabel: { fontSize: 11 } }
  }

  if (cpuChart) {
    cpuChart.setOption({
      ...baseOption,
      series: [{
        name: 'CPU使用率',
        type: 'line',
        data: cpuData,
        smooth: true,
        areaStyle: { color: 'rgba(64, 158, 255, 0.15)' },
        lineStyle: { color: '#409eff' },
        itemStyle: { color: '#409eff' }
      }],
      yAxis: { ...baseOption.yAxis, max: 100, axisLabel: { formatter: '{value}%' } }
    })
  }

  if (memChart) {
    memChart.setOption({
      ...baseOption,
      series: [{
        name: '内存使用率',
        type: 'line',
        data: memData,
        smooth: true,
        areaStyle: { color: 'rgba(103, 194, 58, 0.15)' },
        lineStyle: { color: '#67c23a' },
        itemStyle: { color: '#67c23a' }
      }],
      yAxis: { ...baseOption.yAxis, max: 100, axisLabel: { formatter: '{value}%' } }
    })
  }

  if (diskChart) {
    diskChart.setOption({
      ...baseOption,
      series: [{
        name: '磁盘使用率',
        type: 'line',
        data: diskData,
        smooth: true,
        areaStyle: { color: 'rgba(230, 162, 60, 0.15)' },
        lineStyle: { color: '#e6a23c' },
        itemStyle: { color: '#e6a23c' }
      }],
      yAxis: { ...baseOption.yAxis, max: 100, axisLabel: { formatter: '{value}%' } }
    })
  }

  if (dbChart) {
    dbChart.setOption({
      ...baseOption,
      series: [{
        name: 'DB延迟',
        type: 'line',
        data: dbData,
        smooth: true,
        areaStyle: { color: 'rgba(245, 108, 108, 0.15)' },
        lineStyle: { color: '#f56c6c' },
        itemStyle: { color: '#f56c6c' }
      }],
      yAxis: { ...baseOption.yAxis, axisLabel: { formatter: '{value} ms' } }
    })
  }

  if (poolChart) {
    poolChart.setOption({
      ...baseOption,
      legend: { data: ['活跃连接', '空闲连接'], top: 0 },
      series: [
        { name: '活跃连接', type: 'bar', data: poolActive, itemStyle: { color: '#409eff' } },
        { name: '空闲连接', type: 'bar', data: poolIdle, itemStyle: { color: '#67c23a' } }
      ]
    })
  }
}

const refreshAll = async () => {
  refreshing.value = true
  await Promise.all([loadLatest(), loadMetrics(), loadKumaStatus()])
  refreshing.value = false
  ElMessage.success('监控数据已刷新')
}

const initCharts = () => {
  if (cpuChartRef.value) cpuChart = init(cpuChartRef.value)
  if (memChartRef.value) memChart = init(memChartRef.value)
  if (diskChartRef.value) diskChart = init(diskChartRef.value)
  if (dbChartRef.value) dbChart = init(dbChartRef.value)
  if (poolChartRef.value) poolChart = init(poolChartRef.value)
}

const handleResize = () => {
  cpuChart?.resize()
  memChart?.resize()
  diskChart?.resize()
  dbChart?.resize()
  poolChart?.resize()
}

onMounted(async () => {
  await nextTick()
  initCharts()
  await refreshAll()
  refreshTimer = setInterval(async () => {
    await loadLatest()
    await loadMetrics()
  }, 60000)
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  if (refreshTimer) clearInterval(refreshTimer)
  window.removeEventListener('resize', handleResize)
  cpuChart?.dispose()
  memChart?.dispose()
  diskChart?.dispose()
  dbChart?.dispose()
  poolChart?.dispose()
})
</script>

<style scoped>
.monitor-dashboard {
  padding: 20px;
  max-width: 1400px;
  margin: 0 auto;
}

.dashboard-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.dashboard-header h2 {
  margin: 0;
  font-size: 22px;
}

.header-actions {
  display: flex;
  gap: 12px;
}

.metric-cards {
  margin-bottom: 20px;
}

.metric-card {
  display: flex;
  align-items: center;
}

.metric-card :deep(.el-card__body) {
  display: flex;
  align-items: center;
  gap: 16px;
  width: 100%;
  padding: 16px;
}

.metric-icon {
  width: 56px;
  height: 56px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  flex-shrink: 0;
}

.metric-info {
  flex: 1;
}

.metric-label {
  font-size: 13px;
  color: #909399;
}

.metric-value {
  font-size: 24px;
  font-weight: bold;
  line-height: 1.4;
}

.metric-sub {
  font-size: 12px;
  color: #c0c4cc;
}

.kuma-card {
  margin-bottom: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.kuma-services-detail {
  margin-top: 8px;
}

.text-success { color: #67c23a; font-weight: 500; }
.text-warning { color: #e6a23c; font-weight: 500; }
.text-danger { color: #f56c6c; font-weight: 500; }
.text-muted { color: #c0c4cc; font-size: 12px; }

.error-msg {
  color: #f56c6c;
  font-size: 12px;
  word-break: break-all;
}

.service-details {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  font-size: 12px;
  color: #606266;
}

.service-details span {
  background: #f0f9ff;
  padding: 2px 8px;
  border-radius: 4px;
}

.kuma-services {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
}

.kuma-service-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: #f5f7fa;
  border-radius: 8px;
}

.kuma-name {
  font-size: 14px;
  font-weight: 500;
}

.kuma-uptime {
  font-size: 12px;
  color: #909399;
}

.kuma-notice {
  padding: 12px 16px;
  background: #f4f8ff;
  border-radius: 8px;
  border-left: 4px solid #409eff;
}

.notice-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
  font-weight: 500;
  color: #303133;
}

.notice-icon {
  font-size: 16px;
}

.notice-content {
  font-size: 13px;
  line-height: 1.7;
  color: #606266;
}

.notice-content p {
  margin: 0 0 10px;
}

.deploy-steps {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.step-item {
  display: flex;
  align-items: center;
  gap: 10px;
  font-family: 'Menlo', 'Consolas', monospace;
  font-size: 12px;
}

.step-item code {
  background: #e8f0fe;
  padding: 2px 8px;
  border-radius: 4px;
  color: #409eff;
}

.step-num {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  background: #409eff;
  color: #fff;
  border-radius: 50%;
  font-size: 11px;
  font-weight: bold;
  flex-shrink: 0;
}

.chart-row {
  margin-bottom: 20px;
}
</style>
