<template>
  <div class="resource-center">
    <header class="rc-header">
      <el-button text @click="goBack" class="back-btn">← 返回</el-button>
      <h2 class="rc-title">
        <span class="title-icon">📁</span>
        资料中心
      </h2>
      <div class="rc-spacer"></div>
      <div class="rc-totals">
        <span>文件 {{ stats.totals.files }}</span>
        <span>文章 {{ stats.totals.articles }}</span>
        <span>项目 {{ stats.totals.projects }}</span>
      </div>
      <!-- 全局搜索框：一次跨 文件 / 文章 / 项目 三类聚合 -->
      <div class="rc-search">
        <el-input
          v-model="searchKeyword"
          placeholder="搜索文件 / 文章 / 项目"
          prefix-icon="Search"
          clearable
          size="small"
          class="rc-search-input"
        />
        <el-button v-if="showSearch" size="small" text class="rc-search-clear" @click="clearSearch">退出搜索</el-button>
      </div>
      <el-button class="manage-btn" size="small" @click="showAddCatDialog = true">管理分类</el-button>
    </header>

    <div class="rc-body">
      <!-- 左侧统一分类树 -->
      <aside class="rc-sidebar">
        <div class="sidebar-title">
          资料分类
          <span class="count-hint">仅显示{{ segmentLabel }}计数</span>
        </div>
        <div class="cat-tree">
          <!-- 全部：跨分类聚合视图 -->
          <div
            class="cat-node all-node"
            :class="{ active: selected.id === 'all', dim: allTotal === 0 }"
            @click="selectAll"
          >
            <div class="cat-node-main">
              <span class="cat-dot all-dot"></span>
              <span class="cat-node-name">全部</span>
            </div>
            <div class="cat-node-counts">
              <span :class="{ zero: allTotal === 0 }">📦 {{ allTotal }}</span>
            </div>
          </div>

          <div
            v-for="cat in stats.categories"
            :key="cat.id"
            class="cat-node"
            :class="{ active: selected.id === cat.id, dim: countOf(cat) === 0 }"
            @click="selectCategory(cat.id, cat.name)"
          >
            <div class="cat-node-main">
              <span class="cat-dot"></span>
              <span class="cat-node-name">{{ cat.name }}</span>
              <el-button text size="small" class="cat-edit-btn" title="编辑分类" @click.stop="editCategory(cat)">
                <el-icon><Edit /></el-icon>
              </el-button>
              <el-button text size="small" class="cat-del-btn" title="删除分类" @click.stop="removeCategory(cat)">
                <el-icon><Delete /></el-icon>
              </el-button>
            </div>
            <div class="cat-node-counts">
              <span :class="{ zero: countOf(cat) === 0 }">{{ countIcon }} {{ countOf(cat) }}</span>
            </div>
          </div>

          <!-- 未分类桶 -->
          <div
            class="cat-node uncat"
            :class="{ active: selected.id === null, dim: uncategorizedCount === 0 }"
            @click="selectCategory(null, '未分类')"
          >
            <div class="cat-node-main">
              <span class="cat-dot uncat-dot"></span>
              <span class="cat-node-name">未分类</span>
            </div>
            <div class="cat-node-counts">
              <span :class="{ zero: uncategorizedCount === 0 }">{{ countIcon }} {{ uncategorizedCount }}</span>
            </div>
          </div>
        </div>
        <div v-if="stats.categories.length === 0" class="cat-empty">
          暂无分类，点击右上角「管理分类」创建
        </div>
      </aside>

      <!-- 右侧内容区 -->
      <main class="rc-main">
        <!-- 搜索结果三段视图 -->
        <div v-if="showSearch" class="rc-search-results" v-loading="searching">
          <div class="search-summary">
            搜索「<b>{{ searchKeyword }}</b>」：文件 {{ searchResult?.counts.files || 0 }} 条 · 文章 {{ searchResult?.counts.articles || 0 }} 条 · 项目 {{ searchResult?.counts.projects || 0 }} 条
          </div>

          <section class="search-section">
            <h4 class="search-section-title">📄 文件（{{ searchResult?.files.length || 0 }}）</h4>
            <div v-if="(searchResult?.files || []).length === 0" class="search-empty">无匹配文件</div>
            <div v-else class="search-list">
              <a v-for="f in searchResult.files" :key="'f'+f.id" class="search-item" :href="f.url" target="_blank" rel="noopener">
                <span class="si-main">{{ displayName(f.name) }}</span>
                <span class="si-sub">{{ f.categoryName || '未分类' }} · {{ formatSize(f.size) }}</span>
              </a>
            </div>
          </section>

          <section class="search-section">
            <h4 class="search-section-title">📚 文章（{{ searchResult?.articles.length || 0 }}）</h4>
            <div v-if="(searchResult?.articles || []).length === 0" class="search-empty">无匹配文章</div>
            <div v-else class="search-list">
              <div v-for="a in searchResult.articles" :key="'a'+a.id" class="search-item" @click="openSearchArticle(a)">
                <span class="si-main">{{ a.title }}</span>
                <span class="si-sub">{{ a.author || '未知' }} · {{ a.categoryName || '未分类' }} · 👁️ {{ a.views || 0 }}</span>
              </div>
            </div>
          </section>

          <section class="search-section">
            <h4 class="search-section-title">📦 项目（{{ searchResult?.projects.length || 0 }}）</h4>
            <div v-if="(searchResult?.projects || []).length === 0" class="search-empty">无匹配项目</div>
            <div v-else class="search-list">
              <div v-for="p in searchResult.projects" :key="'p'+p.id" class="search-item" @click="selectProjectCategory(p)">
                <span class="si-main">{{ p.project_name }}</span>
                <span class="si-sub">{{ p.category_name || '未分类' }} · {{ p.manager || p.applicant_name || '' }} · {{ p.status || '未开始' }}</span>
              </div>
            </div>
          </section>
        </div>

        <!-- 常规分类视图 -->
        <template v-else>
          <nav class="rc-segments">
            <button
              v-for="s in visibleSegments"
              :key="s.key"
              class="rc-seg-btn"
              :class="{ active: activeSegment === s.key }"
              @click="activeSegment = s.key"
            >
              {{ s.label }}
            </button>
          </nav>

          <div class="rc-content">
            <FilePanel v-if="activeSegment === 'files'" :all="scope === 'all'" :categoryId="scope === 'category' ? (selected.id as number) : null" :categoryName="selected.name" />
            <ArticlePanel v-else-if="activeSegment === 'articles'" :all="scope === 'all'" :categoryId="scope === 'category' ? (selected.id as number) : null" :categoryName="selected.name" />
            <ProjectPanel v-else-if="activeSegment === 'projects'" :all="scope === 'all'" :categoryId="scope === 'category' ? (selected.id as number) : null" :categoryName="selected.name" />
            <div v-else class="rc-no-segment">当前账号无资料中心访问权限</div>
          </div>
        </template>
      </main>
    </div>

    <!-- 新增分类 -->
    <el-dialog v-model="showAddCatDialog" title="创建资料分类" width="420px">
      <el-form :model="newCat" label-width="80px">
        <el-form-item label="分类名称">
          <el-input v-model="newCat.name" placeholder="请输入分类名称" />
        </el-form-item>
        <el-form-item label="分类描述">
          <el-input v-model="newCat.description" type="textarea" :rows="3" placeholder="请输入分类描述" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showAddCatDialog = false">取消</el-button>
        <el-button type="primary" @click="createCategory">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { Delete, Edit } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useMenuPermission } from '@/composables/useMenuPermission'
