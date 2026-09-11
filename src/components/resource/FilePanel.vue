<template>
  <div class="file-panel">
    <!-- 上传区域 -->
    <div class="upload-section">
      <div class="section-title">
        <span class="title-icon">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M19 3H5C3.9 3 3 3.9 3 5V19C3 20.1 3.9 21 5 21H19C20.1 21 21 20.1 21 19V5C21 3.9 20.1 3 19 3ZM19 19H5V5H19V19ZM12 17V13H8L12 9L16 13H12V17Z"/>
          </svg>
        </span>
        {{ uploadTitle }}
      </div>

      <!-- 跨分类 / 未分类视图下，上传前需要先指定目标分类 -->
      <div v-if="needPickUploadCategory" class="upload-target">
        <span class="upload-target-label">上传到分类：</span>
        <el-select v-model="uploadCategoryId" placeholder="请选择资料分类" size="small" style="width: 220px">
          <el-option v-for="c in categoryOptions" :key="c.id" :label="c.name" :value="c.id" />
        </el-select>
        <span class="upload-target-hint">当前为{{ scope === 'all' ? '全部文件' : '未分类' }}视图，需指定归档分类</span>
      </div>

      <el-card class="upload-guide-card" shadow="never">
        <div class="upload-guide-title">📋 可上传格式</div>
        <div class="upload-guide-grid">
          <div class="upload-guide-item">
            <span class="ug-tag" style="background:#E6F7FF">代码/配置</span>
            <span class="ug-desc">JS / TS / Vue / Java / Python / SQL / JSON / YAML / XML / CSS / Shell / INI / Properties</span>
          </div>
          <div class="upload-guide-item">
            <span class="ug-tag" style="background:#FFF2E8">压缩包/安装包</span>
            <span class="ug-desc">ZIP / RAR / 7Z / TAR / GZ / EXE / MSI / DMG / APK / APPX（≤2G，仅下载）</span>
          </div>
          <div class="upload-guide-item">
            <span class="ug-tag" style="background:#F6FFED">音视频</span>
            <span class="ug-desc">MP4 / WEBM / MP3 / WAV / OGG / AVI / MOV / MKV / FLV（≤2G，在线播放）</span>
          </div>
          <div class="upload-guide-item">
            <span class="ug-tag" style="background:#F0F5FF">文档/图片</span>
            <span class="ug-desc">PDF / DOC / DOCX / XLS / XLSX / PPT / PPTX / TXT / MD / JPG / PNG / GIF / SVG / WEBP</span>
          </div>
        </div>
      </el-card>

      <div class="upload-area">
        <el-upload
          class="upload-demo"
          :action="'/api/upload'"
          :auto-upload="true"
          :headers="uploadHeaders"
          :data="{ categoryId: effectiveUploadCategoryId, uploaderId: getUserId() }"
          :on-success="handleUploadSuccess"
          :on-error="handleUploadError"
          name="file"
          multiple
        >
          <div class="upload-trigger">
            <el-icon class="upload-icon"><Plus /></el-icon>
            <div class="upload-text">点击或拖拽文件到此处上传</div>
            <div class="upload-hint">支持 图片 / 文档 / 代码配置 / 压缩包·安装包(≤2G) / 音视频 等格式</div>
          </div>
        </el-upload>
      </div>
    </div>

    <!-- 未分类提示 -->
    <el-alert
      v-if="scope === 'uncategorized' && scopedFiles.length > 0"
      type="warning"
      :closable="false"
      show-icon
      title="未归入任何分类的文件"
      description="以下文件尚未分配到资料分类，可勾选后批量「归入分类」整理，整理后将从「未分类」移出。"
      style="margin-bottom:1rem"
    />

    <!-- 文件列表 -->
    <div class="file-section">
      <div class="section-header">
        <h3 class="section-subtitle">
          {{ listTitle }}
          <span class="count-badge">{{ filteredFiles.length }}</span>
          <span v-if="duplicateTotal > 0" class="dup-hint">其中重复文件 {{ duplicateTotal }} 个</span>
        </h3>
        <el-input
          v-model="searchQuery"
          placeholder="搜索文件名"
          prefix-icon="Search"
          class="search-input"
          clearable
        />
      </div>

      <!-- 按上传格式分类 + 排序 + 视图切换 -->
      <div class="file-tools">
        <div class="group-chips">
          <button
            v-for="chip in groupChips"
            :key="chip.key"
            class="chip"
            :class="{ active: activeGroup === chip.key, dim: chip.count === 0 && chip.key !== 'all' }"
            @click="activeGroup = chip.key"
          >
            {{ chip.label }}<span class="chip-count">{{ chip.count }}</span>
          </button>
        </div>
        <div class="tool-right">
          <el-checkbox v-model="duplicatesOnly" size="small">仅看重复</el-checkbox>
          <el-checkbox v-model="groupedView" size="small">按格式分组</el-checkbox>
          <el-select v-model="sortKey" size="small" style="width: 112px">
            <el-option label="上传时间" value="date" />
            <el-option label="文件名" value="name" />
            <el-option label="大小" value="size" />
          </el-select>
          <el-button size="small" class="sort-dir" @click="sortAsc = !sortAsc">
            {{ sortAsc ? '↑ 升序' : '↓ 降序' }}
          </el-button>
        </div>
      </div>

      <!-- 批量操作条 -->
      <div v-if="selectedIds.length > 0" class="batch-bar">
        <span class="batch-count">已选 {{ selectedIds.length }} 项</span>
        <el-dropdown trigger="click" @command="handleBatchAssign">
          <el-button size="small" type="primary">批量归入分类</el-button>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item :command="-1">移出分类（未分类）</el-dropdown-item>
              <el-dropdown-item v-for="c in categoryOptions" :key="c.id" :command="c.id">{{ c.name }}</el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
        <el-button size="small" @click="selectAllInView">全选当前 {{ filteredFiles.length }} 项</el-button>
        <el-button size="small" @click="selectedIds = []">取消选择</el-button>
        <el-button v-if="canDelete" size="small" type="danger" @click="handleBatchDelete">批量删除</el-button>
      </div>

      <div v-loading="loading">
        <section v-for="g in displayGroups" :key="g.key" class="group-block">
          <div v-if="groupedView" class="group-block-title">
            {{ g.label }}<span class="group-block-count">{{ g.files.length }}</span>
          </div>
          <div class="file-grid">
            <div
              v-for="file in g.files"
              :key="file.id"
              class="file-card"
              :class="{ selected: isSelected(file.id) }"
            >
              <div class="file-card-preview">
                <el-checkbox
                  class="card-check"
                  :model-value="isSelected(file.id)"
                  @change="toggleSelect(file.id)"
                />
                <img v-if="isImage(file)" :src="file.url" alt="" />
                <div v-else class="file-card-icon">
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M14 2H6C4.9 2 4 2.9 4 4V20C4 21.1 4.9 22 6 22H18C19.1 22 20 21.1 20 20V8L14 2ZM18 20H6V4H13V9H18V20Z"/>
                  </svg>
                  <span class="file-ext">{{ extOfFile(file).toUpperCase() || 'FILE' }}</span>
                </div>
                <span class="group-flag">{{ groupLabelOf(file) }}</span>
                <span v-if="file.categoryId == null" class="uncat-flag">未分类</span>
                <span
                  v-if="dupCountOf(file) > 1"
                  class="dup-flag"
                  :title="`同名文件共 ${dupCountOf(file)} 个`"
                >重复 ×{{ dupCountOf(file) }}</span>
              </div>
              <div class="file-card-info">
                <div class="file-card-name" :title="displayName(file.name)">{{ displayName(file.name) }}</div>
                <div class="file-card-meta">
                  <span class="file-card-size">{{ formatFileSize(file.size) }}</span>
                  <span class="file-card-date">{{ formatDate(file.createdAt) }}</span>
                </div>
                <div v-if="scope === 'all'" class="file-card-cat">
                  归属：{{ file.category || '未分类' }}
                </div>
                <div class="file-card-actions">
                  <el-button size="small" @click="viewFile(file)" class="action-btn">
                    <el-icon><View /></el-icon>预览
                  </el-button>
                  <el-button size="small" @click="downloadFile(file)" class="action-btn">
                    <el-icon><Download /></el-icon>下载
                  </el-button>
                  <el-dropdown trigger="click" @command="(id) => assignCategory(file, id)" class="assign-drop">
                    <el-button size="small" class="action-btn assign">
                      <el-icon><FolderOpened /></el-icon>归类
                    </el-button>
                    <template #dropdown>
                      <el-dropdown-menu>
                        <el-dropdown-item :command="-1">移出分类（未分类）</el-dropdown-item>
                        <el-dropdown-item v-for="c in categoryOptions" :key="c.id" :command="c.id">{{ c.name }}</el-dropdown-item>
                      </el-dropdown-menu>
                    </template>
                  </el-dropdown>
                  <el-button v-if="canDelete" size="small" @click="deleteFile(file.id)" class="action-btn delete">
                    <el-icon><Delete /></el-icon>删除
                  </el-button>
                </div>
              </div>
            </div>
          </div>
        </section>

        <div v-if="filteredFiles.length === 0" class="empty-file">
          <el-icon class="empty-icon"><Document /></el-icon>
          <div class="empty-text">{{ emptyText }}</div>
        </div>
      </div>
    </div>

    <!-- 文件预览弹窗 -->
    <el-dialog
      v-model="previewVisible"
      :title="previewFileData.name"
      width="760px"
      class="preview-dialog"
      destroy-on-close
    >
      <div class="preview-content">
        <img v-if="previewKind === 'image'" :src="previewFileData.url" class="image-preview" />
        <div v-else-if="previewKind === 'code'" class="code-preview">
          <pre v-html="previewCodeHtml"></pre>
        </div>
        <video v-else-if="previewKind === 'media' && isVideoExt" :src="previewMediaUrl" controls class="media-preview"></video>
        <audio v-else-if="previewKind === 'media'" :src="previewMediaUrl" controls class="media-preview"></audio>
        <div v-else-if="previewKind === 'text'" class="text-preview">
          <pre>{{ previewFileContent }}</pre>
        </div>
        <div v-else-if="previewKind === 'pdf'" class="pdf-preview">
          <iframe :src="previewFileData.url" frameborder="0" width="100%" height="500px"></iframe>
        </div>
        <div v-else class="other-preview">
          <div class="file-icon">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M14 2H6C4.9 2 4 2.9 4 4V20C4 21.1 4.9 22 6 22H18C19.1 22 20 21.1 20 20V8L14 2ZM18 20H6V4H13V9H18V20Z"/>
            </svg>
          </div>
          <p>该文件类型无法直接预览，请下载后查看</p>
          <el-button type="primary" @click="downloadFile(previewFileData)">下载文件</el-button>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { Plus, Delete, Download, Document, View, FolderOpened } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  getFiles, deleteFile as apiDeleteFile, getFileCategories, updateFileCategory,
  batchUpdateFileCategory, batchDeleteFiles
} from '../../services/api'
import { previewKindOf, isVideo, extOf, groupOf, GROUP_LABEL } from '../../utils/fileTypes'
import { highlightCode, extToLang } from '../../utils/codeHighlight'

