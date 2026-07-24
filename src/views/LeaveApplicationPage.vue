<template>
  <div class="leave-application-page">
    <div class="main-container">
      <!-- 左侧表单区域 -->
      <div class="form-container">
        <el-card class="form-card">
          <template #header>
            <div class="card-header">
              <span class="title">请假申请</span>
              <el-button @click="goBack">返回</el-button>
            </div>
          </template>

          <el-form
            ref="formRef"
            :model="form"
            :rules="rules"
            label-width="120px"
            class="application-form"
          >
            <el-divider content-position="left">基本信息</el-divider>

            <el-row :gutter="20">
              <el-col :span="12">
                <el-form-item label="请假类型" prop="leaveType">
                  <el-select v-model="form.leaveType" placeholder="请选择" style="width: 100%">
                    <el-option label="事假" value="事假" />
                    <el-option label="病假" value="病假" />
                    <el-option label="年假" value="年假" />
                    <el-option label="婚假" value="婚假" />
                    <el-option label="产假" value="产假" />
                    <el-option label="其他" value="其他" />
                  </el-select>
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="审批人" prop="approver">
                  <el-select v-model="form.approver" placeholder="请选择审批人" style="width: 100%">
                    <el-option
                      v-for="emp in approverOptions"
                      :key="emp.id"
                      :label="emp.name"
                      :value="emp.id"
                    />
                  </el-select>
                </el-form-item>
              </el-col>
            </el-row>

            <el-divider content-position="left">时间信息</el-divider>

            <el-form-item label="请假时长">
              <el-radio-group v-model="form.durationType" @change="onDurationTypeChange">
                <el-radio label="halfDay">半天 (0.5天)</el-radio>
                <el-radio label="fullDay">一天 (1天)</el-radio>
                <el-radio label="custom">自定义</el-radio>
              </el-radio-group>
            </el-form-item>

            <el-row :gutter="20">
              <el-col :span="12">
                <el-form-item label="开始日期" prop="startDate">
                  <el-date-picker
                    v-model="form.startDate"
                    type="date"
                    placeholder="选择开始日期"
                    style="width: 100%"
                    value-format="YYYY-MM-DD"
                    @change="calcDays"
                  />
                </el-form-item>
              </el-col>
              <el-col :span="12" v-if="form.durationType === 'custom'">
                <el-form-item label="结束日期" prop="endDate">
                  <el-date-picker
                    v-model="form.endDate"
                    type="date"
                    placeholder="选择结束日期"
                    style="width: 100%"
                    value-format="YYYY-MM-DD"
                    :disabled-date="disabledEndDate"
                    @change="calcDays"
                  />
                </el-form-item>
              </el-col>
            </el-row>

            <el-form-item label="请假天数">
              <el-input v-model="form.days" disabled style="width: 140px">
                <template #append">天</template>
              </el-input>
            </el-form-item>

            <el-divider content-position="left">请假原因</el-divider>

            <el-form-item label="请假原因" prop="reason">
              <el-input
                v-model="form.reason"
                type="textarea"
                :rows="4"
                placeholder="请输入请假原因"
                maxlength="500"
                show-word-limit
              />
            </el-form-item>

            <el-form-item>
              <el-button type="primary" @click="submitForm" :loading="submitting" size="large">
                提交申请
              </el-button>
            </el-form-item>
          </el-form>
        </el-card>
      </div>

      <!-- 右侧滚动区域 -->
      <div class="scroll-container">
        <div class="scroll-content">
          <el-card class="process-preview">
            <template #header>
              <span>审批流程预览</span>
            </template>
            <el-timeline>
              <el-timeline-item type="primary" :hollow="true">
                <template #dot>
                  <el-icon><User /></el-icon>
                </template>
                <div class="timeline-content">
                  <h4>提交申请</h4>
                  <p class="text-gray">{{ currentUser?.name || '当前用户' }}</p>
                </div>
              </el-timeline-item>

              <el-timeline-item type="warning" :hollow="true">
                <template #dot>
                  <el-icon><UserFilled /></el-icon>
                </template>
                <div class="timeline-content">
                  <h4>审批人审批</h4>
                  <p class="text-gray">{{ selectedApprover?.name || '待选择' }}</p>
                </div>
              </el-timeline-item>

              <el-timeline-item type="success" :hollow="true">
                <template #dot>
                  <el-icon><CircleCheck /></el-icon>
                </template>
                <div class="timeline-content">
                  <h4>审批完成</h4>
                  <p class="text-gray">结果将通知申请人</p>
                </div>
              </el-timeline-item>
            </el-timeline>
          </el-card>

          <el-card class="info-card">
            <template #header>
              <span>审批人信息</span>
            </template>
            <div v-if="selectedApprover" class="approver-info">
              <el-avatar :size="60" class="approver-avatar">
                {{ selectedApprover.name?.charAt(0) || '?' }}
              </el-avatar>
              <div class="approver-details">
                <h4>{{ selectedApprover.name }}</h4>
                <p>职位: {{ selectedApprover.position }}</p>
                <p>部门: {{ selectedApprover.department }}</p>
              </div>
            </div>
            <div v-else class="empty-state">
              <el-icon size="48" class="empty-icon"><UserFilled /></el-icon>
              <p>请选择审批人</p>
            </div>
          </el-card>

          <el-card class="tips-card">
            <template #header>
              <span>温馨提示</span>
            </template>
            <ul class="tips-list">
              <li>审批人默认为总经理角色</li>
              <li>提交后将发送通知给审批人</li>
              <li>审批进度可在审批中心查看</li>
              <li>请假天数根据日期自动计算</li>
            </ul>
          </el-card>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { User, UserFilled, CircleCheck } from '@element-plus/icons-vue'
