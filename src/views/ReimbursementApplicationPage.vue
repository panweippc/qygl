<template>
  <div class="reimbursement-application">
    <div class="main-container">
      <div class="form-container">
        <el-card class="form-card">
          <template #header>
            <div class="card-header">
              <span class="title">报销申请</span>
              <el-button @click="goBack">返回</el-button>
            </div>
          </template>

          <el-form ref="formRef" :model="form" :rules="rules" label-width="120px" class="application-form">
            <el-divider content-position="left">报销信息</el-divider>

            <el-row :gutter="20">
              <el-col :span="12">
                <el-form-item label="报销类型" prop="reimburseType">
                  <el-select v-model="form.reimburseType" placeholder="请选择" style="width: 100%">
                    <el-option label="差旅费" value="差旅费" />
                    <el-option label="办公用品" value="办公用品" />
                    <el-option label="餐饮费" value="餐饮费" />
                    <el-option label="交通费" value="交通费" />
                    <el-option label="其他" value="其他" />
                  </el-select>
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="报销金额" prop="amount">
                  <el-input v-model.number="form.amount" type="number" placeholder="请输入金额" :min="0">
                    <template #prefix>¥</template>
                  </el-input>
                </el-form-item>
              </el-col>
            </el-row>

            <el-row :gutter="20">
              <el-col :span="12">
                <el-form-item label="报销日期" prop="reimburseDate">
                  <el-date-picker v-model="form.reimburseDate" type="date" placeholder="选择日期" style="width: 100%" value-format="YYYY-MM-DD" />
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="审批人" prop="approver">
                  <el-select v-model="form.approver" placeholder="请选择" style="width: 100%">
                    <el-option v-for="emp in approverOptions" :key="emp.name" :label="emp.name" :value="emp.name" />
                  </el-select>
                </el-form-item>
              </el-col>
            </el-row>

            <el-divider content-position="left">报销事由</el-divider>

            <el-form-item label="报销事由" prop="reason">
              <el-input v-model="form.reason" type="textarea" :rows="4" placeholder="请输入报销事由" maxlength="500" show-word-limit />
            </el-form-item>

            <el-form-item>
              <el-button type="primary" @click="submitForm" :loading="submitting" size="large">提交申请</el-button>
            </el-form-item>
          </el-form>
        </el-card>
      </div>

      <div class="scroll-container">
        <div class="scroll-content">
          <el-card class="info-card">
            <template #header><span>审批流程预览</span></template>
            <el-timeline>
              <el-timeline-item type="primary" :hollow="true">
                <template #dot><el-icon><User /></el-icon></template>
                <div class="timeline-content">
                  <h4>提交申请</h4>
                  <p class="text-gray">{{ currentUser?.name || '当前用户' }}</p>
                </div>
              </el-timeline-item>
              <el-timeline-item type="warning" :hollow="true">
                <template #dot><el-icon><UserFilled /></el-icon></template>
                <div class="timeline-content">
                  <h4>审批人审批</h4>
                  <p class="text-gray">{{ form.approver || '待选择' }}</p>
                </div>
              </el-timeline-item>
              <el-timeline-item type="success" :hollow="true">
                <template #dot><el-icon><CircleCheck /></el-icon></template>
                <div class="timeline-content">
                  <h4>报销到账</h4>
                  <p class="text-gray">审批通过后发放</p>
                </div>
              </el-timeline-item>
            </el-timeline>
          </el-card>

          <el-card class="tips-card">
            <template #header><span>温馨提示</span></template>
            <ul class="tips-list">
              <li>请上传相关发票和凭证</li>
              <li>提交后将发送通知给审批人</li>
              <li>审批进度可在审批中心查看</li>
            </ul>
          </el-card>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { User, UserFilled, CircleCheck } from '@element-plus/icons-vue'
import { addReimbursement, getEmployees } from '../services/api'

const router = useRouter()
const formRef = ref()
const submitting = ref(false)
const approverOptions = ref<any[]>([])

const currentUser = computed(() => {
  const userStr = localStorage.getItem('user')
  return userStr ? JSON.parse(userStr) : null
})

const form = reactive({
  reimburseType: '',
  amount: 0,
  reimburseDate: '',
  reason: '',
  approver: '总经理'
})

const rules = {
  reimburseType: [{ required: true, message: '请选择报销类型', trigger: 'change' }],
  amount: [{ required: true, message: '请输入报销金额', trigger: 'blur' }],
  reimburseDate: [{ required: true, message: '请选择报销日期', trigger: 'change' }],
  reason: [{ required: true, message: '请输入报销事由', trigger: 'blur' }],
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
      if (defaultMgr) form.approver = defaultMgr.name
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
        const data = {
          applicant: username,
          reimburseType: form.reimburseType,
          amount: form.amount,
          reimburseDate: form.reimburseDate,
          reason: form.reason,
          approver: form.approver
        }
        const response = await addReimbursement(data)
        if (response.success) {
          ElMessage.success('报销申请已提交')
          router.replace('/oa-office?tab=reimbursement')
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

const goBack = () => { router.back() }

onMounted(() => {
  loadApprovers()
})
</script>

<style scoped>
.reimbursement-application { padding: 20px; max-width: 1400px; margin: 0 auto; }
.main-container { display: flex; gap: 20px; }
.form-container { flex: 1; }
.scroll-container { width: 360px; flex-shrink: 0; }
.scroll-content { position: sticky; top: 20px; max-height: calc(100vh - 80px); overflow-y: auto; padding-right: 8px; scrollbar-width: thin; scrollbar-color: #d9d9d9 #f5f5f5; }
.scroll-content::-webkit-scrollbar { width: 6px; }
.scroll-content::-webkit-scrollbar-track { background: #f5f5f5; border-radius: 3px; }
.scroll-content::-webkit-scrollbar-thumb { background: #d9d9d9; border-radius: 3px; }
.scroll-content::-webkit-scrollbar-thumb:hover { background: #bfbfbf; }
.form-card { margin-bottom: 20px; }
.card-header { display: flex; justify-content: space-between; align-items: center; }
.card-header .title { font-size: 18px; font-weight: bold; }
.application-form .el-divider { margin: 30px 0 20px; }
.timeline-content h4 { margin: 0 0 5px 0; font-size: 14px; }
.timeline-content p { margin: 0; font-size: 12px; }
.timeline-content .text-gray { color: #909399; }
.tips-card { margin-top: 20px; }
.tips-list { margin: 0; padding-left: 20px; }
.tips-list li { margin: 8px 0; font-size: 13px; color: #606266; line-height: 1.6; }
</style>
