<template>
  <div class="security-alert">
    <header class="page-header">
      <div class="header-left">
        <el-button text @click="$router.push('/')" class="back-btn">← 返回</el-button>
        <h2 class="page-title">
          <span class="title-icon">🛡️</span>
          安全事件监控
        </h2>
      </div>
      <div class="header-right">
        <el-button size="small" @click="fetchAlerts">刷新</el-button>
      </div>
    </header>

    <!-- 统计卡片 -->
    <div class="stats-row" v-loading="statsLoading">
      <div class="stat-card total">
        <div class="stat-num">{{ stats.total }}</div>
        <div class="stat-label">总告警</div>
      </div>
      <div class="stat-card high">
        <div class="stat-num">{{ stats.high }}</div>
        <div class="stat-label">高危事件</div>
      </div>
      <div class="stat-card brute">
        <div class="stat-num">{{ stats.brute_force }}</div>
        <div class="stat-label">登录爆破</div>
      </div>
      <div class="stat-card ip">
        <div class="stat-num">{{ stats.new_ip }}</div>
        <div class="stat-label">新IP登录</div>
      </div>
      <div class="stat-card dis">
        <div class="stat-num">{{ stats.disabled }}</div>
        <div class="stat-label">停用账号</div>
      </div>
      <div class="stat-card inactive">
        <div class="stat-num">{{ stats.inactive }}</div>
        <div class="stat-label">长期未登录</div>
      </div>
    </div>

    <!-- 级别筛选 -->
    <div class="filter-bar">
      <div class="filter-group">
        <label>告警级别</label>
        <el-select v-model="levelFilter" placeholder="全部级别" clearable size="small" style="width:140px" @change="fetchAlerts">
          <el-option label="高危" value="HIGH" />
          <el-option label="中危" value="MEDIUM" />
          <el-option label="告警" value="WARN" />
        </el-select>
      </div>
    </div>

    <!-- 告警列表 -->
    <div class="alert-table" v-loading="loading">
      <el-table :data="alerts" style="width:100%" size="small" empty-text="暂无安全告警事件">
        <el-table-column label="时间" width="170">
          <template #default="{ row }">
            <span class="cell-time">{{ row.time || row.raw?.slice(0,20) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="级别" width="90">
          <template #default="{ row }">
            <el-tag :type="levelTagType(row.level)" size="small" effect="dark">{{ levelText(row.level) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="类型" width="130">
          <template #default="{ row }">
            <span>{{ typeText(row.type) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="操作人" width="110">
          <template #default="{ row }">
            <span>{{ row.username || '系统' }}</span>
          </template>
        </el-table-column>
        <el-table-column label="IP" width="130">
          <template #default="{ row }">
            <span>{{ row.ip || '-' }}</span>
          </template>
        </el-table-column>
        <el-table-column label="详情" min-width="240">
          <template #default="{ row }">
            <span class="cell-detail">{{ row.detail }}</span>
          </template>
        </el-table-column>
      </el-table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'

const alerts = ref<any[]>([])
const stats = ref<any>({ total: 0, high: 0, brute_force: 0, new_ip: 0, disabled: 0, inactive: 0 })
const levelFilter = ref('')
const loading = ref(false)
const statsLoading = ref(false)

function getToken() {
  return localStorage.getItem('token') || ''
}

async function fetchAlerts() {
  loading.value = true
  try {
    const qs = levelFilter.value ? `?level=${levelFilter.value}` : ''
    const resp = await fetch(`/api/security-alerts${qs}`, {
      headers: { Authorization: `Bearer ${getToken()}` }
    })
    const json = await resp.json()
    if (json.success) {
      alerts.value = json.data || []
    } else {
      ElMessage.error(json.message || '获取告警失败')
    }
  } catch (e) {
    console.error('获取安全告警失败:', e)
  } finally {
    loading.value = false
  }
}

async function fetchStats() {
  statsLoading.value = true
  try {
    const resp = await fetch('/api/security-alerts/stats', {
      headers: { Authorization: `Bearer ${getToken()}` }
    })
    const json = await resp.json()
    if (json.success) stats.value = json.data || stats.value
  } catch (e) {
    console.error('获取告警统计失败:', e)
  } finally {
    statsLoading.value = false
  }
}

function levelTagType(level: string) {
  switch (level) {
    case 'CRITICAL': return 'danger'
    case 'HIGH': return 'danger'
    case 'MEDIUM': return 'warning'
    case 'WARN': return 'info'
    default: return 'info'
  }
}

function levelText(level: string) {
  switch (level) {
    case 'CRITICAL': return '严重'
    case 'HIGH': return '高危'
    case 'MEDIUM': return '中危'
    case 'WARN': return '告警'
    default: return '未知'
  }
}

function typeText(type: string) {
  const map: Record<string, string> = {
    login_brute_force: '登录爆破',
    login_new_ip: '新IP登录',
    account_disabled: '停用账号',
    inactive_account: '长期未登录',
    generic: '通用事件',
  }
  return map[type] || type
}

onMounted(() => {
  fetchStats()
  fetchAlerts()
})
</script>

<style scoped>
.security-alert {
  padding: 16px 20px;
}
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}
.header-left {
  display: flex;
  align-items: center;
  gap: 8px;
}
.page-title {
  font-size: 20px;
  font-weight: 600;
  margin: 0;
}
.title-icon {
  margin-right: 4px;
}
.stats-row {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 12px;
  margin-bottom: 16px;
}
.stat-card {
  background: #fff;
  border-radius: 8px;
  padding: 16px;
  text-align: center;
  border: 1px solid #ebeef5;
  box-shadow: 0 1px 4px rgba(0,0,0,0.05);
}
.stat-num {
  font-size: 28px;
  font-weight: 700;
  color: #303133;
}
.stat-label {
  font-size: 12px;
  color: #909399;
  margin-top: 4px;
}
.stat-card.high .stat-num { color: #f56c6c; }
.stat-card.brute .stat-num { color: #e6a23c; }
.stat-card.ip .stat-num { color: #409eff; }
.stat-card.dis .stat-num { color: #909399; }
.stat-card.inactive .stat-num { color: #67c23a; }
.filter-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}
.filter-group {
  display: flex;
  align-items: center;
  gap: 6px;
}
.filter-group label {
  font-size: 13px;
  color: #606266;
}
.alert-table {
  background: #fff;
  border-radius: 8px;
  padding: 8px;
}
.cell-time {
  color: #909399;
}
.cell-detail {
  color: #606266;
}
</style>
