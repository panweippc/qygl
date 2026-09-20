<template>
  <div class="apply">
    <div class="m-card" v-if="!selected">
      <div class="m-title">选择审批类型</div>
      <div v-if="loading" class="m-muted">加载中…</div>
      <div v-else-if="flows.length === 0" class="m-muted">暂无可发起的审批流程</div>
      <div
        v-for="f in flows"
        :key="f.flowCode"
        class="flow-item"
        @click="select(f)"
      >
        <div class="f-main">
          <div class="f-name">{{ f.flowName || f.name || f.flowCode }}</div>
          <div class="m-muted">{{ f.description || '点击发起申请' }}</div>
        </div>
        <span class="f-arrow">›</span>
      </div>
    </div>

    <!-- 表单 -->
    <div class="m-card" v-else>
      <div class="form-head">
        <span class="back" @click="selected = null">‹ 返回</span>
        <span class="fh-title">{{ selected.flowName || selected.name }}</span>
      </div>

      <input class="m-input" v-model="form.title" placeholder="标题（如：出差申请-北京）" />
      <textarea
        class="m-input"
        style="height: 90px; padding: 8px"
        v-model="form.reason"
        placeholder="事由 / 说明"
      ></textarea>
      <input class="m-input" v-model="form.amount" inputmode="decimal" placeholder="金额（元，可选）" />
      <div class="row2">
        <input class="m-input" type="date" v-model="form.startDate" />
        <input class="m-input" type="date" v-model="form.endDate" />
      </div>

      <div class="err" v-if="err">{{ err }}</div>
      <button class="m-btn block" :disabled="submitting" @click="submit">
        {{ submitting ? '提交中…' : '提交申请' }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import api from '@/services/api'

const router = useRouter()
const flows = ref<any[]>([])
const loading = ref(true)
const selected = ref<any>(null)
const err = ref('')
const submitting = ref(false)

const userObj = JSON.parse(localStorage.getItem('user') || '{}')
const form = ref({ title: '', reason: '', amount: '', startDate: '', endDate: '' })

async function loadFlows() {
  loading.value = true
  try {
    const res = await api.get('/oa/flows')
    if (res.data && res.data.success) flows.value = res.data.data || []
  } catch (e) { /* ignore */ }
  finally { loading.value = false }
}

function select(f: any) {
  selected.value = f
  err.value = ''
  form.value = { title: '', reason: '', amount: '', startDate: '', endDate: '' }
}

async function submit() {
  if (!form.value.title.trim()) { err.value = '请填写标题'; return }
  submitting.value = true
  err.value = ''
  try {
    const res = await api.post('/oa/submit', {
      flowCode: selected.value.flowCode,
      applicantId: Number(localStorage.getItem('userId') || 0),
      applicantName: userObj.name || userObj.username || localStorage.getItem('username'),
      applicantDept: userObj.department || '',
      applicantPosition: userObj.position || '',
      businessType: selected.value.flowName || selected.value.name || selected.value.flowCode,
      businessData: {
        title: form.value.title,
        reason: form.value.reason,
        amount: form.value.amount ? Number(form.value.amount) : null,
        startDate: form.value.startDate,
        endDate: form.value.endDate
      }
    })
    if (res.data && res.data.success) {
      alert('提交成功，已进入审批流程')
      router.replace('/')
    } else {
      err.value = (res.data && res.data.message) || '提交失败'
    }
  } catch (e: any) {
    err.value = e?.response?.data?.message || '网络错误'
  } finally {
    submitting.value = false
  }
}

onMounted(loadFlows)
</script>

<style scoped>
.flow-item {
  display: flex; align-items: center; justify-content: space-between;
  padding: 14px 0; border-top: 1px solid #f0f1f2;
}
.f-name { font-size: 15px; font-weight: 600; }
.f-arrow { font-size: 22px; color: #c8c9cc; }
.form-head {
  display: flex; align-items: center; gap: 12px; margin-bottom: 14px;
}
.back { color: #185fa5; font-size: 15px; }
.fh-title { font-size: 16px; font-weight: 600; }
.row2 { display: flex; gap: 10px; }
.row2 .m-input { flex: 1; }
.err { color: #ee0a24; font-size: 12px; margin: 8px 0; }
</style>
