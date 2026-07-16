<template>
  <div class="tab-panel">
    <div class="panel-header">
      <div class="panel-title">
        <span class="title-badge">🍽️</span>
        <span>业务招待费管理</span>
      </div>
      <div class="header-actions">
        <template v-if="isAdmin">
          <el-select v-model="entertainmentFilter" placeholder="筛选状态" size="default" style="width: 120px; margin-right: 8px;">
            <el-option label="全部" value="all" />
            <el-option label="审批中" value="审批中" />
            <el-option label="已批准" value="已批准" />
            <el-option label="已拒绝" value="已拒绝" />
            <el-option label="已取消" value="已取消" />
          </el-select>
          <el-select v-model="entertainmentPersonFilter" placeholder="筛选人员" size="default" style="width: 140px; margin-right: 8px;" clearable filterable>
            <el-option label="全部人员" value="all" />
            <el-option v-for="person in entertainmentApplicants" :key="person" :label="person" :value="person" />
          </el-select>
          <el-select v-model="entertainmentDateType" placeholder="选择日期类型" size="default" style="width: 100px; margin-right: 8px;">
            <el-option label="按天" value="day" />
            <el-option label="按区间" value="range" />
            <el-option label="按月" value="month" />
            <el-option label="按年" value="year" />
          </el-select>
          <template v-if="entertainmentDateType === 'day'">
            <el-date-picker v-model="entertainmentSingleDate" type="date" placeholder="选择日期" size="default" style="width: 140px; margin-right: 8px;" @change="handleDateRangeChange" />
          </template>
          <template v-else-if="entertainmentDateType === 'range'">
            <el-date-picker v-model="entertainmentDateRange" type="daterange" range-separator="至" start-placeholder="开始日期" end-placeholder="结束日期" size="default" style="width: 200px; margin-right: 8px;" @change="handleDateRangeChange" />
          </template>
          <template v-else-if="entertainmentDateType === 'month'">
            <el-date-picker v-model="entertainmentMonthDate" type="month" placeholder="选择月份" size="default" style="width: 140px; margin-right: 8px;" @change="handleDateRangeChange" />
          </template>
          <template v-else-if="entertainmentDateType === 'year'">
            <el-date-picker v-model="entertainmentYearDate" type="year" placeholder="选择年份" size="default" style="width: 140px; margin-right: 8px;" @change="handleDateRangeChange" />
          </template>
        </template>
        <el-button type="danger" @click="exportEntertainmentData" class="export-btn-small">导出</el-button>
        <el-button v-if="!isAdmin" type="primary" @click="goToEntertainmentApply" class="action-btn">
          <span class="btn-icon">+</span> 发起招待申请
        </el-button>
      </div>
    </div>

    <div v-if="viewMode === 'list'" class="list-view">
      <el-table :data="filteredEntertainmentRecords" style="width: 100%" :header-cell-style="{ background: '#f5f7fa', color: '#606266' }" stripe fit>
        <el-table-column prop="id" label="编号" width="80">
          <template #default="{ row }"><span class="id-badge">#{{ row.id }}</span></template>
        </el-table-column>
        <el-table-column label="申请人" v-if="isAdmin">
          <template #default="{ row }">{{ extractRealName(row.applicant) }}</template>
        </el-table-column>
        <el-table-column prop="guestName" label="招待对象" width="140" />
        <el-table-column prop="expenseType" label="费用类型" width="100">
          <template #default="{ row }"><span class="type-tag" :class="'type-' + row.expenseType">{{ row.expenseType }}</span></template>
        </el-table-column>
        <el-table-column prop="expenseAmount" label="费用金额" width="120">
          <template #default="{ row }"><span class="amount-badge">¥{{ row.expenseAmount }}</span></template>
        </el-table-column>
        <el-table-column prop="expenseDate" label="招待日期" width="120" />
        <el-table-column prop="purpose" label="招待事由" min-width="160">
          <template #default="{ row }"><span class="purpose-text">{{ row.purpose || '-' }}</span></template>
        </el-table-column>
        <el-table-column prop="status" label="审批状态" width="120">
          <template #default="{ row }">
            <span :class="['status-tag', getStatusClass(row.status)]">
              <span class="status-dot"></span>
              {{ getStatusText(row.status) }}
              <span v-if="row.result && row.result.includes(':') && row.status === '审批中'" class="intermediate-result">({{ row.result }})</span>
            </span>
          </template>
        </el-table-column>
        <el-table-column label="审批人" width="100">
          <template #default="{ row }">{{ extractRealName(row.approver) || '-' }}</template>
        </el-table-column>
        <el-table-column label="提交时间" width="100">
          <template #default="{ row }">{{ formatDate(row.submitDate, false) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="240" fixed="right">
          <template #default="{ row }">
            <div class="action-group">
              <el-button v-if="row.status === '审批中' && (isAdmin || extractRealName(row.approver) === extractRealName(currentUsername))" size="small" type="primary" @click="handleApprove(row)" class="action-btn-small">审批</el-button>
              <el-button v-if="(row.status === '审批中' || row.status === 'pending') && !isAdmin" size="small" @click="cancelEntertainmentApplication(row)" class="cancel-btn">取消</el-button>
              <el-button v-if="row.status === '审批中' && (isAdmin || extractRealName(row.approver) === extractRealName(currentUsername))" size="small" type="danger" @click="$emit('terminate', row, 'entertainment')" class="terminate-btn">终止</el-button>
              <el-button size="small" @click="$emit('view-detail', row, 'entertainment')" class="view-btn">详情</el-button>
              <el-button size="small" @click="exportEntertainmentRow(row)" class="export-row-btn">导出</el-button>
            </div>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <div v-else class="card-view">
      <div class="record-card" v-for="row in filteredEntertainmentRecords" :key="row.id">
        <div class="card-header">
          <span class="card-id">#{{ row.id }}</span>
          <span :class="['card-status', getStatusClass(row.status)]">{{ getStatusText(row.status) }}<span v-if="row.result && row.result.includes(':') && row.status === '审批中'" class="intermediate-result">({{ row.result }})</span></span>
        </div>
        <div class="card-body">
          <div class="card-row"><span class="card-label">申请人</span><span class="card-value">{{ row.applicant }}</span></div>
          <div class="card-row"><span class="card-label">招待对象</span><span class="card-value">{{ row.guestName }}</span></div>
          <div class="card-row"><span class="card-label">费用类型</span><span class="type-tag" :class="'type-' + row.expenseType">{{ row.expenseType }}</span></div>
          <div class="card-row"><span class="card-label">费用金额</span><span class="amount-badge">¥{{ row.expenseAmount }}</span></div>
          <div class="card-row"><span class="card-label">招待日期</span><span class="card-value">{{ row.expenseDate }}</span></div>
        </div>
        <div class="card-footer">
          <span class="card-date">{{ row.submitDate }}</span>
          <div class="card-actions">
            <el-button v-if="row.status === '审批中' && (isAdmin || extractRealName(row.approver) === extractRealName(currentUsername))" size="small" type="primary" @click="handleApprove(row)">审批</el-button>
            <el-button v-if="(row.status === '审批中' || row.status === 'pending') && !isAdmin" size="small" @click="cancelEntertainmentApplication(row)" class="cancel-btn">取消</el-button>
            <el-button v-if="row.status === '审批中' && (isAdmin || extractRealName(row.approver) === extractRealName(currentUsername))" size="small" type="danger" @click="$emit('terminate', row, 'entertainment')">终止</el-button>
            <el-button size="small" @click="$emit('view-detail', row, 'entertainment')">详情</el-button>
          </div>
        </div>
      </div>
    </div>

    <el-dialog v-model="entertainmentDialogVisible" title="业务招待费申请" width="850px" class="wide-dialog" :modal="false">
      <div class="dialog-body">
        <div class="dialog-section">
          <div class="section-title">🍽️ 招待信息</div>
          <el-form :model="entertainmentForm" :rules="entertainmentRules" ref="entertainmentFormRef" label-width="100px" class="dialog-form">
            <el-row :gutter="24">
              <el-col :span="12">
                <el-form-item label="招待对象" prop="guestName">
                  <el-input v-model="entertainmentForm.guestName" placeholder="请输入招待对象" />
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="招待人数" prop="guestCount">
                  <el-input v-model.number="entertainmentForm.guestCount" type="number" placeholder="请输入人数" />
                </el-form-item>
              </el-col>
            </el-row>
            <el-row :gutter="24">
              <el-col :span="12">
                <el-form-item label="费用类型" prop="expenseType">
                  <el-select v-model="entertainmentForm.expenseType" placeholder="请选择" style="width: 100%">
                    <el-option label="餐饮" value="餐饮" />
                    <el-option label="礼品" value="礼品" />
                    <el-option label="住宿" value="住宿" />
                    <el-option label="交通" value="交通" />
                    <el-option label="其他" value="其他" />
                  </el-select>
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="费用金额" prop="expenseAmount">
                  <el-input v-model.number="entertainmentForm.expenseAmount" type="number" placeholder="请输入金额"><template #prefix>¥</template></el-input>
                </el-form-item>
              </el-col>
            </el-row>
            <el-row :gutter="24">
              <el-col :span="12">
                <el-form-item label="招待日期" prop="expenseDate">
                  <el-date-picker v-model="entertainmentForm.expenseDate" type="date" placeholder="选择日期" style="width: 100%" />
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="审批人">
                  <el-select v-model="entertainmentForm.approver" placeholder="请选择" style="width: 100%">
                    <el-option v-for="employee in approverEmployees" :key="employee.name" :label="employee.name" :value="employee.name" />
                  </el-select>
                </el-form-item>
              </el-col>
            </el-row>
            <el-form-item label="招待事由" prop="purpose">
              <el-input v-model="entertainmentForm.purpose" type="textarea" :rows="4" placeholder="请输入招待事由" maxlength="500" show-word-limit />
            </el-form-item>
          </el-form>
        </div>
      </div>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="entertainmentDialogVisible = false">取消</el-button>
          <el-button type="primary" size="large" @click="submitEntertainmentApplication">提交申请</el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getEntertainmentExpenses, addEntertainmentExpense, updateEntertainmentExpense } from '../services/api'
