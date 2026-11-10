<template>
  <div class="sft-page">
    <PageHeaderBar title="销售漏斗">
      <template #actions>
        <el-popover placement="bottom-end" :width="380" trigger="click" popper-class="sft-guide-popover">
          <template #reference>
            <el-button size="small" circle title="使用说明">
              <el-icon><QuestionFilled /></el-icon>
            </el-button>
          </template>
          <div class="sft-guide-pop">
            <p class="sft-guide-title">销售四表使用说明</p>
            <p>本模块包含「意向漏斗、重点漏斗、成交用户、大项目进展」四张表。销售部成员和业务中心经理可在线填写或 Excel 导入；李智鑫（总经理/管理员）可查看全部数据。每次保存自动生成版本快照，支持字段级差异对比。</p>
          </div>
        </el-popover>
        <el-button size="small" type="primary" @click="openExport">导出 Excel</el-button>
        <el-button v-if="perm.canWrite" size="small" @click="openCleanup">清理版本快照</el-button>
        <el-button v-if="perm.canWrite" size="small" type="warning" @click="batchTransferVisible = true">批量转交（离职交接）</el-button>
        <el-tag v-if="perm.canWrite" type="success">可写入</el-tag>
        <el-tag v-else type="info">仅查看</el-tag>
      </template>
    </PageHeaderBar>

    <StatsPanel ref="statsPanelRef" />

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
    <TransferDialog v-model="batchTransferVisible" mode="batch" @done="onBatchTransferDone" />

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

    <el-dialog v-model="exportVisible" title="导出 Excel" width="520px">
      <el-form label-width="100px">
        <el-form-item label="导出表">
          <el-select v-model="exportForm.type" style="width:100%">
            <el-option label="意向漏斗" value="intention" />
            <el-option label="重点漏斗" value="key" />
            <el-option label="成交用户" value="deal" />
            <el-option label="大项目进展" value="project" />
          </el-select>
        </el-form-item>
        <el-form-item label="申报月份"><el-input v-model="exportForm.month" placeholder="如 2024-07，留空导出全部" /></el-form-item>
        <el-form-item label="负责人"><el-input v-model="exportForm.owner" placeholder="留空导出全部" /></el-form-item>
        <el-form-item label="关键词"><el-input v-model="exportForm.keyword" placeholder="客户 / 合作伙伴 / 项目名称" /></el-form-item>
        <el-form-item label="销售类型">
          <el-select v-model="exportForm.sales_type" clearable placeholder="全部" style="width:100%">
            <el-option v-for="o in SALES_TYPE_OPTIONS" :key="o" :label="o" :value="o" />
          </el-select>
        </el-form-item>
        <el-form-item label="收入类型">
          <el-select v-model="exportForm.revenue_type" clearable placeholder="全部" style="width:100%">
            <el-option v-for="o in REVENUE_TYPE_OPTIONS" :key="o" :label="o" :value="o" />
          </el-select>
        </el-form-item>
        <el-form-item label="文件名"><el-input v-model="exportForm.filename" placeholder="可自定义，自动补 .xlsx" /></el-form-item>
      </el-form>
      <p style="margin:4px 0 0;color:#909399;font-size:12px;line-height:1.6">
        点击「开始导出」后可自行选择保存位置与文件名（浏览器支持时）；不支持的浏览器直接下载。每次导出均记入操作日志。
      </p>
      <template #footer>
        <el-button @click="exportVisible = false">取消</el-button>
        <el-button type="primary" :loading="exporting" @click="doExport">开始导出</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { QuestionFilled } from '@element-plus/icons-vue'
import { salesFetchJSON, exportSalesExcel } from '../components/sales/salesApi'
import { SALES_TYPE_OPTIONS, REVENUE_TYPE_OPTIONS } from '../components/sales/salesConstants'
import PageHeaderBar from '../components/PageHeaderBar.vue'
import StatsPanel from '../components/sales/StatsPanel.vue'
import CrossReferenceDialog from '../components/sales/CrossReferenceDialog.vue'
import FunnelTable from '../components/sales/FunnelTable.vue'
import DealTable from '../components/sales/DealTable.vue'
import ProjectTable from '../components/sales/ProjectTable.vue'
import VisitRecordsDialog from '../components/sales/VisitRecordsDialog.vue'
import TransferDialog from '../components/sales/TransferDialog.vue'

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
const batchTransferVisible = ref(false)

// 导出：可选表 / 筛选条件 / 文件名，并尽量让用户自己选保存位置
const TYPE_LABELS: Record<string, string> = { intention: '意向漏斗', key: '重点漏斗', deal: '成交用户', project: '大项目进展' }
const exportVisible = ref(false)
const exporting = ref(false)
const emptyExportForm = () => ({
  type: activeTab.value, month: '', owner: '', keyword: '', sales_type: '', revenue_type: '', filename: ''
})
const exportForm = ref(emptyExportForm())
function openExport() {
  exportForm.value = {
    ...emptyExportForm(),
    filename: `${TYPE_LABELS[activeTab.value]}-${new Date().toISOString().slice(0, 10)}.xlsx`
  }
  exportVisible.value = true
}
async function doExport() {
  exporting.value = true
  try {
    const f = exportForm.value
    const name = f.filename || `${TYPE_LABELS[f.type] || f.type}-${new Date().toISOString().slice(0, 10)}.xlsx`
    const r = await exportSalesExcel({
      type: f.type,
      filename: name,
      filters: { month: f.month, owner: f.owner, keyword: f.keyword, sales_type: f.sales_type, revenue_type: f.revenue_type }
    })
    if (r.ok) { ElMessage.success('导出成功'); exportVisible.value = false }
    else if (r.message !== '已取消') ElMessage.error(r.message || '导出失败')
  } finally { exporting.value = false }
}

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

function onBatchTransferDone() {
  // 离职交接影响多表多记录，刷新统计与全部四张表
  onDataChanged()
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
.sft-guide-pop { padding: 0.5rem; }
.sft-guide-title { font-weight: 600; margin: 0 0 0.5rem; font-size: 1rem; color: #2c3e50; }
.sft-guide-pop p:last-child { margin: 0; line-height: 1.6; color: #4a5568; font-size: 0.9rem; }
.sft-tabs { flex: 1; padding: 0 1.5rem 1.5rem; background: rgba(255,255,255,0.6); }
.cleanup-tip { color: #666; font-size: 0.9rem; line-height: 1.6; margin: 0 0 1rem; }
.cleanup-tip code { background: #f0f2f5; padding: 1px 5px; border-radius: 3px; }
</style>
