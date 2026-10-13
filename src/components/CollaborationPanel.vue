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
            <el-tag size="small" :type="item.collaboration_mode === 'opinion' ? 'warning' : 'info'">
              {{ item.collaboration_mode === 'opinion' ? '意见征集' : '通知' }}
            </el-tag>
            <el-tag size="small" :type="item.close_status === 'closed' ? 'info' : 'success'">
              {{ item.close_status === 'closed' ? '已结束' : (item.collaboration_mode === 'opinion' ? '意见收集中' : '通知中') }}
            </el-tag>
          </div>
        </div>
        <div class="card-meta">
          <span>类型：{{ item.project_type || '—' }}</span>
          <span>优先级：{{ item.priority }}</span>
          <span>发起：{{ item.applicant_name }}</span>
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
              <tr><th>对象</th><th>类型</th><th>配合职责</th><th>状态/意见</th></tr>
            </thead>
            <tbody>
              <tr v-for="(c, i) in expandedCollaborators" :key="i">
                <td>{{ c.target_type === 'dept' ? '【部门】' : '' }}{{ c.target_name }}</td>
                <td>{{ c.target_type === 'user' ? '人员' : '部门' }}</td>
                <td>{{ c.expected_role || '—' }}</td>
                <td>
                  <span v-if="item.collaboration_mode === 'notify'">
                    {{ c.ack_status === 'acknowledged' ? '✅ 已知晓' : '⏳ 未确认' }}
                  </span>
                  <span v-else>
                    {{ c.opinion_text ? ('💬 ' + c.opinion_text) : '⏳ 待填写' }}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
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
            <el-tag size="small" :type="item.collaboration_mode === 'opinion' ? 'warning' : 'info'">
              {{ item.collaboration_mode === 'opinion' ? '意见征集' : '通知' }}
            </el-tag>
            <el-tag size="small" :type="item.close_status === 'closed' ? 'info' : 'success'">
              {{ item.close_status === 'closed' ? '已结束' : (item.collaboration_mode === 'opinion' ? '意见收集中' : '通知中') }}
            </el-tag>
          </div>
        </div>
        <div class="card-meta">
          <span>发起：{{ item.applicant_name }}</span>
          <span>我的状态：{{ myStateLabel(item) }}</span>
        </div>
        <div class="card-desc">{{ item.description }}</div>
        <div class="card-foot">
          <el-button
            v-if="item.collaboration_mode === 'notify' && myCollaborator(item)?.ack_status !== 'acknowledged' && item.close_status !== 'closed'"
            size="small" type="primary" @click="doAck(item)"
          >已知晓</el-button>
          <el-button
            v-if="item.collaboration_mode === 'opinion' && !myCollaborator(item)?.opinion_text && item.close_status !== 'closed'"
            size="small" type="primary" @click="doOpinion(item)"
          >填写意见</el-button>
          <el-button size="small" @click="$emit('view-detail', item, 'project')">详情</el-button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getProjects, getCollaboratedWithMe, ackCollaboration, submitCollaborationOpinion } from '@/services/api'
import { getProjectApplication } from '@/services/workflow'
import { extractRealName } from '@/utils/oaWorkflowUtils'

const router = useRouter()

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
const myCollaborator = (item: any): any => {
  const list = (item.collaborators || []) as any[]
  const me = currentUsername.value
  const me2 = extractRealName(localStorage.getItem('username') || props.currentUser || '')
  const u = list.find((c) => c.target_type === 'user' && (extractRealName(c.target_name) === me || extractRealName(c.target_name) === me2))
  if (u) return u
  if (myDept.value) {
    const d = list.find((c) => c.target_type === 'dept' && c.target_name === myDept.value)
    if (d) return d
  }
  return null
}
const myStateLabel = (item: any) => {
  const c = myCollaborator(item)
  if (!c) return '—'
  if (item.collaboration_mode === 'notify') return c.ack_status === 'acknowledged' ? '已确认' : '未确认'
  return c.opinion_text ? '已填写意见' : '待填写'
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
      receivedPendingUnread: tomeList.value.filter((i: any) => !myCollaborator(i)?.ack_status || !myCollaborator(i)?.opinion_text).length
    })
    emit('stat-update')
  } catch (e) {
    console.error('加载协同数据失败', e)
  }
}

const goToProjectApply = () => router.push('/oa/project-apply')

onMounted(loadData)
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
</style>
