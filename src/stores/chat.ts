import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import {
  getChatConversations,
  createChatConversation,
  getChatMessages,
  sendChatMessageApi,
  markChatRead,
  addChatMembers,
  getChatMembers,
  recallChatMessage as recallApi,
  searchChatMessages,
  getChatUnreadCount,
  getEmployeeDirectory,
  type ChatConversation,
  type ChatMessage
} from '@/services/api'
import { getSocket, emitChat } from '@/services/socket'
import type { EmployeeDirectoryEntry } from '@/services/types'

function myId(): number {
  return Number(localStorage.getItem('userId') || 0)
}
function myName(): string {
  try {
    const u = JSON.parse(localStorage.getItem('user') || '{}')
    return u.name || u.username || localStorage.getItem('username') || ''
  } catch {
    return localStorage.getItem('username') || ''
  }
}

export const useChatStore = defineStore('chat', () => {
  const me = ref(myId())
  const meName = ref(myName())
  const conversations = ref<ChatConversation[]>([])
  const activeId = ref<number | null>(null)
  const messagesByConv = ref<Record<number, ChatMessage[]>>({})
  const messagesLoading = ref(false)
  const conversationsLoading = ref(false)
  const onlineEmployees = ref<Set<number>>(new Set())
  const typingByConv = ref<Record<number, number[]>>({})
  const readPointers = ref<Record<number, Record<number, number>>>({})
  const unreadTotal = ref(0)
  const directory = ref<EmployeeDirectoryEntry[]>([])
  const membersByConv = ref<Record<number, { user_id: number; username: string; role: string }[]>>({})
  const searchResults = ref<any[]>([])
  const socketReady = ref(false)
  let listenersAttached = false
  let typingTimers: Record<string, ReturnType<typeof setTimeout>> = {}

  const activeConversation = computed(() =>
    conversations.value.find(c => c.id === activeId.value) || null
  )
  const activeMessages = computed(() =>
    activeId.value ? (messagesByConv.value[activeId.value] || []) : []
  )
  const isSingleWithOther = computed(() => {
    const c = activeConversation.value
    if (!c || c.type !== 'single') return null
    const other = c.members.find(m => m.user_id !== me.value)
    return other ? other.user_id : null
  })

  // ---------- Socket 事件 ----------
  function attachListeners() {
    if (listenersAttached) return
    const socket = getSocket()
    if (!socket) return
    listenersAttached = true

    socket.on('connect', () => {
      socketReady.value = true
      // 重连后重新加入当前会话房间
      if (activeId.value) {
        socket.emit('joinChat', activeId.value)
        void refreshConversations()
      }
    })
    socket.on('disconnect', () => { socketReady.value = false })

    socket.on('onlineEmployeeIds', (ids: number[]) => {
      onlineEmployees.value = new Set(ids)
    })

    socket.on('chat:message', (payload: { conversationId: number; message: ChatMessage; tempId?: string }) => {
      onIncomingMessage(payload)
    })
    socket.on('chat:typing', (payload: { conversationId: number; userId: number; isTyping: boolean }) => {
      if (payload.userId === me.value) return
      const list = typingByConv.value[payload.conversationId] || []
      const next = payload.isTyping
        ? Array.from(new Set([...list, payload.userId]))
        : list.filter(id => id !== payload.userId)
      typingByConv.value = { ...typingByConv.value, [payload.conversationId]: next }
      const key = `${payload.conversationId}:${payload.userId}`
      if (typingTimers[key]) clearTimeout(typingTimers[key])
      if (payload.isTyping) {
        typingTimers[key] = setTimeout(() => {
          const l = (typingByConv.value[payload.conversationId] || []).filter(id => id !== payload.userId)
          typingByConv.value = { ...typingByConv.value, [payload.conversationId]: l }
        }, 8000)
      }
    })
    socket.on('chat:read', (payload: { conversationId: number; userId: number; lastReadMessageId: number }) => {
      const map = readPointers.value[payload.conversationId] || {}
      map[payload.userId] = Math.max(map[payload.userId] || 0, payload.lastReadMessageId)
      readPointers.value = { ...readPointers.value, [payload.conversationId]: map }
    })
    socket.on('chat:message-recalled', (payload: { conversationId: number; messageId: number }) => {
      const arr = messagesByConv.value[payload.conversationId]
      if (arr) {
        const next = arr.map(m => (m.id === payload.messageId ? { ...m, deleted: true } : m))
        messagesByConv.value = { ...messagesByConv.value, [payload.conversationId]: next }
      }
    })
    socket.on('chat:members-changed', (payload: { conversationId: number }) => {
      void loadMembers(payload.conversationId)
    })
  }

  function onIncomingMessage(payload: { conversationId: number; message: ChatMessage; tempId?: string }) {
    const { conversationId, message, tempId } = payload
    const arr = messagesByConv.value[conversationId] || []
    // 用 tempId 替换乐观消息
    if (tempId) {
      const idx = arr.findIndex(m => m.tempId === tempId)
      if (idx >= 0) {
        const next = arr.slice()
        next[idx] = { ...message, tempId: undefined, sending: false }
        messagesByConv.value = { ...messagesByConv.value, [conversationId]: next }
        updateConvLastMessage(conversationId, message)
        return
      }
    }
    // 按 id 去重（避免 REST 回执与广播重复）
    if (arr.some(m => m.id === message.id)) {
      updateConvLastMessage(conversationId, message)
      return
    }
    messagesByConv.value = { ...messagesByConv.value, [conversationId]: [...arr, message] }
    updateConvLastMessage(conversationId, message)

    // 非当前会话 → 未读 +1
    if (conversationId !== activeId.value) {
      const conv = conversations.value.find(c => c.id === conversationId)
      if (conv) {
        conv.unread += 1
        conversations.value = [...conversations.value]
        unreadTotal.value += 1
      }
    }
  }

  function updateConvLastMessage(conversationId: number, message: ChatMessage) {
    const conv = conversations.value.find(c => c.id === conversationId)
    if (conv) {
      conv.lastMessage = {
        id: message.id,
        msgType: message.msgType,
        content: message.content,
        senderName: message.senderName,
        createdAt: message.createdAt,
        deleted: message.deleted
      }
      conv.updatedAt = message.createdAt
      // 保持按更新时间倒序
      conversations.value = [...conversations.value].sort(
        (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      )
    }
  }

  // ---------- 会话 ----------
  async function refreshConversations() {
    if (!me.value) return
    conversationsLoading.value = true
    try {
      const res = await getChatConversations(me.value)
      if (res.success) {
        conversations.value = res.data
        unreadTotal.value = res.data.reduce((s, c) => s + (c.unread || 0), 0)
      }
    } catch { /* ignore */ } finally {
      conversationsLoading.value = false
    }
  }

  async function openConversation(id: number) {
    activeId.value = id
    const conv = conversations.value.find(c => c.id === id)
    if (conv && conv.unread > 0) {
      conv.unread = 0
      conversations.value = [...conversations.value]
      unreadTotal.value = Math.max(0, conversations.value.reduce((s, c) => s + (c.unread || 0), 0))
    }
    emitChat('joinChat', id)
    await loadMessages(id)
    await markRead(id)
    await loadMembers(id)
  }

  function closeConversation() {
    if (activeId.value != null) emitChat('leaveChat', activeId.value)
    activeId.value = null
  }

  async function loadMessages(conversationId: number, before?: number) {
    if (!me.value) return
    messagesLoading.value = true
    try {
      const res = await getChatMessages(conversationId, me.value, before, 30)
      if (res.success) {
        const incoming = res.data
        const existing = messagesByConv.value[conversationId] || []
        let merged: ChatMessage[]
        if (before) {
          // 历史往前翻：incoming 是更旧的，拼在前面并去重
          const ids = new Set(existing.map(m => m.id))
          merged = [...incoming.filter(m => !ids.has(m.id)), ...existing]
        } else {
          // 重新加载：以服务端为准，保留乐观消息（id===0）
          const optimistic = existing.filter(m => m.id === 0)
          const ids = new Set(incoming.map(m => m.id))
          merged = [...incoming, ...optimistic.filter(m => !ids.has(0))]
        }
        messagesByConv.value = { ...messagesByConv.value, [conversationId]: merged }
      }
    } catch { /* ignore */ } finally {
      messagesLoading.value = false
    }
  }

  async function loadMembers(conversationId: number) {
    if (!me.value) return
    try {
      const res = await getChatMembers(conversationId, me.value)
      if (res.success) {
        membersByConv.value = { ...membersByConv.value, [conversationId]: res.data }
      }
    } catch { /* ignore */ }
  }

  async function markRead(conversationId: number) {
    if (!me.value) return
    try {
      await markChatRead(conversationId, me.value)
      emitChat('chat:read', { conversationId })
    } catch { /* ignore */ }
  }

  // ---------- 发送 ----------
  async function sendText(content: string) {
    const text = content.trim()
    if (!text || activeId.value == null) return
    const tempId = 't_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8)
    const optimistic: ChatMessage = {
      id: 0, conversationId: activeId.value, senderId: me.value,
      senderName: meName.value, msgType: 'text', content: text,
      attachmentUrl: null, attachmentName: null, attachmentSize: null,
      deleted: false, createdAt: new Date().toISOString(), tempId, sending: true, failed: false
    }
    appendOptimistic(activeId.value, optimistic)

    const sent = emitChat('chat:send', { conversationId: activeId.value, content: text, msgType: 'text', tempId })
    if (!sent) {
      // 降级走 REST（socket 未连接时）
      try {
        const res = await sendChatMessageApi(activeId.value, { employeeId: me.value, content: text, msgType: 'text' })
        if (res.success) onIncomingMessage({ conversationId: activeId.value, message: res.data, tempId })
      } catch {
        markFailed(activeId.value, tempId)
      }
    }
  }

  async function sendAttachment(file: File) {
    if (activeId.value == null) return
    const tempId = 't_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8)
    const isImage = file.type.startsWith('image/')
    const optimistic: ChatMessage = {
      id: 0, conversationId: activeId.value, senderId: me.value,
      senderName: meName.value, msgType: isImage ? 'image' : 'file', content: file.name,
      attachmentUrl: '', attachmentName: file.name, attachmentSize: file.size,
      deleted: false, createdAt: new Date().toISOString(), tempId, sending: true, failed: false
    }
    appendOptimistic(activeId.value, optimistic)

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('uploaderId', String(me.value))
      const r = await fetch('/api/upload', { method: 'POST', body: formData })
      const json = await r.json()
      if (json.success && json.data && json.data[0]) {
        const att = json.data[0]
        const res = await sendChatMessageApi(activeId.value, {
          employeeId: me.value, content: att.name, msgType: isImage ? 'image' : 'file',
          attachmentUrl: att.url, attachmentName: att.name, attachmentSize: att.size
        })
        if (res.success) onIncomingMessage({ conversationId: activeId.value, message: res.data, tempId })
        else markFailed(activeId.value, tempId)
      } else {
        markFailed(activeId.value, tempId)
      }
    } catch {
      markFailed(activeId.value, tempId)
    }
  }

  function appendOptimistic(conversationId: number, msg: ChatMessage) {
    const arr = messagesByConv.value[conversationId] || []
    messagesByConv.value = { ...messagesByConv.value, [conversationId]: [...arr, msg] }
    updateConvLastMessage(conversationId, msg)
  }
  function markFailed(conversationId: number, tempId: string) {
    const arr = messagesByConv.value[conversationId]
    if (arr) {
      const next = arr.map(m => (m.tempId === tempId ? { ...m, sending: false, failed: true } : m))
      messagesByConv.value = { ...messagesByConv.value, [conversationId]: next }
    }
  }

  async function recall(conversationId: number, messageId: number) {
    if (!me.value) return
    try {
      const res = await recallApi(conversationId, messageId, me.value)
      if (res.success) {
        const arr = messagesByConv.value[conversationId]
        if (arr) {
          const next = arr.map(m => (m.id === messageId ? { ...m, deleted: true } : m))
          messagesByConv.value = { ...messagesByConv.value, [conversationId]: next }
        }
      } else {
        return Promise.reject(res.message)
      }
    } catch (e) { return Promise.reject(e) }
  }

  // ---------- 发起会话 ----------
  async function ensureSingleConversation(otherId: number): Promise<number | null> {
    if (!me.value) return null
    try {
      const res = await createChatConversation({ employeeId: me.value, type: 'single', memberIds: [otherId] })
      if (res.success) {
        await refreshConversations()
        return res.data.id
      }
    } catch { /* ignore */ }
    return null
  }

  async function createGroup(memberIds: number[], title: string): Promise<number | null> {
    if (!me.value) return null
    try {
      const members = Array.from(new Set([me.value, ...memberIds])).filter(Boolean)
      const res = await createChatConversation({ employeeId: me.value, type: 'group', memberIds: members, title })
      if (res.success) {
        await refreshConversations()
        return res.data.id
      }
    } catch { /* ignore */ }
    return null
  }

  async function addMembers(conversationId: number, memberIds: number[]) {
    try {
      await addChatMembers(conversationId, memberIds)
      await loadMembers(conversationId)
      await refreshConversations()
    } catch { /* ignore */ }
  }

  // ---------- 搜索 ----------
  async function search(q: string) {
    if (!me.value) return
    try {
      const res = await searchChatMessages(me.value, q)
      if (res.success) searchResults.value = res.data
    } catch { /* ignore */ }
  }

  // ---------- 通讯录 / 部门 ----------
  async function loadDirectory() {
    try {
      const res = await getEmployeeDirectory()
      if (res.success) directory.value = res.data
    } catch { /* ignore */ }
  }

  const departments = computed(() => {
    const map: Record<string, EmployeeDirectoryEntry[]> = {}
    for (const e of directory.value) {
      const d = e.department || '未分组'
      ;(map[d] = map[d] || []).push(e)
    }
    return map
  })

  // 读取回执：单聊中对方是否已读我的某条消息
  function isReadByOther(message: ChatMessage): boolean {
    const c = activeConversation.value
    if (!c) return false
    if (c.type === 'single') {
      const other = c.members.find(m => m.user_id !== me.value)
      if (!other) return false
      const ptr = (readPointers.value[c.id] || {})[other.user_id] || 0
      return message.senderId === me.value && ptr >= message.id && message.id > 0
    }
    return false
  }

  function init() {
    me.value = myId()
    meName.value = myName()
    attachListeners()
    void refreshConversations()
    void loadDirectory()
  }

  return {
    me, meName, conversations, activeId, messagesByConv, messagesLoading, conversationsLoading,
    onlineEmployees, typingByConv, readPointers, unreadTotal, directory, membersByConv, searchResults,
    socketReady, activeConversation, activeMessages, isSingleWithOther, departments,
    attachListeners, refreshConversations, openConversation, closeConversation, loadMessages,
    loadMembers, markRead, sendText, sendAttachment, recall, ensureSingleConversation, createGroup,
    addMembers, search, loadDirectory, isReadByOther, init
  }
})
