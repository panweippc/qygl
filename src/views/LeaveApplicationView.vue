<template>
  <div class="leave-application-container">
    <!-- 顶部导航 -->
    <header class="header">
      <div class="logo">
        <span class="logo-text">宏友软件</span>
        <div class="logo-glow"></div>
      </div>
      <nav class="nav">
        <router-link to="/" class="nav-item">首页</router-link>
        <router-link to="/oa-office" class="nav-item">OA办公</router-link>
        <button class="nav-item logout-btn" @click="handleBack">返回</button>
      </nav>
    </header>

    <!-- 主内容区 -->
    <main class="main-content">
      <div class="content-wrapper">
        <h2 class="section-title">
          <span class="title-icon">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 3H5C3.9 3 3 3.9 3 5V19C3 20.1 3.9 21 5 21H19C20.1 21 21 20.1 21 19V5C21 3.9 20.1 3 19 3ZM11 17H7V10H11V17ZM17 17H13V7H17V17Z"/>
            </svg>
          </span>
          请假申请
        </h2>

        <!-- 发起申请按钮 - 仅非管理员可�?-->
        <div v-if="!isAdmin" class="action-container">
          <el-button type="primary" size="large" @click="openApplyDialog" class="apply-btn">
            发起申请
          </el-button>
        </div>

        <!-- 请假记录 - 仅非管理员可�?-->
        <div v-if="!isAdmin" class="records-container">
          <h3 class="records-title">我的请假记录</h3>
          <el-table :data="leaveRecords" style="width: 100%">
            <el-table-column prop="id" label="申请ID" width="80"></el-table-column>
            <el-table-column prop="leaveType" label="请假类型"></el-table-column>
            <el-table-column prop="startDate" label="开始日期"></el-table-column>
            <el-table-column prop="endDate" label="结束日期"></el-table-column>
            <el-table-column prop="days" label="天数" width="80"></el-table-column>
            <el-table-column prop="status" label="状态"></el-table-column>
            <el-table-column prop="submitDate" label="提交日期"></el-table-column>
          </el-table>
        </div>

        <!-- 请假申请流程�?- 仅非管理员可�?-->
        <div v-if="!isAdmin" class="records-container">
          <h3 class="records-title">请假申请流程</h3>
          <div class="flow-chart">
            <div class="flow-step">
              <div class="flow-step-number">1</div>
              <div class="flow-step-text">填写请假申请</div>
            </div>
            <div class="flow-arrow">→</div>
            <div class="flow-step">
              <div class="flow-step-number">2</div>
              <div class="flow-step-text">提交审批</div>
            </div>
            <div class="flow-arrow">→</div>
            <div class="flow-step">
              <div class="flow-step-number">3</div>
              <div class="flow-step-text">审批人审批</div>
            </div>
            <div class="flow-arrow">→</div>
            <div class="flow-step">
              <div class="flow-step-number">4</div>
              <div class="flow-step-text">审批结果通知</div>
            </div>
          </div>
        </div>

        <!-- 管理员专用内�?-->
        <template v-if="isAdmin">
          <!-- 待审批记�?-->
          <div class="records-container">
            <h3 class="records-title">待我审批</h3>
            <el-table :data="pendingApprovals" style="width: 100%">
              <el-table-column prop="id" label="申请ID" width="80"></el-table-column>
              <el-table-column label="申请人">
                <template #default="{ row }">
                  {{ extractRealName(row.applicant) }}
                </template>
              </el-table-column>
              <el-table-column prop="leaveType" label="请假类型"></el-table-column>
              <el-table-column prop="startDate" label="开始日期"></el-table-column>
              <el-table-column prop="endDate" label="结束日期"></el-table-column>
              <el-table-column prop="days" label="天数" width="80"></el-table-column>
              <el-table-column prop="submitDate" label="提交日期"></el-table-column>
              <el-table-column label="操作" width="120">
                <template #default="{ row }">
                  <el-button size="small" @click="approveLeave(row)" class="approve-btn">
                    审批
                  </el-button>
                </template>
              </el-table-column>
            </el-table>
          </div>

          <!-- 所有请假记�?-->
          <div class="records-container">
            <h3 class="records-title">所有请假记录</h3>
            <el-table :data="allLeaveRecords" style="width: 100%">
              <el-table-column prop="id" label="申请ID" width="80"></el-table-column>
              <el-table-column label="申请人">
                <template #default="{ row }">
                  {{ extractRealName(row.applicant) }}
                </template>
              </el-table-column>
              <el-table-column prop="leaveType" label="请假类型"></el-table-column>
              <el-table-column prop="startDate" label="开始日期"></el-table-column>
              <el-table-column prop="endDate" label="结束日期"></el-table-column>
              <el-table-column prop="days" label="天数" width="80"></el-table-column>
              <el-table-column prop="status" label="状态"></el-table-column>
              <el-table-column prop="submitDate" label="提交日期"></el-table-column>
            </el-table>
          </div>
        </template>

        <!-- 请假申请表单对话�?-->
        <el-dialog
          v-model="applyDialogVisible"
          title="请假申请"
          width="600px"
          class="dialog"
        >
          <el-form :model="form" :rules="rules" ref="formRef" label-width="100px">
            <el-form-item label="请假类型" prop="leaveType">
              <el-select v-model="form.leaveType" placeholder="请选择请假类型">
                <el-option label="事假" value="personal"></el-option>
                <el-option label="病假" value="sick"></el-option>
                <el-option label="年假" value="annual"></el-option>
                <el-option label="婚假" value="marriage"></el-option>
                <el-option label="产假" value="maternity"></el-option>
                <el-option label="其他" value="other"></el-option>
              </el-select>
            </el-form-item>
            
            <el-form-item label="开始日期" prop="startDate">
              <el-date-picker
                v-model="form.startDate"
                type="date"
                placeholder="选择开始日期"
                style="width: 100%"
              ></el-date-picker>
            </el-form-item>
            
            <el-form-item label="结束日期" prop="endDate">
              <el-date-picker
                v-model="form.endDate"
                type="date"
                placeholder="选择结束日期"
                style="width: 100%"
              ></el-date-picker>
            </el-form-item>
            
            <el-form-item label="请假天数" prop="days">
              <el-input v-model="form.days" type="number" placeholder="请输入请假天数"></el-input>
            </el-form-item>
            
            <el-form-item label="请假原因" prop="reason">
              <el-input
                v-model="form.reason"
                type="textarea"
                :rows="4"
                placeholder="请输入请假原因"
              ></el-input>
            </el-form-item>
            
            <el-form-item label="附件">
              <el-upload
                class="upload-demo"
                action="#"
                :auto-upload="false"
                :on-change="handleFileChange"
                :file-list="fileList"
              >
                <el-button type="primary">选择文件</el-button>
                <template #tip>
                  <div class="el-upload__tip">
                    支持上传请假相关证明文件
                  </div>
                </template>
              </el-upload>
            </el-form-item>
          </el-form>
          <template #footer>
            <span class="dialog-footer">
              <el-button @click="applyDialogVisible = false">取消</el-button>
              <el-button type="primary" @click="submitApplication">提交申请</el-button>
            </span>
          </template>
        </el-dialog>

        <!-- 选择审批人对话框 -->
        <el-dialog
          v-model="approverDialogVisible"
          title="选择审批人"
          width="400px"
          class="dialog"
        >
          <el-form :model="approverForm" label-width="80px">
            <el-form-item label="审批人">
              <el-select v-model="approverForm.approver" placeholder="请选择审批人" style="width: 100%">
                <el-option
                  v-for="employee in employees"
                  :key="employee.name"
                  :label="employee.name"
                  :value="employee.name"
                />
              </el-select>
            </el-form-item>
          </el-form>
          <template #footer>
            <span class="dialog-footer">
              <el-button @click="approverDialogVisible = false">取消</el-button>
              <el-button type="primary" @click="confirmApprover">确定</el-button>
            </span>
          </template>
        </el-dialog>

        <!-- 审批对话�?-->
        <el-dialog
          v-model="approvalDialogVisible"
          title="审批请假"
          width="600px"
          class="dialog"
        >
          <div class="approval-content">
            <div class="approval-info">
              <p><strong>申请�?</strong> {{ extractRealName(approvalForm.applicant) }}</p>
              <p><strong>请假类型:</strong> {{ approvalForm.leaveType }}</p>
              <p><strong>开始日期</strong> {{ approvalForm.startDate }}</p>
              <p><strong>结束日期:</strong> {{ approvalForm.endDate }}</p>
              <p><strong>请假天数:</strong> {{ approvalForm.days }}</p>
              <p><strong>请假原因:</strong> {{ approvalForm.reason }}</p>
            </div>
            <el-form :model="approvalForm" :rules="approvalRules" ref="approvalFormRef">
              <el-form-item label="审批意见" prop="comment">
                <el-input
                  v-model="approvalForm.comment"
                  type="textarea"
                  :rows="4"
                  placeholder="请输入审批意见"
                ></el-input>
              </el-form-item>
              <el-form-item label="审批结果" prop="result">
                <el-radio-group v-model="approvalForm.result">
                  <el-radio label="approve">批准</el-radio>
                  <el-radio label="reject">拒绝</el-radio>
                </el-radio-group>
              </el-form-item>
            </el-form>
          </div>
          <template #footer>
            <span class="dialog-footer">
              <el-button @click="approvalDialogVisible = false">取消</el-button>
              <el-button type="primary" @click="submitApproval">完成</el-button>
            </span>
          </template>
        </el-dialog>

        <!-- 选择下一步审批人对话�?-->
        <el-dialog
          v-model="nextApproverDialogVisible"
          title="选择下一步审批人"
          width="400px"
          class="dialog"
        >
          <el-form :model="nextApproverForm" label-width="80px">
            <el-form-item label="下一步审批人">
              <el-select v-model="nextApproverForm.nextApprover" placeholder="请选择下一步审批人" style="width: 100%">
                <el-option
                  v-for="employee in employees"
                  :key="employee.name"
                  :label="employee.name"
                  :value="employee.name"
                />
              </el-select>
            </el-form-item>
          </el-form>
          <template #footer>
            <span class="dialog-footer">
              <el-button @click="nextApproverDialogVisible = false">取消</el-button>
              <el-button type="primary" @click="confirmNextApprover">确定</el-button>
            </span>
          </template>
        </el-dialog>

        <!-- 请假记录 - 仅非管理员可�?-->
        <div v-if="!isAdmin" class="records-container">
          <h3 class="records-title">请假记录</h3>
          <el-table :data="leaveRecords" style="width: 100%">
            <el-table-column prop="id" label="申请ID" width="80"></el-table-column>
            <el-table-column prop="leaveType" label="请假类型"></el-table-column>
            <el-table-column prop="startDate" label="开始日期"></el-table-column>
            <el-table-column prop="endDate" label="结束日期"></el-table-column>
            <el-table-column prop="days" label="天数" width="80"></el-table-column>
            <el-table-column prop="status" label="状态"></el-table-column>
            <el-table-column prop="submitDate" label="提交日期"></el-table-column>
          </el-table>
        </div>
      </div>
    </main>

    <!-- 页脚 -->
    <footer class="footer">
      <div class="footer-content">
        <p>© 2026 企业管理系统 | 科技赋能未来</p>
      </div>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { getLeaveApplications, addLeaveApplication, updateLeaveApplication, getPendingLeaveApplications } from '../services/api'

