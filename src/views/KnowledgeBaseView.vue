<template>
  <div class="knowledge-base">
    <header class="page-header">
      <div class="header-left">
        <el-button text @click="$router.push('/')" class="back-btn">← 返回</el-button>
        <h2 class="page-title">
          <span class="title-icon">📚</span>
          知识库
        </h2>
      </div>
      <div class="header-actions">
        <el-button type="primary" size="small" @click="openNewArticle">写文章</el-button>
        <el-button v-if="isManager" size="small" @click="showCategoryDialog = true">管理分类</el-button>
      </div>
    </header>

    <div class="kb-layout">
      <aside class="kb-sidebar">
        <div class="category-section">
          <div class="category-title">分类</div>
          <div class="category-list">
            <div class="category-item" :class="{ active: !filterCategory }" @click="filterCategory = null; currentPage = 1">
              <span class="cat-dot" style="background:#6495ED"></span>
              <span>全部</span>
              <span class="cat-count">{{ totalArticles }}</span>
            </div>
            <div v-for="cat in categories" :key="cat.id" class="category-item" :class="{ active: filterCategory === cat.id }" @click="filterCategory = cat.id; currentPage = 1">
              <span class="cat-dot" :style="{ background: catColor(cat.name) }"></span>
              <span>{{ cat.name }}</span>
              <span class="cat-count">{{ cat.articleCount }}</span>
            </div>
          </div>
        </div>
      </aside>

      <main class="kb-main">
        <div class="search-bar">
          <el-input v-model="keyword" placeholder="搜索知识库文章..." clearable size="small" style="width:320px" @clear="search" @keyup.enter="search">
            <template #prefix><span>🔍</span></template>
          </el-input>
          <el-button size="small" type="primary" @click="search">搜索</el-button>
        </div>

        <div class="article-list" v-loading="loading">
          <div v-if="articles.length === 0" class="empty-state">
            <span class="empty-icon">📭</span>
            <p>暂无文章，点击右上角"写文章"开始创建</p>
          </div>
          <div v-for="article in articles" :key="article.id" class="article-card" @click="openArticle(article)">
              <div class="article-header">
                <div class="article-title">
                  <span v-if="article.permission_type && article.permission_type !== 'public'" class="perm-lock" title="权限受限">🔒</span>
                  {{ article.title }}
                </div>
                <div class="article-actions" @click.stop>
                <el-tag size="small" class="cat-tag">{{ article.categoryName || '未分类' }}</el-tag>
                <el-button v-if="isManager" text size="small" @click.stop="editArticle(article)">✏️</el-button>
                <el-popconfirm v-if="isManager" title="确定删除此文章？" confirm-button-text="删除" @confirm="deleteArticle(article.id)">
                  <template #reference>
                    <el-button text size="small" type="danger">🗑️</el-button>
                  </template>
                </el-popconfirm>
              </div>
            </div>
            <div class="article-summary">{{ article.summary || '暂无摘要' }}</div>
            <div class="article-meta">
              <span>👤 {{ article.author || '未知' }}</span>
              <span>👁️ {{ article.views || 0 }}</span>
              <span>📅 {{ formatDate(article.createdAt) }}</span>
              <span v-if="article.files && parseFiles(article.files).length" class="file-badge">📎 {{ parseFiles(article.files).length }}</span>
              <span v-if="article.tags" class="article-tags">
                <el-tag size="small" v-for="tag in (article.tags || '').split(',')" :key="tag" style="margin-right:4px">{{ tag.trim() }}</el-tag>
              </span>
            </div>
          </div>

          <div class="pagination-bar" v-if="totalArticles > pageSize">
            <el-pagination layout="total, prev, pager, next" :total="totalArticles" :page-size="pageSize" v-model:current-page="currentPage" @current-change="fetchArticles" background small />
          </div>
        </div>
      </main>
    </div>

    <el-dialog v-model="showArticleDialog" :title="editingArticle ? '编辑文章' : '写文章'" width="820px" :close-on-click-modal="false" :destroy-on-close="true">
        <el-form ref="formRef" :model="articleForm" label-position="top">
        <el-form-item label="标题">
          <el-input v-model="articleForm.title" placeholder="请输入文章标题" />
        </el-form-item>
        <div class="form-row">
          <el-form-item label="分类" style="flex:1">
            <el-select v-model="articleForm.categoryId" placeholder="选择分类" clearable style="width:100%">
              <el-option v-for="cat in categories" :key="cat.id" :label="cat.name" :value="cat.id" />
            </el-select>
          </el-form-item>
          <el-form-item label="作者" style="flex:1">
            <el-select v-model="articleForm.author" placeholder="选择作者" clearable filterable style="width:100%">
              <el-option v-for="u in userList" :key="u.id" :label="u.name" :value="u.name" />
            </el-select>
          </el-form-item>
          <el-form-item label="标签" style="flex:1">
            <el-select v-model="articleForm.tags" placeholder="选择标签" clearable multiple filterable allow-create default-first-option style="width:100%">
              <el-option v-for="t in tagOptions" :key="t" :label="t" :value="t" />
            </el-select>
          </el-form-item>
        </div>
        <el-form-item label="摘要">
          <el-input v-model="articleForm.summary" type="textarea" :rows="2" placeholder="文章摘要" />
        </el-form-item>
        <el-form-item label="内容">
          <div class="editor-container">
            <QuillEditor v-model:content="articleForm.content" content-type="html" toolbar="full" :style="{ height: '350px' }" />
          </div>
        </el-form-item>
        <el-form-item label="阅读权限">
          <el-radio-group v-model="articleForm.permission_type">
            <el-radio value="public">公开（所有人可见）</el-radio>
            <el-radio value="role">指定角色</el-radio>
            <el-radio value="user">指定用户</el-radio>
          </el-radio-group>
          <div v-if="articleForm.permission_type === 'role'" class="perm-checkboxes">
            <el-checkbox-group v-model="articleForm.permission_targets">
              <el-checkbox v-for="r in roleList" :key="r.name" :label="r.name">{{ r.name }}</el-checkbox>
            </el-checkbox-group>
          </div>
          <div v-if="articleForm.permission_type === 'user'" class="perm-checkboxes">
            <el-checkbox-group v-model="articleForm.permission_targets">
              <el-checkbox v-for="u in userList" :key="u.name" :label="u.name">{{ u.name }}</el-checkbox>
            </el-checkbox-group>
          </div>
        </el-form-item>
        <el-form-item label="附件">
          <el-upload ref="uploadRef" action="#" :auto-upload="false" :file-list="articleForm.files" :on-change="handleFileChange" list-type="picture-card">
            <el-icon><Plus /></el-icon>
            <template #file="{ file }">
              <div class="file-item">
                <div class="file-actions-bar">
                  <el-icon class="file-delete" @click="handleFileRemove(file)"><Delete /></el-icon>
                </div>
                <div class="file-preview-wrap">
                  <img v-if="file.raw && file.raw.type && file.raw.type.startsWith('image/')" :src="file.url" alt="" class="file-preview" />
                  <div v-else class="file-icon-placeholder">
                    <el-icon class="file-type-icon"><Document /></el-icon>
                    <span class="file-type-name">{{ file.name }}</span>
                  </div>
                </div>
              </div>
            </template>
          </el-upload>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showArticleDialog = false">取消</el-button>
        <el-button type="primary" @click="saveArticle" :loading="saving">保存</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="showDetailDialog" :title="detailArticle.title" width="820px" :close-on-click-modal="false">
      <div class="article-detail">
        <div class="detail-meta">
          <el-tag size="small">{{ detailArticle.categoryName || '未分类' }}</el-tag>
          <span>👤 {{ detailArticle.author || '未知' }}</span>
          <span>👁️ {{ detailArticle.views }}</span>
          <span>📅 {{ formatDate(detailArticle.createdAt) }}</span>
        </div>
        <div v-if="detailArticle.summary" class="detail-summary">{{ detailArticle.summary }}</div>
        <div v-if="detailArticle.tags" class="detail-tags">
          <el-tag size="small" v-for="tag in (detailArticle.tags || '').split(',')" :key="tag" style="margin-right:6px">{{ tag.trim() }}</el-tag>
        </div>
        <div class="detail-content" v-html="detailArticle.content || defaultEmptyContent"></div>
        <div v-if="detailFiles.length > 0" class="detail-files">
          <div class="detail-files-title">📎 附件 ({{ detailFiles.length }})</div>
          <div v-for="(f, i) in detailFiles" :key="i" class="detail-file-item">
            <el-icon><Document /></el-icon>
            <span class="file-name">{{ f.name }}</span>
            <span class="file-size">{{ formatSize(f.size) }}</span>
            <el-button text size="small" @click="previewFile(f)">👁️ 预览</el-button>
            <el-button text size="small" type="primary" @click="downloadFile(f)">⬇️ 下载</el-button>
          </div>
        </div>
      </div>
    </el-dialog>

    <el-dialog v-model="previewVisible" :title="previewFileData.name" width="800px" class="preview-dialog" :close-on-click-modal="false">
      <div class="preview-content">
        <el-image v-if="previewFileData.type && previewFileData.type.startsWith('image/')" :src="previewFileData.url" class="image-preview" fit="contain" />
        <div v-else-if="previewFileData.type && (previewFileData.type.startsWith('text/') || previewFileData.type === 'application/json' || previewFileData.type === 'application/xml')" class="text-preview">
          <pre>{{ previewFileContent }}</pre>
        </div>
        <div v-else-if="previewFileData.type === 'application/pdf'" class="iframe-preview">
          <iframe :src="previewFileData.url" frameborder="0" width="100%" height="500px"></iframe>
        </div>
        <div v-else-if="previewDocContent !== ''" class="doc-preview">
          <div class="doc-toolbar">
            <span class="doc-name">{{ previewFileData.name }}</span>
            <el-button size="small" @click="downloadFile(previewFileData)">⬇️ 下载</el-button>
          </div>
          <div class="doc-content" v-html="previewDocContent"></div>
        </div>
        <div v-else class="other-preview">
          <div class="file-icon"><el-icon><Document /></el-icon></div>
          <p>该文件类型无法直接预览，请下载后查看</p>
          <el-button type="primary" @click="downloadFile(previewFileData)">⬇️ 下载文件</el-button>
        </div>
      </div>
      <template #footer>
        <el-button @click="previewVisible = false">关闭</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="showCategoryDialog" title="管理分类" width="500px">
      <div class="category-mgr">
        <div class="add-cat-row">
          <el-input v-model="newCategoryName" placeholder="新分类名称" size="small" style="flex:1" />
          <el-button type="primary" size="small" @click="addCategory" :disabled="!newCategoryName.trim()">添加</el-button>
        </div>
        <div v-for="cat in categories" :key="cat.id" class="cat-mgr-item">
          <span class="cat-name">{{ cat.name }}</span>
          <span class="cat-desc">{{ cat.description }}</span>
          <el-button v-if="isManager" text size="small" type="danger" @click="deleteCategory(cat.id)">🗑️</el-button>
        </div>
        <div v-if="categories.length === 0" class="empty-state" style="padding:1rem">
          <p>暂无分类</p>
        </div>
      </div>
    </el-dialog>

    <div v-if="showImageViewer" class="image-overlay" @click="showImageViewer = false">
      <img :src="previewUrl" class="image-overlay-content" @click.stop />
      <span class="image-overlay-close" @click="showImageViewer = false">✕</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Plus, Delete, Document, Download } from '@element-plus/icons-vue'