import { getResourceCenterCategories, getFileCategories, addFileCategory, deleteFileCategory, renameFileCategory, searchResourceCenter } from '../services/api'
import type { ResourceSearchResult } from '../services/api'
import FilePanel from '../components/resource/FilePanel.vue'
import ArticlePanel from '../components/resource/ArticlePanel.vue'
import ProjectPanel from '../components/resource/ProjectPanel.vue'

const router = useRouter()
const { hasMenu } = useMenuPermission()

interface CategoryStat {
  id: number
  name: string
  description: string
  fileCount: number
  articleCount: number
  projectCount: number
}
const stats = ref<{ categories: CategoryStat[]; uncategorized: { fileCount: number; articleCount: number; projectCount: number }; totals: { files: number; articles: number; projects: number } }>({
  categories: [],
  uncategorized: { fileCount: 0, articleCount: 0, projectCount: 0 },
  totals: { files: 0, articles: 0, projects: 0 }
})

// 选中的分类节点：id 可为 数字(具体分类) / 'all'(跨分类全部) / null(未分类)
const selected = ref<{ id: number | null | string; name: string }>({ id: null, name: '未分类' })
const scope = computed<'all' | 'uncategorized' | 'category'>(() => {
  if (selected.value.id === 'all') return 'all'
  if (selected.value.id === null) return 'uncategorized'
  return 'category'
})
const allTotal = computed(() => stats.value.totals.files + stats.value.totals.articles + stats.value.totals.projects)

