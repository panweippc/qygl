<template>
  <div class="management-section">
    <div class="section-header">
      <h3 class="subsection-title">菜单列表</h3>
      <el-button type="primary" @click="openAddMenuDialog" class="add-btn">添加菜单</el-button>
    </div>
    <div class="table-container">
      <el-table :data="flatMenus" style="width: 100%" class="data-table" v-loading="loading" @expand-change="onExpand">
        <el-table-column type="expand">
          <template #default>
            <div style="padding:0;height:0;display:none"></div>
          </template>
        </el-table-column>
        <el-table-column label="菜单名称" min-width="200">
          <template #default="{ row }">
            <span class="menu-name" :style="{ paddingLeft: (row._level || 0) * 24 + 'px' }">
              <span v-if="row._level > 0" class="indent-line">└─</span>
              {{ row.name }}
            </span>
          </template>
        </el-table-column>
        <el-table-column prop="path" label="路由路径" min-width="160" />
        <el-table-column prop="component" label="组件" min-width="160" show-overflow-tooltip />
        <el-table-column label="图标" width="80">
          <template #default="{ row }">{{ row.icon || '-' }}</template>
        </el-table-column>
        <el-table-column prop="sort" label="排序" width="60" />
        <el-table-column label="状态" width="80">
          <template #default="{ row }">
            <el-tag :type="row.status === '启用' ? 'success' : 'danger'" size="small">{{ row.status }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="300" fixed="right">
          <template #default="{ row }">
            <div class="action-btns">
              <el-button size="small" @click="editMenu(row)">编辑</el-button>
              <el-button size="small" @click="addSubMenu(row)">添加子菜单</el-button>
              <el-button size="small" type="danger" @click="deleteMenu(row.id)">删除</el-button>
            </div>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <el-dialog v-model="menuDialogVisible" :title="isEditingMenu ? '编辑菜单' : '添加菜单'" width="500px">
      <el-form :model="menuForm" :rules="menuRules" ref="menuFormRef" label-position="top">
        <el-form-item label="上级菜单">
          <el-select v-model="menuForm.parentId" placeholder="请选择上级菜单" clearable>
            <el-option label="无（顶级菜单）" :value="0" />
            <el-option v-for="menu in parentMenuOptions" :key="menu.id" :label="menu._label" :value="menu.id" />
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
import { ref, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'

const loading = ref(false)
const saving = ref(false)
const menus = ref<any[]>([])

const menuDialogVisible = ref(false)
const isEditingMenu = ref(false)
const menuFormRef = ref()
const menuForm = ref({ id: null as number | null, parentId: 0, name: '', path: '', component: '', icon: '', sort: 0, status: '启用' })
const menuRules = { name: [{ required: true, message: '请输入菜单名称', trigger: 'blur' }], path: [{ required: true, message: '请输入路由路径', trigger: 'blur' }] }

function flattenTree(items: any[], level = 0): any[] {
  const result: any[] = []
  for (const item of items) {
    result.push({ ...item, _level: level })
    if (item.children && item.children.length > 0) {
      result.push(...flattenTree(item.children, level + 1))
    }
  }
  return result
}

const flatMenus = computed(() => flattenTree(menus.value))

const excludeParentNames = new Set(['系统管理', '角色管理', '菜单管理'])

const parentMenuOptions = computed(() => {
  const options: any[] = []
  const collect = (items: any[], prefix: string) => {
    items.forEach(item => {
      if (item.status !== '禁用' && !excludeParentNames.has(item.name)) {
        options.push({ ...item, _label: prefix + item.name })
        if (item.children) collect(item.children, prefix + item.name + ' / ')
      }
    })
  }
  collect(menus.value, '')
  return options
})

function onExpand() {}

async function fetchMenus() {
  loading.value = true
  try {
    const res = await fetch('/api/menus')
    const json = await res.json()
    if (json.success) menus.value = json.data
  } catch (e: any) {
    ElMessage.error('获取菜单失败: ' + e.message)
  } finally {
    loading.value = false
  }
}

function openAddMenuDialog() {
  isEditingMenu.value = false
  menuForm.value = { id: null, parentId: 0, name: '', path: '', component: '', icon: '', sort: 0, status: '启用' }
  menuDialogVisible.value = true
}

function editMenu(row: any) {
  isEditingMenu.value = true
  menuForm.value = { id: row.id, parentId: row.parentId || 0, name: row.name, path: row.path, component: row.component || '', icon: row.icon || '', sort: row.sort || 0, status: row.status || '启用' }
  menuDialogVisible.value = true
}

function addSubMenu(row: any) {
  isEditingMenu.value = false
  menuForm.value = { id: null, parentId: row.id, name: '', path: '', component: '', icon: '', sort: 0, status: '启用' }
  menuDialogVisible.value = true
}

async function saveMenu() {
  const valid = await menuFormRef.value.validate().catch(() => false)
  if (!valid) return
  saving.value = true
  try {
    const body: any = { name: menuForm.value.name, path: menuForm.value.path, component: menuForm.value.component, icon: menuForm.value.icon, sort: menuForm.value.sort, status: menuForm.value.status }
    if (menuForm.value.parentId) body.parentId = menuForm.value.parentId
    const url = '/api/menus' + (isEditingMenu.value ? '/' + menuForm.value.id : '')
    const method = isEditingMenu.value ? 'PUT' : 'POST'
    await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    ElMessage.success(isEditingMenu.value ? '菜单更新成功' : '菜单添加成功')
    menuDialogVisible.value = false
    await fetchMenus()
  } catch (e: any) {
    ElMessage.error('操作失败: ' + e.message)
  } finally {
    saving.value = false
  }
}

async function deleteMenu(id: number) {
  try {
    await ElMessageBox.confirm('确定删除该菜单及其子菜单吗？', '提示', { confirmButtonText: '确定', cancelButtonText: '取消', type: 'warning' })
    await fetch('/api/menus/' + id, { method: 'DELETE' })
    ElMessage.success('菜单删除成功')
    await fetchMenus()
  } catch {}
}

onMounted(fetchMenus)
</script>

<style scoped>
.management-section { background: #fff; border-radius: 12px; padding: 24px; box-shadow: 0 1px 3px rgba(0,0,0,0.06); }
.section-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
.subsection-title { font-size: 16px; font-weight: 600; color: #1a1a2e; margin: 0; }
.add-btn { background: linear-gradient(135deg, #667eea, #764ba2); color: #fff; border: none; }
.data-table { width: 100%; }
.menu-name { display: flex; align-items: center; gap: 2px; }
.indent-line { color: #999; font-size: 12px; margin-right: 4px; }
.dialog-footer { display: flex; justify-content: flex-end; gap: 12px; }
.action-btns { white-space: nowrap; display: flex; gap: 4px; }
</style>