import { extractRealName, formatDate, getStatusClass, getStatusText, exportToCSV, exportSingleRow } from '../utils/oaWorkflowUtils'

const props = defineProps<{
  isAdmin: boolean
  currentUser: string
  searchKeyword: string
  viewMode: string
  allEmployees: any[]
  approverEmployees: any[]
}>()

const emit = defineEmits<{
  'update:badge': [count: number]
  'stat-update': []
  'approve': [row: any, type: string]
  'terminate': [row: any, type: string]
  'view-detail': [row: any, type: string]
}>()

const entertainmentFilter = ref('all')
const entertainmentPersonFilter = ref('all')
const entertainmentDateType = ref('range')
const entertainmentDateRange = ref([])
const entertainmentSingleDate = ref(null)
const entertainmentMonthDate = ref(null)
const entertainmentYearDate = ref(null)
const entertainmentDialogVisible = ref(false)
const entertainmentRecords = ref<any[]>([])

const entertainmentForm = ref({ guestName: '', guestCount: 1, expenseType: '', expenseAmount: '', expenseDate: '', purpose: '', approver: '总经理' })

const entertainmentRules = {
  guestName: [{ required: true, message: '请输入招待对象', trigger: 'blur' }],
  expenseType: [{ required: true, message: '请选择费用类型', trigger: 'change' }],
  expenseAmount: [{ required: true, message: '请输入费用金额', trigger: 'blur' }],
  expenseDate: [{ required: true, message: '请选择招待日期', trigger: 'change' }],
  purpose: [{ required: true, message: '请输入招待事由', trigger: 'blur' }]
}