// 资料中心合并为单条菜单权限后，三个分段均受 /resource-center 控制
const segments = [
  { key: 'files', label: '文件', perm: '/resource-center' },
  { key: 'articles', label: '文章', perm: '/resource-center' },
  { key: 'projects', label: '项目信息', perm: '/resource-center' }
]
const visibleSegments = computed(() => segments.filter(s => hasMenu(s.perm)))
const activeSegment = ref('files')

// 侧边栏计数跟随当前段落，避免每个分类都堆三个数字（截图里 4 个分类都是「3 0 0」噪音很大）
const segmentMeta: Record<string, { label: string; icon: string; key: 'fileCount' | 'articleCount' | 'projectCount' }> = {
  files: { label: '文件', icon: '📄', key: 'fileCount' },
  articles: { label: '文章', icon: '📚', key: 'articleCount' },
  projects: { label: '项目信息', icon: '📦', key: 'projectCount' }
}
const segmentLabel = computed(() => segmentMeta[activeSegment.value]?.label || '文件')
const countIcon = computed(() => segmentMeta[activeSegment.value]?.icon || '📄')
const countOf = (cat: CategoryStat): number => {
  const meta = segmentMeta[activeSegment.value]
  return meta ? Number((cat as unknown as Record<string, unknown>)[meta.key] || 0) : 0
}
const uncategorizedCount = computed(() => {
  const meta = segmentMeta[activeSegment.value]
  if (!meta) return 0
  return Number((stats.value.uncategorized as unknown as Record<string, unknown>)[meta.key] || 0)
})

const showAddCatDialog = ref(false)
const newCat = ref({ name: '', description: '' })

const selectAll = () => { selected.value = { id: 'all', name: '全部' } }
const selectCategory = (id: number | null, name: string) => { selected.value = { id, name } }

const loadCategories = async () => {
  try {
    const res = await getResourceCenterCategories()
    if (res.success && res.data) stats.value = res.data
  } catch (e) { console.error('加载资料分类失败:', e) }
  // 若当前选中分类已不存在，回退到 未分类
  if (typeof selected.value.id === 'number' && !stats.value.categories.some(c => c.id === selected.value.id)) {
    selected.value = { id: null, name: '未分类' }
  }
}

const createCategory = async () => {
  if (!newCat.value.name.trim()) { ElMessage.warning('请输入分类名称'); return }
  try {
    const res = await addFileCategory({ name: newCat.value.name.trim(), description: newCat.value.description.trim() })
    if (res.success) {
      await loadCategories()
      showAddCatDialog.value = false
      newCat.value = { name: '', description: '' }
      ElMessage.success('分类创建成功')
    } else ElMessage.error(res.message || '创建分类失败')
  } catch (e: any) { ElMessage.error(e.message || '创建分类失败') }
}

const removeCategory = async (cat: CategoryStat) => {
  try {
    // 删除分类会连带删除该分类下的全部文件，且不可恢复；当前所有用户都可管理分类，
    // 因此这里强制「输入分类名」二次确认，避免误点。
    await ElMessageBox.prompt(
      `分类「${cat.name}」下的 ${cat.fileCount} 个文件会被一并删除且无法恢复；该分类下的文章会转入「未分类」，项目信息会变为未归属。请输入分类名称以确认：`,
      '删除分类（不可恢复）',
      {
        confirmButtonText: '确认删除',
        cancelButtonText: '取消',
        type: 'warning',
        inputPlaceholder: cat.name,
        inputValidator: (v: string) => (v || '').trim() === cat.name || '输入的分类名称不一致'
      }
    )
    const res = await deleteFileCategory(cat.id)
    if (res.success) {
      await loadCategories()
      if (selected.value.id === cat.id) selected.value = { id: null, name: '未分类' }
      ElMessage.success('分类已删除')
    } else ElMessage.error(res.message || '删除分类失败')
  } catch (e: any) {
    if (e !== 'cancel' && e !== 'close') ElMessage.error(e?.message || '删除分类失败')
  }
}

// 编辑分类：改名/改描述。改名会同步项目信息按分类名关联的行（后端已处理）。
const editCategory = async (cat: CategoryStat) => {
  try {
    const { value: newName } = await ElMessageBox.prompt(
      `修改分类「${cat.name}」的名称：`,
      '编辑分类',
      {
        confirmButtonText: '保存',
        cancelButtonText: '取消',
        inputValue: cat.name,
        inputValidator: (v: string) => (v && v.trim() ? true : '分类名称不能为空')
      }
    )
    const res = await renameFileCategory(cat.id, { name: newName.trim(), description: cat.description || '' })
    if (res.success) {
      await loadCategories()
      if (selected.value.id === cat.id) selected.value = { id: cat.id, name: newName.trim() }
      ElMessage.success('分类已更新')
    } else ElMessage.error(res.message || '更新分类失败')
  } catch (e: any) {
    if (e !== 'cancel' && e !== 'close') ElMessage.error(e?.message || '更新分类失败')
  }
}

