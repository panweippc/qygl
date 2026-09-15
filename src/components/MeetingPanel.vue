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
            <el-option label="已撤回" value="已撤回" />
            <el-option label="已退回" value="已退回" />
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
        <el-button v-if="!isAdmin && !isLiZhiXin" type="primary" @click="goToMeetingApply" class="action-btn">
          <span class="btn-icon">+</span>
          创建会议
        </el-button>
      </div>
    </div>

    <div class="sub-tabs-row">
      <div class="sub-tabs">
        <button
          v-for="tab in meetingSubTabs"
          :key="tab.value"
          class="sub-tab-btn"
          :class="{ active: meetingSubTab === tab.value }"
          @click="meetingSubTab = tab.value"
        >{{ tab.label }}<span v-if="tab.badge > 0" class="sub-tab-badge" :class="{ 'sub-tab-badge-red': tab.badgeType === 'red' }">{{ tab.badge }}</span></button>
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
        <el-table-column prop="seqNo" label="会议编号" width="100">
          <template #default="{ row }">
            <span class="id-badge">#{{ row.seqNo }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="title" label="会议主题" min-width="150"></el-table-column>
        <el-table-column prop="organizer" label="组织者"></el-table-column>
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
        <el-table-column label="已读状态" width="100" v-if="meetingSubTab === 'received'">
          <template #default="{ row }">
            <span v-if="getMyDistribution(row, 'meeting')" :class="getDistributionRead(row, 'meeting') ? 'read-status read' : 'read-status unread'">
              {{ getDistributionRead(row, 'meeting') ? '已读' : '未读' }}
            </span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="300" fixed="right">
          <template #default="{ row }">
            <div class="action-group">
              <el-button
                v-if="canApprove(row)"
                size="small"
                type="primary"
                @click="handleApprove(row)"
                class="action-btn-small"
              >
                审批
              </el-button>
              <el-tag
                v-if="(row.status === '已批准' || row.status === 'approved') && canDistribute && isDistributed(row, 'meeting')"
                type="warning"
                size="small"
                effect="plain"
              >
                已下发
              </el-tag>
              <el-button
                v-if="canReturn(row)"
                size="small"
                type="warning"
                @click="returnMeetingAction(row)"
              >
                退回
              </el-button>
              <el-button
                v-if="canWithdraw(row)"
                size="small"
                @click="withdrawMeetingAction(row)"
                class="cancel-btn"
              >
                撤回
              </el-button>
              <el-button
                v-if="canResubmitDelete(row)"
                size="small"
                type="warning"
                @click="resubmitMeeting(row)"
              >
                重新提交
              </el-button>
              <el-button
                v-if="canResubmitDelete(row)"
                size="small"
                type="danger"
                @click="deleteMeetingAction(row)"
              >
                删除
              </el-button>
              <el-button
                v-if="meetingSubTab === 'received' && getMyDistribution(row, 'meeting') && !getDistributionRead(row, 'meeting')"
                size="small"
                type="primary"
                @click="toggleRecordRead(row, 'meeting')"
              >
                标为已读
              </el-button>
              <el-tag
                v-if="meetingSubTab === 'received' && getMyDistribution(row, 'meeting') && getDistributionRead(row, 'meeting')"
                type="success"
                size="small"
                effect="plain"
              >
                已读
              </el-tag>
              <el-button
                size="small"
                @click="$emit('view-detail', row, 'meeting')"
                class="view-btn"
              >
                详情
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
              v-if="canApprove(row)"
              size="small"
              type="primary"
              @click="handleApprove(row)"
            >
              审批
            </el-button>
            <el-tag
              v-if="(row.status === '已批准' || row.status === 'approved') && canDistribute && isDistributed(row, 'meeting')"
              type="warning"
              size="small"
              effect="plain"
            >
              已下发
            </el-tag>
            <el-button
              v-if="canReturn(row)"
              size="small"
              type="warning"
              @click="returnMeetingAction(row)"
            >
              退回
            </el-button>
            <el-button
              v-if="canWithdraw(row)"
              size="small"
              @click="withdrawMeetingAction(row)"
            >
              撤回
            </el-button>
            <el-button
              v-if="canResubmitDelete(row)"
              size="small"
              type="warning"
              @click="resubmitMeeting(row)"
            >
              重新提交
            </el-button>
            <el-button
              v-if="canResubmitDelete(row)"
              size="small"
              type="danger"
              @click="deleteMeetingAction(row)"
            >
              删除
            </el-button>
            <span
              v-if="meetingSubTab === 'received' && getMyDistribution(row, 'meeting')"
              :class="getDistributionRead(row, 'meeting') ? 'read-status read' : 'read-status unread'"
              style="margin-right: 6px;"
            >
              {{ getDistributionRead(row, 'meeting') ? '已读' : '未读' }}
            </span>
            <el-button
              v-if="meetingSubTab === 'received' && getMyDistribution(row, 'meeting') && !getDistributionRead(row, 'meeting')"
              size="small"
              type="primary"
              @click="toggleRecordRead(row, 'meeting')"
            >
              标为已读
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
              <div class="participants-input-wrap">
                <el-input
                  :model-value="meetingForm.participants.join('、')"
                  placeholder="请选择参会人员"
                  readonly
                  @click="participantDialogVisible = true"
                >
                  <template #suffix>
                    <el-icon style="cursor:pointer;color:#c0c4cc" @click.stop="participantDialogVisible = true"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z"/></svg></el-icon>
                  </template>
                </el-input>
              </div>
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

    <el-dialog v-model="participantDialogVisible" title="选择参会人员" width="400px" :modal="true" append-to-body>
      <el-checkbox-group v-model="meetingForm.participants">
        <div v-for="emp in allEmployees" :key="emp.id" style="margin:8px 0">
          <el-checkbox :label="extractRealName(emp.name)">
            <span>{{ extractRealName(emp.name) }}</span>
            <span style="color:#909399;font-size:12px;margin-left:4px">({{ emp.department || '' }})</span>
          </el-checkbox>
        </div>
      </el-checkbox-group>
      <template #footer>
        <el-button type="primary" @click="participantDialogVisible = false">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>



