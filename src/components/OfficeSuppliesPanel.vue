<template>
  <div class="tab-panel">
    <div class="panel-header">
      <div class="panel-title">
        <span class="title-badge">📊</span>
        <span>协同申请管理</span>
      </div>
      <div class="header-actions">
        <template v-if="isAdmin">
          <el-select v-model="projectFilter" placeholder="筛选状态" size="default" style="width: 120px; margin-right: 8px;">
            <el-option label="全部" value="all" />
            <el-option label="审批中" value="审批中" />
            <el-option label="已批准" value="已批准" />
            <el-option label="已拒绝" value="已拒绝" />
          </el-select>
        </template>
        <el-button v-if="!isAdmin && !isLiZhiXin" type="primary" @click="goToProjectApply" class="action-btn">
          <span class="btn-icon">+</span>
          发起协同申请
        </el-button>
      </div>
    </div>

    <div class="sub-tabs-row">
      <div class="sub-tabs">
        <button
          v-for="tab in projectSubTabs"
          :key="tab.value"
          class="sub-tab-btn"
          :class="{ active: projectSubTab === tab.value }"
          @click="projectSubTab = tab.value"
        >{{ tab.label }}<span v-if="tab.badge > 0" class="sub-tab-badge" :class="{ 'sub-tab-badge-red': tab.badgeType === 'red' }">{{ tab.badge }}</span></button>
      </div>
    </div>

    <div v-if="viewMode === 'list'" class="list-view">
      <el-table
        :data="filteredProjectRecords"
        style="width: 100%"
        :header-cell-style="{ background: '#f5f7fa', color: '#606266' }"
        stripe
        fit
      >
        <el-table-column prop="seqNo" label="申请编号" width="100">
          <template #default="{ row }">
            <span class="id-badge">#{{ row.seqNo }}</span>
          </template>
        </el-table-column>
        <el-table-column label="申请人">
          <template #default="{ row }">
            {{ extractRealName(row.applicant) }}
          </template>
        </el-table-column>
        <el-table-column prop="projectName" label="协同事项名称" min-width="150">
          <template #default="{ row }">
            <span class="project-name">{{ row.projectName }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="projectType" label="协作类型" width="110">
          <template #default="{ row }">
            <span class="type-tag" :class="getProjectTypeClass(row.projectType)">{{ row.projectType }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="participatingDepartments" label="参与部门" width="160">
          <template #default="{ row }">
            <span v-if="getDeptArray(row).length">{{ getDeptArray(row).join('、') }}</span>
            <span v-else class="no-distributed">-</span>
          </template>
        </el-table-column>
        <el-table-column prop="budget" label="预算金额" width="120">
          <template #default="{ row }">
            <span class="amount-badge">¥{{ row.budget }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="priority" label="优先级" width="80">
          <template #default="{ row }">
            <span class="priority-tag" :class="getPriorityClass(row.priority)">
              {{ row.priority }}
            </span>
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
        <el-table-column label="已读状态" width="100" v-if="projectSubTab === 'received'">
          <template #default="{ row }">
            <span v-if="getMyDistribution(row, 'project')" :class="getDistributionRead(row, 'project') ? 'read-status read' : 'read-status unread'">
              {{ getDistributionRead(row, 'project') ? '已读' : '未读' }}
            </span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="340" fixed="right">
          <template #default="{ row }">
            <div class="action-group">
              <el-button
                v-if="(row.status === '审批中' || row.status === 'pending') && (isAdmin || extractRealName(row.approver) === extractRealName(currentUsername))"
                size="small"
                type="primary"
                @click="handleApprove(row)"
                class="action-btn-small"
              >
                审批
              </el-button>
              <el-tag
                v-if="(row.status === '已批准' || row.status === 'approved') && canDistribute && isDistributed(row, 'project')"
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
                @click="returnProjectAction(row)"
              >
                退回
              </el-button>
              <el-button
                v-if="canWithdraw(row)"
                size="small"
                @click="withdrawProjectAction(row)"
                class="cancel-btn"
              >
                撤回
              </el-button>
              <el-button
                v-if="canResubmitDelete(row)"
                size="small"
                type="warning"
                @click="resubmitProject(row)"
              >
                重新提交
              </el-button>
              <el-button
                v-if="canResubmitDelete(row)"
                size="small"
                type="danger"
                @click="deleteProjectAction(row)"
              >
                删除
              </el-button>
              <el-button
                size="small"
                @click="$emit('view-detail', row, 'project')"
                class="view-btn"
              >
                详情
              </el-button>
              <el-button
                v-if="isAdmin"
                size="small"
                type="danger"
                @click="deleteProjectApplication(row)"
                class="delete-btn"
              >
                删除
              </el-button>
            </div>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <div v-else class="card-view">
      <div class="record-card" v-for="row in filteredProjectRecords" :key="row.id">
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
            <span class="card-label">协同事项名称</span>
            <span class="card-value highlight">{{ row.projectName }}</span>
          </div>
          <div class="card-row" v-if="getDeptArray(row).length">
            <span class="card-label">参与部门</span>
            <span class="card-value">{{ getDeptArray(row).join('、') }}</span>
          </div>
          <div class="card-row">
            <span class="card-label">预算金额</span>
            <span class="amount-badge">¥{{ row.budget }}</span>
          </div>
          <div class="card-row">
            <span class="card-label">优先级</span>
            <span class="priority-tag" :class="getPriorityClass(row.priority)">{{ row.priority }}</span>
          </div>
        </div>
        <div class="card-footer">
          <span class="card-date">{{ row.submitDate }}</span>
          <div class="card-actions">
            <el-button
              v-if="(row.status === '审批中' || row.status === '待审批' || row.status === 'pending') && (isAdmin || extractRealName(row.approver) === extractRealName(currentUsername))"
              size="small"
              type="primary"
              @click="handleApprove(row)"
            >
              审批
            </el-button>
            <el-tag
              v-if="(row.status === '已批准' || row.status === 'approved') && canDistribute && isDistributed(row, 'project')"
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
              @click="returnProjectAction(row)"
            >
              退回
            </el-button>
            <el-button
              v-if="canWithdraw(row)"
              size="small"
              @click="withdrawProjectAction(row)"
            >
              撤回
            </el-button>
            <el-button
              v-if="canResubmitDelete(row)"
              size="small"
              type="warning"
              @click="resubmitProject(row)"
            >
              重新提交
            </el-button>
            <el-button
              v-if="canResubmitDelete(row)"
              size="small"
              type="danger"
              @click="deleteProjectAction(row)"
            >
              删除
            </el-button>
            <el-button
              v-if="projectSubTab === 'received' && getMyDistribution(row, 'project') && !getDistributionRead(row, 'project')"
              size="small"
              type="primary"
              @click="toggleRecordRead(row, 'project')"
            >
              标为已读
            </el-button>
            <el-tag
              v-if="projectSubTab === 'received' && getMyDistribution(row, 'project') && getDistributionRead(row, 'project')"
              type="success"
              size="small"
              effect="plain"
            >
              已读
            </el-tag>
            <el-button size="small" @click="$emit('view-detail', row, 'project')">详情</el-button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  getProjects,
  getDistributedRecords,
  markDistributedRead,
  updateProject,
  deleteProject,
  withdrawProject,
  returnProject,
  softDeleteProject
} from '../services/api'
import {
  extractRealName,
  formatDate,
  getStatusClass,
  getStatusText,
  getProjectTypeClass,
  getPriorityClass,
  exportToCSV,
  exportSingleRow
} from '../utils/oaWorkflowUtils'

const router = useRouter()

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

const projectFilter = ref('all')
const projectRecords = ref<any[]>([])
const allProjectRecords = ref<any[]>([])

const currentUsername = computed(() => {
  return localStorage.getItem('username') || '当前用户'
})

const isLiZhiXin = computed(() => extractRealName(currentUsername.value) === '李智鑫')

// 导出按钮仅张海琼可见（财务总监负责导出 OA 办公各类申请表）
const canExport = computed(() => extractRealName(currentUsername.value) === '张海琼')

const projectSubTab = ref(props.subTab || 'applied')
const appliedProjectCount = computed(() => {
  const base = props.isAdmin ? allProjectRecords.value : projectRecords.value
  const applied = base.filter(isMyProjectApplication)
  return { total: applied.length, pending: applied.filter(r => isPending(r)).length, returned: applied.filter(r => isReturned(r)).length }
})
const receivedProjectCount = computed(() => {
  const base = props.isAdmin ? allProjectRecords.value : projectRecords.value
  const received = base.filter((r: any) => !isMyProjectApplication(r) && isReceivedProject(r))
  const pending = received.filter(r => isPending(r)).length
  const unread = received.filter(r => isItemDistributedToMe(r, 'project') && !getDistributionRead(r, 'project')).length
  return { total: received.length, pendingUnread: pending + unread }
})
// 「我申请的」高亮已退回条数，提示申请人需要修改重提；无退回时显示总数灰色
const projectSubTabs = computed(() => [
  { label: '我申请的', value: 'applied', badge: appliedProjectCount.value.returned > 0 ? appliedProjectCount.value.returned : appliedProjectCount.value.total, badgeType: appliedProjectCount.value.returned > 0 ? 'red' : 'gray' },
  { label: '我收到的', value: 'received', badge: receivedProjectCount.value.pendingUnread > 0 ? receivedProjectCount.value.pendingUnread : receivedProjectCount.value.total, badgeType: receivedProjectCount.value.pendingUnread > 0 ? 'red' : 'gray' }
])

// 向父组件同步徽标口径，用于顶部主页签计数
const projectBadgePayload = computed(() => ({
  appliedTotal: appliedProjectCount.value.total,
  appliedReturned: appliedProjectCount.value.returned,
  receivedTotal: receivedProjectCount.value.total,
  receivedPendingUnread: receivedProjectCount.value.pendingUnread
}))
watch(() => projectBadgePayload.value, (v) => emit('update:badge', v), { immediate: true })

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

const isMyProjectApplication = (r: any) => extractRealName(r.applicant_name || r.applicant) === extractRealName(currentUsername.value)

// 张海琼收到的下发统一下沉到「下发管理」页，她的「我收到的」只保留需要自己审批的
const isZhangUser = computed(() => extractRealName(currentUsername.value) === '张海琼')

const isReceivedProject = (r: any) => {
  const me = extractRealName(currentUsername.value)
  if (extractRealName(r.approver) === me) return true
  if (r.result && r.result.includes(me + ':')) return true
  if (!isZhangUser.value && isItemDistributedToMe(r, 'project')) return true
  return false
}

watch(() => props.subTab, (v: string) => { if (v) projectSubTab.value = v })

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

const filteredProjectRecords = computed(() => {
  let records = props.isAdmin ? allProjectRecords.value : projectRecords.value

  if (projectSubTab.value === 'applied') {
    records = records.filter(isMyProjectApplication)
  } else if (projectSubTab.value === 'received') {
    records = records.filter((r: any) => !isMyProjectApplication(r) && isReceivedProject(r))
  }

  if (props.searchKeyword) {
    const keyword = props.searchKeyword.toLowerCase()
    records = records.filter((r: any) =>
      r.projectName?.toLowerCase().includes(keyword) ||
      r.projectType?.toLowerCase().includes(keyword) ||
      (getDeptArray(r).join('、')).toLowerCase().includes(keyword) ||
      r.applicant?.toLowerCase().includes(keyword)
    )
  }

  if (props.isAdmin && projectFilter.value !== 'all') {
    const statusMap: Record<string, string[]> = {
      '审批中': ['审批中', 'pending'],
      '已批准': ['已批准', 'approved'],
      '已拒绝': ['已拒绝', 'rejected']
    }
    const statusValues = statusMap[projectFilter.value] || [projectFilter.value]
    records = records.filter((r: any) => statusValues.includes(r.status))
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

// 参与部门：DB 存 JSON 字符串，统一解析为数组
const getDeptArray = (row: any): string[] => {
  const v = row.participatingDepartments ?? row.participating_departments ?? ''
  if (!v) return []
  if (Array.isArray(v)) return v
  try { const p = JSON.parse(v); return Array.isArray(p) ? p : [String(p)] } catch { return String(v).split(/[,，]/).map((s: string) => s.trim()).filter(Boolean) }
}

const loadProjectRecords = async () => {
  try {
    if (!myDistributedLoaded) await loadMyDistributedRecords()
    const response = await getProjects()
    if (response.success && response.data && response.data.list) {
      const filteredData = response.data.list.filter((item: any) => {
        return extractRealName(item.applicant_name || item.applicant) === extractRealName(currentUsername.value) || extractRealName(item.approver) === extractRealName(currentUsername.value) || (item.result && item.result.includes(extractRealName(currentUsername.value) + ':')) || (!isZhangUser.value && isItemDistributedToMe(item, 'project'))
      })
      projectRecords.value = filteredData.map((item: any) => {
        let projectName = item.project_name ? String(item.project_name) : ''
        let projectType = item.project_type ? String(item.project_type) : ''
        try {
          if (projectName.includes('?') && projectName.length > 1) {
            projectName = decodeURIComponent(escape(projectName))
          }
          if (projectType.includes('?') && projectType.length > 1) {
            projectType = decodeURIComponent(escape(projectType))
          }
        } catch (e) {
          console.error('编码转换失败:', e)
        }
        if (projectName.includes('????') || /^\?+$/.test(projectName)) {
          projectName = '未知项目名称'
        }
        if (projectType.includes('????') || /^\?+$/.test(projectType)) {
          projectType = '未知项目类型'
        }
        return {
          ...item,
          applicant: item.applicant_name,
          projectName: projectName,
          projectType: projectType,
          participatingDepartments: item.participating_departments || '',
          submitDate: item.created_at?.substring(0, 10) || ''
        }
      })
    }
  } catch (error) {
    console.error('获取项目记录失败:', error)
  }
}

const loadAllProjectRecords = async () => {
  try {
    const response = await getProjects()
    if (response.success && response.data && response.data.list) {
      allProjectRecords.value = response.data.list.map((item: any) => {
        let projectName = item.project_name ? String(item.project_name) : ''
        let projectType = item.project_type ? String(item.project_type) : ''
        try {
          if (projectName.includes('?') && projectName.length > 1) {
            projectName = decodeURIComponent(escape(projectName))
          }
          if (projectType.includes('?') && projectType.length > 1) {
            projectType = decodeURIComponent(escape(projectType))
          }
        } catch (e) {
          console.error('编码转换失败:', e)
        }
        if (projectName.includes('????') || /^\?+$/.test(projectName)) {
          projectName = '未知项目名称'
        }
        if (projectType.includes('????') || /^\?+$/.test(projectType)) {
          projectType = '未知项目类型'
        }
        return {
          ...item,
          applicant: item.applicant_name,
          projectName: projectName,
          projectType: projectType,
          participatingDepartments: item.participating_departments || '',
          submitDate: item.created_at?.substring(0, 10) || '',
          distributedUsers: []
        }
      })
      allProjectRecords.value = allProjectRecords.value.map((item: any) => ({
        ...item,
        distributedUsers: getDistributedUsersForApplication(item.id, 'project')
      }))
    }
  } catch (error) {
    console.error('获取所有项目记录失败:', error)
  }
}

const fetchData = async () => {
  await loadMyDistributedRecords()
  await loadProjectRecords()
  if (props.isAdmin) {
    await loadAllProjectRecords()
  }
  emit('stat-update')
}

const handleApprove = (row: any) => {
  emit('approve', row, 'project')
}

// 撤回/退回/重新提交/删除 显示条件
const isPending = (r: any) => ['审批中', '待审批', '待审核', 'pending'].includes(r.status)
const isWithdrawnOrDraft = (r: any) => ['已撤回', '草稿', 'withdrawn', 'draft'].includes(r.status)
const canApprove = (row: any) => isPending(row) && (props.isAdmin || extractRealName(row.approver) === extractRealName(currentUsername.value))
const canReturn = (row: any) => isPending(row) && (props.isAdmin || extractRealName(row.approver) === extractRealName(currentUsername.value))
const canWithdraw = (row: any) => isPending(row) && !props.isAdmin && extractRealName(row.applicant_name || row.applicant) === extractRealName(currentUsername.value)
const canResubmitDelete = (row: any) => isWithdrawnOrDraft(row) && (props.isAdmin || extractRealName(row.applicant_name || row.applicant) === extractRealName(currentUsername.value))

const withdrawProjectAction = async (row: any) => {
  try {
    await ElMessageBox.confirm('确定要撤回该项目申请吗？撤回后将变为「已撤回」状态。', '撤回确认', { confirmButtonText: '确定撤回', cancelButtonText: '取消', type: 'warning' })
    const response = await withdrawProject(row.id)
    if (response?.success) { ElMessage.success('撤回成功'); await fetchData() }
    else { ElMessage.error(response?.message || '撤回失败') }
  } catch (error: any) { if (error !== 'cancel' && error?.type !== 'cancel') { console.error('撤回失败:', error); ElMessage.error('撤回失败') } }
}

const returnProjectAction = async (row: any) => {
  try {
    const { value } = await ElMessageBox.prompt('请填写退回理由（必填）：', '退回申请', { confirmButtonText: '确定退回', cancelButtonText: '取消', inputType: 'textarea', inputValidator: (val: string) => (val && val.trim() ? true : '退回理由不能为空'), type: 'warning' })
    const response = await returnProject(row.id, value.trim())
    if (response?.success) { ElMessage.success('已退回'); await fetchData() }
    else { ElMessage.error(response?.message || '退回失败') }
  } catch (error: any) { if (error !== 'cancel' && error?.type !== 'cancel' && error?.action !== 'cancel') { console.error('退回失败:', error); ElMessage.error('退回失败') } }
}

const deleteProjectAction = async (row: any) => {
  try {
    await ElMessageBox.confirm('确定要删除该项目申请吗？删除后无法恢复。', '删除确认', { confirmButtonText: '确定删除', cancelButtonText: '取消', type: 'warning' })
    const response = await softDeleteProject(row.id)
    if (response?.success) { ElMessage.success('删除成功'); await fetchData() }
    else { ElMessage.error(response?.message || '删除失败') }
  } catch (error: any) { if (error !== 'cancel' && error?.type !== 'cancel') { console.error('删除失败:', error); ElMessage.error('删除失败') } }
}

const resubmitProject = (row: any) => { router.push(`/oa/project-apply?id=${row.id}`) }

const deleteProjectApplication = async (row: any) => {
  try {
    await ElMessageBox.confirm('确定要删除该项目申请吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'danger'
    })
    const response = await deleteProject(row.id)
    if (response?.success) {
      ElMessage.success('申请已删除')
      await fetchData()
    } else {
      ElMessage.error(response?.message || '删除失败')
    }
  } catch (error: any) {
    if (error !== 'cancel') {
      console.error('删除申请失败:', error)
      ElMessage.error('删除申请失败')
    }
  }
}

const goToProjectApply = () => {
  router.push('/oa/project-apply')
}

const exportProjectData = () => {
  const data = filteredProjectRecords.value
  if (data.length === 0) {
    ElMessage.warning('没有数据可导出')
    return
  }
  let fileName = '项目申请记录'
  if (projectFilter.value !== 'all') {
    fileName += `_${projectFilter.value}`
  }
  exportToCSV(
    data,
    fileName,
    ['申请编号', '申请人', '项目名称', '预算金额', '优先级', '审批状态', '提交时间'],
    ['seqNo', 'applicant', 'projectName', 'budget', 'priority', 'status', 'submitDate']
  )
}

// 打印当前行记录（生成纸质表单并自动触发打印对话框）
const printRow = (row) => {
  if (!row) {
    ElMessage.warning('没有数据可打印')
    return
  }
  // 协同申请无专门纸质表单，使用通用打印
  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>协同申请详情</title><style>@page{margin:10mm}body{font-family:"SimSun","宋体",serif;padding:20px;color:#000}.info-row{margin:10px 0}.info-label{font-weight:bold;display:inline-block;width:100px}</style></head><body><h2 style="text-align:center">协同申请详情</h2><div class="info-row"><span class="info-label">协同事项名称：</span>${row.projectName || row.title || ''}</div><div class="info-row"><span class="info-label">申请人：</span>${row.applicant || ''}</div><div class="info-row"><span class="info-label">协作类型：</span>${row.projectType || ''}</div><div class="info-row"><span class="info-label">参与部门：</span>${getDeptArray(row).join('、') || '-'}</div><div class="info-row"><span class="info-label">审批状态：</span>${row.status || ''}</div></body></html>`
  const win = window.open('', '_blank')
  if (win) { win.document.open(); win.document.write(html); win.document.close(); win.onload = () => win.print(); }
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
.type-tag.type-research {
  background: rgba(33, 150, 243, 0.1);
  color: #2196F3;
  border: 1px solid rgba(33, 150, 243, 0.3);
}
.type-tag.type-market {
  background: rgba(255, 152, 0, 0.1);
  color: #FF9800;
  border: 1px solid rgba(255, 152, 0, 0.3);
}
.type-tag.type-operation {
  background: rgba(76, 175, 80, 0.1);
  color: #4CAF50;
  border: 1px solid rgba(76, 175, 80, 0.3);
}
.type-tag.type-construction {
  background: rgba(156, 39, 176, 0.1);
  color: #9C27B0;
  border: 1px solid rgba(156, 39, 176, 0.3);
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
.priority-tag {
  display: inline-block;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.8rem;
  font-weight: 500;
}
.priority-tag.priority-high {
  background: rgba(244, 67, 54, 0.1);
  color: #f44336;
}
.priority-tag.priority-medium {
  background: rgba(255, 152, 0, 0.1);
  color: #FF9800;
}
.priority-tag.priority-low {
  background: rgba(76, 175, 80, 0.1);
  color: #4CAF50;
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
.delete-btn {
  background: linear-gradient(45deg, #f44336, #ff5722) !important;
  border: none !important;
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
.project-name {
  color: #333;
  font-weight: 500;
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
