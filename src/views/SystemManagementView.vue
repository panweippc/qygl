<template>
  <div class="system-management-container">
    <!-- 顶部导航 -->
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

    <!-- 主内容区 -->
    <main class="main-content">
      <div class="content-wrapper">
        <!-- 页面标题 -->
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

        <!-- 标签页切�?-->
        <div class="tabs-section">
          <div class="tab-buttons">
            <button 
              class="tab-btn" 
              :class="{ active: activeTab === 'roles' }"
              @click="activeTab = 'roles'"
            >
              <span class="tab-icon">👥</span>
              角色管理
            </button>
            <button 
              class="tab-btn" 
              :class="{ active: activeTab === 'menus' }"
              @click="activeTab = 'menus'"
            >
              <span class="tab-icon">📋</span>
              菜单管理
            </button>
            <button 
              class="tab-btn" 
              :class="{ active: activeTab === 'permissions' }"
              @click="activeTab = 'permissions'"
            >
              <span class="tab-icon">🔐</span>
              权限分配
            </button>
          </div>
        </div>

        <!-- 角色管理 -->
        <div v-if="activeTab === 'roles'" class="management-section">
          <div class="section-header">
            <h3 class="subsection-title">角色列表</h3>
            <el-button type="primary" @click="openAddRoleDialog" class="add-btn">
              添加角色
            </el-button>
          </div>

          <div class="table-container">
            <el-table :data="roles" style="width: 100%" class="data-table" v-loading="loading">
              <el-table-column prop="id" label="ID" width="80" />
              <el-table-column prop="name" label="角色名称" width="150" />
              <el-table-column prop="code" label="角色编码" width="150" />
              <el-table-column prop="description" label="描述" show-overflow-tooltip />
              <el-table-column prop="status" label="状态" width="100">
                <template #default="{ row }">
                  <el-tag :type="row.status === '启用' ? 'success' : 'danger'">
                    {{ row.status }}
                  </el-tag>
                </template>
              </el-table-column>
              <el-table-column prop="createdAt" label="创建时间" width="180">
                <template #default="{ row }">
                  {{ new Date(row.createdAt).toLocaleString() }}
                </template>
              </el-table-column>
              <el-table-column label="操作" width="200" fixed="right">
                <template #default="{ row }">
                  <el-button size="small" @click="editRole(row)" class="edit-btn">
                    编辑
                  </el-button>
                  <el-button size="small" @click="assignPermissions(row)" class="perm-btn">
                    权限
                  </el-button>
                  <el-button size="small" type="danger" @click="deleteRole(row.id)" class="delete-btn">
                    删除
                  </el-button>
                </template>
              </el-table-column>
            </el-table>
          </div>
        </div>

        <!-- 菜单管理 -->
        <div v-if="activeTab === 'menus'" class="management-section">
          <div class="section-header">
            <h3 class="subsection-title">菜单列表</h3>
            <el-button type="primary" @click="openAddMenuDialog" class="add-btn">
              添加菜单
            </el-button>
          </div>

          <div class="table-container">
            <el-table 
              :data="flattenMenus" 
              style="width: 100%" 
              class="data-table" 
              v-loading="loading"
              row-key="id"
              :tree-props="{ children: 'children', hasChildren: 'hasChildren' }"
            >
              <el-table-column prop="name" label="菜单名称" width="180">
                <template #default="{ row }">
                  <span class="menu-name">
                    <span v-if="row.level > 0" class="indent" :style="{ paddingLeft: row.level * 20 + 'px' }">
                      └─
                    </span>
                    {{ row.name }}
                  </span>
                </template>
              </el-table-column>
              <el-table-column prop="path" label="路由路径" width="180" />
              <el-table-column prop="component" label="组件" show-overflow-tooltip />
              <el-table-column prop="icon" label="图标" width="100">
                <template #default="{ row }">
                  <div class="icon-cell">
                    <el-icon v-if="getIconComponent(row.icon, row.name)" :size="18" color="#6495ED">
                      <component :is="getIconComponent(row.icon, row.name)" />
                    </el-icon>
                    <span v-else class="no-icon">-</span>
                  </div>
                </template>
              </el-table-column>
              <el-table-column prop="sort" label="排序" width="80" />
              <el-table-column prop="status" label="状态" width="100">
                <template #default="{ row }">
                  <el-tag :type="row.status === '启用' ? 'success' : 'danger'">
                    {{ row.status }}
                  </el-tag>
                </template>
              </el-table-column>
              <el-table-column label="操作" width="200" fixed="right">
                <template #default="{ row }">
                  <el-button size="small" @click="editMenu(row)" class="edit-btn">
                    编辑
                  </el-button>
                  <el-button size="small" @click="addSubMenu(row)" class="add-sub-btn">
                    添加子菜单
                  </el-button>
                  <el-button size="small" type="danger" @click="deleteMenu(row.id)" class="delete-btn">
                    删除
                  </el-button>
                </template>
              </el-table-column>
            </el-table>
          </div>
        </div>

        <!-- 权限分配 -->
        <div v-if="activeTab === 'permissions'" class="management-section">
          <div class="section-header">
            <h3 class="subsection-title">权限分配</h3>
            <div class="role-selector">
              <span class="selector-label">选择角色</span>
              <el-select v-model="selectedRoleId" placeholder="请选择角色" @change="loadRolePermissions">
                <el-option 
                  v-for="role in roles" 
                  :key="role.id" 
                  :label="role.name" 
                  :value="role.id" 
                />
              </el-select>
            </div>
          </div>

          <div class="permission-container" v-loading="permissionLoading">
            <div class="permission-header">
              <h4 class="permission-title">菜单权限配置</h4>
              <div class="permission-actions">
                <el-button size="small" @click="expandAll">全部展开</el-button>
                <el-button size="small" @click="collapseAll">全部收起</el-button>
                <el-button size="small" @click="selectAll">全选</el-button>
                <el-button size="small" @click="clearAll">清空</el-button>
              </div>
            </div>

            <el-tree
              ref="permissionTree"
              :data="menuTree"
              show-checkbox
              node-key="id"
              :default-expand-all="false"
              :props="{ label: 'name', children: 'children' }"
              @check-change="handlePermissionChange"
              class="permission-tree"
            />

            <div class="permission-footer">
              <el-button type="primary" @click="savePermissions" :loading="saving">
                保存权限配置
              </el-button>
            </div>
          </div>
        </div>
      </div>
    </main>

    <!-- 页脚 -->
    <footer class="footer">
      <div class="footer-content">
        <p>© 2026 企业管理系统 | 系统管理模块 v1.0</p>
      </div>
    </footer>

    <!-- 添加/编辑角色对话�?-->
    <el-dialog
      v-model="roleDialogVisible"
      :title="isEditingRole ? '编辑角色' : '添加角色'"
      width="500px"
      class="dialog"
    >
      <el-form :model="roleForm" :rules="roleRules" ref="roleFormRef" label-position="top">
        <el-form-item label="角色名称" prop="name">
          <el-input v-model="roleForm.name" placeholder="请输入角色名称" />
        </el-form-item>
        <el-form-item label="角色编码" prop="code">
          <el-input v-model="roleForm.code" placeholder="请输入角色编码" :disabled="isEditingRole" />
        </el-form-item>
        <el-form-item label="描述">
          <el-input v-model="roleForm.description" type="textarea" placeholder="请输入角色描述" />
        </el-form-item>
        <el-form-item label="状态">
          <el-radio-group v-model="roleForm.status">
            <el-radio label="启用">启用</el-radio>
            <el-radio label="禁用">禁用</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="roleDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="saveRole" :loading="saving">确定</el-button>
        </span>
      </template>
    </el-dialog>

    <!-- 添加/编辑菜单对话�?-->
    <el-dialog
      v-model="menuDialogVisible"
      :title="isEditingMenu ? '编辑菜单' : '添加菜单'"
      width="500px"
      class="dialog"
    >
      <el-form :model="menuForm" :rules="menuRules" ref="menuFormRef" label-position="top">
        <el-form-item label="上级菜单">
          <el-select v-model="menuForm.parentId" placeholder="请选择上级菜单" clearable>
            <el-option label="无（顶级菜单）" :value="0" />
            <el-option 
              v-for="menu in parentMenuOptions" 
              :key="menu.id" 
              :label="menu.name" 
              :value="menu.id" 
            />
          </el-select>
        </el-form-item>
        <el-form-item label="菜单名称" prop="name">
          <el-input v-model="menuForm.name" placeholder="请输入菜单名称" />
        </el-form-item>
        <el-form-item label="路由路径" prop="path">
          <el-input v-model="menuForm.path" placeholder="请输入路由路径，如：/system" />
        </el-form-item>
        <el-form-item label="组件路径">
          <el-input v-model="menuForm.component" placeholder="请输入组件路径，如：SystemManagementView" />
        </el-form-item>
        <el-form-item label="图标">
          <el-input v-model="menuForm.icon" placeholder="请输入图标" />
        </el-form-item>
        <el-form-item label="排序">
          <el-input-number v-model="menuForm.sort" :min="0" :max="999" />
        </el-form-item>
        <el-form-item label="状态">
          <el-radio-group v-model="menuForm.status">
            <el-radio label="启用">启用</el-radio>
            <el-radio label="禁用">禁用</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="menuDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="saveMenu" :loading="saving">确定</el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import * as ElementPlusIconsVue from '@element-plus/icons-vue'