// ===== 全局搜索 =====
const searchKeyword = ref('')
const searchResult = ref<ResourceSearchResult | null>(null)
const searching = ref(false)
const showSearch = computed(() => searchKeyword.value.trim().length > 0)
let searchTimer: ReturnType<typeof setTimeout> | null = null
const doSearch = async () => {
  const kw = searchKeyword.value.trim()
  if (!kw) { searchResult.value = null; return }
  searching.value = true
  try {
    const res = await searchResourceCenter(kw, localStorage.getItem('username') || '')
    if (res.success) searchResult.value = res.data
  } catch (e) { console.error('搜索失败:', e) }
  finally { searching.value = false }
}
watch(searchKeyword, () => {
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(doSearch, 300)
})
const clearSearch = () => { searchKeyword.value = ''; searchResult.value = null }

const displayName = (raw: string) => {
  if (!raw) return raw
  if (!raw.includes('%')) return raw
  try { return decodeURIComponent(raw) } catch { return raw }
}
const formatSize = (s: number) => {
  if (!s) return '0 B'
  if (s < 1024) return s + ' B'
  if (s < 1048576) return (s / 1024).toFixed(1) + ' KB'
  return (s / 1048576).toFixed(1) + ' MB'
}
const openSearchArticle = (a: any) => {
  // 定位到该文章所属分类的文章分段，退出搜索态
  const name = (a.categoryName || '').trim()
  clearSearch()
  if (name && stats.value.categories.some(c => c.name === name)) {
    const cat = stats.value.categories.find(c => c.name === name)!
    selectCategory(cat.id, cat.name)
  } else {
    selectCategory(null, '未分类')
  }
  activeSegment.value = 'articles'
}
const selectProjectCategory = (p: any) => {
  const name = (p.category_name || '').trim()
  clearSearch()
  if (name && stats.value.categories.some(c => c.name === name)) {
    const cat = stats.value.categories.find(c => c.name === name)!
    selectCategory(cat.id, cat.name)
  } else {
    selectAll()
  }
  activeSegment.value = 'projects'
}

// 权限加载完成后校正可见段落与默认选中
watch(visibleSegments, (vs) => {
  if (!vs.find(s => s.key === activeSegment.value) && vs.length > 0) activeSegment.value = vs[0].key
}, { immediate: true })

const goBack = () => router.push('/')

onMounted(() => {
  loadCategories()
  // 默认选中第一个分类（若有），否则全部
  getFileCategories().then(res => {
    if (res.success && res.data && res.data.length > 0) selected.value = { id: res.data[0].id, name: res.data[0].name }
  }).catch(() => {})
})
</script>