const entertainmentFormRef = ref()
const currentUsername = computed(() => localStorage.getItem('username') || '当前用户')

const router = useRouter()

const entertainmentApplicants = computed(() => {
  const applicants = new Set(entertainmentRecords.value.map((r: any) => extractRealName(r.applicant)).filter(Boolean))
  return Array.from(applicants).sort()
})

const filteredEntertainmentRecords = computed(() => {
  let records = entertainmentRecords.value

  if (props.searchKeyword) {
    const keyword = props.searchKeyword.toLowerCase()
    records = records.filter((r: any) =>
      r.guestName?.toLowerCase().includes(keyword) ||
      r.purpose?.toLowerCase().includes(keyword) ||
      r.applicant?.toLowerCase().includes(keyword)
    )
  }

  if (props.isAdmin && entertainmentFilter.value !== 'all') {
    records = records.filter((r: any) => r.status === entertainmentFilter.value)
  }
  if (props.isAdmin && entertainmentPersonFilter.value !== 'all' && entertainmentPersonFilter.value) {
    records = records.filter((r: any) => extractRealName(r.applicant) === entertainmentPersonFilter.value)
  }

  if (props.isAdmin) {
    if (entertainmentDateType.value === 'day' && entertainmentSingleDate.value) {
      const targetDate = new Date(entertainmentSingleDate.value); targetDate.setHours(0, 0, 0, 0)
      const nextDay = new Date(targetDate); nextDay.setDate(targetDate.getDate() + 1); nextDay.setHours(0, 0, 0, 0)
      records = records.filter((r: any) => { const d = new Date(r.submitDate || r.createdAt); return d >= targetDate && d < nextDay })
    } else if (entertainmentDateType.value === 'range' && entertainmentDateRange.value?.length === 2) {
      const startDate = new Date(entertainmentDateRange.value[0]); const endDate = new Date(entertainmentDateRange.value[1]); endDate.setHours(23, 59, 59, 999)
      records = records.filter((r: any) => { const d = new Date(r.submitDate || r.createdAt); return d >= startDate && d <= endDate })
    } else if (entertainmentDateType.value === 'month' && entertainmentMonthDate.value) {
      const monthDate = new Date(entertainmentMonthDate.value)
      const startDate = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1); const endDate = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0); endDate.setHours(23, 59, 59, 999)
      records = records.filter((r: any) => { const d = new Date(r.submitDate || r.createdAt); return d >= startDate && d <= endDate })
    } else if (entertainmentDateType.value === 'year' && entertainmentYearDate.value) {
      const yearDate = new Date(entertainmentYearDate.value)
      const startDate = new Date(yearDate.getFullYear(), 0, 1); const endDate = new Date(yearDate.getFullYear(), 11, 31); endDate.setHours(23, 59, 59, 999)
      records = records.filter((r: any) => { const d = new Date(r.submitDate || r.createdAt); return d >= startDate && d <= endDate })
    }
  }

  return records
})

