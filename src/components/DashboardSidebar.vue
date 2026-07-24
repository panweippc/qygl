<template>
  <aside class="sidebar">
    <div class="sidebar-content">
      <nav class="sidebar-nav">

        <!-- 办公管理 -->
        <div v-if="groupVisible.office" class="menu-group">
          <div class="group-header" @click="toggleGroup('office')">
            <svg class="group-arrow" :class="{ expanded: expandedGroups.office }" viewBox="0 0 24 24" fill="currentColor">
              <path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6z"/>
            </svg>
            <svg class="group-icon" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20 6h-8l-2-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm-6 10H6v-2h8v2zm4-4H6v-2h12v2z"/>
            </svg>
            <span class="group-title">办公管理</span>
          </div>
          <div v-show="expandedGroups.office" class="group-items">
            <router-link v-if="hasPermission('/oa-office')" to="/oa-office" class="sidebar-item">
              <div class="sidebar-icon sidebar-icon-sm">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19 3H5C3.9 3 3 3.9 3 5V19C3 20.1 3.9 21 5 21H19C20.1 21 21 20.1 21 19V5C21 3.9 20.1 3 19 3ZM11 17H7V10H11V17ZM17 17H13V7H17V17Z"/>
                </svg>
              </div>
              <span>OA办公</span>
              <div class="sidebar-item-indicator"></div>
            </router-link>
            <router-link v-if="hasPermission('/monthly-report')" to="/monthly-report" class="sidebar-item">
              <div class="sidebar-icon sidebar-icon-sm">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19 3H5C3.9 3 3 3.9 3 5V19C3 20.1 3.9 21 5 21H19C20.1 21 21 20.1 21 19V5C21 3.9 20.1 3 19 3ZM19 19H5V5H19V19ZM16 11H13V8H11V11H8V13H11V16H13V13H16V11Z"/>
                </svg>
              </div>
              <span>月报</span>
              <div class="sidebar-item-indicator"></div>
            </router-link>
            <router-link v-if="hasPermission('/tool-inventory')" to="/tool-inventory" class="sidebar-item">
              <div class="sidebar-icon sidebar-icon-sm">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20 2H4C2.9 2 2 2.9 2 4V22L6 18H20C21.1 18 22 17.1 22 16V4C22 2.9 21.1 2 20 2ZM16 14H8V12H16V14ZM16 10H8V8H16V10Z"/>
                </svg>
              </div>
              <span>工具入库</span>
              <div class="sidebar-item-indicator"></div>
            </router-link>
            <router-link v-if="hasPermission('/file-storage')" to="/file-storage" class="sidebar-item">
              <div class="sidebar-icon sidebar-icon-sm">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M13 9H11V7H13V9ZM13 13H11V11H13V13ZM13 17H11V15H13V17ZM21 3H3C1.9 3 1 3.9 1 5V19C1 20.1 1.9 21 3 21H21C22.1 21 23 20.1 23 19V5C23 3.9 22.1 3 21 3ZM21 19H3V5H21V19Z"/>
                </svg>
              </div>
              <span>文件存储</span>
              <div class="sidebar-item-indicator"></div>
            </router-link>
            <router-link v-if="hasPermission('/knowledge-base')" to="/knowledge-base" class="sidebar-item">
              <div class="sidebar-icon sidebar-icon-sm">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6zm16-4H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H8V4h12v12zM10 9h8v2h-8V9zm0 3h4v2h-4v-2zm0-6h8v2h-8V6z"/>
                </svg>
              </div>
              <span>知识库</span>
              <div class="sidebar-item-indicator"></div>
            </router-link>
            <router-link to="/message-center" class="sidebar-item">
              <div class="sidebar-icon sidebar-icon-sm">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 22C6.477 22 2 17.523 2 12S6.477 2 12 2s10 4.477 10 10-4.477 10-10 10zm-1-11v6h2v-6h-2zm0-4v2h2V7h-2z"/>
                </svg>
              </div>
              <span>消息中心</span>
              <div class="sidebar-item-indicator"></div>
            </router-link>
          </div>
        </div>

        <!-- 业务管理 -->
        <div v-if="groupVisible.business" class="menu-group">
          <div class="group-header" @click="toggleGroup('business')">
            <svg class="group-arrow" :class="{ expanded: expandedGroups.business }" viewBox="0 0 24 24" fill="currentColor">
              <path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6z"/>
            </svg>
            <svg class="group-icon" viewBox="0 0 24 24" fill="currentColor">
              <path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z"/>
            </svg>
            <span class="group-title">业务管理</span>
          </div>
          <div v-show="expandedGroups.business" class="group-items">
            <router-link v-if="hasPermission('/project-category')" to="/project-category" class="sidebar-item">
              <div class="sidebar-icon sidebar-icon-sm">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19 3H5C3.9 3 3 3.9 3 5V19C3 20.1 3.9 21 5 21H19C20.1 21 21 20.1 21 19V5C21 3.9 20.1 3 19 3ZM9 17H7V10H9V17ZM13 17H11V7H13V17ZM17 17H15V13H17V17Z"/>
                </svg>
              </div>
              <span>产品分类</span>
              <div class="sidebar-item-indicator"></div>
            </router-link>
            <router-link v-if="hasPermission('/sales-funnel')" to="/sales-funnel" class="sidebar-item">
              <div class="sidebar-icon sidebar-icon-sm">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M3 3h18v2H3V3zm4 4h14v2H7V7zm4 4h10v2H11v-2zm4 4h6v2h-6v-2zm-4 4h4v2h-4v-2z"/>
                </svg>
              </div>
              <span>销售漏斗</span>
              <div class="sidebar-item-indicator"></div>
            </router-link>
            <router-link v-if="hasPermission('/sales-target')" to="/sales-target" class="sidebar-item">
              <div class="sidebar-icon sidebar-icon-sm">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm0-14c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6-2.69-6-6-6zm0 10c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4z"/>
                </svg>
              </div>
              <span>销售目标</span>
              <div class="sidebar-item-indicator"></div>
            </router-link>
            <router-link v-if="hasPermission('/customer-management')" to="/customer-management" class="sidebar-item">
              <div class="sidebar-icon sidebar-icon-sm">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/>
                </svg>
              </div>
              <span>客户管理</span>
              <div class="sidebar-item-indicator"></div>
            </router-link>
            <router-link v-if="hasPermission('/sales-opportunity')" to="/sales-opportunity" class="sidebar-item">
              <div class="sidebar-icon sidebar-icon-sm">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                </svg>
              </div>
              <span>机会跟进</span>
              <div class="sidebar-item-indicator"></div>
            </router-link>
            <router-link v-if="hasPermission('/closing-project')" to="/closing-project" class="sidebar-item">
              <div class="sidebar-icon sidebar-icon-sm">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                </svg>
              </div>
              <span>成交项目</span>
              <div class="sidebar-item-indicator"></div>
            </router-link>
          </div>
        </div>

        <!-- 系统设置 -->
        <div v-if="groupVisible.system" class="menu-group">
          <div class="group-header" @click="toggleGroup('system')">
            <svg class="group-arrow" :class="{ expanded: expandedGroups.system }" viewBox="0 0 24 24" fill="currentColor">
              <path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6z"/>
            </svg>
            <svg class="group-icon" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58a.49.49 0 00.12-.61l-1.92-3.32a.488.488 0 00-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54a.484.484 0 00-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.07.62-.07.94s.02.64.07.94l-2.03 1.58a.49.49 0 00-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/>
            </svg>
            <span class="group-title">系统设置</span>
          </div>
          <div v-show="expandedGroups.system" class="group-items">
            <router-link v-if="hasPermission('/employee-management')" to="/employee-management" class="sidebar-item">
              <div class="sidebar-icon sidebar-icon-sm">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M16 11C17.66 11 19 9.66 19 8C19 6.34 17.66 5 16 5C14.34 5 13 6.34 13 8C13 9.66 14.34 11 16 11ZM8 11C9.66 11 11 9.66 11 8C11 6.34 9.66 5 8 5C6.34 5 5 6.34 5 8C5 9.66 6.34 11 8 11ZM8 13C5.67 13 1 14.17 1 16.5V19H15V16.5C15 14.17 10.33 13 8 13ZM16 13C13.67 13 9 14.17 9 16.5V19H23V16.5C23 14.17 18.33 13 16 13Z"/>
                </svg>
              </div>
              <span>员工管理</span>
              <div class="sidebar-item-indicator"></div>
            </router-link>
            <router-link to="/operation-log" class="sidebar-item">
              <div class="sidebar-icon sidebar-icon-sm">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M13 3c-4.97 0-9 4.03-9 9H1l3.89 3.89.07.14L9 12H6c0-3.87 3.13-7 7-7s7 3.13 7 7-3.13 7-7 7c-1.93 0-3.68-.79-4.94-2.06l-1.42 1.42C8.27 19.99 10.51 21 13 21c4.97 0 9-4.03 9-9s-4.03-9-9-9zm-1 5v5l4.28 2.54.72-1.21-3.5-2.08V8H12z"/>
                </svg>
              </div>
              <span>操作日志</span>
              <div class="sidebar-item-indicator"></div>
            </router-link>
            <router-link v-if="hasPermission('/system')" to="/system" class="sidebar-item">
              <div class="sidebar-icon sidebar-icon-sm">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z"/>
                </svg>
              </div>
              <span>系统管理</span>
              <div class="sidebar-item-indicator"></div>
            </router-link>
          </div>
        </div>

      </nav>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { ref, computed, reactive, onMounted } from 'vue'

