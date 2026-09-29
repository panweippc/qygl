<template>
  <div class="ai-fab-wrap">
    <transition name="ai-pop">
      <div v-if="store.open" class="ai-panel">
        <div class="ai-header">
          <div class="ai-title">
            <span class="ai-logo">✦</span>
            <div class="ai-title-text">
              <div class="ai-title-main">AI 小助手</div>
              <div class="ai-title-sub">智能引导 · 快捷答疑</div>
            </div>
          </div>
          <button class="ai-close" @click="store.toggle()">×</button>
        </div>

        <div class="ai-body" ref="bodyRef">
          <!-- 欢迎引导（无消息时） -->
          <div v-if="store.messages.length === 0" class="ai-welcome">
            <div class="ai-hello">{{ greeting }}，我是系统 AI 小助手 👋</div>
            <div class="ai-hello-sub">可以直接输入需求，也可以从下面的常用事项开始：</div>
            <div class="ai-cards">
              <button v-for="c in FEATURED" :key="c.title" class="ai-card" @click="store.sendRaw(c.text)">
                <span class="ai-card-icon">{{ c.icon }}</span>
                <span class="ai-card-body">
                  <span class="ai-card-title">{{ c.title }}</span>
                  <span class="ai-card-desc">{{ c.desc }}</span>
                </span>
              </button>
            </div>
            <div class="ai-ask-title">热门问题</div>
            <div class="ai-ask-chips">
              <button
                v-for="s in store.shortcuts.slice(0, 6)"
                :key="s.id"
                class="ai-chip"
                @click="store.sendShortcut(s.id, s.label)"
              >
                {{ s.label }}
              </button>
            </div>
          </div>

          <!-- 消息流 -->
          <template v-for="m in store.messages" :key="m.id">
            <div :class="['ai-msg', m.role]">
              <div v-if="m.role === 'ai'" class="ai-avatar">✦</div>
              <div class="ai-msg-main">
                <div class="ai-bubble">{{ m.text }}</div>

                <!-- 操作卡片 -->
                <div v-if="m.action && m.action.type === 'navigate'" class="ai-action-card">
                  <div class="ai-action-row">
                    <span class="ai-action-icon">→</span>
                    <span class="ai-action-label">{{ m.intentLabel || '前往处理' }}</span>
                  </div>
                  <div class="ai-action-btns">
                    <button class="ai-btn primary" @click="go(m.action.path)">去处理</button>
                    <button v-if="m.action.canPrefill" class="ai-btn" @click="prefillAsset()">帮我填好</button>
                  </div>
                </div>

                <!-- 相关推荐 -->
                <div v-if="m.related && m.related.length" class="ai-related">
                  <div class="ai-related-title">你可能想问：</div>
                  <div class="ai-related-chips">
                    <button v-for="r in m.related" :key="r.id" class="ai-chip sm" @click="store.sendRaw(r.text)">
                      {{ r.label }}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </template>

          <!-- 打字动效 -->
          <div v-if="store.loading" class="ai-msg ai">
            <div class="ai-avatar">✦</div>
            <div class="ai-msg-main">
              <div class="ai-bubble typing"><span></span><span></span><span></span></div>
            </div>
          </div>
        </div>

        <div class="ai-shortcuts" v-if="store.shortcuts.length">
          <button
            v-for="s in store.shortcuts"
            :key="s.id"
            class="ai-chip"
            :disabled="store.loading"
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
      <span>✦</span>
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, nextTick, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAiStore, FEATURED } from '../stores/ai'

const store = useAiStore()
const router = useRouter()
const bodyRef = ref<HTMLElement | null>(null)

const greeting = computed(() => {
  const h = new Date().getHours()
  if (h < 6) return '夜深了'
  if (h < 12) return '上午好'
  if (h < 14) return '中午好'
  if (h < 18) return '下午好'
  return '晚上好'
})

// 打开面板时初始化（含本地兜底快捷指令，立即可点）
watch(
  () => store.open,
  (v) => {
    if (v && store.shortcuts.length === 0) store.init()
  },
  { immediate: true }
)

watch(
  () => store.messages.length,
  async () => {
    await nextTick()
    if (bodyRef.value) bodyRef.value.scrollTop = bodyRef.value.scrollHeight
  }
)
watch(
  () => store.loading,
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
  background: linear-gradient(135deg, #2b7de1, #185fa5);
  color: #fff;
  font-size: 20px;
  cursor: pointer;
  box-shadow: 0 4px 14px rgba(24, 95, 165, 0.4);
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}
.ai-fab:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 18px rgba(24, 95, 165, 0.5);
}
.ai-panel {
  width: 380px;
  height: 580px;
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.18);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border: 1px solid #ebeef5;
}
.ai-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: linear-gradient(135deg, #2b7de1, #14568f);
  color: #fff;
}
.ai-title {
  display: flex;
  align-items: center;
  gap: 10px;
}
.ai-logo {
  width: 32px;
  height: 32px;
  border-radius: 9px;
  background: rgba(255, 255, 255, 0.18);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
}
.ai-title-main {
  font-size: 14px;
  font-weight: 600;
  line-height: 1.2;
}
.ai-title-sub {
  font-size: 11px;
  opacity: 0.75;
  line-height: 1.4;
}
.ai-close {
  background: transparent;
  border: none;
  color: #fff;
  font-size: 22px;
  cursor: pointer;
  line-height: 1;
  opacity: 0.85;
}
.ai-close:hover {
  opacity: 1;
}
.ai-body {
  flex: 1;
  overflow-y: auto;
  padding: 16px 14px;
  background: #f5f8fc;
}
.ai-body::-webkit-scrollbar {
  width: 5px;
}
.ai-body::-webkit-scrollbar-thumb {
  background: #d3dce8;
  border-radius: 3px;
}

