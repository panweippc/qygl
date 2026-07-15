<template>
  <div class="meeting-application">
    <div class="main-container">
      <div class="form-container">
        <el-card class="form-card">
          <template #header>
            <div class="card-header">
              <span class="title">创建会议</span>
              <el-button @click="goBack">返回</el-button>
            </div>
          </template>

          <el-form ref="formRef" :model="form" :rules="rules" label-width="120px" class="application-form">
            <el-divider content-position="left">会议信息</el-divider>

            <el-row :gutter="20">
              <el-col :span="12">
                <el-form-item label="会议主题" prop="title">
                  <el-input v-model="form.title" placeholder="请输入会议主题" maxlength="100" show-word-limit />
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="会议地点" prop="location">
                  <el-input v-model="form.location" placeholder="请输入会议地点" />
                </el-form-item>
              </el-col>
            </el-row>

            <el-row :gutter="20">
              <el-col :span="12">
                <el-form-item label="会议日期" prop="meetingDate">
                  <el-date-picker v-model="form.meetingDate" type="date" placeholder="选择日期" style="width: 100%" value-format="YYYY-MM-DD" />
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="会议时间" prop="meetingTime">
                  <el-time-picker v-model="form.meetingTime" placeholder="选择时间" style="width: 100%" value-format="HH:mm" />
                </el-form-item>
              </el-col>
            </el-row>

            <el-form-item label="参会人员" prop="participants">
              <el-input v-model="form.participants" placeholder="请输入参会人员姓名，多个用逗号分隔" />
            </el-form-item>

            <el-divider content-position="left">会议议程</el-divider>

            <el-form-item label="会议议程" prop="agenda">
              <el-input v-model="form.agenda" type="textarea" :rows="4" placeholder="请输入会议议程" />
            </el-form-item>

            <el-form-item label="审批人" prop="approver">
              <el-select v-model="form.approver" placeholder="请选择" style="width: 100%">
                <el-option v-for="emp in approverOptions" :key="emp.name" :label="emp.name" :value="emp.name" />
              </el-select>
            </el-form-item>

            <el-form-item>
              <el-button type="primary" @click="submitForm" :loading="submitting" size="large">创建会议</el-button>
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
                  <h4>会议召开</h4>
                  <p class="text-gray">审批通过后执行</p>
                </div>
              </el-timeline-item>
            </el-timeline>
          </el-card>

          <el-card class="tips-card">
            <template #header><span>温馨提示</span></template>
            <ul class="tips-list">
              <li>请确认会议室可用</li>
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
import { addMeeting, getEmployees } from '../services/api'

const router = useRouter()
const formRef = ref()
const submitting = ref(false)
const approverOptions = ref<any[]>([])

const currentUser = computed(() => {
  const userStr = localStorage.getItem('user')
  return userStr ? JSON.parse(userStr) : null
})

const form = reactive({
  title: '',
  meetingDate: '',
  meetingTime: '',
  location: '',
  participants: '',
  agenda: '',
  approver: '总经理'
})

const rules = {
  title: [{ required: true, message: '请输入会议主题', trigger: 'blur' }],
  meetingDate: [{ required: true, message: '请选择会议日期', trigger: 'change' }],
  meetingTime: [{ required: true, message: '请选择会议时间', trigger: 'change' }],
  location: [{ required: true, message: '请输入会议地点', trigger: 'blur' }],
  participants: [{ required: true, message: '请输入参会人员', trigger: 'blur' }],
  agenda: [{ required: true, message: '请输入会议议程', trigger: 'blur' }],
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
          organizer: username,
          title: form.title,
          meetingDate: form.meetingDate,
          meetingTime: form.meetingTime,
          location: form.location,
          participants: form.participants,
          agenda: form.agenda,
          approver: form.approver
        }
        const response = await addMeeting(data)
        if (response.success) {
          ElMessage.success('会议创建成功')
          router.replace('/oa-office?tab=meeting')
        } else {
          ElMessage.error(response.message || '创建失败')
        }
      } catch (error: any) {
        console.error('提交错误:', error)
        ElMessage.error(error.message || '创建失败')
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
.meeting-application { padding: 20px; max-width: 1400px; margin: 0 auto; }
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
