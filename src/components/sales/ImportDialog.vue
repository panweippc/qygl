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
import { ref, computed } from 'vue'
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
  if (res.success) {
    ElMessage.success(res.message)
    emit('success')
    visible.value = false
  } else {
    ElMessage.error(res.message || '导入失败')
  }
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