// 提取真实姓名（从emp_姓名_时间戳格式中提取）
const extractRealName = (name: string): string => {
  if (!name) return ''
  // 匹配 emp_姓名_时间戳格式
  const match = name.match(/^emp_(.+?)_\d+$/)
  if (match) {
    return match[1]
  }
  return name
}

const router = useRouter()

// 表单状态
  const form = ref({
  leaveType: '',
  startDate: '',
  endDate: '',
  days: '',
  reason: ''
})

const fileList = ref([])

// 对话框状态const applyDialogVisible = ref(false)
const approverDialogVisible = ref(false)
const approvalDialogVisible = ref(false)
const nextApproverDialogVisible = ref(false)

// 审批人表单
  const approverForm = ref({
  approver: '总经理'
})

// 审批表单
const approvalForm = ref({
  id: '',
  applicant: '',
  leaveType: '',
  startDate: '',
  endDate: '',
  days: '',
  reason: '',
  comment: '',
  result: ''
})

// 下一步审批人表单
const nextApproverForm = ref({
  nextApprover: ''
})

// 员工列表
const employees = ref([])

// 加载员工数据
const loadEmployees = async () => {
  try {
    const { getEmployees } = await import('../services/api')
    const response = await getEmployees()
    if (response.success) {
      employees.value = response.data
    }
  } catch (error) {
    console.error('获取员工数据失败:', error)
    ElMessage.error('获取员工数据失败')
  }
}

