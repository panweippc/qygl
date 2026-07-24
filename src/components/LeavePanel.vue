<template>
  <div class="tab-panel">
    <div class="panel-header">
      <div class="panel-title">
        <span class="title-badge">📝</span>
        <span>请假申请管理</span>
      </div>
      <div class="header-actions">
        <template v-if="isAdmin">
          <el-select v-model="leaveFilter" placeholder="筛选状态" size="default" style="width: 120px; margin-right: 8px;">
            <el-option label="全部" value="all" />
            <el-option label="审批中" value="审批中" />
            <el-option label="已批准" value="已批准" />
            <el-option label="已拒绝" value="已拒绝" />
            <el-option label="已取消" value="已取消" />
          </el-select>
          <el-select v-model="leavePersonFilter" placeholder="筛选人员" size="default" style="width: 140px; margin-right: 8px;" clearable filterable>
            <el-option label="全部人员" value="all" />
            <el-option v-for="person in leaveApplicants" :key="person" :label="person" :value="person" />
          </el-select>
          <el-select v-model="leaveDateType" placeholder="选择日期类型" size="default" style="width: 100px; margin-right: 8px;">
            <el-option label="按天" value="day" />
            <el-option label="按区间" value="range" />
            <el-option label="按月" value="month" />
            <el-option label="按年" value="year" />
          </el-select>
          <template v-if="leaveDateType === 'day'">
            <el-date-picker
              v-model="leaveSingleDate"
              type="date"
              placeholder="选择日期"
              size="default"
              style="width: 140px; margin-right: 8px;"
              @change="handleDateRangeChange"
            />
          </template>
          <template v-else-if="leaveDateType === 'range'">
            <el-date-picker
              v-model="leaveDateRange"
              type="daterange"
              range-separator="至"
              start-placeholder="开始日期"
              end-placeholder="结束日期"
              size="default"
              style="width: 200px; margin-right: 8px;"
              @change="handleDateRangeChange"
            />
          </template>
          <template v-else-if="leaveDateType === 'month'">
            <el-date-picker
              v-model="leaveMonthDate"
              type="month"
              placeholder="选择月份"
              size="default"
              style="width: 140px; margin-right: 8px;"
              @change="handleDateRangeChange"
            />
          </template>
          <template v-else-if="leaveDateType === 'year'">
            <el-date-picker
              v-model="leaveYearDate"
              type="year"
              placeholder="选择年份"
              size="default"
              style="width: 140px; margin-right: 8px;"
              @change="handleDateRangeChange"
            />
          </template>
        </template>
        <el-button type="danger" @click="exportLeaveData" class="export-btn-small">
          导出
        </el-button>
        <el-button v-if="!isAdmin" type="primary" @click="goToLeaveApply" class="action-btn">
          <span class="btn-icon">+</span>
          发起请假申请
        </el-button>
      </div>
    </div>

    <div v-if="viewMode === 'list'" class="list-view">
      <el-table
        :data="filteredLeaveRecords"
        style="width: 100%"
        :header-cell-style="{ background: '#f5f7fa', color: '#606266' }"
        stripe
        fit
      >
        <el-table-column prop="id" label="申请编号" width="100">
          <template #default="{ row }">
            <span class="id-badge">#{{ row.id }}</span>
          </template>
        </el-table-column>
        <el-table-column label="申请人">
          <template #default="{ row }">
            {{ extractRealName(row.applicant) }}
          </template>
        </el-table-column>
        <el-table-column prop="leaveType" label="请假类型">
          <template #default="{ row }">
            <span class="type-tag" :class="getLeaveTypeClass(row.leaveType)">
              {{ getLeaveTypeText(row.leaveType) }}
            </span>
          </template>
        </el-table-column>
        <el-table-column label="开始日期" width="100">
          <template #default="{ row }">
            {{ formatDate(row.startDate, false) }}
          </template>
        </el-table-column>
        <el-table-column label="结束日期" width="100">
          <template #default="{ row }">
            {{ formatDate(row.endDate, false) }}
          </template>
        </el-table-column>
        <el-table-column prop="days" label="天数" width="80">
          <template #default="{ row }">
            <span class="days-badge">{{ Number(row.days) === 0.5 ? '半天' : (Number(row.days) === Math.floor(Number(row.days)) ? Math.floor(Number(row.days)) + '天' : row.days + '天') }}</span>
          </template>
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
          <template #default="{ row }">
            {{ row.approver || '-' }}
          </template>
        </el-table-column>
        <el-table-column label="提交时间" width="100">
          <template #default="{ row }">
            {{ formatDate(row.submitDate, false) }}
          </template>
        </el-table-column>
        <el-table-column label="下发人员" width="120" v-if="isAdmin">
          <template #default="{ row }">
            <div class="distributed-users">
              <template v-if="row.distributedUsers && row.distributedUsers.length > 0">
                <el-tooltip :content="row.distributedUsers.join('，')" placement="top">
                  <span class="distributed-tag">
                    {{ row.distributedUsers.length }}人
                  </span>
                </el-tooltip>
              </template>
              <span v-else class="no-distributed">-</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="240" fixed="right">
          <template #default="{ row }">
            <div class="action-group">
              <el-button
                v-if="row.status === '审批中' && (isAdmin || extractRealName(row.approver) === extractRealName(currentUsername))"
                size="small"
                type="primary"
                @click="handleApprove(row)"
                class="action-btn-small"
              >
                审批
              </el-button>
              <el-button
                v-if="row.status === '审批中' && (isAdmin || extractRealName(row.approver) === extractRealName(currentUsername))"
                size="small"
                type="danger"
                @click="$emit('terminate', row, 'leave')"
                class="terminate-btn"
              >
                终止
              </el-button>
              <el-button
                v-if="row.status === '已批准' && canDistribute"
                size="small"
                type="success"
                @click="$emit('distribute', row, 'leave')"
                class="distribute-btn"
              >
                下发
              </el-button>
              <el-button
                v-if="row.status === '审批中' && !isAdmin"
                size="small"
                @click="cancelLeaveApplication(row)"
                class="cancel-btn"
              >
                取消
              </el-button>
              <el-button
                size="small"
                @click="$emit('view-detail', row, 'leave')"
                class="view-btn"
              >
                详情
              </el-button>
              <el-button
                size="small"
                @click="exportLeaveRow(row)"
                class="export-row-btn"
              >
                导出
              </el-button>
            </div>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <div v-else class="card-view">
      <div class="record-card" v-for="row in filteredLeaveRecords" :key="row.id">
        <div class="card-header">
          <span class="card-id">#{{ row.id }}</span>
          <span :class="['card-status', getStatusClass(row.status)]">{{ getStatusText(row.status) }}<span v-if="row.result && row.result.includes(':') && row.status === '审批中'" class="intermediate-result">({{ row.result }})</span></span>
        </div>
        <div class="card-body">
          <div class="card-row">
            <span class="card-label">申请人</span>
            <span class="card-value">{{ row.applicant || currentUser }}</span>
          </div>
          <div class="card-row">
            <span class="card-label">请假类型</span>
            <span class="type-tag" :class="getLeaveTypeClass(row.leaveType)">{{ getLeaveTypeText(row.leaveType) }}</span>
          </div>
          <div class="card-row">
            <span class="card-label">请假时间</span>
            <span class="card-value">{{ formatDate(row.startDate, false) }} 至 {{ formatDate(row.endDate, false) }}</span>
          </div>
          <div class="card-row">
            <span class="card-label">请假天数</span>
            <span class="days-badge">{{ Number(row.days) === 0.5 ? '半天' : (Number(row.days) === Math.floor(Number(row.days)) ? Math.floor(Number(row.days)) + '天' : row.days + '天') }}</span>
          </div>
        </div>
        <div class="card-footer">
          <span class="card-date">{{ row.submitDate }}</span>
          <div class="card-actions">
            <el-button
              v-if="row.status === '审批中' && (isAdmin || extractRealName(row.approver) === extractRealName(currentUsername))"
              size="small"
              type="primary"
              @click="handleApprove(row)"
            >
              审批
            </el-button>
            <el-button
              v-if="row.status === '审批中' && (isAdmin || extractRealName(row.approver) === extractRealName(currentUsername))"
              size="small"
              type="danger"
              @click="$emit('terminate', row, 'leave')"
            >
              终止
            </el-button>
            <el-button
              v-if="row.status === '审批中' && !isAdmin"
              size="small"
              @click="cancelLeaveApplication(row)"
            >
              取消
            </el-button>
            <el-button size="small" @click="$emit('view-detail', row, 'leave')">详情</el-button>
          </div>
        </div>
      </div>
    </div>

    <el-dialog v-model="leaveDialogVisible" title="请假申请" width="850px" class="wide-dialog" :modal="false">
      <div class="dialog-body">
        <div class="dialog-section">
          <div class="section-title">📋 请假信息</div>
          <el-form :model="leaveForm" :rules="leaveRules" ref="leaveFormRef" label-width="100px" class="dialog-form">
            <el-row :gutter="24">
              <el-col :span="12">
                <el-form-item label="请假类型" prop="leaveType">
                  <el-select v-model="leaveForm.leaveType" placeholder="请选择" style="width: 100%">
                    <el-option label="事假" value="事假"></el-option>
                    <el-option label="病假" value="病假"></el-option>
                    <el-option label="年假" value="年假"></el-option>
                    <el-option label="婚假" value="婚假"></el-option>
                    <el-option label="产假" value="产假"></el-option>
                    <el-option label="其他" value="其他"></el-option>
                  </el-select>
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="审批人">
                  <el-select v-model="leaveForm.approver" placeholder="请选择" style="width: 100%">
                    <el-option v-for="employee in approverEmployees" :key="employee.name" :label="employee.name" :value="employee.name" />
                  </el-select>
                </el-form-item>
              </el-col>
            </el-row>
            <el-form-item label="请假时长">
              <el-radio-group v-model="leaveForm.durationType" @change="onLeaveDurationChange">
                <el-radio label="halfDay">半天 (0.5天)</el-radio>
                <el-radio label="fullDay">一天 (1天)</el-radio>
                <el-radio label="custom">自定义</el-radio>
              </el-radio-group>
            </el-form-item>
            <el-row :gutter="24">
              <el-col :span="12">
                <el-form-item label="开始日期" prop="startDate">
                  <el-date-picker v-model="leaveForm.startDate" type="date" placeholder="选择开始日期" style="width: 100%" @change="onLeaveDateChange"></el-date-picker>
                </el-form-item>
              </el-col>
              <el-col :span="12" v-if="leaveForm.durationType === 'custom'">
                <el-form-item label="结束日期" prop="endDate">
                  <el-date-picker v-model="leaveForm.endDate" type="date" placeholder="选择结束日期" style="width: 100%" @change="onLeaveDateChange"></el-date-picker>
                </el-form-item>
              </el-col>
            </el-row>
            <el-row :gutter="24">
              <el-col :span="12">
                <el-form-item label="请假天数" prop="days">
                  <el-input v-model="leaveForm.days" disabled placeholder="自动计算">
                    <template #append>天</template>
                  </el-input>
                </el-form-item>
              </el-col>
            </el-row>
            <el-form-item label="请假原因" prop="reason">
              <el-input v-model="leaveForm.reason" type="textarea" :rows="4" placeholder="请输入请假原因" maxlength="500" show-word-limit></el-input>
            </el-form-item>
          </el-form>
        </div>
      </div>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="leaveDialogVisible = false">取消</el-button>
          <el-button type="primary" size="large" @click="submitLeaveApplication">提交申请</el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  getLeaveApplications,
  addLeaveApplication,
  updateLeaveApplication
} from '../services/api'
import {
  extractRealName,
  formatDate,
  getStatusClass,
  getStatusText,
  getLeaveTypeText,
  getLeaveTypeClass,
  exportToCSV,
  exportSingleRow
} from '../utils/oaWorkflowUtils'