import * as mammoth from 'mammoth'
import { QuillEditor } from '@vueup/vue-quill'
import '@vueup/vue-quill/dist/vue-quill.snow.css'

const loading = ref(false)
const saving = ref(false)

const currentRole = ref(localStorage.getItem('role') || '')
const isManager = computed(() => {
  const role = currentRole.value
  const username = localStorage.getItem('username')
  return role === 'admin' || username === '总经理' || username === '管理员' || 
    ['系统管理员', '总经理', '技术部经理', '销售部经理', '财务总监'].includes(role || '')
})

const fetchCurrentRole = async () => {
  const username = localStorage.getItem('username')
  if (!username) return
  try {
    const res = await fetch('/api/user/role?username=' + username).then(r => r.json())
    if (res.success && res.data && res.data.roleName) {
      currentRole.value = res.data.roleName
      localStorage.setItem('role', res.data.roleName)
    }
  } catch {}
}
const uploadRef = ref<any>(null)
const formRef = ref<any>(null)
const categories = ref<any[]>([])
const articles = ref<any[]>([])
const totalArticles = ref(0)
const currentPage = ref(1)
const pageSize = 15
const keyword = ref('')
const filterCategory = ref<number | null>(null)
const userList = ref<{ id: number; name: string }[]>([])
const roleList = ref<{ id: number; name: string }[]>([])
const tagOptions = ref<string[]>([])

