<template>
  <div class="profile-page">
    <div class="page-card">
      <h2>个人中心</h2>
      <div class="profile-content">
        <div class="avatar-section">
          <el-avatar :size="120" :src="avatarUrl">
            <span style="color:#fff;font-weight:bold;font-size:40px">{{ avatarText }}</span>
          </el-avatar>
          <el-upload
            :action="'/api/user/avatar'"
            name="avatar"
            :show-file-list="false"
            :data="{ username: currentUsername }"
            :on-success="handleSuccess"
            :on-error="handleError"
            :before-upload="beforeUpload"
            accept="image/jpeg,image/png,image/gif,image/webp"
          >
            <el-button type="primary" :loading="uploading" style="margin-top:16px">更换头像</el-button>
          </el-upload>
          <p class="upload-hint">支持 JPG/PNG/GIF/WebP，不超过 2MB</p>
        </div>
        <el-divider />
        <div class="info-section">
          <el-descriptions :column="1" border>
            <el-descriptions-item label="用户名">{{ currentUsername }}</el-descriptions-item>
            <el-descriptions-item label="显示名">{{ currentUser }}</el-descriptions-item>
            <el-descriptions-item label="角色">{{ userRole }}</el-descriptions-item>
          </el-descriptions>
        </div>
      </div>
      <el-divider />
      <div class="login-records">
        <h3>最近登录记录</h3>
        <p class="record-hint">以下为您的账号最近登录/尝试登录记录，如发现异常请及时修改密码</p>
        <el-table :data="loginRecords" size="small" border max-height="320">
          <el-table-column label="时间" prop="time" width="180" />
          <el-table-column label="IP 地址" prop="ip" width="150" />
          <el-table-column label="结果" width="90">
            <template #default="{ row }">
              <el-tag :type="row.success ? 'success' : 'danger'" size="small">
                {{ row.success ? '成功' : '失败' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="说明" prop="detail" />
        </el-table>
      </div>
      <div style="margin-top:20px">
        <el-button @click="$router.push('/')">返回首页</el-button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'

const currentUser = ref('')
const currentUsername = ref('')
const userRole = ref('')
const avatarUrl = ref('')
const uploading = ref(false)
const loginRecords = ref<any[]>([])

const avatarText = computed(() => currentUser.value.charAt(0).toUpperCase())

const loadData = () => {
  currentUsername.value = localStorage.getItem('username') || ''
  userRole.value = localStorage.getItem('role') || ''
  const username = currentUsername.value
  if (username === 'admin') {
    currentUser.value = '系统管理员'
  } else {
    const match = username.match(/^emp_(.+?)_\d+$/)
    currentUser.value = match ? match[1] : username
  }
  const userStr = localStorage.getItem('user')
  if (userStr) {
    try {
      const u = JSON.parse(userStr)
      if (u.avatar) avatarUrl.value = u.avatar
    } catch { /* ignore */ }
  }
}

const loadAvatar = async () => {
  if (!currentUsername.value) return
  try {
    const res = await fetch(`/api/user/avatar/${encodeURIComponent(currentUsername.value)}`)
    const json = await res.json()
    if (json.success && json.data.avatar) avatarUrl.value = json.data.avatar
  } catch { /* ignore */ }
}

const handleSuccess = (response: any) => {
  uploading.value = false
  if (response.success) {
    avatarUrl.value = response.data.avatar
    ElMessage.success('头像更新成功')
    const userStr = localStorage.getItem('user')
    if (userStr) {
      try {
        const u = JSON.parse(userStr)
        u.avatar = response.data.avatar
        localStorage.setItem('user', JSON.stringify(u))
      } catch { /* ignore */ }
    }
  } else {
    ElMessage.error(response.message || '上传失败')
  }
}

const handleError = () => {
  uploading.value = false
  ElMessage.error('头像上传失败')
}

const beforeUpload = (file: File) => {
  uploading.value = true
  if (!['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(file.type)) {
    ElMessage.error('仅支持 JPG/PNG/GIF/WebP 格式')
    return false
  }
  if (file.size > 2 * 1024 * 1024) {
    ElMessage.error('文件不能超过 2MB')
    return false
  }
  return true
}

const loadLoginRecords = async () => {
  try {
    const res = await fetch('/api/user/login-records')
    const json = await res.json()
    if (json.success) loginRecords.value = json.data || []
  } catch { /* ignore */ }
}

onMounted(() => {
  loadData()
  loadAvatar()
  loadLoginRecords()
})
</script>

<style scoped>
.profile-page {
  padding: 40px;
  display: flex;
  justify-content: center;
}
.page-card {
  background: #fff;
  border-radius: 12px;
  padding: 40px;
  width: 100%;
  max-width: 600px;
  box-shadow: 0 2px 12px rgba(0,0,0,0.08);
}
.page-card h2 {
  margin: 0 0 20px 0;
  color: #333;
}
.profile-content {
  display: flex;
  flex-direction: column;
  align-items: center;
}
.avatar-section {
  display: flex;
  flex-direction: column;
  align-items: center;
}
.upload-hint {
  font-size: 12px;
  color: #999;
  margin-top: 8px;
}
.info-section {
  width: 100%;
  max-width: 400px;
}
.login-records {
  width: 100%;
  text-align: left;
}
.login-records h3 {
  margin: 0 0 4px 0;
  color: #333;
}
.record-hint {
  font-size: 12px;
  color: #999;
  margin: 0 0 12px 0;
}
</style>