const props = defineProps<{
  isAdmin: boolean
  canDistribute: boolean
  currentUser: string
  searchKeyword: string
  viewMode: string
  allEmployees: any[]
  approverEmployees: any[]
  allDistributedRecords: any[]
}>()

const emit = defineEmits<{
  'update:badge': [count: number]
  'stat-update': []
  'approve': [row: any, type: string]
  'terminate': [row: any, type: string]
  'distribute': [row: any, type: string]
  'view-detail': [row: any, type: string]
}>()

const leaveFilter = ref('all')
const leavePersonFilter = ref('all')
const leaveDateType = ref('range')
const leaveDateRange = ref([])
const leaveSingleDate = ref(null)
const leaveMonthDate = ref(null)
const leaveYearDate = ref(null)
const leaveDialogVisible = ref(false)
const leaveRecords = ref<any[]>([])
const allLeaveRecords = ref<any[]>([])

const leaveForm = ref({
  leaveType: '',
  durationType: 'custom',
  startDate: '',
  endDate: '',
  days: '',
  reason: '',
  approver: '总经理'
})

const leaveRules = {
  leaveType: [{ required: true, message: '请选择请假类型', trigger: 'change' }],
  startDate: [{ required: true, message: '请选择开始日期', trigger: 'change' }],
  endDate: [{ required: true, message: '请选择结束日期', trigger: 'change' }],
  days: [{ required: true, message: '请选择开始和结束日期自动计算', trigger: 'change' }],
  reason: [{ required: true, message: '请输入请假原因', trigger: 'blur' }]
}