const showArticleDialog = ref(false)
const showDetailDialog = ref(false)
const showCategoryDialog = ref(false)
const showImageViewer = ref(false)
const previewUrl = ref('')
const previewVisible = ref(false)
const previewFileData = ref<any>({ name: '', url: '', type: '', size: 0 })
const previewFileContent = ref('')
const previewDocContent = ref('')
const editingArticle = ref<any>(null)
const defaultEmptyContent = '<p style="color:#ccc">暂无内容</p>'
const detailArticle = ref<any>({})
const articleForm = ref({ title: '', categoryId: null, author: '', tags: [] as string[], summary: '', content: '', files: [] as any[], permission_type: 'public', permission_targets: [] as string[] })
const newCategoryName = ref('')

const detailFiles = computed(() => {
  try {
    const raw = detailArticle.value.files
    if (!raw) return []
    return typeof raw === 'string' ? JSON.parse(raw) : raw
  } catch { return [] }
})

const parseFiles = (files: any) => {
  try { return typeof files === 'string' ? JSON.parse(files) : files || [] } catch { return [] }
}

const colors = ['#6495ED', '#F4A460', '#6B8E23', '#CD5C5C', '#20B2AA', '#BA55D3', '#FF8C00', '#2E8B57']
const catColor = (name: string) => {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return colors[Math.abs(hash) % colors.length]
}
const formatDate = (d: string) => {
  if (!d) return ''
  const date = new Date(d.includes('T') ? d : d + 'Z')
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}
const formatSize = (s: number) => {
  if (!s) return ''
  if (s < 1024) return s + 'B'
  if (s < 1048576) return (s / 1024).toFixed(1) + 'KB'
  return (s / 1048576).toFixed(1) + 'MB'
}

