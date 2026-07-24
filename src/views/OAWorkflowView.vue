<template>
  <div class="approval-center-container">
    <header class="header">
      <div class="logo">
        <span class="logo-text">宏友软件</span>
        <div class="logo-glow"></div>
      </div>
      <nav class="nav">
        <router-link to="/" class="nav-item">首页</router-link>
        <router-link to="/oa-office" class="nav-item active">协同管理</router-link>
        <button class="nav-item logout-btn" @click="handleBack">返回</button>
      </nav>
    </header>

    <main class="main-content">
      <div class="content-wrapper">
        <div class="page-header">
          <div class="header-left">
            <h2 class="section-title">
              <span class="title-icon">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19 3H5C3.9 3 3 3.9 3 5V19C3 20.1 3.9 21 5 21H19C20.1 21 21 20.1 21 19V5C21 3.9 20.1 3 19 3ZM11 17H7V10H11V17ZM17 17H13V7H17V17Z"/>
                </svg>
              </span>
              审批中心
            </h2>
            <p class="page-subtitle">请假、报销、会议申请统一管理平台</p>
          </div>
          <div class="header-right">
            <div class="search-box">
              <el-input
                v-model="searchKeyword"
                placeholder="搜索申请..."
                prefix-icon="Search"
                clearable
                @input="handleSearch"
              />
            </div>
          </div>
        </div>

        <div class="stats-bar">
          <div class="stat-item" v-for="stat in approvalStats" :key="stat.key" :class="stat.key" @click="openStatDetail(stat.key)">
            <div class="stat-icon-wrapper" :style="{ background: stat.gradient }">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path :d="stat.icon"/>
              </svg>
            </div>
            <div class="stat-content">
              <span class="stat-number">{{ stat.value }}</span>
              <span class="stat-name">{{ stat.label }}</span>
            </div>
            <div class="stat-arrow"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18l6-6-6-6"/></svg></div>
          </div>
        </div>

        <div class="tabs-container">
          <div class="tabs-header">
            <div class="custom-tabs">
              <div
                v-for="tab in tabs"
                :key="tab.name"
                class="tab-item"
                :class="{ active: activeTab === tab.name }"
                @click="activeTab = tab.name"
              >
                <span class="tab-icon">{{ tab.icon }}</span>
                <span class="tab-label">{{ tab.label }}</span>
                <span v-if="tab.badge > 0" class="tab-badge">{{ tab.badge }}</span>
              </div>
            </div>
            <div class="view-toggle">
              <button
                class="toggle-btn"
                :class="{ active: viewMode === 'list' }"
                @click="viewMode = 'list'"
              >
                <svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z"/></svg>
              </button>
              <button
                class="toggle-btn"
                :class="{ active: viewMode === 'card' }"
                @click="viewMode = 'card'"
              >
                <svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 5v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2H5c-1.11 0-2 .9-2 2zm12 4c0 .55-.45 1-1 1H7c-.55 0-1-.45-1-1V7c0-.55.45-1 1-1h7c.55 0 1 .45 1 1v2zm0 4c0 .55-.45 1-1 1H7c-.55 0-1-.45-1-1v-2c0-.55.45-1 1-1h7c.55 0 1 .45 1 1v2zm-4 5c0 .55-.45 1-1 1H7c-.55 0-1-.45-1-1v-2c0-.55.45-1 1-1h3c.55 0 1 .45 1 1v2zm4-9c0-.55.45-1 1-1h3c.55 0 1 .45 1 1v2c0 .55-.45 1-1 1h-3c-.55 0-1-.45-1-1V7zm0 4c0-.55.45-1 1-1h3c.55 0 1 .45 1 1v2c0 .55-.45 1-1 1h-3c-.55 0-1-.45-1-1v-2z"/></svg>
              </button>
            </div>
          </div>

          <div class="tab-content">
            <div v-show="activeTab === 'leave'" class="tab-panel">
              <LeavePanel
                ref="leavePanelRef"
                :isAdmin="isAdminComputed"
                :canDistribute="canDistribute"
                :currentUser="currentUsername"
                :searchKeyword="searchKeyword"
                :viewMode="viewMode"
                :allEmployees="allEmployees"
                :approverEmployees="approverEmployees"
                :allDistributedRecords="allDistributedRecords"
                @approve="openApprovalDialog"
                @terminate="terminateProcess"
                @distribute="openDistributeDialog"
                @view-detail="viewDetail"
                @stat-update="updateStats"
              />
            </div>

            <div v-show="activeTab === 'reimbursement'" class="tab-panel">
              <ReimbursementPanel
                ref="reimbursementPanelRef"
                :isAdmin="isAdminComputed"
                :canDistribute="canDistribute"
                :currentUser="currentUsername"
                :searchKeyword="searchKeyword"
                :viewMode="viewMode"
                :allEmployees="allEmployees"
                :approverEmployees="approverEmployees"
                :allDistributedRecords="allDistributedRecords"
                @approve="openApprovalDialog"
                @terminate="terminateProcess"
                @distribute="openDistributeDialog"
                @view-detail="viewDetail"
                @stat-update="updateStats"
              />
            </div>

            <div v-show="activeTab === 'meeting'" class="tab-panel">
              <MeetingPanel
                ref="meetingPanelRef"
                :isAdmin="isAdminComputed"
                :canDistribute="canDistribute"
                :currentUser="currentUsername"
                :searchKeyword="searchKeyword"
                :viewMode="viewMode"
                :allEmployees="allEmployees"
                :approverEmployees="approverEmployees"
                :allDistributedRecords="allDistributedRecords"
                @approve="openApprovalDialog"
                @terminate="terminateProcess"
                @distribute="openDistributeDialog"
                @view-detail="viewDetail"
                @stat-update="updateStats"
              />
            </div>

            <div v-show="activeTab === 'project'" class="tab-panel">
              <OfficeSuppliesPanel
                ref="projectPanelRef"
                :isAdmin="isAdminComputed"
                :canDistribute="canDistribute"
                :currentUser="currentUsername"
                :searchKeyword="searchKeyword"
                :viewMode="viewMode"
                :allEmployees="allEmployees"
                :approverEmployees="approverEmployees"
                :allDistributedRecords="allDistributedRecords"
                @approve="openApprovalDialog"
                @terminate="terminateProcess"
                @distribute="openDistributeDialog"
                @view-detail="viewDetail"
                @stat-update="updateStats"
              />
            </div>

            <div v-show="activeTab === 'businessTrip'" class="tab-panel">
              <BusinessTripPanel
                ref="businessTripPanelRef"
                :isAdmin="isAdminComputed"
                :canDistribute="canDistribute"
                :currentUser="currentUsername"
                :searchKeyword="searchKeyword"
                :viewMode="viewMode"
                :allEmployees="allEmployees"
                :approverEmployees="approverEmployees"
                :allDistributedRecords="allDistributedRecords"
                @approve="openApprovalDialog"
                @terminate="terminateProcess"
                @distribute="openDistributeDialog"
                @view-detail="viewDetail"
                @stat-update="updateStats"
              />
            </div>

            <div v-show="activeTab === 'entertainment'" class="tab-panel">
              <EntertainmentPanel
                ref="entertainmentPanelRef"
                :isAdmin="isAdminComputed"
                :currentUser="currentUsername"
                :searchKeyword="searchKeyword"
                :viewMode="viewMode"
                :allEmployees="allEmployees"
                :approverEmployees="approverEmployees"
                :allDistributedRecords="allDistributedRecords"
                @approve="openApprovalDialog"
                @terminate="terminateProcess"
                @view-detail="viewDetail"
                @stat-update="updateStats"
              />
            </div>

            <div v-show="activeTab === 'distributed'" class="tab-panel">
              <div class="panel-header">
                <div class="panel-title">
                  <span class="title-badge">📨</span>
                  <span class="title-text">下发申请管理</span>
                </div>
                <div class="header-actions">
                  <el-button type="primary" @click="loadDistributedRecords" class="refresh-btn">
                    <el-icon><Refresh /></el-icon> 刷新
                  </el-button>
                </div>
              </div>
              <div class="panel-content">
                <div class="table-container">
                  <el-table
                    :data="distributedRecords"
                    style="width: 100%"
                    :header-cell-style="{ background: '#f5f7fa', color: '#606266', fontWeight: '600' }"
                    v-loading="loading"
                    stripe
                    fit
                  >
                    <el-table-column prop="id" label="下发编号" width="100">
                      <template #default="{ row }">
                        <span class="id-badge">#{{ row.id }}</span>
                      </template>
                    </el-table-column>
                    <el-table-column prop="applicationType" label="申请类型" width="120">
                      <template #default="{ row }">
                        <span class="type-tag" :class="row.applicationType">{{ getApplicationTypeLabel(row.applicationType) }}</span>
                      </template>
                    </el-table-column>
                    <el-table-column prop="applicationId" label="原申请编号" width="100">
                      <template #default="{ row }">
                        <span class="id-badge">#{{ row.applicationId }}</span>
                      </template>
                    </el-table-column>
                    <el-table-column prop="applicant" label="原申请人" width="120"></el-table-column>
                    <el-table-column prop="distributedBy" label="下发人" width="120"></el-table-column>
                    <el-table-column prop="distributeDate" label="下发时间" width="150"></el-table-column>
                    <el-table-column prop="status" label="处理状态" width="100">
                      <template #default="{ row }">
                        <span :class="['status-tag', getStatusClass(row.status)]">
                          <span class="status-dot"></span>
                          {{ row.status }}
                        </span>
                      </template>
                    </el-table-column>
                    <el-table-column prop="comment" label="下发说明" min-width="150">
                      <template #default="{ row }">
                        <span class="comment-text">{{ row.comment || '-' }}</span>
                      </template>
                    </el-table-column>
                    <el-table-column prop="processComment" label="处理说明" min-width="150">
                      <template #default="{ row }">
                        <span v-if="row.status === '已处理'" class="process-comment-text">{{ row.processComment || row.comment || '-' }}</span>
                        <span v-else class="no-process">-</span>
                      </template>
                    </el-table-column>
                    <el-table-column label="操作" width="150" fixed="right">
                      <template #default="{ row }">
                        <div class="action-group">
                          <el-button
                            v-if="row.status === '待处理'"
                            size="small"
                            type="primary"
                            @click="handleDistributedItem(row)"
                            class="action-btn-small"
                          >
                            处理
                          </el-button>
                          <el-button
                            size="small"
                            @click="viewDistributedDetail(row)"
                            class="view-btn"
                          >
                            详情
                          </el-button>
                        </div>
                      </template>
                    </el-table-column>
                  </el-table>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>

    <el-dialog v-model="statDetailDialogVisible" :title="statDetailTitle" width="800px" :modal="false">
      <el-table :data="statDetailRecords" style="width: 100%">
        <el-table-column prop="id" label="编号" width="80">
          <template #default="{ row }">#{{ row.id }}</template>
        </el-table-column>
        <el-table-column label="类型" width="100">
          <template #default="{ row }">
            <span class="type-tag">{{ getStatDetailTypeLabel(row._type) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="标题" min-width="150">
          <template #default="{ row }">{{ getStatDetailName(row) }}</template>
        </el-table-column>
        <el-table-column label="申请人" width="120">
          <template #default="{ row }">{{ row.applicant || row.organizer || '-' }}</template>
        </el-table-column>
        <el-table-column label="金额" width="100">
          <template #default="{ row }">
            <span v-if="row.amount || row.budget || row.estimatedCost">¥{{ row.amount || row.budget || row.estimatedCost }}</span>
            <span v-else>-</span>
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <span :class="['status-tag', getStatusClass(row.status)]">{{ getStatusText(row.status) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="提交时间" width="160">
          <template #default="{ row }">{{ row.submitDate || '-' }}</template>
        </el-table-column>
        <el-table-column label="操作" width="100">
          <template #default="{ row }">
            <el-button size="small" @click="viewDetail(row, row._type)">详情</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-dialog>

    <el-dialog v-model="approvalDialogVisible" title="审批处理" width="500px" class="custom-dialog" :modal="false">
      <div class="approval-info" v-if="currentApprovalItem">
        <div class="info-row">
          <span class="info-label">申请类型：</span>
          <span class="info-value">{{ getApprovalTypeName(currentApprovalItem.type) }}</span>
        </div>
        <div class="info-row">
          <span class="info-label">申请人：</span>
          <span class="info-value">{{ currentApprovalItem.applicant || currentApprovalItem.organizer }}</span>
        </div>
        <div class="info-row">
          <span class="info-label">申请时间：</span>
          <span class="info-value">{{ currentApprovalItem.submitDate }}</span>
        </div>
      </div>
      <el-form :model="approvalForm" ref="approvalFormRef" label-width="100px" class="custom-form">
        <el-form-item label="审批结果" prop="result">
          <el-radio-group v-model="approvalForm.result" size="large">
            <el-radio-button label="批准">
              <span class="radio-icon">✓</span> 批准
            </el-radio-button>
            <el-radio-button label="拒绝">
              <span class="radio-icon">✗</span> 拒绝
            </el-radio-button>
          </el-radio-group>
          <el-checkbox v-if="!isAdminComputed && !isCurrentUserGM" v-model="approvalForm.forwardToGM" style="margin-top: 10px;">
            ↗ 转发至总经理
          </el-checkbox>
        </el-form-item>
        <el-form-item label="审批意见">
          <el-input v-model="approvalForm.comment" type="textarea" :rows="3" placeholder="请输入审批意见（可选）"></el-input>
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="approvalDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="submitApproval">确认审批</el-button>
        </span>
      </template>
    </el-dialog>

    <el-dialog v-model="detailDialogVisible" title="申请详情" width="600px" class="custom-dialog" :modal="false">
      <div class="detail-content" v-if="currentDetailItem">
        <div class="detail-header">
          <span class="detail-id">申请编号：#{{ currentDetailItem.id }}</span>
          <span :class="['detail-status', getStatusClass(currentDetailItem.status)]">{{ getStatusText(currentDetailItem.status) }}</span>
        </div>
        <div class="detail-body">
          <div class="detail-section" v-for="(value, key) in getDetailFields(currentDetailItem, currentDetailType, currentUsername)" :key="key">
            <div class="detail-row">
              <span class="detail-label">{{ key }}</span>
              <span class="detail-value">{{ value }}</span>
            </div>
          </div>
        </div>
        <div class="detail-footer">
          <div class="detail-section" v-if="currentDetailItem.result">
            <div class="detail-row">
              <span class="detail-label">审批流程</span>
              <span class="detail-value result-chain">{{ currentDetailItem.result }}</span>
            </div>
          </div>
          <div class="comment-box" v-if="currentDetailItem.comment">
            <span class="comment-label">审批意见：</span>
            <span class="comment-content" style="white-space: pre-line;">{{ currentDetailItem.comment }}</span>
          </div>
        </div>
      </div>
    </el-dialog>

    <el-dialog v-model="distributeDialogVisible" title="申请下发" width="500px" class="custom-dialog" :modal="false">
      <div class="distribute-content" v-if="currentDistributeItem">
        <div class="distribute-info">
          <p><strong>申请编号：</strong>#{{ currentDistributeItem.id }}</p>
          <p><strong>申请类型：</strong>
            <span v-if="currentDistributeType === 'leave'">请假申请</span>
            <span v-else-if="currentDistributeType === 'reimbursement'">报销申请</span>
            <span v-else-if="currentDistributeType === 'meeting'">会议申请</span>
            <span v-else-if="currentDistributeType === 'project'">项目申请</span>
            <span v-else-if="currentDistributeType === 'businessTrip'">出差申请</span>
            <span v-else-if="currentDistributeType === 'entertainment'">业务招待费</span>
          </p>
          <p><strong>申请人：</strong>{{ extractRealName(currentDistributeItem.applicant || currentDistributeItem.organizer) }}</p>
        </div>
        <el-form label-width="100px" class="distribute-form">
        <el-form-item label="下发对象">
          <el-select
              v-model="distributeTarget"
              placeholder="请选择下发对象"
              style="width: 100%"
              filterable
              multiple
              collapse-tags
              collapse-tags-tooltip
              :max-collapse-tags="3"
            >
              <el-option
                v-for="emp in distributeTargetEmployees"
                :key="emp.id"
                :label="extractRealName(emp.name) + ' (' + emp.department + ')'"
                :value="extractRealName(emp.name)"
              />
            </el-select>
          </el-form-item>
          <el-form-item label="下发说明">
            <el-input v-model="distributeComment" type="textarea" :rows="3" placeholder="请输入下发说明（可选）" />
          </el-form-item>
        </el-form>
      </div>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="distributeDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="handleDistribute">确认下发</el-button>
        </span>
      </template>
    </el-dialog>

    <el-dialog v-model="processDialogVisible" title="处理申请" width="550px" class="custom-dialog" :modal="false">
      <div class="process-content" v-if="currentProcessItem">
        <div class="process-info">
          <div class="info-row">
            <span class="info-label">下发编号：</span>
            <span class="info-value">#{{ currentProcessItem.id }}</span>
          </div>
          <div class="info-row">
            <span class="info-label">申请类型：</span>
            <span class="info-value">{{ getApplicationTypeLabel(currentProcessItem.applicationType) }}</span>
          </div>
          <div class="info-row">
            <span class="info-label">原申请编号：</span>
            <span class="info-value">#{{ currentProcessItem.applicationId }}</span>
          </div>
          <div class="info-row">
            <span class="info-label">原申请人：</span>
            <span class="info-value">{{ currentProcessItem.applicant }}</span>
          </div>
          <div class="info-row">
            <span class="info-label">下发人：</span>
            <span class="info-value">{{ currentProcessItem.distributedBy }}</span>
          </div>
          <div class="info-row">
            <span class="info-label">下发说明：</span>
            <span class="info-value">{{ currentProcessItem.comment || '-' }}</span>
          </div>
        </div>
      </div>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="processDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="submitProcess">确认处理</el-button>
        </span>
      </template>
    </el-dialog>

    <footer class="footer">
      <div class="footer-content">
        <p>© 2026 企业管理系统 | 审批中心</p>
      </div>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch, nextTick } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  getEmployees,
  getLeaveApplications,
  updateLeaveApplication,
  getReimbursements,
  updateReimbursement,
  getMeetings,
  updateMeeting,
  getProjects,
  updateProject,
  deleteProject,
  getBusinessTrips,
  updateBusinessTrip,
  getDistributedRecords,
  getAllDistributedRecords,
  addDistributedRecord,
  updateDistributedRecord,
  getEntertainmentExpenses,
  updateEntertainmentExpense
} from '../services/api'
import {
  extractRealName,
  formatDate,
  getStatusClass,
  getStatusText,
  getApprovalTypeName,
  getApplicationTypeLabel,
  getDetailFields,
  getStatDetailTypeLabel,
  getStatDetailName
} from '../utils/oaWorkflowUtils'

import LeavePanel from '../components/LeavePanel.vue'
import ReimbursementPanel from '../components/ReimbursementPanel.vue'
import MeetingPanel from '../components/MeetingPanel.vue'
import OfficeSuppliesPanel from '../components/OfficeSuppliesPanel.vue'
import BusinessTripPanel from '../components/BusinessTripPanel.vue'
import EntertainmentPanel from '../components/EntertainmentPanel.vue'

const router = useRouter()
const route = useRoute()

const loading = ref(false)
const activeTab = ref('project')
const viewMode = ref('list')
const searchKeyword = ref('')

const leavePanelRef = ref()
const reimbursementPanelRef = ref()
const meetingPanelRef = ref()
const projectPanelRef = ref()
const businessTripPanelRef = ref()
const entertainmentPanelRef = ref()

const allEmployees = ref<any[]>([])
const allDistributedRecords = ref<any[]>([])

const approverEmployees = computed(() => {
  return allEmployees.value.filter((emp: any) => {
    const position = emp.position || ''
    return position.includes('总经理') || position.includes('总监') || position.includes('经理')
  })
})

const currentUsername = computed(() => {
  return localStorage.getItem('username') || '当前用户'
})

const isAdminComputed = computed(() => {
  const role = localStorage.getItem('role')
  const username = localStorage.getItem('username')
  const adminRoles = ['admin', 'gm', 'ceo', 'general_manager', '系统管理员']
  const isAdminRole = adminRoles.includes(role?.toLowerCase() || '')
  const isAdminName = username === '总经理' || username?.includes('admin')
  return isAdminRole || isAdminName
})

const isCurrentUserGM = computed(() => {
  const gm = allEmployees.value.find((emp: any) => (emp.position || '').includes('总经理'))
  return gm && extractRealName(currentUsername.value) === extractRealName(gm.name)
})

const isBusinessCenterManager = computed(() => {
  const currentName = extractRealName(currentUsername.value)
  return allEmployees.value.some((emp: any) =>
    extractRealName(emp.name) === currentName &&
    (emp.position || '').includes('业务中心经理')
  )
})

const canDistribute = computed(() => isAdminComputed.value || isCurrentUserGM.value || isBusinessCenterManager.value)

const distributeTargetEmployees = computed(() => {
  return allEmployees.value.filter((emp: any) => {
    const pos = emp.position || ''
    const name = extractRealName(emp.name)
    return !pos.includes('总经理') && !name.includes('李智鑫')
  })
})

const approvalStats = ref([
  { key: 'pending', label: '待审批', value: 0, gradient: 'linear-gradient(135deg, #FF9800, #FFC107)', icon: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z' },
  { key: 'approved', label: '已批准', value: 0, gradient: 'linear-gradient(135deg, #4CAF50, #8BC34A)', icon: 'M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z' },
  { key: 'rejected', label: '已拒绝', value: 0, gradient: 'linear-gradient(135deg, #f44336, #ff5722)', icon: 'M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z' },
  { key: 'total', label: '总申请', value: 0, gradient: 'linear-gradient(135deg, #2196F3, #03A9F4)', icon: 'M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z' }
])

const leaveRecords = ref<any[]>([])
const reimbursementRecords = ref<any[]>([])
const meetingRecords = ref<any[]>([])
const projectRecords = ref<any[]>([])
const businessTripRecords = ref<any[]>([])
const allLeaveRecords = ref<any[]>([])
const allReimbursementRecords = ref<any[]>([])
const allMeetingRecords = ref<any[]>([])
const allProjectRecords = ref<any[]>([])
const allBusinessTripRecords = ref<any[]>([])
const entertainmentRecords = ref<any[]>([])
const allEntertainmentRecords = ref<any[]>([])
const distributedRecords = ref<any[]>([])

const pendingLeaveCount = computed(() => leaveRecords.value.length)
const pendingReimbursementCount = computed(() => reimbursementRecords.value.length)
const pendingBusinessTripCount = computed(() => businessTripRecords.value.length)
const pendingEntertainmentCount = computed(() => entertainmentRecords.value.length)
const pendingDistributedCount = computed(() => distributedRecords.value.length)

const tabs = computed(() => {
  const allMeetings = [...meetingRecords.value, ...allMeetingRecords.value]
  const uniqueMeetings = allMeetings.filter((item, index, self) =>
    index === self.findIndex(t => t.id === item.id)
  )

  const allProjects = [...projectRecords.value, ...allProjectRecords.value]
  const uniqueProjects = allProjects.filter((item, index, self) =>
    index === self.findIndex(t => t.id === item.id)
  )

  const baseTabs = [
    { name: 'leave', label: '请假申请', icon: '📝', badge: pendingLeaveCount.value },
    { name: 'reimbursement', label: '报销管理', icon: '💰', badge: pendingReimbursementCount.value },
    { name: 'meeting', label: '会议管理', icon: '📅', badge: uniqueMeetings.length },
    { name: 'project', label: '项目申请', icon: '📊', badge: uniqueProjects.length },
    { name: 'businessTrip', label: '出差申请', icon: '✈️', badge: pendingBusinessTripCount.value },
    { name: 'entertainment', label: '业务招待费', icon: '🍽️', badge: pendingEntertainmentCount.value }
  ]

  if (!isAdminComputed.value) {
    baseTabs.push({ name: 'distributed', label: '下发管理', icon: '📨', badge: pendingDistributedCount.value })
  }

  return baseTabs
})

const updateStats = () => {
  const allRecords = [
    ...leaveRecords.value,
    ...reimbursementRecords.value,
    ...meetingRecords.value,
    ...projectRecords.value,
    ...businessTripRecords.value,
    ...entertainmentRecords.value
  ]

  const pendingStat = approvalStats.value.find(s => s.key === 'pending')
  if (pendingStat) pendingStat.value = allRecords.filter(r => r.status === '审批中' || r.status === 'pending' || r.status === '待审核' || r.status === '待审批').length

  const approvedStat = approvalStats.value.find(s => s.key === 'approved')
  if (approvedStat) approvedStat.value = allRecords.filter(r => r.status === '已批准' || r.status === 'approved').length

  const rejectedStat = approvalStats.value.find(s => s.key === 'rejected')
  if (rejectedStat) rejectedStat.value = allRecords.filter(r => r.status === '已拒绝' || r.status === '拒绝' || r.status === 'rejected' || r.status === '已取消').length

  const totalStat = approvalStats.value.find(s => s.key === 'total')
  if (totalStat) totalStat.value = allRecords.length
}

const statDetailDialogVisible = ref(false)
const statDetailTitle = ref('')
const statDetailRecords = ref<any[]>([])

const openStatDetail = (statKey: string) => {
  const allRecords = [
    ...(isAdminComputed.value ? allLeaveRecords.value : leaveRecords.value),
    ...(isAdminComputed.value ? allReimbursementRecords.value : reimbursementRecords.value),
    ...meetingRecords.value,
    ...(isAdminComputed.value ? allProjectRecords.value : projectRecords.value),
    ...(isAdminComputed.value ? allBusinessTripRecords.value : businessTripRecords.value),
    ...(isAdminComputed.value ? allEntertainmentRecords.value : entertainmentRecords.value)
  ].map(record => ({
    ...record,
    _type: record.projectName ? 'project' : record.reimburseType ? 'reimbursement' : record.leaveType ? 'leave' : record.destination ? 'businessTrip' : record.guestName ? 'entertainment' : 'meeting'
  }))

  let filteredRecords: any[] = []
  switch (statKey) {
    case 'pending':
      statDetailTitle.value = '待审批列表'
      filteredRecords = allRecords.filter(r => r.status === '审批中' || r.status === 'pending' || r.status === '待审核' || r.status === '待审批')
      break
    case 'approved':
      statDetailTitle.value = '已批准列表'
      filteredRecords = allRecords.filter(r => r.status === '已批准' || r.status === 'approved')
      break
    case 'rejected':
      statDetailTitle.value = '已拒绝列表'
      filteredRecords = allRecords.filter(r => r.status === '已拒绝' || r.status === '拒绝' || r.status === 'rejected')
      break
    case 'total':
      statDetailTitle.value = '所有申请列表'
      filteredRecords = allRecords
      break
    default:
      return
  }

  statDetailRecords.value = filteredRecords
  statDetailDialogVisible.value = true
}

const approvalDialogVisible = ref(false)
const currentApprovalItem = ref<any>(null)
const approvalForm = ref({ id: '', type: '', comment: '', result: '', forwardToGM: false })
const approvalFormRef = ref()

const openApprovalDialog = (row: any, type: string) => {
  currentApprovalItem.value = { ...row, type }
  approvalForm.value = { id: row.id, type, comment: '', result: '', forwardToGM: false }
  approvalDialogVisible.value = true
}

const submitApproval = async () => {
  if (!approvalForm.value.result) {
    ElMessage.warning('请选择审批结果')
    return
  }
  try {
    let response: any
    const data: any = { comment: approvalForm.value.comment, result: approvalForm.value.result, operator: currentUsername.value }
    if (approvalForm.value.forwardToGM) {
      const gm = allEmployees.value.find((emp: any) => (emp.position || '').includes('总经理'))
      data.forwardTo = gm?.name || '总经理'
    }
    switch (approvalForm.value.type) {
      case 'leave':
        response = await updateLeaveApplication(approvalForm.value.id, data)
        break
      case 'reimbursement':
        response = await updateReimbursement(approvalForm.value.id, data)
        break
      case 'meeting':
        response = await updateMeeting(approvalForm.value.id, data)
        break
      case 'project':
        response = await updateProject(approvalForm.value.id, data)
        break
      case 'businessTrip':
        response = await updateBusinessTrip(approvalForm.value.id, data)
        break
      case 'entertainment':
        response = await updateEntertainmentExpense(approvalForm.value.id, data)
        break
    }
    if (response?.success) {
      ElMessage.success(approvalForm.value.forwardToGM ? '审批完成，已转发至总经理' : '审批已完成')
      approvalDialogVisible.value = false
      await refreshAllData()
    } else {
      ElMessage.error(response?.message || '审批失败')
    }
  } catch (error) {
    console.error('审批失败:', error)
    ElMessage.error('审批失败')
  }
}

const detailDialogVisible = ref(false)
const currentDetailItem = ref<any>(null)
const currentDetailType = ref('')

const viewDetail = (row: any, type: string) => {
  currentDetailItem.value = row
  currentDetailType.value = type
  detailDialogVisible.value = true
}

const distributeDialogVisible = ref(false)
const currentDistributeItem = ref<any>(null)
const currentDistributeType = ref('')
const distributeTarget = ref<string[]>([])
const distributeComment = ref('')

const openDistributeDialog = (row: any, type: string) => {
  currentDistributeItem.value = row
  currentDistributeType.value = type
  distributeTarget.value = []
  distributeComment.value = ''
  distributeDialogVisible.value = true
}

const handleDistribute = async () => {
  if (!distributeTarget.value || distributeTarget.value.length === 0) {
    ElMessage.warning('请选择下发对象')
    return
  }
  try {
    const uniqueTargets = [...new Set(distributeTarget.value)]

    // 过滤掉已下发过的对象
    const alreadyDistributed = allDistributedRecords.value
      .filter(r => r.applicationId === currentDistributeItem.value.id)
      .map(r => r.targetUser)
    const validTargets = uniqueTargets.filter(t => !alreadyDistributed.includes(t))

    if (validTargets.length === 0) {
      ElMessage.warning('所选对象均已收到过该下发，不能重复下发')
      return
    }
    if (validTargets.length < uniqueTargets.length) {
      const skipped = uniqueTargets.filter(t => !validTargets.includes(t))
      ElMessage.warning(`${skipped.join('、')} 已收到过该下发，已自动跳过`)
    }

    const results = []
    for (const target of validTargets) {
      const distributeData = {
        applicationId: currentDistributeItem.value.id,
        applicationType: currentDistributeType.value,
        applicant: extractRealName(currentDistributeItem.value.applicant || currentDistributeItem.value.organizer || ''),
        distributedBy: extractRealName(currentUsername.value),
        targetUser: target,
        comment: distributeComment.value || '',
        status: '待处理'
      }
      const response = await addDistributedRecord(distributeData)
      results.push(response)
    }
    const allSuccess = results.every(r => r.success)
    if (allSuccess) {
      ElMessage.success(`已成功下发给 ${validTargets.join('、')}`)
      distributeDialogVisible.value = false
      if (isAdminComputed.value) {
        await loadAllDistributedRecords()
      }
      await refreshAllData()
    } else {
      ElMessage.error('部分下发失败，请检查')
    }
  } catch (error: any) {
    console.error('下发失败:', error)
    ElMessage.error('下发失败: ' + (error.message || '未知错误'))
  }
}

const processDialogVisible = ref(false)
const currentProcessItem = ref<any>(null)
const processContent = ref('')

const handleDistributedItem = (row: any) => {
  currentProcessItem.value = row
  processContent.value = ''
  processDialogVisible.value = true
}

const submitProcess = async () => {
  try {
    const response = await updateDistributedRecord(currentProcessItem.value.id, {
      status: '已处理'
    })
    if (response.success) {
      const index = distributedRecords.value.findIndex(r => r.id === currentProcessItem.value.id)
      if (index !== -1) {
        distributedRecords.value[index].status = '已处理'
      }
      ElMessage.success('处理成功')
      processDialogVisible.value = false
    } else {
      ElMessage.error(response.message || '处理失败')
    }
  } catch (error) {
    console.error('处理下发记录失败:', error)
    ElMessage.error('处理失败')
  }
}

const viewDistributedDetail = (row: any) => {
  ElMessageBox.alert(`
    <div style="text-align: left;">
      <p><strong>下发编号：</strong>#${row.id}</p>
      <p><strong>申请类型：</strong>${getApplicationTypeLabel(row.applicationType)}</p>
      <p><strong>原申请编号：</strong>#${row.applicationId}</p>
      <p><strong>原申请人：</strong>${row.applicant}</p>
      <p><strong>下发人：</strong>${row.distributedBy}</p>
      <p><strong>下发时间：</strong>${row.distributeDate}</p>
      <p><strong>处理状态：</strong>${row.status}</p>
      <p><strong>下发说明：</strong>${row.comment || '-'}</p>
    </div>
  `, '下发详情', {
    dangerouslyUseHTMLString: true,
    confirmButtonText: '确定'
  })
}

const terminateProcess = async (row: any, type: string) => {
  try {
    await ElMessageBox.confirm(
      '确定要强制终止该审批流程吗？此操作不可恢复！',
      '⚠️ 警告：终止审批流程',
      {
        confirmButtonText: '确定终止',
        cancelButtonText: '取消',
        type: 'error',
        confirmButtonClass: 'el-button--danger'
      }
    )
    let response: any
    const data = {
      result: '已终止',
      comment: `管理员[${currentUsername.value}]强制终止流程`,
      operator: currentUsername.value
    }
    switch (type) {
      case 'leave':
        response = await updateLeaveApplication(row.id, data)
        break
      case 'reimbursement':
        response = await updateReimbursement(row.id, data)
        break
      case 'meeting':
        response = await updateMeeting(row.id, data)
        break
      case 'project':
        response = await updateProject(row.id, data)
        break
      case 'businessTrip':
        response = await updateBusinessTrip(row.id, data)
        break
      case 'entertainment':
        response = await updateEntertainmentExpense(row.id, data)
        break
    }
    if (response?.success) {
      ElMessage.success('流程已强制终止')
      await refreshAllData()
    } else {
      ElMessage.error(response?.message || '终止失败')
    }
  } catch (error: any) {
    if (error !== 'cancel') {
      console.error('终止流程失败:', error)
      ElMessage.error('终止流程失败')
    }
  }
}

const loadEmployees = async () => {
  try {
    const response = await getEmployees()
    if (response.success) {
      allEmployees.value = response.data
    }
  } catch (error) {
    console.error('获取员工数据失败:', error)
  }
}

const filterUserRecords = (records: any[]) => {
  const currentName = extractRealName(currentUsername.value)
  return records.filter((item: any) =>
    extractRealName(item.applicant || item.organizer || item.applicant_name) === currentName ||
    extractRealName(item.approver) === currentName ||
    (item.result && item.result.includes(currentName + ':'))
  )
}

const loadLeaveRecords = async () => {
  try {
    const response = await getLeaveApplications()
    if (response.success) {
      leaveRecords.value = filterUserRecords(response.data)
        .map((item: any) => ({ ...item, submitDate: item.createdAt?.substring(0, 10) || '' }))
    }
  } catch (error) {
    console.error('获取请假记录失败:', error)
  }
}

const loadReimbursementRecords = async () => {
  try {
    const response = await getReimbursements()
    if (response.success) {
      reimbursementRecords.value = filterUserRecords(response.data)
        .map((item: any) => ({ ...item, submitDate: item.createdAt?.substring(0, 10) || '' }))
    }
  } catch (error) {
    console.error('获取报销记录失败:', error)
  }
}

const loadMeetingRecords = async () => {
  try {
    const response = await getMeetings()
    if (response.success) {
      meetingRecords.value = filterUserRecords(response.data)
        .map((item: any) => ({ ...item, submitDate: item.createdAt?.substring(0, 10) || '' }))
    }
  } catch (error) {
    console.error('获取会议记录失败:', error)
  }
}

const loadProjectRecords = async () => {
  try {
    const response = await getProjects()
    if (response.success && response.data && response.data.list) {
      projectRecords.value = filterUserRecords(response.data.list.map((item: any) => ({
        ...item,
        applicant: item.applicant_name,
        projectName: item.project_name || '',
        projectType: item.project_type || '',
        submitDate: item.created_at?.substring(0, 10) || ''
      })))
    }
  } catch (error) {
    console.error('获取项目记录失败:', error)
  }
}

const loadBusinessTripRecords = async () => {
  try {
    const response = await getBusinessTrips()
    if (response.success && response.data && response.data.list) {
      businessTripRecords.value = filterUserRecords(response.data.list.map((item: any) => ({
        ...item,
        applicant: item.applicant_name,
        destination: item.destination || '',
        tripType: item.trip_type || '',
        submitDate: item.created_at?.substring(0, 10) || '',
        estimatedCost: item.estimated_cost || item.estimatedCost || 0
      })))
    }
  } catch (error) {
    console.error('获取出差记录失败:', error)
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
    }
  } catch (error) {
    console.error('获取所有请假记录失败:', error)
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
    }
  } catch (error) {
    console.error('获取所有报销记录失败:', error)
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
    }
  } catch (error) {
    console.error('获取所有会议记录失败:', error)
  }
}

