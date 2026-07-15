<template>
  <div class="tab-panel">
    <div class="panel-header">
      <div class="panel-title">
        <span class="title-badge">✈️</span>
        <span>出差申请管理</span>
      </div>
      <div class="header-actions">
        <template v-if="isAdmin">
          <el-select v-model="businessTripFilter" placeholder="筛选状态" size="default" style="width: 120px; margin-right: 8px;">
            <el-option label="全部" value="all" />
            <el-option label="审批中" value="审批中" />
            <el-option label="已批准" value="已批准" />
            <el-option label="已拒绝" value="已拒绝" />
          </el-select>
          <el-select v-model="businessTripTypeFilter" placeholder="筛选类型" size="default" style="width: 140px; margin-right: 8px;" clearable filterable>
            <el-option label="全部类型" value="all" />
            <el-option label="国内出差" value="国内出差" />
            <el-option label="国外出差" value="国外出差" />
          </el-select>
          <el-button type="danger" @click="exportBusinessTripData" class="export-btn-small">
            导出
          </el-button>
        </template>
        <el-button v-if="!isAdmin" type="primary" @click="goToBusinessTripApply" class="action-btn">
          <span class="btn-icon">+</span>
          发起出差申请
        </el-button>
      </div>
    </div>

    <div v-if="viewMode === 'list'" class="list-view">
      <el-table
        :data="filteredBusinessTripRecords"
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
        <el-table-column label="申请人" v-if="isAdmin">
          <template #default="{ row }">
            {{ extractRealName(row.applicant) }}
          </template>
        </el-table-column>
        <el-table-column prop="destination" label="目的地" min-width="150">
          <template #default="{ row }">
            <span class="destination">{{ row.destination }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="tripType" label="出差类型">
          <template #default="{ row }">
            <span class="type-tag" :class="getTripTypeClass(row.tripType)">
              {{ row.tripType }}
            </span>
          </template>
        </el-table-column>
        <el-table-column prop="days" label="天数" width="80">
          <template #default="{ row }">
            <span class="days-badge">{{ Number(row.days) === Math.floor(Number(row.days)) ? Math.floor(Number(row.days)) + '天' : row.days + '天' }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="estimatedCost" label="预估费用" width="120">
          <template #default="{ row }">
            <span class="amount-badge">¥{{ row.estimatedCost }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="status" label="审批状态" width="120">
          <template #default="{ row }">
            <span :class="['status-tag', getStatusClass(row.status)]">
              <span class="status-dot"></span>
              {{ getStatusText(row.status) }}
            </span>
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
                v-if="(row.status === '审批中' || row.status === 'pending') && isAdmin"
                size="small"
                type="primary"
                @click="handleApprove(row)"
                class="action-btn-small"
              >
                审批
              </el-button>
              <el-button
                v-if="(row.status === '审批中' || row.status === 'pending') && isAdmin"
                size="small"
                type="danger"
                @click="$emit('terminate', row, 'businessTrip')"
                class="terminate-btn"
              >
                终止
              </el-button>
              <el-button
                v-if="(row.status === '已批准' || row.status === 'approved') && isAdmin"
                size="small"
                type="success"
                @click="$emit('distribute', row, 'businessTrip')"
                class="distribute-btn"
              >
                下发
              </el-button>
              <el-button
                v-if="(row.status === '审批中' || row.status === 'pending') && !isAdmin"
                size="small"
                @click="cancelBusinessTripApplication(row)"
                class="cancel-btn"
              >
                取消
              </el-button>
              <el-button
                size="small"
                @click="$emit('view-detail', row, 'businessTrip')"
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
      <div class="record-card" v-for="row in filteredBusinessTripRecords" :key="row.id">
        <div class="card-header">
          <span class="card-id">#{{ row.id }}</span>
          <span :class="['card-status', getStatusClass(row.status)]">{{ getStatusText(row.status) }}</span>
        </div>
        <div class="card-body">
          <div class="card-row">
            <span class="card-label">申请人</span>
            <span class="card-value">{{ row.applicant || currentUser }}</span>
          </div>
          <div class="card-row">
            <span class="card-label">目的地</span>
            <span class="card-value highlight">{{ row.destination }}</span>
          </div>
          <div class="card-row">
            <span class="card-label">出差类型</span>
            <span class="type-tag" :class="getTripTypeClass(row.tripType)">{{ row.tripType }}</span>
          </div>
          <div class="card-row">
            <span class="card-label">出差天数</span>
            <span class="days-badge">{{ Number(row.days) === Math.floor(Number(row.days)) ? Math.floor(Number(row.days)) + '天' : row.days + '天' }}</span>
          </div>
          <div class="card-row">
            <span class="card-label">预估费用</span>
            <span class="amount-badge">¥{{ row.estimatedCost }}</span>
          </div>
        </div>
        <div class="card-footer">
          <span class="card-date">{{ row.submitDate }}</span>
          <div class="card-actions">
            <el-button
              v-if="(row.status === '审批中' || row.status === 'pending') && isAdmin"
              size="small"
              type="primary"
              @click="handleApprove(row)"
            >
              审批
            </el-button>
            <el-button
              v-if="(row.status === '审批中' || row.status === 'pending') && isAdmin"
              size="small"
              type="danger"
              @click="$emit('terminate', row, 'businessTrip')"
            >
              终止
            </el-button>
            <el-button
              v-if="(row.status === '已批准' || row.status === 'approved') && isAdmin"
              size="small"
              type="success"
              @click="$emit('distribute', row, 'businessTrip')"
            >
              下发
            </el-button>
            <el-button
              v-if="(row.status === '审批中' || row.status === 'pending') && !isAdmin"
              size="small"
              @click="cancelBusinessTripApplication(row)"
            >
              取消
            </el-button>
            <el-button size="small" @click="$emit('view-detail', row, 'businessTrip')">详情</el-button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  getBusinessTrips,
  updateBusinessTrip
} from '../services/api'
import {
  extractRealName,
  formatDate,
  getStatusClass,
  getStatusText,
  getTripTypeClass,
  exportToCSV
} from '../utils/oaWorkflowUtils'

const router = useRouter()

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

const businessTripFilter = ref('all')
const businessTripTypeFilter = ref('all')
const businessTripRecords = ref<any[]>([])
const allBusinessTripRecords = ref<any[]>([])

const currentUsername = computed(() => {
  return localStorage.getItem('username') || '当前用户'
})

const filteredBusinessTripRecords = computed(() => {
  let records = props.isAdmin ? allBusinessTripRecords.value : businessTripRecords.value

  if (props.searchKeyword) {
    const keyword = props.searchKeyword.toLowerCase()
    records = records.filter((r: any) =>
      r.destination?.toLowerCase().includes(keyword) ||
      r.tripType?.toLowerCase().includes(keyword) ||
      r.applicant?.toLowerCase().includes(keyword)
    )
  }

  if (props.isAdmin && businessTripFilter.value !== 'all') {
    const statusMap: Record<string, string[]> = {
      '审批中': ['审批中', 'pending'],
      '已批准': ['已批准', 'approved'],
      '已拒绝': ['已拒绝', 'rejected']
    }
    const statusValues = statusMap[businessTripFilter.value] || [businessTripFilter.value]
    records = records.filter((r: any) => statusValues.includes(r.status))
  }

  if (props.isAdmin && businessTripTypeFilter.value !== 'all' && businessTripTypeFilter.value) {
    records = records.filter((r: any) => r.tripType === businessTripTypeFilter.value)
  }

  return records
})

const getDistributedUsersForApplication = (applicationId: number, applicationType: string) => {
  const records = props.allDistributedRecords.filter(
    (r: any) => Number(r.applicationId) === Number(applicationId) && r.applicationType === applicationType
  )
  return [...new Set(records.map((r: any) => r.targetUser))]
}

const loadBusinessTripRecords = async () => {
  try {
    const response = await getBusinessTrips()
    if (response.success && response.data && response.data.list) {
      const filteredData = response.data.list.filter((item: any) => {
        return props.isAdmin || extractRealName(item.applicant_name || item.applicant) === extractRealName(currentUsername.value)
      })
      businessTripRecords.value = filteredData.map((item: any) => {
        let destination = item.destination ? String(item.destination) : ''
        let tripType = item.trip_type ? String(item.trip_type) : ''
        try {
          if (destination.includes('?') && destination.length > 1) {
            destination = decodeURIComponent(escape(destination))
          }
          if (tripType.includes('?') && tripType.length > 1) {
            tripType = decodeURIComponent(escape(tripType))
          }
        } catch (e) {
          console.error('编码转换失败:', e)
        }
        if (destination.includes('????') || /^\?+$/.test(destination)) {
          destination = '未知目的地'
        }
        if (tripType.includes('????') || /^\?+$/.test(tripType)) {
          tripType = '未知出差类型'
        }
        return {
          ...item,
          applicant: item.applicant_name,
          destination: destination,
          tripType: tripType,
          submitDate: item.created_at?.substring(0, 10) || '',
          estimatedCost: item.estimated_cost || item.estimatedCost || 0
        }
      })
    }
  } catch (error) {
    console.error('获取出差记录失败:', error)
  }
}

const loadAllBusinessTripRecords = async () => {
  try {
    const response = await getBusinessTrips()
    if (response.success && response.data && response.data.list) {
      allBusinessTripRecords.value = response.data.list.map((item: any) => {
        let destination = item.destination ? String(item.destination) : ''
        let tripType = item.trip_type ? String(item.trip_type) : ''
        try {
          if (destination.includes('?') && destination.length > 1) {
            destination = decodeURIComponent(escape(destination))
          }
          if (tripType.includes('?') && tripType.length > 1) {
            tripType = decodeURIComponent(escape(tripType))
          }
        } catch (e) {
          console.error('编码转换失败:', e)
        }
        if (destination.includes('????') || /^\?+$/.test(destination)) {
          destination = '未知目的地'
        }
        if (tripType.includes('????') || /^\?+$/.test(tripType)) {
          tripType = '未知出差类型'
        }
        return {
          ...item,
          applicant: item.applicant_name,
          destination: destination,
          tripType: tripType,
          submitDate: item.created_at?.substring(0, 10) || '',
          estimatedCost: item.estimated_cost || item.estimatedCost || 0,
          distributedUsers: []
        }
      })
      allBusinessTripRecords.value = allBusinessTripRecords.value.map((item: any) => ({
        ...item,
        distributedUsers: getDistributedUsersForApplication(item.id, 'businessTrip')
      }))
    }
  } catch (error) {
    console.error('获取所有出差记录失败:', error)
  }
}

const fetchData = async () => {
  await loadBusinessTripRecords()
  if (props.isAdmin) {
    await loadAllBusinessTripRecords()
  }
  emit('stat-update')
}

const handleApprove = (row: any) => {
  emit('approve', row, 'businessTrip')
}

const cancelBusinessTripApplication = async (row: any) => {
  try {
    await ElMessageBox.confirm('确定要取消该出差申请吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    const response = await updateBusinessTrip(row.id, {
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

const goToBusinessTripApply = () => {
  router.push('/oa/business-trip')
}

const exportBusinessTripData = () => {
  const data = filteredBusinessTripRecords.value
  if (data.length === 0) {
    ElMessage.warning('没有数据可导出')
    return
  }
  let fileName = '出差申请记录'
  if (businessTripFilter.value !== 'all') {
    fileName += `_${businessTripFilter.value}`
  }
  if (businessTripTypeFilter.value !== 'all' && businessTripTypeFilter.value) {
    fileName += `_${businessTripTypeFilter.value}`
  }
  exportToCSV(
    data,
    fileName,
    ['申请编号', '申请人', '目的地', '出差类型', '出差天数', '预估费用', '审批状态', '提交时间'],
    ['id', 'applicant', 'destination', 'tripType', 'days', 'estimatedCost', 'status', 'submitDate']
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
.type-tag.type-domestic {
  background: rgba(76, 175, 80, 0.1);
  color: #4CAF50;
  border: 1px solid rgba(76, 175, 80, 0.3);
}
.type-tag.type-international {
  background: rgba(33, 150, 243, 0.1);
  color: #2196F3;
  border: 1px solid rgba(33, 150, 243, 0.3);
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
.destination {
  color: #333;
  font-weight: 500;
}
</style>