const permissions = ref<any[]>([])
const unreadCount = ref(0)

const expandedGroups = reactive({
  office: true,
  business: true,
  system: true
})

const toggleGroup = (key: string) => {
  expandedGroups[key as keyof typeof expandedGroups] = !expandedGroups[key as keyof typeof expandedGroups]
}

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
  const adminRoles = ['admin', 'gm', 'ceo', 'general_manager', '系统管理员']
  return adminRoles.includes(role?.toLowerCase() || '') || username === '总经理' || username === '管理员'
})

const hasPermission = (menuPath: string) => {
  if (isAdmin.value) return true
  return permissions.value.some(p => p.path === menuPath)
}

const groupVisible = computed(() => {
  if (isAdmin.value) return { office: true, business: true, system: true }
  const hasPerm = (path: string) => permissions.value.some(r => r.path === path)
  const officePerm = ['/oa-office', '/monthly-report', '/tool-inventory', '/file-storage', '/knowledge-base']
  const businessPerm = ['/project-category', '/closing-project', '/sales-funnel', '/sales-target', '/customer-management', '/sales-opportunity']
  const systemPerm = ['/employee-management', '/system']
  return {
    office: true, // 含消息中心(始终可见)
    business: businessPerm.some(hasPerm),
    system: true  // 含操作日志(始终可见)
  }
})