const loadAllProjectRecords = async () => {
  try {
    const response = await getProjects()
    if (response.success && response.data && response.data.list) {
      allProjectRecords.value = response.data.list.map((item: any) => ({
        ...item,
        applicant: item.applicant_name,
        projectName: item.project_name || '',
        projectType: item.project_type || '',
        submitDate: item.created_at?.substring(0, 10) || '',
        distributedUsers: []
      }))
    }
  } catch (error) {
    console.error('获取所有项目记录失败:', error)
  }
}

const loadAllBusinessTripRecords = async () => {
  try {
    const response = await getBusinessTrips()
    if (response.success && response.data && response.data.list) {
      allBusinessTripRecords.value = response.data.list.map((item: any) => ({
        ...item,
        applicant: item.applicant_name,
        destination: item.destination || '',
        tripType: item.trip_type || '',
        submitDate: item.created_at?.substring(0, 10) || '',
        estimatedCost: item.estimated_cost || item.estimatedCost || 0,
        distributedUsers: []
      }))
    }
  } catch (error) {
    console.error('获取所有出差记录失败:', error)
  }
}

const loadEntertainmentRecords = async () => {
  try {
    const response = await getEntertainmentExpenses()
    if (response.success) {
      entertainmentRecords.value = filterUserRecords(response.data)
        .map((item: any) => ({ ...item, submitDate: item.createdAt?.substring(0, 10) || '' }))
    }
  } catch (error) {
    console.error('获取招待费记录失败:', error)
  }
}