import {
  getRoles,
  getRoleById,
  addRole,
  updateRole,
  deleteRole as apiDeleteRole,
  getMenus,
  getMenuById,
  addMenu,
  updateMenu,
  deleteMenu as apiDeleteMenu,
  getRolePermissions,
  assignRolePermissions
} from '../services/api'

const router = useRouter()

// 标签页
const activeTab = ref('roles')

// 加载状态
const loading = ref(false)
const permissionLoading = ref(false)
const saving = ref(false)

// 角色数据
const roles = ref<any[]>([])
const menus = ref<any[]>([])
const menuTree = ref<any[]>([])

// 选中的角色（权限分配用）
const selectedRoleId = ref<number | null>(null)
const permissionTree = ref<any>(null)

// 角色对话框
const roleDialogVisible = ref(false)
const isEditingRole = ref(false)
const roleFormRef = ref()
const roleForm = ref({
  id: null as number | null,
  name: '',
  code: '',
  description: '',
  status: '启用'
})

const roleRules = {
    name: [{ required: true, message: '请输入角色名称', trigger: 'blur' }],
    code: [{ required: true, message: '请输入角色编码', trigger: 'blur' }]
  }

// 菜单对话框
const menuDialogVisible = ref(false)
const isEditingMenu = ref(false)
const menuFormRef = ref()
const menuForm = ref({
  id: null as number | null,
  parentId: 0,
  name: '',
  path: '',
  component: '',
  icon: '',
  sort: 0,
  status: '启用'
})

