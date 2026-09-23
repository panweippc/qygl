<template>
  <div class="tool-inventory-container">
    <!-- 顶部导航 -->
    <header class="header">
      <div class="logo">
        <span class="logo-text">宏友智慧办公平台</span>
        <div class="logo-glow"></div>
      </div>
      <nav class="nav">
        <router-link to="/asset-management" class="nav-item active">资产管理</router-link>
        <button class="nav-item logout-btn" @click="handleBack">返回</button>
      </nav>
    </header>

    <!-- 主内容区 -->
    <main class="main-content">
      <div class="content-wrapper">
        <div class="inventory-section">
          <div class="section-header">
            <h2 class="section-title">
              <span class="title-icon">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20 2H4C2.9 2 2 2.9 2 4V22L6 18H20C21.1 18 22 17.1 22 16V4C22 2.9 21.1 2 20 2ZM16 14H8V12H16V14ZM16 10H8V8H16V10Z"/>
                </svg>
              </span>
              资产管理
            </h2>
            <el-button type="primary" @click="openAddDialog" class="add-btn">新增资产</el-button>
          </div>

          <!-- 搜索和筛选 -->
          <div class="search-filter">
            <el-input v-model="searchQuery" placeholder="搜索名称/编号/责任人" prefix-icon="Search" class="search-input" />
            <el-select v-model="typeFilter" placeholder="资产类型" class="filter-select" clearable>
              <el-option label="全部类型" value="" />
              <el-option label="固定资产" value="fixed" />
              <el-option label="无形资产" value="intangible" />
              <el-option label="耗材库存" value="consumable" />
            </el-select>
            <el-select v-model="statusFilter" placeholder="状态" class="filter-select" clearable>
              <el-option label="全部状态" value="" />
              <el-option label="在用" value="在用" />
              <el-option label="领用" value="领用" />
              <el-option label="闲置" value="闲置" />
              <el-option label="维修" value="维修" />
              <el-option label="报废" value="报废" />
            </el-select>
          </div>

          <!-- 资产列表 -->
          <div class="tool-list">
            <el-table :data="pagedAssets" style="width: 100%" class="tool-table" v-loading="loading">
              <el-table-column label="序号" width="70">
                <template #default="{ $index }">{{ (currentPage - 1) * pageSize + $index + 1 }}</template>
              </el-table-column>
              <el-table-column prop="assetCode" label="资产编号" width="130" />
              <el-table-column prop="name" label="名称" />
              <el-table-column label="类型" width="100">
                <template #default="{ row }">{{ typeLabel(row.assetType) }}</template>
              </el-table-column>
              <el-table-column prop="categoryName" label="分类" width="110" />
              <el-table-column prop="responsibleUser" label="责任人" width="100" />
              <el-table-column prop="department" label="部门" width="100" />
              <el-table-column label="状态" width="90">
                <template #default="{ row }"><el-tag :type="statusTag(row.status)" size="small">{{ row.status }}</el-tag></template>
              </el-table-column>
              <el-table-column prop="expireDate" label="到期日" width="120" />
              <el-table-column label="操作" width="230" fixed="right">
                <template #default="{ row }">
                  <el-button size="small" @click="viewDetail(row)" class="edit-btn">查看</el-button>
                  <el-button size="small" @click="editAsset(row)" class="edit-btn">编辑</el-button>
                  <el-button size="small" @click="removeAsset(row.id)" class="delete-btn">删除</el-button>
                </template>
              </el-table-column>
            </el-table>
          </div>

          <!-- 分页 -->
          <div class="pagination">
            <el-pagination
              v-model:current-page="currentPage"
              v-model:page-size="pageSize"
              :page-sizes="[10, 20, 50, 100]"
              layout="total, sizes, prev, pager, next, jumper"
              :total="assets.length"
              @size-change="handleSizeChange"
              @current-change="handleCurrentChange"
            />
          </div>
        </div>
      </div>
    </main>

    <!-- 页脚 -->
    <footer class="footer">
      <div class="footer-content">
        <p>© 2026 企业管理系统 | 科技赋能未来</p>
      </div>
    </footer>

    <!-- 新增/编辑 -->
    <el-dialog v-model="formVisible" :title="form.id ? '编辑资产' : '新增资产'" width="640px" class="dialog">
      <el-form :model="form" label-position="top">
        <el-form-item label="资产名称">
          <el-input v-model="form.name" placeholder="请输入资产名称" />
        </el-form-item>
        <el-form-item label="资产类型">
          <el-select v-model="form.assetType" placeholder="请选择资产类型">
            <el-option label="固定资产" value="fixed" />
            <el-option label="无形资产" value="intangible" />
            <el-option label="耗材库存" value="consumable" />
          </el-select>
        </el-form-item>
        <el-form-item label="分类">
          <el-select v-model="form.categoryId" placeholder="请选择分类" filterable allow-create default-first-option>
            <el-option v-for="c in categories" :key="c.id" :label="`${typeLabel(c.parentType)} / ${c.name}`" :value="c.id" />
          </el-select>
        </el-form-item>
        <div style="display:flex;gap:12px">
          <el-form-item label="数量" style="flex:1">
            <el-input v-model.number="form.quantity" type="number" />
          </el-form-item>
          <el-form-item label="单位" style="flex:1">
            <el-input v-model="form.unit" placeholder="台/套/个" />
          </el-form-item>
        </div>
        <div style="display:flex;gap:12px">
          <el-form-item label="获取日期" style="flex:1">
            <el-date-picker v-model="form.acquireDate" type="date" style="width:100%" value-format="YYYY-MM-DD" />
          </el-form-item>
          <el-form-item label="状态" style="flex:1">
            <el-select v-model="form.status">
              <el-option v-for="s in STATUS_LIST" :key="s" :label="s" :value="s" />
            </el-select>
          </el-form-item>
        </div>
        <el-form-item label="来源/供应商">
          <el-input v-model="form.source" />
        </el-form-item>
        <div style="display:flex;gap:12px">
          <el-form-item label="原值(元)" style="flex:1">
            <el-input v-model.number="form.originalValue" type="number" />
          </el-form-item>
          <el-form-item label="残值(元)" style="flex:1">
            <el-input v-model.number="form.residualValue" type="number" />
          </el-form-item>
        </div>
        <el-form-item label="折旧/摊销方式">
          <el-input v-model="form.depMethod" placeholder="如：直线法" />
        </el-form-item>
        <div style="display:flex;gap:12px">
          <el-form-item label="责任人" style="flex:1">
            <el-input v-model="form.responsibleUser" />
          </el-form-item>
          <el-form-item label="使用部门" style="flex:1">
            <el-input v-model="form.department" />
          </el-form-item>
        </div>
        <el-form-item label="存放位置（有形）">
          <el-input v-model="form.location" />
        </el-form-item>
        <el-form-item label="载体/账号密钥（无形）">
          <el-input v-model="form.carrier" placeholder="证书路径/授权账号等" />
        </el-form-item>
        <div style="display:flex;gap:12px">
          <el-form-item label="到期日（无形）" style="flex:1">
            <el-date-picker v-model="form.expireDate" type="date" style="width:100%" value-format="YYYY-MM-DD" />
          </el-form-item>
          <el-form-item label="续费提醒日（无形）" style="flex:1">
            <el-date-picker v-model="form.renewNoticeDate" type="date" style="width:100%" value-format="YYYY-MM-DD" />
          </el-form-item>
        </div>
        <el-form-item label="备注">
          <el-input v-model="form.remark" type="textarea" :rows="2" />
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="formVisible = false">取消</el-button>
          <el-button type="primary" @click="saveAsset">确定</el-button>
        </span>
      </template>
    </el-dialog>

    <!-- 详情 + 生命周期 -->
    <el-dialog v-model="detailVisible" title="资产详情" width="660px" class="dialog detail-dialog">
      <template v-if="detail">
        <el-descriptions :column="2" border size="small">
          <el-descriptions-item label="资产编号">{{ detail.asset.assetCode }}</el-descriptions-item>
          <el-descriptions-item label="名称">{{ detail.asset.name }}</el-descriptions-item>
          <el-descriptions-item label="类型">{{ typeLabel(detail.asset.assetType) }}</el-descriptions-item>
          <el-descriptions-item label="分类">{{ detail.asset.categoryName }}</el-descriptions-item>
          <el-descriptions-item label="责任人">{{ detail.asset.responsibleUser }}</el-descriptions-item>
          <el-descriptions-item label="部门">{{ detail.asset.department }}</el-descriptions-item>
          <el-descriptions-item label="状态">
            <el-tag :type="statusTag(detail.asset.status)" size="small">{{ detail.asset.status }}</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="数量">{{ detail.asset.quantity }} {{ detail.asset.unit }}</el-descriptions-item>
          <el-descriptions-item label="原值">{{ detail.asset.originalValue }}</el-descriptions-item>
          <el-descriptions-item label="残值">{{ detail.asset.residualValue }}</el-descriptions-item>
          <el-descriptions-item label="获取日期">{{ detail.asset.acquireDate }}</el-descriptions-item>
          <el-descriptions-item label="到期日">{{ detail.asset.expireDate || '—' }}</el-descriptions-item>
          <el-descriptions-item label="存放位置">{{ detail.asset.location || '—' }}</el-descriptions-item>
          <el-descriptions-item label="载体">{{ detail.asset.carrier || '—' }}</el-descriptions-item>
        </el-descriptions>
        <div style="margin-top:18px">
          <div style="font-weight:600;margin-bottom:10px">生命周期轨迹</div>
          <el-timeline>
            <el-timeline-item v-for="log in detail.logs" :key="log.id" :timestamp="log.createdAt" placement="top">
              <div><b>{{ log.action }}</b> <span v-if="log.fromStatus">（{{ log.fromStatus }} → {{ log.toStatus }}）</span></div>
              <div style="color:#888;font-size:12px">{{ log.operator }} · {{ log.detail }}</div>
            </el-timeline-item>
          </el-timeline>
          <el-empty v-if="!detail.logs.length" description="暂无轨迹" />
        </div>
        <div style="margin-top:14px">
          <span style="font-weight:600;margin-right:8px">变更状态：</span>
          <el-button v-for="s in STATUS_LIST" :key="s" size="small" :type="s === detail.asset.status ? 'info' : ''" @click="changeStatus(s)">{{ s }}</el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  getAssets, getAsset, addAsset, updateAsset, deleteAsset as apiDeleteAsset, getAssetCategories,
  type Asset, type AssetLog
} from '../services/api'