const loadAllEntertainmentRecords = async () => {
  try {
    const response = await getEntertainmentExpenses()
    if (response.success) {
      allEntertainmentRecords.value = response.data.map((item: any) => ({
        ...item,
        submitDate: item.createdAt?.substring(0, 10) || '',
        distributedUsers: []
      }))
    }
  } catch (error) {
    console.error('获取所有招待费记录失败:', error)
  }
}

const loadAllDistributedRecords = async () => {
  try {
    const response = await getAllDistributedRecords()
    if (response.success) {
      allDistributedRecords.value = response.data || []
    }
  } catch (error) {
    console.error('获取所有下发记录失败:', error)
  }
}

const loadDistributedRecords = async () => {
  try {
    loading.value = true
    const realUsername = extractRealName(currentUsername.value)
    const response = await getDistributedRecords(realUsername)
    if (response.success) {
      distributedRecords.value = response.data.map((record: any) => ({
        ...record,
        distributeDate: record.createdAt ? formatDate(record.createdAt, true) : ''
      }))
    } else {
      distributedRecords.value = []
    }
  } catch (error) {
    console.error('获取下发记录失败:', error)
    distributedRecords.value = []
  } finally {
    loading.value = false
  }
}

const loadNonAdminData = async () => {
  await Promise.all([
    loadLeaveRecords(),
    loadReimbursementRecords(),
    loadMeetingRecords(),
    loadProjectRecords(),
    loadBusinessTripRecords(),
    loadEntertainmentRecords()
  ])
}