<script setup lang="ts">
import { printForm } from '../utils/oaWorkflowUtils'
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  getMeetings,
  getDistributedRecords,
  markDistributedRead,
  addMeeting,
  updateMeeting,
  withdrawMeeting,
  returnMeeting,
  softDeleteMeeting
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
  canDistribute: boolean
  currentUser: string
  searchKeyword: string
  viewMode: string
  allEmployees: any[]
  approverEmployees: any[]
  allDistributedRecords: any[]
  subTab: string
}>()

const emit = defineEmits<{
  'update:badge': [payload: { appliedTotal: number; appliedReturned: number; receivedTotal: number; receivedPendingUnread: number }]
  'stat-update': []
  'approve': [row: any, type: string]
  'terminate': [row: any, type: string]
  'distribute': [row: any, type: string]
  'view-detail': [row: any, type: string]
}>()

const meetingFilter = ref('all')
const meetingPersonFilter = ref('all')
const meetingSubTab = ref(props.subTab || 'applied')
const appliedMeetingCount = computed(() => {
  const base = props.isAdmin ? allMeetingRecords.value : meetingRecords.value
  const applied = base.filter(isMyMeetingApplication)
  return {
    total: applied.length,
    pending: applied.filter(r => isPending(r)).length,
    returned: applied.filter(r => isReturned(r)).length
  }
})
const receivedMeetingCount = computed(() => {
  const base = props.isAdmin ? allMeetingRecords.value : meetingRecords.value
  const received = base.filter((r: any) => !isMyMeetingApplication(r) && isReceivedMeeting(r))
  const pending = received.filter(r => isPending(r)).length
  const unread = received.filter(r => isItemDistributedToMe(r, 'meeting') && !getDistributionRead(r, 'meeting')).length
  return { total: received.length, pendingUnread: pending + unread }
})
const meetingSubTabs = computed(() => [
  { label: '我申请的', value: 'applied', badge: appliedMeetingCount.value.pending > 0 ? appliedMeetingCount.value.pending : appliedMeetingCount.value.total, badgeType: appliedMeetingCount.value.pending > 0 ? 'red' : 'gray' },
  { label: '我收到的', value: 'received', badge: receivedMeetingCount.value.pendingUnread > 0 ? receivedMeetingCount.value.pendingUnread : receivedMeetingCount.value.total, badgeType: receivedMeetingCount.value.pendingUnread > 0 ? 'red' : 'gray' }
])
const meetingDateType = ref('range')
const meetingDateRange = ref([])
const meetingSingleDate = ref(null)
const meetingMonthDate = ref(null)
const meetingYearDate = ref(null)
const meetingDialogVisible = ref(false)
const participantDialogVisible = ref(false)
const meetingRecords = ref<any[]>([])
const allMeetingRecords = ref<any[]>([])