const props = defineProps<{
  categoryId: number | null
  categoryName: string
  /** true = 跨分类「全部」视图（忽略 categoryId） */
  all?: boolean
}>()

interface FileItem {
  id: number
  name: string
  size: number
  type: string
  url: string
  uploaderId: number
  categoryId: number | null
  createdAt: string
  /** 后端 files 表的扩展名列（历史库可能不存在，取不到时用文件名推断） */
  ext?: string
  /** 列表接口 LEFT JOIN 出来的分类名 */
  category?: string
}

const loading = ref(false)
const searchQuery = ref('')
const files = ref<FileItem[]>([])

// ===== 作用域：全部 / 未分类 / 指定分类 =====
const scope = computed<'all' | 'uncategorized' | 'category'>(() => {
  if (props.all) return 'all'
  return props.categoryId === null ? 'uncategorized' : 'category'
})

const scopedFiles = computed<FileItem[]>(() => {
  if (scope.value === 'all') return files.value
  if (scope.value === 'uncategorized') return files.value.filter(f => f.categoryId == null)
  return files.value.filter(f => f.categoryId === props.categoryId)
})

// ===== 扩展名与格式分组 =====
// 说明：files.type 列历史上存的是 MIME（如 application/pdf），真实上传又存扩展名（如 docx），
// 两者都不能稳定推断格式，因此统一以文件名后缀为准，并优先使用后端 ext 列。
const extOfFile = (f: FileItem | { name?: string; ext?: string }): string => {
  const explicit = (f as any)?.ext
  if (explicit) return String(explicit).toLowerCase()
  return extOf((f as any)?.name || '')
}
const groupKeyOf = (f: FileItem) => groupOf(extOfFile(f))
const groupLabelOf = (f: FileItem) => GROUP_LABEL[groupKeyOf(f)] || '其他'