const loadAdminData = async () => {
  await loadAllDistributedRecords()
  await Promise.all([
    loadAllLeaveRecords(),
    loadAllReimbursementRecords(),
    loadAllMeetingRecords(),
    loadAllProjectRecords(),
    loadAllBusinessTripRecords(),
    loadAllEntertainmentRecords()
  ])
}

const refreshAllData = async () => {
  await loadNonAdminData()
  if (isAdminComputed.value) {
    await loadAdminData()
  }
  updateStats()
  await loadDistributedRecords()
  await Promise.all([
    leavePanelRef.value?.fetchData(),
    reimbursementPanelRef.value?.fetchData(),
    meetingPanelRef.value?.fetchData(),
    projectPanelRef.value?.fetchData(),
    businessTripPanelRef.value?.fetchData(),
    entertainmentPanelRef.value?.fetchData()
  ])
}

const handleSearch = () => {}
const handleBack = () => { router.back() }

watch(() => route.query, (query) => {
  if (query.tab) {
    const validTabs = ['leave', 'reimbursement', 'meeting', 'project', 'businessTrip', 'entertainment', 'distributed']
    if (validTabs.includes(query.tab as string)) {
      activeTab.value = query.tab as string
    }
  }
  if (query.action === 'create' && query.type) {
    const type = query.type as string
    if (type === 'leave') {
      router.replace('/oa/leave-apply')
    } else if (type === 'reimbursement') {
      router.replace('/oa/reimbursement-apply')
    } else if (type === 'meeting') {
      router.replace('/oa/meeting-apply')
    }
  }
}, { immediate: true })

