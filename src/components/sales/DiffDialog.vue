<template>
  <el-dialog v-model="visible" title="版本对比" width="700px">
    <div v-if="versions.length < 2" class="diff-empty">该记录版本数不足 2，无法对比。</div>
    <div v-else>
      <div class="diff-select">
        <span>对比</span>
        <el-select v-model="v1" style="width:120px">
          <el-option v-for="v in versions" :key="v.version" :label="`v${v.version}`" :value="v.version" />
        </el-select>
        <span>与</span>
        <el-select v-model="v2" style="width:120px">
          <el-option v-for="v in versions" :key="v.version" :label="`v${v.version}`" :value="v.version" />
        </el-select>
        <el-button type="primary" size="small" @click="loadDiff">对比</el-button>
      </div>
      <el-table :data="diffs" stripe style="width:100%" max-height="400">
        <el-table-column prop="field" label="字段" width="160" />
        <el-table-column prop="old" label="旧值" min-width="180">
          <template #default="{ row }"><span class="diff-old">{{ row.old }}</span></template>
        </el-table-column>
        <el-table-column prop="new" label="新值" min-width="180">
          <template #default="{ row }"><span class="diff-new">{{ row.new }}</span></template>
        </el-table-column>
      </el-table>
    </div>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { salesFetchJSON } from './salesApi'

const props = defineProps<{ modelValue: boolean, type: string, recordId: number | null }>()
const emit = defineEmits(['update:modelValue'])
const visible = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v)
})
const versions = ref<any[]>([])
const diffs = ref<any[]>([])
const v1 = ref<number | null>(null)
const v2 = ref<number | null>(null)

async function loadVersions() {
  if (!props.recordId) return
  const json = await salesFetchJSON(`/api/sales-four-tables/${props.type}/${props.recordId}/versions`)
  if (json.success) {
    versions.value = json.data
    if (versions.value.length >= 2) {
      v1.value = versions.value[0].version
      v2.value = versions.value[1].version
      await loadDiff()
    }
  }
}

async function loadDiff() {
  if (!props.recordId || !v1.value || !v2.value) return
  const json = await salesFetchJSON(`/api/sales-four-tables/${props.type}/${props.recordId}/diff?v1=${v1.value}&v2=${v2.value}`)
  if (json.success) diffs.value = json.data
  else ElMessage.error(json.message || '对比失败')
}

watch(visible, (v) => { if (v) loadVersions() })
watch(() => props.recordId, () => { if (visible.value) loadVersions() })
</script>

<style scoped>
.diff-empty { text-align: center; color: #999; padding: 2rem; }
.diff-select { display: flex; align-items: center; gap: 0.5rem; margin-bottom: 1rem; }
.diff-old { color: #c0392b; background: #ffeaea; padding: 0.1rem 0.3rem; border-radius: 3px; word-break: break-all; }
.diff-new { color: #27ae60; background: #eafff2; padding: 0.1rem 0.3rem; border-radius: 3px; word-break: break-all; }
</style>