const router = useRouter()
const route = useRoute()

const handleBack = () => router.back()

const STATUS_LIST = ['在用', '领用', '闲置', '维修', '报废']
const typeLabel = (t: string) => ({ fixed: '固定资产', intangible: '无形资产', consumable: '耗材库存' }[t] || t)
const statusTag = (s: string): any => ({ '在用': 'success', '领用': 'warning', '闲置': 'info', '维修': 'warning', '报废': 'danger' }[s] || 'info')

interface AssetForm {
  id: number; assetCode: string; name: string; assetType: string; categoryId: number | null
  quantity: number; unit: string; acquireDate: string; source: string; originalValue: number
  residualValue: number; depMethod: string; responsibleUser: string; department: string
  location: string; carrier: string; status: string; expireDate: string; renewNoticeDate: string; remark: string
}

const assets = ref<Asset[]>([])
const categories = ref<any[]>([])
const searchQuery = ref('')
const typeFilter = ref('')
const statusFilter = ref('')
const currentPage = ref(1)
const pageSize = ref(10)
const loading = ref(false)
const formVisible = ref(false)
const detailVisible = ref(false)
const detail = ref<{ asset: Asset; logs: AssetLog[] } | null>(null)

const emptyForm = (): AssetForm => ({
  id: 0, assetCode: '', name: '', assetType: 'fixed', categoryId: null, quantity: 1, unit: '台',
  acquireDate: '', source: '', originalValue: 0, residualValue: 0, depMethod: '', responsibleUser: '',
  department: '', location: '', carrier: '', status: '在用', expireDate: '', renewNoticeDate: '', remark: ''
})
const form = ref<AssetForm>(emptyForm())

