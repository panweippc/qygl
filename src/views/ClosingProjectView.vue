<template>
  <div class="closing-page">
    <PageHeaderBar title="成交项目">
      <template #actions>
        <el-popover placement="bottom-end" :width="420" trigger="click" popper-class="cl-guide-popover">
          <template #reference>
            <el-button size="small" circle title="使用说明">
              <el-icon><QuestionFilled /></el-icon>
            </el-button>
          </template>
          <div class="cl-guide-pop">
            <p class="cl-guide-title">成交项目使用说明</p>
            <p>本页面展示销售漏斗中「成交用户」表的全部记录（含客户、负责人、销售/代理类型、合同与回款金额、联系人、站点数、备注等）。如需登记正式「成交项目」（与具体客户绑定、可纳入项目详情），请在该成交用户行使用「转为成交项目」。销售部成员与业务中心经理可新增/编辑，总经理/管理员可查看全部。</p>
          </div>
        </el-popover>
        <el-tag v-if="perm.canWrite" type="success">可维护</el-tag>
        <el-tag v-else type="info">仅查看</el-tag>
      </template>
    </PageHeaderBar>

    <DealTable :perm="perm" />

    <el-alert
      v-if="overdue.count > 0"
      class="cl-overdue-alert"
      type="error"
      show-icon
      :closable="false"
      :title="`回款超期预警：共 ${overdue.count} 笔成交未回款且已超过约定回款日期，待回款合计 ¥${fmt(overdue.totalUnreceived)}`"
    />

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
      <div class="cl-stat cl-stat-warn" :class="{ active: overdue.count > 0 }">
        <div class="cl-stat-label">回款超期</div>
        <div class="cl-stat-value" :class="overdue.count > 0 ? 'cl-neg' : ''">{{ overdue.count }} 笔</div>
      </div>
    </div>

  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { salesFetchJSON } from '../components/sales/salesApi'
import PageHeaderBar from '../components/PageHeaderBar.vue'
import DealTable from '../components/sales/DealTable.vue'
import { QuestionFilled } from '@element-plus/icons-vue'

const perm = ref({ canWrite: false, canView: false, isAdmin: false })
const summary = ref({ count: 0, contract: 0, actual: 0, received: 0, unreceived: 0 })
const summaryLoading = ref(false)
const overdue = ref({ count: 0, totalUnreceived: 0 })

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

async function loadOverdue() {
  try {
    const json = await salesFetchJSON('/api/sales-four-tables/deal/overdue')
    if (json.success && json.data) overdue.value = { count: json.data.count || 0, totalUnreceived: json.data.totalUnreceived || 0 }
  } catch (e: any) {
    console.error('加载回款超期失败:', e.message)
  }
}

function fmt(n: number): string {
  return Number(n || 0).toLocaleString()
}

onMounted(() => { loadPerm(); loadSummary(); loadOverdue() })
</script>

<style scoped>
.closing-page { background: #E4EDF2; min-height: 100vh; display: flex; flex-direction: column; }
.cl-overdue-alert { margin: 1rem 1.5rem 0; }
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
.cl-stat-warn { border-color: rgba(198,40,40,0.25); }
.cl-stat-warn.active { background: rgba(254,240,240,0.95); border-color: rgba(198,40,40,0.5); }
.cl-stat-label { font-size: 0.82rem; color: rgba(51,51,51,0.6); }
.cl-stat-value { font-size: 1.4rem; font-weight: 700; color: #333; margin-top: 0.25rem; }
.cl-stat-value.cl-pos { color: #2e7d32; }
.cl-stat-value.cl-neg { color: #c62828; }
.cl-guide-pop { padding: 0.5rem; }
.cl-guide-title { font-weight: 600; margin: 0 0 0.5rem; font-size: 1rem; color: #2c3e50; }
.cl-guide-pop p:last-child { margin: 0; line-height: 1.6; color: #4a5568; font-size: 0.9rem; }
.cl-pos { color: #2e7d32; font-weight: 600; }
.cl-neg { color: #c62828; font-weight: 600; }
.muted-cell { color: #909399; font-size: 0.85rem; }
</style>
