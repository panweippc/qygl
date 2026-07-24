<template>
  <div class="entertainment-apply-page">
    <div class="main-container">
      <div class="form-container">
        <el-card class="form-card">
          <template #header>
            <div class="card-header">
              <span class="title">业务招待费申请</span>
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
            <el-divider content-position="left">招待信息</el-divider>

            <el-row :gutter="20">
              <el-col :span="12">
                <el-form-item label="客户名称" prop="guestName">
                  <el-input v-model="form.guestName" placeholder="请输入客户名称" />
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="招待人数" prop="guestCount">
                  <el-input-number v-model="form.guestCount" :min="1" :max="100" style="width: 100%" />
                </el-form-item>
              </el-col>
            </el-row>

            <el-row :gutter="20">
              <el-col :span="12">
                <el-form-item label="费用类型" prop="expenseType">
                  <el-select v-model="form.expenseType" placeholder="请选择" style="width: 100%">
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
                  <el-input v-model.number="form.expenseAmount" type="number" placeholder="请输入金额">
                    <template #prefix>¥</template>
                  </el-input>
                </el-form-item>
              </el-col>
            </el-row>

            <el-row :gutter="20">
              <el-col :span="12">
                <el-form-item label="招待日期" prop="expenseDate">
                  <el-date-picker
                    v-model="form.expenseDate"
                    type="date"
                    placeholder="选择日期"
                    style="width: 100%"
                    value-format="YYYY-MM-DD"
                  />
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

            <el-divider content-position="left">招待事由</el-divider>

            <el-form-item label="招待事由" prop="purpose">
              <el-input
                v-model="form.purpose"
                type="textarea"
                :rows="4"
                placeholder="请输入招待事由"
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
              <li>审批人默认为总经理或部门经理</li>
              <li>提交后将发送通知给审批人</li>
              <li>审批进度可在审批中心查看</li>
              <li>招待费用需如实填写</li>
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
import { addEntertainmentExpense, getEmployees } from '../services/api'

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
  guestName: '',
  guestCount: 1,
  expenseType: '',
  expenseAmount: 0,
  expenseDate: '',
  approver: '',
  purpose: ''
})

const rules = {
  guestName: [{ required: true, message: '请输入客户名称', trigger: 'blur' }],
  expenseType: [{ required: true, message: '请选择费用类型', trigger: 'change' }],
  expenseAmount: [{ required: true, message: '请输入费用金额', trigger: 'blur' }],
  expenseDate: [{ required: true, message: '请选择招待日期', trigger: 'change' }],
  purpose: [{ required: true, message: '请输入招待事由', trigger: 'blur' }],
  approver: [{ required: true, message: '请选择审批人', trigger: 'change' }]
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
          guestName: form.guestName,
          guestCount: form.guestCount,
          expenseType: form.expenseType,
          expenseAmount: form.expenseAmount,
          expenseDate: form.expenseDate,
          purpose: form.purpose,
          approver: approverName
        }
        const response = await addEntertainmentExpense(data)
        if (response.success) {
          ElMessage.success('招待费申请已提交')
          router.replace('/oa-office?tab=entertainment')
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
.entertainment-apply-page {
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

.entertainment-apply-page .form-card {
  margin-bottom: 20px;
}

.entertainment-apply-page .card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.entertainment-apply-page .card-header .title {
  font-size: 18px;
  font-weight: bold;
}

.entertainment-apply-page .application-form .el-divider {
  margin: 30px 0 20px;
}

.entertainment-apply-page .process-preview .timeline-content h4 {
  margin: 0 0 5px 0;
  font-size: 14px;
}

.entertainment-apply-page .process-preview .timeline-content p {
  margin: 0;
  font-size: 12px;
}

.entertainment-apply-page .process-preview .timeline-content .text-gray {
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
