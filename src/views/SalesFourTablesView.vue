<template>
  <div class="sft-page">
    <header class="sft-header">
      <div class="sft-header-left">
        <el-button text @click="router.push('/')">← 返回</el-button>
        <h2>销售漏斗</h2>
      </div>
      <div class="sft-header-right">
        <el-tag v-if="perm.canWrite" type="success">可写入</el-tag>
        <el-tag v-else type="info">仅查看</el-tag>
      </div>
    </header>

    <StatsPanel />

    <div class="sft-guide">
      <el-alert title="销售四表使用说明" type="info" :closable="false" show-icon>
        <p>本模块包含「意向漏斗、重点漏斗、成交用户、大项目进展」四张表。销售部成员和业务中心经理可在线填写或 Excel 导入；李智鑫（总经理/管理员）可查看全部数据。每次保存自动生成版本快照，支持字段级差异对比。</p>
      </el-alert>
    </div>

    <el-tabs v-model="activeTab" class="sft-tabs" @tab-change="onTabChange">
      <el-tab-pane label="意向漏斗" name="intention">
        <FunnelTable type="intention" title="意向漏斗" :perm="perm" @customer-click="openCrossRef" @progress-jump="activeTab = $event" />
      </el-tab-pane>
      <el-tab-pane label="重点漏斗" name="key">
        <FunnelTable type="key" title="重点漏斗" :perm="perm" @customer-click="openCrossRef" @progress-jump="activeTab = $event" />
      </el-tab-pane>
      <el-tab-pane label="成交用户" name="deal">
        <DealTable :perm="perm" @customer-click="openCrossRef" />
      </el-tab-pane>
      <el-tab-pane label="大项目进展" name="project">
        <ProjectTable :perm="perm" @customer-click="openCrossRef" />
      </el-tab-pane>
    </el-tabs>

    <CrossReferenceDialog v-model="crossVisible" :customer="crossCustomer" @jump="onCrossJump" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { salesFetchJSON } from '../components/sales/salesApi'
import StatsPanel from '../components/sales/StatsPanel.vue'
import CrossReferenceDialog from '../components/sales/CrossReferenceDialog.vue'
import FunnelTable from '../components/sales/FunnelTable.vue'
import DealTable from '../components/sales/DealTable.vue'
import ProjectTable from '../components/sales/ProjectTable.vue'

const router = useRouter()
const activeTab = ref('intention')
const perm = ref({ canWrite: false, canView: false, isAdmin: false })
const crossVisible = ref(false)
const crossCustomer = ref('')

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

function onTabChange() {}

function openCrossRef(customer: string) {
  crossCustomer.value = customer
  crossVisible.value = true
}

function onCrossJump({ type, id }: { type: string, id: number }) {
  crossVisible.value = false
  activeTab.value = type
  // 子表格加载后通过事件或 provide 滚动到对应行较复杂，先切换标签页让用户定位
}

onMounted(loadPerm)
</script>

<style scoped>
.sft-page { background: #E4EDF2; min-height: 100vh; display: flex; flex-direction: column; }
.sft-header {
  background: rgba(255,255,255,0.9);
  border-bottom: 1px solid rgba(100,149,237,0.3);
  padding: 0.6rem 1.5rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.sft-header-left { display: flex; align-items: center; gap: 1rem; }
.sft-header-left h2 { margin: 0; font-size: 1.25rem; color: #333; }
.sft-header-right { display: flex; gap: 0.5rem; }
.sft-guide { padding: 0.75rem 1.5rem; background: rgba(255,255,255,0.6); }
.sft-guide p { margin: 0.4rem 0 0; line-height: 1.6; color: #4a5568; font-size: 0.9rem; }
.sft-tabs { flex: 1; padding: 0 1.5rem 1.5rem; background: rgba(255,255,255,0.6); }
</style>
