<template>
  <aside class="sidebar">
    <div class="sidebar-content">
      <nav class="sidebar-nav">
        <router-link v-if="hasPermission('/tool-inventory')" to="/tool-inventory" class="sidebar-item">
          <div class="sidebar-icon">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M20 2H4C2.9 2 2 2.9 2 4V22L6 18H20C21.1 18 22 17.1 22 16V4C22 2.9 21.1 2 20 2ZM16 14H8V12H16V14ZM16 10H8V8H16V10Z"/>
            </svg>
          </div>
          <span>工具入库</span>
          <div class="sidebar-item-indicator"></div>
        </router-link>
        <router-link v-if="hasPermission('/oa-office')" to="/oa-office" class="sidebar-item">
          <div class="sidebar-icon">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 3H5C3.9 3 3 3.9 3 5V19C3 20.1 3.9 21 5 21H19C20.1 21 21 20.1 21 19V5C21 3.9 20.1 3 19 3ZM11 17H7V10H11V17ZM17 17H13V7H17V17Z"/>
            </svg>
          </div>
          <span>OA办公</span>
          <div class="sidebar-item-indicator"></div>
        </router-link>
        <router-link v-if="hasPermission('/monthly-report')" to="/monthly-report" class="sidebar-item">
          <div class="sidebar-icon">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 3H5C3.9 3 3 3.9 3 5V19C3 20.1 3.9 21 5 21H19C20.1 21 21 20.1 21 19V5C21 3.9 20.1 3 19 3ZM19 19H5V5H19V19ZM16 11H13V8H11V11H8V13H11V16H13V13H16V11Z"/>
            </svg>
          </div>
          <span>月报</span>
          <div class="sidebar-item-indicator"></div>
        </router-link>
        <router-link v-if="hasPermission('/employee-management')" to="/employee-management" class="sidebar-item">
          <div class="sidebar-icon">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M16 11C17.66 11 19 9.66 19 8C19 6.34 17.66 5 16 5C14.34 5 13 6.34 13 8C13 9.66 14.34 11 16 11ZM8 11C9.66 11 11 9.66 11 8C11 6.34 9.66 5 8 5C6.34 5 5 6.34 5 8C5 9.66 6.34 11 8 11ZM8 13C5.67 13 1 14.17 1 16.5V19H15V16.5C15 14.17 10.33 13 8 13ZM16 13C13.67 13 9 14.17 9 16.5V19H23V16.5C23 14.17 18.33 13 16 13Z"/>
            </svg>
          </div>
          <span>员工管理</span>
          <div class="sidebar-item-indicator"></div>
        </router-link>
        <router-link v-if="hasPermission('/file-storage')" to="/file-storage" class="sidebar-item">
          <div class="sidebar-icon">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M13 9H11V7H13V9ZM13 13H11V11H13V13ZM13 17H11V15H13V17ZM21 3H3C1.9 3 1 3.9 1 5V19C1 20.1 1.9 21 3 21H21C22.1 21 23 20.1 23 19V5C23 3.9 22.1 3 21 3ZM21 19H3V5H21V19Z"/>
            </svg>
          </div>
          <span>文件存储</span>
          <div class="sidebar-item-indicator"></div>
        </router-link>
        <router-link v-if="hasPermission('/project-category')" to="/project-category" class="sidebar-item">
          <div class="sidebar-icon">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 3H5C3.9 3 3 3.9 3 5V19C3 20.1 3.9 21 5 21H19C20.1 21 21 20.1 21 19V5C21 3.9 20.1 3 19 3ZM9 17H7V10H9V17ZM13 17H11V7H13V17ZM17 17H15V13H17V17Z"/>
            </svg>
          </div>
          <span>项目分类</span>
          <div class="sidebar-item-indicator"></div>
        </router-link>
        <router-link v-if="hasPermission('/closing-project')" to="/closing-project" class="sidebar-item">
          <div class="sidebar-icon">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 3H5C3.9 3 3 3.9 3 5V19C3 20.1 3.9 21 5 21H19C20.1 21 21 20.1 21 19V5C21 3.9 20.1 3 19 3ZM9 17H7V10H9V17ZM13 17H11V7H13V17ZM17 17H15V13H17V17Z"/>
            </svg>
          </div>
          <span>成交项目</span>
          <div class="sidebar-item-indicator"></div>
        </router-link>
        <router-link v-if="hasPermission('/sales-funnel')" to="/sales-funnel" class="sidebar-item">
          <div class="sidebar-icon">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 3H5C3.9 3 3 3.9 3 5V19C3 20.1 3.9 21 5 21H19C20.1 21 21 20.1 21 19V5C21 3.9 20.1 3 19 3ZM9 17H7V10H9V17ZM13 17H11V7H13V17ZM17 17H15V13H17V17Z"/>
            </svg>
          </div>
          <span>销售漏斗</span>
          <div class="sidebar-item-indicator"></div>
        </router-link>
        <router-link to="/message-center" class="sidebar-item notification-item">
          <div class="sidebar-icon">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 22C6.477 22 2 17.523 2 12S6.477 2 12 2s10 4.477 10 10-4.477 10-10 10zm-1-11v6h2v-6h-2zm0-4v2h2V7h-2z"/>
            </svg>
            <span v-if="unreadCount > 0" class="sidebar-badge">{{ unreadCount > 99 ? '99+' : unreadCount }}</span>
          </div>
          <span>消息中心</span>
          <div class="sidebar-item-indicator"></div>
        </router-link>
        <router-link to="/operation-log" class="sidebar-item">
          <div class="sidebar-icon">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M13 3c-4.97 0-9 4.03-9 9H1l3.89 3.89.07.14L9 12H6c0-3.87 3.13-7 7-7s7 3.13 7 7-3.13 7-7 7c-1.93 0-3.68-.79-4.94-2.06l-1.42 1.42C8.27 19.99 10.51 21 13 21c4.97 0 9-4.03 9-9s-4.03-9-9-9zm-1 5v5l4.28 2.54.72-1.21-3.5-2.08V8H12z"/>
            </svg>
          </div>
          <span>操作日志</span>
          <div class="sidebar-item-indicator"></div>
        </router-link>
        <router-link v-if="hasPermission('/system')" to="/system" class="sidebar-item">
          <div class="sidebar-icon">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z"/>
            </svg>
          </div>
          <span>系统管理</span>
          <div class="sidebar-item-indicator"></div>
        </router-link>
      </nav>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'

