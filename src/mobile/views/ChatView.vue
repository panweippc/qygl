<template>
  <div class="m-chat">
    <!-- 会话列表 -->
    <div v-if="!store.activeId" class="m-chat-list">
      <header class="m-chat-head">
        <span class="m-chat-title">聊天</span>
        <div class="m-chat-head-actions">
          <el-button size="small" text @click="showSearch = true">🔍</el-button>
          <el-button size="small" text @click="showPicker = true">＋</el-button>
        </div>
      </header>
      <div class="m-conv-scroll">
        <div
          v-for="c in store.conversations"
          :key="c.id"
          class="m-conv"
          @click="open(c.id)"
        >
          <div class="m-conv-avatar" :class="c.type">
            {{ c.type === 'group' ? '👥' : (c.title || '?').slice(0, 1) }}
            <span v-if="c.type === 'single' && isOnline(otherId(c))" class="m-online" />
          </div>
          <div class="m-conv-main">
            <div class="m-conv-top">
              <span class="m-conv-name">{{ c.title }}</span>
              <span class="m-conv-time">{{ formatTime(c.updatedAt) }}</span>
            </div>
            <div class="m-conv-bottom">
              <span class="m-conv-last">{{ lastPreview(c) }}</span>
              <span v-if="c.unread > 0" class="m-conv-badge">{{ c.unread > 99 ? '99+' : c.unread }}</span>
            </div>
          </div>
        </div>
        <div v-if="store.conversations.length === 0" class="m-empty">暂无会话，点击右上角＋发起聊天</div>
      </div>
    </div>

    <!-- 会话线程 -->
    <div v-else class="m-thread">
      <header class="m-chat-head">
        <button class="m-back" @click="store.closeConversation()">‹</button>
        <span class="m-chat-title">{{ store.activeConversation?.title }}</span>
        <el-button v-if="store.activeConversation?.type === 'group'" size="small" text @click="showMembers = true">成员</el-button>
      </header>
      <div class="m-msg-scroll" ref="scrollEl">
        <div v-for="m in store.activeMessages" :key="m.id || m.tempId" class="m-msg"
             :class="{ mine: m.senderId === store.me }">
          <div v-if="m.msgType === 'system'" class="m-sys">{{ m.content }}</div>
          <template v-else>
            <div class="m-bubble" :class="{ deleted: m.deleted, failed: m.failed }">
              <span v-if="m.deleted">消息已撤回</span>
              <template v-else>
                <span v-if="m.sending">发送中…</span>
                <span v-else-if="m.failed">发送失败</span>
                <template v-if="m.msgType === 'text'">{{ m.content }}</template>
                <img v-else-if="m.msgType === 'image' && m.attachmentUrl" :src="m.attachmentUrl" class="m-img" @click="previewImg = m.attachmentUrl" />
                <a v-else-if="m.msgType === 'file' && m.attachmentUrl" :href="m.attachmentUrl" target="_blank" class="m-file">📎 {{ m.attachmentName }}</a>
              </template>
            </div>
            <div class="m-msg-tools" v-if="m.senderId === store.me && !m.deleted && m.id > 0">
              <span v-if="store.isReadByOther(m)" class="m-read">已读</span>
              <span class="m-recall" @click="doRecall(m)">撤回</span>
            </div>
          </template>
        </div>
      </div>
      <footer class="m-input-bar">
        <input ref="fileInput" type="file" style="display:none" @change="onFilePicked" />
        <button class="m-icon-btn" @click="pickFile('image')">🖼️</button>
        <button class="m-icon-btn" @click="pickFile('file')">📎</button>
        <input v-model="draft" class="m-text" placeholder="输入消息" @keyup.enter="onSend" />
        <button class="m-send" @click="onSend">发送</button>
      </footer>
    </div>

    <!-- 发起聊天：选择同事 -->
    <el-dialog v-model="showPicker" title="发起聊天" width="92%" align-center>
      <el-input v-model="pickerFilter" placeholder="搜索同事" size="small" clearable />
      <div class="m-picker">
        <div class="m-picker-tabs">
          <span :class="{ on: pickerMode === 'single' }" @click="pickerMode = 'single'">单聊</span>
          <span :class="{ on: pickerMode === 'group' }" @click="pickerMode = 'group'">建群</span>
        </div>
        <el-input v-if="pickerMode === 'group'" v-model="groupTitle" placeholder="群名称（选填）" size="small" style="margin:6px 0" />
        <div v-for="p in filteredDir" :key="p.id" class="m-picker-item" @click="pickerMode === 'group' ? toggleGroup(p.id) : startSingle(p)">
          <el-checkbox v-if="pickerMode === 'group'" :model-value="groupSel.has(p.id)" @click.stop @change="(v:any)=>toggleGroup(p.id, v)" />
          <div class="m-picker-avatar">{{ (p.name || '?').slice(0, 1) }}</div>
          <div class="m-picker-info">
            <div class="m-picker-name">{{ p.name }}</div>
            <div class="m-picker-dept">{{ p.department }}</div>
          </div>
        </div>
      </div>
      <template #footer>
        <el-button size="small" @click="showPicker = false">取消</el-button>
        <el-button v-if="pickerMode === 'group'" size="small" type="primary" :disabled="groupSel.size === 0" @click="doCreateGroup">建群 ({{ groupSel.size }})</el-button>
      </template>
    </el-dialog>

    <!-- 群成员 -->
    <el-dialog v-model="showMembers" title="群成员" width="92%" align-center>
      <div class="m-picker">
        <div v-for="m in members" :key="m.user_id" class="m-picker-item">
          <div class="m-picker-avatar">{{ (m.username || '?').slice(0, 1) }}</div>
          <div class="m-picker-info">
            <div class="m-picker-name">{{ m.username }} <el-tag v-if="m.role==='owner'" size="small" type="warning">群主</el-tag></div>
            <div class="m-picker-dept">{{ isOnline(m.user_id) ? '在线' : '离线' }}</div>
          </div>
        </div>
      </div>
    </el-dialog>

    <!-- 搜索 -->
    <el-dialog v-model="showSearch" title="聊天记录" width="92%" align-center>
      <el-input v-model="searchKw" placeholder="输入关键词" size="small" clearable @input="onSearch" />
      <div class="m-search-list">
        <div v-for="s in store.searchResults" :key="s.id" class="m-search-item" @click="jump(s)">
          <div class="m-search-conv">{{ titleOf(s.conversationId) }}</div>
          <div class="m-search-content">{{ s.senderName }}：{{ s.content }}</div>
        </div>
        <div v-if="store.searchResults.length === 0 && searchKw" class="m-empty">无匹配记录</div>
      </div>
    </el-dialog>

    <el-dialog v-model="previewShow" title="" width="92%" align-center append-to-body>
      <img v-if="previewImg" :src="previewImg" style="width:100%" />
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useChatStore } from '@/stores/chat'
import type { EmployeeDirectoryEntry } from '@/services/types'