const GROUP_ORDER = ['image', 'doc', 'code', 'archive', 'media', 'other']

const groupCounts = computed<Record<string, number>>(() => {
  const m: Record<string, number> = {}
  for (const f of scopedFiles.value) {
    const k = groupKeyOf(f)
    m[k] = (m[k] || 0) + 1
  }
  return m
})

const groupChips = computed(() => [
  { key: 'all', label: '全部', count: scopedFiles.value.length },
  ...GROUP_ORDER.map(k => ({ key: k, label: GROUP_LABEL[k] || k, count: groupCounts.value[k] || 0 }))
])

const activeGroup = ref('all')
const groupedView = ref(false)
const duplicatesOnly = ref(false)
const sortKey = ref<'date' | 'name' | 'size'>('date')
const sortAsc = ref(false)

// ===== 重复文件检测：按解码后的文件名归组 =====
const dupCountMap = computed<Record<string, number>>(() => {
  const m: Record<string, number> = {}
  for (const f of scopedFiles.value) {
    const key = displayName(f.name).trim().toLowerCase()
    m[key] = (m[key] || 0) + 1
  }
  return m
})
const dupCountOf = (f: FileItem) => dupCountMap.value[displayName(f.name).trim().toLowerCase()] || 0
const duplicateTotal = computed(() =>
  scopedFiles.value.filter(f => dupCountOf(f) > 1).length
)

