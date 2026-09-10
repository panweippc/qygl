<template>
  <div class="ft-panel">
    <div class="ft-toolbar">
      <div class="ft-filters">
        <el-input v-model="filter.keyword" placeholder="客户名称" clearable style="width:200px" @keyup.enter="load" />
        <el-input v-model="filter.month" placeholder="申报月份 如 2024-07" clearable style="width:160px" @keyup.enter="load" />
        <el-button type="primary" @click="load">查询</el-button>
      </div>
      <div class="ft-actions">
        <el-button v-if="perm.canWrite" type="primary" @click="openEdit()">+ 新增</el-button>
      </div>
    </div>

    <el-table :data="list" v-loading="loading" stripe style="width:100%">
      <el-table-column type="index" width="50" />
      <el-table-column prop="customer_name" label="客户名称" min-width="160" show-overflow-tooltip>
        <template #default="{ row }">
          <el-button link size="small" @click.stop="emit('customer-click', row.customer_name)">{{ row.customer_name }}</el-button>
        </template>
      </el-table-column>
      <el-table-column prop="unit_nature" label="单位性质" width="120" />
      <el-table-column prop="report_date" label="日期" width="110" />
      <el-table-column prop="project_owner" label="项目负责人" width="120" />
      <el-table-column prop="project_budget" label="项目预算" width="120" />
      <el-table-column prop="report_month" label="申报月份" width="100" />
      <el-table-column label="操作" width="160" fixed="right">
        <template #default="{ row }">
          <el-button text size="small" @click="openEdit(row)">编辑</el-button>
          <el-button text size="small" @click="openVersions(row)">版本</el-button>
          <el-button v-if="perm.canWrite" text size="small" type="danger" @click="remove(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-pagination v-if="total > pageSize" v-model:current-page="page" :page-size="pageSize" :total="total" layout="prev,pager,next" class="ft-pagination" @current-change="load" />

    <el-dialog v-model="editVisible" :title="editForm.id ? '编辑大项目进展' : '新增大项目进展'" width="700px" align-center destroy-on-close>
      <div class="dialog-body">
        <el-tabs v-model="projectTab">
        <el-tab-pane label="客户全貌" name="base">
          <el-form :model="editForm" label-width="130px">
            <el-form-item label="客户名称"><el-input v-model="editForm.customer_name" /></el-form-item>
            <el-form-item label="申报日期"><el-date-picker v-model="editForm.report_date" value-format="YYYY-MM-DD" style="width:100%" /></el-form-item>
            <el-form-item label="单位性质"><el-input v-model="editForm.unit_nature" /></el-form-item>
            <el-form-item label="人员规模"><el-input v-model="editForm.staff_size" /></el-form-item>
            <el-form-item label="资金状况"><el-input v-model="editForm.financial_status" type="textarea" :rows="2" /></el-form-item>
            <el-form-item label="现有网络覆盖"><el-input v-model="editForm.network_coverage" type="textarea" :rows="2" /></el-form-item>
            <el-form-item label="服务器及机房"><el-input v-model="editForm.server_room" type="textarea" :rows="2" /></el-form-item>
            <el-form-item label="是否用友老客户"><el-input v-model="editForm.is_uf_customer" /></el-form-item>
            <el-form-item label="信息化规划"><el-input v-model="editForm.informatization_plan" type="textarea" :rows="2" /></el-form-item>
            <el-form-item label="3-5年规划"><el-input v-model="editForm.plan_3_5_years" type="textarea" :rows="2" /></el-form-item>
            <el-form-item label="信息化项目预算"><el-input v-model="editForm.project_budget" /></el-form-item>
            <el-form-item label="客户其他情况"><el-input v-model="editForm.other_intro" type="textarea" :rows="3" /></el-form-item>
          </el-form>
        </el-tab-pane>
        <el-tab-pane label="关键人物" name="persons">
          <div v-for="(p, idx) in editForm.key_persons" :key="idx" class="sub-section">
            <div class="sub-title">{{ p.role_type }} <el-button text size="small" type="danger" @click="editForm.key_persons.splice(idx,1)">删除</el-button></div>
            <el-form label-width="100px">
              <el-form-item label="角色"><el-input v-model="p.role_type" /></el-form-item>
              <el-form-item label="职务"><el-input v-model="p.position" /></el-form-item>
              <el-form-item label="姓名"><el-input v-model="p.name" /></el-form-item>
              <el-form-item label="电话"><el-input v-model="p.phone" /></el-form-item>
              <el-form-item label="办公室"><el-input v-model="p.office" /></el-form-item>
              <el-form-item label="支持度"><el-input v-model="p.support_level" /></el-form-item>
              <el-form-item label="受谁影响"><el-input v-model="p.influenced_by" /></el-form-item>
              <el-form-item label="能影响谁"><el-input v-model="p.can_influence" /></el-form-item>
              <el-form-item label="关注焦点"><el-input v-model="p.focus" type="textarea" :rows="2" /></el-form-item>
              <el-form-item label="关系"><el-input v-model="p.relationship" type="textarea" :rows="2" /></el-form-item>
              <el-form-item label="私人喜好"><el-input v-model="p.personal_hobby" type="textarea" :rows="2" /></el-form-item>
            </el-form>
          </div>
          <el-button type="primary" size="small" @click="addPerson">+ 添加关键人物</el-button>
        </el-tab-pane>
        <el-tab-pane label="项目背景/需求" name="bg">
          <el-form :model="editForm" label-width="150px">
            <el-form-item label="项目立项时间"><el-input v-model="editForm.project_start_time" /></el-form-item>
            <el-form-item label="项目负责人"><el-input v-model="editForm.project_owner" /></el-form-item>
            <el-form-item label="领导是否重视"><el-input v-model="editForm.leader_attention" /></el-form-item>
            <el-form-item label="准备上线模块"><el-input v-model="editForm.planned_online_modules" type="textarea" :rows="2" /></el-form-item>
            <el-form-item label="是否招投标"><el-input v-model="editForm.is_bidding" /></el-form-item>
            <el-form-item label="可扩展模块"><el-input v-model="editForm.expandable_modules" type="textarea" :rows="2" /></el-form-item>
            <el-form-item label="项目价值"><el-input v-model="editForm.project_value" type="textarea" :rows="3" /></el-form-item>
            <el-form-item label="客户对功能需求"><el-input v-model="editForm.func_requirements" type="textarea" :rows="3" /></el-form-item>
            <el-form-item label="最重要功能需求"><el-input v-model="editForm.key_func_requirement" type="textarea" :rows="2" /></el-form-item>
            <el-form-item label="迫切需要解决"><el-input v-model="editForm.urgent_problems" type="textarea" :rows="2" /></el-form-item>
            <el-form-item label="是否认可产品化"><el-input v-model="editForm.accept_product_delivery" /></el-form-item>
            <el-form-item label="是否需要二次开发"><el-input v-model="editForm.need_secondary_dev" /></el-form-item>
            <el-form-item label="功能偏差"><el-input v-model="editForm.func_deviation" type="textarea" :rows="2" /></el-form-item>
          </el-form>
        </el-tab-pane>
        <el-tab-pane label="商务/竞争/风险" name="biz">
          <el-form :model="editForm" label-width="150px">
            <el-form-item label="当前进展情况"><el-input v-model="editForm.current_progress" type="textarea" :rows="3" /></el-form-item>
            <el-form-item label="客户对我们的评价"><el-input v-model="editForm.customer_evaluation" type="textarea" :rows="2" /></el-form-item>
            <el-form-item label="我们的优劣势"><el-input v-model="editForm.our_pros_cons" type="textarea" :rows="2" /></el-form-item>
            <el-form-item label="目前困难"><el-input v-model="editForm.current_difficulties" type="textarea" :rows="2" /></el-form-item>
            <el-form-item label="售前支持内容"><el-input v-model="editForm.pre_support_content" type="textarea" :rows="2" /></el-form-item>
            <el-form-item label="需求风险"><el-input v-model="editForm.risk_customer_demand" type="textarea" :rows="2" /></el-form-item>
            <el-form-item label="商务关系风险"><el-input v-model="editForm.risk_business_relationship" type="textarea" :rows="2" /></el-form-item>
            <el-form-item label="竞争对手风险"><el-input v-model="editForm.risk_competitor" type="textarea" :rows="2" /></el-form-item>
            <el-form-item label="项目上线风险"><el-input v-model="editForm.risk_project_online" type="textarea" :rows="2" /></el-form-item>
          </el-form>
        </el-tab-pane>
        <el-tab-pane label="竞争对手" name="competitors">
          <div v-for="(c, idx) in editForm.competitors" :key="idx" class="sub-section">
            <div class="sub-title">竞争对手 {{ idx+1 }} <el-button text size="small" type="danger" @click="editForm.competitors.splice(idx,1)">删除</el-button></div>
            <el-form label-width="100px">
              <el-form-item label="名称"><el-input v-model="c.name" /></el-form-item>
              <el-form-item label="客户认可度"><el-input v-model="c.recognition" /></el-form-item>
              <el-form-item label="报价情况"><el-input v-model="c.price" type="textarea" :rows="2" /></el-form-item>
              <el-form-item label="客户关系"><el-input v-model="c.relationship" type="textarea" :rows="2" /></el-form-item>
              <el-form-item label="优势"><el-input v-model="c.advantage" type="textarea" :rows="2" /></el-form-item>
              <el-form-item label="劣势"><el-input v-model="c.disadvantage" type="textarea" :rows="2" /></el-form-item>
            </el-form>
          </div>
          <el-button type="primary" size="small" @click="addCompetitor">+ 添加竞争对手</el-button>
        </el-tab-pane>
        <el-tab-pane label="拜访记录" name="visits">
          <div v-for="(v, idx) in editForm.visit_records" :key="idx" class="sub-section">
            <div class="sub-title">拜访记录 {{ idx+1 }} <el-button text size="small" type="danger" @click="editForm.visit_records.splice(idx,1)">删除</el-button></div>
            <el-form label-width="100px">
              <el-form-item label="时间"><el-input v-model="v.visit_time" /></el-form-item>
              <el-form-item label="沟通纪录"><el-input v-model="v.communication_record" type="textarea" :rows="3" /></el-form-item>
              <el-form-item label="下一步策略"><el-input v-model="v.next_strategy" type="textarea" :rows="2" /></el-form-item>
            </el-form>
          </div>
          <el-button type="primary" size="small" @click="addVisit">+ 添加拜访记录</el-button>
        </el-tab-pane>
      </el-tabs>
      </div>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="editVisible = false">取消</el-button>
          <el-button type="primary" :loading="saving" @click="save">保存</el-button>
        </span>
      </template>
    </el-dialog>

    <DiffDialog v-model="diffVisible" type="project" :record-id="diffRecordId" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { salesFetchJSON } from './salesApi'
