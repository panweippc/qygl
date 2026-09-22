<template>
  <div class="announcement-mgmt">
    <PageHeaderBar title="公告管理">
      <template #actions>
        <div class="header-actions">
          <el-button size="small" @click="load">刷新</el-button>
        </div>
      </template>
    </PageHeaderBar>

    <div class="am-body">
      <div class="am-tip">
        <strong>公司公告</strong>：此处发布的公告会显示在登录页左侧「动态公告」栏，未登录的同事也能看到；
        状态为「草稿」的公告不会对外展示。
      </div>

      <div class="am-toolbar">
        <div class="am-filters">
          <el-input v-model="filter.keyword" placeholder="标题/内容关键字" clearable size="small" style="width:200px" @keyup.enter="reload" />
          <el-select v-model="filter.status" placeholder="全部状态" clearable size="small" style="width:130px" @change="reload">
            <el-option label="已发布" value="已发布" />
            <el-option label="草稿" value="草稿" />
          </el-select>
          <el-select v-model="filter.category" placeholder="全部分类" clearable size="small" style="width:140px" @change="reload">
            <el-option v-for="c in CATEGORIES" :key="c" :label="c" :value="c" />
          </el-select>
          <el-button type="primary" size="small" @click="reload">查询</el-button>
        </div>
        <el-button type="primary" size="small" @click="openEdit()">+ 新增公告</el-button>
      </div>

      <div class="am-table" v-loading="loading">
        <el-table :data="list" style="width:100%" size="small" empty-text="暂无公告，点击右上角「新增公告」发布第一条">
          <el-table-column label="标题" min-width="260" show-overflow-tooltip>
            <template #default="{ row }">
              <el-tag v-if="row.is_top" type="danger" size="small" effect="plain" style="margin-right:6px">置顶</el-tag>
              <span class="am-title">{{ row.title }}</span>
            </template>
          </el-table-column>
          <el-table-column prop="category" label="分类" width="110" />
          <el-table-column label="级别" width="86">
            <template #default="{ row }">
              <el-tag :type="levelTag(row.priority)" size="small" effect="plain">{{ row.priority || '普通' }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="状态" width="90">
            <template #default="{ row }">
              <el-tag :type="row.status === '已发布' ? 'success' : 'info'" size="small" effect="plain">{{ row.status }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="publisher" label="发布人" width="100" />
          <el-table-column label="发布时间" width="160">
            <template #default="{ row }">{{ fmtTime(row.publish_at || row.created_at) }}</template>
          </el-table-column>
          <el-table-column label="阅读" width="70">
            <template #default="{ row }">{{ row.view_count || 0 }}</template>
          </el-table-column>
          <el-table-column label="操作" width="220" fixed="right">
            <template #default="{ row }">
              <div class="am-ops">
                <el-button text size="small" @click="openEdit(row)">编辑</el-button>
                <el-button text size="small" @click="toggleTop(row)">{{ row.is_top ? '取消置顶' : '置顶' }}</el-button>
                <el-button text size="small" @click="toggleStatus(row)">{{ row.status === '已发布' ? '转为草稿' : '发布' }}</el-button>
                <el-button text size="small" type="danger" @click="remove(row)">删除</el-button>
              </div>
            </template>
          </el-table-column>
        </el-table>
      </div>

      <el-pagination
        v-if="total > pageSize"
        v-model:current-page="page"
        :page-size="pageSize"
        :total="total"
        layout="prev,pager,next,total"
        small
        class="am-pagination"
        @current-change="load"
      />

      <el-dialog v-model="editVisible" :title="form.id ? '编辑公告' : '新增公告'" width="640px" align-center destroy-on-close>
        <div class="am-dialog-body">
          <el-form :model="form" label-width="90px">
            <el-form-item label="标题" required>
              <el-input v-model="form.title" maxlength="200" show-word-limit placeholder="如：关于2026年国庆节放假安排的通知" />
            </el-form-item>
            <el-form-item label="分类">
              <el-select v-model="form.category" style="width:100%">
                <el-option v-for="c in CATEGORIES" :key="c" :label="c" :value="c" />
              </el-select>
            </el-form-item>
            <el-form-item label="正文">
              <el-input v-model="form.content" type="textarea" :rows="8" placeholder="公告正文，支持换行。" />
            </el-form-item>
            <el-form-item label="附件">
              <el-upload
                :action="uploadUrl"
                :headers="uploadHeaders"
                :file-list="attachFileList"
                :on-success="onUploadSuccess"
                :on-remove="onUploadRemove"
                :on-preview="onUploadPreview"
                multiple
                list-type="text"
              >
                <el-button size="small" type="primary">选择文件</el-button>
                <template #tip>
                  <div class="am-hint">支持图片 / 文档 / 表格 / 压缩包 / 音视频；图片将作为登录页轮播封面与详情预览</div>
                </template>
              </el-upload>
            </el-form-item>
            <el-form-item label="级别">
              <el-radio-group v-model="form.priority">
                <el-radio label="普通">普通</el-radio>
                <el-radio label="重要">重要</el-radio>
                <el-radio label="紧急">紧急</el-radio>
              </el-radio-group>
              <div class="am-hint-block">登录页据此着色：普通=蓝 / 重要=橙 / 紧急=红（紧急会带呼吸色条）</div>
            </el-form-item>
            <el-form-item label="状态">
              <el-radio-group v-model="form.status">
                <el-radio label="已发布">发布（登录页可见）</el-radio>
                <el-radio label="草稿">存为草稿</el-radio>
              </el-radio-group>
            </el-form-item>
            <el-form-item label="置顶">
              <el-switch v-model="form.is_top" />
              <span class="am-hint">置顶公告在登录页排在最前</span>
            </el-form-item>
            <el-form-item label="发布时间">
              <el-date-picker v-model="form.publish_at" type="datetime" value-format="YYYY-MM-DD HH:mm:ss" placeholder="留空则使用当前时间" style="width:100%" />
            </el-form-item>
          </el-form>
        </div>
        <template #footer>
          <span class="am-dialog-footer">
            <el-button @click="editVisible = false">取消</el-button>
            <el-button type="primary" :loading="saving" @click="save">保存</el-button>
          </span>
        </template>
      </el-dialog>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import PageHeaderBar from '../components/PageHeaderBar.vue'

const route = useRoute()
const CATEGORIES = ['公司公告', '人事通知', '行政通知', '制度规范', '活动资讯']

const list = ref<any[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(20)
const loading = ref(false)
const saving = ref(false)
const editVisible = ref(false)
const filter = ref({ keyword: '', status: '', category: '' })

const emptyForm = () => ({ id: null as number | null, title: '', content: '', category: '公司公告', priority: '普通', status: '已发布', is_top: false, publish_at: '', attachments: [] as any[] })
const form = ref<any>(emptyForm())

/** 级别 → el-tag 类型（el-tag 无 primary，普通用默认蓝色） */
function levelTag(p?: string) {
  if (p === '紧急') return 'danger'
  if (p === '重要') return 'warning'
  return ''
}

const token = () => localStorage.getItem('token') || ''
const headers = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` })

// ===== 附件上传（复用项目统一 /api/upload 通道） =====
const uploadUrl = '/api/upload'
const uploadHeaders = () => ({ Authorization: `Bearer ${token()}` })
// el-upload 的 file-list 仅需 name/url；存储结构用 form.attachments（{name,url,size,ext,mime,group}）
const attachFileList = computed(() => (form.value.attachments || []).map((a: any) => ({ name: a.name, url: a.url })))
function onUploadSuccess(response: any) {
  if (response?.success && Array.isArray(response.data)) {
    const exists = new Set((form.value.attachments || []).map((x: any) => x.url))
    for (const f of response.data) {
      if (f?.url && !exists.has(f.url)) {
        form.value.attachments = [...(form.value.attachments || []), f]
        exists.add(f.url)
      }
    }
    ElMessage.success(`已添加 ${response.data.length} 个附件`)
  } else {
    ElMessage.error(response?.message || '上传失败')
  }
}
function onUploadRemove(file: any) {
  // 按 url 从附件列表移除（不物理删除 uploads 文件，与 files 表口径一致）
  const url = file?.url
  if (url) form.value.attachments = (form.value.attachments || []).filter((x: any) => x.url !== url)
}
function onUploadPreview(file: any) {
  if (file?.url) window.open(file.url, '_blank')
}

function fmtTime(v: any) {
  if (!v) return '-'
  return String(v).replace('T', ' ').slice(0, 16)
}

async function load() {
  loading.value = true
  try {
    const qs = new URLSearchParams()
    if (filter.value.keyword) qs.set('keyword', filter.value.keyword)
    if (filter.value.status) qs.set('status', filter.value.status)
    if (filter.value.category) qs.set('category', filter.value.category)
    qs.set('page', String(page.value))
    qs.set('pageSize', String(pageSize.value))
    const resp = await fetch(`/api/announcements?${qs.toString()}`, { headers: headers() })
    const json = await resp.json()
    if (json.success) {
      list.value = json.data.list || []
      total.value = json.data.total || 0
    } else {
      ElMessage.error(json.message || '获取公告失败')
    }
  } catch (e: any) {
    ElMessage.error('获取公告失败: ' + e.message)
  } finally {
    loading.value = false
  }
}

function reload() {
  page.value = 1
  load()
}

function openEdit(row?: any) {
  form.value = row
    ? {
        id: row.id,
        title: row.title,
        content: row.content || '',
        category: row.category || '公司公告',
        priority: row.priority || '普通',
        status: row.status || '已发布',
        is_top: !!row.is_top,
        publish_at: row.publish_at ? String(row.publish_at).replace('T', ' ').slice(0, 19) : '',
        // 必须回填附件：否则新增附件后保存只提交新文件，原有附件被覆盖丢失
        attachments: Array.isArray(row.attachments) ? [...row.attachments] : [],
      }
    : emptyForm()
  editVisible.value = true
}

async function save() {
  if (!form.value.title.trim()) {
    ElMessage.warning('请填写公告标题')
    return
  }
  saving.value = true
  try {
    const isEdit = !!form.value.id
    const resp = await fetch(isEdit ? `/api/announcements/${form.value.id}` : '/api/announcements', {
      method: isEdit ? 'PUT' : 'POST',
      headers: headers(),
      body: JSON.stringify(form.value),
    })
    const json = await resp.json()
    if (json.success) {
      ElMessage.success(json.message || '保存成功')
      editVisible.value = false
      load()
    } else {
      ElMessage.error(json.message || '保存失败')
    }
  } catch (e: any) {
    ElMessage.error('保存失败: ' + e.message)
  } finally {
    saving.value = false
  }
}

async function toggleTop(row: any) {
  try {
    const resp = await fetch(`/api/announcements/${row.id}`, {
      method: 'PUT',
      headers: headers(),
      body: JSON.stringify({ is_top: !row.is_top }),
    })
    const json = await resp.json()
    if (json.success) {
      ElMessage.success(row.is_top ? '已取消置顶' : '已置顶')
      load()
    } else ElMessage.error(json.message || '操作失败')
  } catch (e: any) {
    ElMessage.error('操作失败: ' + e.message)
  }
}

async function toggleStatus(row: any) {
  try {
    const next = row.status === '已发布' ? '草稿' : '已发布'
    const resp = await fetch(`/api/announcements/${row.id}`, {
      method: 'PUT',
      headers: headers(),
      body: JSON.stringify({ status: next }),
    })
    const json = await resp.json()
    if (json.success) {
      ElMessage.success(next === '已发布' ? '已发布到登录页' : '已转为草稿')
      load()
    } else ElMessage.error(json.message || '操作失败')
  } catch (e: any) {
    ElMessage.error('操作失败: ' + e.message)
  }
}

async function remove(row: any) {
  try {
    await ElMessageBox.confirm(`确定删除公告《${row.title}》吗？删除后登录页将不再展示。`, '提示', { type: 'warning' })
  } catch { return }
  try {
    const resp = await fetch(`/api/announcements/${row.id}`, { method: 'DELETE', headers: headers() })
    const json = await resp.json()
    if (json.success) {
      ElMessage.success('已删除')
      load()
    } else ElMessage.error(json.message || '删除失败')
  } catch (e: any) {
    ElMessage.error('删除失败: ' + e.message)
  }
}

onMounted(() => {
  load()
  // 支持首页常用操作 ?action=add 直达新增公告弹窗
  if (route.query.action === 'add') openEdit()
})
</script>

<style scoped>
.announcement-mgmt {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}
.am-body {
  padding: 16px 20px;
  flex: 1;
}
.am-tip {
  background: #f4f7fb;
  border: 1px solid #dfe8f3;
  border-left: 3px solid #1E5AA8;
  border-radius: 6px;
  padding: 10px 14px;
  font-size: 13px;
  color: #5a6b80;
  line-height: 1.6;
  margin-bottom: 14px;
}
.am-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 12px;
}
.am-filters {
  display: flex;
  align-items: center;
  gap: 8px;
}
.am-table {
  background: #fff;
  border-radius: 8px;
  padding: 8px;
  border: 1px solid #ebeef5;
}
.am-title {
  color: #303133;
}
.am-ops {
  display: flex;
  flex-wrap: nowrap;
  align-items: center;
  gap: 2px;
  white-space: nowrap;
}
.am-ops :deep(.el-button) {
  padding: 0 4px;
  margin-left: 0 !important;
  margin-right: 0;
}
.am-pagination {
  margin-top: 12px;
  justify-content: flex-end;
}
.am-dialog-body {
  max-height: 62vh;
  overflow-y: auto;
  padding-right: 6px;
}
.am-dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
.am-hint {
  margin-left: 10px;
  font-size: 12px;
  color: #909399;
}
.am-hint-block {
  font-size: 12px;
  color: #909399;
  line-height: 1.5;
  margin-top: 2px;
}
.header-actions {
  display: flex;
  gap: 8px;
}
</style>