const filteredFiles = computed<FileItem[]>(() => {
  let list = scopedFiles.value
  if (activeGroup.value !== 'all') list = list.filter(f => groupKeyOf(f) === activeGroup.value)
  if (duplicatesOnly.value) list = list.filter(f => dupCountOf(f) > 1)
  const q = searchQuery.value.trim().toLowerCase()
  if (q) list = list.filter(f => displayName(f.name).toLowerCase().includes(q))
  const dir = sortAsc.value ? 1 : -1
  return [...list].sort((a, b) => {
    let r = 0
    if (sortKey.value === 'name') r = displayName(a.name).localeCompare(displayName(b.name), 'zh-Hans-CN')
    else if (sortKey.value === 'size') r = (a.size || 0) - (b.size || 0)
    else r = new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime()
    return r * dir
  })
})

// 平铺视图复用同一套卡片模板：包成一个「伪分组」，避免重新写一份卡片 DOM
const displayGroups = computed(() => {
  const list = filteredFiles.value
  if (!groupedView.value) return [{ key: 'flat', label: '', files: list }]
  return GROUP_ORDER
    .map(k => ({ key: k, label: GROUP_LABEL[k] || k, files: list.filter(f => groupKeyOf(f) === k) }))
    .filter(g => g.files.length > 0)
})

// ===== 勾选与批量操作 =====
const selectedIds = ref<number[]>([])
const isSelected = (id: number) => selectedIds.value.includes(id)
const toggleSelect = (id: number) => {
  const i = selectedIds.value.indexOf(id)
  if (i >= 0) selectedIds.value.splice(i, 1)
  else selectedIds.value.push(id)
}
const selectAllInView = () => { selectedIds.value = filteredFiles.value.map(f => f.id) }
// 列表变化（切分类/换筛选）后，把不在当前视图内的选中项剔除，避免「看不见却被批量操作」
watch(filteredFiles, (list) => {
  const valid = new Set(list.map(f => f.id))
  const next = selectedIds.value.filter(id => valid.has(id))
  if (next.length !== selectedIds.value.length) selectedIds.value = next
})

const categoryOptions = ref<{ id: number; name: string }[]>([])

const previewVisible = ref(false)
const previewFileData = ref<FileItem>({ id: 0, name: '', size: 0, type: '', url: '', uploaderId: 0, categoryId: null, createdAt: '' })
const previewFileContent = ref('')
const previewCodeHtml = ref('')
const previewMediaUrl = ref('')
const previewKind = computed(() => previewKindOf(extOfFile(previewFileData.value)))
const isVideoExt = computed(() => isVideo(extOfFile(previewFileData.value)))

const currentUserName = (): string => {
  try {
    const u = JSON.parse(localStorage.getItem('user') || '{}')
    return u.name || u.username || localStorage.getItem('username') || ''
  } catch { return localStorage.getItem('username') || '' }
}
// 与后端 DELETE /files 口径保持一致（总经理/系统管理员/管理员/李智鑫）
const canDelete = computed<boolean>(() => {
  const name = currentUserName()
  const role = localStorage.getItem('roleName') || localStorage.getItem('role') || ''
  return name === '李智鑫' || name === '管理员' || name === '总经理' || role === '总经理' || role === '系统管理员'
})
const uploadHeaders = computed(() => {
  const token = localStorage.getItem('token') || ''
  return token ? { Authorization: `Bearer ${token}` } : {}
})