/* ---- 欢迎引导 ---- */
.ai-welcome {
  animation: fade-up 0.25s ease;
}
.ai-hello {
  font-size: 16px;
  font-weight: 600;
  color: #1f2d3d;
  margin-bottom: 4px;
}
.ai-hello-sub {
  font-size: 12px;
  color: #8a94a6;
  margin-bottom: 14px;
}
.ai-cards {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin-bottom: 16px;
}
.ai-card {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 12px 10px;
  background: #fff;
  border: 1px solid #e4eaf2;
  border-radius: 12px;
  cursor: pointer;
  text-align: left;
  transition: all 0.15s ease;
}
.ai-card:hover {
  border-color: #9cc3ee;
  box-shadow: 0 4px 12px rgba(43, 125, 225, 0.12);
  transform: translateY(-1px);
}
.ai-card-icon {
  font-size: 20px;
  line-height: 1.2;
}
.ai-card-body {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}
.ai-card-title {
  font-size: 13px;
  font-weight: 600;
  color: #2c3e50;
}
.ai-card-desc {
  font-size: 11px;
  color: #8a94a6;
  line-height: 1.4;
}
.ai-ask-title {
  font-size: 11px;
  color: #a0aab8;
  margin-bottom: 8px;
}
.ai-ask-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

/* ---- 消息流 ---- */
.ai-msg {
  margin-bottom: 14px;
  display: flex;
  gap: 8px;
  animation: fade-up 0.2s ease;
}
.ai-msg.user {
  justify-content: flex-end;
}
.ai-avatar {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  background: linear-gradient(135deg, #2b7de1, #14568f);
  color: #fff;
  font-size: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  margin-top: 2px;
}
.ai-msg-main {
  max-width: 82%;
  min-width: 0;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}
.ai-msg.user .ai-msg-main {
  align-items: flex-end;
}
.ai-bubble {
  padding: 9px 12px;
  border-radius: 12px;
  font-size: 13px;
  line-height: 1.65;
  word-break: break-word;
}
.ai-msg.user .ai-bubble {
  background: linear-gradient(135deg, #2b7de1, #185fa5);
  color: #fff;
  border-bottom-right-radius: 4px;
}
.ai-msg.ai .ai-bubble {
  background: #fff;
  color: #303133;
  border: 1px solid #e8edf4;
  border-bottom-left-radius: 4px;
  box-shadow: 0 1px 3px rgba(31, 45, 61, 0.05);
}

/* 操作卡片 */
.ai-action-card {
  margin-top: 8px;
  background: #fff;
  border: 1px solid #d6e4f6;
  border-left: 3px solid #2b7de1;
  border-radius: 10px;
  padding: 10px 12px;
  width: 100%;
}
.ai-action-row {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 8px;
}
.ai-action-icon {
  color: #2b7de1;
  font-weight: 700;
}
.ai-action-label {
  font-size: 12px;
  font-weight: 600;
  color: #2c3e50;
}
.ai-action-btns {
  display: flex;
  gap: 8px;
}
.ai-btn {
  border: 1px solid #dcdfe6;
  background: #fff;
  color: #2b7de1;
  border-radius: 7px;
  padding: 5px 14px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.15s;
}
.ai-btn:hover {
  border-color: #2b7de1;
  background: #f0f7ff;
}
.ai-btn.primary {
  background: #2b7de1;
  border-color: #2b7de1;
  color: #fff;
}
.ai-btn.primary:hover {
  background: #1e6bd0;
}

/* 相关推荐 */
.ai-related {
  margin-top: 8px;
  width: 100%;
}
.ai-related-title {
  font-size: 11px;
  color: #a0aab8;
  margin-bottom: 6px;
}
.ai-related-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

/* 打字动效 */
.typing {
  display: flex;
  gap: 4px;
  align-items: center;
  padding: 12px 14px;
}
.typing span {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #b6c4d6;
  animation: blink 1.2s infinite;
}
.typing span:nth-child(2) {
  animation-delay: 0.2s;
}
.typing span:nth-child(3) {
  animation-delay: 0.4s;
}
@keyframes blink {
  0%,
  80%,
  100% {
    opacity: 0.3;
    transform: scale(0.85);
  }
  40% {
    opacity: 1;
    transform: scale(1);
  }
}
@keyframes fade-up {
  from {
    opacity: 0;
    transform: translateY(6px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* ---- 底部快捷指令 ---- */
.ai-shortcuts {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding: 10px 12px;
  border-top: 1px solid #ebeef5;
  background: #fff;
  max-height: 96px;
  overflow-y: auto;
}
.ai-chip {
  border: 1px solid #d8e4f2;
  background: #f4f8fd;
  color: #1e6bd0;
  border-radius: 14px;
  padding: 4px 11px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.15s;
}
.ai-chip:hover {
  background: #e6f1fb;
  border-color: #9cc3ee;
}
.ai-chip:disabled {
  opacity: 0.5;
  cursor: default;
}
.ai-chip.sm {
  padding: 3px 9px;
  font-size: 11px;
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
  transition: border-color 0.15s;
}
.ai-text:focus {
  border-color: #2b7de1;
  box-shadow: 0 0 0 2px rgba(43, 125, 225, 0.1);
}
.ai-send {
  border: none;
  background: #2b7de1;
  color: #fff;
  border-radius: 8px;
  padding: 0 16px;
  cursor: pointer;
  font-size: 13px;
  transition: background 0.15s;
}
.ai-send:hover {
  background: #1e6bd0;
}
.ai-send:disabled {
  opacity: 0.6;
  cursor: default;
}
</style>