// 请假记录
const leaveRecords = ref([])

// 待审批记�?const pendingApprovals = ref([])

// 所有请假记录（管理员查看）
const allLeaveRecords = ref([])

// 当前用户
  const currentUsername = computed(() => {
  return localStorage.getItem('username') || '当前用户'
})

// 计算用户角色
const isAdmin = computed(() => {
  // 从localStorage获取用户角色信息
  const role = localStorage.getItem('role')
  // 实际项目中应该根据登录API返回的角色信息判�?  return role === 'admin'
})

// 计算用户是否是财务总监
const isFinanceDirector = computed(() => {
  // 从localStorage获取用户角色信息
  const role = localStorage.getItem('role')
  // 实际项目中应该根据登录API返回的角色信息判�?  return role === 'finance_director'
})

// 计算用户是否需要默认审批人（非管理员且非财务总监）
  const needDefaultApprover = computed(() => {
  return !isAdmin.value && !isFinanceDirector.value
})

// 表单验证规则
const rules = {
    leaveType: [{ required: true, message: '请选择请假类型', trigger: 'change' }],
    startDate: [{ required: true, message: '请选择开始日期', trigger: 'change' }],
    endDate: [{ required: true, message: '请选择结束日期', trigger: 'change' }],
    days: [{ required: true, message: '请输入请假天数', trigger: 'blur' }],
  reason: [{ required: true, message: '请输入请假原因', trigger: 'blur' }]
}