// ===== 上传目标分类 =====
const uploadCategoryId = ref<number | null>(props.categoryId)
const needPickUploadCategory = computed(() => scope.value !== 'category')
const effectiveUploadCategoryId = computed(() => scope.value === 'category' ? props.categoryId : uploadCategoryId.value)
const uploadTitle = computed(() =>
  scope.value === 'category' ? `上传文件到「${props.categoryName}」` : '上传文件'
)
const listTitle = computed(() => {
  if (scope.value === 'all') return '全部文件'
  if (scope.value === 'uncategorized') return '未分类 - 文件列表'
  return `${props.categoryName} - 文件列表`
})
const emptyText = computed(() => {
  if (searchQuery.value.trim()) return '没有匹配的文件'
  if (activeGroup.value !== 'all') return `该分类下暂无「${GROUP_LABEL[activeGroup.value] || ''}」类型的文件`
  if (duplicatesOnly.value) return '没有检测到重复文件'
  if (scope.value === 'all') return '资料中心暂无文件'
  if (scope.value === 'uncategorized') return '没有未分类的文件'
  return '该分类下暂无文件'
})

const displayName = (raw: string) => {
  if (!raw) return raw
  if (!raw.includes('%')) return raw
  try { return decodeURIComponent(raw) } catch { return raw }
}

const isImage = (file: FileItem) => groupOf(extOfFile(file)) === 'image'

const loadFiles = async () => {
  loading.value = true
  try {
    const response = await getFiles()
    if (response.success) files.value = response.data
  } catch (e) {
    console.error('加载文件失败:', e)
  } finally {
    loading.value = false
  }
}

const loadCategories = async () => {
  try {
    const res = await getFileCategories()
    if (res.success) {
      categoryOptions.value = res.data
      // 全部/未分类视图下默认选中第一个分类，避免用户上传时忘记选目标
      if (scope.value !== 'category' && uploadCategoryId.value === null && res.data.length > 0) {
        uploadCategoryId.value = res.data[0].id
      }
    }
  } catch { /* ignore */ }
}

const handleUploadSuccess = async (response: any) => {
  if (response.success) {
    ElMessage.success('文件上传成功')
    await loadFiles()
  } else {
    ElMessage.error('上传文件失败: ' + (response.message || ''))
  }
}
const handleUploadError = () => ElMessage.error('上传文件失败')

const downloadFile = (file: FileItem) => {
  const a = document.createElement('a')
  a.href = file.url
  a.download = displayName(file.name)
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
}

const assignCategory = async (file: FileItem, cmd: number) => {
  const categoryId = cmd === -1 ? null : Number(cmd)
  try {
    const res = await updateFileCategory(file.id, categoryId)
    if (res.success) {
      const label = categoryId === null ? '未分类' : (categoryOptions.value.find(c => c.id === categoryId)?.name || '')
      ElMessage.success(`已归入「${label}」`)
      await loadFiles()
    } else {
      ElMessage.error(res.message || '归入分类失败')
    }
  } catch (e: any) {
    ElMessage.error(e.message || '归入分类失败')
  }
}

const handleBatchAssign = async (cmd: number) => {
  const categoryId = cmd === -1 ? null : Number(cmd)
  const label = categoryId === null ? '未分类' : (categoryOptions.value.find(c => c.id === categoryId)?.name || '')
  const ids = [...selectedIds.value]
  try {
    const res = await batchUpdateFileCategory(ids, categoryId)
    if (res.success) {
      ElMessage.success(res.message || `已归入「${label}」`)
      selectedIds.value = []
      await loadFiles()
    } else {
      ElMessage.error(res.message || '批量归入失败')
    }
  } catch (e: any) {
    ElMessage.error(e.message || '批量归入失败')
  }
}

const handleBatchDelete = async () => {
  const count = selectedIds.value.length
  try {
    await ElMessageBox.confirm(
      `确定删除所选的 ${count} 个文件吗？此操作不可恢复`,
      '批量删除',
      { confirmButtonText: '确定删除', cancelButtonText: '取消', type: 'warning' }
    )
  } catch (e) {
    return // 用户取消
  }
  try {
    const res = await batchDeleteFiles([...selectedIds.value])
    if (res.success) {
      ElMessage.success(res.message || '删除成功')
      selectedIds.value = []
      await loadFiles()
    } else {
      ElMessage.error(res.message || '批量删除失败')
    }
  } catch (e: any) {
    ElMessage.error(e.message || '批量删除失败')
  }
}

