<template>
  <div class="collab-panel">
    <div class="panel-header">
      <div class="panel-title">
        <span class="title-badge">🤝</span>
        <span>协同申请</span>
      </div>
      <div class="header-actions">
        <el-button
          v-if="!isAdmin"
          type="primary"
          @click="goToProjectApply"
          class="action-btn"
        >
          <span class="btn-icon">+</span>发起协同申请
        </el-button>
      </div>
    </div>

    <div class="sub-tabs-row">
      <div class="sub-tabs">
        <button
          class="sub-tab-btn"
          :class="{ active: scope === 'mine' }"
          @click="scope = 'mine'"
        >我发起的<span v-if="mineList.length" class="sub-tab-badge">{{ mineList.length }}</span></button>
        <button
          class="sub-tab-btn"
          :class="{ active: scope === 'tome' }"
          @click="scope = 'tome'"
        >协同给我的<span v-if="tomeList.length" class="sub-tab-badge">{{ tomeList.length }}</span></button>
      </div>
    </div>

    <!-- 我发起的 -->
    <div v-if="scope === 'mine'">
      <div v-if="mineList.length === 0" class="empty-block">您还未发起任何协同申请</div>
      <div v-for="item in mineList" :key="item.id" class="collab-card">
        <div class="card-head">
          <span class="card-title">{{ item.project_name }}</span>
          <div class="card-tags">
            <el-tag size="small" :type="item.close_status === 'closed' ? 'info' : 'success'">
              {{ item.close_status === 'closed' ? '已结束' : '协同中' }}
            </el-tag>
          </div>
        </div>
        <div class="card-meta">
          <span>类型：{{ item.project_type || '—' }}</span>
          <span>优先级：{{ item.priority }}</span>
          <span>发起：{{ item.applicant_name }}</span>
          <span v-if="participantProgress(item).total > 0" class="progress-pill">参与人 {{ participantProgress(item).done }}/{{ participantProgress(item).total }}</span>
        </div>
        <div class="card-desc">{{ item.description }}</div>
        <div class="card-foot">
          <el-button size="small" @click="toggleExpand(item)">
            {{ expandedId === item.id ? '收起协同对象' : '查看协同对象' }}
          </el-button>
          <el-button size="small" @click="$emit('view-detail', item, 'project')">详情</el-button>
        </div>
        <div v-if="expandedId === item.id" class="collab-detail">
          <div v-if="expandedLoading" class="empty-block">加载中…</div>
          <table v-else class="collab-table">
            <thead>
              <tr><th>对象</th><th>类型</th><th>角色</th><th>配合职责</th><th>追加人</th><th>状态/意见</th></tr>
            </thead>
            <tbody>
                <tr v-for="(c, i) in expandedCollaborators" :key="i">
                <td>{{ c.target_type === 'dept' ? '【部门】' : (c.dept ? '【' + c.dept + '】' : '') }}{{ c.target_name }}</td>
                <td>{{ c.target_type === 'user' ? '人员' : '部门' }}</td>
                <td>
                  <el-tag size="small" :type="c.collab_role === 'cc' ? 'info' : 'warning'">
                    {{ c.collab_role === 'cc' ? '抄送' : '参与人' }}
                  </el-tag>
                </td>
                <td>{{ c.expected_role || '—' }}</td>
                <td>{{ c.added_by || '初始' }}</td>
                <td>
                  <span v-if="c.collab_role === 'cc'">
                    {{ c.ack_status === 'acknowledged' ? '✅ 已知悉' : '📢 待知会' }}
                  </span>
                  <span v-else>
                    <template v-if="c.opinion_text && c.opinion_text.toString().trim()">
                      💬 {{ c.opinion_text }}
                    </template>
                    <template v-else-if="c.ack_status === 'acknowledged'">
                      ✅ 已知悉
                    </template>
                    <template v-else>
                      ⏳ 待填写
                    </template>
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
          <div class="collab-add-row" v-if="canAddCollaborators(item)">
            <el-button size="small" type="primary" @click="openAddDialog(item)">+ 追加协同对象</el-button>
            <span class="collab-progress" v-if="participantProgress(item).total > 0">
              协同进度 {{ participantProgress(item).done }}/{{ participantProgress(item).total }}
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- 协同给我的 -->
    <div v-else>
      <div v-if="tomeList.length === 0" class="empty-block">当前没有协同申请需要您处理</div>
      <div v-for="item in tomeList" :key="item.id" class="collab-card">
        <div class="card-head">
          <span class="card-title">{{ item.project_name }}</span>
          <div class="card-tags">
            <el-tag size="small" :type="item.close_status === 'closed' ? 'info' : 'success'">
              {{ item.close_status === 'closed' ? '已结束' : '协同中' }}
            </el-tag>
          </div>
        </div>
        <div class="card-meta">
          <span>发起：{{ item.applicant_name }}</span>
          <span>我的角色：<el-tag size="small" :type="myRole(item) === 'cc' ? 'info' : 'warning'">{{ myRole(item) === 'cc' ? '抄送' : '参与人' }}</el-tag></span>
          <span>我的状态：{{ myStateLabel(item) }}</span>
        </div>
        <div class="card-desc">{{ item.description }}</div>
        <div class="card-foot">
          <el-button
            v-if="myRole(item) === 'cc' && myCollaborator(item)?.ack_status !== 'acknowledged' && item.close_status !== 'closed'"
            size="small" type="primary" @click="doAck(item)"
          >已知悉</el-button>
          <el-button
            v-if="myRole(item) === 'participant' && !myCollaborator(item)?.opinion_text && item.close_status !== 'closed'"
            size="small" type="primary" @click="doOpinion(item)"
          >填写意见</el-button>
          <el-button size="small" @click="toggleExpand(item)">
            {{ expandedId === item.id ? '收起协同对象' : '查看协同对象' }}
          </el-button>
          <el-button size="small" @click="$emit('view-detail', item, 'project')">详情</el-button>
        </div>
        <div v-if="expandedId === item.id" class="collab-detail">
          <div v-if="expandedLoading" class="empty-block">加载中…</div>
          <table v-else class="collab-table">
            <thead>
              <tr><th>对象</th><th>类型</th><th>角色</th><th>配合职责</th><th>追加人</th><th>状态/意见</th></tr>
            </thead>
            <tbody>
              <tr v-for="(c, i) in expandedCollaborators" :key="i">
                <td>{{ c.target_type === 'dept' ? '【部门】' : (c.dept ? '【' + c.dept + '】' : '') }}{{ c.target_name }}</td>
                <td>{{ c.target_type === 'user' ? '人员' : '部门' }}</td>
                <td>
                  <el-tag size="small" :type="c.collab_role === 'cc' ? 'info' : 'warning'">
                    {{ c.collab_role === 'cc' ? '抄送' : '参与人' }}
                  </el-tag>
                </td>
                <td>{{ c.expected_role || '—' }}</td>
                <td>{{ c.added_by || '初始' }}</td>
                <td>
                  <span v-if="c.collab_role === 'cc'">
                    {{ c.ack_status === 'acknowledged' ? '✅ 已知悉' : '📢 待知会' }}
                  </span>
                  <span v-else>
                    <template v-if="c.opinion_text && c.opinion_text.toString().trim()">
                      💬 {{ c.opinion_text }}
                    </template>
                    <template v-else-if="c.ack_status === 'acknowledged'">
                      ✅ 已知悉
                    </template>
                    <template v-else>
                      ⏳ 待填写
                    </template>
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
          <div class="collab-add-row" v-if="canAddCollaborators(item)">
            <el-button size="small" type="primary" @click="openAddDialog(item)">+ 追加协同对象</el-button>
            <span class="collab-progress" v-if="participantProgress(item).total > 0">
              协同进度 {{ participantProgress(item).done }}/{{ participantProgress(item).total }}
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- 追加协同对象弹窗（链式转发：发起人 / 已响应参与人 可追加） -->
    <el-dialog v-model="addDialogVisible" title="追加协同对象" width="520px" class="custom-dialog" :modal="false">
      <div class="add-collab-form">
        <el-form label-width="84px">
          <el-form-item label="类型">
            <el-radio-group v-model="addType">
              <el-radio label="user">人员</el-radio>
              <el-radio label="dept">部门</el-radio>
            </el-radio-group>
          </el-form-item>
          <el-form-item v-if="addType === 'user'" label="人员">
            <el-select v-model="addEmpIds" multiple filterable placeholder="选择人员（可多选）" style="width:100%">
              <el-option v-for="e in employeeOptions" :key="e.id" :label="e.name + ' (' + (e.department || '') + ')'" :value="e.id" />
            </el-select>
          </el-form-item>
          <el-form-item v-else label="部门">
            <el-select v-model="addDeptNames" multiple filterable allow-create default-first-option placeholder="选择部门（可多选）" style="width:100%">
              <el-option v-for="d in deptOptions" :key="d" :label="d" :value="d" />
            </el-select>
          </el-form-item>
          <el-form-item label="角色">
            <el-select v-model="addCollabRole" style="width:140px">
              <el-option label="参与人" value="participant" />
              <el-option label="抄送" value="cc" />
            </el-select>
          </el-form-item>
          <el-form-item label="配合职责">
            <el-input v-model="addRole" placeholder="配合职责/期望（可选）" />
          </el-form-item>
        </el-form>
      </div>
      <template #footer>
        <el-button @click="addDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="confirmAdd" :loading="addLoading">确认追加</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getProjects, getCollaboratedWithMe, ackCollaboration, submitCollaborationOpinion, addProjectCollaborators } from '@/services/api'