// 审批表单验证规则
const approvalRules = {
    comment: [{ required: true, message: '请输入审批意见', trigger: 'blur' }],
    result: [{ required: true, message: '请选择审批结果', trigger: 'change' }]
  }

// 表单引用
const formRef = ref()
const approvalFormRef = ref()

// 打开申请对话框
  const openApplyDialog = () => {
  resetForm()
  applyDialogVisible.value = true
}

// 处理文件上传
const handleFileChange = (file) => {
  fileList.value.push(file)
}

// 提交申请
const submitApplication = () => {
  formRef.value.validate((valid) => {
    if (valid) {
      if (needDefaultApprover.value) {
        // 非管理员和非财务总监用户，默认审批人是总经理
        const applicationData = {
          applicant: currentUsername.value,
          leaveType: form.value.leaveType,
          startDate: formatDate(form.value.startDate),
          endDate: formatDate(form.value.endDate),
          days: form.value.days,
          reason: form.value.reason,
          approver: '总经理'
        }
        
        // 直接提交申请
        addLeaveApplication(applicationData).then(response => {
          if (response.success) {
            ElMessage.success('请假申请已提交，等待审批')
            applyDialogVisible.value = false
            resetForm()
            // 重新加载数据
            loadLeaveRecords()
            loadPendingApprovals()
            if (isAdmin.value) {
              loadAllLeaveRecords()
            }
          } else {
            ElMessage.error(response.message || '提交请假申请失败')
          }
        }).catch(error => {
          console.error('提交请假申请失败:', error)
          ElMessage.error('提交请假申请失败')
        })
      } else {
        // 管理员和财务总监用户，显示选择审批人对话框
        approverDialogVisible.value = true
        applyDialogVisible.value = false
      }
    }
  })
}