const menuRules = {
    name: [{ required: true, message: '请输入菜单名称', trigger: 'blur' }],
    path: [{ required: true, message: '请输入路由路径', trigger: 'blur' }]
  }

// 计算属性：扁平化的菜单列表（用于表格显示）
const flattenMenus = computed(() => {
  const flatten = (menus: any[], level = 0): any[] => {
    const result: any[] = []
    menus.forEach(menu => {
      result.push({ ...menu, level })
      if (menu.children && menu.children.length > 0) {
        result.push(...flatten(menu.children, level + 1))
      }
    })
    return result
  }
  return flatten(menuTree.value)
})

// 计算属性：可作为父菜单的选项（只显示顶级菜单）
const parentMenuOptions = computed(() => {
  return menus.value.filter(menu => menu.parentId === 0)
})

// 中文图标名称到 Element Plus 图标组件的映射
const iconMapping: Record<string, string> = {
  '系统': 'Setting',
  '设置': 'Setting',
  '角色': 'User',
  '菜单': 'Menu',
  '工具': 'Tools',
  '办公': 'OfficeBuilding',
  '报告': 'Document',
  '月报': 'Document',
  '项目': 'Folder',
    '对钩': 'Check',
    '销售': 'ShoppingCart',
    '文件': 'FolderOpened',
    '员工': 'UserFilled',
  '信息': 'ChatDotRound',
  '交流': 'ChatDotRound',
  '审批': 'CircleCheck',
  '工作流': 'Connection',
  '流程': 'Connection',
  '实例': 'CopyDocument',
  '任务': 'List',
  '表单': 'Memo'
}