const loadEntertainmentRecords = async () => {
  try {
    const response = await getEntertainmentExpenses()
    if (response.success) {
      entertainmentRecords.value = response.data
        .filter((item: any) => props.isAdmin || extractRealName(item.applicant) === extractRealName(currentUsername.value) || extractRealName(item.approver) === extractRealName(currentUsername.value))
        .map((item: any) => ({ ...item, submitDate: item.createdAt?.substring(0, 10) || '' }))
    }
  } catch (error) {
    console.error('获取业务招待费记录失败:', error)
  }
}

const fetchData = async () => {
  await loadEntertainmentRecords()
  emit('stat-update')
}

const goToEntertainmentApply = () => {
  router.push('/oa/entertainment-apply')
}

const submitEntertainmentApplication = async () => {
  entertainmentFormRef.value?.validate(async (valid: boolean) => {
    if (valid) {
      try {
        const data = {
          applicant: currentUsername.value,
          guestName: entertainmentForm.value.guestName,
          guestCount: entertainmentForm.value.guestCount,
          expenseType: entertainmentForm.value.expenseType,
          expenseAmount: entertainmentForm.value.expenseAmount,
          expenseDate: formatDate(entertainmentForm.value.expenseDate),
          purpose: entertainmentForm.value.purpose,
          approver: entertainmentForm.value.approver
        }
        const response = await addEntertainmentExpense(data)
        if (response.success) {
          ElMessage.success('业务招待费申请已提交')
          entertainmentDialogVisible.value = false
          await fetchData()
        } else {
          ElMessage.error(response.message || '提交失败')
        }
      } catch (error) {
        console.error('提交业务招待费申请失败:', error)
        ElMessage.error('提交失败')
      }
    }
  })
}

const handleApprove = (row: any) => emit('approve', row, 'entertainment')