// 格式化日期
  const formatDate = (date) => {
  if (!date) return ''
  if (date instanceof Date) {
    return date.toISOString().split('T')[0]
  }
  return date
}

// 确认审批人
const confirmApprover = async () => {
  if (approverForm.value.approver) {
    try {
      // 确保日期是字符串格式
      const formatDate = (date) => {
        if (!date) return ''
        if (date instanceof Date) {
          return date.toISOString().split('T')[0]
        }
        return date
      }
      
      const applicationData = {
        applicant: currentUsername.value,
        leaveType: form.value.leaveType,
        startDate: formatDate(form.value.startDate),
        endDate: formatDate(form.value.endDate),
        days: form.value.days,
        reason: form.value.reason,
        approver: approverForm.value.approver
      }
      
      const response = await addLeaveApplication(applicationData)
      if (response.success) {
        ElMessage.success('请假申请已提交，等待审批')
        approverDialogVisible.value = false
        resetForm()
        // 重新加载数据
        await loadLeaveRecords()
        await loadPendingApprovals()
        if (isAdmin.value) {
          await loadAllLeaveRecords()
        }
      } else {
        ElMessage.error(response.message || '提交请假申请失败')
      }
    } catch (error) {
      console.error('提交请假申请失败:', error)
      ElMessage.error('提交请假申请失败')
    }
  } else {
    ElMessage.error('请选择审批人')
  }
}

// 审批请假
const approveLeave = (row) => {
  approvalForm.value = {
    id: row.id,
    applicant: row.applicant,
    leaveType: row.leaveType,
    startDate: row.startDate,
    endDate: row.endDate,
    days: row.days,
    reason: row.reason,
    comment: '',
    result: ''
  }
  approvalDialogVisible.value = true
}

// 提交审批
const submitApproval = () => {
  approvalFormRef.value.validate((valid) => {
    if (valid) {
      // 显示选择下一步审批人对话�?      nextApproverDialogVisible.value = true
      approvalDialogVisible.value = false
    }
  })
}

// 确认下一步审批人
const confirmNextApprover = async () => {
  if (nextApproverForm.value.nextApprover) {
    try {
      const updateData = {
        comment: approvalForm.value.comment,
        result: approvalForm.value.result,
        nextApprover: nextApproverForm.value.nextApprover
      }
      
      const response = await updateLeaveApplication(approvalForm.value.id, updateData)
      if (response.success) {
        ElMessage.success('审批已完成，已提交到下一步审批人')
        nextApproverDialogVisible.value = false
        approvalForm.value = {
          id: '',
          applicant: '',
          leaveType: '',
          startDate: '',
          endDate: '',
          days: '',
          reason: '',
          comment: '',
          result: ''
        }
        nextApproverForm.value = {
          nextApprover: ''
        }
        // 重新加载数据
        await loadLeaveRecords()
        await loadPendingApprovals()
        if (isAdmin.value) {
          await loadAllLeaveRecords()
        }
      } else {
        ElMessage.error(response.message || '更新审批状态失败')
      }
    } catch (error) {
      console.error('更新审批状态失败', error)
      ElMessage.error('更新审批状态失败')
    }
  } else {
    ElMessage.error('请选择下一步审批人')
  }
}

// 重置表单
const resetForm = () => {
  form.value = {
    leaveType: '',
    startDate: '',
    endDate: '',
    days: '',
    reason: ''
  }
  fileList.value = []
}

// 返回
const handleBack = () => {
  router.back()
}