import { getProjectApplication } from '@/services/workflow'
import { extractRealName } from '@/utils/oaWorkflowUtils'

const router = useRouter()
const route = useRoute()

// 从消息中心跳转过来时，根据 URL 的 expandKey=project-<id> 自动展开对应协同记录的协同对象
const tryAutoExpand = async () => {
  const key = String(route.query.expandKey || '')
  const m = key.match(/^project-(\d+)$/)
  if (!m) return
  const targetId = Number(m[1])
  if (mineList.value.length === 0 && tomeList.value.length === 0) {
    await loadData()
  }
  const item = [...mineList.value, ...tomeList.value].find((i) => Number(i.id) === targetId)
  if (!item) return
  scope.value = 'mine'
  expandedId.value = targetId
  expandedLoading.value = true
  expandedCollaborators.value = []
  try {
    const res = await getProjectApplication(targetId)
    if (res.success) {
      expandedCollaborators.value = (res.data && (res.data.collaborators || [])) || []
    }
  } catch (e) {
    console.error('自动展开协同对象失败', e)
  } finally {
    expandedLoading.value = false
  }
}

const props = defineProps<{
  isAdmin: boolean
  canDistribute?: boolean
  currentUser: string
  searchKeyword: string
  viewMode?: string
  allEmployees?: any[]
  approverEmployees?: any[]
  allDistributedRecords?: any[]
  subTab?: string
}>()

