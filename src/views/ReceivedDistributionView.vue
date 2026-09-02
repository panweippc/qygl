<template>
  <div class="received-dist-container">
    <header class="header">
      <div class="logo">
        <span class="logo-text">宏友智慧办公平台</span>
        <div class="logo-glow"></div>
      </div>
      <nav class="nav">
        <router-link to="/" class="nav-item">首页</router-link>
        <button class="nav-item logout-btn" @click="handleBack">返回</button>
      </nav>
    </header>

    <main class="main-content">
      <div class="content-wrapper">
        <div class="page-header">
          <h2 class="section-title">
            <span class="title-icon">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M20 4H4C2.9 4 2 4.9 2 6V18C2 19.1 2.9 20 4 20H20C21.1 20 22 19.1 22 18V6C22 4.9 21.1 4 20 4ZM20 18H4V8L12 13L20 8V18ZM4 6H20V6.7L12 11.35L4 6.7V6Z"/>
              </svg>
            </span>
            我收到的下发
          </h2>
          <p class="page-subtitle">以下是下发给您的任务与通知，仅供查看</p>
        </div>

        <div class="stats-bar">
          <div class="stat-item pending">
            <span class="stat-number">{{ statusCount('待处理') }}</span>
            <span class="stat-name">待处理</span>
          </div>
          <div class="stat-item done">
            <span class="stat-number">{{ statusCount('已处理') }}</span>
            <span class="stat-name">已处理</span>
          </div>
          <div class="stat-item total">
            <span class="stat-number">{{ records.length }}</span>
            <span class="stat-name">总下发</span>
          </div>
        </div>

        <div class="table-card">
          <el-table :data="records" v-loading="loading" empty-text="暂无下发给您的记录" style="width: 100%">
            <el-table-column prop="applicationType" label="申请类型" width="120">
              <template #default="{ row }">
                <el-tag :type="typeTag(row.applicationType)">{{ typeLabel(row.applicationType) }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="applicant" label="申请人" width="120" />
            <el-table-column prop="distributedBy" label="下发人" width="120" />
            <el-table-column prop="status" label="状态" width="110">
              <template #default="{ row }">
                <el-tag :type="row.status === '已处理' ? 'success' : 'warning'" effect="light">
                  {{ row.status || '待处理' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="comment" label="下发说明" min-width="160" show-overflow-tooltip />
            <el-table-column prop="createdAt" label="下发时间" width="180" />
            <el-table-column label="操作" width="150" fixed="right">
              <template #default="{ row }">
                <el-button v-if="(row.status || '待处理') === '待处理'" type="success" link @click="openProcess(row)">处理</el-button>
                <el-button type="primary" link @click="openDetail(row)">查看详情</el-button>
              </template>
            </el-table-column>
          </el-table>
        </div>
      </div>
    </main>

    <el-dialog v-model="detailVisible" title="下发详情" width="560px" class="custom-dialog">
      <div v-if="current" class="detail-body">
        <el-descriptions :column="1" border size="small">
          <el-descriptions-item label="申请类型">{{ typeLabel(current.applicationType) }}</el-descriptions-item>
          <el-descriptions-item label="申请人">{{ current.applicant }}</el-descriptions-item>
          <el-descriptions-item label="下发人">{{ current.distributedBy }}</el-descriptions-item>
          <el-descriptions-item label="状态">
            <el-tag :type="current.status === '已处理' ? 'success' : 'warning'" effect="light">{{ current.status || '待处理' }}</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="下发说明">{{ current.comment || '—' }}</el-descriptions-item>
          <el-descriptions-item label="处理说明">{{ current.processComment || '—' }}</el-descriptions-item>
          <el-descriptions-item label="下发时间">{{ current.createdAt }}</el-descriptions-item>
        </el-descriptions>

        <div v-if="detailFields.length" class="detail-extra">
          <div class="detail-extra-title">申请内容</div>
          <el-descriptions :column="1" border size="small">
            <el-descriptions-item v-for="f in detailFields" :key="f.label" :label="f.label">
              <span v-if="f.isFile">
                <a v-for="(file, i) in f.value" :key="i" :href="fileDownloadUrl(file)" target="_blank" class="file-link">
                  {{ file.name || file.url }}
                </a>
                <span v-if="!f.value.length">—</span>
              </span>
              <span v-else>{{ f.value || '—' }}</span>
            </el-descriptions-item>
          </el-descriptions>
        </div>
      </div>
      <template #footer>
        <el-button @click="detailVisible = false">关闭</el-button>
        <el-button v-if="(current?.status || '待处理') === '待处理'" type="success" @click="openProcess(current)">标记为已处理</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="processVisible" title="处理下发任务" width="520px" class="custom-dialog">
      <div v-if="processTarget" class="process-body">
        <el-descriptions :column="1" border size="small">
          <el-descriptions-item label="申请类型">{{ typeLabel(processTarget.applicationType) }}</el-descriptions-item>
          <el-descriptions-item label="申请人">{{ processTarget.applicant }}</el-descriptions-item>
          <el-descriptions-item label="下发人">{{ processTarget.distributedBy }}</el-descriptions-item>
        </el-descriptions>
        <el-form class="process-form" label-position="top">
          <el-form-item label="处理说明（选填）">
            <el-input v-model="processComment" type="textarea" :rows="3" placeholder="可填写处理情况、完成说明等" />
          </el-form-item>
        </el-form>
      </div>
      <template #footer>
        <el-button @click="processVisible = false">取消</el-button>
        <el-button type="success" :loading="processing" @click="submitProcess">确认已处理</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, nextTick } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { getMyDistributedRecords, processDistributedRecord } from '../services/api'

const router = useRouter()
const route = useRoute()
const records = ref<any[]>([])
const loading = ref(false)
const detailVisible = ref(false)
const current = ref<any>(null)

const APP_TYPE_CN: Record<string, string> = {
  leave: '请假',
  reimbursement: '报销',
  meeting: '会议',
  project: '项目',
  businessTrip: '出差',
  entertainment: '业务招待'
}
const typeLabel = (t: string) => APP_TYPE_CN[t] || t || '未知'
const typeTag = (t: string): any => {
  const map: Record<string, string> = {
    leave: 'info', reimbursement: 'warning', meeting: 'success',
    project: 'primary', businessTrip: 'danger', entertainment: ''
  }
  return map[t] || ''
}

const statusCount = (s: string) => records.value.filter(r => (r.status || '待处理') === s).length

const load = async () => {
  loading.value = true
  try {
    const res = await getMyDistributedRecords()
    if (res.success) {
      records.value = res.data || []
      if (route.query.recordId) {
        const rid = Number(route.query.recordId)
        const target = records.value.find(r => r.id === rid)
        if (target) {
          nextTick(() => openDetail(target))
        }
      }
    } else {
      ElMessage.error(res.message || '加载失败')
    }
  } catch (e: any) {
    ElMessage.error('加载我收到的下发失败: ' + (e.message || ''))
  } finally {
    loading.value = false
  }
}

const openDetail = (row: any) => {
  current.value = row
  detailVisible.value = true
}

// 处理（接收人标记自己已处理）
const processVisible = ref(false)
const processTarget = ref<any>(null)
const processComment = ref('')
const processing = ref(false)

const openProcess = (row: any) => {
  processTarget.value = row
  processComment.value = row.processComment || ''
  processVisible.value = true
}

const submitProcess = async () => {
  if (!processTarget.value) return
  processing.value = true
  try {
    const res = await processDistributedRecord(processTarget.value.id, { processComment: processComment.value })
    if (res.success) {
      // 本地更新该行状态，避免整表刷新
      const idx = records.value.findIndex(r => r.id === processTarget.value.id)
      if (idx !== -1) {
        records.value[idx].status = '已处理'
        records.value[idx].processComment = processComment.value
      }
      ElMessage.success('已标记为处理完成')
      processVisible.value = false
      detailVisible.value = false
    } else {
      ElMessage.error(res.message || '处理失败')
    }
  } catch (e: any) {
    ElMessage.error('处理失败: ' + (e.message || ''))
  } finally {
    processing.value = false
  }
}

// 解析 detail(JSON 字符串) 为可展示字段
const detailFields = computed(() => {
  const row = current.value
  if (!row || !row.detail) return []
  let obj: any = {}
  try { obj = typeof row.detail === 'string' ? JSON.parse(row.detail) : row.detail } catch { return [] }
  if (!obj || typeof obj !== 'object') return []
  const LABELS: Record<string, string> = {
    title: '标题', meetingDate: '会议日期', meetingTime: '会议时间', location: '地点',
    participants: '参会人员', agenda: '会议议程',
    leaveType: '请假类型', days: '天数', startDate: '开始日期', endDate: '结束日期',
    reason: '事由', result: '审批结果', approver: '审批人', comment: '备注',
    reimburseType: '报销类型', amount: '金额', reimburseDate: '报销日期',
    projectName: '项目名称', projectType: '项目类型', budget: '预算',
    destination: '目的地', estimatedCost: '预估费用',
    guestName: '客户姓名', guestUnit: '客户单位', guestCount: '客户人数',
    expenseType: '费用类型', expenseAmount: '费用金额', expenseDate: '费用日期', purpose: '用途'
  }
  const fields: { label: string; value: any; isFile?: boolean }[] = []
  for (const key of Object.keys(obj)) {
    if (key === 'attachments') {
      fields.push({ label: '附件', value: Array.isArray(obj[key]) ? obj[key] : [], isFile: true })
      continue
    }
    if (LABELS[key] === undefined) continue
    fields.push({ label: LABELS[key], value: obj[key] })
  }
  return fields
})

const fileDownloadUrl = (file: any) => {
  const name = file?.name || ''
  const url = file?.url || ''
  return `/api/attachments/download?file=${encodeURIComponent(url)}&name=${encodeURIComponent(name)}`
}

const handleBack = () => router.back()

onMounted(load)
</script>

<style scoped>
.received-dist-container {
  width: 100%;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: linear-gradient(135deg, #E4EDF2 0%, #F0F4F8 100%);
}
.header {
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid rgba(100, 149, 237, 0.2);
  padding: 0 2rem;
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
}
.logo { position: relative; display: flex; align-items: center; }
.logo-text { font-size: 1.5rem; font-weight: bold; color: #333; }
.logo-glow {
  position: absolute; top: -50%; left: -20%; width: 140%; height: 200%;
  background: linear-gradient(45deg, transparent, rgba(100, 149, 237, 0.3), transparent);
  filter: blur(20px); animation: glow 3s ease-in-out infinite;
}
@keyframes glow { 0%,100% { opacity: .3 } 50% { opacity: .6 } }
.nav { display: flex; gap: 1rem; align-items: center; }
.nav-item {
  color: rgba(51,51,51,.8); text-decoration: none; padding: .5rem 1rem;
  border-radius: 6px; border: none; background: none; cursor: pointer; font-size: 14px; font-weight: 500;
}
.nav-item:hover { color: #333; background: rgba(100,149,237,.2); }
.logout-btn { background: rgba(244,67,54,.1); color: #d32f2f; border: 1px solid rgba(244,67,54,.3); }
.main-content { flex: 1; overflow-y: auto; padding: 2rem; }
.content-wrapper { max-width: 1200px; margin: 0 auto; display: flex; flex-direction: column; gap: 1.5rem; }
.page-header { text-align: center; }
.section-title {
  font-size: 1.8rem; font-weight: 600; color: #333; margin: 0 0 .5rem;
  display: flex; align-items: center; justify-content: center; gap: .5rem;
}
.title-icon {
  width: 40px; height: 40px; background: linear-gradient(45deg, #6495ED, #87CEEB);
  border-radius: 10px; display: flex; align-items: center; justify-content: center; color: #fff;
}
.title-icon svg { width: 24px; height: 24px; }
.page-subtitle { color: rgba(51,51,51,.6); font-size: 1rem; margin: 0; }
.stats-bar { display: flex; gap: 1.5rem; }
.stat-item {
  flex: 1; background: rgba(255,255,255,.9); border: 1px solid rgba(100,149,237,.2);
  border-radius: 12px; padding: 1.2rem; display: flex; flex-direction: column; align-items: center; gap: .25rem;
}
.stat-number { font-size: 1.8rem; font-weight: 700; }
.stat-name { font-size: .9rem; color: rgba(51,51,51,.6); }
.stat-item.pending .stat-number { color: #FF9800; }
.stat-item.done .stat-number { color: #4CAF50; }
.stat-item.total .stat-number { color: #6495ED; }
.table-card {
  background: rgba(255,255,255,.95); border: 1px solid rgba(100,149,237,.2);
  border-radius: 16px; padding: 1.5rem; box-shadow: 0 4px 12px rgba(0,0,0,.05);
}
.detail-extra { margin-top: 1rem; }
.detail-extra-title { font-weight: 600; color: #333; margin-bottom: .5rem; }
.file-link { color: #6495ED; text-decoration: underline; margin-right: .5rem; }
</style>