// 加载请假记录数据
const loadLeaveRecords = async () => {
  try {
    const response = await getLeaveApplications()
    if (response.success) {
      // 过滤出当前用户的请假记录
      leaveRecords.value = response.data.filter((item: any) => item.applicant === currentUsername.value)
      // 转换createdAt为submitDate
      leaveRecords.value = leaveRecords.value.map((item: any) => ({
        ...item,
        submitDate: item.createdAt.substring(0, 10)
      }))
    }
  } catch (error) {
    console.error('获取请假记录失败:', error)
    ElMessage.error('获取请假记录失败')
  }
}

// 加载待审批记录数据
const loadPendingApprovals = async () => {
  try {
    const response = await getPendingLeaveApplications(currentUsername.value)
    if (response.success) {
      // 转换createdAt为submitDate
      pendingApprovals.value = response.data.map((item: any) => ({
        ...item,
        submitDate: item.createdAt.substring(0, 10)
      }))
    }
  } catch (error) {
      console.error('获取待审批记录失败', error)
      ElMessage.error('获取待审批记录失败')
  }
}

// 加载所有请假记录（管理员）
const loadAllLeaveRecords = async () => {
  try {
    const response = await getLeaveApplications()
    if (response.success) {
      // 转换createdAt为submitDate
      allLeaveRecords.value = response.data.map((item: any) => ({
        ...item,
        submitDate: item.createdAt.substring(0, 10)
      }))
    }
  } catch (error) {
      console.error('获取所有请假记录失败', error)
      ElMessage.error('获取所有请假记录失败')
  }
}

// 组件挂载时加载数据
onMounted(async () => {
  await loadEmployees()
  await loadLeaveRecords()
  await loadPendingApprovals()
  if (isAdmin.value) {
    await loadAllLeaveRecords()
  }
  console.log('组件挂载，加载数据完成')
})
</script>

<style scoped>
.leave-application-container {
  width: 100%;
  height: 100vh;
  display: flex;
  flex-direction: column;
  position: relative;
  overflow: hidden;
  background: #E4EDF2;
}

/* 顶部导航 */
.header {
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid rgba(100, 149, 237, 0.3);
  padding: 0 2rem;
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  position: relative;
  z-index: 100;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
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

.nav-item::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(100, 149, 237, 0.2), transparent);
  transition: left 0.3s ease;
}

.nav-item:hover::before,
.nav-item.active::before {
  left: 100%;
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
  position: relative;
  overflow: hidden;
  font-size: 14px;
  font-weight: 500;
}

.logout-btn::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(244, 67, 54, 0.2), transparent);
  transition: left 0.3s ease;
}

.logout-btn:hover::before {
  left: 100%;
}

.logout-btn:hover {
  background: rgba(244, 67, 54, 0.2);
  box-shadow: 0 0 15px rgba(244, 67, 54, 0.2);
}

/* 主内容区 */
.main-content {
  flex: 1;
  overflow-y: auto;
  padding: 2rem;
  position: relative;
  z-index: 1;
}

