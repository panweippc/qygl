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
          <el-option v-for="m in modules" :key="m.value" :label="m.label" :value="m.value" />
        </el-select>
      </div>
      <div class="filter-group">
        <label>操作</label>
        <el-select v-model="filters.action" placeholder="全部操作" clearable size="small" style="width:120px">
          <el-option v-for="a in actions" :key="a.value" :label="a.label" :value="a.value" />
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
      <el-button type="success" size="small" plain @click="exportLogs" :loading="exporting" v-if="isLiZhixin">导出</el-button>
    </div>

    <div class="log-table" v-loading="loading">
      <el-table :data="logs" style="width:100%" size="small" empty-text="暂无操作日志">
        <el-table-column type="expand">
          <template #default="{ row }">
            <div v-if="row.beforeValue || row.afterValue" class="diff-detail">
              <h4>数据变更详情</h4>
              <div class="diff-grid">
                <div class="diff-col">
                  <div class="diff-title">变更前</div>
                  <div v-for="(v, k) in row.beforeValue" :key="k" class="diff-item">
                    <span class="diff-key">{{ fieldLabel(k) }}</span>
                    <span class="diff-val old">{{ v ?? '（空）' }}</span>
                  </div>
                  <div v-if="!row.beforeValue" class="diff-empty">（无）</div>
                </div>
                <div class="diff-col">
                  <div class="diff-title">变更后</div>
                  <div v-for="(v, k) in row.afterValue" :key="k" class="diff-item">
                    <span class="diff-key">{{ fieldLabel(k) }}</span>
                    <span class="diff-val new">{{ v ?? '（空）' }}</span>
                  </div>
                  <div v-if="!row.afterValue" class="diff-empty">（无）</div>
                </div>
              </div>
            </div>
            <div v-else class="diff-detail diff-none">本次操作无可展开的数据变更详情</div>
          </template>
        </el-table-column>
        <el-table-column label="时间" width="170">
          <template #default="{ row }">{{ row.createdAt }}</template>
        </el-table-column>
        <el-table-column prop="username" label="操作人" width="100" />
        <el-table-column label="操作" width="90">
          <template #default="{ row }">
            <el-tag :type="actionType(row.action)" size="small">{{ actionLabel(row.action) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="模块" width="100">
          <template #default="{ row }">{{ moduleLabel(row.module) }}</template>
        </el-table-column>
        <el-table-column prop="targetName" label="操作对象" min-width="120" show-overflow-tooltip />
        <el-table-column prop="detail" label="详情" min-width="220" show-overflow-tooltip />
      </el-table>
      <div class="pagination-bar" v-if="total > 0">
        <el-pagination layout="total, prev, pager, next" :total="total" :page-size="pageSize" v-model:current-page="currentPage" @current-change="fetchLogs" background small />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { extractRealName } from '../utils/oaWorkflowUtils'

const loading = ref(false)
const logs = ref<any[]>([])
const total = ref(0)
const modules = ref<{ value: string; label: string }[]>([])
const actions = ref<{ value: string; label: string }[]>([])
const currentPage = ref(1)
const pageSize = 30
const exporting = ref(false)
// 仅李智鑫（管理员/总经理）可见导出按钮，其余用户无导出权限
const isLiZhixin = computed(() => extractRealName(localStorage.getItem('username') || '') === '李智鑫')

const filters = ref({ module: '', action: '', startDate: '', endDate: '' })

// 动作中文映射（与后端一致）
const ACTION_MAP: Record<string, string> = {
  create: '创建', update: '更新', delete: '删除', login: '登录',
  login_fail: '登录失败', login_new_ip: '新IP登录', logout: '退出',
  approve: '审批通过', reject: '驳回', submit: '提交', forward: '转发', withdraw: '撤回',
  backup_create: '创建备份', backup_delete: '删除备份', restore: '恢复', assign: '分配权限'
}

// 模块中文映射（与后端一致）
const MODULE_MAP: Record<string, string> = {
  auth: '登录认证', employee: '员工管理', attendance: '考勤管理', business_trip: '出差申请',
  reimbursement: '报销申请', entertainment: '业务招待', meeting: '会议管理', distribute: '任务下发',
  sales: '销售管理', deal: '成交管理', project: '项目管理', visit: '拜访管理',
  weekly_report: '周报', monthly_report: '月报', file: '文件管理', notification: '消息通知',
  tool: '工具管理', system: '系统管理'
}

// 字段中文映射（变更详情展示）
const FIELD_MAP: Record<string, string> = {
  name: '姓名', department: '部门', position: '职位', email: '邮箱', phone: '手机号',
  entryDate: '入职日期', status: '状态', employeeType: '员工类型'
}

function fieldLabel(key: string) {
  return FIELD_MAP[key] || key
}

function moduleLabel(module: string) {
  return MODULE_MAP[module] || module
}

function actionLabel(action: string) {
  return ACTION_MAP[action] || action
}

function actionType(action: string) {
  const map: Record<string, string> = {
    create: 'success', update: 'primary', delete: 'danger', login: 'info',
    login_fail: 'danger', login_new_ip: 'warning', logout: 'info',
    approve: 'success', reject: 'danger', submit: 'warning', forward: 'warning', withdraw: 'info',
    backup_create: 'success', backup_delete: 'danger'
  }
  return map[action] || 'info'
}

async function fetchModules() {
  try {
    const res = await fetch('/api/operation-logs/modules')
    const json = await res.json()
    if (json.success) modules.value = json.data
  } catch { /* ignore */ }
}

async function fetchActions() {
  try {
    const res = await fetch('/api/operation-logs/actions')
    const json = await res.json()
    if (json.success) actions.value = json.data
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

// 导出操作日志（CSV）
async function exportLogs() {
  exporting.value = true
  try {
    const params = new URLSearchParams()
    if (filters.value.module) params.set('module', filters.value.module)
    if (filters.value.action) params.set('action', filters.value.action)
    if (filters.value.startDate) params.set('startDate', filters.value.startDate)
    if (filters.value.endDate) params.set('endDate', filters.value.endDate)
    const qs = params.toString() ? '?' + params.toString() : ''
    const token = localStorage.getItem('token') || ''
    const resp = await fetch(`/api/operation-logs/export${qs}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    })
    if (!resp.ok) {
      ElMessage.error('导出失败')
      return
    }
    const blob = await resp.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `operation_logs_${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  } catch (e) {
    console.error('导出操作日志失败:', e)
    ElMessage.error('导出失败')
  } finally {
    exporting.value = false
  }
}

onMounted(() => {
  fetchModules()
  fetchActions()
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
.diff-detail { padding: 12px 16px; }
.diff-detail h4 { margin: 0 0 10px 0; font-size: 13px; color: #333; }
.diff-none { color: #999; font-size: 13px; }
.diff-grid { display: flex; gap: 24px; }
.diff-col { flex: 1; }
.diff-title { font-size: 12px; color: #999; margin-bottom: 6px; font-weight: 600; }
.diff-item { display: flex; gap: 8px; padding: 2px 0; font-size: 13px; align-items: baseline; }
.diff-key { color: #666; min-width: 70px; }
.diff-val.old { color: #d9534f; }
.diff-val.new { color: #28a745; }
.diff-empty { color: #bbb; font-size: 12px; }
</style>
