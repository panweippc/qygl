<template>
  <div class="resource">
    <div class="search-bar">
      <input class="m-input" v-model="kw" placeholder="搜索文件 / 文章 / 项目" @keyup.enter="search" />
      <button class="m-btn ghost" @click="search">搜索</button>
    </div>

    <div v-if="loading" class="m-muted">搜索中…</div>
    <div v-else-if="done && resultsEmpty" class="m-muted">未找到「{{ lastKw }}」相关内容</div>

    <template v-if="files.length">
      <div class="m-card">
        <div class="m-title">文件（{{ files.length }}）</div>
        <a
          v-for="f in files"
          :key="'f' + f.id"
          class="res-item"
          :href="f.url"
          target="_blank"
          rel="noopener"
        >
          <div class="r-title">📄 {{ f.name }}</div>
          <div class="m-muted">{{ f.categoryName || '未分类' }} · {{ fsize(f.size) }}</div>
        </a>
      </div>
    </template>

    <template v-if="articles.length">
      <div class="m-card">
        <div class="m-title">文章（{{ articles.length }}）</div>
        <div v-for="a in articles" :key="'a' + a.id" class="res-item">
          <div class="r-title">📝 {{ a.title }}</div>
          <div class="m-muted">{{ a.author || '' }} · 阅读 {{ a.views || 0 }}</div>
        </div>
      </div>
    </template>

    <template v-if="projects.length">
      <div class="m-card">
        <div class="m-title">项目（{{ projects.length }}）</div>
        <div v-for="p in projects" :key="'p' + p.id" class="res-item">
          <div class="r-title">📦 {{ p.project_name }}</div>
          <div class="m-muted">{{ p.category_name || '' }} · {{ p.manager || '' }}</div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import api from '@/services/api'

const kw = ref('')
const lastKw = ref('')
const loading = ref(false)
const done = ref(false)
const files = ref<any[]>([])
const articles = ref<any[]>([])
const projects = ref<any[]>([])

const resultsEmpty = computed(
  () => files.value.length === 0 && articles.value.length === 0 && projects.value.length === 0
)

function fsize(n: number) {
  if (!n) return '-'
  if (n < 1024) return n + ' B'
  if (n < 1024 * 1024) return (n / 1024).toFixed(1) + ' KB'
  return (n / 1024 / 1024).toFixed(1) + ' MB'
}

async function search(initial = false) {
  const keyword = kw.value.trim()
  if (!initial && !keyword) return
  loading.value = true
  done.value = false
  lastKw.value = keyword
  try {
    const username = localStorage.getItem('username') || ''
    const res = await api.get(
      `/resource-center/search?keyword=${encodeURIComponent(keyword)}&username=${encodeURIComponent(username)}`
    )
    if (res.data && res.data.success) {
      const d = res.data.data || {}
      files.value = d.files || []
      articles.value = d.articles || []
      projects.value = d.projects || []
    }
  } catch (e) { /* ignore */ }
  finally {
    loading.value = false
    done.value = true
  }
}

search(true)
</script>

<style scoped>
.search-bar {
  display: flex; gap: 8px; padding: 12px 0;
}
.search-bar .m-input { flex: 1; }
.res-item {
  display: block; padding: 12px 0; border-top: 1px solid #f0f1f2;
  color: inherit; text-decoration: none;
}
.r-title { font-size: 14px; font-weight: 600; }
</style>