const fetchUsers = async () => {
  try {
    const res = await fetch('/api/employees').then(r => r.json())
    if (res.success) userList.value = res.data.map((e: any) => ({ id: e.id, name: e.name }))
  } catch { /* ignore */ }
}

const fetchRoles = async () => {
  try {
    const res = await fetch('/api/roles').then(r => r.json())
    if (res.success) roleList.value = res.data.map((r: any) => ({ id: r.id, name: r.name }))
  } catch { /* ignore */ }
}

const PRESET_TAGS = ['销售', '客户', '项目', '月报', '审批', '财务', '人事', '行政', '技术', '市场']

const fetchTags = async () => {
  try {
    const tags = new Set(PRESET_TAGS)
    const res = await fetch('/api/knowledge/articles?pageSize=200&username=' + getUsername()).then(r => r.json())
    if (res.success && res.data && res.data.list) {
      for (const a of res.data.list) {
        if (a.tags) a.tags.split(',').forEach((t: string) => { if (t.trim()) tags.add(t.trim()) })
      }
    }
    tagOptions.value = Array.from(tags).sort()
  } catch (e) { console.error('获取标签失败:', e) }
}

const fetchCategories = async () => {
  try {
    const res = await fetch('/api/knowledge/categories').then(r => r.json())
    if (res.success) categories.value = res.data
  } catch { /* ignore */ }
}

const fetchArticles = async () => {
  loading.value = true
  try {
    const params = new URLSearchParams({ page: String(currentPage.value), pageSize: String(pageSize), username: getUsername() })
    if (filterCategory.value) params.set('categoryId', String(filterCategory.value))
    if (keyword.value.trim()) params.set('keyword', keyword.value.trim())
    const res = await fetch('/api/knowledge/articles?' + params.toString()).then(r => r.json())
    if (res.success) {
      articles.value = res.data.list
      totalArticles.value = res.data.total
    }
  } catch { /* ignore */ }
  loading.value = false
}

const search = () => { currentPage.value = 1; fetchArticles() }

const openNewArticle = () => {
  editingArticle.value = null
  articleForm.value = { title: '', categoryId: null, author: '', tags: [], summary: '', content: '', files: [], permission_type: 'public', permission_targets: [] }
  showArticleDialog.value = true
  formRef.value?.clearValidate()
}

