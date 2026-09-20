<template>
  <div class="m-page">
    <div class="m-card">
      <div class="m-title">历史月报</div>

      <!-- 筛选：月份（所有人可见） -->
      <div class="filter-row">
        <label class="m-label">月份</label>
        <select class="m-input" v-model="selectedMonth">
          <option value="">全部</option>
          <option v-for="m in availableMonths" :key="m" :value="m">{{ m }}</option>
        </select>
      </div>

      <!-- 筛选：人员（仅总经理/管理员可见，对应网页端「选择员工」） -->
      <div class="filter-row" v-if="isGM">
        <label class="m-label">人员</label>
        <select class="m-input" v-model="selectedEmployeeName">
          <option value="">全部</option>
          <option v-for="e in filteredEmployees" :key="e.id" :value="e.name">{{ e.name }}</option>
        </select>
      </div>

      <div class="sub-title">{{ isGM ? '所有用户月报' : '我的历史月报' }}</div>

      <div v-if="loading" class="m-muted">加载中…</div>
      <div v-else-if="list.length === 0" class="empty">暂无月报记录</div>

      <div v-for="r in list" :key="r.id" class="report-item">
        <div class="r-head">
          <span class="r-title">{{ r.title }}</span>
          <span class="r-tag" :class="r.status === 'draft' ? 't-grey' : 't-ok'">{{ r.status === 'draft' ? '草稿' : '已提交' }}</span>
        </div>
        <div class="m-muted">{{ r.date }} · {{ r.username || '' }}</div>
        <div v-if="r.content || r.plan" class="r-snippet">{{ snippet(r.content + '\n' + r.plan) }}</div>
        <div v-if="r.files && r.files.length" class="r-files">
          <span v-for="(f, i) in r.files" :key="i" class="r-file" @click="openFile(f.url)">📎 {{ f.name }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import api, { getEmployees } from '@/services/api'
import { useRoleGuard } from '@/composables/useRoleGuard'

const guard = useRoleGuard()
// 与网页端口径一致：仅总经理/系统管理员/内置管理账号可见人员筛选、查看全部用户月报
const isGM = computed(() => guard.roleTier.value === 'gm')

interface Report {
  id: number
  title: string
  content: string
  plan: string
  date: string
  status: string
  username?: string
  files?: { name: string; url: string; type?: string; size?: number }[]
}

interface Employee {
  id: number
  name: string
}

const allReports = ref<Report[]>([])
const loading = ref(true)

const selectedMonth = ref('')
const selectedEmployeeName = ref('')

const employees = ref<Employee[]>([])
// 与网页端一致：下拉排除李智鑫、张海琼
const filteredEmployees = computed(() => employees.value.filter(e => {
  const n = e.name || ''
  return !n.includes('李智鑫') && !n.includes('张海琼')
}))

// 月份选项：从已有月报的 date 去重，最新在前（含「全部」）
const availableMonths = computed(() => {
  const set = new Set<string>()
  allReports.value.forEach(r => { if (r.date) set.add(r.date) })
  return Array.from(set).sort((a, b) => b.localeCompare(a))
})

// 列表：按月份 + （GM 时）人员过滤，与网页端 filteredReports 口径一致
const list = computed(() => {
  let result = allReports.value
  if (isGM.value && selectedEmployeeName.value) {
    result = result.filter(r => (r.username || '') === selectedEmployeeName.value)
  }
  if (selectedMonth.value) {
    result = result.filter(r => r.date === selectedMonth.value)
  }
  return result
})

async function load() {
  loading.value = true
  try {
    if (isGM.value) {
      try { const er = await getEmployees(); if (er.success) employees.value = er.data || [] } catch (e) { /* ignore */ }
    }
    const res = await api.get('/monthly-reports')
    if (res.data && res.data.success) {
      allReports.value = (res.data.data || []).map((r: any) => ({
        ...r,
        files: Array.isArray(r.files) ? r.files : (r.files ? JSON.parse(r.files) : [])
      }))
    }
  } catch (e) { /* ignore */ }
  finally { loading.value = false }
}

function snippet(text: string) {
  return (text || '').replace(/【[^】]+】/g, '').slice(0, 80).replace(/\s+/g, ' ')
}

function openFile(url: string) {
  window.open(url, '_blank')
}

onMounted(async () => {
  await guard.refresh()
  await load()
})
</script>

<style scoped>
.m-page { padding-bottom: 20px; }
.report-item {
  padding: 14px 0;
  border-top: 1px solid #f0f1f2;
}
.r-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 4px;
}
.r-title { font-size: 15px; font-weight: 600; flex: 1; }
.r-tag { font-size: 11px; padding: 2px 8px; border-radius: 6px; white-space: nowrap; }
.t-ok { background: #eaf3de; color: #639922; }
.t-grey { background: #f2f3f5; color: #969799; }
.r-snippet {
  font-size: 12px;
  color: #646566;
  margin-top: 6px;
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.r-files { margin-top: 8px; display: flex; flex-wrap: wrap; gap: 6px; }
.r-file {
  font-size: 12px;
  color: #185fa5;
  background: #e6f1fb;
  padding: 3px 8px;
  border-radius: 6px;
}
.empty { text-align: center; padding: 40px 0; color: #969799; }
.filter-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 12px 0;
}
.filter-row .m-label { margin: 0; min-width: 36px; }
.filter-row .m-input { flex: 1; }
.sub-title {
  font-size: 13px;
  font-weight: 600;
  color: #1e5aa8;
  margin: 14px 0 4px;
  border-top: 1px solid #f0f1f2;
  padding-top: 12px;
}
</style>
