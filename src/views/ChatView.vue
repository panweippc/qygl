<template>
  <div class="chat-page">
    <PageHeaderBar title="聊天">
      <template #actions>
        <el-button size="small" @click="showSingleDialog = true">发起单聊</el-button>
        <el-button size="small" @click="openGroupDialog">新建群聊</el-button>
        <el-button size="small" @click="showSearchDialog = true">聊天记录</el-button>
      </template>
    </PageHeaderBar>

    <div class="chat-body">
      <!-- 会话列表 -->
      <aside class="conv-list">
        <div class="conv-search">
          <el-input v-model="convFilter" placeholder="搜索会话" size="small" clearable />
        </div>
        <div class="conv-items" v-loading="store.conversationsLoading">
          <div
            v-for="c in filteredConversations"
            :key="c.id"
            class="conv-item"
            :class="{ active: c.id === store.activeId }"
            @click="open(c.id)"
          >
            <div class="conv-avatar" :class="c.type">
              {{ avatarText(c) }}
              <span v-if="c.type === 'single' && isOnline(otherId(c))" class="online-dot" />
            </div>
            <div class="conv-main">
              <div class="conv-top">
                <span class="conv-title">{{ c.title }}</span>
                <span class="conv-time">{{ formatTime(c.updatedAt) }}</span>
              </div>
              <div class="conv-bottom">
                <span class="conv-last">{{ lastPreview(c) }}</span>
                <span v-if="c.unread > 0" class="conv-badge">{{ c.unread > 99 ? '99+' : c.unread }}</span>
              </div>
            </div>
          </div>
          <div v-if="filteredConversations.length === 0" class="conv-empty">暂无会话，点击右上角发起聊天</div>
        </div>
      </aside>

      <!-- 消息区 -->
      <section class="msg-area" v-if="store.activeConversation">
        <header class="msg-head">
          <div class="msg-head-title">
            <span>{{ store.activeConversation.title }}</span>
            <span class="msg-head-sub" v-if="store.activeConversation.type === 'group'">
              ({{ (members.length) }} 人)
            </span>
            <span v-else-if="store.isSingleWithOther !== null" class="msg-head-sub">
              · {{ isOnline(store.isSingleWithOther) ? '在线' : '离线' }}
            </span>
          </div>
          <div class="msg-head-actions" v-if="store.activeConversation.type === 'group'">
            <el-button size="small" text @click="showMembersDialog = true">群成员</el-button>
          </div>
        </header>

        <div class="msg-scroll" ref="scrollEl">
          <div v-for="m in store.activeMessages" :key="m.id || m.tempId" class="msg-row"
               :class="{ mine: m.senderId === store.me, system: m.msgType === 'system' }">
            <template v-if="m.msgType === 'system'">
              <div class="sys-msg">{{ m.content }}</div>
            </template>
            <template v-else>
              <div class="msg-bubble-wrap">
                <div class="msg-meta" v-if="m.senderId !== store.me">{{ m.senderName }}</div>
                <div class="msg-bubble" :class="{ failed: m.failed }">
                  <span v-if="m.deleted" class="deleted-tip">消息已撤回</span>
                  <template v-else>
                    <span v-if="m.sending" class="sending-tip">发送中…</span>
                    <span v-else-if="m.failed" class="sending-tip">发送失败</span>
                    <template v-if="m.msgType === 'text'">{{ m.content }}</template>
                    <el-image v-else-if="m.msgType === 'image' && m.attachmentUrl"
                              :src="m.attachmentUrl" fit="cover" class="msg-img"
                              :preview-src-list="[m.attachmentUrl]" />
                    <a v-else-if="m.msgType === 'file' && m.attachmentUrl" :href="m.attachmentUrl"
                       target="_blank" class="msg-file">
                      <span class="file-ico">📎</span>
                      <span class="file-info">
                        <span class="file-name">{{ m.attachmentName }}</span>
                        <span class="file-size" v-if="m.attachmentSize">{{ formatSize(m.attachmentSize) }}</span>
                      </span>
                    </a>
                  </template>
                </div>
                <div class="msg-tools" v-if="m.senderId === store.me && !m.deleted && m.id > 0">
                  <span v-if="store.isReadByOther(m)" class="read-receipt">已读</span>
                  <el-button size="small" text type="danger" @click="doRecall(m)">撤回</el-button>
                </div>
                <div class="msg-time">{{ formatTime(m.createdAt) }}</div>
              </div>
            </template>
          </div>
          <div v-if="typingNames.length" class="typing-indicator">{{ typingNames.join('、') }} 正在输入…</div>
        </div>

        <footer class="msg-input">
          <div class="input-bar">
            <el-button size="small" text title="图片" @click="pickFile('image')">🖼️</el-button>
            <el-button size="small" text title="文件" @click="pickFile('file')">📎</el-button>
            <el-button v-if="store.activeConversation.type === 'group'" size="small" text title="提及" @click="openMention">@</el-button>
            <el-input
              v-model="draft"
              type="textarea"
              :rows="2"
              resize="none"
              placeholder="输入消息，Enter 发送 / Shift+Enter 换行"
              @keydown.enter.exact.prevent="onSend"
              @input="onTyping"
            />
            <el-button type="primary" size="small" @click="onSend" :disabled="!draft.trim()">发送</el-button>
          </div>
          <input ref="fileInput" type="file" style="display:none" @change="onFilePicked" />
        </footer>
      </section>

      <section class="msg-area empty" v-else>
        <div class="empty-state">
          <span class="empty-icon">💬</span>
          <p>选择一个会话开始聊天</p>
          <el-button size="small" @click="showSingleDialog = true">发起单聊</el-button>
        </div>
      </section>
    </div>

    <!-- 发起单聊 -->
    <el-dialog v-model="showSingleDialog" title="发起单聊" width="420px" align-center>
      <el-input v-model="contactFilter" placeholder="搜索同事（姓名/部门）" size="small" clearable />
      <div class="picker-list">
        <div v-for="p in filteredDirectory" :key="p.id" class="picker-item" @click="startSingle(p)">
          <div class="picker-avatar">{{ (p.name || '?').slice(0, 1) }}</div>
          <div class="picker-info">
            <div class="picker-name">{{ p.name }}</div>
            <div class="picker-dept">{{ p.department }} · {{ p.position }}</div>
          </div>
          <span v-if="isOnline(p.id)" class="online-dot" />
        </div>
        <div v-if="filteredDirectory.length === 0" class="picker-empty">无匹配同事</div>
      </div>
    </el-dialog>

    <!-- 新建群聊 -->
    <el-dialog v-model="showGroupDialog" title="新建群聊" width="460px" align-center>
      <el-input v-model="groupTitle" placeholder="群名称（选填，默认成员名拼接）" size="small" />
      <div class="dept-quick">
        <span class="dept-quick-label">按部门一键建群：</span>
        <el-button v-for="(members, dept) in store.departments" :key="dept" size="small"
                   @click="quickDeptGroup(dept, members)">{{ dept }} ({{ members.length }})</el-button>
      </div>
      <el-input v-model="contactFilter" placeholder="搜索同事添加到群" size="small" clearable style="margin-top:8px" />
      <div class="picker-list">
        <label v-for="p in filteredDirectory" :key="p.id" class="picker-item selectable">
          <el-checkbox :model-value="groupSelected.has(p.id)" @change="(v:any)=>toggleGroupSelect(p.id, v)" />
          <div class="picker-avatar">{{ (p.name || '?').slice(0, 1) }}</div>
          <div class="picker-info">
            <div class="picker-name">{{ p.name }}</div>
            <div class="picker-dept">{{ p.department }} · {{ p.position }}</div>
          </div>
        </label>
        <div v-if="filteredDirectory.length === 0" class="picker-empty">无匹配同事</div>
      </div>
      <template #footer>
        <el-button size="small" @click="showGroupDialog = false">取消</el-button>
        <el-button size="small" type="primary" :disabled="groupSelected.size === 0" @click="doCreateGroup">创建 ({{ groupSelected.size }})</el-button>
      </template>
    </el-dialog>

    <!-- 群成员 -->
    <el-dialog v-model="showMembersDialog" title="群成员" width="420px" align-center>
      <div class="picker-list">
        <div v-for="m in members" :key="m.user_id" class="picker-item">
          <div class="picker-avatar">{{ (m.username || '?').slice(0, 1) }}</div>
          <div class="picker-info">
            <div class="picker-name">{{ m.username }} <el-tag v-if="m.role==='owner'" size="small" type="warning">群主</el-tag></div>
            <div class="picker-dept">{{ isOnline(m.user_id) ? '在线' : '离线' }}</div>
          </div>
        </div>
      </div>
      <template #footer>
        <el-button size="small" @click="showMembersDialog = false">关闭</el-button>
        <el-button size="small" type="primary" @click="openAddMember">添加成员</el-button>
      </template>
    </el-dialog>

    <!-- 添加群成员 -->
    <el-dialog v-model="showAddDialog" title="添加群成员" width="420px" align-center append-to-body>
      <el-input v-model="contactFilter" placeholder="搜索同事" size="small" clearable />
      <div class="picker-list">
        <label v-for="p in addCandidates" :key="p.id" class="picker-item selectable">
          <el-checkbox :model-value="addSelected.has(p.id)" @change="(v:any)=>toggleAddSelect(p.id, v)" />
          <div class="picker-avatar">{{ (p.name || '?').slice(0, 1) }}</div>
          <div class="picker-info">
            <div class="picker-name">{{ p.name }}</div>
            <div class="picker-dept">{{ p.department }} · {{ p.position }}</div>
          </div>
        </label>
        <div v-if="addCandidates.length === 0" class="picker-empty">无匹配同事</div>
      </div>
      <template #footer>
        <el-button size="small" @click="showAddDialog = false">取消</el-button>
        <el-button size="small" type="primary" :disabled="addSelected.size === 0" @click="doAddMembers">添加 ({{ addSelected.size }})</el-button>
      </template>
    </el-dialog>

    <!-- 聊天记录搜索 -->
    <el-dialog v-model="showSearchDialog" title="聊天记录" width="520px" align-center>
      <el-input v-model="searchKeyword" placeholder="输入关键词搜索（全会话）" size="small" clearable @input="onSearch" />
      <div class="search-list" v-loading="searching">
        <div v-for="s in store.searchResults" :key="s.id" class="search-item" @click="jumpToSearch(s)">
          <div class="search-conv">{{ conversationTitle(s.conversationId) }}</div>
          <div class="search-content">{{ s.senderName }}：{{ s.content }}</div>
          <div class="search-time">{{ formatTime(s.createdAt) }}</div>
        </div>
        <div v-if="store.searchResults.length === 0 && searchKeyword" class="picker-empty">无匹配记录</div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import PageHeaderBar from '../components/PageHeaderBar.vue'