const openArticle = async (article: any) => {
  try {
    const res = await fetch('/api/knowledge/articles/' + article.id + '?username=' + getUsername()).then(r => r.json())
    if (res.success) {
      detailArticle.value = res.data
      showDetailDialog.value = true
      fetchArticles()
    }
  } catch { /* ignore */ }
}

const editArticle = (article: any) => {
  editingArticle.value = article
  let files = []
  try { files = article.files ? (typeof article.files === 'string' ? JSON.parse(article.files) : article.files) : [] } catch { files = [] }
  let permTargets = []
  try { permTargets = article.permission_targets ? JSON.parse(article.permission_targets) : [] } catch { permTargets = [] }
  articleForm.value = {
    title: article.title,
    categoryId: article.categoryId,
    author: article.author || '',
    tags: article.tags ? article.tags.split(',').map((t: string) => t.trim()).filter(Boolean) : [],
    summary: article.summary || '',
    content: article.content || '',
    files: files,
    permission_type: article.permission_type || 'public',
    permission_targets: Array.isArray(permTargets) ? permTargets : []
  }
  showArticleDialog.value = true
  formRef.value?.clearValidate()
}

const handleFileChange = (file: any) => {
  articleForm.value.files.push(file)
}

const handleFileRemove = (file: any) => {
  try {
    uploadRef.value?.handleRemove(file)
  } catch {
    const idx = articleForm.value.files.findIndex(item => item.uid === file.uid)
    if (idx !== -1) articleForm.value.files.splice(idx, 1)
  }
}

const uploadFile = async (file: any): Promise<{ name: string; url: string; type: string; size: number }> => {
  if (file.raw) {
    try {
      const formData = new FormData()
      formData.append('file', file.raw, file.name)
      const response = await fetch('/api/upload', { method: 'POST', body: formData })
      const data = await response.json()
      if (data.success && data.data.length > 0) {
        return { name: file.name, url: data.data[0].url, type: file.raw.type || '', size: file.raw.size || 0 }
      }
      throw new Error(data.message || '文件上传失败')
    } catch (e: any) {
      throw new Error(e.message || '文件上传失败: 网络错误或服务器异常')
    }
  }
  return { name: file.name || '', url: file.url || '', type: file.type || '', size: file.size || 0 }
}

const getUsername = () => localStorage.getItem('username') || ''

const saveArticle = async () => {
  if (!articleForm.value.title.trim()) { ElMessage.warning('请输入标题'); return }
  saving.value = true
  try {
    const uploadPromises = articleForm.value.files
      .filter((f: any) => f.raw)
      .map((f: any) => uploadFile(f))
    const uploaded = await Promise.all(uploadPromises)
    const existingFiles = articleForm.value.files.filter((f: any) => !f.raw)
    const allFiles = [...existingFiles, ...uploaded]

    const tagsStr = Array.isArray(articleForm.value.tags) ? articleForm.value.tags.join(',') : ''
    const payload = {
      title: articleForm.value.title,
      categoryId: articleForm.value.categoryId,
      author: articleForm.value.author,
      summary: articleForm.value.summary,
      content: articleForm.value.content,
      tags: tagsStr,
      files: allFiles,
      sort: 0,
      permission_type: articleForm.value.permission_type,
      permission_targets: articleForm.value.permission_targets.length > 0 ? JSON.stringify(articleForm.value.permission_targets) : null,
      username: getUsername()
    }
    const url = editingArticle.value ? '/api/knowledge/articles/' + editingArticle.value.id : '/api/knowledge/articles'
    const method = editingArticle.value ? 'PUT' : 'POST'
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }).then(r => r.json())
    if (res.success) {
      ElMessage.success(editingArticle.value ? '文章已更新' : '文章已创建')
      showArticleDialog.value = false
      fetchArticles()
      fetchCategories()
      fetchTags()
    } else {
      ElMessage.error(res.message || '保存失败')
    }
  } catch (e: any) {
    ElMessage.error(e.message || '操作失败')
  }
  saving.value = false
}

