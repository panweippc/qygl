<template>
  <header class="header">
    <div class="logo">
      <span class="logo-text">宏友智慧办公平台</span>
      <div class="logo-glow"></div>
    </div>
    <nav class="nav">
      <router-link to="/" class="nav-item">
        <span>首页</span>
        <div class="nav-item-indicator"></div>
      </router-link>
      <router-link to="/message-center" class="nav-item notification-btn">
        <span class="bell-icon">🔔</span>
        <span v-if="unreadCount > 0" class="badge">{{ unreadCount > 99 ? '99+' : unreadCount }}</span>
        <div class="nav-item-indicator"></div>
      </router-link>

      <el-dropdown trigger="click" placement="bottom-end" @command="handleCommand">
        <div class="user-info">
          <el-avatar :size="32" :src="avatarUrl">
            <span class="avatar-placeholder">{{ avatarText }}</span>
          </el-avatar>
          <span class="username">{{ currentUser }}</span>
          <el-icon class="dropdown-icon"><arrow-down /></el-icon>
        </div>
        <template #dropdown>
          <el-dropdown-menu>
            <el-dropdown-item command="profile">
              <el-icon><user /></el-icon>个人中心
            </el-dropdown-item>
            <el-dropdown-item command="changePassword">
              <el-icon><lock /></el-icon>修改密码
            </el-dropdown-item>
            <el-dropdown-item divided command="logout">
              <el-icon><switch-button /></el-icon>退出登录
            </el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>
    </nav>
  </header>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { ArrowDown, User, Lock, SwitchButton } from '@element-plus/icons-vue'

const router = useRouter()
const currentUser = ref('用户')
const currentUsername = ref('')
const avatarUrl = ref('')
const unreadCount = ref(0)
let refreshInterval: ReturnType<typeof setInterval> | null = null

const avatarText = computed(() => {
  return currentUser.value.charAt(0).toUpperCase()
})

const fetchUnreadCount = async () => {
  const userId = localStorage.getItem('username')
  if (!userId) return
  try {
    const res = await fetch(`/api/notifications/unread-count?userId=${encodeURIComponent(userId)}`)
    const json = await res.json()
    if (json.success) unreadCount.value = json.data.count
  } catch { /* ignore */ }
}

const loadCurrentUser = () => {
  const username = localStorage.getItem('username') || ''
  currentUsername.value = username
  if (!username) {
    currentUser.value = '用户'
    return
  }
  if (username === 'admin') {
    currentUser.value = '系统管理员'
  } else {
    const match = username.match(/^emp_(.+?)_\d+$/)
    if (match) {
      currentUser.value = match[1]
    } else {
      currentUser.value = username
    }
  }
}

const loadAvatar = async () => {
  const username = currentUsername.value
  if (!username) return
  try {
    const res = await fetch(`/api/user/avatar/${encodeURIComponent(username)}`)
    const json = await res.json()
    if (json.success && json.data.avatar) {
      avatarUrl.value = json.data.avatar
    } else {
      const userStr = localStorage.getItem('user')
      if (userStr) {
        try {
          const userInfo = JSON.parse(userStr)
          if (userInfo.avatar) avatarUrl.value = userInfo.avatar
        } catch { /* ignore */ }
      }
    }
  } catch { /* ignore */ }
}

const handleCommand = (command: string) => {
  if (command === 'logout') {
    handleLogout()
  } else if (command === 'changePassword') {
    router.push('/change-password')
  } else if (command === 'profile') {
    router.push('/profile')
  }
}

const handleLogout = () => {
  localStorage.removeItem('token')
  localStorage.removeItem('userId')
  localStorage.removeItem('username')
  localStorage.removeItem('role')
  localStorage.removeItem('user')
  localStorage.removeItem('permissions')
  if (refreshInterval) {
    clearInterval(refreshInterval)
    refreshInterval = null
  }
  router.push('/login')
}

onMounted(() => {
  loadCurrentUser()
  loadAvatar()
  fetchUnreadCount()
  refreshInterval = setInterval(fetchUnreadCount, 30000)
})