const leaveFormRef = ref()
const router = useRouter()

const currentUsername = computed(() => {
  return localStorage.getItem('username') || '当前用户'
})

const leaveApplicants = computed(() => {
  const applicants = new Set(
    allLeaveRecords.value
      .map((r: any) => extractRealName(r.applicant))
      .filter(Boolean)
  )
  return Array.from(applicants).sort()
})

const filteredLeaveRecords = computed(() => {
  let records = props.isAdmin ? allLeaveRecords.value : leaveRecords.value

  if (props.searchKeyword) {
    const keyword = props.searchKeyword.toLowerCase()
    records = records.filter((r: any) =>
      r.leaveType?.toLowerCase().includes(keyword) ||
      r.reason?.toLowerCase().includes(keyword) ||
      r.applicant?.toLowerCase().includes(keyword)
    )
  }

  if (props.isAdmin && leaveFilter.value !== 'all') {
    records = records.filter((r: any) => r.status === leaveFilter.value)
  }

  if (props.isAdmin && leavePersonFilter.value !== 'all' && leavePersonFilter.value) {
    records = records.filter((r: any) => extractRealName(r.applicant) === leavePersonFilter.value)
  }

  if (props.isAdmin) {
    if (leaveDateType.value === 'day' && leaveSingleDate.value) {
      const targetDate = new Date(leaveSingleDate.value)
      targetDate.setHours(0, 0, 0, 0)
      const nextDay = new Date(targetDate)
      nextDay.setDate(targetDate.getDate() + 1)
      nextDay.setHours(0, 0, 0, 0)
      records = records.filter((r: any) => {
        const submitDate = new Date(r.submitDate || r.createdAt)
        return submitDate >= targetDate && submitDate < nextDay
      })
    } else if (leaveDateType.value === 'range' && leaveDateRange.value && leaveDateRange.value.length === 2) {
      const startDate = new Date(leaveDateRange.value[0])
      const endDate = new Date(leaveDateRange.value[1])
      endDate.setHours(23, 59, 59, 999)
      records = records.filter((r: any) => {
        const submitDate = new Date(r.submitDate || r.createdAt)
        return submitDate >= startDate && submitDate <= endDate
      })
    } else if (leaveDateType.value === 'month' && leaveMonthDate.value) {
      const monthDate = new Date(leaveMonthDate.value)
      const startDate = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1)
      const endDate = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0)
      endDate.setHours(23, 59, 59, 999)
      records = records.filter((r: any) => {
        const submitDate = new Date(r.submitDate || r.createdAt)
        return submitDate >= startDate && submitDate <= endDate
      })
    } else if (leaveDateType.value === 'year' && leaveYearDate.value) {
      const yearDate = new Date(leaveYearDate.value)
      const startDate = new Date(yearDate.getFullYear(), 0, 1)
      const endDate = new Date(yearDate.getFullYear(), 11, 31)
      endDate.setHours(23, 59, 59, 999)
      records = records.filter((r: any) => {
        const submitDate = new Date(r.submitDate || r.createdAt)
        return submitDate >= startDate && submitDate <= endDate
      })
    }
  }

  return records
})