const deleteArticle = async (id: number) => {
  try {
    const res = await fetch('/api/knowledge/articles/' + id + '?username=' + getUsername(), { method: 'DELETE' }).then(r => r.json())
    if (res.success) {
      ElMessage.success('删除成功')
      fetchArticles()
      fetchCategories()
      fetchTags()
    }
  } catch { /* ignore */ }
}

const addCategory = async () => {
  if (!newCategoryName.value.trim()) return
  try {
    const res = await fetch('/api/knowledge/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newCategoryName.value.trim(), username: getUsername() })
    }).then(r => r.json())
    if (res.success) {
      ElMessage.success('分类已添加')
      newCategoryName.value = ''
      fetchCategories()
    }
  } catch { /* ignore */ }
}

const deleteCategory = async (id: number) => {
  try {
    const res = await fetch('/api/knowledge/categories/' + id + '?username=' + getUsername(), { method: 'DELETE' }).then(r => r.json())
    if (res.success) {
      ElMessage.success('分类已删除')
      fetchCategories()
      fetchArticles()
    }
  } catch { /* ignore */ }
}

const downloadFile = (f: any) => {
  const a = document.createElement('a')
  a.href = f.url
  a.download = f.name
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
}

const inferType = (name: string): string => {
  const ext = name.includes('.') ? name.split('.').pop()?.toLowerCase() : '';
  const map: Record<string, string> = {
    jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif',
    bmp: 'image/bmp', webp: 'image/webp', svg: 'image/svg+xml',
    pdf: 'application/pdf',
    doc: 'application/msword', docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    txt: 'text/plain', json: 'application/json', xml: 'application/xml', md: 'text/markdown', csv: 'text/csv',
  };
  return map[ext || ''] || '';
}

const canPreview = (file: any): boolean => {
  const type = file.type || inferType(file.name || '');
  const name = file.name || '';
  const ext = name.includes('.') ? name.split('.').pop()?.toLowerCase() : '';
  return type.startsWith('image/') || type.startsWith('text/') ||
    type === 'application/pdf' || type === 'application/json' || type === 'application/xml' ||
    type === 'application/msword' ||
    type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    name.endsWith('.doc') || name.endsWith('.docx') ||
    ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg'].includes(ext || '') ||
    ext === 'pdf' ||
    ['txt', 'json', 'xml', 'md', 'csv'].includes(ext || '');
}

const previewFile = async (file: any) => {
  if (!file.url) {
    ElMessage.error('文件链接不存在');
    return;
  }
  if (file.url.startsWith('blob:')) {
    ElMessage.warning('文件未成功上传，请重新上传附件');
    return;
  }
  const realType = file.type || inferType(file.name || '');
  if (!canPreview(file)) {
    previewFileData.value = {
      name: file.name || '未知文件',
      url: file.url,
      type: realType,
      size: file.size || 0
    };
    previewDocContent.value = '';
    previewFileContent.value = '';
    previewVisible.value = true;
    return;
  }
  previewFileData.value = {
    name: file.name || '未知文件',
    url: file.url,
    type: realType,
    size: file.size || 0
  };
  previewDocContent.value = '';

  const name = file.name || '';
  const isDoc = name.endsWith('.doc') || name.endsWith('.docx') ||
    realType === 'application/msword' ||
    realType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

  if (isDoc) {
    try {
      const response = await fetch(file.url);
      const arrayBuffer = await response.arrayBuffer();
      const result = await mammoth.convertToHtml({ arrayBuffer });
      previewDocContent.value = result.value;
    } catch (error) {
      console.error('文档预览失败:', error);
      previewDocContent.value = '<p style="color:#999">文档预览失败，请下载后查看</p>';
    }
  } else if (realType && (realType.startsWith('text/') || realType === 'application/json' || realType === 'application/xml')) {
    try {
      const resp = await fetch(file.url);
      if (!resp.ok) throw new Error('HTTP ' + resp.status);
      previewFileContent.value = await resp.text();
    } catch (error) {
      console.error('读取文件内容失败:', error);
      ElMessage.error('文件不存在或链接已失效，请重新上传');
    }
  } else {
    previewFileContent.value = '';
  }

  previewVisible.value = true;
}

const previewImage = (file: any) => {
  previewUrl.value = file.url
  showImageViewer.value = true
}