import { useChatStore } from '@/stores/chat'
import { emitChat } from '@/services/socket'
import type { EmployeeDirectoryEntry } from '@/services/types'

const store = useChatStore()
const route = useRoute()
const router = useRouter()

const convFilter = ref('')
const draft = ref('')
const scrollEl = ref<HTMLElement | null>(null)
const fileInput = ref<HTMLInputElement | null>(null)
const pendingFileKind = ref<'image' | 'file'>('file')

const showSingleDialog = ref(false)
const showGroupDialog = ref(false)
const showMembersDialog = ref(false)
const showAddDialog = ref(false)
const showSearchDialog = ref(false)
const contactFilter = ref('')
const groupTitle = ref('')
const groupSelected = ref<Set<number>>(new Set())
const addSelected = ref<Set<number>>(new Set())
const searchKeyword = ref('')
const searching = ref(false)
let searchTimer: ReturnType<typeof setTimeout> | null = null
let typingTimer: ReturnType<typeof setTimeout> | null = null

const filteredConversations = computed(() => {
  const q = convFilter.value.trim().toLowerCase()
  if (!q) return store.conversations
  return store.conversations.filter(c =>
    c.title.toLowerCase().includes(q) ||
    (c.lastMessage?.content || '').toLowerCase().includes(q)
  )
})