const permissions = ref<any[]>([])
const unreadCount = ref(0)

const fetchUnreadCount = async () => {
  const username = localStorage.getItem('username')
  if (!username) return
  try {
    const res = await fetch(`/api/notifications/unread-count?userId=${username}`)
    const json = await res.json()
    if (json.success) unreadCount.value = json.data.count
  } catch { /* ignore */ }
}

const isAdmin = computed(() => {
  const role = localStorage.getItem('role')
  const username = localStorage.getItem('username')
  return role === 'admin' || username === '总经理' || username === '管理员'
})

const hasPermission = (menuPath: string) => {
  if (isAdmin.value) return true
  return permissions.value.some(p => p.path === menuPath)
}

const loadUserPermissions = () => {
  try {
    const storedPermissions = localStorage.getItem('permissions')
    if (storedPermissions) {
      permissions.value = JSON.parse(storedPermissions)
    }
  } catch (error) {
    console.error('加载权限失败:', error)
  }
}

loadUserPermissions()

const fetchLatestPermissions = async () => {
  try {
    const username = localStorage.getItem('username')
    if (username) {
      const response = await fetch('/api/user/permissions?username=' + encodeURIComponent(username)).then(r => r.json())
      if (response.success) {
        permissions.value = response.data
        localStorage.setItem('permissions', JSON.stringify(response.data))
      }
    }
  } catch (error) {
    console.error('获取最新权限数据失败:', error)
  }
}

onMounted(() => {
  fetchLatestPermissions()
  fetchUnreadCount()
  setInterval(fetchUnreadCount, 30000)
})
</script>

<style scoped>
.sidebar {
  width: 187px;
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(10px);
  border-right: 1px solid rgba(100, 149, 237, 0.3);
  padding: 1.5rem 1rem;
  overflow-y: auto;
  position: relative;
  z-index: 10;
  box-shadow: 2px 0 10px rgba(0, 0, 0, 0.1);
  animation: sidebarSlideIn 0.5s ease-out 0.3s both;
}

@keyframes sidebarSlideIn {
  from { opacity: 0; transform: translateX(-20px); }
  to { opacity: 1; transform: translateX(0); }
}

