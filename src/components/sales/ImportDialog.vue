<template>
  <el-dialog v-model="visible" title="Excel 导入" width="500px" @close="reset">
    <p class="import-tip">请上传 .xls / .xlsx 文件。系统将自动识别表头行并导入。每次导入的数据会生成版本快照。</p>
    <el-upload
      ref="uploadRef"
      class="upload-demo"
      drag
      :action="`/api/sales-four-tables/${props.type}/import`"
      :headers="{ Authorization: `Bearer ${token}` }"
      :auto-upload="false"
      :on-success="onSuccess"
      :on-error="onError"
      :on-change="onChange"
      accept=".xls,.xlsx"
      name="file"
    >
      <el-icon class="el-icon--upload"><upload-filled /></el-icon>
      <div class="el-upload__text">拖拽文件到此处或 <em>点击上传</em></div>
    </el-upload>
    <template #footer>
      <el-button @click="visible = false">取消</el-button>
      <el-button type="primary" :loading="loading" @click="submit">开始导入</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed, h } from 'vue'
import { ElMessage } from 'element-plus'
import { UploadFilled } from '@element-plus/icons-vue'

const props = defineProps<{ modelValue: boolean, type: string }>()
const emit = defineEmits(['update:modelValue', 'success'])
const visible = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v)
})
const uploadRef = ref<any>(null)
const loading = ref(false)
const token = localStorage.getItem('token') || ''

function reset() { uploadRef.value?.clearFiles?.() }
function onChange() {}
function onSuccess(res: any) {
  loading.value = false
  if (!res.success) {
    ElMessage.error(res.message || '导入失败')
    return
  }
  const errs = Array.isArray(res.data?.errors) ? res.data.errors : []
  if (errs.length) {
    const detail = `${res.message}\n${errs.slice(0, 5).join('\n')}${errs.length > 5 ? `\n…另有 ${errs.length - 5} 条` : ''}`
    ElMessage({ type: 'warning', duration: 10000, showClose: true, message: h('div', { style: 'white-space: pre-line' }, detail) })
  } else {
    ElMessage.success(res.message)
  }
  emit('success')
  visible.value = false
}
function onError(err: any) {
  loading.value = false
  ElMessage.error('导入请求失败')
}
function submit() {
  loading.value = true
  uploadRef.value?.submit?.()
}
</script>

<style scoped>
.import-tip { color: #666; font-size: 0.9rem; margin-bottom: 1rem; line-height: 1.5; }
</style>
