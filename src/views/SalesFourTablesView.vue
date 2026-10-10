<template>
  <div class="sft-page">
    <PageHeaderBar title="销售漏斗">
      <template #actions>
        <el-button v-if="perm.canWrite" size="small" @click="openCleanup">清理版本快照</el-button>
        <el-tag v-if="perm.canWrite" type="success">可写入</el-tag>
        <el-tag v-else type="info">仅查看</el-tag>
      </template>
    </PageHeaderBar>

    <StatsPanel ref="statsPanelRef" />

    <div class="sft-guide">
      <el-alert title="销售四表使用说明" type="info" :closable="false" show-icon>
        <p>本模块包含「意向漏斗、重点漏斗、成交用户、大项目进展」四张表。销售部成员和业务中心经理可在线填写或 Excel 导入；李智鑫（总经理/管理员）可查看全部数据。每次保存自动生成版本快照，支持字段级差异对比。</p>
      </el-alert>
    </div>

    <el-tabs v-model="activeTab" class="sft-tabs" @tab-change="onTabChange">
      <el-tab-pane label="意向漏斗" name="intention">
        <FunnelTable ref="intentionRef" type="intention" title="意向漏斗" :perm="perm" @customer-click="openCrossRef" @progress-jump="onProgressJump" @refresh-stats="onDataChanged" @open-visit-records="openVisitRecords" />
      </el-tab-pane>
      <el-tab-pane label="重点漏斗" name="key">
        <FunnelTable ref="keyRef" type="key" title="重点漏斗" :perm="perm" @customer-click="openCrossRef" @progress-jump="onProgressJump" @refresh-stats="onDataChanged" @open-visit-records="openVisitRecords" />
      </el-tab-pane>
      <el-tab-pane label="成交用户" name="deal">
        <DealTable ref="dealRef" :perm="perm" @customer-click="openCrossRef" @refresh-stats="onDataChanged" @open-visit-records="openVisitRecords" />
      </el-tab-pane>
      <el-tab-pane label="大项目进展" name="project">
        <ProjectTable ref="projectRef" :perm="perm" @customer-click="openCrossRef" @refresh-stats="onDataChanged" @open-visit-records="openVisitRecords" />
      </el-tab-pane>
    </el-tabs>

    <CrossReferenceDialog v-model="crossVisible" :customer="crossCustomer" @jump="onCrossJump" />
    <VisitRecordsDialog v-model="visitRecordsVisible" :customer-name="visitCustomer" :can-write="perm.canWrite" />

    <el-dialog v-model="cleanupVisible" title="清理版本快照" width="480px">
      <p class="cleanup-tip">
        每次保存都会生成版本快照，长期运行会使 <code>sales_table_versions</code> 膨胀。
        本操作为每一条记录仅保留最新的 <strong>{{ cleanupKeep }}</strong> 个版本，删除更早的历史快照（不可恢复）。
      </p>
      <el-form label-width="120px">
        <el-form-item label="保留版本数">
          <el-input-number v-model="cleanupKeep" :min="1" :max="50" style="width:100%" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="cleanupVisible = false">取消</el-button>
        <el-button type="primary" :loading="cleaning" @click="submitCleanup">开始清理</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { salesFetchJSON } from '../components/sales/salesApi'
import PageHeaderBar from '../components/PageHeaderBar.vue'
import StatsPanel from '../components/sales/StatsPanel.vue'
import CrossReferenceDialog from '../components/sales/CrossReferenceDialog.vue'
import FunnelTable from '../components/sales/FunnelTable.vue'
import DealTable from '../components/sales/DealTable.vue'
import ProjectTable from '../components/sales/ProjectTable.vue'
import VisitRecordsDialog from '../components/sales/VisitRecordsDialog.vue'

const activeTab = ref('intention')
const perm = ref({ canWrite: false, canView: false, isAdmin: false })
const crossVisible = ref(false)
const crossCustomer = ref('')
const statsPanelRef = ref<any>(null)
const intentionRef = ref<any>(null)
const keyRef = ref<any>(null)
const dealRef = ref<any>(null)
const projectRef = ref<any>(null)
const visitRecordsVisible = ref(false)
const visitCustomer = ref('')