const emit = defineEmits<{
  'update:badge': [payload: { appliedTotal: number; appliedReturned: number; receivedTotal: number; receivedPendingUnread: number }]
  'stat-update': []
  'approve': [row: any, type: string]
  'terminate': [row: any, type: string]
  'distribute': [row: any, type: string]
  'view-detail': [row: any, type: string]
}>()

const scope = ref<'mine' | 'tome'>(props.subTab === 'tome' ? 'tome' : 'mine')
const mineList = ref<any[]>([])
const tomeList = ref<any[]>([])

const currentUsername = computed(() => extractRealName(props.currentUser || localStorage.getItem('username') || '当前用户'))
const myDept = computed(() => {
  try {
    const u = JSON.parse(localStorage.getItem('user') || '{}')
    return u.department || ''
  } catch { return '' }
})

// 展开「我发起的」协同对象
const expandedId = ref<number | null>(null)
const expandedCollaborators = ref<any[]>([])
const expandedLoading = ref(false)
const toggleExpand = async (item: any) => {
  if (!item?.id) {
    ElMessage.warning('协同对象信息不完整，无法加载')
    return
  }
  if (expandedId.value === item.id) {
    expandedId.value = null
    return
  }
  expandedId.value = item.id
  expandedLoading.value = true
  expandedCollaborators.value = []
  try {
    const res = await getProjectApplication(item.id)
    if (res.success) {
      expandedCollaborators.value = (res.data && (res.data.collaborators || [])) || []
    }
  } catch (e) {
    console.error('加载协同对象失败', e)
  } finally {
    expandedLoading.value = false
  }
}

