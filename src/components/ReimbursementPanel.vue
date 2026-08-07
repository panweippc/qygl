<template>
  <div class="tab-panel">
    <div class="panel-header">
      <div class="panel-title">
        <span class="title-badge">💰</span>
        <span>报销申请管理</span>
      </div>
      <div class="header-actions">
        <template v-if="isAdmin">
          <el-select v-model="reimbursementFilter" placeholder="筛选状态" size="default" style="width: 120px; margin-right: 8px;">
            <el-option label="全部" value="all" />
            <el-option label="审批中" value="审批中" />
            <el-option label="已批准" value="已批准" />
            <el-option label="已拒绝" value="已拒绝" />
            <el-option label="已取消" value="已取消" />
          </el-select>
          <el-select v-model="reimbursementPersonFilter" placeholder="筛选人员" size="default" style="width: 140px; margin-right: 8px;" clearable filterable>
            <el-option label="全部人员" value="all" />
            <el-option v-for="person in reimbursementApplicants" :key="person" :label="person" :value="person" />
          </el-select>
          <el-select v-model="reimbursementDateType" placeholder="选择日期类型" size="default" style="width: 100px; margin-right: 8px;">
            <el-option label="按天" value="day" />
            <el-option label="按区间" value="range" />
            <el-option label="按月" value="month" />
            <el-option label="按年" value="year" />
          </el-select>
          <template v-if="reimbursementDateType === 'day'">
            <el-date-picker
              v-model="reimbursementSingleDate"
              type="date"
              placeholder="选择日期"
              size="default"
              style="width: 140px; margin-right: 8px;"
              @change="handleDateRangeChange"
            />
          </template>
          <template v-else-if="reimbursementDateType === 'range'">
            <el-date-picker
              v-model="reimbursementDateRange"
              type="daterange"
              range-separator="至"
              start-placeholder="开始日期"
              end-placeholder="结束日期"
              size="default"
              style="width: 200px; margin-right: 8px;"
              @change="handleDateRangeChange"
            />
          </template>
          <template v-else-if="reimbursementDateType === 'month'">
            <el-date-picker
              v-model="reimbursementMonthDate"
              type="month"
              placeholder="选择月份"
              size="default"
              style="width: 140px; margin-right: 8px;"
              @change="handleDateRangeChange"
            />
          </template>
          <template v-else-if="reimbursementDateType === 'year'">
            <el-date-picker
              v-model="reimbursementYearDate"
              type="year"
              placeholder="选择年份"
              size="default"
              style="width: 140px; margin-right: 8px;"
              @change="handleDateRangeChange"
            />
          </template>
        </template>
        <el-button type="danger" @click="exportReimbursementData" class="export-btn-small">
          导出
        </el-button>
        <el-button v-if="!isAdmin" type="primary" @click="goToReimbursementApply" class="action-btn">
          <span class="btn-icon">+</span>
          发起报销申请
        </el-button>
      </div>
    </div>

    <div v-if="viewMode === 'list'" class="list-view">
      <el-table
        :data="filteredReimbursementRecords"
        style="width: 100%"
        :header-cell-style="{ background: '#f5f7fa', color: '#606266' }"
        stripe
        fit
      >
        <el-table-column prop="id" label="报销编号" width="100">
          <template #default="{ row }">
            <span class="id-badge">#{{ row.id }}</span>
          </template>
        </el-table-column>
        <el-table-column label="申请人">
          <template #default="{ row }">
            {{ extractRealName(row.applicant) }}
          </template>
        </el-table-column>
        <el-table-column prop="reimburseType" label="报销类型">
          <template #default="{ row }">
            <span class="type-tag" :class="getReimburseTypeClass(row.reimburseType)">
              {{ row.reimburseType }}
            </span>
          </template>
        </el-table-column>
        <el-table-column prop="amount" label="合计金额">
          <template #default="{ row }">
            <span class="amount-badge">¥{{ row.amount }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="reimburseDate" label="报销日期" width="120"></el-table-column>
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
                @click="$emit('terminate', row, 'reimbursement')"
                class="terminate-btn"
              >
                终止
              </el-button>
              <el-tag
                v-if="row.status === '已批准' && canDistribute && isDistributed(row, 'reimbursement')"
                type="warning"
                size="small"
                effect="plain"
              >
                已下发
              </el-tag>
              <el-button
                size="small"
                @click="$emit('view-detail', row, 'reimbursement')"
                class="view-btn"
              >
                详情
              </el-button>
              <el-button
                size="small"
                @click="exportReimbursementRow(row)"
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
      <div class="record-card" v-for="row in filteredReimbursementRecords" :key="row.id">
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
            <span class="card-label">报销类型</span>
            <span class="type-tag" :class="getReimburseTypeClass(row.reimburseType)">{{ row.reimburseType }}</span>
          </div>
          <div class="card-row">
            <span class="card-label">合计金额</span>
            <span class="amount-badge">¥{{ row.amount }}</span>
          </div>
          <div class="card-row">
            <span class="card-label">报销日期</span>
            <span class="card-value">{{ row.reimburseDate }}</span>
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
              @click="$emit('terminate', row, 'reimbursement')"
            >
              终止
            </el-button>
            <el-tag v-if="row.status === '已批准' && canDistribute && isDistributed(row, 'reimbursement')" type="warning" size="small" effect="plain" style="margin-right:6px;">已下发</el-tag>
            <el-button size="small" @click="$emit('view-detail', row, 'reimbursement')">详情</el-button>
          </div>
        </div>
      </div>
    </div>

    <el-dialog v-model="reimbursementDialogVisible" title="报销申请" width="850px" class="wide-dialog" :modal="false">
      <div class="dialog-body">
        <div class="dialog-section">
          <div class="section-title">💰 报销信息</div>
          <el-form :model="reimbursementForm" :rules="reimbursementRules" ref="reimbursementFormRef" label-width="100px" class="dialog-form">
            <el-row :gutter="24">
              <el-col :span="12">
                <el-form-item label="报销类型" prop="reimburseType">
                  <el-select v-model="reimbursementForm.reimburseType" placeholder="请选择" style="width: 100%">
                    <el-option label="差旅费" value="差旅费"></el-option>
                    <el-option label="办公用品" value="办公用品"></el-option>
                    <el-option label="餐饮费" value="餐饮费"></el-option>
                    <el-option label="交通费" value="交通费"></el-option>
                    <el-option label="其他" value="其他"></el-option>
                  </el-select>
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="报销日期" prop="reimburseDate">
                  <el-date-picker v-model="reimbursementForm.reimburseDate" type="date" placeholder="选择日期" style="width: 100%"></el-date-picker>
                </el-form-item>
              </el-col>
            </el-row>
            <el-row :gutter="24">
              <el-col :span="12">
                <el-form-item label="审批人">
                  <el-select v-model="reimbursementForm.approver" placeholder="请选择" style="width: 100%">
                    <el-option v-for="employee in approverEmployees" :key="employee.name" :label="employee.name" :value="employee.name" />
                  </el-select>
                </el-form-item>
              </el-col>
            </el-row>
            <el-form-item label="报销事由" prop="reason">
              <el-input v-model="reimbursementForm.reason" type="textarea" :rows="4" placeholder="请输入报销事由" maxlength="500" show-word-limit></el-input>
            </el-form-item>
            <el-divider content-position="left">出差明细（差旅费填写）</el-divider>
            <el-row :gutter="24">
              <el-col :span="12">
                <el-form-item label="项目名称">
                  <el-input v-model="reimbursementForm.detail.projectName" placeholder="请输入项目名称"></el-input>
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="人　数">
                  <el-input v-model.number="reimbursementForm.detail.peopleCount" type="number" placeholder="人数" :min="1"></el-input>
                </el-form-item>
              </el-col>
            </el-row>
            <el-divider content-position="left">行程安排（可添加多段行程）</el-divider>
            <div v-for="(segment, index) in reimbursementForm.detail.segments" :key="index" class="segment-card">
              <div class="segment-header">
                <span class="segment-title">第 {{ index + 1 }} 段</span>
                <el-button
                  v-if="reimbursementForm.detail.segments.length > 1"
                  type="danger"
                  size="small"
                  plain
                  @click="reimbursementForm.detail.segments.splice(index, 1)"
                >
                  删除
                </el-button>
              </div>
              <el-row :gutter="24">
                <el-col :span="12">
                  <el-form-item label="出发日期">
                    <el-date-picker v-model="segment.departureDate" type="date" placeholder="选择出发日期" style="width: 100%" value-format="YYYY-MM-DD" @change="calcReimbursementSegmentDays(segment)"></el-date-picker>
                  </el-form-item>
                </el-col>
                <el-col :span="12" v-if="segment.durationType === 'custom'">
                  <el-form-item label="到达日期">
                    <el-date-picker v-model="segment.arrivalDate" type="date" placeholder="选择到达日期" style="width: 100%" value-format="YYYY-MM-DD" :disabled-date="(time) => disabledReimbursementEndDate(time, segment)" @change="calcReimbursementSegmentDays(segment)"></el-date-picker>
                  </el-form-item>
                </el-col>
              </el-row>
              <el-row :gutter="24">
                <el-col :span="12">
                  <el-form-item label="出差时长">
                    <el-radio-group v-model="segment.durationType" @change="calcReimbursementSegmentDays(segment)">
                      <el-radio label="halfDay">半天 (0.5天)</el-radio>
                      <el-radio label="fullDay">一天 (1天)</el-radio>
                      <el-radio label="custom">自定义</el-radio>
                    </el-radio-group>
                  </el-form-item>
                </el-col>
                <el-col :span="12">
                  <el-form-item label="出发地点">
                    <el-input v-model="segment.departureLocation" placeholder="出发地点"></el-input>
                  </el-form-item>
                </el-col>
              </el-row>
              <el-row :gutter="24">
                <el-col :span="8">
                  <el-form-item label="到达地点">
                    <el-input v-model="segment.arrivalLocation" placeholder="到达地点"></el-input>
                  </el-form-item>
                </el-col>
                <el-col :span="8">
                  <el-form-item label="交通工具">
                    <el-select v-model="segment.transport" placeholder="请选择" style="width: 100%">
                      <el-option label="火车" value="火车" />
                      <el-option label="高铁" value="高铁" />
                      <el-option label="飞机" value="飞机" />
                      <el-option label="汽车" value="汽车" />
                      <el-option label="公司车" value="公司车" />
                      <el-option label="其他" value="其他" />
                    </el-select>
                  </el-form-item>
                </el-col>
                <el-col :span="8">
                  <el-form-item label="交通金额">
                    <el-input v-model.number="segment.transportAmount" type="number" placeholder="金额"><template #prefix>¥</template></el-input>
                  </el-form-item>
                </el-col>
              </el-row>
              <el-row :gutter="24">
                <el-col :span="12">
                  <el-form-item label="天数">
                    <el-input :model-value="String(segment.days)" disabled><template #append>天</template></el-input>
                  </el-form-item>
                </el-col>
                <el-col :span="12">
                  <el-form-item label="补助标准">
                    <el-input v-model.number="segment.allowanceStandard" type="number" placeholder="元/天" @change="calcReimbursementSegmentDays(segment)"><template #prefix>¥</template></el-input>
                  </el-form-item>
                </el-col>
              </el-row>
              <el-row :gutter="24">
                <el-col :span="8">
                  <el-form-item label="补助金额">
                    <el-input :model-value="(Number(segment.allowanceAmount) || 0).toFixed(2)" readonly><template #prefix>¥</template><template #append>自动</template></el-input>
                  </el-form-item>
                </el-col>
                <el-col :span="8">
                  <el-form-item label="住宿费用">
                    <el-input v-model.number="segment.lodgingAmount" type="number" placeholder="金额"><template #prefix>¥</template></el-input>
                  </el-form-item>
                </el-col>
                <el-col :span="8">
                  <el-form-item label="市内交通">
                    <el-input v-model.number="segment.localTransportAmount" type="number" placeholder="金额"><template #prefix>¥</template></el-input>
                  </el-form-item>
                </el-col>
              </el-row>
              <el-form-item label="其他费用">
                <el-input v-model.number="segment.otherAmount" type="number" placeholder="金额"><template #prefix>¥</template></el-input>
              </el-form-item>
            </div>
            <el-form-item>
              <el-button type="primary" plain @click="reimbursementForm.detail.segments.push(createReimbursementSegment())">＋ 添加行程</el-button>
            </el-form-item>
            <el-divider content-position="left">资金信息</el-divider>
            <el-row :gutter="24">
              <el-col :span="12">
                <el-form-item label="预借金额">
                  <el-input v-model.number="reimbursementForm.detail.preBorrowedAmount" type="number" placeholder="请输入已预借金额"><template #prefix>¥</template></el-input>
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="退/补金额">
                  <el-input v-model.number="reimbursementForm.detail.refundAmount" type="number" placeholder="请输入退/补金额"><template #prefix>¥</template></el-input>
                </el-form-item>
              </el-col>
            </el-row>
            <el-form-item label="合计金额">
              <el-input :model-value="reimbursementTotalAmountText" readonly><template #prefix>¥</template><template #append>自动计算</template></el-input>
            </el-form-item>
          </el-form>
        </div>
      </div>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="reimbursementDialogVisible = false">取消</el-button>
          <el-button type="primary" size="large" @click="submitReimbursementApplication">提交申请</el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import {
  getReimbursements,
  addReimbursement,
  updateReimbursement
} from '../services/api'
import {
  extractRealName,
  formatDate,
  getStatusClass,
  getStatusText,
  getReimburseTypeClass,
  exportToCSV,
  exportSingleRow,
  exportReimbursementFormHTML
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

const reimbursementFilter = ref('all')
const reimbursementPersonFilter = ref('all')
const reimbursementDateType = ref('range')
const reimbursementDateRange = ref([])
const reimbursementSingleDate = ref(null)
const reimbursementMonthDate = ref(null)
const reimbursementYearDate = ref(null)
const reimbursementDialogVisible = ref(false)
const reimbursementRecords = ref<any[]>([])
const allReimbursementRecords = ref<any[]>([])

const createReimbursementSegment = () => ({
  departureDate: '',
  departureLocation: '',
  durationType: 'fullDay',
  arrivalDate: '',
  arrivalLocation: '',
  transport: '',
  transportAmount: 0,
  days: 0,
  allowanceStandard: 0,
  allowanceAmount: 0,
  lodgingAmount: 0,
  localTransportAmount: 0,
  otherAmount: 0
})

const reimbursementForm = ref({
  reimburseType: '',
  reimburseDate: '',
  reason: '',
  approver: '总经理',
  detail: {
    projectName: '',
    peopleCount: 1,
    segments: [createReimbursementSegment()],
    preBorrowedAmount: 0,
    refundAmount: 0
  }
})

const calcReimbursementSegmentDays = (segment: any) => {
  if (segment.durationType === 'halfDay') {
    segment.arrivalDate = segment.departureDate
    segment.days = segment.departureDate ? 0.5 : 0
  } else if (segment.durationType === 'fullDay') {
    segment.arrivalDate = segment.departureDate
    segment.days = segment.departureDate ? 1 : 0
  } else if (segment.departureDate && segment.arrivalDate) {
    const start = new Date(segment.departureDate)
    const end = new Date(segment.arrivalDate)
    const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1
    segment.days = days > 0 ? days : 0
  } else {
    segment.days = 0
  }
  segment.allowanceAmount = Math.round(segment.days * (Number(segment.allowanceStandard) || 0) * 100) / 100
}

const disabledReimbursementEndDate = (time: Date, segment: any) => {
  if (!segment.departureDate) return false
  return time.getTime() < new Date(segment.departureDate).getTime()
}

const reimbursementTotalAmount = computed(() => {
  const sum = reimbursementForm.value.detail.segments.reduce((acc: number, seg: any) => {
    return acc
      + (Number(seg.transportAmount) || 0)
      + (Number(seg.allowanceAmount) || 0)
      + (Number(seg.lodgingAmount) || 0)
      + (Number(seg.localTransportAmount) || 0)
      + (Number(seg.otherAmount) || 0)
  }, 0)
  return Math.round(sum * 100) / 100
})

const reimbursementTotalAmountText = computed(() => reimbursementTotalAmount.value.toFixed(2))

const reimbursementRules = {
  reimburseType: [{ required: true, message: '请选择报销类型', trigger: 'change' }],
  reimburseDate: [{ required: true, message: '请选择报销日期', trigger: 'change' }],
  reason: [{ required: true, message: '请输入报销事由', trigger: 'blur' }]
}

const reimbursementFormRef = ref()
const router = useRouter()

const currentUsername = computed(() => {
  return localStorage.getItem('username') || '当前用户'
})

const reimbursementApplicants = computed(() => {
  const applicants = new Set(
    allReimbursementRecords.value
      .map((r: any) => extractRealName(r.applicant))
      .filter(Boolean)
  )
  return Array.from(applicants).sort()
})

const filteredReimbursementRecords = computed(() => {
  let records = props.isAdmin ? allReimbursementRecords.value : reimbursementRecords.value

  if (props.searchKeyword) {
    const keyword = props.searchKeyword.toLowerCase()
    records = records.filter((r: any) =>
      r.reimburseType?.toLowerCase().includes(keyword) ||
      r.reason?.toLowerCase().includes(keyword) ||
      r.applicant?.toLowerCase().includes(keyword)
    )
  }

  if (props.isAdmin && reimbursementFilter.value !== 'all') {
    records = records.filter((r: any) => r.status === reimbursementFilter.value)
  }

  if (props.isAdmin && reimbursementPersonFilter.value !== 'all' && reimbursementPersonFilter.value) {
    records = records.filter((r: any) => extractRealName(r.applicant) === reimbursementPersonFilter.value)
  }

  if (props.isAdmin) {
    if (reimbursementDateType.value === 'day' && reimbursementSingleDate.value) {
      const targetDate = new Date(reimbursementSingleDate.value)
      targetDate.setHours(0, 0, 0, 0)
      const nextDay = new Date(targetDate)
      nextDay.setDate(targetDate.getDate() + 1)
      nextDay.setHours(0, 0, 0, 0)
      records = records.filter((r: any) => {
        const submitDate = new Date(r.submitDate || r.createdAt)
        return submitDate >= targetDate && submitDate < nextDay
      })
    } else if (reimbursementDateType.value === 'range' && reimbursementDateRange.value && reimbursementDateRange.value.length === 2) {
      const startDate = new Date(reimbursementDateRange.value[0])
      const endDate = new Date(reimbursementDateRange.value[1])
      endDate.setHours(23, 59, 59, 999)
      records = records.filter((r: any) => {
        const submitDate = new Date(r.submitDate || r.createdAt)
        return submitDate >= startDate && submitDate <= endDate
      })
    } else if (reimbursementDateType.value === 'month' && reimbursementMonthDate.value) {
      const monthDate = new Date(reimbursementMonthDate.value)
      const startDate = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1)
      const endDate = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0)
      endDate.setHours(23, 59, 59, 999)
      records = records.filter((r: any) => {
        const submitDate = new Date(r.submitDate || r.createdAt)
        return submitDate >= startDate && submitDate <= endDate
      })
    } else if (reimbursementDateType.value === 'year' && reimbursementYearDate.value) {
      const yearDate = new Date(reimbursementYearDate.value)
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

const isDistributed = (row: any, type: string): boolean => {
  return props.allDistributedRecords?.some(
    (r: any) => Number(r.applicationId) === Number(row.id) && r.applicationType === type
  )
}

const loadReimbursementRecords = async () => {
  try {
    const response = await getReimbursements()
    if (response.success) {
      reimbursementRecords.value = response.data
        .filter((item: any) => extractRealName(item.applicant) === extractRealName(currentUsername.value) || extractRealName(item.approver) === extractRealName(currentUsername.value) || (item.result && item.result.includes(extractRealName(currentUsername.value) + ':')))
        .map((item: any) => ({
          ...item,
          submitDate: item.createdAt?.substring(0, 10) || ''
        }))
    }
  } catch (error) {
    console.error('获取报销记录失败:', error)
  }
}

const loadAllReimbursementRecords = async () => {
  try {
    const response = await getReimbursements()
    if (response.success) {
      allReimbursementRecords.value = response.data.map((item: any) => ({
        ...item,
        submitDate: item.createdAt?.substring(0, 10) || '',
        distributedUsers: []
      }))
      allReimbursementRecords.value = allReimbursementRecords.value.map((item: any) => ({
        ...item,
        distributedUsers: getDistributedUsersForApplication(item.id, 'reimbursement')
      }))
    }
  } catch (error) {
    console.error('获取所有报销记录失败:', error)
  }
}

const fetchData = async () => {
  await loadReimbursementRecords()
  if (props.isAdmin) {
    await loadAllReimbursementRecords()
  }
  emit('stat-update')
}

const goToReimbursementApply = () => {
  router.push('/oa/reimbursement-apply')
}

const submitReimbursementApplication = async () => {
  reimbursementFormRef.value?.validate(async (valid: boolean) => {
    if (valid) {
      if (reimbursementTotalAmount.value <= 0) {
        ElMessage.warning('合计金额必须大于0')
        return
      }
      try {
        const data = {
          applicant: currentUsername.value,
          reimburseType: reimbursementForm.value.reimburseType,
          amount: reimbursementTotalAmount.value,
          reimburseDate: formatDate(reimbursementForm.value.reimburseDate),
          reason: reimbursementForm.value.reason,
          approver: reimbursementForm.value.approver,
          detail: reimbursementForm.value.detail
        }
        const response = await addReimbursement(data)
        if (response.success) {
          ElMessage.success('报销申请已提交')
          reimbursementDialogVisible.value = false
          await fetchData()
        } else {
          ElMessage.error(response.message || '提交失败')
        }
      } catch (error) {
        console.error('提交报销申请失败:', error)
        ElMessage.error('提交失败')
      }
    }
  })
}

const handleApprove = (row: any) => {
  emit('approve', row, 'reimbursement')
}

const handleDateRangeChange = () => {}

const exportReimbursementData = () => {
  const data = filteredReimbursementRecords.value
  if (data.length === 0) {
    ElMessage.warning('没有数据可导出')
    return
  }
  let fileName = '报销申请记录'
  if (reimbursementFilter.value !== 'all') {
    fileName += `_${reimbursementFilter.value}`
  }
  if (reimbursementPersonFilter.value !== 'all' && reimbursementPersonFilter.value) {
    fileName += `_${reimbursementPersonFilter.value}`
  }
  exportToCSV(
    data,
    fileName,
    ['报销编号', '申请人', '报销类型', '合计金额', '报销日期', '报销事由', '审批状态', '审批人', '提交时间'],
    ['id', 'applicant', 'reimburseType', 'amount', 'reimburseDate', 'reason', 'status', 'approver', 'submitDate']
  )
}

const exportReimbursementRow = (row: any) => {
  const dept = props.allEmployees.find((e: any) => extractRealName(e.name) === extractRealName(row.applicant))?.department || ''
  exportReimbursementFormHTML(row, dept, props.allEmployees)
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
.type-tag.type-travel {
  background: rgba(33, 150, 243, 0.1);
  color: #2196F3;
  border: 1px solid rgba(33, 150, 243, 0.3);
}
.type-tag.type-office {
  background: rgba(156, 39, 176, 0.1);
  color: #9C27B0;
  border: 1px solid rgba(156, 39, 176, 0.3);
}
.type-tag.type-meal {
  background: rgba(255, 87, 34, 0.1);
  color: #FF5722;
  border: 1px solid rgba(255, 87, 34, 0.3);
}
.type-tag.type-transport {
  background: rgba(0, 150, 136, 0.1);
  color: #009688;
  border: 1px solid rgba(0, 150, 136, 0.3);
}
.type-tag.type-other,
.type-tag.type-default {
  background: rgba(158, 158, 158, 0.1);
  color: #9E9E9E;
  border: 1px solid rgba(158, 158, 158, 0.3);
}
.amount-badge {
  background: linear-gradient(135deg, rgba(76, 175, 80, 0.1), rgba(139, 195, 74, 0.1));
  color: #4CAF50;
  padding: 0.25rem 0.75rem;
  border-radius: 4px;
  font-size: 0.9rem;
  font-weight: 600;
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
.segment-card {
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  padding: 14px 14px 0;
  margin-bottom: 14px;
  background: #fafcff;
}
.segment-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}
.segment-title {
  font-size: 14px;
  font-weight: 600;
  color: #6495ED;
}
.days-input {
  display: flex;
  align-items: center;
  gap: 8px;
}
.days-quick {
  flex-shrink: 0;
}

</style>