const cancelEntertainmentApplication = async (row: any) => {
  try {
    await ElMessageBox.confirm('确定要取消该招待费申请吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    const response = await updateEntertainmentExpense(row.id, {
      result: '取消',
      comment: '用户主动取消申请'
    })
    if (response?.success) {
      ElMessage.success('申请已取消')
      await fetchData()
    } else {
      ElMessage.error(response?.message || '取消失败')
    }
  } catch (error: any) {
    if (error !== 'cancel') {
      console.error('取消申请失败:', error)
      ElMessage.error('取消申请失败')
    }
  }
}

const handleDateRangeChange = () => {}

const exportEntertainmentData = () => {
  const data = filteredEntertainmentRecords.value
  if (data.length === 0) { ElMessage.warning('没有数据可导出'); return }
  let fileName = '业务招待费记录'
  if (entertainmentFilter.value !== 'all') fileName += `_${entertainmentFilter.value}`
  if (entertainmentPersonFilter.value !== 'all' && entertainmentPersonFilter.value) fileName += `_${entertainmentPersonFilter.value}`
  exportToCSV(
    data, fileName,
    ['编号', '申请人', '招待对象', '招待人数', '费用类型', '费用金额', '招待日期', '招待事由', '审批状态', '审批人', '提交时间'],
    ['id', 'applicant', 'guestName', 'guestCount', 'expenseType', 'expenseAmount', 'expenseDate', 'purpose', 'status', 'approver', 'submitDate']
  )
}

const exportEntertainmentRow = (row: any) => {
  exportSingleRow(row, '业务招待费_' + row.id,
    ['编号', '申请人', '招待对象', '招待人数', '费用类型', '费用金额', '招待日期', '招待事由', '审批状态', '审批人', '提交时间'],
    ['id', 'applicant', 'guestName', 'guestCount', 'expenseType', 'expenseAmount', 'expenseDate', 'purpose', 'status', 'approver', 'submitDate']
  )
}

onMounted(() => { fetchData() })

defineExpose({ fetchData })
</script>

