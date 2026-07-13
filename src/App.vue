﻿﻿﻿﻿﻿<template>
  <div class="app-container">
    <div class="global-tech-bg">
      <div class="bg-grid"></div>
      <div class="bg-particles"></div>
    </div>
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

.global-tech-bg {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: -1;
  pointer-events: none;
}

.bg-grid {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-image: 
    linear-gradient(rgba(100, 149, 237, 0.1) 1px, transparent 1px),
    linear-gradient(90deg, rgba(100, 149, 237, 0.1) 1px, transparent 1px);
  background-size: 30px 30px;
  animation: gridMove 30s linear infinite;
}

@keyframes gridMove {
  0% { transform: translate(0, 0); }
  100% { transform: translate(30px, 30px); }
}

.bg-particles {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: radial-gradient(circle at 20% 30%, rgba(100, 149, 237, 0.1) 0%, transparent 20%),
              radial-gradient(circle at 80% 70%, rgba(100, 149, 237, 0.1) 0%, transparent 20%),
              radial-gradient(circle at 40% 80%, rgba(100, 149, 237, 0.1) 0%, transparent 20%),
              radial-gradient(circle at 70% 20%, rgba(100, 149, 237, 0.1) 0%, transparent 20%);
  animation: particleFloat 20s ease-in-out infinite;
}

@keyframes particleFloat {
  0%, 100% { transform: scale(1); opacity: 0.3; }
  50% { transform: scale(1.1); opacity: 0.6; }
}

.tech-fade-enter-active,
.tech-fade-leave-active {
  transition: all var(--transition-slow);
}

.tech-fade-enter-from {
  opacity: 0;
  transform: translateY(20px) scale(0.95);
  filter: blur(10px);
}

.tech-fade-leave-to {
  opacity: 0;
  transform: translateY(-20px) scale(1.05);
  filter: blur(10px);
}
</style>