const loadAssets = async () => {
  loading.value = true
  try {
    const res = await getAssets({
      type: typeFilter.value || undefined,
      status: statusFilter.value || undefined,
      keyword: searchQuery.value || undefined
    })
    if (res.success) assets.value = res.data
    else ElMessage.error('加载资产失败')
  } catch (e) { console.error(e); ElMessage.error('加载资产失败') }
  finally { loading.value = false }
}

const loadCategories = async () => {
  try { const r = await getAssetCategories(); if (r.success) categories.value = r.data } catch (e) { console.error(e) }
}

onMounted(async () => {
  await Promise.all([loadAssets(), loadCategories()])
  if (route.query.action === 'add') openAddDialog()
})

const pagedAssets = ref<Asset[]>([])
const refreshPaged = () => {
  const start = (currentPage.value - 1) * pageSize.value
  pagedAssets.value = assets.value.slice(start, start + pageSize.value)
}
// 监听分页/筛选变化重新切片
watch([assets, currentPage, pageSize], refreshPaged, { immediate: true })
watch([searchQuery, typeFilter, statusFilter], () => { currentPage.value = 1; refreshPaged() })

const openAddDialog = () => { form.value = emptyForm(); formVisible.value = true }
const editAsset = (a: Asset) => {
  form.value = { ...emptyForm(), ...a, categoryId: a.categoryId ?? null } as AssetForm
  formVisible.value = true
}

