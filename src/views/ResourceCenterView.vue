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

    <div class="rc-guide">
      <el-alert :title="guide.title" :type="guide.type" :closable="false" show-icon>
        <template #default>
          <p class="rc-guide-text">{{ guide.text }}</p>
          <ul v-if="guide.items" class="rc-guide-list">
            <li v-for="(item, idx) in guide.items" :key="idx">
              <span class="rc-guide-tag" :style="{ background: item.color }">{{ item.tag }}</span>
              <span class="rc-guide-desc">{{ item.desc }}</span>
            </li>
          </ul>
        </template>
      </el-alert>
    </div>

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

const guides = {
  files: {
    title: '文件库使用指引',
    type: 'info',
    text: '文件库用于集中存放代码配置、压缩包、安装包、音视频、文档、图片等资料。上传前请选择左侧分类，系统将自动识别格式并提供对应预览。',
    items: [
      { tag: '代码/配置', color: '#E6F7FF', desc: 'JS / TS / Vue / Java / Python / SQL / JSON / YAML / XML / CSS / Shell 等（支持语法高亮预览）' },
      { tag: '压缩包/安装包', color: '#FFF2E8', desc: 'ZIP / RAR / 7Z / EXE / MSI / DMG / APK / APPX 等（≤2G，仅下载，不支持在线预览）' },
      { tag: '音视频', color: '#F6FFED', desc: 'MP4 / WEBM / MP3 / WAV / OGG / AVI / MOV 等（≤2G，支持在线播放）' },
      { tag: '文档/图片', color: '#F0F5FF', desc: 'Word / Excel / PPT / PDF / JPG / PNG / GIF / SVG / WEBP 等（支持在线预览）' }
    ]
  },
  kb: {
    title: '知识文章使用指引',
    type: 'success',
    text: '知识文章用于沉淀公司制度、技术文档、销售资料、操作手册等结构化内容。支持按分类浏览、搜索和编辑。'
  },
  cat: {
    title: '产品分类使用指引',
    type: 'warning',
    text: '产品分类用于维护项目/产品目录，展示不同类别下的项目信息。如需上传文件，请切换到「文件库」分类。'
  }
}
const guide = computed(() => guides[active.value as keyof typeof guides])

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

.rc-guide {
  padding: 0.75rem 1.5rem;
  background: rgba(255, 255, 255, 0.7);
  border-bottom: 1px solid rgba(100, 149, 237, 0.15);
}
.rc-guide-text {
  margin: 0.5rem 0 0.25rem;
  line-height: 1.6;
  color: #4a5568;
  font-size: 0.9rem;
}
.rc-guide-list {
  margin: 0.5rem 0 0;
  padding-left: 0;
  list-style: none;
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}
.rc-guide-list li {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  background: rgba(255, 255, 255, 0.8);
  border: 1px solid rgba(0, 0, 0, 0.05);
  border-radius: 6px;
  padding: 0.35rem 0.6rem;
}
.rc-guide-tag {
  font-size: 0.8rem;
  font-weight: 600;
  color: #2d3748;
  padding: 0.15rem 0.45rem;
  border-radius: 4px;
  white-space: nowrap;
}
.rc-guide-desc {
  font-size: 0.8rem;
  color: #4a5568;
}
</style>