.sidebar-content {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.sidebar-nav {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  flex: 1;
}

.sidebar-item {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  border-radius: 8px;
  color: rgba(51, 51, 51, 0.8);
  text-decoration: none;
  transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  position: relative;
  overflow: hidden;
  animation: sidebarItemFadeIn 0.4s ease-out;
}

@keyframes sidebarItemFadeIn {
  from { opacity: 0; transform: translateX(-10px); }
  to { opacity: 1; transform: translateX(0); }
}

.sidebar-item:nth-child(1) { animation-delay: 0.4s; }
.sidebar-item:nth-child(2) { animation-delay: 0.45s; }
.sidebar-item:nth-child(3) { animation-delay: 0.5s; }
.sidebar-item:nth-child(4) { animation-delay: 0.55s; }
.sidebar-item:nth-child(5) { animation-delay: 0.6s; }
.sidebar-item:nth-child(6) { animation-delay: 0.65s; }
.sidebar-item:nth-child(7) { animation-delay: 0.7s; }
.sidebar-item:nth-child(8) { animation-delay: 0.75s; }
.sidebar-item:nth-child(9) { animation-delay: 0.8s; }
.sidebar-item:nth-child(10) { animation-delay: 0.85s; }

.sidebar-item::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(100, 149, 237, 0.2), transparent);
  transition: left 0.3s ease;
}

.sidebar-item:hover::before,
.sidebar-item.active::before {
  left: 100%;
}

.sidebar-item:hover,
.sidebar-item.active {
  color: #333;
  background: rgba(100, 149, 237, 0.2);
  box-shadow: 0 6px 20px rgba(100, 149, 237, 0.4);
  transform: translateX(8px);
}

.sidebar-item-indicator {
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%) scaleY(0);
  width: 3px;
  height: 60%;
  background: linear-gradient(180deg, #6495ED, #87CEFA);
  border-radius: 0 2px 2px 0;
  transition: transform 0.3s ease;
}

.sidebar-item:hover .sidebar-item-indicator,
.sidebar-item.active .sidebar-item-indicator {
  transform: translateY(-50%) scaleY(1);
}

.sidebar-icon {
  width: 32px;
  height: 32px;
  background: linear-gradient(45deg, #6495ED, #87CEFA);
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  flex-shrink: 0;
  box-shadow: 0 4px 10px rgba(100, 149, 237, 0.4);
  transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  position: relative;
  overflow: hidden;
}

.sidebar-icon::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.4), transparent);
  transition: left 0.3s ease;
}

.sidebar-item:hover .sidebar-icon::before,
.sidebar-item.active .sidebar-icon::before {
  left: 100%;
}

.sidebar-item:hover .sidebar-icon,
.sidebar-item.active .sidebar-icon {
  transform: scale(1.15) rotate(5deg);
  box-shadow: 0 8px 20px rgba(100, 149, 237, 0.6);
}

.sidebar-icon svg {
  width: 22px;
  height: 22px;
}

.sidebar-icon { position: relative; }

.sidebar-badge {
  position: absolute;
  top: -6px;
  right: -8px;
  background: #f44336;
  color: #fff;
  font-size: 10px;
  min-width: 16px;
  height: 16px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 4px;
  font-weight: 600;
  box-shadow: 0 2px 6px rgba(244,67,54,0.4);
  line-height: 1;
}

.sidebar-item:hover .sidebar-icon svg,
.sidebar-item.active .sidebar-icon svg {
  transform: scale(1.1);
}

.sidebar::-webkit-scrollbar {
  width: 8px;
}

.sidebar::-webkit-scrollbar-track {
  background: rgba(15, 23, 42, 0.6);
  border-radius: 4px;
}

.sidebar::-webkit-scrollbar-thumb {
  background: rgba(59, 130, 246, 0.5);
  border-radius: 4px;
}

.sidebar::-webkit-scrollbar-thumb:hover {
  background: rgba(59, 130, 246, 0.7);
}

@media (max-width: 768px) {
  .sidebar { width: 160px; padding: 1rem 0.8rem; }
}

@media (max-width: 480px) {
  .sidebar { width: 140px; padding: 0.8rem 0.6rem; }
  .sidebar-item { padding: 0.8rem; gap: 0.8rem; }
}
</style>