// 菜单名称到图标的映射（用于处理特殊图标字符）
const menuNameToIcon: Record<string, string> = {
  '系统管理': 'Setting',
  '角色管理': 'User',
  '菜单管理': 'Menu',
  'OA审批中心': 'CircleCheck'
}

// 获取图标组件
const getIconComponent = (iconName: string, menuName?: string) => {
  // 如果提供了菜单名称，先尝试从菜单名称映射中查找
  if (menuName && menuNameToIcon[menuName]) {
    return ElementPlusIconsVue[menuNameToIcon[menuName] as keyof typeof ElementPlusIconsVue] || null
  }
  
  if (!iconName) return null
  
  // 首先尝试从图标映射表中查找
  for (const [key, value] of Object.entries(iconMapping)) {
    if (iconName.includes(key)) {
      return ElementPlusIconsVue[value as keyof typeof ElementPlusIconsVue] || null
    }
  }
  
  // 如果没有匹配，尝试将图标名称转换为组件名称
  // 例如：setting' -> 'Setting', 'user-filled' -> 'UserFilled'
  const componentName = iconName
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join('')
  
  // 从Element Plus 图标库中获取组件
  return ElementPlusIconsVue[componentName as keyof typeof ElementPlusIconsVue] || null
}

// 加载角色列表
const loadRoles = async () => {
  loading.value = true
  try {
    const response = await getRoles()
    if (response.success) {
      roles.value = response.data
    }
  } catch (error) {
    console.error('加载角色失败:', error)
    ElMessage.error('加载角色失败')
  } finally {
    loading.value = false
  }
}

// 加载菜单列表
const loadMenus = async () => {
  loading.value = true
  try {
    const response = await getMenus()
    if (response.success) {
      menuTree.value = response.data
      // 同时保存扁平化的菜单列表
      const flatten = (tree: any[]): any[] => {
        const result: any[] = []
        tree.forEach(node => {
          result.push(node)
          if (node.children && node.children.length > 0) {
            result.push(...flatten(node.children))
          }
        })
        return result
      }
      menus.value = flatten(response.data)
    }
  } catch (error) {
    console.error('加载菜单失败:', error)
    ElMessage.error('加载菜单失败')
  } finally {
    loading.value = false
  }
}

// 打开添加角色对话框
const openAddRoleDialog = () => {
  isEditingRole.value = false
  roleForm.value = {
    id: null,
    name: '',
    code: '',
    description: '',
    status: '启用'
  }
  roleDialogVisible.value = true
}

// 编辑角色
const editRole = (role: any) => {
  isEditingRole.value = true
  roleForm.value = { ...role }
  roleDialogVisible.value = true
}

// 保存角色
const saveRole = async () => {
  if (!roleFormRef.value) return

  await roleFormRef.value.validate(async (valid: boolean) => {
    if (!valid) return

    saving.value = true
    try {
      let response
      if (isEditingRole.value && roleForm.value.id) {
        response = await updateRole(roleForm.value.id, roleForm.value)
      } else {
        response = await addRole(roleForm.value)
      }

      if (response.success) {
        ElMessage.success(isEditingRole.value ? '角色更新成功' : '角色创建成功')
        roleDialogVisible.value = false
        await loadRoles()
      } else {
        ElMessage.error(response.message || '操作失败')
      }
    } catch (error) {
      console.error('保存角色失败:', error)
      ElMessage.error('保存角色失败')
    } finally {
      saving.value = false
    }
  })
}

// 删除角色
const deleteRole = async (id: number) => {
  try {
    await ElMessageBox.confirm('确定要删除该角色吗？', '警告', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })

    loading.value = true
    const response = await apiDeleteRole(id)
    if (response.success) {
      ElMessage.success('角色删除成功')
      await loadRoles()
    } else {
      ElMessage.error('删除角色失败')
    }
  } catch (error: any) {
    if (error !== 'cancel') {
      console.error('删除角色失败:', error)
      ElMessage.error('删除角色失败')
    }
  } finally {
    loading.value = false
  }
}

// 打开添加菜单对话框
const openAddMenuDialog = () => {
  isEditingMenu.value = false
  menuForm.value = {
    id: null,
    parentId: 0,
    name: '',
    path: '',
    component: '',
    icon: '',
    sort: 0,
    status: '启用'
  }
  menuDialogVisible.value = true
}

