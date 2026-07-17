<template>
  <div class="tab-panel">
    <div class="panel-header">
      <div class="panel-title">
        <span class="title-badge">📅</span>
        <span>会议申请管理</span>
      </div>
      <div class="header-actions">
        <template v-if="isAdmin">
          <el-select v-model="meetingFilter" placeholder="筛选状态" size="default" style="width: 120px; margin-right: 8px;">
            <el-option label="全部" value="all" />
            <el-option label="审批中" value="审批中" />
            <el-option label="已批准" value="已批准" />
            <el-option label="已拒绝" value="已拒绝" />
            <el-option label="已取消" value="已取消" />
          </el-select>
          <el-select v-model="meetingPersonFilter" placeholder="筛选人员" size="default" style="width: 140px; margin-right: 8px;" clearable filterable>
            <el-option label="全部人员" value="all" />
            <el-option v-for="person in meetingOrganizers" :key="person" :label="person" :value="person" />
          </el-select>
          <el-select v-model="meetingDateType" placeholder="选择日期类型" size="default" style="width: 100px; margin-right: 8px;">
            <el-option label="按天" value="day" />
            <el-option label="按区间" value="range" />
            <el-option label="按月" value="month" />
            <el-option label="按年" value="year" />
          </el-select>
          <template v-if="meetingDateType === 'day'">
            <el-date-picker
              v-model="meetingSingleDate"
              type="date"
              placeholder="选择日期"
              size="default"
              style="width: 140px; margin-right: 8px;"
              @change="handleDateRangeChange"
            />
          </template>
          <template v-else-if="meetingDateType === 'range'">
            <el-date-picker
              v-model="meetingDateRange"
              type="daterange"
              range-separator="至"
              start-placeholder="开始日期"
              end-placeholder="结束日期"
              size="default"
              style="width: 200px; margin-right: 8px;"
              @change="handleDateRangeChange"
            />
          </template>
          <template v-else-if="meetingDateType === 'month'">
            <el-date-picker
              v-model="meetingMonthDate"
              type="month"
              placeholder="选择月份"
              size="default"
              style="width: 140px; margin-right: 8px;"
              @change="handleDateRangeChange"
            />
          </template>
          <template v-else-if="meetingDateType === 'year'">
            <el-date-picker
              v-model="meetingYearDate"
              type="year"
              placeholder="选择年份"
              size="default"
              style="width: 140px; margin-right: 8px;"
              @change="handleDateRangeChange"
            />
          </template>
        </template>
        <el-button type="danger" @click="exportMeetingData" class="export-btn-small">
          导出
        </el-button>
        <el-button v-if="!isAdmin" type="primary" @click="goToMeetingApply" class="action-btn">
          <span class="btn-icon">+</span>
          创建会议
        </el-button>
      </div>
    </div>

    <div v-if="viewMode === 'list'" class="list-view">
      <el-table
        :data="filteredMeetingRecords"
        style="width: 100%"
        :header-cell-style="{ background: '#f5f7fa', color: '#606266' }"
        stripe
        fit
      >
        <el-table-column prop="id" label="会议编号" width="100">
          <template #default="{ row }">
            <span class="id-badge">#{{ row.id }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="title" label="会议主题" min-width="150"></el-table-column>
        <el-table-column prop="organizer" label="组织者" v-if="isAdmin"></el-table-column>
        <el-table-column prop="meetingDate" label="会议日期" width="120"></el-table-column>
        <el-table-column prop="meetingTime" label="会议时间" width="100"></el-table-column>
        <el-table-column prop="location" label="会议地点"></el-table-column>
        <el-table-column prop="status" label="状态" width="120">
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
        <el-table-column prop="submitDate" label="创建时间" width="150"></el-table-column>
        <el-table-column label="操作" width="240" fixed="right">
          <template #default="{ row }">
            <div class="action-group">
              <el-button
                v-if="(row.status === '审批中' || row.status === '待审批' || row.status === '待审核' || row.status === 'pending') && (isAdmin || extractRealName(row.approver) === extractRealName(currentUsername))"
                size="small"
                type="primary"
                @click="handleApprove(row)"
                class="action-btn-small"
              >
                审批
              </el-button>
              <el-button
                v-if="(row.status === '审批中' || row.status === '待审批' || row.status === '待审核' || row.status === 'pending') && (isAdmin || extractRealName(row.approver) === extractRealName(currentUsername))"
                size="small"
                type="danger"
                @click="$emit('terminate', row, 'meeting')"
                class="terminate-btn"
              >
                终止
              </el-button>
              <el-button
                v-if="(row.status === '已批准' || row.status === 'approved') && isAdmin"
                size="small"
                type="success"
                @click="$emit('distribute', row, 'meeting')"
                class="distribute-btn"
              >
                下发
              </el-button>
              <el-button
                v-if="(row.status === '审批中' || row.status === '待审批' || row.status === '待审核' || row.status === 'pending') && !isAdmin"
                size="small"
                @click="cancelMeeting(row)"
                class="cancel-btn"
              >
                取消
              </el-button>
              <el-button
                size="small"
                @click="$emit('view-detail', row, 'meeting')"
                class="view-btn"
              >
                详情
              </el-button>
              <el-button
                size="small"
                @click="exportMeetingRow(row)"
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
      <div class="record-card" v-for="row in filteredMeetingRecords" :key="row.id">
        <div class="card-header">
          <span class="card-id">#{{ row.id }}</span>
          <span :class="['card-status', getStatusClass(row.status)]">{{ getStatusText(row.status) }}<span v-if="row.result && row.result.includes(':') && row.status === '审批中'" class="intermediate-result">({{ row.result }})</span></span>
        </div>
        <div class="card-body">
          <div class="card-row">
            <span class="card-label">会议主题</span>
            <span class="card-value highlight">{{ row.title }}</span>
          </div>
          <div class="card-row">
            <span class="card-label">组织者</span>
            <span class="card-value">{{ row.organizer || currentUser }}</span>
          </div>
          <div class="card-row">
            <span class="card-label">会议时间</span>
            <span class="card-value">{{ row.meetingDate }} {{ row.meetingTime }}</span>
          </div>
          <div class="card-row">
            <span class="card-label">会议地点</span>
            <span class="card-value">{{ row.location }}</span>
          </div>
        </div>
        <div class="card-footer">
          <span class="card-date">{{ row.submitDate }}</span>
          <div class="card-actions">
            <el-button
              v-if="(row.status === '审批中' || row.status === '待审批' || row.status === '待审核' || row.status === 'pending') && (isAdmin || extractRealName(row.approver) === extractRealName(currentUsername))"
              size="small"
              type="primary"
              @click="handleApprove(row)"
            >
              审批
            </el-button>
            <el-button
              v-if="(row.status === '审批中' || row.status === '待审批' || row.status === '待审核' || row.status === 'pending') && (isAdmin || extractRealName(row.approver) === extractRealName(currentUsername))"
              size="small"
              type="danger"
              @click="$emit('terminate', row, 'meeting')"
            >
              终止
            </el-button>
            <el-button
              v-if="(row.status === '已批准' || row.status === 'approved') && isAdmin"
              size="small"
              type="success"
              @click="$emit('distribute', row, 'meeting')"
            >
              下发
            </el-button>
            <el-button size="small" @click="$emit('view-detail', row, 'meeting')">详情</el-button>
          </div>
        </div>
      </div>
    </div>

    <el-dialog v-model="meetingDialogVisible" title="创建会议" width="850px" class="wide-dialog" :modal="false">
      <div class="dialog-body">
        <div class="dialog-section">
          <div class="section-title">📅 会议信息</div>
          <el-form :model="meetingForm" :rules="meetingRules" ref="meetingFormRef" label-width="100px" class="dialog-form">
            <el-row :gutter="24">
              <el-col :span="12">
                <el-form-item label="会议主题" prop="title">
                  <el-input v-model="meetingForm.title" placeholder="请输入会议主题" maxlength="100" show-word-limit></el-input>
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="会议地点" prop="location">
                  <el-input v-model="meetingForm.location" placeholder="请输入会议地点"></el-input>
                </el-form-item>
              </el-col>
            </el-row>
            <el-row :gutter="24">
              <el-col :span="12">
                <el-form-item label="会议日期" prop="meetingDate">
                  <el-date-picker v-model="meetingForm.meetingDate" type="date" placeholder="选择日期" style="width: 100%"></el-date-picker>
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="会议时间" prop="meetingTime">
                  <el-time-picker v-model="meetingForm.meetingTime" placeholder="选择时间" style="width: 100%"></el-time-picker>
                </el-form-item>
              </el-col>
            </el-row>
            <el-form-item label="参会人员" prop="participants">
              <el-input v-model="meetingForm.participants" placeholder="请输入参会人员姓名，多个用逗号分隔"></el-input>
            </el-form-item>
            <el-form-item label="会议议程" prop="agenda">
              <el-input v-model="meetingForm.agenda" type="textarea" :rows="3" placeholder="请输入会议议程"></el-input>
            </el-form-item>
            <el-form-item label="审批人">
              <el-select v-model="meetingForm.approver" placeholder="请选择" style="width: 100%">
                <el-option v-for="employee in approverEmployees" :key="employee.name" :label="employee.name" :value="employee.name" />
              </el-select>
            </el-form-item>
          </el-form>
        </div>
      </div>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="meetingDialogVisible = false">取消</el-button>
          <el-button type="primary" size="large" @click="submitMeetingApplication">创建会议</el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  getMeetings,
  addMeeting,
  updateMeeting
} from '../services/api'
import {
  extractRealName,
  formatDate,
  getStatusClass,
  getStatusText,
  exportToCSV,
  exportSingleRow
} from '../utils/oaWorkflowUtils'

