<template>
  <div class="file-panel">
    <!-- 上传区域（仅已选具体分类时显示） -->
    <div class="upload-section" v-if="categoryId !== null">
      <div class="section-title">
        <span class="title-icon">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M19 3H5C3.9 3 3 3.9 3 5V19C3 20.1 3.9 21 5 21H19C20.1 21 21 20.1 21 19V5C21 3.9 20.1 3 19 3ZM19 19H5V5H19V19ZM12 17V13H8L12 9L16 13H12V17Z"/>
          </svg>
        </span>
        上传文件到「{{ categoryName }}」
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
          :data="{ categoryId: categoryId, uploaderId: getUserId() }"
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
      v-else-if="uncategorizedFiles.length > 0"
      type="warning"
      :closable="false"
      show-icon
      title="未归入任何分类的文件"
      description="以下文件尚未分配到资料分类，请在每条记录上点击「归入分类」整理，整理后将从「未分类」移出。"
      style="margin-bottom:1rem"
    />

    <!-- 文件列表 -->
    <div class="file-section">
      <div class="section-header">
        <h3 class="section-subtitle">
          {{ categoryId !== null ? categoryName + ' - ' : '未分类 - ' }}文件列表
          <span class="count-badge">{{ filteredFiles.length }}</span>
        </h3>
        <el-input
          v-model="searchQuery"
          placeholder="搜索文件"
          prefix-icon="Search"
          class="search-input"
          clearable
        />
      </div>

      <div class="file-grid" v-loading="loading">
        <div v-for="file in filteredFiles" :key="file.id" class="file-card">
          <div class="file-card-preview">
            <img v-if="isImage(file)" :src="file.url" alt="" />
            <div v-else class="file-card-icon">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M14 2H6C4.9 2 4 2.9 4 4V20C4 21.1 4.9 22 6 22H18C19.1 22 20 21.1 20 20V8L14 2ZM18 20H6V4H13V9H18V20Z"/>
              </svg>
            </div>
            <span v-if="file.categoryId == null" class="uncat-flag">未分类</span>
          </div>
          <div class="file-card-info">
            <div class="file-card-name" :title="displayName(file.name)">{{ displayName(file.name) }}</div>
            <div class="file-card-meta">
              <span class="file-card-size">{{ formatFileSize(file.size) }}</span>
              <span class="file-card-date">{{ formatDate(file.createdAt) }}</span>
            </div>
            <div class="file-card-actions">
              <el-button size="small" @click="viewFile(file)" class="action-btn">
                <el-icon><View /></el-icon>预览
              </el-button>
              <el-button size="small" @click="downloadFile(file)" class="action-btn">
                <el-icon><Download /></el-icon>下载
              </el-button>
              <el-dropdown v-if="file.categoryId == null" trigger="click" @command="(id) => assignCategory(file, id)">
                <el-button size="small" class="action-btn assign">
                  <el-icon><FolderOpened /></el-icon>归入分类
                </el-button>
                <template #dropdown>
                  <el-dropdown-menu>
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

        <div v-if="filteredFiles.length === 0" class="empty-file">
          <el-icon class="empty-icon"><Document /></el-icon>
          <div class="empty-text">该分类下暂无文件</div>
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
import { getFiles, deleteFile as apiDeleteFile, getFileCategories, updateFileCategory } from '../../services/api'
import { previewKindOf } from '../../utils/fileTypes'
import { highlightCode, extToLang } from '../../utils/codeHighlight'

const props = defineProps<{
  categoryId: number | null
  categoryName: string
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
}

const loading = ref(false)
const searchQuery = ref('')
const files = ref<FileItem[]>([])
const uncategorizedFiles = computed(() => files.value.filter(f => f.categoryId == null))
const categoryOptions = ref<{ id: number; name: string }[]>([])

const previewVisible = ref(false)
const previewFileData = ref<FileItem>({ id: 0, name: '', size: 0, type: '', url: '', uploaderId: 0, categoryId: null, createdAt: '' })
const previewFileContent = ref('')
const previewCodeHtml = ref('')
const previewMediaUrl = ref('')
const previewKind = computed(() => previewKindOf((previewFileData.value.type || '').toLowerCase()))
const isVideoExt = computed(() => ['mp4', 'avi', 'mov', 'mkv', 'webm', 'flv'].includes((previewFileData.value.type || '').toLowerCase()))

const currentUserName = (): string => {
  try {
    const u = JSON.parse(localStorage.getItem('user') || '{}')
    return u.name || u.username || localStorage.getItem('username') || ''
  } catch { return localStorage.getItem('username') || '' }
}
const canDelete = computed<boolean>(() => currentUserName() === '李智鑫')
const uploadHeaders = computed(() => {
  const token = localStorage.getItem('token') || ''
  return token ? { Authorization: `Bearer ${token}` } : {}
})

const displayName = (raw: string) => {
  if (!raw) return raw
  if (!raw.includes('%')) return raw
  try { return decodeURIComponent(raw) } catch { return raw }
}

const isImage = (file: FileItem) => ['png', 'jpg', 'jpeg', 'gif', 'bmp', 'webp', 'svg'].includes((file.type || '').toLowerCase())