const saveAsset = async () => {
  if (!form.value.name) { ElMessage.warning('请输入资产名称'); return }
  loading.value = true
  try {
    const payload = { ...form.value }
    const res = form.value.id ? await updateAsset(payload as any) : await addAsset(payload)
    if (res.success) { await loadAssets(); formVisible.value = false; ElMessage.success(form.value.id ? '更新成功' : '新增成功') }
    else ElMessage.error(res.message || '保存失败')
  } catch (e) { console.error(e); ElMessage.error('保存失败') }
  finally { loading.value = false }
}

const removeAsset = async (id: number) => {
  try {
    await ElMessageBox.confirm('确定要删除该资产吗？相关轨迹也会一并删除。', '警告', {
      confirmButtonText: '确定', cancelButtonText: '取消', type: 'warning'
    })
    const res = await apiDeleteAsset(id)
    if (res.success) { await loadAssets(); ElMessage.success('删除成功') }
    else ElMessage.error('删除失败')
  } catch (e) { if (e !== 'cancel') console.error(e) }
}

const viewDetail = async (a: Asset) => {
  try {
    const res = await getAsset(a.id)
    if (res.success) { detail.value = res.data; detailVisible.value = true }
    else ElMessage.error('获取详情失败')
  } catch (e) { console.error(e); ElMessage.error('获取详情失败') }
}

const changeStatus = async (s: string) => {
  if (!detail.value || s === detail.value.asset.status) return
  loading.value = true
  try {
    const payload = { ...detail.value.asset, status: s }
    const res = await updateAsset(payload as any)
    if (res.success) {
      await loadAssets()
      const r = await getAsset(detail.value.asset.id)
      if (r.success) detail.value = r.data
      ElMessage.success(`已变更为「${s}」`)
    } else ElMessage.error('状态变更失败')
  } catch (e) { console.error(e); ElMessage.error('状态变更失败') }
  finally { loading.value = false }
}

const handleSizeChange = (s: number) => { pageSize.value = s; currentPage.value = 1 }
const handleCurrentChange = (c: number) => { currentPage.value = c }
</script>

<style scoped>
.tool-inventory-container {
  width: 100%;
  height: 100vh;
  display: flex;
  flex-direction: column;
  position: relative;
  overflow: hidden;
  background: #E4EDF2;
}

