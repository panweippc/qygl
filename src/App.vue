﻿﻿﻿﻿﻿<template>
  <div class="app-container">
    <router-view />
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'

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