const getDistributedUsersForApplication = (applicationId: number, applicationType: string) => {
  const records = props.allDistributedRecords.filter(
    (r: any) => Number(r.applicationId) === Number(applicationId) && r.applicationType === applicationType
  )
  return [...new Set(records.map((r: any) => r.targetUser))]
}

const loadLeaveRecords = async () => {
  try {
    const response = await getLeaveApplications()
    if (response.success) {
      leaveRecords.value = response.data
        .filter((item: any) => extractRealName(item.applicant) === extractRealName(currentUsername.value) || extractRealName(item.approver) === extractRealName(currentUsername.value) || (item.result && item.result.includes(extractRealName(currentUsername.value) + ':')))
        .map((item: any) => ({
          ...item,
          submitDate: item.createdAt?.substring(0, 10) || ''
        }))
    }
  } catch (error) {
    console.error('获取请假记录失败:', error)
  }
}

const loadAllLeaveRecords = async () => {
  try {
    const response = await getLeaveApplications()
    if (response.success) {
      allLeaveRecords.value = response.data.map((item: any) => ({
        ...item,
        submitDate: item.createdAt?.substring(0, 10) || '',
        distributedUsers: []
      }))
      allLeaveRecords.value = allLeaveRecords.value.map((item: any) => ({
        ...item,
        distributedUsers: getDistributedUsersForApplication(item.id, 'leave')
      }))
    }
  } catch (error) {
    console.error('获取所有请假记录失败:', error)
  }
}