const members = computed(() =>
  store.activeId != null ? (store.membersByConv[store.activeId] || []) : []
)
const memberIds = computed(() => new Set(members.value.map(m => m.user_id)))
const addCandidates = computed(() =>
  filteredDirectory.value.filter(p => !memberIds.value.has(p.id))
)

const filteredDirectory = computed(() => {
  const q = contactFilter.value.trim().toLowerCase()
  if (!q) return store.directory
  return store.directory.filter(p =>
    (p.name || '').toLowerCase().includes(q) ||
    (p.department || '').toLowerCase().includes(q) ||
    (p.position || '').toLowerCase().includes(q)
  )
})

const typingNames = computed(() => {
  const list = store.activeId != null ? (store.typingByConv[store.activeId] || []) : []
  return list
    .filter(id => id !== store.me)
    .map(id => (store.activeConversation?.members.find(m => m.user_id === id)?.username) || `员工${id}`)
})

function isOnline(id: number | null) {
  return id != null && store.onlineEmployees.has(id)
}

function otherId(c: any): number | null {
  if (c.type !== 'single') return null
  const other = c.members.find((m: any) => m.user_id !== store.me)
  return other ? other.user_id : null
}

function avatarText(c: any): string {
  if (c.type === 'group') return '👥'
  return (c.title || '?').slice(0, 1)
}