// 编辑菜单
const editMenu = (menu: any) => {
  isEditingMenu.value = true
  menuForm.value = { ...menu }
  menuDialogVisible.value = true
}

// 添加子菜单
const addSubMenu = (parentMenu: any) => {
  isEditingMenu.value = false
  menuForm.value = {
    id: null,
    parentId: parentMenu.id,
    name: '',
    path: '',
    component: '',
    icon: '',
    sort: 0,
    status: '启用'
  }
  menuDialogVisible.value = true
}

// 保存菜单
const saveMenu = async () => {
  if (!menuFormRef.value) return

  await menuFormRef.value.validate(async (valid: boolean) => {
    if (!valid) return

    saving.value = true
    try {
      let response
      if (isEditingMenu.value && menuForm.value.id) {
        response = await updateMenu(menuForm.value.id, menuForm.value)
      } else {
        response = await addMenu(menuForm.value)
      }

      if (response.success) {
        ElMessage.success(isEditingMenu.value ? '菜单更新成功' : '菜单创建成功')
        menuDialogVisible.value = false
        await loadMenus()
      } else {
        ElMessage.error(response.message || '操作失败')
      }
    } catch (error) {
      console.error('保存菜单失败:', error)
      ElMessage.error('保存菜单失败')
    } finally {
      saving.value = false
    }
  })
}

// 删除菜单
const deleteMenu = async (id: number) => {
  try {
    await ElMessageBox.confirm('确定要删除该菜单吗？子菜单也会被一并删除', '警告', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })

    loading.value = true
    const response = await apiDeleteMenu(id)
    if (response.success) {
      ElMessage.success('菜单删除成功')
      await loadMenus()
    } else {
      ElMessage.error('删除菜单失败')
    }
  } catch (error: any) {
    if (error !== 'cancel') {
      console.error('删除菜单失败:', error)
      ElMessage.error('删除菜单失败')
    }
  } finally {
    loading.value = false
  }
}

// 切换到权限分配标签并选择角色
const assignPermissions = (role: any) => {
  activeTab.value = 'permissions'
  selectedRoleId.value = role.id
  loadRolePermissions()
}

// 加载角色权限
const loadRolePermissions = async () => {
  if (!selectedRoleId.value) return

  permissionLoading.value = true
  try {
    console.log('加载角色权限，角色ID:', selectedRoleId.value)
    const response = await getRolePermissions(selectedRoleId.value)
    console.log('获取角色权限响应:', response)
    if (response.success) {
      console.log('角色权限数据:', response.data)
      // 等待一段时间，确保 permissionTree 引用已经获取到了 Tree 组件实例
      setTimeout(() => {
        if (permissionTree.value && typeof permissionTree.value.setCheckedKeys === 'function') {
          console.log('设置树形控件选中状态:', response.data || [])
          permissionTree.value.setCheckedKeys(response.data || [])
        } else {
          console.error('permissionTree 引用未获取到 Tree 组件实例')
          // 如果仍然获取不到，尝试使用 nextTick
          nextTick(() => {
            if (permissionTree.value && typeof permissionTree.value.setCheckedKeys === 'function') {
              console.log('使用 nextTick 设置树形控件选中状态:', response.data || [])
              permissionTree.value.setCheckedKeys(response.data || [])
            } else {
              console.error('仍然无法获取 permissionTree 引用')
            }
          })
        }
      }, 100)
    } else {
      console.error('获取角色权限失败:', response.message)
    }
  } catch (error) {
    console.error('加载角色权限失败:', error)
    ElMessage.error('加载角色权限失败')
  } finally {
    permissionLoading.value = false
  }
}

// 处理权限变更
const handlePermissionChange = () => {
  // 可以在这里添加实时保存逻辑
}

// 展开所有节点
const expandAll = () => {
  if (permissionTree.value && typeof permissionTree.value.expandAll === 'function') {
    permissionTree.value.expandAll()
  }
}

// 收起所有节点
const collapseAll = () => {
  if (permissionTree.value && typeof permissionTree.value.collapseAll === 'function') {
    permissionTree.value.collapseAll()
  }
}

// 全选
const selectAll = () => {
  const allIds = getAllMenuIds(menuTree.value)
  if (permissionTree.value && typeof permissionTree.value.setCheckedKeys === 'function') {
    permissionTree.value.setCheckedKeys(allIds)
  }
}

