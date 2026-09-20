<template>
  <div class="m-page">
    <div class="m-card" v-if="!isGM">
      <div class="m-title">上传月报</div>

      <label class="m-label">月份</label>
      <input class="m-input" type="month" v-model="month" />

      <div v-for="sec in sections" :key="sec.key">
        <label class="m-label">{{ sec.title }}</label>
        <textarea
          class="m-input"
          v-model="form[sec.key]"
          :placeholder="`请输入${sec.title}`"
          rows="3"
        />
      </div>

      <label class="m-label">附件</label>
      <div class="file-list">
        <div v-for="(f, idx) in files" :key="idx" class="file-item">
          <span class="file-name">{{ f.name }}</span>
          <span class="file-del" @click="removeFile(idx)">×</span>
        </div>
      </div>
      <label class="m-btn ghost" style="display:inline-block;position:relative;overflow:hidden">
        + 添加附件
        <input type="file" multiple style="position:absolute;inset:0;opacity:0" @change="onFileChange" />
      </label>

      <div class="err" v-if="err">{{ err }}</div>

      <div class="btn-row">
        <button class="m-btn ghost" :disabled="loading" @click="submit('draft')">暂存草稿</button>
        <button class="m-btn" :disabled="loading" @click="submit('submitted')">{{ loading ? '提交中…' : '提交月报' }}</button>
      </div>
    </div>

    <div class="m-card">
      <div class="m-row mine-row" @click="go('/monthly-report-history')">
        <span>历史月报</span>
        <span class="mine-arrow">›</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import api from '@/services/api'
import { buildContent, buildPlan, emptySections, autoReportTitle } from '@/utils/monthlyReport'
import { useRoleGuard } from '@/composables/useRoleGuard'

const router = useRouter()
const guard = useRoleGuard()
// 总经理 / 系统管理员 / 内置管理账号：与网页端一致，只查看历史月报，不显示填报
const isGM = computed(() => guard.roleTier.value === 'gm')
const month = ref('')
const form = ref(emptySections())
const files = ref<{ name: string; url: string; type: string; size: number }[]>([])
const loading = ref(false)
const err = ref('')

const sections = [
  { key: 'summary', title: '本月工作总结' },
  { key: 'highlights', title: '工作亮点与成果' },
  { key: 'problems', title: '遇到的问题及处理' },
  { key: 'nextPlan', title: '下月工作计划' },
  { key: 'coordination', title: '需协调支持事项' }
]

const title = computed(() => autoReportTitle(month.value))

function go(p: string) {
  router.push(p)
}

async function onFileChange(e: Event) {
  const target = e.target as HTMLInputElement
  if (!target.files || target.files.length === 0) return
  const uploadPromises = Array.from(target.files).map(uploadFile)
  const res = await Promise.all(uploadPromises)
  files.value.push(...res.filter(f => f.url))
  target.value = ''
}

async function uploadFile(file: File): Promise<{ name: string; url: string; type: string; size: number }> {
  const formData = new FormData()
  formData.append('file', file)
  const userId = localStorage.getItem('userId')
  if (userId) formData.append('uploaderId', userId)
  try {
    const res = await api.post('/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
    if (res.data && res.data.success && res.data.data && res.data.data.length > 0) {
      const d = res.data.data[0]
      return { name: d.name, url: d.url, type: file.type || '', size: file.size || 0 }
    }
  } catch (e: any) {
    console.error('上传附件失败:', e)
  }
  return { name: file.name, url: '', type: file.type || '', size: file.size || 0 }
}

function removeFile(idx: number) {
  files.value.splice(idx, 1)
}

async function submit(status: 'draft' | 'submitted') {
  err.value = ''
  if (!month.value) { err.value = '请选择月份'; return }
  const content = buildContent(form.value)
  const plan = buildPlan(form.value)
  if (!content && !plan && files.value.length === 0) {
    err.value = '请至少填写一项内容或上传附件'
    return
  }
  loading.value = true
  try {
    const payload = {
      title: title.value || `${month.value}工作月报`,
      content,
      plan,
      files: files.value,
      date: month.value,
      status
    }
    const res = await api.post('/monthly-reports', payload)
    if (res.data && res.data.success) {
      alert(status === 'draft' ? '草稿已保存' : '月报提交成功')
      if (status === 'submitted') {
        form.value = emptySections()
        files.value = []
        month.value = ''
      }
    } else {
      err.value = (res.data && res.data.message) || '提交失败'
    }
  } catch (e: any) {
    err.value = e?.response?.data?.message || '网络错误'
  } finally {
    loading.value = false
  }
}

// 简单回填当月草稿：URL 带 ?month=2026-09 时预填
const urlParams = new URLSearchParams(window.location.search)
const draftMonth = urlParams.get('month')
if (draftMonth) month.value = draftMonth

// 总经理及以上角色进入即跳转历史月报（只读，不填报）
onMounted(async () => {
  await guard.refresh()
  if (guard.roleTier.value === 'gm') {
    router.replace('/monthly-report-history')
  }
})
</script>

<style scoped>
.m-page { padding-bottom: 20px; }
.m-label {
  display: block;
  font-size: 13px;
  color: #646566;
  margin: 14px 0 6px;
}
.m-label:first-of-type { margin-top: 0; }
textarea.m-input {
  padding: 8px;
  resize: vertical;
}
.file-list { margin-bottom: 8px; }
.file-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 0;
  border-top: 1px solid #f0f1f2;
  font-size: 13px;
}
.file-name { color: #185fa5; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.file-del { color: #ee0a24; font-size: 18px; padding: 0 6px; }
.err { color: #ee0a24; font-size: 12px; margin: 10px 0; }
.btn-row {
  display: flex;
  gap: 10px;
  margin-top: 16px;
}
.btn-row .m-btn { flex: 1; }
.mine-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 0;
  border-top: 1px solid #f0f1f2;
  font-size: 15px;
}
.mine-arrow { color: #969799; }
</style>