<style scoped>
.panel-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; }
.panel-title { display: flex; align-items: center; gap: 0.5rem; font-size: 1.1rem; font-weight: 600; color: #333; }
.title-badge { font-size: 1.2rem; }
.header-actions { display: flex; gap: 0.5rem; }
.action-btn { background: linear-gradient(45deg, #6495ED, #87CEEB) !important; border: none !important; border-radius: 8px !important; padding: 0.75rem 1.5rem !important; font-weight: 500 !important; box-shadow: 0 4px 15px rgba(100, 149, 237, 0.3) !important; }
.action-btn:hover { transform: translateY(-2px) !important; box-shadow: 0 6px 20px rgba(100, 149, 237, 0.4) !important; }
.btn-icon { margin-right: 0.25rem; font-weight: 700; }
.export-btn-small { background: linear-gradient(45deg, #4CAF50, #8BC34A) !important; border: none !important; }
.list-view { background: rgba(255, 255, 255, 0.5); border-radius: 12px; overflow: hidden; }
:deep(.el-table) { max-height: 380px; }
:deep(.el-table__body-wrapper) { overflow-y: auto; max-height: 330px; }
.id-badge { background: rgba(100, 149, 237, 0.1); color: #6495ED; padding: 0.25rem 0.5rem; border-radius: 4px; font-size: 0.85rem; font-weight: 500; }
.type-tag { display: inline-block; padding: 0.25rem 0.75rem; border-radius: 20px; font-size: 0.8rem; font-weight: 500; }
.type-tag.type-餐饮 { background: rgba(255, 152, 0, 0.1); color: #FF9800; border: 1px solid rgba(255, 152, 0, 0.3); }
.type-tag.type-礼品 { background: rgba(156, 39, 176, 0.1); color: #9C27B0; border: 1px solid rgba(156, 39, 176, 0.3); }
.type-tag.type-住宿 { background: rgba(33, 150, 243, 0.1); color: #2196F3; border: 1px solid rgba(33, 150, 243, 0.3); }
.type-tag.type-交通 { background: rgba(0, 150, 136, 0.1); color: #009688; border: 1px solid rgba(0, 150, 136, 0.3); }
.type-tag.type-其他 { background: rgba(158, 158, 158, 0.1); color: #9E9E9E; border: 1px solid rgba(158, 158, 158, 0.3); }
.amount-badge { background: linear-gradient(135deg, rgba(76, 175, 80, 0.1), rgba(139, 195, 74, 0.1)); color: #4CAF50; padding: 0.25rem 0.75rem; border-radius: 4px; font-size: 0.9rem; font-weight: 600; }
.status-tag { display: inline-flex; align-items: center; gap: 0.4rem; padding: 0.4rem 0.75rem; border-radius: 20px; font-size: 0.8rem; font-weight: 500; }
.status-dot { width: 6px; height: 6px; border-radius: 50%; background: currentColor; }
.status-tag.status-pending { background: rgba(255, 152, 0, 0.1); color: #FF9800; border: 1px solid rgba(255, 152, 0, 0.3); }
.status-tag.status-approved { background: rgba(76, 175, 80, 0.1); color: #4CAF50; border: 1px solid rgba(76, 175, 80, 0.3); }
.status-tag.status-rejected { background: rgba(244, 67, 54, 0.1); color: #f44336; border: 1px solid rgba(244, 67, 54, 0.3); }
.status-tag.status-cancelled { background: rgba(158, 158, 158, 0.1); color: #9E9E9E; border: 1px solid rgba(158, 158, 158, 0.3); }
.action-group { display: flex; gap: 0.5rem; }
.action-btn-small { background: linear-gradient(45deg, #6495ED, #87CEEB) !important; border: none !important; }
.terminate-btn { background: linear-gradient(45deg, #f44336, #ff5722) !important; border: none !important; }
.view-btn { background: rgba(100, 149, 237, 0.1) !important; color: #6495ED !important; border: 1px solid rgba(100, 149, 237, 0.3) !important; }
.card-view { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 1rem; }
.record-card { background: rgba(255, 255, 255, 0.9); border: 1px solid rgba(100, 149, 237, 0.2); border-radius: 12px; padding: 1.25rem; transition: all 0.3s ease; }
.record-card:hover { transform: translateY(-3px); box-shadow: 0 8px 25px rgba(100, 149, 237, 0.15); border-color: rgba(100, 149, 237, 0.4); }
.card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; padding-bottom: 0.75rem; border-bottom: 1px solid rgba(100, 149, 237, 0.1); }
.card-id { font-size: 0.85rem; color: rgba(51, 51, 51, 0.5); font-weight: 500; }
.card-status { padding: 0.25rem 0.75rem; border-radius: 20px; font-size: 0.75rem; font-weight: 500; }
.card-status.status-pending { background: rgba(255, 152, 0, 0.1); color: #FF9800; border: 1px solid rgba(255, 152, 0, 0.3); }
.card-status.status-approved { background: rgba(76, 175, 80, 0.1); color: #4CAF50; border: 1px solid rgba(76, 175, 80, 0.3); }
.card-status.status-rejected { background: rgba(244, 67, 54, 0.1); color: #f44336; border: 1px solid rgba(244, 67, 54, 0.3); }
.card-body { display: flex; flex-direction: column; gap: 0.75rem; margin-bottom: 1rem; }
.card-row { display: flex; justify-content: space-between; align-items: center; }
.card-label { font-size: 0.85rem; color: rgba(51, 51, 51, 0.6); }
.card-value { font-size: 0.9rem; color: #333; font-weight: 500; }
.card-footer { display: flex; justify-content: space-between; align-items: center; padding-top: 0.75rem; border-top: 1px solid rgba(100, 149, 237, 0.1); }
.card-date { font-size: 0.8rem; color: rgba(51, 51, 51, 0.5); }
.card-actions { display: flex; gap: 0.5rem; }
.wide-dialog :deep(.el-dialog__body) { padding: 0; }
.dialog-body { padding: 20px 24px; }
.dialog-section { margin-bottom: 20px; }
.section-title { font-size: 16px; font-weight: 600; color: #333; margin-bottom: 20px; padding-bottom: 12px; border-bottom: 2px solid #6495ED; }
.dialog-form .el-form-item { margin-bottom: 22px; }
.dialog-footer { display: flex; justify-content: flex-end; gap: 12px; padding: 10px 0; }
.intermediate-result { font-size: 0.75rem; color: #666; margin-left: 4px; }
</style>