// 清空
const clearAll = () => {
  if (permissionTree.value && typeof permissionTree.value.setCheckedKeys === 'function') {
    permissionTree.value.setCheckedKeys([])
  }
}

// 获取所有菜单ID
const getAllMenuIds = (menus: any[]): number[] => {
  const ids: number[] = []
  menus.forEach(menu => {
    ids.push(menu.id)
    if (menu.children && menu.children.length > 0) {
      ids.push(...getAllMenuIds(menu.children))
    }
  })
  return ids
}

// 保存权限配置
const savePermissions = async () => {
  if (!selectedRoleId.value) {
    ElMessage.warning('请先选择角色')
    return
  }

  saving.value = true
  try {
    const checkedKeys = permissionTree.value?.getCheckedKeys() || []
    const halfCheckedKeys = permissionTree.value?.getHalfCheckedKeys() || []
    const allKeys = [...checkedKeys, ...halfCheckedKeys]

    const response = await assignRolePermissions(selectedRoleId.value, allKeys)
    if (response.success) {
      ElMessage.success('权限配置保存成功')
    } else {
      ElMessage.error('保存权限配置失败')
    }
  } catch (error) {
    console.error('保存权限配置失败:', error)
    ElMessage.error('保存权限配置失败')
  } finally {
    saving.value = false
  }
}

// 返回
const handleBack = () => {
  router.back()
}

// 组件挂载时加载数据
onMounted(() => {
  loadRoles()
  loadMenus()
})
</script>

