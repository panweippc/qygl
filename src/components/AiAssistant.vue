<template>
  <div class="ai-fab-wrap">
    <transition name="ai-pop">
      <div v-if="store.open" class="ai-panel">
        <div class="ai-header">
          <div class="ai-title"><span class="ai-dot"></span> AI 小助手</div>
          <button class="ai-close" @click="store.toggle()">×</button>
        </div>

        <div class="ai-body" ref="bodyRef">
          <div v-if="store.messages.length === 0" class="ai-empty">
            你好，我是系统 AI 小助手。你可以直接说需求，或点下面的快捷操作。
          </div>
          <div v-for="m in store.messages" :key="m.id" :class="['ai-msg', m.role]">
            <div class="ai-bubble">{{ m.text }}</div>
            <div v-if="m.action && m.action.type === 'navigate'" class="ai-actions">
              <el-button size="small" type="primary" @click="go(m.action.path)">去处理</el-button>
              <el-button v-if="m.action.canPrefill" size="small" @click="prefillAsset()">帮我填好</el-button>
            </div>
          </div>
        </div>

        <div class="ai-shortcuts">
          <button
            v-for="s in store.shortcuts"
            :key="s.id"
            class="ai-chip"
            @click="store.sendShortcut(s.id, s.label)"
          >
            {{ s.label }}
          </button>
        </div>

        <div class="ai-input">
          <input
            v-model="store.input"
            class="ai-text"
            placeholder="说说你想做什么…"
            @keyup.enter="store.sendText()"
          />
          <button class="ai-send" :disabled="store.loading" @click="store.sendText()">发送</button>
        </div>
      </div>
    </transition>

    <button v-if="!store.open" class="ai-fab" @click="store.toggle()">
      <span>AI</span>
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, nextTick, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAiStore } from '../stores/ai'

const store = useAiStore()
const router = useRouter()
const bodyRef = ref<HTMLElement | null>(null)

onMounted(() => {
  if (store.shortcuts.length === 0) store.init()
})

watch(
  () => store.messages.length,
  async () => {
    await nextTick()
    if (bodyRef.value) bodyRef.value.scrollTop = bodyRef.value.scrollHeight
  }
)

function go(path: string) {
  router.push(path)
  store.toggle()
}

function prefillAsset() {
  const today = new Date().toISOString().slice(0, 10)
  const dept = localStorage.getItem('department') || ''
  store.setPrefill('asset', { acquireDate: today, status: '在用', department: dept })
  router.push('/asset-management?action=add')
  store.toggle()
}
</script>

<style scoped>
.ai-fab-wrap {
  position: fixed;
  right: 24px;
  bottom: 24px;
  z-index: 3000;
}
.ai-fab {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  border: none;
  background: #185fa5;
  color: #fff;
  font-size: 18px;
  font-weight: 600;
  cursor: pointer;
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.25);
}
.ai-fab:hover {
  background: #0c447c;
}
.ai-panel {
  width: 360px;
  height: 520px;
  background: #fff;
  border-radius: 14px;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.18);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border: 1px solid #ebeef5;
}
.ai-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 14px;
  background: #185fa5;
  color: #fff;
}
.ai-title {
  font-size: 14px;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 8px;
}
.ai-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #67c23a;
  display: inline-block;
}
.ai-close {
  background: transparent;
  border: none;
  color: #fff;
  font-size: 20px;
  cursor: pointer;
  line-height: 1;
}
.ai-body {
  flex: 1;
  overflow-y: auto;
  padding: 14px;
  background: #f7f9fc;
}
.ai-empty {
  color: #909399;
  font-size: 13px;
  line-height: 1.6;
}
.ai-msg {
  margin-bottom: 14px;
  display: flex;
  flex-direction: column;
}
.ai-msg.user {
  align-items: flex-end;
}
.ai-msg.ai {
  align-items: flex-start;
}
.ai-bubble {
  max-width: 80%;
  padding: 8px 12px;
  border-radius: 10px;
  font-size: 13px;
  line-height: 1.6;
}
.ai-msg.user .ai-bubble {
  background: #185fa5;
  color: #fff;
  border-bottom-right-radius: 2px;
}
.ai-msg.ai .ai-bubble {
  background: #fff;
  color: #303133;
  border: 1px solid #ebeef5;
  border-bottom-left-radius: 2px;
}
.ai-actions {
  margin-top: 6px;
  display: flex;
  gap: 8px;
}
.ai-shortcuts {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding: 10px 12px;
  border-top: 1px solid #ebeef5;
  background: #fff;
  max-height: 92px;
  overflow-y: auto;
}
.ai-chip {
  border: 1px solid #dcdfe6;
  background: #f4f7fb;
  color: #185fa5;
  border-radius: 14px;
  padding: 4px 10px;
  font-size: 12px;
  cursor: pointer;
}
.ai-chip:hover {
  background: #e6f1fb;
}
.ai-input {
  display: flex;
  gap: 8px;
  padding: 10px 12px;
  border-top: 1px solid #ebeef5;
  background: #fff;
}
.ai-text {
  flex: 1;
  border: 1px solid #dcdfe6;
  border-radius: 8px;
  padding: 8px 10px;
  font-size: 13px;
  outline: none;
}
.ai-text:focus {
  border-color: #185fa5;
}
.ai-send {
  border: none;
  background: #185fa5;
  color: #fff;
  border-radius: 8px;
  padding: 0 16px;
  cursor: pointer;
  font-size: 13px;
}
.ai-send:disabled {
  opacity: 0.6;
  cursor: default;
}
</style>