onUnmounted(() => {
  if (refreshInterval) {
    clearInterval(refreshInterval)
    refreshInterval = null
  }
})
</script>

<style scoped>
.header {
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid rgba(100, 149, 237, 0.3);
  padding: 0 2rem;
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  position: relative;
  z-index: 100;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  animation: headerSlideDown 0.5s ease-out;
}

@keyframes headerSlideDown {
  from { opacity: 0; transform: translateY(-20px); }
  to { opacity: 1; transform: translateY(0); }
}

.logo {
  display: flex;
  align-items: center;
  position: relative;
  z-index: 1;
}

.logo-text {
  font-size: 1.5rem;
  font-weight: bold;
  color: #333;
  text-shadow: 0 0 10px rgba(100, 149, 237, 0.3);
  position: relative;
  z-index: 2;
  transition: all 0.3s ease;
}

.logo-text:hover {
  transform: scale(1.05);
  text-shadow: 0 0 20px rgba(100, 149, 237, 0.6);
}

.logo-glow {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 120%;
  height: 120%;
  background: radial-gradient(circle, rgba(100, 149, 237, 0.4), transparent 70%);
  filter: blur(20px);
  opacity: 0;
  transition: opacity 0.3s ease;
  z-index: 1;
}

.logo:hover .logo-glow {
  opacity: 1;
}

.nav {
  display: flex;
  gap: 1rem;
  align-items: center;
  justify-content: flex-end;
  width: 100%;
  max-width: 500px;
}

.nav-item {
  color: rgba(51, 51, 51, 0.8);
  text-decoration: none;
  padding: 0.5rem 1rem;
  border-radius: 6px;
  transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  position: relative;
  overflow: hidden;
  border: none;
  background: none;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
}

.nav-item::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(100, 149, 237, 0.2), transparent);
  transition: left 0.3s ease;
}

.nav-item:hover::before,
.nav-item.active::before {
  left: 100%;
}

.nav-item:hover,
.nav-item.active {
  color: #333;
  background: rgba(100, 149, 237, 0.2);
  box-shadow: 0 4px 15px rgba(100, 149, 237, 0.4);
  transform: translateY(-2px);
}

.nav-item-indicator {
  position: absolute;
  bottom: -2px;
  left: 50%;
  transform: translateX(-50%) scaleX(0);
  width: 80%;
  height: 2px;
  background: linear-gradient(90deg, #6495ED, #87CEFA);
  border-radius: 1px;
  transition: transform 0.3s ease;
}

.nav-item:hover .nav-item-indicator,
.nav-item.active .nav-item-indicator {
  transform: translateX(-50%) scaleX(1);
}

.user-info {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 12px 4px 4px;
  border-radius: 20px;
  cursor: pointer;
  transition: all 0.3s;
  background: rgba(100, 149, 237, 0.1);
  border: 1px solid rgba(100, 149, 237, 0.2);
}

.user-info:hover {
  background: rgba(100, 149, 237, 0.2);
  box-shadow: 0 2px 12px rgba(100, 149, 237, 0.3);
}

.user-info .username {
  font-size: 14px;
  font-weight: 500;
  color: #333;
}

.dropdown-icon {
  font-size: 12px;
  color: #999;
  transition: transform 0.3s;
}

.user-info:hover .dropdown-icon {
  transform: rotate(180deg);
}

.avatar-placeholder {
  color: #fff;
  font-weight: bold;
}

.notification-btn { position: relative; }
.bell-icon { font-size: 20px; line-height: 1; }
.badge {
  position: absolute; top: 2px; right: 2px; background: #f44336; color: #fff;
  font-size: 10px; min-width: 16px; height: 16px; border-radius: 8px;
  display: flex; align-items: center; justify-content: center;
  padding: 0 4px; font-weight: 600; box-shadow: 0 2px 6px rgba(244,67,54,0.4);
}

@media (max-width: 768px) {
  .header { padding: 0 1rem; }
}

@media (max-width: 480px) {
  .header { padding: 0 0.8rem; }
  .logo-text { font-size: 1.2rem; }
}
</style>