const store = useChatStore()
const route = useRoute()

const draft = ref('')
const scrollEl = ref<HTMLElement | null>(null)
const fileInput = ref<HTMLInputElement | null>(null)
const pendingKind = ref<'image' | 'file'>('file')
const showPicker = ref(false)
const showMembers = ref(false)
const showSearch = ref(false)
const pickerMode = ref<'single' | 'group'>('single')
const pickerFilter = ref('')
const groupTitle = ref('')
const groupSel = ref<Set<number>>(new Set())
const searchKw = ref('')
let searchTimer: ReturnType<typeof setTimeout> | null = null
const previewImg = ref('')
const previewShow = ref(false)

const members = computed(() =>
  store.activeId != null ? (store.membersByConv[store.activeId] || []) : []
)
const filteredDir = computed(() => {
  const q = pickerFilter.value.trim().toLowerCase()
  if (!q) return store.directory
  return store.directory.filter(p =>
    (p.name || '').toLowerCase().includes(q) || (p.department || '').toLowerCase().includes(q)
  )
})

function isOnline(id: number | null) {
  return id != null && store.onlineEmployees.has(id)
}
function otherId(c: any): number | null {
  if (c.type !== 'single') return null
  const o = c.members.find((m: any) => m.user_id !== store.me)
  return o ? o.user_id : null
}
function lastPreview(c: any): string {
  if (!c.lastMessage) return ''
  if (c.lastMessage.deleted) return '[撤回的消息]'
  const pre = c.type === 'single' ? '' : c.lastMessage.senderName + '：'
  return pre + c.lastMessage.content
}
function formatTime(s: string): string {
  if (!s) return ''
  const d = new Date(s)
  const now = new Date()
  if (d.toDateString() === now.toDateString()) return d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
  return d.toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' })
}
function titleOf(id: number): string {
  return store.conversations.find(c => c.id === id)?.title || `会话${id}`
}