<style scoped>
.system-management-container {
  width: 100%;
  height: 100vh;
  display: flex;
  flex-direction: column;
  position: relative;
  overflow: hidden;
  background: linear-gradient(135deg, #E4EDF2 0%, #F0F4F8 100%);
}

/* 顶部导航 */
.header {
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid rgba(100, 149, 237, 0.2);
  padding: 0 2rem;
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  position: relative;
  z-index: 100;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
}

.logo {
  position: relative;
  display: flex;
  align-items: center;
}

.logo-text {
  font-size: 1.5rem;
  font-weight: bold;
  color: #333;
  text-shadow: 0 0 10px rgba(100, 149, 237, 0.3);
}

.logo-glow {
  position: absolute;
  top: -50%;
  left: -20%;
  width: 140%;
  height: 200%;
  background: linear-gradient(45deg, transparent, rgba(100, 149, 237, 0.3), transparent);
  filter: blur(20px);
  animation: glow 3s ease-in-out infinite;
}

@keyframes glow {
  0%, 100% { opacity: 0.3; }
  50% { opacity: 0.6; }
}

.nav {
  display: flex;
  gap: 1rem;
  align-items: center;
  justify-content: flex-end;
  width: 100%;
  max-width: 400px;
}

.nav-item {
  color: rgba(51, 51, 51, 0.8);
  text-decoration: none;
  padding: 0.5rem 1rem;
  border-radius: 6px;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
  border: none;
  background: none;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
}

.nav-item:hover {
  color: #333;
  background: rgba(100, 149, 237, 0.2);
  box-shadow: 0 0 15px rgba(100, 149, 237, 0.3);
}

.logout-btn {
  background: rgba(244, 67, 54, 0.1);
  color: #d32f2f;
  border: 1px solid rgba(244, 67, 54, 0.3);
  border-radius: 6px;
  padding: 0.5rem 1rem;
  cursor: pointer;
  transition: all 0.3s ease;
}

.logout-btn:hover {
  background: rgba(244, 67, 54, 0.2);
  box-shadow: 0 0 15px rgba(244, 67, 54, 0.2);
}

/* 主内容区 */
.main-content {
  flex: 1;
  overflow-y: auto;
  padding: 2rem;
  position: relative;
  z-index: 1;
}

.content-wrapper {
  max-width: 1400px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

/* 页面标题 */
.page-header {
  text-align: center;
  margin-bottom: 1rem;
}

.section-title {
  font-size: 1.8rem;
  font-weight: 600;
  color: #333;
  margin-bottom: 0.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  text-shadow: 0 0 10px rgba(100, 149, 237, 0.3);
}

.title-icon {
  width: 40px;
  height: 40px;
  background: linear-gradient(45deg, #6495ED, #87CEEB);
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  box-shadow: 0 4px 15px rgba(100, 149, 237, 0.3);
}

.title-icon svg {
  width: 24px;
  height: 24px;
}

.page-subtitle {
  color: rgba(51, 51, 51, 0.6);
  font-size: 1rem;
  margin: 0;
}

/* 标签�?*/
.tabs-section {
  background: rgba(255, 255, 255, 0.9);
  border: 1px solid rgba(100, 149, 237, 0.2);
  border-radius: 12px;
  padding: 1rem;
  backdrop-filter: blur(5px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
}

.tab-buttons {
  display: flex;
  gap: 1rem;
  justify-content: center;
}

.tab-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  border: 1px solid rgba(100, 149, 237, 0.3);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.8);
  color: #333;
  cursor: pointer;
  transition: all 0.3s ease;
  font-size: 14px;
  font-weight: 500;
}

.tab-btn:hover {
  background: rgba(100, 149, 237, 0.1);
  border-color: rgba(100, 149, 237, 0.5);
}

.tab-btn.active {
  background: linear-gradient(45deg, #6495ED, #87CEEB);
  color: #fff;
  border-color: transparent;
  box-shadow: 0 4px 15px rgba(100, 149, 237, 0.4);
}

.tab-icon {
  font-size: 1.2rem;
}

/* 管理区域 */
.management-section {
  background: rgba(255, 255, 255, 0.9);
  border: 1px solid rgba(100, 149, 237, 0.2);
  border-radius: 16px;
  padding: 1.5rem;
  backdrop-filter: blur(5px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
}

.subsection-title {
  font-size: 1.2rem;
  font-weight: 600;
  color: #333;
  margin: 0;
}

.role-selector {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.selector-label {
  color: rgba(51, 51, 51, 0.7);
  font-size: 14px;
}

.add-btn {
  background: linear-gradient(45deg, #6495ED, #87CEEB) !important;
  border: none !important;
  border-radius: 8px !important;
  padding: 0.5rem 1.5rem !important;
  font-weight: 600 !important;
  box-shadow: 0 4px 15px rgba(100, 149, 237, 0.4) !important;
  transition: all 0.3s ease !important;
}

.add-btn:hover {
  transform: translateY(-2px) !important;
  box-shadow: 0 6px 20px rgba(100, 149, 237, 0.6) !important;
}

/* 表格样式 */
.table-container {
  overflow-x: auto;
}

.data-table {
  background: rgba(255, 255, 255, 0.9) !important;
  border-radius: 8px !important;
  overflow: hidden !important;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1) !important;
}

.data-table th {
  background: rgba(100, 149, 237, 0.2) !important;
  color: #333 !important;
  font-weight: 600 !important;
  border-bottom: 1px solid rgba(100, 149, 237, 0.3) !important;
}

.data-table td {
  color: rgba(51, 51, 51, 0.8) !important;
  border-bottom: 1px solid rgba(100, 149, 237, 0.2) !important;
}

.data-table tr:hover {
  background: rgba(100, 149, 237, 0.1) !important;
}

.menu-name {
  display: flex;
  align-items: center;
}

.icon-cell {
  display: flex;
  align-items: center;
  justify-content: center;
}

.no-icon {
  color: #999;
  font-size: 14px;
}

.indent {
  color: rgba(100, 149, 237, 0.5);
  margin-right: 4px;
}

.edit-btn {
  background: rgba(100, 149, 237, 0.2) !important;
  color: #6495ED !important;
  border: 1px solid rgba(100, 149, 237, 0.4) !important;
  border-radius: 6px !important;
  transition: all 0.3s ease !important;
}

.edit-btn:hover {
  background: rgba(100, 149, 237, 0.3) !important;
  box-shadow: 0 0 10px rgba(100, 149, 237, 0.4) !important;
}

.perm-btn {
  background: rgba(76, 175, 80, 0.2) !important;
  color: #4CAF50 !important;
  border: 1px solid rgba(76, 175, 80, 0.4) !important;
  border-radius: 6px !important;
  transition: all 0.3s ease !important;
}

.perm-btn:hover {
  background: rgba(76, 175, 80, 0.3) !important;
  box-shadow: 0 0 10px rgba(76, 175, 80, 0.4) !important;
}

.add-sub-btn {
  background: rgba(255, 152, 0, 0.2) !important;
  color: #FF9800 !important;
  border: 1px solid rgba(255, 152, 0, 0.4) !important;
  border-radius: 6px !important;
  transition: all 0.3s ease !important;
}

.add-sub-btn:hover {
  background: rgba(255, 152, 0, 0.3) !important;
  box-shadow: 0 0 10px rgba(255, 152, 0, 0.4) !important;
}

.delete-btn {
  background: rgba(244, 67, 54, 0.2) !important;
  color: #f44336 !important;
  border: 1px solid rgba(244, 67, 54, 0.4) !important;
  border-radius: 6px !important;
  transition: all 0.3s ease !important;
}

.delete-btn:hover {
  background: rgba(244, 67, 54, 0.3) !important;
  box-shadow: 0 0 10px rgba(244, 67, 54, 0.4) !important;
}

/* 权限配置区域 */
.permission-container {
  background: rgba(255, 255, 255, 0.8);
  border-radius: 8px;
  padding: 1.5rem;
  border: 1px solid rgba(100, 149, 237, 0.2);
}

.permission-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.permission-title {
  font-size: 1rem;
  font-weight: 600;
  color: #333;
  margin: 0;
}

.permission-actions {
  display: flex;
  gap: 0.5rem;
}

.permission-tree {
  background: transparent;
  margin-bottom: 1rem;
}

.permission-footer {
  display: flex;
  justify-content: center;
  padding-top: 1rem;
  border-top: 1px solid rgba(100, 149, 237, 0.2);
}

/* 对话框样�?*/
.dialog {
  background: rgba(255, 255, 255, 0.95) !important;
  border: 1px solid rgba(100, 149, 237, 0.4) !important;
  border-radius: 12px !important;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1) !important;
}

.dialog .el-dialog__title {
  color: #333 !important;
  font-weight: 600 !important;
  text-shadow: 0 0 10px rgba(100, 149, 237, 0.3) !important;
}

.dialog .el-form-item__label {
  color: rgba(51, 51, 51, 0.8) !important;
  font-weight: 500 !important;
}

.dialog .dialog-footer .el-button {
  background: rgba(255, 255, 255, 0.8) !important;
  color: #333 !important;
  border: 1px solid rgba(100, 149, 237, 0.3) !important;
  border-radius: 6px !important;
  transition: all 0.3s ease !important;
}

.dialog .dialog-footer .el-button:hover {
  background: rgba(255, 255, 255, 1) !important;
  box-shadow: 0 0 10px rgba(100, 149, 237, 0.2) !important;
}

.dialog .dialog-footer .el-button--primary {
  background: linear-gradient(45deg, #6495ED, #87CEEB) !important;
  border: none !important;
  box-shadow: 0 4px 10px rgba(100, 149, 237, 0.4) !important;
}

.dialog .dialog-footer .el-button--primary:hover {
  transform: translateY(-2px) !important;
  box-shadow: 0 6px 15px rgba(100, 149, 237, 0.6) !important;
}

/* 页脚 */
.footer {
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(10px);
  border-top: 1px solid rgba(100, 149, 237, 0.2);
  padding: 1rem 2rem;
  text-align: center;
  color: rgba(51, 51, 51, 0.6);
  position: relative;
  z-index: 100;
  box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.05);
}

.footer-content {
  display: flex;
  justify-content: center;
  align-items: center;
}

/* 滚动条样�?*/
.main-content::-webkit-scrollbar {
  width: 8px;
}

.main-content::-webkit-scrollbar-track {
  background: rgba(240, 248, 255, 0.6);
  border-radius: 4px;
}

.main-content::-webkit-scrollbar-thumb {
  background: rgba(100, 149, 237, 0.4);
  border-radius: 4px;
}

.main-content::-webkit-scrollbar-thumb:hover {
  background: rgba(100, 149, 237, 0.6);
}

/* 响应式设�?*/
@media (max-width: 768px) {
  .tab-buttons {
    flex-direction: column;
  }
  
  .section-header {
    flex-direction: column;
    gap: 1rem;
  }
  
  .permission-header {
    flex-direction: column;
    gap: 1rem;
  }
}
</style>
