﻿﻿﻿﻿﻿<template>
  <div class="app-container">
    <router-view />
    <AiAssistant v-if="ENABLE_AI_ASSISTANT" />
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import AiAssistant from './components/AiAssistant.vue'

// 功能开关：当前暂无用户使用 AI 助手，先隐藏；后续上线改为 true 即可一键恢复
const ENABLE_AI_ASSISTANT = false

const router = useRouter()

onMounted(() => {})

onUnmounted(() => {})
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