const filteredFiles = computed(() => {
  const list = props.categoryId === null
    ? files.value.filter(f => f.categoryId == null)
    : files.value.filter(f => f.categoryId === props.categoryId)
  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase()
    return list.filter(f => displayName(f.name).toLowerCase().includes(q))
  }
  return list
})

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
    if (res.success) categoryOptions.value = res.data
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

const assignCategory = async (file: FileItem, categoryId: number) => {
  try {
    const res = await updateFileCategory(file.id, categoryId)
    if (res.success) {
      ElMessage.success(`已归入「${categoryOptions.value.find(c => c.id === categoryId)?.name || ''}」`)
      await loadFiles()
    } else {
      ElMessage.error(res.message || '归入分类失败')
    }
  } catch (e: any) {
    ElMessage.error(e.message || '归入分类失败')
  }
}

const viewFile = async (file: FileItem) => {
  if (!file.url) { ElMessage.warning('文件地址无效'); return }
  previewFileData.value = file
  previewFileContent.value = ''
  previewCodeHtml.value = ''
  previewMediaUrl.value = ''
  const ext = (file.type || '').toLowerCase()
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
  return (size / (1024 * 1024)).toFixed(2) + ' MB'
}
const formatDate = (d: string) => {
  if (!d) return ''
  const date = new Date(d.includes('T') ? d : d.replace(' ', 'T'))
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

watch(() => props.categoryId, () => { searchQuery.value = '' })

onMounted(() => { loadFiles(); loadCategories() })
</script>

<style scoped>
.file-panel { display: flex; flex-direction: column; gap: 1.25rem; padding: 0.5rem 0.25rem; }
.upload-section { background: rgba(255,255,255,0.8); border: 1px solid rgba(100,149,237,0.3); border-radius: 12px; padding: 1.5rem; box-shadow: 0 4px 16px rgba(0,0,0,0.08); }
.section-title { font-size: 1.25rem; font-weight: 600; color: #333; margin-bottom: 1rem; display: flex; align-items: center; gap: 0.5rem; }
.title-icon { width: 30px; height: 30px; background: linear-gradient(45deg,#6495ED,#87CEEB); border-radius: 8px; display: flex; align-items: center; justify-content: center; color: #fff; box-shadow: 0 4px 15px rgba(100,149,237,0.3); }
.title-icon svg { width: 18px; height: 18px; }
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
.section-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem; gap: 1rem; flex-wrap: wrap; }
.section-subtitle { font-size: 1.15rem; font-weight: 600; color: #333; margin: 0; display: flex; align-items: center; gap: 0.5rem; }
.count-badge { background: rgba(100,149,237,0.15); color: #4169E1; font-size: 0.8rem; padding: 0.1rem 0.55rem; border-radius: 10px; font-weight: 600; }
.search-input { width: 260px; }
.file-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 1.25rem; }
.file-card { background: rgba(255,255,255,0.9); border: 1px solid rgba(100,149,237,0.3); border-radius: 12px; overflow: hidden; transition: all 0.3s ease; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
.file-card:hover { transform: translateY(-4px); box-shadow: 0 8px 20px rgba(100,149,237,0.25); border-color: rgba(100,149,237,0.6); }
.file-card-preview { height: 140px; background: rgba(240,248,255,0.5); display: flex; align-items: center; justify-content: center; border-bottom: 1px solid rgba(100,149,237,0.2); position: relative; }
.file-card-preview img { width: 100%; height: 100%; object-fit: cover; }
.file-card-icon { width: 56px; height: 56px; color: rgba(100,149,237,0.6); }
.file-card-icon svg { width: 100%; height: 100%; }
.uncat-flag { position: absolute; top: 6px; left: 6px; background: #faad14; color: #fff; font-size: 0.7rem; padding: 0.1rem 0.4rem; border-radius: 4px; }
.file-card-info { padding: 0.85rem; display: flex; flex-direction: column; gap: 0.6rem; }
.file-card-name { font-weight: 500; color: #333; font-size: 0.95rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.file-card-meta { display: flex; justify-content: space-between; align-items: center; font-size: 0.78rem; color: rgba(51,51,51,0.6); }
.file-card-actions { display: flex; gap: 0.4rem; margin-top: 0.25rem; flex-wrap: wrap; }
.action-btn { flex: 1; background: rgba(100,149,237,0.15) !important; color: #6495ED !important; border: 1px solid rgba(100,149,237,0.3) !important; border-radius: 6px !important; transition: all 0.3s ease !important; font-size: 0.78rem !important; padding: 0.4rem !important; }
.action-btn:hover { background: rgba(100,149,237,0.25) !important; box-shadow: 0 0 10px rgba(100,149,237,0.3) !important; }
.action-btn.assign { flex: 1.3; }
.action-btn.delete { background: rgba(244,67,54,0.1) !important; color: #d32f2f !important; border: 1px solid rgba(244,67,54,0.3) !important; }
.action-btn.delete:hover { background: rgba(244,67,54,0.2) !important; box-shadow: 0 0 10px rgba(244,67,54,0.2) !important; }
.empty-file { grid-column: 1 / -1; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 3rem 2rem; background: rgba(255,255,255,0.6); border: 2px dashed rgba(100,149,237,0.3); border-radius: 12px; text-align: center; }
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