async function open(id: number) {
  await store.openConversation(id)
  await nextTick()
  scrollToBottom()
}
function onSend() {
  const t = draft.value.trim()
  if (!t) return
  store.sendText(t)
  draft.value = ''
}
function pickFile(kind: 'image' | 'file') {
  pendingKind.value = kind
  fileInput.value?.click()
}
function onFilePicked(e: Event) {
  const f = (e.target as HTMLInputElement).files?.[0]
  if (f) store.sendAttachment(f)
  ;(e.target as HTMLInputElement).value = ''
}
async function doRecall(m: any) {
  if (store.activeId == null) return
  try {
    await store.recall(store.activeId, m.id)
    ElMessage.success('已撤回')
  } catch (err: any) {
    ElMessage.error('撤回失败：' + (err?.message || err))
  }
}

async function startSingle(p: EmployeeDirectoryEntry) {
  showPicker.value = false
  const id = await store.ensureSingleConversation(p.id)
  if (id != null) await open(id)
}
function toggleGroup(id: number, v?: any) {
  const next = new Set(groupSel.value)
  if (v ?? !next.has(id)) next.add(id); else next.delete(id)
  groupSel.value = next
}
async function doCreateGroup() {
  const ids = Array.from(groupSel.value)
  const id = await store.createGroup(ids, groupTitle.value || '')
  showPicker.value = false
  if (id != null) await open(id)
}
function onSearch() {
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(() => store.search(searchKw.value), 400)
}
async function jump(s: any) {
  showSearch.value = false
  await open(s.conversationId)
}

function scrollToBottom() {
  nextTick(() => {
    if (scrollEl.value) scrollEl.value.scrollTop = scrollEl.value.scrollHeight
  })
}
watch(() => store.activeMessages.length, scrollToBottom)

onMounted(async () => {
  store.init()
  await store.refreshConversations()
  const u = route.query.user
  if (u) {
    const id = await store.ensureSingleConversation(Number(u))
    if (id != null) await open(id)
  }
})
onUnmounted(() => store.closeConversation())
</script>

