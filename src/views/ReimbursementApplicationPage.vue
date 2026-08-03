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
                <el-form-item label="报销日期" prop="reimburseDate">
                  <el-date-picker v-model="form.reimburseDate" type="date" placeholder="选择日期" style="width: 100%" value-format="YYYY-MM-DD" />
                </el-form-item>
              </el-col>
            </el-row>

            <el-row :gutter="20">
              <el-col :span="12">
                <el-form-item label="审批人" prop="approver">
                  <el-select v-model="form.approver" placeholder="请选择" style="width: 100%">
                    <el-option v-for="emp in approverOptions" :key="emp.name" :label="emp.name" :value="emp.name" />
                  </el-select>
                </el-form-item>
              </el-col>
            </el-row>

            <el-form-item label="报销事由" prop="reason">
              <el-input v-model="form.reason" type="textarea" :rows="4" placeholder="请输入报销事由" maxlength="500" show-word-limit />
            </el-form-item>

            <el-divider content-position="left">出差明细（差旅费必填）</el-divider>

            <el-row :gutter="20">
              <el-col :span="12">
                <el-form-item label="项目名称">
                  <el-input v-model="form.detail.projectName" placeholder="请输入项目名称" />
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="人　数">
                  <el-input v-model.number="form.detail.peopleCount" type="number" placeholder="请输入人数" :min="1" />
                </el-form-item>
              </el-col>
            </el-row>

            <el-divider content-position="left">行程安排（可添加多段行程）</el-divider>

            <div v-for="(segment, index) in form.detail.segments" :key="index" class="segment-card">
              <div class="segment-header">
                <span class="segment-title">第 {{ index + 1 }} 段</span>
                <el-button
                  v-if="form.detail.segments.length > 1"
                  type="danger"
                  size="small"
                  plain
                  @click="removeSegment(index)"
                >
                  删除
                </el-button>
              </div>

              <el-row :gutter="20">
                <el-col :span="12">
                  <el-form-item label="出发日期">
                    <el-date-picker
                      v-model="segment.departureDate"
                      type="date"
                      placeholder="选择出发日期"
                      style="width: 100%"
                      value-format="YYYY-MM-DD"
                      @change="calcSegmentDays(segment)"
                    />
                  </el-form-item>
                </el-col>
                <el-col :span="12" v-if="segment.durationType === 'custom'">
                  <el-form-item label="到达日期">
                    <el-date-picker
                      v-model="segment.arrivalDate"
                      type="date"
                      placeholder="选择到达日期"
                      style="width: 100%"
                      value-format="YYYY-MM-DD"
                      :disabled-date="(time) => disabledEndDate(time, segment)"
                      @change="calcSegmentDays(segment)"
                    />
                  </el-form-item>
                </el-col>
              </el-row>

              <el-row :gutter="20">
                <el-col :span="12">
                  <el-form-item label="出差时长">
                    <el-radio-group v-model="segment.durationType" @change="calcSegmentDays(segment)">
                      <el-radio label="halfDay">半天 (0.5天)</el-radio>
                      <el-radio label="fullDay">一天 (1天)</el-radio>
                      <el-radio label="custom">自定义</el-radio>
                    </el-radio-group>
                  </el-form-item>
                </el-col>
                <el-col :span="12">
                  <el-form-item label="出发地点">
                    <el-input v-model="segment.departureLocation" placeholder="请输入出发地点" />
                  </el-form-item>
                </el-col>
              </el-row>

              <el-row :gutter="20">
                <el-col :span="8">
                  <el-form-item label="到达地点">
                    <el-input v-model="segment.arrivalLocation" placeholder="请输入到达地点" />
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
                    <el-input v-model.number="segment.transportAmount" type="number" placeholder="请输入金额">
                      <template #prefix>¥</template>
                    </el-input>
                  </el-form-item>
                </el-col>
              </el-row>

              <el-row :gutter="20">
                <el-col :span="12">
                  <el-form-item label="天数">
                    <el-input :model-value="String(segment.days)" disabled>
                      <template #append>天</template>
                    </el-input>
                  </el-form-item>
                </el-col>
                <el-col :span="12">
                  <el-form-item label="补助标准">
                    <el-input v-model.number="segment.allowanceStandard" type="number" placeholder="元/天" @change="calcSegmentDays(segment)">
                      <template #prefix>¥</template>
                    </el-input>
                  </el-form-item>
                </el-col>
              </el-row>

              <el-row :gutter="20">
                <el-col :span="8">
                  <el-form-item label="补助金额">
                    <el-input :model-value="segment.allowanceAmount.toFixed(2)" readonly>
                      <template #prefix>¥</template>
                      <template #append>自动</template>
                    </el-input>
                  </el-form-item>
                </el-col>
                <el-col :span="8">
                  <el-form-item label="住宿费用">
                    <el-input v-model.number="segment.lodgingAmount" type="number" placeholder="请输入金额">
                      <template #prefix>¥</template>
                    </el-input>
                  </el-form-item>
                </el-col>
                <el-col :span="8">
                  <el-form-item label="市内交通">
                    <el-input v-model.number="segment.localTransportAmount" type="number" placeholder="请输入金额">
                      <template #prefix>¥</template>
                    </el-input>
                  </el-form-item>
                </el-col>
              </el-row>

              <el-form-item label="其他费用">
                <el-input v-model.number="segment.otherAmount" type="number" placeholder="请输入其他费用金额">
                  <template #prefix>¥</template>
                </el-input>
              </el-form-item>
            </div>

            <el-form-item>
              <el-button type="primary" plain @click="addSegment">
                ＋ 添加行程
              </el-button>
            </el-form-item>

            <el-divider content-position="left">资金信息</el-divider>

            <el-row :gutter="20">
              <el-col :span="12">
                <el-form-item label="预借金额">
                  <el-input v-model.number="form.detail.preBorrowedAmount" type="number" placeholder="请输入已预借金额">
                    <template #prefix>¥</template>
                  </el-input>
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="退/补金额">
                  <el-input v-model.number="form.detail.refundAmount" type="number" placeholder="请输入退/补金额">
                    <template #prefix>¥</template>
                  </el-input>
                </el-form-item>
              </el-col>
            </el-row>

            <el-form-item label="合计金额">
              <el-input :model-value="totalAmountText" readonly>
                <template #prefix>¥</template>
                <template #append>自动计算</template>
              </el-input>
            </el-form-item>

            <el-divider content-position="left">附件</el-divider>

            <el-form-item label="附件">
              <el-upload
                :file-list="fileList"
                :auto-upload="false"
                multiple
                :limit="5"
                :on-exceed="onFileExceed"
                :on-change="handleFileChange"
                :on-remove="handleFileChange"
                accept=".jpg,.jpeg,.png,.gif,.bmp,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.md"
              >
                <el-button type="primary" plain>选择文件</el-button>
                <template #tip>
                  <div class="el-upload__tip">支持上传发票、行程单、收据等凭证，单个文件不超过50MB</div>
                </template>
              </el-upload>
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
import { addReimbursement, getEmployees, uploadAttachmentFiles } from '../services/api'