onMounted(async () => {
  await loadEmployees()
  await refreshAllData()
  await nextTick()
  if (!route.query.tab) {
    const tabWithData = tabs.value.find(t => t.badge > 0)
    if (tabWithData) {
      activeTab.value = tabWithData.name
    }
  }
})
</script>

<style scoped>
.approval-center-container {
  width: 100%;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  position: relative;
  overflow: hidden;
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
  position: relative;
  z-index: 100;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
}
.logo {
  position: relative;
  display: flex;
  align-items: center;
}
.logo-text {
  font-size: 1.5rem;
  font-weight: bold;
  color: #333;
  text-shadow: 0 0 10px rgba(100, 149, 237, 0.3);
}
.logo-glow {
  position: absolute;
  top: -50%;
  left: -20%;
  width: 140%;
  height: 200%;
  background: linear-gradient(45deg, transparent, rgba(100, 149, 237, 0.3), transparent);
  filter: blur(20px);
  animation: glow 3s ease-in-out infinite;
}
@keyframes glow {
  0%, 100% { opacity: 0.3; }
  50% { opacity: 0.6; }
}
.nav {
  display: flex;
  gap: 1rem;
  align-items: center;
  justify-content: flex-end;
  width: 100%;
  max-width: 600px;
}
.nav-item {
  color: rgba(51, 51, 51, 0.8);
  text-decoration: none;
  padding: 0.5rem 1rem;
  border-radius: 6px;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
  border: none;
  background: none;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
}
.nav-item:hover,
.nav-item.active {
  color: #333;
  background: rgba(100, 149, 237, 0.2);
  box-shadow: 0 0 15px rgba(100, 149, 237, 0.3);
}
.logout-btn {
  background: rgba(244, 67, 54, 0.1);
  color: #d32f2f;
  border: 1px solid rgba(244, 67, 54, 0.3);
  border-radius: 6px;
  padding: 0.5rem 1rem;
  cursor: pointer;
  transition: all 0.3s ease;
}
.logout-btn:hover {
  background: rgba(244, 67, 54, 0.2);
  box-shadow: 0 0 15px rgba(244, 67, 54, 0.2);
}
.main-content {
  flex: 1;
  overflow-y: auto;
  padding: 2rem;
  position: relative;
  z-index: 1;
}
.content-wrapper {
  max-width: 1400px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}
