<template>
  <div class="operation-log">
    <header class="page-header">
      <div class="header-left">
        <el-button text @click="$router.push('/')" class="back-btn">← 返回</el-button>
        <h2 class="page-title">
          <span class="title-icon">📋</span>
          操作日志
        </h2>
      </div>
    </header>

    <div class="filter-bar">
      <div class="filter-group">
        <label>模块</label>
        <el-select v-model="filters.module" placeholder="全部模块" clearable size="small" style="width:140px">
          <el-option v-for="m in modules" :key="m" :label="m" :value="m" />
        </el-select>
      </div>
      <div class="filter-group">
        <label>操作</label>
        <el-select v-model="filters.action" placeholder="全部操作" clearable size="small" style="width:120px">
          <el-option label="创建" value="create" />
          <el-option label="更新" value="update" />
          <el-option label="删除" value="delete" />
          <el-option label="登录" value="login" />
          <el-option label="审批" value="approve" />
          <el-option label="驳回" value="reject" />
        </el-select>
      </div>
      <div class="filter-group">
        <label>开始日期</label>
        <el-date-picker v-model="filters.startDate" type="date" placeholder="开始日期" size="small" style="width:140px" value-format="YYYY-MM-DD" />
      </div>
      <div class="filter-group">
        <label>结束日期</label>
        <el-date-picker v-model="filters.endDate" type="date" placeholder="结束日期" size="small" style="width:140px" value-format="YYYY-MM-DD" />
      </div>
      <el-button type="primary" size="small" @click="search">查询</el-button>
      <el-button size="small" @click="resetFilters">重置</el-button>
    </div>

    <div class="log-table" v-loading="loading">
      <el-table :data="logs" style="width:100%" size="small" empty-text="暂无操作日志">
        <el-table-column label="时间" width="170">
          <template #default="{ row }">{{ row.createdAt }}</template>
        </el-table-column>
        <el-table-column prop="username" label="操作人" width="120" />
        <el-table-column label="操作" width="80">
          <template #default="{ row }">
            <el-tag :type="actionType(row.action)" size="small">{{ actionLabel(row.action) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="module" label="模块" width="120" />
        <el-table-column prop="targetName" label="操作对象" min-width="160" show-overflow-tooltip />
        <el-table-column prop="detail" label="详情" min-width="200" show-overflow-tooltip />
      </el-table>
      <div class="pagination-bar" v-if="total > 0">
        <el-pagination layout="total, prev, pager, next" :total="total" :page-size="pageSize" v-model:current-page="currentPage" @current-change="fetchLogs" background small />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

const loading = ref(false)
const logs = ref<any[]>([])
const total = ref(0)
const modules = ref<string[]>([])
const currentPage = ref(1)
const pageSize = 30

const filters = ref({ module: '', action: '', startDate: '', endDate: '' })

function actionLabel(action: string) {
  const map: Record<string, string> = { create: '创建', update: '更新', delete: '删除', login: '登录', approve: '审批通过', reject: '驳回', submit: '提交', withdraw: '撤回' }
  return map[action] || action
}

function actionType(action: string) {
  const map: Record<string, string> = { create: 'success', update: 'primary', delete: 'danger', login: 'info', approve: 'success', reject: 'danger', submit: 'warning', withdraw: 'info' }
  return map[action] || 'info'
}

async function fetchModules() {
  try {
    const res = await fetch('/api/operation-logs/modules')
    const json = await res.json()
    if (json.success) modules.value = json.data
  } catch { /* ignore */ }
}

async function fetchLogs() {
  loading.value = true
  try {
    const params = new URLSearchParams({ page: String(currentPage.value), pageSize: String(pageSize) })
    if (filters.value.module) params.set('module', filters.value.module)
    if (filters.value.action) params.set('action', filters.value.action)
    if (filters.value.startDate) params.set('startDate', filters.value.startDate)
    if (filters.value.endDate) params.set('endDate', filters.value.endDate + ' 23:59:59')
    const res = await fetch('/api/operation-logs?' + params.toString())
    const json = await res.json()
    if (json.success) {
      logs.value = json.data.list
      total.value = json.data.total
    }
  } catch { /* ignore */ } finally {
    loading.value = false
  }
}

function search() {
  currentPage.value = 1
  fetchLogs()
}

function resetFilters() {
  filters.value = { module: '', action: '', startDate: '', endDate: '' }
  currentPage.value = 1
  fetchLogs()
}

onMounted(() => {
  fetchModules()
  fetchLogs()
})
</script>

<style scoped>
.operation-log { padding: 24px; }
.page-header { margin-bottom: 20px; display: flex; align-items: center; justify-content: space-between; }
.header-left { display: flex; align-items: center; gap: 12px; }
.back-btn { font-size: 14px; color: #666; }
.page-title { font-size: 20px; font-weight: 600; color: #1a1a2e; display: flex; align-items: center; gap: 8px; margin: 0; }
.title-icon { font-size: 24px; }
.filter-bar { display: flex; align-items: flex-end; gap: 12px; margin-bottom: 16px; flex-wrap: wrap; background: #fff; padding: 16px 20px; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.06); }
.filter-group { display: flex; flex-direction: column; gap: 4px; }
.filter-group label { font-size: 12px; color: #999; }
.log-table { background: #fff; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.06); padding: 8px; }
.pagination-bar { display: flex; justify-content: center; padding: 16px; }
</style>
