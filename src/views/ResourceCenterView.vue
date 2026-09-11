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
          <FilePanel v-if="activeSegment === 'files'" :categoryId="selected.id" :categoryName="selected.name" />
          <ArticlePanel v-else-if="activeSegment === 'articles'" :categoryId="selected.id" :categoryName="selected.name" />
          <ProjectPanel v-else-if="activeSegment === 'projects'" :categoryId="selected.id" :categoryName="selected.name" />
        </div>
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
import { Delete } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useMenuPermission } from '@/composables/useMenuPermission'
import { getResourceCenterCategories, getFileCategories, addFileCategory, deleteFileCategory } from '../services/api'
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

const selected = ref<{ id: number | null; name: string }>({ id: null, name: '未分类' })

const segments = [
  { key: 'files', label: '文件', perm: '/file-storage' },
  { key: 'articles', label: '文章', perm: '/knowledge-base' },
  { key: 'projects', label: '项目信息', perm: '/project-category' }
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

const selectCategory = (id: number | null, name: string) => { selected.value = { id, name } }

const loadCategories = async () => {
  try {
    const res = await getResourceCenterCategories()
    if (res.success && res.data) stats.value = res.data
  } catch (e) { console.error('加载资料分类失败:', e) }
  // 若当前选中分类已不存在，回退到 未分类
  if (selected.value.id !== null && !stats.value.categories.some(c => c.id === selected.value.id)) {
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

// 权限加载完成后校正可见段落与默认选中
watch(visibleSegments, (vs) => {
  if (!vs.find(s => s.key === activeSegment.value) && vs.length > 0) activeSegment.value = vs[0].key
}, { immediate: true })

const goBack = () => router.push('/')

onMounted(() => {
  loadCategories()
  // 默认选中第一个分类（若有），否则未分类
  getFileCategories().then(res => {
    if (res.success && res.data && res.data.length > 0) selected.value = { id: res.data[0].id, name: res.data[0].name }
  }).catch(() => {})
})
</script>

<style scoped>
.resource-center { display: flex; flex-direction: column; height: 100vh; background: #E4EDF2; overflow: hidden; }
.rc-header { background: rgba(255,255,255,0.9); backdrop-filter: blur(10px); border-bottom: 1px solid rgba(100,149,237,0.3); padding: 0.6rem 1.5rem; display: flex; align-items: center; gap: 1rem; box-shadow: 0 2px 10px rgba(0,0,0,0.1); z-index: 100; }
.back-btn { color: #666; }
.rc-title { font-size: 1.25rem; font-weight: 600; color: #333; display: flex; align-items: center; gap: 0.5rem; margin: 0; }
.title-icon { font-size: 1.4rem; }
.rc-spacer { flex: 1; }
.rc-totals { display: flex; gap: 1rem; font-size: 0.85rem; color: #555; }
.rc-totals span { background: rgba(100,149,237,0.1); padding: 0.25rem 0.6rem; border-radius: 12px; }
.manage-btn { background: linear-gradient(45deg,#6495ED,#87CEEB) !important; border: none !important; color: #fff !important; }

.rc-body { flex: 1; min-height: 0; display: flex; }
.rc-sidebar { width: 260px; flex-shrink: 0; background: rgba(255,255,255,0.85); backdrop-filter: blur(5px); border-right: 1px solid rgba(100,149,237,0.2); padding: 1rem 0.75rem; overflow-y: auto; }
.sidebar-title { padding: 0 0.5rem 0.75rem; font-size: 0.85rem; font-weight: 600; color: #999; text-transform: uppercase; letter-spacing: 1px; }
.count-hint { display: block; margin-top: 3px; font-size: 0.72rem; font-weight: 400; letter-spacing: 0; text-transform: none; color: #bbb; }
.cat-tree { display: flex; flex-direction: column; gap: 0.5rem; }
.cat-node { padding: 0.65rem 0.75rem; border-radius: 10px; cursor: pointer; transition: all 0.2s; border: 1px solid transparent; }
.cat-node:hover { background: rgba(100,149,237,0.1); }
.cat-node.active { background: rgba(100,149,237,0.16); border-color: rgba(100,149,237,0.4); }
.cat-node.dim { opacity: 0.55; }
.cat-node.dim:hover { opacity: 1; }
.cat-node-main { display: flex; align-items: center; gap: 0.5rem; }
.cat-dot { width: 8px; height: 8px; border-radius: 50%; background: #6495ED; flex-shrink: 0; }
.cat-node.uncat .uncat-dot { background: #faad14; }
.cat-node-name { font-weight: 500; color: #333; font-size: 0.95rem; flex: 1; }
.cat-del-btn { margin-left: auto; color: #d32f2f !important; opacity: 0.35; transition: opacity 0.2s; padding: 0 !important; height: auto !important; }
.cat-node:hover .cat-del-btn { opacity: 1; }
.cat-node-counts { display: flex; gap: 0.75rem; margin-top: 0.35rem; padding-left: 1.1rem; font-size: 0.75rem; color: #888; }
.cat-node-counts span.zero { color: #c8ccd4; }
.cat-empty { padding: 1.5rem 0.5rem; color: #999; font-size: 0.85rem; text-align: center; }

.rc-main { flex: 1; min-width: 0; display: flex; flex-direction: column; }
.rc-segments { display: flex; gap: 0.25rem; padding: 0.75rem 1.5rem 0; background: rgba(255,255,255,0.6); border-bottom: 1px solid rgba(100,149,237,0.2); }
.rc-seg-btn { border: none; background: transparent; padding: 0.6rem 1.25rem; font-size: 0.95rem; color: #666; cursor: pointer; border-bottom: 2px solid transparent; transition: all 0.2s; border-radius: 6px 6px 0 0; }
.rc-seg-btn:hover { background: rgba(100,149,237,0.08); color: #4169E1; }
.rc-seg-btn.active { color: #4169E1; font-weight: 600; border-bottom-color: #6495ED; background: rgba(100,149,237,0.12); }
.rc-content { flex: 1; min-height: 0; overflow-y: auto; padding: 1.25rem 1.5rem; }
</style>