const meetingForm = ref({
  title: '',
  meetingDate: '',
  meetingTime: '',
  location: '',
  participants: [] as string[],
  agenda: '',
  approver: '陈东'
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

const isLiZhiXin = computed(() => extractRealName(currentUsername.value) === '李智鑫')

// 导出按钮仅张海琼可见（财务总监负责导出 OA 办公各类申请表）
const canExport = computed(() => extractRealName(currentUsername.value) === '张海琼')

const meetingOrganizers = computed(() => {
  const organizers = new Set(
    meetingRecords.value
      .map((r: any) => extractRealName(r.organizer))
      .filter(Boolean)
  )
  return Array.from(organizers).sort()
})

// 下发给我的记录（按当前用户拉取，不依赖全局 allDistributedRecords）
const myDistributedRecords = ref<any[]>([])
let myDistributedLoaded = false
const loadMyDistributedRecords = async () => {
  try {
    const res = await getDistributedRecords(extractRealName(currentUsername.value))
    if (res.success) myDistributedRecords.value = res.data || []
  } catch (e) {
    console.error('获取我的下发记录失败:', e)
  }
  myDistributedLoaded = true
}
const isItemDistributedToMe = (item: any, type: string) =>
  myDistributedRecords.value.some((d: any) =>
    Number(d.applicationId) === Number(item.id) &&
    d.applicationType === type &&
    extractRealName(d.targetUser) === extractRealName(currentUsername.value)
  )

const isMyMeetingApplication = (r: any) => {
  return extractRealName(r.organizer) === extractRealName(currentUsername.value)
}

// 张海琼收到的下发统一下沉到「下发管理」页，她的「我收到的」只保留需要自己审批的
const isZhangUser = computed(() => extractRealName(currentUsername.value) === '张海琼')

const isReceivedMeeting = (r: any) => {
  const me = extractRealName(currentUsername.value)
  if (extractRealName(r.approver) === me) return true
  if (r.result && r.result.includes(me + ':')) return true
  if (!isZhangUser.value && isItemDistributedToMe(r, 'meeting')) return true
  return false
}

// 撤回/退回/重新提交/删除 显示条件
const isPending = (r: any) => ['审批中', '待审批', '待审核', 'pending'].includes(r.status)
const isReturned = (r: any) => ['已退回', 'returned'].includes(r.status)
const isWithdrawnOrDraft = (r: any) => ['已撤回', '已退回', '草稿', 'withdrawn', 'draft', 'returned'].includes(r.status)
const canApprove = (row: any) => isPending(row) && (props.isAdmin || extractRealName(row.approver) === extractRealName(currentUsername.value))
const canReturn = (row: any) => isPending(row) && (props.isAdmin || extractRealName(row.approver) === extractRealName(currentUsername.value))
const canWithdraw = (row: any) => isPending(row) && !props.isAdmin && isMyMeetingApplication(row)
const canResubmitDelete = (row: any) => isWithdrawnOrDraft(row) && (props.isAdmin || isMyMeetingApplication(row))

watch(() => props.subTab, (v: string) => { if (v) meetingSubTab.value = v })

// 已读/未读：从「下发给我的」记录中匹配对应下发记录，读取 read 字段
const getMyDistribution = (row: any, type: string) =>
  myDistributedRecords.value.find((d: any) =>
    Number(d.applicationId) === Number(row.id) &&
    d.applicationType === type &&
    extractRealName(d.targetUser) === extractRealName(currentUsername.value)
  ) || null
const getDistributionRead = (row: any, type: string) => {
  const d = getMyDistribution(row, type)
  return d ? d.read === 1 : false
}
const toggleRecordRead = async (row: any, type: string) => {
  const d = getMyDistribution(row, type)
  if (!d) return
  const newRead = 1
  try {
    const res = await markDistributedRead(d.id, newRead)
    if (res.success) {
      d.read = newRead
      ElMessage.success('已标记为已读')
    } else {
      ElMessage.error(res.message || '操作失败')
    }
  } catch (e) {
    ElMessage.error('操作失败')
  }
}

const filteredMeetingRecords = computed(() => {
  let records = props.isAdmin ? allMeetingRecords.value : meetingRecords.value

  if (meetingSubTab.value === 'applied') {
    records = records.filter(isMyMeetingApplication)
  } else if (meetingSubTab.value === 'received') {
    records = records.filter((r: any) => !isMyMeetingApplication(r) && isReceivedMeeting(r))
  }

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

  // 申请编号统一：按提交时间倒序展示，seqNo 按申请先后自然编号（最早=1），与 LeavePanel 一致
  return records
    .slice()
    .sort((a, b) => {
      const da = new Date(a.submitDate || a.createdAt || 0).getTime()
      const db = new Date(b.submitDate || b.createdAt || 0).getTime()
      return db - da
    })
    .map((r, idx, arr) => ({ ...r, seqNo: arr.length - idx }))
})

const loadMeetingRecords = async () => {
  try {
    if (!myDistributedLoaded) await loadMyDistributedRecords()
    const response = await getMeetings()
    if (response.success) {
      const me = extractRealName(currentUsername.value)
      meetingRecords.value = response.data
        .map((item: any) => ({
          ...item,
          submitDate: item.createdAt?.substring(0, 10) || '',
          distributedUsers: getDistributedUsersForApplication(item.id, 'meeting')
        }))
        .filter((item: any) =>
          extractRealName(item.organizer) === me ||
          extractRealName(item.approver) === me ||
          (item.result && item.result.includes(me + ':')) ||
          (!isZhangUser.value && isItemDistributedToMe(item, 'meeting'))
        )
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

const isDistributed = (row: any, type: string): boolean => {
  return props.allDistributedRecords?.some(
    (r: any) => Number(r.applicationId) === Number(row.id) && r.applicationType === type
  )
}

const fetchData = async () => {
  await loadMyDistributedRecords()
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
          participants: meetingForm.value.participants.join(', '),
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

const withdrawMeetingAction = async (row: any) => {
  try {
    await ElMessageBox.confirm('确定要撤回该会议申请吗？撤回后将变为「已撤回」状态。', '撤回确认', {
      confirmButtonText: '确定撤回',
      cancelButtonText: '取消',
      type: 'warning'
    })
    const response = await withdrawMeeting(row.id)
    if (response?.success) {
      ElMessage.success('撤回成功')
      await fetchData()
    } else {
      ElMessage.error(response?.message || '撤回失败')
    }
  } catch (error: any) {
    if (error !== 'cancel' && error?.type !== 'cancel') {
      console.error('撤回会议失败:', error)
      ElMessage.error('撤回失败')
    }
  }
}

const returnMeetingAction = async (row: any) => {
  try {
    const { value } = await ElMessageBox.prompt('请填写退回理由（必填）：', '退回申请', {
      confirmButtonText: '确定退回',
      cancelButtonText: '取消',
      inputType: 'textarea',
      inputValidator: (val: string) => (val && val.trim() ? true : '退回理由不能为空'),
      type: 'warning'
    })
    const response = await returnMeeting(row.id, value.trim())
    if (response?.success) {
      ElMessage.success('已退回')
      await fetchData()
    } else {
      ElMessage.error(response?.message || '退回失败')
    }
  } catch (error: any) {
    if (error !== 'cancel' && error?.type !== 'cancel' && error?.action !== 'cancel') {
      console.error('退回会议失败:', error)
      ElMessage.error('退回失败')
    }
  }
}

const deleteMeetingAction = async (row: any) => {
  try {
    await ElMessageBox.confirm('确定要删除该会议申请吗？删除后无法恢复。', '删除确认', {
      confirmButtonText: '确定删除',
      cancelButtonText: '取消',
      type: 'warning'
    })
    const response = await softDeleteMeeting(row.id)
    if (response?.success) {
      ElMessage.success('删除成功')
      await fetchData()
    } else {
      ElMessage.error(response?.message || '删除失败')
    }
  } catch (error: any) {
    if (error !== 'cancel' && error?.type !== 'cancel') {
      console.error('删除会议失败:', error)
      ElMessage.error('删除失败')
    }
  }
}

const resubmitMeeting = (row: any) => {
  router.push(`/oa/meeting-apply?id=${row.id}`)
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
    ['seqNo', 'organizer', 'title', 'meetingDate', 'meetingTime', 'location', 'participants', 'agenda', 'status', 'approver', 'submitDate']
  )
}

// 打印当前行记录（生成纸质表单并自动触发打印对话框）
const printRow = (row) => {
  if (!row) {
    ElMessage.warning('没有数据可打印')
    return
  }
  // 会议无专门纸质表单，使用通用打印
  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>会议详情</title><style>@page{margin:10mm}body{font-family:"SimSun","宋体",serif;padding:20px;color:#000}.info-row{margin:10px 0}.info-label{font-weight:bold;display:inline-block;width:100px}</style></head><body><h2 style="text-align:center">会议详情</h2><div class="info-row"><span class="info-label">会议主题：</span>${row.meetingTitle || row.title || ''}</div><div class="info-row"><span class="info-label">会议时间：</span>${row.meetingDate || ''} ${row.meetingTime || ''}</div><div class="info-row"><span class="info-label">会议地点：</span>${row.meetingLocation || row.location || ''}</div><div class="info-row"><span class="info-label">组织者：</span>${row.organizer || ''}</div><div class="info-row"><span class="info-label">审批状态：</span>${row.status || ''}</div></body></html>`
  const win = window.open('', '_blank')
  if (win) { win.document.open(); win.document.write(html); win.document.close(); win.onload = () => win.print(); }
}

const meetingBadgePayload = computed(() => ({
  appliedTotal: appliedMeetingCount.value.total,
  appliedReturned: appliedMeetingCount.value.returned,
  receivedTotal: receivedMeetingCount.value.total,
  receivedPendingUnread: receivedMeetingCount.value.pendingUnread
}))
watch(() => meetingBadgePayload.value, (v) => emit('update:badge', v), { immediate: true })

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
.sub-tabs-row {
  margin-bottom: 1rem;
}
.sub-tabs {
  display: inline-flex;
  gap: 0.5rem;
  background: rgba(100, 149, 237, 0.08);
  border-radius: 8px;
  padding: 0.25rem;
}
.sub-tab-btn {
  border: none;
  background: transparent;
  color: #666;
  padding: 0.5rem 1rem;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.25s ease;
}
.sub-tab-btn.active {
  background: #fff;
  color: #6495ED;
  box-shadow: 0 2px 8px rgba(100, 149, 237, 0.2);
  font-weight: 600;
}
.sub-tab-btn:hover:not(.active) {
  color: #333;
  background: rgba(100, 149, 237, 0.12);
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
.participants-input-wrap {
  width: 100%;
}

.print-row-btn {
  background: linear-gradient(45deg, #6495ED, #87CEEB) !important;
  border: none !important;
  color: #fff !important;
}
  
.status-tag.status-withdrawn,
.card-status.status-withdrawn {
  background: rgba(158, 158, 158, 0.1);
  color: #9E9E9E;
  border: 1px solid rgba(158, 158, 158, 0.3);
}
.status-tag.status-returned,
.card-status.status-returned {
  background: rgba(255, 112, 67, 0.1);
  color: #FF7043;
  border: 1px solid rgba(255, 112, 67, 0.3);
}
.status-tag.status-deleted,
.card-status.status-deleted {
  background: rgba(97, 97, 97, 0.1);
  color: #616161;
  border: 1px solid rgba(97, 97, 97, 0.3);
}
.read-status {
  display: inline-block;
  padding: 2px 10px;
  border-radius: 10px;
  font-size: 12px;
  font-weight: 600;
}
.read-status.read {
  background: rgba(76, 175, 80, 0.12);
  color: #4CAF50;
  border: 1px solid rgba(76, 175, 80, 0.3);
}
.read-status.unread {
  background: rgba(230, 162, 60, 0.12);
  color: #E6A23C;
  border: 1px solid rgba(230, 162, 60, 0.3);
}
.sub-tab-badge {
  display: inline-block;
  min-width: 18px;
  height: 18px;
  line-height: 18px;
  margin-left: 6px;
  padding: 0 5px;
  border-radius: 9px;
  background: #6495ED;
  color: #fff;
  font-size: 12px;
  font-weight: 600;
  text-align: center;
}
.sub-tab-badge-red {
  background: #F56C6C;
}
</style>
