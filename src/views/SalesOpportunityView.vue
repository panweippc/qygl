<template>
  <div class="opportunity-page">
    <header class="page-header">
      <h2>销售机会跟进</h2>
      <div class="filter-bar">
        <el-select v-model="stageFilter" placeholder="全部阶段" clearable style="width:140px" @change="loadData">
          <el-option v-for="s in stages" :key="s.id" :label="s.name" :value="s.id" />
        </el-select>
        <el-select v-model="managerFilter" placeholder="全部负责人" clearable style="width:140px" @change="loadData">
          <el-option v-for="m in managers" :key="m" :label="'负责人 ' + m" :value="m" />
        </el-select>
        <el-input v-model="keyword" placeholder="搜索客户/联系人" clearable style="width:200px" @clear="loadData" @keyup.enter="loadData" />
        <el-button type="primary" @click="loadData">查询</el-button>
      </div>
    </header>

    <el-table :data="list" v-loading="loading" stripe style="width:100%">
      <el-table-column prop="townName" label="客户名称" min-width="140" />
      <el-table-column label="当前阶段" width="120">
        <template #default="{ row }">
          <el-tag :type="stageTagType(row.intention)" size="small">{{ getStageName(row.intention) }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="阶段推进" width="140">
        <template #default="{ row }">
          <el-select v-model="row.intention" size="small" @change="val => updateStage(row, val)" style="width:120px">
            <el-option v-for="s in stages" :key="s.id" :label="s.name" :value="s.id" />
          </el-select>
        </template>
      </el-table-column>
      <el-table-column prop="manager" label="负责人" width="80" />
      <el-table-column prop="sales" label="预计金额" width="110">
        <template #default="{ row }">{{ row.sales ? Number(row.sales).toLocaleString() : '0' }}</template>
      </el-table-column>
      <el-table-column prop="contactPerson" label="联系人" width="100" />
      <el-table-column prop="contactPhone" label="电话" width="120" />
      <el-table-column label="最近跟进" min-width="160">
        <template #default="{ row }">
          <div class="last-followup" v-if="row.lastVisit">
            <div class="fu-content">{{ row.lastVisit.visitContent }}</div>
            <div class="fu-meta">{{ row.lastVisit.visitDate }} · {{ row.lastVisit.visitPerson }}</div>
            <div v-if="row.lastVisit.nextPlan" class="fu-next">下次: {{ row.lastVisit.nextPlan }}</div>
          </div>
          <span v-else class="no-data">暂无</span>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="110" fixed="right">
        <template #default="{ row }">
          <el-button text size="small" @click="openFollowUp(row)">跟进</el-button>
          <el-button v-if="row.countyId" text size="small" @click="viewTown(row)">详情</el-button>
        </template>
      </el-table-column>
    </el-table>

    <div v-if="total > pageSize" class="pagination-wrap">
      <el-pagination v-model:current-page="page" :page-size="pageSize" :total="total" layout="prev, pager, next" @current-change="loadData" />
    </div>

    <el-dialog v-model="showFollowUp" title="跟进记录" width="500px" :close-on-click-modal="false">
      <div class="followup-list" v-if="followUpRecords.length">
        <div v-for="r in followUpRecords" :key="r.id" class="followup-item">
          <div class="fu-hd"><span class="fu-method">{{ r.followUpMethod || r.visitPerson }}</span><span class="fu-time">{{ r.followUpTime || r.visitDate }}</span></div>
          <div class="fu-body">{{ r.content || r.visitContent }}</div>
          <div v-if="r.nextPlan" class="fu-plan">后续计划: {{ r.nextPlan }}</div>
        </div>
      </div>
      <div v-else class="no-data" style="text-align:center;padding:20px">暂无跟进记录</div>
      <el-divider />
      <el-form :model="followUpForm" label-width="80px">
        <el-form-item label="跟进方式">
          <el-select v-model="followUpForm.method">
            <el-option label="电话" value="电话" /><el-option label="拜访" value="拜访" />
            <el-option label="微信" value="微信" /><el-option label="邮件" value="邮件" />
          </el-select>
        </el-form-item>
        <el-form-item label="跟进人">
          <el-input v-model="followUpForm.person" placeholder="当前用户名" />
        </el-form-item>
        <el-form-item label="跟进内容">
          <el-input v-model="followUpForm.content" type="textarea" :rows="3" />
        </el-form-item>
        <el-form-item label="下次计划">
          <el-input v-model="followUpForm.nextPlan" type="textarea" :rows="2" placeholder="下次跟进计划" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="submitFollowUp" :loading="savingFu">保存跟进</el-button>
        </el-form-item>
      </el-form>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'

const router = useRouter()
const loading = ref(false)
const list = ref<any[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = 20
const keyword = ref('')
const stageFilter = ref<number | null>(null)
const managerFilter = ref('')

const stages = ref([{ id: 1, name: '潜在客户' }, { id: 2, name: '意向客户' }, { id: 3, name: '提案阶段' }, { id: 4, name: '谈判阶段' }, { id: 5, name: '成交客户' }])
const managers = ref<string[]>([])
const showFollowUp = ref(false)
const currentTownId = ref<number | null>(null)
const followUpRecords = ref<any[]>([])
const savingFu = ref(false)
const followUpForm = ref({ method: '电话', person: '', content: '', nextPlan: '' })

const stageTagType = (val: number) => {
  const map: Record<number, string> = { 1: 'info', 2: 'primary', 3: 'warning', 4: 'danger', 5: 'success' }
  return map[val] || 'info'
}

const getStageName = (id: number) => stages.value.find(s => s.id === id)?.name || '未知'

const loadData = async () => {
  loading.value = true
  try {
    const params = new URLSearchParams({ page: String(page.value), pageSize: String(pageSize) })
    if (keyword.value.trim()) params.set('keyword', keyword.value.trim())
    if (stageFilter.value) params.set('stage', String(stageFilter.value))
    if (managerFilter.value) params.set('manager', managerFilter.value)
    const res = await fetch('/api/sales-opportunities?' + params.toString()).then(r => r.json())
    if (res.success) {
      list.value = res.data.list
      total.value = res.data.total
      if (res.data.managers) managers.value = res.data.managers
    }
  } catch { /* ignore */ }
  loading.value = false
}

const updateStage = async (row: any, newStage: number) => {
  try {
    await fetch('/api/town-sales/' + row.id + '/stage', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ intention: newStage })
    })
    ElMessage.success('阶段已更新')
    loadData()
  } catch { /* ignore */ }
}

