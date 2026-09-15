<template>
  <div class="closing-page">
    <header class="cl-header">
      <div class="cl-header-left">
        <el-button text @click="router.push('/')">← 返回</el-button>
        <h2>成交项目</h2>
      </div>
      <div class="cl-header-right">
        <el-tag v-if="perm.canWrite" type="success">可维护</el-tag>
        <el-tag v-else type="info">仅查看</el-tag>
      </div>
    </header>

    <div class="cl-summary" v-loading="summaryLoading">
      <div class="cl-stat">
        <div class="cl-stat-label">成交总数</div>
        <div class="cl-stat-value">{{ summary.count }}</div>
      </div>
      <div class="cl-stat">
        <div class="cl-stat-label">合同总额</div>
        <div class="cl-stat-value">¥{{ fmt(summary.contract) }}</div>
      </div>
      <div class="cl-stat">
        <div class="cl-stat-label">实际金额</div>
        <div class="cl-stat-value">¥{{ fmt(summary.actual) }}</div>
      </div>
      <div class="cl-stat">
        <div class="cl-stat-label">已回款</div>
        <div class="cl-stat-value cl-pos">¥{{ fmt(summary.received) }}</div>
      </div>
      <div class="cl-stat">
        <div class="cl-stat-label">未回款</div>
        <div class="cl-stat-value cl-neg">¥{{ fmt(summary.unreceived) }}</div>
      </div>
    </div>

    <div class="cl-guide">
      <el-alert title="说明" type="info" :closable="false" show-icon>
        <p>本页面为「成交项目」独立视图，展示销售漏斗中「成交用户」表的全部项目信息，含客户、负责人、销售/代理类型、合同与回款金额、联系人、站点数、备注等详细内容。销售部成员与业务中心经理可新增/编辑，总经理/管理员可查看全部。</p>
      </el-alert>
    </div>

    <DealTable :perm="perm" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { salesFetchJSON } from '../components/sales/salesApi'
import DealTable from '../components/sales/DealTable.vue'

const router = useRouter()
const perm = ref({ canWrite: false, canView: false, isAdmin: false })
const summary = ref({ count: 0, contract: 0, actual: 0, received: 0, unreceived: 0 })
const summaryLoading = ref(false)

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
    console.error('获取成交项目权限失败:', e.message)
  }
}

async function loadSummary() {
  summaryLoading.value = true
  try {
    const json = await salesFetchJSON('/api/sales-four-tables/deal?pageSize=10000')
    if (json.success && json.data?.list) {
      const list = json.data.list
      summary.value = {
        count: list.length,
        contract: list.reduce((s: number, r: any) => s + Number(r.contract_amount || 0), 0),
        actual: list.reduce((s: number, r: any) => s + Number(r.actual_amount || 0), 0),
        received: list.reduce((s: number, r: any) => s + Number(r.received_amount || 0), 0),
        unreceived: list.reduce((s: number, r: any) => s + Number(r.unreceived_amount || 0), 0)
      }
    }
  } catch (e: any) {
    console.error('加载成交项目汇总失败:', e.message)
  } finally {
    summaryLoading.value = false
  }
}

function fmt(n: number): string {
  return Number(n || 0).toLocaleString()
}

onMounted(() => { loadPerm(); loadSummary() })
</script>

<style scoped>
.closing-page { background: #E4EDF2; min-height: 100vh; display: flex; flex-direction: column; }
.cl-header {
  background: rgba(255,255,255,0.9);
  border-bottom: 1px solid rgba(30, 90, 168,0.3);
  padding: 0.6rem 1.5rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.cl-header-left { display: flex; align-items: center; gap: 1rem; }
.cl-header-left h2 { margin: 0; font-size: 1.25rem; color: #333; }
.cl-header-right { display: flex; gap: 0.5rem; }
.cl-summary {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
  padding: 1rem 1.5rem 0;
}
.cl-stat {
  flex: 1 1 160px;
  background: rgba(255,255,255,0.95);
  border: 1px solid rgba(30, 90, 168,0.25);
  border-radius: 10px;
  padding: 0.8rem 1rem;
  box-shadow: 0 2px 8px rgba(0,0,0,0.06);
}
.cl-stat-label { font-size: 0.82rem; color: rgba(51,51,51,0.6); }
.cl-stat-value { font-size: 1.4rem; font-weight: 700; color: #333; margin-top: 0.25rem; }
.cl-stat-value.cl-pos { color: #2e7d32; }
.cl-stat-value.cl-neg { color: #c62828; }
.cl-guide { padding: 0.75rem 1.5rem; background: rgba(255,255,255,0.6); }
.cl-guide p { margin: 0.4rem 0 0; line-height: 1.6; color: #4a5568; font-size: 0.9rem; }
</style>