import { addLeaveApplication, getEmployees } from '../services/api'

const router = useRouter()
const formRef = ref()
const submitting = ref(false)
const approverOptions = ref<any[]>([])

const currentUser = computed(() => {
  const userStr = localStorage.getItem('user')
  return userStr ? JSON.parse(userStr) : null
})

const selectedApprover = computed(() => {
  return approverOptions.value.find(emp => emp.id === form.approver) || null
})

const form = reactive({
  leaveType: '',
  durationType: 'custom',
  startDate: '',
  endDate: '',
  days: '',
  reason: '',
  approver: ''
})

const rules = {
  leaveType: [{ required: true, message: '请选择请假类型', trigger: 'change' }],
  startDate: [{ required: true, message: '请选择开始日期', trigger: 'change' }],
  endDate: [{ required: true, message: '请选择结束日期', trigger: 'change' }],
  reason: [{ required: true, message: '请输入请假原因', trigger: 'blur' }],
  approver: [{ required: true, message: '请选择审批人', trigger: 'change' }]
}

const onDurationTypeChange = () => {
  if (form.durationType === 'halfDay') {
    form.endDate = form.startDate
    form.days = '0.5'
  } else if (form.durationType === 'fullDay') {
    form.endDate = form.startDate
    calcDays()
  } else {
    form.endDate = ''
    form.days = ''
  }
}

const calcDays = () => {
  if (form.durationType === 'halfDay') {
    form.endDate = form.startDate
    form.days = form.startDate ? '0.5' : ''
  } else if (form.durationType === 'fullDay') {
    form.endDate = form.startDate
    form.days = form.startDate ? '1' : ''
  } else if (form.startDate && form.endDate) {
    const start = new Date(form.startDate)
    const end = new Date(form.endDate)
    const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1
    form.days = days > 0 ? String(days) : ''
  }
}

const disabledEndDate = (time: Date) => {
  if (!form.startDate) return false
  return time.getTime() < new Date(form.startDate).getTime()
}

const loadApprovers = async () => {
  try {
    const response = await getEmployees()
    if (response.success) {
      const managers = response.data.filter((emp: any) => {
        const position = emp.position || ''
        return position.includes('总经理') || position.includes('总监') || position.includes('经理')
      })
      approverOptions.value = managers
      const defaultMgr = managers.find((emp: any) => (emp.position || '').includes('总经理'))
      if (defaultMgr) form.approver = defaultMgr.id
    }
  } catch (error) {
    console.error('获取审批人失败:', error)
  }
}

const submitForm = async () => {
  if (!formRef.value) return
  await formRef.value.validate(async (valid: boolean) => {
    if (valid) {
      submitting.value = true
      try {
        const username = localStorage.getItem('username') || '当前用户'
        const approverName = selectedApprover.value?.name || ''
        const data = {
          applicant: username,
          leaveType: form.leaveType,
          startDate: form.startDate,
          endDate: form.endDate,
          days: form.days,
          reason: form.reason,
          approver: approverName
        }
        const response = await addLeaveApplication(data)
        if (response.success) {
          ElMessage.success('请假申请已提交')
          router.replace('/oa-office?tab=leave')
        } else {
          ElMessage.error(response.message || '提交失败')
        }
      } catch (error: any) {
        console.error('提交错误:', error)
        ElMessage.error(error.message || '提交失败')
      } finally {
        submitting.value = false
      }
    }
  })
}

const goBack = () => {
  router.back()
}

loadApprovers()
</script>

<style scoped>
.leave-application-page {
  padding: 20px;
  max-width: 1400px;
  margin: 0 auto;
}

.main-container {
  display: flex;
  gap: 20px;
}

.form-container {
  flex: 1;
}

.scroll-container {
  width: 360px;
  flex-shrink: 0;
}

.scroll-content {
  position: sticky;
  top: 20px;
  max-height: calc(100vh - 80px);
  overflow-y: auto;
  overflow-x: hidden;
  padding-right: 8px;
  scrollbar-width: thin;
  scrollbar-color: #d9d9d9 #f5f5f5;
}

.scroll-content::-webkit-scrollbar {
  width: 6px;
}

.scroll-content::-webkit-scrollbar-track {
  background: #f5f5f5;
  border-radius: 3px;
}

.scroll-content::-webkit-scrollbar-thumb {
  background: #d9d9d9;
  border-radius: 3px;
}

.scroll-content::-webkit-scrollbar-thumb:hover {
  background: #bfbfbf;
}

.leave-application-page .form-card {
  margin-bottom: 20px;
}

.leave-application-page .card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.leave-application-page .card-header .title {
  font-size: 18px;
  font-weight: bold;
}

.leave-application-page .application-form .el-divider {
  margin: 30px 0 20px;
}

.leave-application-page .process-preview .timeline-content h4 {
  margin: 0 0 5px 0;
  font-size: 14px;
}

.leave-application-page .process-preview .timeline-content p {
  margin: 0;
  font-size: 12px;
}

.leave-application-page .process-preview .timeline-content .text-gray {
  color: #909399;
}

.info-card {
  margin-top: 20px;
}

.approver-info {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 10px 0;
}

.approver-avatar {
  flex-shrink: 0;
}

.approver-details h4 {
  margin: 0 0 8px 0;
  font-size: 16px;
  font-weight: bold;
}

.approver-details p {
  margin: 4px 0;
  font-size: 13px;
  color: #606266;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 20px;
  color: #909399;
}

.empty-icon {
  margin-bottom: 10px;
  opacity: 0.5;
}

.tips-card {
  margin-top: 20px;
}

.tips-list {
  margin: 0;
  padding-left: 20px;
}

.tips-list li {
  margin: 8px 0;
  font-size: 13px;
  color: #606266;
  line-height: 1.6;
}
</style>