// 「协同给我的」：找到属于当前用户的协同对象行
// 兼容两种数据：旧数据(部门为单独 target_type='dept' 行) / 新数据(部门已展开为 user 行并带 dept 字段)
const myCollaborator = (item: any): any => {
  const list = (item.collaborators || []) as any[]
  const me = currentUsername.value
  const me2 = extractRealName(localStorage.getItem('username') || props.currentUser || '')
  const u = list.find((c) => c.target_type === 'user' && (extractRealName(c.target_name) === me || extractRealName(c.target_name) === me2))
  if (u) return u
  if (myDept.value) {
    const d = list.find((c) =>
      (c.target_type === 'dept' && c.target_name === myDept.value) ||
      (c.target_type === 'user' && c.dept === myDept.value)
    )
    if (d) return d
  }
  return null
}
const myStateLabel = (item: any) => {
  const c = myCollaborator(item)
  if (!c) return '—'
  if (c.collab_role === 'cc') return c.ack_status === 'acknowledged' ? '已知悉' : '待知会'
  return c.opinion_text ? '已填写意见' : '待填写意见'
}

const doAck = async (item: any) => {
  try {
    const res = await ackCollaboration(item.id)
    if (res.success) {
      ElMessage.success('已确认知晓')
      await loadData()
    } else {
      ElMessage.error(res.message || '操作失败')
    }
  } catch (e: any) {
    ElMessage.error(e.message || '操作失败')
  }
}
const doOpinion = async (item: any) => {
  try {
    const { value } = await ElMessageBox.prompt('请填写您的意见', '意见征集', {
      confirmButtonText: '提交',
      cancelButtonText: '取消',
      inputType: 'textarea',
      inputValidator: (v: string) => (v && v.trim() ? true : '意见不能为空')
    })
    const res = await submitCollaborationOpinion(item.id, value.trim())
    if (res.success) {
      ElMessage.success('意见已提交')
      await loadData()
    } else {
      ElMessage.error(res.message || '提交失败')
    }
  } catch (e: any) {
    if (e !== 'cancel' && e?.action !== 'cancel') ElMessage.error(e.message || '提交失败')
  }
}

const loadData = async () => {
  try {
    const me = currentUsername.value
    // 我发起的：过滤协作模式记录且发起人为本人的
    const mineRes = await getProjects()
    if (mineRes.success && mineRes.data && mineRes.data.list) {
      mineList.value = mineRes.data.list.filter(
        (r: any) => r.collaboration_mode && extractRealName(r.applicant_name || r.applicant) === me
      )
    }
    // 协同给我的
    const tomeRes = await getCollaboratedWithMe()
    if (tomeRes.success && tomeRes.data && tomeRes.data.list) {
      tomeList.value = tomeRes.data.list
    }
    emit('update:badge', {
      appliedTotal: mineList.value.length,
      appliedReturned: 0,
      receivedTotal: tomeList.value.length,
      receivedPendingUnread: tomeList.value.filter((i: any) => {
        const c = myCollaborator(i)
        if (!c) return false
        if (c.collab_role === 'cc') return c.ack_status !== 'acknowledged'
        return !(c.opinion_text && c.opinion_text.toString().trim())
      }).length
    })
    emit('stat-update')
  } catch (e) {
    console.error('加载协同数据失败', e)
  }
}