const fetchData = async () => {
  await loadLeaveRecords()
  if (props.isAdmin) {
    await loadAllLeaveRecords()
  }
  emit('stat-update')
}

const goToLeaveApply = () => {
  router.push('/oa/leave-apply')
}

const submitLeaveApplication = async () => {
  leaveFormRef.value?.validate(async (valid: boolean) => {
    if (valid) {
      try {
        const data = {
          applicant: currentUsername.value,
          leaveType: leaveForm.value.leaveType,
          startDate: formatDate(leaveForm.value.startDate),
          endDate: formatDate(leaveForm.value.endDate),
          days: leaveForm.value.days,
          reason: leaveForm.value.reason,
          approver: leaveForm.value.approver
        }
        const response = await addLeaveApplication(data)
        if (response.success) {
          ElMessage.success('请假申请已提交')
          leaveDialogVisible.value = false
          await fetchData()
        } else {
          ElMessage.error(response.message || '提交失败')
        }
      } catch (error) {
        console.error('提交请假申请失败:', error)
        ElMessage.error('提交失败')
      }
    }
  })
}

const onLeaveDurationChange = () => {
  if (leaveForm.value.durationType === 'halfDay') {
    leaveForm.value.endDate = leaveForm.value.startDate
    leaveForm.value.days = '0.5'
  } else if (leaveForm.value.durationType === 'fullDay') {
    leaveForm.value.endDate = leaveForm.value.startDate
    calcLeaveDays()
  } else {
    leaveForm.value.endDate = ''
    leaveForm.value.days = ''
  }
}

const onLeaveDateChange = () => {
  if (leaveForm.value.durationType === 'halfDay') {
    leaveForm.value.endDate = leaveForm.value.startDate
    leaveForm.value.days = leaveForm.value.startDate ? '0.5' : ''
  } else if (leaveForm.value.durationType === 'fullDay') {
    leaveForm.value.endDate = leaveForm.value.startDate
    leaveForm.value.days = leaveForm.value.startDate ? '1' : ''
  } else if (leaveForm.value.durationType === 'custom') {
    calcLeaveDays()
  }
}

const calcLeaveDays = () => {
  if (leaveForm.value.startDate && leaveForm.value.endDate) {
    const startD = new Date(leaveForm.value.startDate)
    const endD = new Date(leaveForm.value.endDate)
    const days = Math.ceil((endD.getTime() - startD.getTime()) / (1000 * 60 * 60 * 24)) + 1
    leaveForm.value.days = days > 0 ? String(days) : ''
  }
}

const handleApprove = (row: any) => {
  emit('approve', row, 'leave')
}

