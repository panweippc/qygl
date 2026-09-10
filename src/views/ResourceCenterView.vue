<template>
  <div class="resource-center">
    <header class="rc-header">
      <el-button text @click="goBack" class="back-btn">← 返回</el-button>
      <h2 class="rc-title">
        <span class="title-icon">📁</span>
        资料中心
      </h2>
      <div class="rc-spacer"></div>
    </header>

    <nav class="rc-tabs">
      <button
        v-for="t in visibleTabs"
        :key="t.key"
        class="rc-tab-btn"
        :class="{ active: active === t.key }"
        @click="active = t.key"
      >
        {{ t.label }}
      </button>
    </nav>

    <main class="rc-body">
      <div class="rc-tab">
        <FileStorageView v-show="active === 'files'" />
        <KnowledgeBaseView v-show="active === 'kb'" />
        <ProjectCategoryView v-show="active === 'cat'" />
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useMenuPermission } from '@/composables/useMenuPermission'
import FileStorageView from '../views/FileStorageView.vue'
import KnowledgeBaseView from '../views/KnowledgeBaseView.vue'
import ProjectCategoryView from '../views/ProjectCategoryView.vue'

const router = useRouter()
const { hasMenu } = useMenuPermission()

const tabs = [
  { key: 'files', label: '文件库', perm: '/file-storage' },
  { key: 'kb', label: '知识文章', perm: '/knowledge-base' },
  { key: 'cat', label: '产品分类', perm: '/project-category' }
]

const visibleTabs = computed(() => tabs.filter(t => hasMenu(t.perm)))
const active = ref('files')

// 权限加载后若当前标签不可见，自动切到第一个可见标签
watch(visibleTabs, (vt) => {
  if (!vt.find(t => t.key === active.value) && vt.length > 0) {
    active.value = vt[0].key
  }
}, { immediate: true })

const goBack = () => {
  router.push('/')
}
</script>

<style scoped>
.resource-center {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: #E4EDF2;
  overflow: hidden;
}
.rc-header {
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid rgba(100, 149, 237, 0.3);
  padding: 0.6rem 1.5rem;
  display: flex;
  align-items: center;
  gap: 1rem;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  z-index: 100;
}
.back-btn { color: #666; }
.rc-title {
  font-size: 1.25rem;
  font-weight: 600;
  color: #333;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin: 0;
}
.title-icon { font-size: 1.4rem; }
.rc-spacer { flex: 1; }

.rc-tabs {
  display: flex;
  gap: 0.25rem;
  padding: 0.5rem 1.5rem 0;
  background: rgba(255, 255, 255, 0.6);
  border-bottom: 1px solid rgba(100, 149, 237, 0.2);
}
.rc-tab-btn {
  border: none;
  background: transparent;
  padding: 0.6rem 1.25rem;
  font-size: 0.95rem;
  color: #666;
  cursor: pointer;
  border-bottom: 2px solid transparent;
  transition: all 0.2s;
  border-radius: 6px 6px 0 0;
}
.rc-tab-btn:hover { background: rgba(100, 149, 237, 0.08); color: #4169E1; }
.rc-tab-btn.active {
  color: #4169E1;
  font-weight: 600;
  border-bottom-color: #6495ED;
  background: rgba(100, 149, 237, 0.12);
}

.rc-body {
  flex: 1;
  min-height: 0;
  display: flex;
}
.rc-tab {
  flex: 1;
  min-width: 0;
  height: 100%;
  overflow: hidden;
}

/* 嵌入的子视图：撑满标签区，并隐藏其自身顶栏/页脚，避免双重头部与"返回"误触 */
.rc-tab :deep(.file-storage-container),
.rc-tab :deep(.knowledge-base),
.rc-tab :deep(.project-category-container) {
  height: 100% !important;
  min-height: 0 !important;
}
.rc-tab :deep(.file-storage-container > .header),
.rc-tab :deep(.file-storage-container > .footer),
.rc-tab :deep(.knowledge-base > .page-header),
.rc-tab :deep(.project-category-container > .header) {
  display: none !important;
}
</style>