const goToProjectApply = () => router.push('/oa/project-apply')

// ===== 协同增强：角色 / 进度 / 链式转发 =====
const employeeOptions = computed(() => props.allEmployees || [])
const deptOptions = computed(() => {
  const s = new Set<string>()
  for (const e of (props.allEmployees || [])) if (e.department) s.add(e.department)
  return Array.from(s)
})

// 协同进度：参与人 + 抄送全部响应后才视为完成（抄送也阻塞自动关闭）
const participantProgress = (item: any) => {
  const list = (item.collaborators || []) as any[]
  if (list.length === 0) return { done: 0, total: 0 }
  const done = list.filter(
    (c) =>
      c.ack_status === 'acknowledged' ||
      (c.opinion_text && c.opinion_text.toString().trim())
  ).length
  return { done, total: list.length }
}

// 是否可追加协同对象：发起人，或已响应的参与人（抄送角色不展示追加）
const canAddCollaborators = (item: any) => {
  // 抄送角色仅知会，无需后续再发起新的追加协同
  if (myRole(item) === 'cc') return false
  const me = currentUsername.value
  if (extractRealName(item.applicant_name) === me) return true
  const c = myCollaborator(item)
  if (!c) return false
  // 参与人已响应（填写意见或旧 notify 已确认）即可追加
  return (c.opinion_text && c.opinion_text.toString().trim()) || c.ack_status === 'acknowledged'
}

// 我在某协同中的角色（参与人 / 抄送）
const myRole = (item: any) => {
  const c = myCollaborator(item)
  if (!c) return ''
  return c.collab_role === 'cc' ? 'cc' : 'participant'
}

// 追加弹窗状态
const addDialogVisible = ref(false)
const addCurrentItem = ref<any>(null)
const addType = ref<'user' | 'dept'>('user')
const addEmpIds = ref<any[]>([])
const addDeptNames = ref<string[]>([])
const addCollabRole = ref<'participant' | 'cc'>('participant')
const addRole = ref('')
const addLoading = ref(false)

const openAddDialog = (item: any) => {
  addCurrentItem.value = item
  addType.value = 'user'
  addEmpIds.value = []
  addDeptNames.value = []
  addCollabRole.value = 'participant'
  addRole.value = ''
  addDialogVisible.value = true
}

const confirmAdd = async () => {
  const item = addCurrentItem.value
  if (!item) return
  const id = item.id
  const list: any[] = []
  if (addType.value === 'user') {
    for (const eid of addEmpIds.value) {
      const emp = (props.allEmployees || []).find((e: any) => String(e.id) === String(eid))
      if (emp) list.push({ type: 'user', id: emp.id, name: emp.name, dept: emp.department, role: addRole.value, collabRole: addCollabRole.value })
    }
  } else {
    for (const d of addDeptNames.value) list.push({ type: 'dept', id: null, name: d, dept: d, role: addRole.value, collabRole: addCollabRole.value })
  }
  if (list.length === 0) { ElMessage.warning('请至少选择一个协同对象'); return }
  addLoading.value = true
  try {
    const res = await addProjectCollaborators(id, list)
    if (res.success) {
      ElMessage.success('已追加协同对象，已通知相关人员')
      addDialogVisible.value = false
      await loadData()
      // 重新展开以展示新增对象
      expandedId.value = id
      expandedLoading.value = true
      try {
        const r = await getProjectApplication(id)
        if (r.success) expandedCollaborators.value = (r.data && r.data.collaborators) || []
      } catch (e) { /* ignore */ } finally { expandedLoading.value = false }
    } else {
      ElMessage.error(res.message || '追加失败')
    }
  } catch (e: any) {
    ElMessage.error(e.message || '追加失败')
  } finally {
    addLoading.value = false
  }
}