const cancelLeaveApplication = async (row: any) => {
  try {
    await ElMessageBox.confirm('确定要取消该请假申请吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    const response = await updateLeaveApplication(row.id, {
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

const exportLeaveData = () => {
  const data = filteredLeaveRecords.value
  if (data.length === 0) {
    ElMessage.warning('没有数据可导出')
    return
  }
  let fileName = '请假申请记录'
  if (leaveFilter.value !== 'all') {
    fileName += `_${leaveFilter.value}`
  }
  if (leavePersonFilter.value !== 'all' && leavePersonFilter.value) {
    fileName += `_${leavePersonFilter.value}`
  }
  exportToCSV(
    data,
    fileName,
    ['申请编号', '申请人', '请假类型', '开始日期', '结束日期', '请假天数', '请假原因', '审批状态', '审批人', '提交时间'],
    ['id', 'applicant', 'leaveType', 'startDate', 'endDate', 'days', 'reason', 'status', 'approver', 'submitDate']
  )
}

const exportLeaveRow = (row: any) => {
  exportSingleRow(row, '请假申请_' + row.id,
    ['申请编号', '申请人', '请假类型', '开始日期', '结束日期', '请假天数', '请假原因', '审批状态', '审批人', '提交时间'],
    ['id', 'applicant', 'leaveType', 'startDate', 'endDate', 'days', 'reason', 'status', 'approver', 'submitDate']
  )
}

onMounted(() => {
  fetchData()
})

defineExpose({ fetchData })
</script>

<style scoped>
.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
}
.panel-title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 1.1rem;
  font-weight: 600;
  color: #333;
}
.title-badge {
  font-size: 1.2rem;
}
.header-actions {
  display: flex;
  gap: 0.5rem;
}
.action-btn {
  background: linear-gradient(45deg, #6495ED, #87CEEB) !important;
  border: none !important;
  border-radius: 8px !important;
  padding: 0.75rem 1.5rem !important;
  font-weight: 500 !important;
  box-shadow: 0 4px 15px rgba(100, 149, 237, 0.3) !important;
}
.action-btn:hover {
  transform: translateY(-2px) !important;
  box-shadow: 0 6px 20px rgba(100, 149, 237, 0.4) !important;
}
.btn-icon {
  margin-right: 0.25rem;
  font-weight: 700;
}
.export-btn-small {
  background: linear-gradient(45deg, #4CAF50, #8BC34A) !important;
  border: none !important;
}
.list-view {
  background: rgba(255, 255, 255, 0.5);
  border-radius: 12px;
  overflow: hidden;
}
:deep(.el-table) {
  max-height: 380px;
}
:deep(.el-table__body-wrapper) {
  overflow-y: auto;
  max-height: 330px;
}
.id-badge {
  background: rgba(100, 149, 237, 0.1);
  color: #6495ED;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.85rem;
  font-weight: 500;
}
.type-tag {
  display: inline-block;
  padding: 0.25rem 0.75rem;
  border-radius: 20px;
  font-size: 0.8rem;
  font-weight: 500;
}
.type-tag.type-personal {
  background: rgba(255, 152, 0, 0.1);
  color: #FF9800;
  border: 1px solid rgba(255, 152, 0, 0.3);
}
.type-tag.type-sick {
  background: rgba(244, 67, 54, 0.1);
  color: #f44336;
  border: 1px solid rgba(244, 67, 54, 0.3);
}
.type-tag.type-annual {
  background: rgba(76, 175, 80, 0.1);
  color: #4CAF50;
  border: 1px solid rgba(76, 175, 80, 0.3);
}
.type-tag.type-wedding,
.type-tag.type-maternity {
  background: rgba(233, 30, 99, 0.1);
  color: #E91E63;
  border: 1px solid rgba(233, 30, 99, 0.3);
}
.type-tag.type-other,
.type-tag.type-default {
  background: rgba(158, 158, 158, 0.1);
  color: #9E9E9E;
  border: 1px solid rgba(158, 158, 158, 0.3);
}
.days-badge {
  background: rgba(100, 149, 237, 0.1);
  color: #6495ED;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.85rem;
  font-weight: 500;
}
.status-tag {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.4rem 0.75rem;
  border-radius: 20px;
  font-size: 0.8rem;
  font-weight: 500;
}
.status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
}
.status-tag.status-pending {
  background: rgba(255, 152, 0, 0.1);
  color: #FF9800;
  border: 1px solid rgba(255, 152, 0, 0.3);
}
.status-tag.status-approved {
  background: rgba(76, 175, 80, 0.1);
  color: #4CAF50;
  border: 1px solid rgba(76, 175, 80, 0.3);
}
.status-tag.status-rejected {
  background: rgba(244, 67, 54, 0.1);
  color: #f44336;
  border: 1px solid rgba(244, 67, 54, 0.3);
}
.status-tag.status-cancelled {
  background: rgba(158, 158, 158, 0.1);
  color: #9E9E9E;
  border: 1px solid rgba(158, 158, 158, 0.3);
}
.status-tag.status-default {
  background: rgba(158, 158, 158, 0.1);
  color: #9E9E9E;
  border: 1px solid rgba(158, 158, 158, 0.3);
}
.action-group {
  display: flex;
  gap: 0.5rem;
}
.action-btn-small {
  background: linear-gradient(45deg, #6495ED, #87CEEB) !important;
  border: none !important;
}
.terminate-btn {
  background: linear-gradient(45deg, #f44336, #ff5722) !important;
  border: none !important;
}
.distribute-btn {
  background: linear-gradient(45deg, #4CAF50, #8BC34A) !important;
  border: none !important;
}
.view-btn,
.cancel-btn {
  background: rgba(100, 149, 237, 0.1) !important;
  color: #6495ED !important;
  border: 1px solid rgba(100, 149, 237, 0.3) !important;
}
.card-view {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 1rem;
}
.record-card {
  background: rgba(255, 255, 255, 0.9);
  border: 1px solid rgba(100, 149, 237, 0.2);
  border-radius: 12px;
  padding: 1.25rem;
  transition: all 0.3s ease;
}
.record-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 8px 25px rgba(100, 149, 237, 0.15);
  border-color: rgba(100, 149, 237, 0.4);
}
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid rgba(100, 149, 237, 0.1);
}
.card-id {
  font-size: 0.85rem;
  color: rgba(51, 51, 51, 0.5);
  font-weight: 500;
}
.card-status {
  padding: 0.25rem 0.75rem;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 500;
}
.card-status.status-pending {
  background: rgba(255, 152, 0, 0.1);
  color: #FF9800;
  border: 1px solid rgba(255, 152, 0, 0.3);
}
.card-status.status-approved {
  background: rgba(76, 175, 80, 0.1);
  color: #4CAF50;
  border: 1px solid rgba(76, 175, 80, 0.3);
}
.card-status.status-rejected {
  background: rgba(244, 67, 54, 0.1);
  color: #f44336;
  border: 1px solid rgba(244, 67, 54, 0.3);
}
.card-status.status-cancelled {
  background: rgba(158, 158, 158, 0.1);
  color: #9E9E9E;
  border: 1px solid rgba(158, 158, 158, 0.3);
}
.card-body {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-bottom: 1rem;
}
.card-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.card-label {
  font-size: 0.85rem;
  color: rgba(51, 51, 51, 0.6);
}
.card-value {
  font-size: 0.9rem;
  color: #333;
  font-weight: 500;
}
.card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 0.75rem;
  border-top: 1px solid rgba(100, 149, 237, 0.1);
}
.card-date {
  font-size: 0.8rem;
  color: rgba(51, 51, 51, 0.5);
}
.card-actions {
  display: flex;
  gap: 0.5rem;
}
.distributed-users {
  display: flex;
  align-items: center;
}
.distributed-tag {
  background: linear-gradient(135deg, rgba(100, 149, 237, 0.1), rgba(135, 206, 235, 0.1));
  color: #6495ED;
  padding: 0.25rem 0.75rem;
  border-radius: 20px;
  font-size: 0.85rem;
  font-weight: 500;
  cursor: pointer;
  border: 1px solid rgba(100, 149, 237, 0.3);
}
.no-distributed {
  color: #999;
  font-size: 0.9rem;
}

/* 新增弹窗样式 */
.wide-dialog :deep(.el-dialog__body) {
  padding: 0;
}
.dialog-body {
  padding: 20px 24px;
}
.dialog-section {
  margin-bottom: 20px;
}
.section-title {
  font-size: 16px;
  font-weight: 600;
  color: #333;
  margin-bottom: 20px;
  padding-bottom: 12px;
  border-bottom: 2px solid #6495ED;
}
.dialog-form .el-form-item {
  margin-bottom: 22px;
}
.days-hint {
  color: #909399;
  font-size: 13px;
  line-height: 32px;
}
.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 10px 0;
}
.dialog-footer .el-button--primary {
  padding: 12px 32px;
  font-size: 15px;
}
</style>