onMounted(() => {
  fetchCurrentRole()
  fetchCategories()
  fetchArticles()
  fetchUsers()
  fetchRoles()
  fetchTags()
})
</script>

<style scoped>
.knowledge-base { min-height: 100vh; display: flex; flex-direction: column; background: #E4EDF2; }
.page-header { background: rgba(255,255,255,0.9); backdrop-filter: blur(10px); border-bottom: 1px solid rgba(100,149,237,0.3); padding: 0.75rem 2rem; display: flex; align-items: center; justify-content: space-between; box-shadow: 0 2px 10px rgba(0,0,0,0.1); position: sticky; top: 0; z-index: 100; }
.header-left { display: flex; align-items: center; gap: 1rem; }
.page-title { font-size: 1.3rem; font-weight: 600; color: #333; display: flex; align-items: center; gap: 0.5rem; margin: 0; }
.title-icon { font-size: 1.5rem; }
.header-actions { display: flex; gap: 0.5rem; }
.back-btn { color: #666; }
.kb-layout { display: flex; flex: 1; }
.kb-sidebar { width: 200px; background: rgba(255,255,255,0.85); backdrop-filter: blur(5px); border-right: 1px solid rgba(100,149,237,0.2); padding: 1rem 0; flex-shrink: 0; }
.category-title { padding: 0 1rem 0.75rem; font-size: 0.85rem; font-weight: 600; color: #999; text-transform: uppercase; letter-spacing: 1px; }
.category-item { display: flex; align-items: center; gap: 0.5rem; padding: 0.6rem 1rem; cursor: pointer; transition: all 0.2s; color: #555; font-size: 0.9rem; }
.category-item:hover { background: rgba(100,149,237,0.1); }
.category-item.active { background: rgba(100,149,237,0.15); color: #4169E1; font-weight: 500; }
.cat-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
.cat-count { margin-left: auto; font-size: 0.8rem; color: #aaa; background: rgba(0,0,0,0.05); padding: 0 6px; border-radius: 8px; }
.kb-main { flex: 1; padding: 1.5rem; overflow-y: auto; }
.search-bar { display: flex; gap: 0.5rem; margin-bottom: 1.5rem; }
.article-list { display: flex; flex-direction: column; gap: 0.75rem; }
.article-card { background: #fff; border-radius: 10px; padding: 1rem 1.25rem; cursor: pointer; transition: all 0.2s; border: 1px solid rgba(100,149,237,0.15); box-shadow: 0 2px 6px rgba(0,0,0,0.04); }
.article-card:hover { box-shadow: 0 4px 16px rgba(100,149,237,0.2); transform: translateY(-1px); border-color: rgba(100,149,237,0.3); }
.article-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.4rem; }
.article-title { font-size: 1.05rem; font-weight: 600; color: #333; }
.article-actions { display: flex; align-items: center; gap: 0.25rem; flex-shrink: 0; }
.perm-lock { font-size: 0.85rem; margin-right: 4px; }
.cat-tag { margin-right: 0.5rem; }
.article-summary { color: #888; font-size: 0.85rem; margin-bottom: 0.5rem; line-height: 1.5; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.article-meta { display: flex; align-items: center; gap: 1rem; font-size: 0.8rem; color: #aaa; flex-wrap: wrap; }
.file-badge { background: rgba(100,149,237,0.1); padding: 0 6px; border-radius: 4px; font-size: 0.8rem; }
.article-tags { display: flex; flex-wrap: wrap; gap: 0; }
.empty-state { text-align: center; padding: 3rem; color: #999; }
.empty-icon { font-size: 3rem; display: block; margin-bottom: 0.5rem; }
.empty-state p { margin: 0; }
.pagination-bar { display: flex; justify-content: center; padding: 1rem 0; }
.form-row { display: flex; gap: 1rem; }
.file-item { position: relative; width: 100%; height: 100%; }
.file-actions-bar { position: absolute; top: 2px; right: 2px; z-index: 10; }
.file-delete { cursor: pointer; background: rgba(0,0,0,0.5); color: #fff; border-radius: 50%; padding: 2px; }
.file-preview-wrap { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; overflow: hidden; }
.file-preview { width: 100%; height: 100%; object-fit: cover; }
.file-icon-placeholder { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px; color: #999; }
.file-type-icon { font-size: 24px; }
.file-type-name { font-size: 10px; max-width: 80px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.article-detail { }
.detail-meta { display: flex; align-items: center; gap: 1rem; font-size: 0.85rem; color: #888; margin-bottom: 1rem; }
.detail-summary { background: #f8f9fa; border-left: 3px solid #6495ED; padding: 0.75rem 1rem; border-radius: 4px; color: #666; font-size: 0.9rem; margin-bottom: 1rem; }
.detail-tags { margin-bottom: 1rem; }
.detail-content { line-height: 1.8; color: #333; font-size: 0.95rem; }
.detail-content :deep(h1), .detail-content :deep(h2), .detail-content :deep(h3) { margin-top: 1.5rem; margin-bottom: 0.75rem; color: #222; }
.detail-content :deep(p) { margin-bottom: 0.75rem; }
.detail-content :deep(img) { max-width: 100%; border-radius: 8px; margin: 1rem 0; }
.detail-content :deep(pre) { background: #f5f5f5; padding: 1rem; border-radius: 6px; overflow-x: auto; }
.editor-container { min-height: 400px; }
.perm-checkboxes { margin-top: 8px; max-height: 160px; overflow-y: auto; display: flex; flex-wrap: wrap; gap: 4px 12px; padding: 4px 0; }
.detail-content :deep(code) { background: #f0f0f0; padding: 2px 6px; border-radius: 3px; font-size: 0.9em; }
.detail-content :deep(table) { width: 100%; border-collapse: collapse; margin: 1rem 0; }
.detail-content :deep(th), .detail-content :deep(td) { border: 1px solid #ddd; padding: 0.5rem; text-align: left; }
.detail-content :deep(th) { background: #f5f7fa; }
.detail-files { margin-top: 1.5rem; border-top: 1px solid #eee; padding-top: 1rem; }
.detail-files-title { font-weight: 600; color: #555; margin-bottom: 0.5rem; }
.detail-file-item { display: flex; align-items: center; gap: 0.5rem; padding: 0.4rem 0; border-bottom: 1px solid #f5f5f5; }
.detail-file-item:last-child { border-bottom: none; }
.file-name { color: #333; flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.file-size { color: #aaa; font-size: 0.8rem; }
.category-mgr { }
.add-cat-row { display: flex; gap: 0.5rem; margin-bottom: 1rem; }
.cat-mgr-item { display: flex; align-items: center; gap: 0.75rem; padding: 0.6rem 0; border-bottom: 1px solid #f0f0f0; }
.cat-mgr-item:last-child { border-bottom: none; }
.cat-name { font-weight: 500; color: #333; min-width: 100px; }
.cat-desc { flex: 1; color: #999; font-size: 0.85rem; }
.image-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.85); z-index: 9999; display: flex; align-items: center; justify-content: center; cursor: pointer; }
.image-overlay-content { max-width: 90vw; max-height: 90vh; object-fit: contain; border-radius: 8px; }
.image-overlay-close { position: absolute; top: 20px; right: 30px; color: #fff; font-size: 2rem; cursor: pointer; }
.preview-dialog .preview-content { min-height: 200px; display: flex; align-items: center; justify-content: center; }
.preview-dialog .image-preview { max-width: 100%; max-height: 500px; }
.preview-dialog .text-preview { width: 100%; max-height: 500px; overflow: auto; background: #f5f5f5; border-radius: 6px; }
.preview-dialog .text-preview pre { margin: 0; padding: 1rem; white-space: pre-wrap; word-break: break-all; }
.preview-dialog .iframe-preview { width: 100%; }
.preview-dialog .doc-preview { width: 100%; }
.preview-dialog .doc-toolbar { display: flex; align-items: center; justify-content: space-between; padding: 0.5rem 0; border-bottom: 1px solid #eee; margin-bottom: 0.5rem; }
.preview-dialog .doc-toolbar .doc-name { font-weight: 600; color: #333; }
.preview-dialog .doc-content { max-height: 500px; overflow-y: auto; padding: 0.5rem; line-height: 1.8; }
.preview-dialog .other-preview { text-align: center; padding: 2rem; color: #999; }
.preview-dialog .other-preview .file-icon { font-size: 3rem; margin-bottom: 0.5rem; }
</style>