<style scoped>
.m-chat { height: 100vh; display: flex; flex-direction: column; background: #f2f3f5; }
.m-chat-head { display: flex; align-items: center; gap: 8px; padding: 10px 12px; background: #fff; border-bottom: 1px solid #e6e8eb; }
.m-chat-title { font-size: 17px; font-weight: 700; flex: 1; text-align: center; }
.m-chat-head-actions { display: flex; gap: 4px; }
.m-back { font-size: 26px; line-height: 1; background: none; border: none; color: #185fa5; cursor: pointer; }

.m-conv-scroll { flex: 1; overflow-y: auto; }
.m-conv { display: flex; align-items: center; gap: 10px; padding: 12px; background: #fff; border-bottom: 1px solid #f0f2f5; }
.m-conv-avatar { width: 46px; height: 46px; border-radius: 8px; background: linear-gradient(135deg,#1E5AA8,#5B8FC9); color:#fff; display:flex; align-items:center; justify-content:center; font-size:18px; position: relative; flex-shrink:0; }
.m-conv-avatar.group { background: linear-gradient(135deg,#07c160,#3ad08a); }
.m-online { position:absolute; right:-2px; bottom:-2px; width:11px; height:11px; border-radius:50%; background:#07c160; border:2px solid #fff; }
.m-conv-main { flex:1; min-width:0; }
.m-conv-top { display:flex; justify-content:space-between; }
.m-conv-name { font-size:15px; font-weight:600; color:#1a1a2e; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.m-conv-time { font-size:11px; color:#bbb; flex-shrink:0; }
.m-conv-bottom { display:flex; justify-content:space-between; align-items:center; margin-top:3px; }
.m-conv-last { font-size:13px; color:#999; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; flex:1; }
.m-conv-badge { background:#f44336; color:#fff; font-size:11px; min-width:16px; height:16px; border-radius:8px; display:flex; align-items:center; justify-content:center; padding:0 4px; margin-left:6px; }
.m-empty { text-align:center; color:#999; padding:40px 10px; font-size:13px; }

.m-thread { flex:1; display:flex; flex-direction:column; min-height:0; }
.m-msg-scroll { flex:1; overflow-y:auto; padding:12px; }
.m-msg { display:flex; margin-bottom:12px; }
.m-msg.mine { justify-content:flex-end; }
.m-sys { align-self:center; font-size:12px; color:#999; background:rgba(0,0,0,.04); padding:3px 10px; border-radius:10px; margin:0 auto; }
.m-bubble { display:inline-block; max-width:74%; padding:9px 12px; border-radius:10px; background:#fff; font-size:15px; line-height:1.5; word-break:break-word; }
.m-msg.mine .m-bubble { background:linear-gradient(135deg,#1E5AA8,#2b7fc4); color:#fff; }
.m-bubble.deleted { color:#999; font-style:italic; }
.m-bubble.failed { opacity:.6; }
.m-img { max-width:180px; max-height:180px; border-radius:8px; display:block; }
.m-file { color:#1E5AA8; text-decoration:none; font-size:14px; }
.m-msg-tools { font-size:11px; color:#999; margin-top:2px; display:flex; gap:8px; justify-content:flex-end; }
.m-read { color:#07c160; }
.m-recall { color:#ee0a24; cursor:pointer; }

.m-input-bar { display:flex; align-items:center; gap:6px; padding:8px 10px; background:#fff; border-top:1px solid #e6e8eb; }
.m-icon-btn { font-size:20px; background:none; border:none; cursor:pointer; }
.m-text { flex:1; border:1px solid #e0e2e5; border-radius:8px; padding:8px 10px; font-size:15px; outline:none; }
.m-send { background:#1E5AA8; color:#fff; border:none; border-radius:8px; padding:8px 14px; font-size:14px; }
.m-send:active { opacity:.8; }

.m-picker { max-height:60vh; overflow-y:auto; }
.m-picker-tabs { display:flex; gap:16px; padding:4px 2px 8px; }
.m-picker-tabs span { font-size:14px; color:#999; padding-bottom:4px; }
.m-picker-tabs span.on { color:#1E5AA8; font-weight:700; border-bottom:2px solid #1E5AA8; }
.m-picker-item { display:flex; align-items:center; gap:10px; padding:10px 4px; border-bottom:1px solid #f0f2f5; }
.m-picker-avatar { width:38px; height:38px; border-radius:8px; background:linear-gradient(135deg,#1E5AA8,#5B8FC9); color:#fff; display:flex; align-items:center; justify-content:center; font-size:15px; flex-shrink:0; }
.m-picker-info { flex:1; }
.m-picker-name { font-size:14px; }
.m-picker-dept { font-size:12px; color:#999; }
.m-search-list { max-height:55vh; overflow-y:auto; }
.m-search-item { padding:10px 4px; border-bottom:1px solid #f0f2f5; }
.m-search-conv { font-size:13px; color:#1E5AA8; font-weight:600; }
.m-search-content { font-size:13px; color:#333; }
</style>