.header-left {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.section-title {
  font-size: 1.5rem;
  font-weight: 600;
  color: #333;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
.title-icon {
  width: 36px;
  height: 36px;
  background: linear-gradient(45deg, #6495ED, #87CEEB);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  box-shadow: 0 4px 15px rgba(100, 149, 237, 0.3);
}
.title-icon svg {
  width: 20px;
  height: 20px;
}
.page-subtitle {
  color: rgba(51, 51, 51, 0.6);
  font-size: 0.9rem;
  margin: 0;
}
.header-right {
  display: flex;
  align-items: center;
  gap: 1rem;
}
.search-box {
  width: 280px;
}
.stats-bar {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1rem;
}
.stat-item {
  background: rgba(255, 255, 255, 0.9);
  border-radius: 12px;
  padding: 1.25rem;
  display: flex;
  align-items: center;
  gap: 1rem;
  backdrop-filter: blur(5px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  transition: all 0.3s ease;
  cursor: pointer;
}
.stat-item:hover {
  transform: translateY(-3px);
  box-shadow: 0 8px 25px rgba(100, 149, 237, 0.15);
}
.stat-icon-wrapper {
  width: 48px;
  height: 48px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
}
.stat-icon-wrapper svg {
  width: 24px;
  height: 24px;
}
.stat-content {
  display: flex;
  flex-direction: column;
}
.stat-number {
  font-size: 1.5rem;
  font-weight: 700;
  color: #333;
  line-height: 1;
}
.stat-name {
  font-size: 0.85rem;
  color: rgba(51, 51, 51, 0.6);
  margin-top: 0.25rem;
}
.stat-arrow {
  margin-left: auto;
  color: rgba(51, 51, 51, 0.3);
}
.stat-arrow svg {
  width: 20px;
  height: 20px;
}
.tabs-container {
  background: rgba(255, 255, 255, 0.9);
  border: 1px solid rgba(100, 149, 237, 0.2);
  border-radius: 16px;
  overflow: hidden;
  backdrop-filter: blur(5px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
}
.tabs-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.5rem;
  border-bottom: 1px solid rgba(100, 149, 237, 0.1);
  background: rgba(100, 149, 237, 0.05);
}
.custom-tabs {
  display: flex;
  gap: 0.5rem;
}
.tab-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.6rem 1.25rem;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
  font-size: 0.9rem;
  color: rgba(51, 51, 51, 0.7);
  background: rgba(255, 255, 255, 0.5);
  border: 1px solid transparent;
}
.tab-item:hover {
  background: rgba(255, 255, 255, 0.8);
  border-color: rgba(100, 149, 237, 0.3);
}
.tab-item.active {
  background: linear-gradient(45deg, #6495ED, #87CEEB);
  color: #fff;
  box-shadow: 0 4px 15px rgba(100, 149, 237, 0.3);
}
.tab-icon {
  font-size: 1.1rem;
}
.tab-badge {
  background: #FF5252;
  color: #fff;
  font-size: 0.7rem;
  padding: 0.1rem 0.5rem;
  border-radius: 10px;
  font-weight: 600;
}
.view-toggle {
  display: flex;
  gap: 0.5rem;
}
.toggle-btn {
  width: 36px;
  height: 36px;
  border: 1px solid rgba(100, 149, 237, 0.3);
  background: rgba(255, 255, 255, 0.8);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.3s ease;
  color: rgba(51, 51, 51, 0.6);
}
.toggle-btn svg {
  width: 18px;
  height: 18px;
}
.toggle-btn:hover {
  border-color: rgba(100, 149, 237, 0.5);
  color: #6495ED;
}
.toggle-btn.active {
  background: linear-gradient(45deg, #6495ED, #87CEEB);
  border-color: transparent;
  color: #fff;
}
.tab-content {
  padding: 1.5rem;
}
.tab-panel {
  animation: fadeIn 0.3s ease;
}
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
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
.status-tag.status-pending-blue {
  background: rgba(33, 150, 243, 0.1);
  color: #2196F3;
  border: 1px solid rgba(33, 150, 243, 0.3);
}
.status-tag.status-processed-green {
  background: rgba(76, 175, 80, 0.1);
  color: #4CAF50;
  border: 1px solid rgba(76, 175, 80, 0.3);
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
.header-actions {
  display: flex;
  gap: 0.5rem;
}
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
.comment-text {
  color: #666;
  font-size: 0.9rem;
}
.process-comment-text {
  color: #4CAF50;
  font-size: 0.9rem;
  font-weight: 500;
}
.no-process {
  color: #999;
  font-size: 0.9rem;
}
.approval-info {
  background: rgba(100, 149, 237, 0.05);
  border-radius: 8px;
  padding: 1rem;
  margin-bottom: 1.5rem;
}
.info-row {
  display: flex;
  margin-bottom: 0.5rem;
}
.info-row:last-child {
  margin-bottom: 0;
}
.info-label {
  width: 80px;
  color: rgba(51, 51, 51, 0.6);
  font-size: 0.9rem;
}
.info-value {
  flex: 1;
  color: #333;
  font-weight: 500;
}
.radio-icon {
  margin-right: 0.25rem;
}
.detail-content {
  padding: 0.5rem;
}
.detail-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  padding-bottom: 1rem;
  border-bottom: 2px solid rgba(100, 149, 237, 0.1);
}
.detail-id {
  font-size: 1rem;
  color: #6495ED;
  font-weight: 600;
}
.detail-status {
  padding: 0.4rem 1rem;
  border-radius: 20px;
  font-size: 0.85rem;
  font-weight: 500;
}
.detail-body {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}
.detail-row {
  display: flex;
  padding: 0.75rem;
  background: rgba(100, 149, 237, 0.03);
  border-radius: 8px;
}
.detail-label {
  width: 100px;
  color: rgba(51, 51, 51, 0.6);
  font-size: 0.9rem;
}
.detail-value {
  flex: 1;
  color: #333;
  font-weight: 500;
}
.detail-footer {
  margin-top: 1.5rem;
  padding-top: 1rem;
  border-top: 1px solid rgba(100, 149, 237, 0.1);
}
.comment-box {
  background: rgba(255, 152, 0, 0.05);
  border: 1px solid rgba(255, 152, 0, 0.2);
  border-radius: 8px;
  padding: 1rem;
}
.comment-label {
  color: #FF9800;
  font-weight: 600;
  margin-right: 0.5rem;
}
.comment-content {
  color: #333;
}
.process-content {
  padding: 0.5rem;
}
.process-info {
  background: rgba(100, 149, 237, 0.05);
  border-radius: 8px;
  padding: 1rem;
  margin-bottom: 1.5rem;
}
.process-info .info-row {
  display: flex;
  margin-bottom: 0.5rem;
}
.process-info .info-row:last-child {
  margin-bottom: 0;
}
.process-info .info-label {
  width: 100px;
  color: rgba(51, 51, 51, 0.6);
  font-size: 0.9rem;
  flex-shrink: 0;
}
.process-info .info-value {
  flex: 1;
  color: #333;
  font-weight: 500;
}
.process-form {
  margin-top: 1rem;
}
.footer {
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(10px);
  border-top: 1px solid rgba(100, 149, 237, 0.2);
  padding: 1rem 2rem;
  text-align: center;
  color: rgba(51, 51, 51, 0.6);
  position: relative;
  z-index: 100;
  box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.05);
}
.footer-content {
  display: flex;
  justify-content: center;
  align-items: center;
}
.main-content::-webkit-scrollbar {
  width: 8px;
}
.main-content::-webkit-scrollbar-track {
  background: rgba(240, 248, 255, 0.6);
  border-radius: 4px;
}
.main-content::-webkit-scrollbar-thumb {
  background: rgba(100, 149, 237, 0.4);
  border-radius: 4px;
}
.main-content::-webkit-scrollbar-thumb:hover {
  background: rgba(100, 149, 237, 0.6);
}
@media (max-width: 1200px) {
  .stats-bar {
    grid-template-columns: repeat(2, 1fr);
  }
}
@media (max-width: 768px) {
  .page-header {
    flex-direction: column;
    gap: 1rem;
  }
  .search-box {
    width: 100%;
  }
  .stats-bar {
    grid-template-columns: repeat(2, 1fr);
  }
  .tabs-header {
    flex-direction: column;
    gap: 1rem;
  }
  .custom-tabs {
    width: 100%;
    overflow-x: auto;
  }
}
</style>