const viewFile = async (file: FileItem) => {
  if (!file.url) { ElMessage.warning('文件地址无效'); return }
  previewFileData.value = file
  previewFileContent.value = ''
  previewCodeHtml.value = ''
  previewMediaUrl.value = ''
  const ext = extOfFile(file)
  const kind = previewKindOf(ext)
  try {
    if (kind === 'code') {
      const txt = await fetch(file.url).then(r => r.text())
      previewCodeHtml.value = highlightCode(txt, extToLang(ext))
    } else if (kind === 'text') {
      previewFileContent.value = await fetch(file.url).then(r => r.text())
    } else if (kind === 'media') {
      previewMediaUrl.value = file.url
    }
  } catch { previewCodeHtml.value = ''; previewFileContent.value = ''; previewMediaUrl.value = '' }
  previewVisible.value = true
}

const deleteFile = async (id: number) => {
  try {
    await ElMessageBox.confirm('确定要删除该文件吗？', '警告', { confirmButtonText: '确定', cancelButtonText: '取消', type: 'warning' })
    const response = await apiDeleteFile(id)
    if (response.success) { await loadFiles(); ElMessage.success('文件删除成功') }
    else ElMessage.error('删除文件失败')
  } catch (e: any) {
    if (e !== 'cancel') ElMessage.error(e.message || '删除文件失败')
  }
}

