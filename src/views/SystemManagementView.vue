<template>
  <div class="system-management-container">
    <header class="header">
      <div class="logo">
        <span class="logo-text">宏友智慧办公平台</span>
        <div class="logo-glow"></div>
      </div>
      <nav class="nav">
        <router-link to="/" class="nav-item">首页</router-link>
        <button class="nav-item logout-btn" @click="handleBack">返回</button>
      </nav>
    </header>

    <main class="main-content">
      <div class="content-wrapper">
        <div class="page-header">
          <h2 class="section-title">
            <span class="title-icon">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z"/>
              </svg>
            </span>
            系统管理
          </h2>
          <p class="page-subtitle">角色管理、菜单管理与权限配置中心</p>
        </div>

        <div class="tabs-section">
          <div class="tab-buttons">
            <button class="tab-btn" :class="{ active: activeTab === 'roles' }" @click="activeTab = 'roles'">
              <span class="tab-icon">👥</span>角色管理
            </button>
            <button class="tab-btn" :class="{ active: activeTab === 'users' }" @click="activeTab = 'users'">
              <span class="tab-icon">👤</span>用户管理
            </button>
            <button class="tab-btn" :class="{ active: activeTab === 'menus' }" @click="activeTab = 'menus'">
              <span class="tab-icon">📋</span>菜单管理
            </button>
            <button class="tab-btn" :class="{ active: activeTab === 'permissions' }" @click="activeTab = 'permissions'">
              <span class="tab-icon">🔐</span>权限管理
            </button>
          </div>

          <div class="tab-content">
            <RoleManagementTab v-show="activeTab === 'roles'" />
            <UserManagementTab v-show="activeTab === 'users'" />
            <MenuManagementTab v-show="activeTab === 'menus'" />
            <PermissionManagementTab v-show="activeTab === 'permissions'" />
          </div>
        </div>
      </div>
    </main>

    <footer class="footer">
      <div class="footer-content">
        <p>© 2026 企业管理系统 | 系统管理模块 v1.0</p>
      </div>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import RoleManagementTab from '../components/RoleManagementTab.vue'
import UserManagementTab from '../components/UserManagementTab.vue'
import MenuManagementTab from '../components/MenuManagementTab.vue'
import PermissionManagementTab from '../components/PermissionManagementTab.vue'

const router = useRouter()
const activeTab = ref('roles')

function handleBack() {
  router.push('/')
}
</script>

<style scoped>
.system-management-container { min-height: 100vh; background: linear-gradient(135deg, #f5f7fa 0%, #e4e9f0 100%); display: flex; flex-direction: column; }
.header { display: flex; align-items: center; justify-content: space-between; padding: 0 40px; height: 64px; background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); color: #fff; position: sticky; top: 0; z-index: 100; }
.logo { display: flex; align-items: center; gap: 10px; position: relative; }
.logo-text { font-size: 20px; font-weight: 700; background: linear-gradient(135deg, #667eea, #764ba2); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
.logo-glow { position: absolute; width: 40px; height: 40px; background: radial-gradient(circle, rgba(102,126,234,0.3), transparent); border-radius: 50%; top: -5px; left: -10px; animation: glow 3s ease-in-out infinite; }
@keyframes glow { 0%, 100% { opacity: 0.5; } 50% { opacity: 1; } }
.nav { display: flex; align-items: center; gap: 8px; }
.nav-item { color: rgba(255,255,255,0.8); text-decoration: none; padding: 8px 16px; border-radius: 8px; font-size: 14px; transition: all 0.3s; cursor: pointer; background: none; border: none; font-family: inherit; }
.nav-item:hover { background: rgba(255,255,255,0.1); color: #fff; }
.nav-item.active { background: rgba(102,126,234,0.3); color: #667eea; }
.logout-btn { background: rgba(255,77,79,0.15) !important; color: #ff4d4f !important; }
.main-content { flex: 1; padding: 24px 40px; max-width: 1400px; width: 100%; margin: 0 auto; box-sizing: border-box; }
.content-wrapper { animation: fadeIn 0.3s ease; }
@keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
.page-header { margin-bottom: 24px; }
.section-title { font-size: 24px; font-weight: 700; color: #1a1a2e; display: flex; align-items: center; gap: 12px; margin: 0 0 8px; }
.title-icon { width: 32px; height: 32px; color: #667eea; display: flex; align-items: center; }
.page-subtitle { font-size: 14px; color: #888; margin: 0; }
.tabs-section { background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.06); }
.tab-buttons { display: flex; border-bottom: 1px solid #e8ecf4; background: #fafbfc; }
.tab-btn { flex: 1; display: flex; align-items: center; justify-content: center; gap: 8px; padding: 16px; font-size: 14px; font-weight: 500; color: #666; cursor: pointer; border: none; background: none; border-bottom: 2px solid transparent; transition: all 0.3s; font-family: inherit; }
.tab-btn:hover { color: #667eea; background: rgba(102,126,234,0.05); }
.tab-btn.active { color: #667eea; border-bottom-color: #667eea; background: #fff; }
.tab-icon { font-size: 18px; }
.tab-content { padding: 24px; }
.footer { text-align: center; padding: 16px; color: #999; font-size: 12px; }
</style>