/* 顶部导航 */
.header {
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid rgba(30, 90, 168, 0.3);
  padding: 0 2rem;
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  position: relative;
  z-index: 100;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

.logo { position: relative; display: flex; align-items: center; }
.logo-text { font-size: 1.5rem; font-weight: bold; color: #333; text-shadow: 0 0 10px rgba(30, 90, 168, 0.3); }
.logo-glow {
  position: absolute; top: -50%; left: -20%; width: 140%; height: 200%;
  background: linear-gradient(45deg, transparent, rgba(30, 90, 168, 0.3), transparent);
  filter: blur(20px); animation: glow 3s ease-in-out infinite;
}
@keyframes glow { 0%, 100% { opacity: 0.3; } 50% { opacity: 0.6; } }

.nav { display: flex; gap: 1rem; align-items: center; justify-content: flex-end; width: 100%; max-width: 400px; }
.nav-item {
  color: rgba(51, 51, 51, 0.8); text-decoration: none; padding: 0.5rem 1rem; border-radius: 6px;
  transition: all 0.3s ease; position: relative; overflow: hidden; border: none; background: none;
  cursor: pointer; font-size: 14px; font-weight: 500;
}
.nav-item::before {
  content: ''; position: absolute; top: 0; left: -100%; width: 100%; height: 100%;
  background: linear-gradient(90deg, transparent, rgba(30, 90, 168, 0.2), transparent); transition: left 0.3s ease;
}
.nav-item:hover::before, .nav-item.active::before { left: 100%; }
.nav-item:hover, .nav-item.active { color: #333; background: rgba(30, 90, 168, 0.2); box-shadow: 0 0 15px rgba(30, 90, 168, 0.3); }

.logout-btn {
  background: rgba(244, 67, 54, 0.1); color: #f44336; border: 1px solid rgba(244, 67, 54, 0.3);
  border-radius: 6px; padding: 0.5rem 1rem; cursor: pointer; transition: all 0.3s ease;
  position: relative; overflow: hidden; font-size: 14px; font-weight: 500;
}
.logout-btn::before {
  content: ''; position: absolute; top: 0; left: -100%; width: 100%; height: 100%;
  background: linear-gradient(90deg, transparent, rgba(244, 67, 54, 0.2), transparent); transition: left 0.3s ease;
}
.logout-btn:hover::before { left: 100%; }
.logout-btn:hover { background: rgba(244, 67, 54, 0.2); box-shadow: 0 0 15px rgba(244, 67, 54, 0.2); }

/* 主内容区 */
.main-content { flex: 1; overflow-y: auto; padding: 2rem; }
.content-wrapper { max-width: 1200px; margin: 0 auto; }

.inventory-section {
  background: rgba(255, 255, 255, 0.8); border: 1px solid rgba(30, 90, 168, 0.3); border-radius: 12px;
  padding: 2rem; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1); backdrop-filter: blur(5px);
}
.section-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; }
.section-title {
  font-size: 1.5rem; font-weight: 600; color: #333; margin: 0; display: flex; align-items: center; gap: 0.5rem;
  text-shadow: 0 0 10px rgba(30, 90, 168, 0.3);
}
.title-icon {
  width: 32px; height: 32px; background: linear-gradient(45deg, #1E5AA8, #5B8FC9); border-radius: 8px;
  display: flex; align-items: center; justify-content: center; color: #fff; box-shadow: 0 4px 15px rgba(30, 90, 168, 0.4);
}
.title-icon svg { width: 18px; height: 18px; }

.add-btn {
  background: linear-gradient(45deg, #1E5AA8, #5B8FC9) !important; border: none !important; border-radius: 8px !important;
  padding: 0.5rem 1.5rem !important; font-weight: 600 !important; box-shadow: 0 4px 15px rgba(30, 90, 168, 0.4) !important; transition: all 0.3s ease !important;
}
.add-btn:hover { transform: translateY(-2px) !important; box-shadow: 0 6px 20px rgba(30, 90, 168, 0.6) !important; }

.search-filter { display: flex; gap: 1rem; margin-bottom: 1.5rem; flex-wrap: wrap; }
.search-input { flex: 1; min-width: 300px; }
.filter-select { width: 200px; }

.el-input__wrapper, .el-select .el-input__wrapper {
  background: rgba(255, 255, 255, 0.8) !important; border: 1px solid rgba(30, 90, 168, 0.3) !important;
  border-radius: 8px !important; box-shadow: 0 2px 5px rgba(0, 0, 0, 0.05) !important;
}
.el-input__inner, .el-select .el-input__inner { color: #333 !important; font-size: 14px; }
.el-input__placeholder, .el-select .el-input__placeholder { color: rgba(51, 51, 51, 0.4) !important; }

.tool-list { margin-bottom: 1.5rem; }
.tool-table {
  background: rgba(255, 255, 255, 0.9) !important; border-radius: 8px !important; overflow: hidden !important;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1) !important;
}
.tool-table th { background: rgba(30, 90, 168, 0.2) !important; color: #333 !important; font-weight: 600 !important; border-bottom: 1px solid rgba(30, 90, 168, 0.3) !important; }
.tool-table td { color: rgba(51, 51, 51, 0.8) !important; border-bottom: 1px solid rgba(30, 90, 168, 0.2) !important; }
.tool-table tr:hover { background: rgba(30, 90, 168, 0.1) !important; }

.edit-btn {
  background: rgba(30, 90, 168, 0.2) !important; color: #1E5AA8 !important; border: 1px solid rgba(30, 90, 168, 0.4) !important;
  border-radius: 6px !important; margin-right: 8px !important; transition: all 0.3s ease !important;
}
.edit-btn:hover { background: rgba(30, 90, 168, 0.3) !important; box-shadow: 0 0 10px rgba(30, 90, 168, 0.4) !important; }
.delete-btn {
  background: rgba(244, 67, 54, 0.2) !important; color: #f44336 !important; border: 1px solid rgba(244, 67, 54, 0.4) !important;
  border-radius: 6px !important; transition: all 0.3s ease !important;
}
.delete-btn:hover { background: rgba(244, 67, 54, 0.3) !important; box-shadow: 0 0 10px rgba(244, 67, 54, 0.4) !important; }

.pagination { display: flex; justify-content: flex-end; margin-top: 1.5rem; }
.el-pagination__total { color: rgba(51, 51, 51, 0.7) !important; }
.el-pagination__sizes .el-input__inner { color: #333 !important; }
.el-pagination__sizes .el-input .el-input__icon { color: rgba(51, 51, 51, 0.7) !important; }
.el-pager li { color: rgba(51, 51, 51, 0.7) !important; }
.el-pager li.active { background: linear-gradient(45deg, #1E5AA8, #5B8FC9) !important; color: #fff !important; border: none !important; }
.el-pager li:hover { color: #1E5AA8 !important; }

.dialog {
  background: rgba(255, 255, 255, 0.95) !important; border: 1px solid rgba(30, 90, 168, 0.3) !important;
  border-radius: 12px !important; box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1) !important;
}
.dialog .el-dialog__title { color: #333 !important; font-weight: 600 !important; }
.dialog .el-form-item__label { color: rgba(51, 51, 51, 0.8) !important; font-weight: 500 !important; }
.dialog .el-date-picker__header-label { color: #333 !important; }
.dialog .el-date-picker__header { background: rgba(255, 255, 255, 0.9) !important; border-bottom: 1px solid rgba(30, 90, 168, 0.3) !important; }
.dialog .el-date-picker__body { background: rgba(255, 255, 255, 0.9) !important; }
.dialog .el-date-table th { color: rgba(51, 51, 51, 0.7) !important; }
.dialog .el-date-table td { color: #333 !important; }
.dialog .el-date-table td.available:hover { background: rgba(30, 90, 168, 0.2) !important; }
.dialog .el-date-table td.today { color: #1E5AA8 !important; }
.dialog .el-date-table td.in-range div { background: rgba(30, 90, 168, 0.2) !important; }
.dialog .el-date-table td.start-date div, .dialog .el-date-table td.end-date div { background: linear-gradient(45deg, #1E5AA8, #5B8FC9) !important; }
.dialog .dialog-footer .el-button { background: rgba(240, 242, 245, 0.8) !important; color: #333 !important; border: 1px solid rgba(30, 90, 168, 0.3) !important; border-radius: 6px !important; transition: all 0.3s ease !important; }
.dialog .dialog-footer .el-button:hover { background: rgba(240, 242, 245, 1) !important; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1) !important; }
.dialog .dialog-footer .el-button--primary { background: linear-gradient(45deg, #1E5AA8, #5B8FC9) !important; border: none !important; box-shadow: 0 4px 15px rgba(30, 90, 168, 0.4) !important; }
.dialog .dialog-footer .el-button--primary:hover { transform: translateY(-2px) !important; box-shadow: 0 6px 20px rgba(30, 90, 168, 0.6) !important; }

.detail-dialog .el-descriptions__label { color: rgba(51, 51, 51, 0.7) !important; background: rgba(30, 90, 168, 0.08) !important; }
.detail-dialog .el-descriptions__content { color: #333 !important; }

.footer {
  background: rgba(255, 255, 255, 0.9); backdrop-filter: blur(10px); border-top: 1px solid rgba(30, 90, 168, 0.3);
  padding: 1rem 2rem; text-align: center; color: rgba(51, 51, 51, 0.6);
}
.footer-content { display: flex; justify-content: center; align-items: center; }

.main-content::-webkit-scrollbar { width: 8px; }
.main-content::-webkit-scrollbar-track { background: rgba(240, 242, 245, 0.6); border-radius: 4px; }
.main-content::-webkit-scrollbar-thumb { background: rgba(30, 90, 168, 0.5); border-radius: 4px; }
.main-content::-webkit-scrollbar-thumb:hover { background: rgba(30, 90, 168, 0.7); }
</style>