const getUserId = (): number => {
  try { return parseInt(localStorage.getItem('userId') || '1') } catch { return 1 }
}
const formatFileSize = (size: number): string => {
  if (!size) return '0 B'
  if (size < 1024) return size + ' B'
  if (size < 1024 * 1024) return (size / 1024).toFixed(2) + ' KB'
  if (size < 1024 * 1024 * 1024) return (size / (1024 * 1024)).toFixed(2) + ' MB'
  return (size / (1024 * 1024 * 1024)).toFixed(2) + ' GB'
}
const formatDate = (d: string) => {
  if (!d) return ''
  const date = new Date(d.includes('T') ? d : d.replace(' ', 'T'))
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

watch(() => props.categoryId, (v) => {
  searchQuery.value = ''
  activeGroup.value = 'all'
  selectedIds.value = []
  if (v !== null) uploadCategoryId.value = v
})
watch(() => props.all, () => {
  activeGroup.value = 'all'
  selectedIds.value = []
})

onMounted(() => { loadFiles(); loadCategories() })
</script>

<style scoped>
.file-panel { display: flex; flex-direction: column; gap: 1.25rem; padding: 0.5rem 0.25rem; }
.upload-section { background: rgba(255,255,255,0.8); border: 1px solid rgba(100,149,237,0.3); border-radius: 12px; padding: 1.5rem; box-shadow: 0 4px 16px rgba(0,0,0,0.08); }
.section-title { font-size: 1.25rem; font-weight: 600; color: #333; margin-bottom: 1rem; display: flex; align-items: center; gap: 0.5rem; }
.title-icon { width: 30px; height: 30px; background: linear-gradient(45deg,#6495ED,#87CEEB); border-radius: 8px; display: flex; align-items: center; justify-content: center; color: #fff; box-shadow: 0 4px 15px rgba(100,149,237,0.3); }
.title-icon svg { width: 18px; height: 18px; }
.upload-target { display: flex; align-items: center; gap: 0.6rem; flex-wrap: wrap; margin-bottom: 1rem; padding: 0.6rem 0.75rem; background: rgba(100,149,237,0.08); border: 1px dashed rgba(100,149,237,0.35); border-radius: 8px; }
.upload-target-label { font-size: 0.9rem; font-weight: 600; color: #4169E1; }
.upload-target-hint { font-size: 0.78rem; color: #8a94a6; }
.upload-guide-card { margin-bottom: 1.25rem; background: rgba(255,255,255,0.9); border: 1px solid rgba(100,149,237,0.15); border-radius: 10px; }
.upload-guide-card :deep(.el-card__body) { padding: 1rem 1.25rem; }
.upload-guide-title { font-weight: 600; color: #1a1a2e; margin-bottom: 0.75rem; font-size: 0.95rem; }
.upload-guide-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px,1fr)); gap: 0.6rem; }
.upload-guide-item { display: flex; align-items: flex-start; gap: 0.5rem; background: rgba(255,255,255,0.6); border: 1px solid rgba(0,0,0,0.04); border-radius: 6px; padding: 0.5rem 0.6rem; }
.ug-tag { font-size: 0.78rem; font-weight: 600; color: #2d3748; padding: 0.15rem 0.45rem; border-radius: 4px; white-space: nowrap; flex-shrink: 0; }
.ug-desc { font-size: 0.8rem; color: #4a5568; line-height: 1.5; }
.upload-area { background: rgba(255,255,255,0.9); border: 2px dashed rgba(100,149,237,0.5); border-radius: 12px; padding: 2rem; text-align: center; min-height: 220px; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
.upload-area:hover { border-color: #6495ED; box-shadow: 0 0 20px rgba(100,149,237,0.2); }
.upload-demo { width: 100%; height: 100%; }
.upload-demo :deep(.el-upload) { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; }
.upload-trigger { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 0.5rem; width: 100%; }
.upload-icon { font-size: 2.5rem; color: rgba(100,149,237,0.6); }
.upload-text { font-size: 1.1rem; color: #333; font-weight: 500; }
.upload-hint { font-size: 0.9rem; color: rgba(51,51,51,0.6); }

.file-section { background: rgba(255,255,255,0.8); border: 1px solid rgba(100,149,237,0.3); border-radius: 12px; padding: 1.5rem; box-shadow: 0 4px 16px rgba(0,0,0,0.08); }
.section-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.9rem; gap: 1rem; flex-wrap: wrap; }
.section-subtitle { font-size: 1.15rem; font-weight: 600; color: #333; margin: 0; display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; }
.count-badge { background: rgba(100,149,237,0.15); color: #4169E1; font-size: 0.8rem; padding: 0.1rem 0.55rem; border-radius: 10px; font-weight: 600; }
.dup-hint { font-size: 0.75rem; font-weight: 400; color: #d48806; background: rgba(250,173,20,0.12); padding: 0.1rem 0.5rem; border-radius: 10px; }
.search-input { width: 260px; }

/* 格式分类 chips + 排序工具条 */
.file-tools { display: flex; justify-content: space-between; align-items: center; gap: 0.75rem; flex-wrap: wrap; margin-bottom: 1rem; padding-bottom: 0.9rem; border-bottom: 1px dashed rgba(100,149,237,0.25); }
.group-chips { display: flex; gap: 0.4rem; flex-wrap: wrap; }
.chip { border: 1px solid rgba(100,149,237,0.3); background: rgba(255,255,255,0.9); color: #4a5568; font-size: 0.82rem; padding: 0.3rem 0.7rem; border-radius: 16px; cursor: pointer; transition: all 0.2s; display: inline-flex; align-items: center; gap: 0.35rem; }
.chip:hover { border-color: #6495ED; color: #4169E1; }
.chip.active { background: linear-gradient(45deg,#6495ED,#87CEEB); border-color: transparent; color: #fff; font-weight: 600; }
.chip.dim { opacity: 0.5; }
.chip-count { font-size: 0.72rem; background: rgba(0,0,0,0.08); border-radius: 8px; padding: 0 0.35rem; }
.chip.active .chip-count { background: rgba(255,255,255,0.28); }
.tool-right { display: flex; align-items: center; gap: 0.6rem; flex-wrap: wrap; }
.sort-dir { background: rgba(100,149,237,0.12) !important; color: #4169E1 !important; border: 1px solid rgba(100,149,237,0.3) !important; }

/* 批量操作条 */
.batch-bar { display: flex; align-items: center; gap: 0.6rem; flex-wrap: wrap; margin-bottom: 1rem; padding: 0.6rem 0.85rem; background: rgba(100,149,237,0.1); border: 1px solid rgba(100,149,237,0.35); border-radius: 8px; }
.batch-count { font-size: 0.85rem; font-weight: 600; color: #4169E1; }

/* 分组 */
.group-block { margin-bottom: 1.25rem; }
.group-block-title { font-size: 0.95rem; font-weight: 600; color: #4169E1; margin-bottom: 0.65rem; display: flex; align-items: center; gap: 0.45rem; }
.group-block-count { font-size: 0.75rem; font-weight: 600; color: #4169E1; background: rgba(100,149,237,0.15); padding: 0.05rem 0.5rem; border-radius: 10px; }

.file-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 1.25rem; }
.file-card { background: rgba(255,255,255,0.9); border: 1px solid rgba(100,149,237,0.3); border-radius: 12px; overflow: hidden; transition: all 0.3s ease; box-shadow: 0 2px 8px rgba(0,0,0,0.08); position: relative; }
.file-card:hover { transform: translateY(-4px); box-shadow: 0 8px 20px rgba(100,149,237,0.25); border-color: rgba(100,149,237,0.6); }
.file-card.selected { border-color: #6495ED; box-shadow: 0 0 0 2px rgba(100,149,237,0.35); }
.file-card-preview { height: 140px; background: rgba(240,248,255,0.5); display: flex; align-items: center; justify-content: center; border-bottom: 1px solid rgba(100,149,237,0.2); position: relative; }
.file-card-preview img { width: 100%; height: 100%; object-fit: cover; }
.file-card-icon { width: 56px; height: 56px; color: rgba(100,149,237,0.6); display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px; }
.file-card-icon svg { width: 40px; height: 40px; }
.file-ext { font-size: 0.62rem; font-weight: 700; letter-spacing: 0.5px; color: #4169E1; }
.card-check { position: absolute; top: 4px; right: 4px; z-index: 3; background: rgba(255,255,255,0.85); border-radius: 4px; padding: 0 2px; }
.uncat-flag { position: absolute; top: 6px; left: 6px; background: #faad14; color: #fff; font-size: 0.7rem; padding: 0.1rem 0.4rem; border-radius: 4px; }
.group-flag { position: absolute; bottom: 6px; left: 6px; background: rgba(255,255,255,0.88); color: #4169E1; font-size: 0.68rem; padding: 0.1rem 0.4rem; border-radius: 4px; }
.dup-flag { position: absolute; bottom: 6px; right: 6px; background: #ff7875; color: #fff; font-size: 0.68rem; padding: 0.1rem 0.4rem; border-radius: 4px; }
.file-card-info { padding: 0.85rem; display: flex; flex-direction: column; gap: 0.6rem; }
.file-card-name { font-weight: 500; color: #333; font-size: 0.95rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.file-card-meta { display: flex; justify-content: space-between; align-items: center; font-size: 0.78rem; color: rgba(51,51,51,0.6); }
.file-card-cat { font-size: 0.75rem; color: #8a94a6; }
.file-card-actions { display: flex; gap: 0.4rem; margin-top: 0.25rem; flex-wrap: wrap; }
.action-btn { flex: 1; background: rgba(100,149,237,0.15) !important; color: #6495ED !important; border: 1px solid rgba(100,149,237,0.3) !important; border-radius: 6px !important; transition: all 0.3s ease !important; font-size: 0.78rem !important; padding: 0.4rem !important; }
.action-btn:hover { background: rgba(100,149,237,0.25) !important; box-shadow: 0 0 10px rgba(100,149,237,0.3) !important; }
.action-btn.assign { flex: 1.2; }
.action-btn.delete { background: rgba(244,67,54,0.1) !important; color: #d32f2f !important; border: 1px solid rgba(244,67,54,0.3) !important; }
.action-btn.delete:hover { background: rgba(244,67,54,0.2) !important; box-shadow: 0 0 10px rgba(244,67,54,0.2) !important; }
.assign-drop { flex: 1.2; }
.empty-file { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 3rem 2rem; background: rgba(255,255,255,0.6); border: 2px dashed rgba(100,149,237,0.3); border-radius: 12px; text-align: center; }
.empty-icon { font-size: 3rem; color: rgba(100,149,237,0.4); margin-bottom: 1rem; }
.empty-text { font-size: 1.05rem; color: rgba(51,51,51,0.6); font-weight: 500; }

.preview-dialog .preview-content { display: flex; flex-direction: column; align-items: center; gap: 1rem; min-height: 200px; }
.preview-dialog .image-preview { max-width: 100%; max-height: 500px; object-fit: contain; border-radius: 8px; }
.preview-dialog .code-preview { width: 100%; max-height: 500px; overflow: auto; background: #1e1e1e; border-radius: 8px; border: 1px solid #333; }
.preview-dialog .code-preview pre { margin: 0; padding: 1rem; white-space: pre-wrap; word-break: break-all; font-family: 'Consolas','Monaco','Courier New',monospace; font-size: 13px; line-height: 1.6; color: #d4d4d4; }
.preview-dialog .media-preview { width: 100%; max-height: 500px; border-radius: 8px; outline: none; }
.preview-dialog .text-preview { width: 100%; max-height: 500px; overflow: auto; background: #f5f5f5; border-radius: 8px; padding: 1rem; }
.preview-dialog .text-preview pre { margin: 0; white-space: pre-wrap; word-wrap: break-word; font-size: 14px; line-height: 1.6; color: #333; }
.preview-dialog .pdf-preview { width: 100%; }
.preview-dialog .other-preview { display: flex; flex-direction: column; align-items: center; gap: 1rem; padding: 3rem; color: rgba(51,51,51,0.6); }
.preview-dialog .other-preview .file-icon { width: 64px; height: 64px; color: rgba(100,149,237,0.5); }
.preview-dialog .other-preview .file-icon svg { width: 100%; height: 100%; }
</style>
