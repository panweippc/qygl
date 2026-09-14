<template>
  <el-dialog v-model="visible" :title="(customerName || '') + ' · 拜访记录'" width="640px" align-center destroy-on-close>
    <div v-loading="loading">
      <p v-if="!customerName" class="hint">未关联客户</p>
      <template v-else>
        <div class="vr-head">
          <span class="vr-count">共 {{ list.length }} 条</span>
          <el-button v-if="canWrite" type="primary" size="small" @click="showForm = !showForm">+ 新增拜访</el-button>
        </div>
        <el-table :data="list" stripe style="width:100%; margin-bottom:12px;" max-height="260">
          <el-table-column prop="visitDate" label="拜访日期" width="110" />
          <el-table-column prop="visitPerson" label="拜访人" width="90" />
          <el-table-column prop="visitContent" label="内容" min-width="140" show-overflow-tooltip />
          <el-table-column prop="nextPlan" label="下一步" min-width="120" show-overflow-tooltip />
        </el-table>

        <div v-if="showForm" class="vr-form">
          <el-form :model="form" label-width="80px">
            <el-form-item label="拜访日期"><el-date-picker v-model="form.visitDate" value-format="YYYY-MM-DD" style="width:100%" /></el-form-item>
            <el-form-item label="拜访人"><el-input v-model="form.visitPerson" /></el-form-item>
            <el-form-item label="拜访内容"><el-input v-model="form.visitContent" type="textarea" :rows="2" /></el-form-item>
            <el-form-item label="下一步"><el-input v-model="form.nextPlan" type="textarea" :rows="2" /></el-form-item>
            <el-form-item label="地址"><el-input v-model="form.address" /></el-form-item>
            <el-form-item>
              <el-button @click="showForm = false">取消</el-button>
              <el-button type="primary" :loading="saving" @click="save">保存</el-button>
            </el-form-item>
          </el-form>
        </div>
      </template>
    </div>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { salesFetchJSON } from './salesApi'

const props = defineProps<{ modelValue: boolean, customerName: string, canWrite?: boolean }>()
const emit = defineEmits(['update:modelValue'])
const visible = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v)
})
const list = ref<any[]>([])
const loading = ref(false)
const showForm = ref(false)
const saving = ref(false)
const emptyForm = () => ({ visitDate: '', visitPerson: '', visitContent: '', nextPlan: '', address: '' })
const form = ref<any>(emptyForm())

async function loadList() {
  if (!props.customerName) { list.value = []; return }
  loading.value = true
  try {
    const json = await salesFetchJSON(`/api/visit-records/customer/${encodeURIComponent(props.customerName)}`)
    if (json.success) list.value = json.data || []
  } catch (e: any) { ElMessage.error('加载拜访记录失败: ' + e.message) }
  finally { loading.value = false }
}

watch(() => props.modelValue, (v) => { if (v) { showForm.value = false; loadList() } })

async function save() {
  if (!form.value.visitDate || !form.value.visitPerson || !form.value.visitContent) {
    ElMessage.warning('拜访日期、拜访人、拜访内容为必填'); return
  }
  saving.value = true
  try {
    const json = await salesFetchJSON('/api/visit-records', {
      method: 'POST',
      body: JSON.stringify({ ...form.value, customerName: props.customerName, townId: null })
    })
    if (json.success) { ElMessage.success('保存成功'); form.value = emptyForm(); showForm.value = false; loadList() }
    else ElMessage.error(json.message || '保存失败')
  } catch (e: any) { ElMessage.error('保存失败: ' + e.message) }
  finally { saving.value = false }
}
</script>

<style scoped>
.vr-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
.vr-count { font-size: 13px; color: #909399; }
.vr-form { border: 1px solid #ebeef5; border-radius: 8px; padding: 12px; margin-top: 8px; }
.hint { color: #909399; font-size: 13px; }
</style>