import DiffDialog from './DiffDialog.vue'

const props = defineProps<{ perm: any }>()
const emit = defineEmits(['customer-click'])
const list = ref<any[]>([])
const loading = ref(false)
const total = ref(0)
const page = ref(1)
const pageSize = ref(20)
const filter = ref({ keyword: '', month: '' })
const editVisible = ref(false)
const diffVisible = ref(false)
const diffRecordId = ref<number | null>(null)
const saving = ref(false)
const projectTab = ref('base')

const emptyForm = () => ({
  customer_name: '', report_date: '', unit_nature: '', staff_size: '', financial_status: '', network_coverage: '',
  server_room: '', is_uf_customer: '', informatization_plan: '', plan_3_5_years: '', project_budget: '', other_intro: '',
  project_start_time: '', project_owner: '', leader_attention: '', planned_online_modules: '', is_bidding: '',
  expandable_modules: '', project_value: '', current_progress: '', customer_evaluation: '', our_pros_cons: '',
  current_difficulties: '', pre_support_content: '', risk_customer_demand: '', risk_business_relationship: '',
  risk_competitor: '', risk_project_online: '', action_plan_business: '', action_plan_product: '',
  action_plan_solution: '', action_plan_meeting: '', support_time: '', sales_plan: '', next_plan_arrangement: '',
  filler: '', func_requirements: '', key_func_requirement: '', urgent_problems: '', accept_product_delivery: '',
  need_secondary_dev: '', func_deviation: '', key_persons: [], competitors: [], visit_records: []
})
const editForm = ref<any>(emptyForm())

