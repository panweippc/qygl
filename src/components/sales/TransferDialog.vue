<template>
  <el-dialog v-model="visible" :title="dialogTitle" width="460px" align-center destroy-on-close>
    <el-alert
      v-if="mode === 'single'"
      :title="`当前负责人：${ currentOwner || '(空)' }`"
      type="info"
      :closable="false"
      style="margin-bottom:12px"
    />
    <el-alert
      v-else
      title="将某负责人的全部销售记录（意向/重点/成交/大项目）统一转交给新负责人"
      type="warning"
      :closable="false"
      style="margin-bottom:12px"
    />
    <el-form label-width="96px">
      <el-form-item v-if="mode === 'batch'" label="原负责人">
        <el-input v-model="form.oldOwner" placeholder="待交接的负责人姓名" />
      </el-form-item>
      <el-form-item label="新负责人">
        <el-input v-model="form.newOwner" :placeholder="mode === 'batch' ? '接收人姓名' : '转交给谁'" />
      </el-form-item>
      <el-form-item label="转交原因">
        <el-input v-model="form.reason" type="textarea" :rows="3" placeholder="选填：如离职交接、区域调整" />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="visible = false">取消</el-button>
      <el-button type="primary" :loading="submitting" @click="submit">确认转交</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { salesFetchJSON } from './salesApi'

const props = defineProps<{
  modelValue: boolean
  mode?: 'single' | 'batch'
  type?: string
  id?: number | null
  customerName?: string
  currentOwner?: string
}>()
const emit = defineEmits(['update:modelValue', 'done'])

const visible = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v)
})
const form = ref({ oldOwner: '', newOwner: '', reason: '' })
const submitting = ref(false)
const dialogTitle = computed(() => (props.mode === 'batch' ? '批量转交（离职交接）' : '负责人转交'))

watch(visible, (v) => {
  if (v) form.value = { oldOwner: '', newOwner: '', reason: '' }
})

async function submit() {
  submitting.value = true
  try {
    if (props.mode === 'batch') {
      if (!form.value.oldOwner.trim()) { ElMessage.warning('请填写原负责人'); return }
      if (!form.value.newOwner.trim()) { ElMessage.warning('请填写新负责人'); return }
      const json = await salesFetchJSON('/api/sales-four-tables/batch-transfer', {
        method: 'POST',
        body: JSON.stringify({ oldOwner: form.value.oldOwner, newOwner: form.value.newOwner, reason: form.value.reason })
      })
      if (json.success) {
        ElMessage.success(json.message)
        visible.value = false
        emit('done')
      } else ElMessage.error(json.message || '批量转交失败')
    } else {
      if (!form.value.newOwner.trim()) { ElMessage.warning('请填写新负责人'); return }
      const json = await salesFetchJSON(`/api/sales-four-tables/${props.type}/${props.id}/transfer`, {
        method: 'POST',
        body: JSON.stringify({ newOwner: form.value.newOwner, reason: form.value.reason })
      })
      if (json.success) {
        ElMessage.success(json.message)
        visible.value = false
        emit('done')
      } else ElMessage.error(json.message || '转交失败')
    }
  } catch (e: any) {
    ElMessage.error('转交失败: ' + (e?.message || ''))
  } finally {
    submitting.value = false
  }
}
</script>
