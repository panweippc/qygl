<template>
  <div ref="outerRef" class="pc-scale-outer">
    <div ref="innerRef" class="pc-scale-inner" :style="{ width: BASE + 'px', transform: 'scale(' + scale + ')' }">
      <component :is="comp" v-if="comp" />
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()
const outerRef = ref(null)
const innerRef = ref(null)
const scale = ref(1)
const comp = ref(null)
// PC 页面按此基准宽度渲染，再整体缩放进手机屏（保留原左右/多列布局）
const BASE = 1024

async function load() {
  const loader = route.meta && route.meta.pcComponent
  if (typeof loader === 'function') {
    const mod = await loader()
    comp.value = mod.default
    await nextTick()
    fit()
  }
}

function fit() {
  const w = window.innerWidth
  scale.value = w / BASE
  if (outerRef.value && innerRef.value) {
    // transform: scale 不改变布局占位，手动把外层高度设为缩放后的真实高度
    outerRef.value.style.height = Math.ceil(innerRef.value.scrollHeight * scale.value) + 'px'
  }
}

onMounted(() => {
  load()
  fit()
  window.addEventListener('resize', fit)
})

watch(() => route.fullPath, () => {
  load()
  setTimeout(fit, 350)
})

onUnmounted(() => window.removeEventListener('resize', fit))
</script>

<style scoped>
.pc-scale-outer {
  width: 100%;
  max-width: 100%;
  overflow-x: auto;
  overflow-y: hidden;
  background: #f5f7fa;
  -webkit-overflow-scrolling: touch;
}
.pc-scale-inner {
  transform-origin: top left;
}
</style>