const openFollowUp = async (row: any) => {
  currentTownId.value = row.id
  followUpForm.value = { method: '电话', person: localStorage.getItem('username') || '', content: '', nextPlan: '' }
  try {
    const [visitRes, activityRes] = await Promise.all([
      fetch('/api/visit-records/town/' + row.id).then(r => r.json()),
      fetch('/api/customer-activities/by-town/' + row.id).then(r => r.json())
    ])
    followUpRecords.value = [
      ...(activityRes.success ? activityRes.data.map((a: any) => ({ ...a, source: 'activity' })) : []),
      ...(visitRes.success ? visitRes.data.map((v: any) => ({ ...v, source: 'visit' })) : [])
    ].sort((a: any, b: any) => {
      const da = a.followUpTime || a.visitDate || a.createdAt || ''
      const db = b.followUpTime || b.visitDate || b.createdAt || ''
      return da > db ? -1 : 1
    })
  } catch { followUpRecords.value = [] }
  showFollowUp.value = true
}

const submitFollowUp = async () => {
  if (!followUpForm.value.content.trim()) { ElMessage.warning('请输入跟进内容'); return }
  savingFu.value = true
  try {
    await fetch('/api/visit-records', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        townId: currentTownId.value,
        customerName: '',
        address: '',
        visitDate: new Date().toISOString().slice(0, 10),
        visitPerson: followUpForm.value.person || '系统',
        visitContent: followUpForm.value.content,
        nextPlan: followUpForm.value.nextPlan
      })
    })
    ElMessage.success('跟进记录已保存')
    followUpForm.value.content = ''
    followUpForm.value.nextPlan = ''
    loadData()
  } catch { /* ignore */ }
  savingFu.value = false
}

const viewTown = (row: any) => {
  router.push(`/town-detail/${row.cityId}/${row.countyId}/${encodeURIComponent(row.townName)}`)
}

onMounted(() => {
  loadData()
  fetch('/api/sales-funnel/stages').then(r => r.json()).then(d => { if (d.success) stages.value = d.data })
})
</script>

<style scoped>
.opportunity-page { padding: 20px; }
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; flex-wrap: wrap; gap: 10px; }
.page-header h2 { font-size: 18px; color: #333; }
.filter-bar { display: flex; gap: 8px; flex-wrap: wrap; }
.pagination-wrap { display: flex; justify-content: center; margin-top: 16px; }
.last-followup { font-size: 12px; line-height: 1.5; }
.fu-content { color: #333; }
.fu-meta { color: #999; margin-top: 2px; }
.fu-next { color: #e6a23c; margin-top: 2px; }
.no-data { color: #999; font-size: 13px; }
.followup-list { max-height: 300px; overflow-y: auto; }
.followup-item { padding: 10px 12px; background: #f8f9fa; border-radius: 6px; margin-bottom: 8px; }
.fu-hd { display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 4px; }
.fu-method { color: #409eff; font-weight: 500; }
.fu-time { color: #999; }
.fu-body { font-size: 13px; color: #333; line-height: 1.5; }
.fu-plan { margin-top: 4px; font-size: 12px; color: #e6a23c; }
</style>