const defaultPermissions = [
  { path: '/tool-inventory' }, { path: '/oa-office' },
  { path: '/monthly-report' }, { path: '/employee-management' },
  { path: '/file-storage' }, { path: '/project-category' },
  { path: '/closing-project' }, { path: '/sales-funnel' },
  { path: '/sales-target' }, { path: '/customer-management' },
  { path: '/sales-opportunity' }, { path: '/knowledge-base' },
  { path: '/system' }
]

const loadUserPermissions = () => {
  try {
    const storedPermissions = localStorage.getItem('permissions')
    if (storedPermissions) {
      permissions.value = JSON.parse(storedPermissions)
      if (permissions.value.length > 0) return
    }
  } catch (error) {
    console.error('加载权限失败:', error)
  }
  permissions.value = [...defaultPermissions]
}

loadUserPermissions()

const fetchLatestPermissions = async () => {
  try {
    const username = localStorage.getItem('username')
    if (username) {
      const response = await fetch('/api/user/permissions?username=' + encodeURIComponent(username)).then(r => r.json())
      if (response.success && response.data && response.data.length > 0) {
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
  gap: 0.25rem;
  flex: 1;
}

/* 分组容器 */
.menu-group {
  margin-bottom: 0.25rem;
}

/* 分组头部 */
.group-header {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.85rem 0.8rem;
  cursor: pointer;
  border-radius: 8px;
  transition: background 0.2s;
  user-select: none;
  border-bottom: 1px solid rgba(100, 149, 237, 0.12);
  margin-bottom: 0.15rem;
}

.group-header:hover {
  background: rgba(100, 149, 237, 0.08);
}

.group-arrow {
  width: 18px;
  height: 18px;
  color: #aaa;
  transition: transform 0.25s ease;
  flex-shrink: 0;
}

.group-arrow.expanded {
  transform: rotate(90deg);
}

.group-icon {
  width: 22px;
  height: 22px;
  color: #5b7fff;
  flex-shrink: 0;
}

.group-title {
  font-size: 14px;
  font-weight: 700;
  color: #555;
  letter-spacing: 0.5px;
}

/* 分组内菜单 */
.group-items {
  overflow: hidden;
  transition: height 0.3s ease;
}

.sidebar-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.65rem 0.8rem 0.65rem 1.8rem;
  border-radius: 6px;
  color: rgba(51, 51, 51, 0.8);
  text-decoration: none;
  transition: all 0.25s ease;
  position: relative;
  overflow: hidden;
  font-size: 13px;
}

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

.sidebar-icon-sm {
  width: 26px;
  height: 26px;
  box-shadow: 0 2px 6px rgba(100, 149, 237, 0.3);
}

.sidebar-icon-sm svg {
  width: 16px;
  height: 16px;
}

.sidebar-icon-sm::before {
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
.sidebar-item.active .sidebar-icon::before,
.sidebar-item:hover .sidebar-icon-sm::before,
.sidebar-item.active .sidebar-icon-sm::before {
  left: 100%;
}

.sidebar-item:hover .sidebar-icon,
.sidebar-item.active .sidebar-icon {
  transform: scale(1.15) rotate(5deg);
  box-shadow: 0 8px 20px rgba(100, 149, 237, 0.6);
}

.sidebar-item:hover .sidebar-icon-sm,
.sidebar-item.active .sidebar-icon-sm {
  transform: scale(1.1);
}

.sidebar-icon svg {
  width: 22px;
  height: 22px;
}

.sidebar-icon,
.sidebar-icon-sm { position: relative; }

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
