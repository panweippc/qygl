<template>
  <div class="management-section">
    <div class="section-header">
      <h3 class="subsection-title">权限分配</h3>
      <div class="role-selector">
        <span class="selector-label">选择角色</span>
        <el-select v-model="selectedRoleId" placeholder="请选择角色" @change="loadRolePermissions">
          <el-option v-for="role in roles" :key="role.id" :label="role.name" :value="role.id" />
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
      <el-tree ref="permissionTree" :data="menuTree" show-checkbox node-key="id" :default-expand-all="false" :props="{ label: 'name', children: 'children' }" @check-change="handlePermissionChange" class="permission-tree" />
      <div class="permission-footer">
        <el-button type="primary" @click="savePermissions" :loading="saving">保存权限配置</el-button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, nextTick } from 'vue'
import { ElMessage } from 'element-plus'

const roles = ref<any[]>([])
const menus = ref<any[]>([])
const menuTree = ref<any[]>([])
const selectedRoleId = ref<number | null>(null)
const permissionTree = ref<any>(null)
const permissionLoading = ref(false)
const saving = ref(false)

async function fetchRoles() {
  try {
    const res = await fetch('/api/roles')
    const json = await res.json()
    if (json.success) roles.value = json.data
  } catch (e: any) {
    ElMessage.error('获取角色列表失败')
  }
}

async function fetchMenus() {
  try {
    const res = await fetch('/api/menus')
    const json = await res.json()
    if (json.success) {
      menus.value = json.data
      menuTree.value = json.data
    }
  } catch (e: any) {
    ElMessage.error('获取菜单失败')
  }
}

async function loadRolePermissions() {
  if (!selectedRoleId.value) return
  permissionLoading.value = true
  try {
    const res = await fetch(`/api/roles/${selectedRoleId.value}/permissions`)
    const json = await res.json()
    if (json.success) {
      await nextTick()
      permissionTree.value?.setCheckedKeys(json.data)
    }
  } catch (e: any) {
    ElMessage.error('获取权限失败')
  } finally {
    permissionLoading.value = false
  }
}

function expandAll() { permissionTree.value?.expandAll() }
function collapseAll() { permissionTree.value?.collapseAll() }
function selectAll() {
  const allIds: number[] = []
  const collect = (nodes: any[]) => { nodes.forEach(n => { allIds.push(n.id); if (n.children) collect(n.children) }) }
  collect(menuTree.value)
  permissionTree.value?.setCheckedKeys(allIds)
}
function clearAll() { permissionTree.value?.setCheckedKeys([]) }
function handlePermissionChange() {}

async function savePermissions() {
  if (!selectedRoleId.value) { ElMessage.warning('请先选择角色'); return }
  saving.value = true
  try {
    const checkedKeys = permissionTree.value?.getCheckedKeys() || []
    const halfCheckedKeys = permissionTree.value?.getHalfCheckedKeys() || []
    const allKeys = [...new Set([...checkedKeys, ...halfCheckedKeys])]
    await fetch(`/api/roles/${selectedRoleId.value}/permissions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ menuIds: allKeys })
    })
    ElMessage.success('权限配置保存成功')
  } catch (e: any) {
    ElMessage.error('保存失败')
  } finally {
    saving.value = false
  }
}

onMounted(() => { fetchRoles(); fetchMenus() })
</script>

<style scoped>
.management-section { background: #fff; border-radius: 12px; padding: 24px; box-shadow: 0 1px 3px rgba(0,0,0,0.06); }
.section-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
.subsection-title { font-size: 16px; font-weight: 600; color: #1a1a2e; margin: 0; }
.role-selector { display: flex; align-items: center; gap: 12px; }
.selector-label { font-size: 14px; color: #666; }
.permission-container { border: 1px solid #e8ecf4; border-radius: 8px; padding: 20px; }
.permission-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.permission-title { font-size: 15px; font-weight: 600; color: #1a1a2e; margin: 0; }
.permission-actions { display: flex; gap: 8px; }
.permission-tree { max-height: 500px; overflow-y: auto; }
.permission-tree :deep(.el-tree-node__content) { height: 36px; }
.permission-footer { margin-top: 20px; display: flex; justify-content: flex-end; }
</style>