async function load() {
  loading.value = true
  try {
    const qs = new URLSearchParams()
    if (filter.value.keyword) qs.set('keyword', filter.value.keyword)
    if (filter.value.month) qs.set('month', filter.value.month)
    qs.set('page', String(page.value))
    qs.set('pageSize', String(pageSize.value))
    const json = await salesFetchJSON(`/api/sales-four-tables/project?${qs.toString()}`)
    if (json.success) { list.value = json.data.list; total.value = json.data.total }
  } catch (e: any) { ElMessage.error('加载失败: ' + e.message) }
  finally { loading.value = false }
}

async function openEdit(row?: any) {
  if (row?.id) {
    const json = await salesFetchJSON(`/api/sales-four-tables/project/${row.id}`)
    if (json.success) editForm.value = { ...emptyForm(), ...json.data }
    else editForm.value = { ...emptyForm(), ...row }
  } else {
    editForm.value = emptyForm()
  }
  editVisible.value = true
  projectTab.value = 'base'
}

function addPerson() { editForm.value.key_persons.push({ role_type: '', position: '', name: '', phone: '', office: '', support_level: '', influenced_by: '', can_influence: '', focus: '', relationship: '', personal_hobby: '' }) }
function addCompetitor() { editForm.value.competitors.push({ name: '', recognition: '', price: '', relationship: '', advantage: '', disadvantage: '' }) }
function addVisit() { editForm.value.visit_records.push({ visit_time: '', communication_record: '', next_strategy: '' }) }