function lastPreview(c: any): string {
  if (!c.lastMessage) return ''
  if (c.lastMessage.deleted) return '[撤回的消息]'
  const prefix = c.type === 'single' ? '' : `${c.lastMessage.senderName}：`
  return prefix + c.lastMessage.content
}

function formatTime(s: string): string {
  if (!s) return ''
  const d = new Date(s)
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  if (diff < 60000) return '刚刚'
  if (diff < 3600000) return Math.floor(diff / 60000) + '分钟前'
  if (d.toDateString() === now.toDateString()) return d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
  return d.toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' }) + ' ' + d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
}

function formatSize(n: number): string {
  if (n < 1024) return n + ' B'
  if (n < 1024 * 1024) return (n / 1024).toFixed(1) + ' KB'
  return (n / 1024 / 1024).toFixed(1) + ' MB'
}

async function open(id: number) {
  await store.openConversation(id)
  await nextTick()
  scrollToBottom()
}

function onSend() {
  const text = draft.value.trim()
  if (!text) return
  store.sendText(text)
  draft.value = ''
}

function onTyping() {
  if (store.activeId == null) return
  emitTyping(true)
  if (typingTimer) clearTimeout(typingTimer)
  typingTimer = setTimeout(() => emitTyping(false), 2500)
}
function emitTyping(isTyping: boolean) {
  if (store.activeId == null) return
  emitChat('chat:typing', { conversationId: store.activeId, isTyping })
}

async function doRecall(m: any) {
  if (store.activeId == null) return
  try {
    await store.recall(store.activeId, m.id)
    ElMessage.success('已撤回')
  } catch (e: any) {
    ElMessage.error('撤回失败：' + (e?.message || e))
  }
}

function pickFile(kind: 'image' | 'file') {
  pendingFileKind.value = kind
  fileInput.value?.click()
}
function onFilePicked(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (file) store.sendAttachment(file)
  input.value = ''
}

async function startSingle(p: EmployeeDirectoryEntry) {
  showSingleDialog.value = false
  const id = await store.ensureSingleConversation(p.id)
  if (id != null) await open(id)
}
function openGroupDialog() {
  showGroupDialog.value = true
  groupSelected.value = new Set()
  groupTitle.value = ''
  contactFilter.value = ''
}
function toggleGroupSelect(id: number, v: any) {
  const next = new Set(groupSelected.value)
  if (v) next.add(id); else next.delete(id)
  groupSelected.value = next
}
function quickDeptGroup(dept: string, members: EmployeeDirectoryEntry[]) {
  groupTitle.value = dept + '群'
  groupSelected.value = new Set(members.map(m => m.id))
}
async function doCreateGroup() {
  const ids = Array.from(groupSelected.value)
  const id = await store.createGroup(ids, groupTitle.value || '')
  showGroupDialog.value = false
  if (id != null) await open(id)
}