const router = useRouter()
const formRef = ref()
const submitting = ref(false)
const approverOptions = ref<any[]>([])
const fileList = ref<any[]>([])

const currentUser = computed(() => {
  const userStr = localStorage.getItem('user')
  return userStr ? JSON.parse(userStr) : null
})

const createSegment = () => ({
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

const form = reactive({
  reimburseType: '',
  reimburseDate: '',
  reason: '',
  approver: '总经理',
  detail: {
    projectName: '',
    peopleCount: 1,
    segments: [createSegment()],
    preBorrowedAmount: 0,
    refundAmount: 0
  }
})

const rules = {
  reimburseType: [{ required: true, message: '请选择报销类型', trigger: 'change' }],
  reimburseDate: [{ required: true, message: '请选择报销日期', trigger: 'change' }],
  reason: [{ required: true, message: '请输入报销事由', trigger: 'blur' }],
  approver: [{ required: true, message: '请选择审批人', trigger: 'change' }]
}

const calcSegmentDays = (segment: any) => {
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

const disabledEndDate = (time: Date, segment: any) => {
  if (!segment.departureDate) return false
  return time.getTime() < new Date(segment.departureDate).getTime()
}

const addSegment = () => {
  form.detail.segments.push(createSegment())
}

const removeSegment = (index: number) => {
  form.detail.segments.splice(index, 1)
}

const totalAmount = computed(() => {
  const sum = form.detail.segments.reduce((acc, seg) => {
    return acc
      + (Number(seg.transportAmount) || 0)
      + (Number(seg.allowanceAmount) || 0)
      + (Number(seg.lodgingAmount) || 0)
      + (Number(seg.localTransportAmount) || 0)
      + (Number(seg.otherAmount) || 0)
  }, 0)
  return Math.round(sum * 100) / 100
})

const totalAmountText = computed(() => totalAmount.value.toFixed(2))

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
      if (totalAmount.value <= 0) {
        ElMessage.warning('合计金额必须大于0')
        return
      }
      submitting.value = true
      try {
        const username = localStorage.getItem('username') || '当前用户'
        let attachments = null
        if (fileList.value.length > 0) {
          const files = fileList.value.map((item: any) => item.raw).filter(Boolean) as File[]
          const uploadRes = await uploadAttachmentFiles(files, currentUser.value?.id)
          if (!uploadRes.success) {
            ElMessage.error(uploadRes.message || '附件上传失败')
            return
          }
          attachments = JSON.stringify(uploadRes.data || [])
        }
        const data = {
          applicant: username,
          reimburseType: form.reimburseType,
          amount: totalAmount.value,
          reimburseDate: form.reimburseDate,
          reason: form.reason,
          approver: form.approver,
          detail: form.detail,
          attachments
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

const onFileExceed = () => {
  ElMessage.warning('最多只能上传5个附件')
}

const handleFileChange = (file: any, files: any[]) => {
  fileList.value = files
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
.segment-card {
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  padding: 16px 16px 0;
  margin-bottom: 16px;
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
</style>