<style scoped>
.resource-center { display: flex; flex-direction: column; height: 100vh; background: #E4EDF2; overflow: hidden; }
.rc-header { background: rgba(255,255,255,0.9); backdrop-filter: blur(10px); border-bottom: 1px solid rgba(30, 90, 168,0.3); padding: 0.6rem 1.5rem; display: flex; align-items: center; gap: 1rem; box-shadow: 0 2px 10px rgba(0,0,0,0.1); z-index: 100; flex-wrap: wrap; }
.back-btn { color: #666; }
.rc-title { font-size: 1.25rem; font-weight: 600; color: #333; display: flex; align-items: center; gap: 0.5rem; margin: 0; }
.title-icon { font-size: 1.4rem; }
.rc-spacer { flex: 1; }
.rc-totals { display: flex; gap: 1rem; font-size: 0.85rem; color: #555; }
.rc-totals span { background: rgba(30, 90, 168,0.1); padding: 0.25rem 0.6rem; border-radius: 12px; }
.rc-search { display: flex; align-items: center; gap: 0.5rem; }
.rc-search-input { width: 240px; }
.rc-search-clear { color: #1E5AA8 !important; }
.manage-btn { background: linear-gradient(45deg,#1E5AA8,#87CEEB) !important; border: none !important; color: #fff !important; }

.rc-body { flex: 1; min-height: 0; display: flex; }
.rc-sidebar { width: 260px; flex-shrink: 0; background: rgba(255,255,255,0.85); backdrop-filter: blur(5px); border-right: 1px solid rgba(30, 90, 168,0.2); padding: 1rem 0.75rem; overflow-y: auto; }
.sidebar-title { padding: 0 0.5rem 0.75rem; font-size: 0.85rem; font-weight: 600; color: #999; text-transform: uppercase; letter-spacing: 1px; }
.count-hint { display: block; margin-top: 3px; font-size: 0.72rem; font-weight: 400; letter-spacing: 0; text-transform: none; color: #bbb; }
.cat-tree { display: flex; flex-direction: column; gap: 0.5rem; }
.cat-node { padding: 0.65rem 0.75rem; border-radius: 10px; cursor: pointer; transition: all 0.2s; border: 1px solid transparent; }
.cat-node:hover { background: rgba(30, 90, 168,0.1); }
.cat-node.active { background: rgba(30, 90, 168,0.16); border-color: rgba(30, 90, 168,0.4); }
.cat-node.dim { opacity: 0.55; }
.cat-node.dim:hover { opacity: 1; }
.cat-node-main { display: flex; align-items: center; gap: 0.5rem; }
.cat-dot { width: 8px; height: 8px; border-radius: 50%; background: #1E5AA8; flex-shrink: 0; }
.cat-node.all-node { background: rgba(30, 90, 168,0.06); }
.cat-node.all-node .all-dot { background: linear-gradient(45deg,#1E5AA8,#87CEEB); }
.cat-node.uncat .uncat-dot { background: #faad14; }
.cat-node-name { font-weight: 500; color: #333; font-size: 0.95rem; flex: 1; }
.cat-del-btn { margin-left: auto; color: #d32f2f !important; opacity: 0.35; transition: opacity 0.2s; padding: 0 !important; height: auto !important; }
.cat-node:hover .cat-del-btn { opacity: 1; }
.cat-node-counts { display: flex; gap: 0.75rem; margin-top: 0.35rem; padding-left: 1.1rem; font-size: 0.75rem; color: #888; }
.cat-node-counts span.zero { color: #c8ccd4; }
.cat-empty { padding: 1.5rem 0.5rem; color: #999; font-size: 0.85rem; text-align: center; }

.rc-main { flex: 1; min-width: 0; display: flex; flex-direction: column; }
.rc-segments { display: flex; gap: 0.25rem; padding: 0.75rem 1.5rem 0; background: rgba(255,255,255,0.6); border-bottom: 1px solid rgba(30, 90, 168,0.2); }
.rc-seg-btn { border: none; background: transparent; padding: 0.6rem 1.25rem; font-size: 0.95rem; color: #666; cursor: pointer; border-bottom: 2px solid transparent; transition: all 0.2s; border-radius: 6px 6px 0 0; }
.rc-seg-btn:hover { background: rgba(30, 90, 168,0.08); color: #2E6FB8; }
.rc-seg-btn.active { color: #2E6FB8; font-weight: 600; border-bottom-color: #1E5AA8; background: rgba(30, 90, 168,0.12); }
.rc-content { flex: 1; min-height: 0; overflow-y: auto; padding: 1.25rem 1.5rem; }
.rc-no-segment { color: #999; text-align: center; padding: 3rem; }

.rc-search-results { flex: 1; min-height: 0; overflow-y: auto; padding: 1.25rem 1.5rem; }
.search-summary { font-size: 0.9rem; color: #555; margin-bottom: 1rem; padding: 0.5rem 0.75rem; background: rgba(30, 90, 168,0.08); border-radius: 8px; }
.search-section { margin-bottom: 1.5rem; }
.search-section-title { font-size: 1rem; font-weight: 600; color: #333; margin: 0 0 0.6rem; border-left: 3px solid #1E5AA8; padding-left: 0.6rem; }
.search-empty { color: #999; font-size: 0.85rem; padding: 0.5rem 0; }
.search-list { display: flex; flex-direction: column; gap: 0.4rem; }
.search-item { display: flex; flex-direction: column; gap: 2px; padding: 0.6rem 0.8rem; background: #fff; border: 1px solid rgba(30, 90, 168,0.15); border-radius: 8px; cursor: pointer; transition: all 0.2s; text-decoration: none; color: inherit; }
.search-item:hover { background: rgba(30, 90, 168,0.1); border-color: rgba(30, 90, 168,0.4); }
.si-main { font-weight: 500; color: #333; font-size: 0.95rem; }
.si-sub { font-size: 0.78rem; color: #8a94a6; }
</style>