async function save() {
  saving.value = true
  try {
    const url = '/api/sales-four-tables/project' + (editForm.value.id ? `/${editForm.value.id}` : '')
    const method = editForm.value.id ? 'PUT' : 'POST'
    const json = await salesFetchJSON(url, { method, body: JSON.stringify(editForm.value) })
    if (json.success) { ElMessage.success('保存成功'); editVisible.value = false; load() }
    else ElMessage.error(json.message || '保存失败')
  } catch (e: any) { ElMessage.error('保存失败: ' + e.message) }
  finally { saving.value = false }
}

async function remove(row: any) {
  try {
    await ElMessageBox.confirm('确定删除该记录吗？', '提示', { type: 'warning' })
    const json = await salesFetchJSON(`/api/sales-four-tables/project/${row.id}`, { method: 'DELETE' })
    if (json.success) { ElMessage.success('删除成功'); load() }
    else ElMessage.error(json.message || '删除失败')
  } catch {}
}

function openVersions(row: any) { diffRecordId.value = row.id; diffVisible.value = true }
onMounted(load)
</script>

<style scoped>
.ft-panel { background: #fff; border-radius: 8px; padding: 1rem; }
.ft-toolbar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; gap: 1rem; flex-wrap: wrap; }
.ft-filters { display: flex; gap: 0.5rem; }
.ft-actions { display: flex; gap: 0.5rem; }
.ft-pagination { margin-top: 1rem; justify-content: flex-end; }
.sub-section { border: 1px solid #eee; border-radius: 8px; padding: 1rem; margin-bottom: 1rem; }
.sub-title { font-weight: 600; margin-bottom: 0.5rem; display: flex; justify-content: space-between; align-items: center; }
.dialog-body { max-height: 60vh; overflow-y: auto; padding-right: 0.5rem; }
.dialog-footer { display: flex; justify-content: flex-end; gap: 0.5rem; }
</style>
