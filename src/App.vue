﻿﻿﻿﻿﻿<template>
  <div class="app-container">
    <router-view />
    <AiAssistant v-if="ENABLE_AI_ASSISTANT" />
    <MessageBubbleAssistant v-if="route.name !== 'login'" />
    <GlobalSearchModal />
    <RecycleBinDrawer v-if="route.name !== 'login'" />
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import AiAssistant from './components/AiAssistant.vue'
import MessageBubbleAssistant from './components/MessageBubbleAssistant.vue'
import GlobalSearchModal from './components/GlobalSearchModal.vue'
import RecycleBinDrawer from './components/RecycleBinDrawer.vue'
import { useGlobalSearch } from './composables/useGlobalSearch'

// 功能开关：当前暂无用户使用 AI 助手，先隐藏；后续上线改为 true 即可一键恢复
const ENABLE_AI_ASSISTANT = false

const router = useRouter()
const route = useRoute()

const { open } = useGlobalSearch()

function onKeydown(e: KeyboardEvent) {
  if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')) {
    e.preventDefault()
    open()
  }
}

onMounted(() => { window.addEventListener('keydown', onKeydown) })

onUnmounted(() => { window.removeEventListener('keydown', onKeydown) })
</script>

<style scoped>
.app-container {
  width: 100%;
  min-height: 100vh;
  background: var(--bg-color);
  overflow-x: hidden;
  overflow-y: auto;
  position: relative;
}
</style>