function openAddMember() {
  showMembersDialog.value = false
  showAddDialog.value = true
  addSelected.value = new Set()
  contactFilter.value = ''
}
function toggleAddSelect(id: number, v: any) {
  const next = new Set(addSelected.value)
  if (v) next.add(id); else next.delete(id)
  addSelected.value = next
}
async function doAddMembers() {
  if (store.activeId == null) return
  const ids = Array.from(addSelected.value)
  await store.addMembers(store.activeId, ids)
  showAddDialog.value = false
  ElMessage.success('已添加成员')
}

function onSearch() {
  if (searchTimer) clearTimeout(searchTimer)
  searching.value = true
  searchTimer = setTimeout(async () => {
    await store.search(searchKeyword.value)
    searching.value = false
  }, 400)
}
async function jumpToSearch(s: any) {
  showSearchDialog.value = false
  await open(s.conversationId)
}
function conversationTitle(id: number): string {
  return store.conversations.find(c => c.id === id)?.title || `会话${id}`
}

function openMention() {
  // 在群聊中插入 @，弹出成员选择
  const target = members.value.find(m => m.user_id !== store.me)
  if (!target) return
  draft.value += '@' + target.username + ' '
}

function scrollToBottom() {
  nextTick(() => {
    if (scrollEl.value) scrollEl.value.scrollTop = scrollEl.value.scrollHeight
  })
}

watch(
  () => store.activeMessages.length,
  () => scrollToBottom()
)

onMounted(async () => {
  store.init()
  await store.refreshConversations()
  // 支持从首页/通讯录带 ?user= 直接进入单聊
  const u = route.query.user
  if (u) {
    const id = await store.ensureSingleConversation(Number(u))
    if (id != null) await open(id)
  }
})

onUnmounted(() => {
  store.closeConversation()
})
</script>