const props = defineProps<{
  isAdmin: boolean
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

const meetingFilter = ref('all')
const meetingPersonFilter = ref('all')
const meetingDateType = ref('range')
const meetingDateRange = ref([])
const meetingSingleDate = ref(null)
const meetingMonthDate = ref(null)
const meetingYearDate = ref(null)
const meetingDialogVisible = ref(false)
const meetingRecords = ref<any[]>([])
const allMeetingRecords = ref<any[]>([])

const meetingForm = ref({
  title: '',
  meetingDate: '',
  meetingTime: '',
  location: '',
  participants: '',
  agenda: '',
  approver: '总经理'
})

const meetingRules = {
  title: [{ required: true, message: '请输入会议主题', trigger: 'blur' }],
  meetingDate: [{ required: true, message: '请选择会议日期', trigger: 'change' }],
  meetingTime: [{ required: true, message: '请选择会议时间', trigger: 'change' }],
  location: [{ required: true, message: '请输入会议地点', trigger: 'blur' }],
  participants: [{ required: true, message: '请输入参会人员', trigger: 'blur' }],
  agenda: [{ required: true, message: '请输入会议议程', trigger: 'blur' }]
}

const meetingFormRef = ref()
const router = useRouter()

const currentUsername = computed(() => {
  return localStorage.getItem('username') || '当前用户'
})

const meetingOrganizers = computed(() => {
  const organizers = new Set(
    meetingRecords.value
      .map((r: any) => extractRealName(r.organizer))
      .filter(Boolean)
  )
  return Array.from(organizers).sort()
})

const filteredMeetingRecords = computed(() => {
  let records = props.isAdmin ? allMeetingRecords.value : meetingRecords.value

  if (props.searchKeyword) {
    const keyword = props.searchKeyword.toLowerCase()
    records = records.filter((r: any) =>
      r.title?.toLowerCase().includes(keyword) ||
      r.location?.toLowerCase().includes(keyword) ||
      r.organizer?.toLowerCase().includes(keyword)
    )
  }

  if (props.isAdmin && meetingFilter.value !== 'all') {
    records = records.filter((r: any) => r.status === meetingFilter.value)
  }

  if (props.isAdmin && meetingPersonFilter.value !== 'all' && meetingPersonFilter.value) {
    records = records.filter((r: any) => extractRealName(r.organizer) === meetingPersonFilter.value)
  }

  if (props.isAdmin) {
    if (meetingDateType.value === 'day' && meetingSingleDate.value) {
      const targetDate = new Date(meetingSingleDate.value)
      targetDate.setHours(0, 0, 0, 0)
      const nextDay = new Date(targetDate)
      nextDay.setDate(targetDate.getDate() + 1)
      nextDay.setHours(0, 0, 0, 0)
      records = records.filter((r: any) => {
        const submitDate = new Date(r.submitDate || r.createdAt)
        return submitDate >= targetDate && submitDate < nextDay
      })
    } else if (meetingDateType.value === 'range' && meetingDateRange.value && meetingDateRange.value.length === 2) {
      const startDate = new Date(meetingDateRange.value[0])
      const endDate = new Date(meetingDateRange.value[1])
      endDate.setHours(23, 59, 59, 999)
      records = records.filter((r: any) => {
        const submitDate = new Date(r.submitDate || r.createdAt)
        return submitDate >= startDate && submitDate <= endDate
      })
    } else if (meetingDateType.value === 'month' && meetingMonthDate.value) {
      const monthDate = new Date(meetingMonthDate.value)
      const startDate = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1)
      const endDate = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0)
      endDate.setHours(23, 59, 59, 999)
      records = records.filter((r: any) => {
        const submitDate = new Date(r.submitDate || r.createdAt)
        return submitDate >= startDate && submitDate <= endDate
      })
    } else if (meetingDateType.value === 'year' && meetingYearDate.value) {
      const yearDate = new Date(meetingYearDate.value)
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

const loadMeetingRecords = async () => {
  try {
    const response = await getMeetings()
    if (response.success) {
      meetingRecords.value = response.data
        .filter((item: any) => extractRealName(item.organizer) === extractRealName(currentUsername.value) || extractRealName(item.approver) === extractRealName(currentUsername.value))
        .map((item: any) => ({
          ...item,
          submitDate: item.createdAt?.substring(0, 10) || ''
        }))
    }
  } catch (error) {
    console.error('获取会议记录失败:', error)
  }
}

const loadAllMeetingRecords = async () => {
  try {
    const response = await getMeetings()
    if (response.success) {
      allMeetingRecords.value = response.data.map((item: any) => ({
        ...item,
        submitDate: item.createdAt?.substring(0, 10) || '',
        distributedUsers: []
      }))
      allMeetingRecords.value = allMeetingRecords.value.map((item: any) => ({
        ...item,
        distributedUsers: getDistributedUsersForApplication(item.id, 'meeting')
      }))
    }
  } catch (error) {
    console.error('获取所有会议记录失败:', error)
  }
}

const getDistributedUsersForApplication = (applicationId: number, applicationType: string) => {
  const records = props.allDistributedRecords.filter(
    (r: any) => Number(r.applicationId) === Number(applicationId) && r.applicationType === applicationType
  )
  return [...new Set(records.map((r: any) => r.targetUser))]
}

const fetchData = async () => {
  await loadMeetingRecords()
  if (props.isAdmin) {
    await loadAllMeetingRecords()
  }
  emit('stat-update')
}

const goToMeetingApply = () => {
  router.push('/oa/meeting-apply')
}

const submitMeetingApplication = async () => {
  meetingFormRef.value?.validate(async (valid: boolean) => {
    if (valid) {
      try {
        const meetingTime = meetingForm.value.meetingTime instanceof Date
          ? meetingForm.value.meetingTime.toTimeString().substring(0, 5)
          : meetingForm.value.meetingTime
        const data = {
          title: meetingForm.value.title,
          organizer: currentUsername.value,
          meetingDate: formatDate(meetingForm.value.meetingDate),
          meetingTime: meetingTime,
          location: meetingForm.value.location,
          participants: meetingForm.value.participants,
          agenda: meetingForm.value.agenda,
          approver: meetingForm.value.approver
        }
        const response = await addMeeting(data)
        if (response.success) {
          ElMessage.success('会议已创建')
          meetingDialogVisible.value = false
          await fetchData()
        } else {
          ElMessage.error(response.message || '创建失败')
        }
      } catch (error) {
        console.error('创建会议失败:', error)
        ElMessage.error('创建失败')
      }
    }
  })
}

const handleApprove = (row: any) => {
  emit('approve', row, 'meeting')
}

const cancelMeeting = async (row: any) => {
  try {
    await ElMessageBox.confirm('确定要取消该会议吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    const response = await updateMeeting(row.id, {
      result: '取消',
      comment: '用户主动取消申请'
    })
    if (response?.success) {
      ElMessage.success('会议已取消')
      await fetchData()
    } else {
      ElMessage.error(response?.message || '取消失败')
    }
  } catch (error: any) {
    if (error !== 'cancel') {
      console.error('取消会议失败:', error)
      ElMessage.error('取消会议失败')
    }
  }
}

const handleDateRangeChange = () => {}

const exportMeetingData = () => {
  const data = filteredMeetingRecords.value
  if (data.length === 0) {
    ElMessage.warning('没有数据可导出')
    return
  }
  let fileName = '会议申请记录'
  if (meetingFilter.value !== 'all') {
    fileName += `_${meetingFilter.value}`
  }
  if (meetingPersonFilter.value !== 'all' && meetingPersonFilter.value) {
    fileName += `_${meetingPersonFilter.value}`
  }
  exportToCSV(
    data,
    fileName,
    ['会议编号', '组织者', '会议主题', '会议日期', '会议时间', '会议地点', '参会人员', '会议议程', '审批状态', '审批人', '创建时间'],
    ['id', 'organizer', 'title', 'meetingDate', 'meetingTime', 'location', 'participants', 'agenda', 'status', 'approver', 'submitDate']
  )
}

const exportMeetingRow = (row: any) => {
  exportSingleRow(row, '会议申请_' + row.id,
    ['会议编号', '组织者', '会议主题', '会议日期', '会议时间', '会议地点', '参会人员', '会议议程', '审批状态', '审批人', '创建时间'],
    ['id', 'organizer', 'title', 'meetingDate', 'meetingTime', 'location', 'participants', 'agenda', 'status', 'approver', 'submitDate']
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
.card-value.highlight {
  color: #6495ED;
  font-weight: 600;
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