.content-wrapper {
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

/* 标题 */
.section-title {
  font-size: 1.5rem;
  font-weight: 600;
  color: #333;
  margin-bottom: 1.5rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  text-shadow: 0 0 10px rgba(100, 149, 237, 0.3);
}

.title-icon {
  width: 32px;
  height: 32px;
  background: linear-gradient(45deg, #6495ED, #87CEEB);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  box-shadow: 0 4px 15px rgba(100, 149, 237, 0.3);
}

.title-icon svg {
  width: 18px;
  height: 18px;
}

/* 表单容器 */
.form-container {
  background: rgba(255, 255, 255, 0.8);
  border: 1px solid rgba(100, 149, 237, 0.3);
  border-radius: 12px;
  padding: 2rem;
  backdrop-filter: blur(5px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  position: relative;
  overflow: hidden;
}

.form-container::before {
  content: '';
  position: absolute;
  top: -2px;
  left: -2px;
  right: -2px;
  bottom: -2px;
  background: linear-gradient(45deg, #6495ED, #87CEEB, #6495ED);
  border-radius: 14px;
  z-index: -1;
  opacity: 0;
  transition: opacity 0.3s ease;
  animation: borderGlow 3s linear infinite;
  background-size: 200% 200%;
}

.form-container:hover::before {
  opacity: 1;
}

/* 记录容器 */
.records-container {
  background: rgba(255, 255, 255, 0.8);
  border: 1px solid rgba(100, 149, 237, 0.3);
  border-radius: 12px;
  padding: 2rem;
  backdrop-filter: blur(5px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  position: relative;
  overflow: hidden;
}

.records-container::before {
  content: '';
  position: absolute;
  top: -2px;
  left: -2px;
  right: -2px;
  bottom: -2px;
  background: linear-gradient(45deg, #6495ED, #87CEEB, #6495ED);
  border-radius: 14px;
  z-index: -1;
  opacity: 0;
  transition: opacity 0.3s ease;
  animation: borderGlow 3s linear infinite;
  background-size: 200% 200%;
}

.records-container:hover::before {
  opacity: 1;
}

.records-title {
  font-size: 1.2rem;
  font-weight: 600;
  color: #6495ED;
  margin: 0 0 1.5rem 0;
  text-shadow: 0 0 10px rgba(100, 149, 237, 0.3);
}

/* 操作容器 */
.action-container {
  display: flex;
  justify-content: flex-start;
  margin-bottom: 2rem;
}

.apply-btn {
  background: linear-gradient(45deg, #6495ED, #87CEEB) !important;
  border: none !important;
  border-radius: 8px !important;
  padding: 1rem 2rem !important;
  font-size: 16px !important;
  font-weight: 600 !important;
  box-shadow: 0 4px 15px rgba(100, 149, 237, 0.4) !important;
  transition: all 0.3s ease !important;
}

.apply-btn:hover {
  transform: translateY(-2px) !important;
  box-shadow: 0 6px 20px rgba(100, 149, 237, 0.6) !important;
}

/* 审批内容 */
.approval-content {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.approval-info {
  background: rgba(100, 149, 237, 0.1);
  padding: 1.5rem;
  border-radius: 8px;
  border-left: 4px solid #6495ED;
}

.approval-info p {
  margin: 0.5rem 0;
  color: rgba(51, 51, 51, 0.8);
}

.approval-info strong {
  color: #333;
}

/* 审批按钮 */
.approve-btn {
  background: rgba(100, 149, 237, 0.2) !important;
  color: #6495ED !important;
  border: 1px solid rgba(100, 149, 237, 0.4) !important;
  border-radius: 6px !important;
  transition: all 0.3s ease !important;
}

.approve-btn:hover {
  background: rgba(100, 149, 237, 0.3) !important;
  box-shadow: 0 0 10px rgba(100, 149, 237, 0.4) !important;
}

/* 流程图样�?*/
.flow-chart {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 1rem;
  padding: 2rem;
  background: rgba(100, 149, 237, 0.05);
  border-radius: 8px;
  border-left: 4px solid #6495ED;
}

.flow-step {
  display: flex;
  flex-direction: column;
  align-items: center;
  flex: 1;
  min-width: 120px;
}

.flow-step-number {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: linear-gradient(45deg, #6495ED, #87CEEB);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  margin-bottom: 0.5rem;
  box-shadow: 0 2px 8px rgba(100, 149, 237, 0.3);
}

.flow-step-text {
  text-align: center;
  font-size: 0.9rem;
  color: #333;
  font-weight: 500;
}

.flow-arrow {
  font-size: 1.5rem;
  color: #6495ED;
  font-weight: bold;
  margin: 0 0.5rem;
}

/* 页脚 */
.footer {
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(10px);
  border-top: 1px solid rgba(100, 149, 237, 0.3);
  padding: 1rem 2rem;
  text-align: center;
  color: rgba(51, 51, 51, 0.6);
  position: relative;
  z-index: 100;
  box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.1);
}

.footer-content {
  display: flex;
  justify-content: center;
  align-items: center;
}

/* 滚动条样�?*/
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

/* 动画 */
@keyframes borderGlow {
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}
</style>