// 版本快照清理
const cleanupVisible = ref(false)
const cleanupKeep = ref(20)
const cleaning = ref(false)
function openCleanup() {
  cleanupKeep.value = 20
  cleanupVisible.value = true
}
async function submitCleanup() {
  try {
    await ElMessageBox.confirm(
      `确认清理？每一条记录仅保留最新 ${cleanupKeep.value} 个版本，更早的历史快照将被永久删除。`,
      '清理版本快照',
      { type: 'warning', confirmButtonText: '确认清理', cancelButtonText: '取消' }
    )
  } catch {
    return
  }
  cleaning.value = true
  try {
    const json = await salesFetchJSON('/api/sales-four-tables/cleanup-versions', {
      method: 'POST',
      body: JSON.stringify({ keep: cleanupKeep.value })
    })
    if (json.success) {
      ElMessage.success(json.message)
      cleanupVisible.value = false
    } else {
      ElMessage.error(json.message || '清理失败')
    }
  } catch (e: any) {
    ElMessage.error('清理失败: ' + e.message)
  } finally {
    cleaning.value = false
  }
}

function openVisitRecords(name: string) {
  visitCustomer.value = name
  visitRecordsVisible.value = true
}

const tableRefMap = () => ({
  intention: intentionRef.value,
  key: keyRef.value,
  deal: dealRef.value,
  project: projectRef.value
})

function refreshStats() {
  statsPanelRef.value?.load()
}

/** 任一页签保存/导入/删除后：刷新统计 + 全部四张表
 *  （漏斗记录会按进展百分比跨表迁移，只刷当前页签会导致目标表数据陈旧） */
function onDataChanged() {
  refreshStats()
  Object.values(tableRefMap()).forEach((r: any) => r?.load?.())
}

/** 当前激活页签的数据重载（跨表迁移跳转后目标表立即取最新数据） */
function reloadActiveTab() {
  const name = activeTab.value
  tableRefMap()[name]?.load?.()
}

function onProgressJump(dest: string) {
  activeTab.value = dest
  reloadActiveTab()
}

async function loadPerm() {
  try {
    const json = await salesFetchJSON('/api/sales-four-tables/permission')
    if (json.success && json.data) {
      perm.value = {
        canWrite: Boolean(json.data.canWrite),
        canView: Boolean(json.data.canView || json.data.isOwnerFilter),
        isAdmin: Boolean(json.data.isAdmin)
      }
    }
  } catch (e: any) {
    // 无权限时保持仅查看 false
    console.error('获取销售漏斗权限失败:', e.message)
  }
}

function onTabChange() {
  // 切换到某页签时拉取该表最新数据，避免展示其它端/其它页签操作后的陈旧列表
  reloadActiveTab()
}

function openCrossRef(customer: string) {
  crossCustomer.value = customer
  crossVisible.value = true
}

function onCrossJump({ type, id }: { type: string, id: number }) {
  crossVisible.value = false
  activeTab.value = type
  reloadActiveTab()
  // 子表格加载后通过事件或 provide 滚动到对应行较复杂，先切换标签页让用户定位
}

onMounted(loadPerm)
</script>

<style scoped>
.sft-page { background: #E4EDF2; min-height: 100vh; display: flex; flex-direction: column; }
.sft-guide { padding: 0.75rem 1.5rem; background: rgba(255,255,255,0.6); }
.sft-guide p { margin: 0.4rem 0 0; line-height: 1.6; color: #4a5568; font-size: 0.9rem; }
.sft-tabs { flex: 1; padding: 0 1.5rem 1.5rem; background: rgba(255,255,255,0.6); }
.cleanup-tip { color: #666; font-size: 0.9rem; line-height: 1.6; margin: 0 0 1rem; }
.cleanup-tip code { background: #f0f2f5; padding: 1px 5px; border-radius: 3px; }
</style>