onMounted(async () => {
  await loadData()
  await tryAutoExpand()
})
watch(() => route.query.expandKey, async () => {
  await tryAutoExpand()
})
const fetchData = loadData
defineExpose({ loadData, fetchData })
</script>

<style scoped>
.collab-panel { padding: 4px; }
.panel-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.2rem; }
.panel-title { display: flex; align-items: center; gap: 0.5rem; font-size: 1.1rem; font-weight: 600; color: #333; }
.title-badge { font-size: 1.2rem; }
.action-btn { background: linear-gradient(45deg, #1E5AA8, #87CEEB) !important; border: none !important; border-radius: 8px !important; padding: 0.6rem 1.2rem !important; font-weight: 500 !important; }
.btn-icon { margin-right: 0.25rem; font-weight: 700; }
.sub-tabs-row { margin-bottom: 1rem; }
.sub-tabs { display: inline-flex; gap: 0.5rem; background: rgba(30, 90, 168, 0.08); border-radius: 8px; padding: 0.25rem; }
.sub-tab-btn { border: none; background: transparent; color: #666; padding: 0.5rem 1rem; border-radius: 6px; cursor: pointer; font-size: 14px; transition: all 0.25s ease; }
.sub-tab-btn.active { background: #fff; color: #1E5AA8; box-shadow: 0 2px 8px rgba(30, 90, 168, 0.2); font-weight: 600; }
.sub-tab-badge { display: inline-block; min-width: 18px; height: 18px; line-height: 18px; margin-left: 6px; padding: 0 5px; border-radius: 9px; background: #1E5AA8; color: #fff; font-size: 12px; font-weight: 600; text-align: center; }
.collab-card { background: rgba(255,255,255,0.9); border: 1px solid rgba(30,90,168,0.2); border-radius: 12px; padding: 1.1rem 1.25rem; margin-bottom: 1rem; transition: all 0.3s ease; }
.collab-card:hover { transform: translateY(-2px); box-shadow: 0 8px 25px rgba(30,90,168,0.12); border-color: rgba(30,90,168,0.4); }
.card-head { display: flex; justify-content: space-between; align-items: center; gap: 1rem; }
.card-title { font-size: 1rem; font-weight: 600; color: #1E5AA8; }
.card-tags { display: flex; gap: 0.4rem; flex-shrink: 0; }
.card-meta { display: flex; flex-wrap: wrap; gap: 1rem; margin: 0.6rem 0; font-size: 0.82rem; color: #606266; }
.card-desc { font-size: 0.9rem; color: #333; line-height: 1.6; background: #f7f9fc; border-radius: 8px; padding: 0.6rem 0.8rem; }
.card-foot { display: flex; gap: 0.5rem; margin-top: 0.8rem; }
.collab-detail { margin-top: 0.8rem; border-top: 1px dashed rgba(30,90,168,0.2); padding-top: 0.6rem; }
.collab-table { width: 100%; border-collapse: collapse; font-size: 0.82rem; }
.collab-table th, .collab-table td { border: 1px solid #ebeef5; padding: 0.4rem 0.6rem; text-align: left; }
.collab-table th { background: #f5f7fa; color: #606266; }
.empty-block { text-align: center; color: #909399; font-size: 0.9rem; padding: 2rem 0; }
.progress-pill { background: rgba(30,90,168,0.1); color: #1E5AA8; padding: 0.1rem 0.5rem; border-radius: 10px; font-size: 0.78rem; }
.collab-add-row { margin-top: 0.6rem; display: flex; align-items: center; gap: 0.8rem; }
.collab-progress { font-size: 0.8rem; color: #1E5AA8; }
</style>
