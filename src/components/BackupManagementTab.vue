<template>
  <div class="management-section">
    <div class="section-header">
      <h3 class="subsection-title">数据备份</h3>
      <div class="backup-actions">
        <span class="backup-tip">备份包含全部表结构与数据，兼容 MySQL 5.7</span>
        <el-button type="primary" @click="handleCreateBackup" :loading="creating">立即备份</el-button>
      </div>
    </div>

    <div v-loading="loading" class="backup-container">
      <el-table :data="backups" style="width: 100%" empty-text="暂无备份记录">
        <el-table-column prop="name" label="备份文件" min-width="260" show-overflow-tooltip>
          <template #default="{ row }">
            <span class="file-name">{{ row.name }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="sizeText" label="大小" width="110" />
        <el-table-column label="创建时间" width="180">
          <template #default="{ row }">
            {{ formatTime(row.createdAt) }}
          </template>
        </el-table-column>
        <el-table-column v-if="isAdmin" label="操作" width="220" align="center">
          <template #default="{ row }">
            <el-button size="small" @click="handleDownload(row)">下载</el-button>
            <el-button size="small" type="danger" plain @click="handleRestore(row)">恢复</el-button>
            <el-button size="small" type="danger" @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'

interface BackupItem {
  name: string
  size: number
  sizeText: string
  createdAt: string | Date
}

const loading = ref(false)
const creating = ref(false)
const backups = ref<BackupItem[]>([])

const isAdmin = computed(() => {
  const role = localStorage.getItem('role') || ''
  const userStr = localStorage.getItem('user')
  const username = userStr ? (JSON.parse(userStr).username || '') : localStorage.getItem('username') || ''
  const adminRoles = ['系统管理员', '总经理', 'admin', '管理员']
  return adminRoles.includes(role) || adminRoles.includes(username)
})

const token = () => localStorage.getItem('token') || ''

function formatTime(t: string | Date) {
  if (!t) return ''
  const d = new Date(t)
  if (isNaN(d.getTime())) return String(t)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

async function fetchBackups() {
  loading.value = true
  try {
    const res = await fetch('/api/backups')
    const json = await res.json()
    if (json.success) {
      backups.value = json.data || []
    } else {
      ElMessage.error(json.message || '获取备份列表失败')
    }
  } catch {
    ElMessage.error('获取备份列表失败')
  } finally {
    loading.value = false
  }
}

async function handleCreateBackup() {
  creating.value = true
  try {
    const res = await fetch('/api/backups', { method: 'POST' })
    const json = await res.json()
    if (json.success) {
      ElMessage.success(json.message || '备份成功')
      backups.value.unshift(json.data)
    } else {
      ElMessage.error(json.message || '备份失败')
    }
  } catch {
    ElMessage.error('备份失败，请检查服务端日志')
  } finally {
    creating.value = false
  }
}

function handleDownload(row: BackupItem) {
  window.open(`/api/backups/${encodeURIComponent(row.name)}/download?token=${token()}`, '_blank')
}

function handleDelete(row: BackupItem) {
  // 高危操作二次验证：弹出密码输入框，需输入当前登录密码确认
  ElMessageBox.prompt(
    `确定要删除备份文件"${row.name}"吗？删除后不可恢复。请输入您的当前登录密码以确认：`,
    '高危操作确认',
    {
      inputType: 'password',
      confirmButtonText: '删除',
      cancelButtonText: '取消',
      type: 'warning'
    }
  ).then(async ({ value }) => {
    try {
      const res = await fetch(`/api/backups/${encodeURIComponent(row.name)}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminPassword: value })
      })
      const json = await res.json()
      if (json.success) {
        ElMessage.success('备份文件已删除')
        backups.value = backups.value.filter(b => b.name !== row.name)
      } else {
        ElMessage.error(json.message || '删除失败')
      }
    } catch {
      ElMessage.error('删除失败')
    }
  }).catch(() => {})
}

function handleRestore(row: BackupItem) {
  ElMessageBox.prompt(
    `将使用备份"${row.name}"覆盖恢复当前数据库，恢复前系统会自动生成恢复前快照。\n此操作不可撤销，请输入 RESTORE 确认：`,
    '恢复确认',
    {
      confirmButtonText: '确认恢复',
      cancelButtonText: '取消',
      type: 'warning',
      inputPattern: /^RESTORE$/,
      inputErrorMessage: '请输入 RESTORE 确认恢复'
    }
  ).then(async ({ value }) => {
    if (value !== 'RESTORE') return
    try {
      const res = await fetch(`/api/backups/${encodeURIComponent(row.name)}/restore`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirm: 'RESTORE' })
      })
      const json = await res.json()
      if (json.success) {
        ElMessage.success('恢复成功，已自动生成恢复前快照')
        fetchBackups()
      } else {
        ElMessage.error(json.message || '恢复失败')
      }
    } catch {
      ElMessage.error('恢复失败，请检查服务端日志')
    }
  }).catch(() => {})
}

onMounted(() => {
  fetchBackups()
})
</script>

<style scoped>
.management-section { min-height: 320px; }
.section-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; flex-wrap: wrap; gap: 8px; }
.subsection-title { font-size: 16px; font-weight: 600; color: #1a1a2e; margin: 0; }
.backup-actions { display: flex; align-items: center; gap: 12px; }
.backup-tip { font-size: 12px; color: #999; }
.backup-container { min-height: 240px; }
.file-name { font-family: Consolas, Monaco, monospace; font-size: 13px; color: #333; }
</style>