<style scoped>
.chat-page { height: 100vh; display: flex; flex-direction: column; background: #f2f3f5; }
.chat-body { flex: 1; display: flex; min-height: 0; }
.conv-list { width: 300px; background: #fff; border-right: 1px solid #e6e8eb; display: flex; flex-direction: column; }
.conv-search { padding: 12px; border-bottom: 1px solid #f0f2f5; }
.conv-items { flex: 1; overflow-y: auto; }
.conv-item { display: flex; align-items: center; gap: 10px; padding: 12px 14px; cursor: pointer; border-bottom: 1px solid #f5f6f8; transition: background .15s; }
.conv-item:hover { background: #f5f8ff; }
.conv-item.active { background: #e8f0ff; }
.conv-avatar { width: 42px; height: 42px; border-radius: 8px; background: linear-gradient(135deg,#1E5AA8,#5B8FC9); color:#fff; display:flex; align-items:center; justify-content:center; font-size:18px; flex-shrink:0; position: relative; }
.conv-avatar.group { background: linear-gradient(135deg,#07c160,#3ad08a); }
.online-dot { position:absolute; right:-2px; bottom:-2px; width:11px; height:11px; border-radius:50%; background:#07c160; border:2px solid #fff; }
.conv-main { flex:1; min-width:0; }
.conv-top { display:flex; justify-content:space-between; align-items:center; }
.conv-title { font-size:14px; font-weight:600; color:#1a1a2e; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.conv-time { font-size:11px; color:#bbb; flex-shrink:0; margin-left:6px; }
.conv-bottom { display:flex; justify-content:space-between; align-items:center; margin-top:3px; }
.conv-last { font-size:12px; color:#999; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; flex:1; }
.conv-badge { background:#f44336; color:#fff; font-size:11px; min-width:16px; height:16px; border-radius:8px; display:flex; align-items:center; justify-content:center; padding:0 4px; margin-left:6px; }
.conv-empty, .picker-empty { text-align:center; color:#999; font-size:13px; padding:30px 10px; }

.msg-area { flex:1; display:flex; flex-direction:column; min-width:0; background:#f2f3f5; }
.msg-area.empty { align-items:center; justify-content:center; }
.empty-state { text-align:center; color:#999; }
.empty-icon { font-size:48px; display:block; margin-bottom:10px; }
.msg-head { height:54px; background:#fff; border-bottom:1px solid #e6e8eb; display:flex; align-items:center; justify-content:space-between; padding:0 18px; flex-shrink:0; }
.msg-head-title { font-size:15px; font-weight:600; color:#1a1a2e; }
.msg-head-sub { font-size:12px; color:#999; margin-left:6px; font-weight:400; }
.msg-scroll { flex:1; overflow-y:auto; padding:18px 20px; }
.msg-row { display:flex; margin-bottom:14px; }
.msg-row.mine { justify-content:flex-end; }
.msg-row.system { justify-content:center; }
.sys-msg { font-size:12px; color:#999; background:rgba(0,0,0,0.04); padding:3px 10px; border-radius:10px; }
.msg-bubble-wrap { max-width:62%; }
.msg-meta { font-size:12px; color:#999; margin-bottom:3px; }
.msg-row.mine .msg-meta { text-align:right; }
.msg-bubble { display:inline-block; padding:9px 13px; border-radius:10px; background:#fff; color:#1a1a2e; font-size:14px; line-height:1.5; word-break:break-word; box-shadow:0 1px 2px rgba(0,0,0,0.05); position:relative; }
.msg-row.mine .msg-bubble { background:linear-gradient(135deg,#1E5AA8,#2b7fc4); color:#fff; }
.msg-bubble.failed { opacity:.6; }
.deleted-tip { color:#999; font-style:italic; }
.sending-tip { color:rgba(255,255,255,.8); font-size:12px; }
.msg-row:not(.mine) .sending-tip { color:#999; }
.msg-img { max-width:220px; max-height:220px; border-radius:8px; display:block; }
.msg-file { display:flex; align-items:center; gap:8px; background:#f5f7fa; border:1px solid #e6e8eb; border-radius:8px; padding:8px 10px; text-decoration:none; color:#1a1a2e; min-width:180px; }
.msg-row.mine .msg-file { background:rgba(255,255,255,.15); border-color:rgba(255,255,255,.3); color:#fff; }
.file-ico { font-size:20px; }
.file-info { display:flex; flex-direction:column; }
.file-name { font-size:13px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width:160px; }
.file-size { font-size:11px; opacity:.7; }
.msg-tools { display:flex; align-items:center; gap:8px; margin-top:3px; font-size:11px; }
.msg-row.mine .msg-tools { justify-content:flex-end; }
.read-receipt { color:#07c160; }
.msg-time { font-size:11px; color:#bbb; margin-top:2px; }
.msg-row.mine .msg-time { text-align:right; }
.typing-indicator { font-size:12px; color:#1E5AA8; padding:4px 2px; }

.msg-input { background:#fff; border-top:1px solid #e6e8eb; padding:10px 14px; flex-shrink:0; }
.input-bar { display:flex; align-items:flex-end; gap:8px; }
.input-bar :deep(.el-textarea) { flex:1; }
.input-bar :deep(.el-textarea__inner) { border:none; box-shadow:none; background:#f5f7fa; border-radius:8px; padding:8px 10px; }

.picker-list { max-height:340px; overflow-y:auto; margin-top:10px; }
.picker-item { display:flex; align-items:center; gap:10px; padding:9px 6px; border-radius:8px; cursor:pointer; }
.picker-item:hover { background:#f5f8ff; }
.picker-item.selectable { cursor:default; }
.picker-avatar { width:36px; height:36px; border-radius:8px; background:linear-gradient(135deg,#1E5AA8,#5B8FC9); color:#fff; display:flex; align-items:center; justify-content:center; font-size:15px; flex-shrink:0; position:relative; }
.picker-info { flex:1; min-width:0; }
.picker-name { font-size:14px; color:#1a1a2e; }
.picker-dept { font-size:12px; color:#999; }
.dept-quick { margin-top:10px; display:flex; flex-wrap:wrap; align-items:center; gap:6px; }
.dept-quick-label { font-size:12px; color:#666; }
.search-list { max-height:400px; overflow-y:auto; }
.search-item { padding:10px 6px; border-bottom:1px solid #f0f2f5; cursor:pointer; }
.search-item:hover { background:#f5f8ff; }
.search-conv { font-size:13px; font-weight:600; color:#1E5AA8; }
.search-content { font-size:13px; color:#333; margin:2px 0; }
.search-time { font-size:11px; color:#bbb; }
</style>
