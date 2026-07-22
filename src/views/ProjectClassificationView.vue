<template>
  <div class="project-classification-container">
    <header class="header">
      <div class="logo">
        <span class="logo-text">宏友智慧办公平台</span>
        <div class="logo-glow"></div>
      </div>
      <nav class="nav">
        <router-link to="/" class="nav-item">首页</router-link>
        <router-link to="/closing-project" class="nav-item">成交项目区划</router-link>
        <button class="nav-item logout-btn" @click="handleBack">返回</button>
      </nav>
    </header>

    <main class="main-content">
      <div class="content-wrapper">
        <div class="breadcrumb">
          <span class="breadcrumb-item" @click="goToLevel(0)">全国</span>
          <span v-if="currentLevel >= 1" class="breadcrumb-separator">></span>
          <span v-if="currentLevel >= 1" class="breadcrumb-item" @click="goToLevel(1)">{{ currentProvinceName }}</span>
          <span v-if="currentLevel >= 2" class="breadcrumb-separator">></span>
          <span v-if="currentLevel >= 2" class="breadcrumb-item" @click="goToLevel(2)">{{ currentCityName }}</span>
        </div>

        <div class="title-row">
          <div class="title-with-count">
            <h2 class="section-title">
              <span class="title-icon">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                </svg>
              </span>
              {{ pageTitle }}
            </h2>
            <span class="project-total-count">{{ totalProjectCount }}个项目</span>
          </div>
          <el-button v-if="currentLevel === 0" type="primary" @click="openAddProvinceDialog" class="add-btn">
            <span class="btn-icon">+</span>添加省份
          </el-button>
          <el-button v-if="currentLevel === 1" type="primary" @click="openAddCityDialog" class="add-btn">
            <span class="btn-icon">+</span>添加城市
          </el-button>
          <el-button v-if="currentLevel === 2" type="primary" @click="openAddCountyDialog" class="add-btn">
            <span class="btn-icon">+</span>添加旗县
          </el-button>
          <el-button v-if="currentLevel === 3" type="primary" @click="openAddProjectDialog" class="add-btn">
            <span class="btn-icon">+</span>添加项目
          </el-button>
        </div>

        <div v-if="loading" class="loading-container">
          <el-loading :fullscreen="false" text="加载中..."></el-loading>
        </div>

        <div v-else-if="currentLevel === 0" class="classification-grid">
          <RegionCard
            v-for="province in provinces"
            :key="province.id"
            :name="province.name"
            :project-count="province.projectCount"
            :description="`点击查看${province.name}的详细分类`"
            @click="selectProvince(province)"
            @edit="openEditProvinceDialog(province)"
            @delete="deleteProvince(province)"
          />
        </div>

        <div v-else-if="currentLevel === 1" class="classification-grid">
          <RegionCard
            v-for="city in cities"
            :key="city.id"
            :name="city.name"
            :project-count="city.projectCount"
            :description="`点击查看${city.name}的详细分类`"
            :hovered="hoveredCityId === city.id"
            :actions-visible="hoveredCityId === city.id"
            @mouseenter="hoveredCityId = city.id"
            @mouseleave="hoveredCityId = null"
            @click="selectCity(city)"
            @edit="openEditCityDialog(city)"
            @delete="deleteCity(city)"
          />
        </div>

        <div v-else-if="currentLevel === 2" class="classification-grid">
          <RegionCard
            v-for="county in counties"
            :key="county.id"
            :name="county.name"
            :project-count="county.projectCount"
            :description="`点击查看${county.name}的项目列表`"
            @click="selectCounty(county)"
            @edit="openEditCountyDialog(county)"
            @delete="deleteCounty(county)"
          />
        </div>

        <div v-else-if="currentLevel === 3" class="project-list">
          <div v-if="countyProjects.length === 0" class="empty-message">
            该旗县暂无项目
          </div>
          <ProjectCard
            v-for="project in countyProjects"
            :key="project.id"
            :project="project"
            @edit="openEditProjectDialog(project)"
            @delete="deleteProject(project)"
          />
        </div>
      </div>
    </main>

    <footer class="footer">
      <div class="footer-content">
        <p>© 2026 企业管理系统 | 科技赋能未来</p>
      </div>
    </footer>

    <RegionDialogs
      v-model:province-dialog-visible="addProvinceDialogVisible"
      v-model:city-dialog-visible="addCityDialogVisible"
      v-model:county-dialog-visible="addCountyDialogVisible"
      v-model:project-dialog-visible="addProjectDialogVisible"
      :editing-province="editingProvince"
      :editing-city="editingCity"
      :editing-county="editingCounty"
      :editing-project="editingProject"
      :current-province-id="currentProvinceId"
      :current-city-id="currentCityId"
      :current-county-id="currentCountyId"
      :submitting="submitting"
      @save-province="handleSaveProvince"
      @save-city="handleSaveCity"
      @save-county="handleSaveCounty"
      @save-project="handleSaveProject"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import RegionCard from '../components/RegionCard.vue'
import ProjectCard from '../components/ProjectCard.vue'
import RegionDialogs from '../components/RegionDialogs.vue'

const router = useRouter()

const currentLevel = ref(0)
const currentProvinceId = ref<number | null>(null)
const currentCityId = ref<number | null>(null)
const currentCountyId = ref<number | null>(null)
const currentProvinceName = ref('')
const currentCityName = ref('')
const currentCountyName = ref('')
const loading = ref(false)

const pageTitle = computed(() => {
  switch (currentLevel.value) {
    case 0: return '全国成交项目区划'
    case 1: return `${currentProvinceName.value} - 市级分类`
    case 2: return `${currentCityName.value} - 旗县分类`
    case 3: return `${currentCountyName.value} - 项目列表`
    default: return '项目分类'
  }
})

const totalProjectCount = computed(() => {
  switch (currentLevel.value) {
    case 0: return provinces.value.reduce((sum, p) => sum + (p.projectCount || 0), 0)
    case 1: return cities.value.reduce((sum, c) => sum + (c.projectCount || 0), 0)
    case 2: return counties.value.reduce((sum, c) => sum + (c.projectCount || 0), 0)
    case 3: return countyProjects.value.length
    default: return 0
  }
})

const provinces = ref<Array<{id: number, name: string, code: string, projectCount: number}>>([])
const cities = ref<Array<{id: number, name: string, code: string, projectCount: number}>>([])
const counties = ref<Array<{id: number, name: string, code: string, projectCount: number}>>([])
const countyProjects = ref<Array<any>>([])

const hoveredCityId = ref<number | null>(null)

const addProvinceDialogVisible = ref(false)
const addCityDialogVisible = ref(false)
const addCountyDialogVisible = ref(false)
const addProjectDialogVisible = ref(false)

const editingProvince = ref<any>(null)
const editingCity = ref<any>(null)
const editingCounty = ref<any>(null)
const editingProject = ref<any>(null)

const submitting = ref(false)

const openAddProvinceDialog = () => {
  editingProvince.value = null
  addProvinceDialogVisible.value = true
}

const openEditProvinceDialog = (province: any) => {
  editingProvince.value = province
  addProvinceDialogVisible.value = true
}

const handleSaveProvince = async (data: any) => {
  submitting.value = true
  try {
    const url = data.isEditing ? `/api/provinces/${data.id}` : '/api/provinces'
    const response = await fetch(url, {
      method: data.isEditing ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: data.name.trim(), code: data.code.trim() })
    })
    const result = await response.json()
    if (result.success) {
      ElMessage.success(data.isEditing ? '省份编辑成功' : '省份添加成功')
      addProvinceDialogVisible.value = false
      await loadProvinces()
    } else {
      ElMessage.error(result.message || (data.isEditing ? '编辑省份失败' : '添加省份失败'))
    }
  } catch (error) {
    console.error(data.isEditing ? '编辑省份失败:' : '添加省份失败:', error)
    ElMessage.error(data.isEditing ? '编辑省份失败' : '添加省份失败')
  } finally {
    submitting.value = false
  }
}

const openAddCityDialog = () => {
  editingCity.value = null
  addCityDialogVisible.value = true
}

const openEditCityDialog = (city: any) => {
  editingCity.value = city
  addCityDialogVisible.value = true
}

const handleSaveCity = async (data: any) => {
  submitting.value = true
  try {
    const url = data.isEditing ? `/api/cities/${data.id}` : '/api/cities'
    const fetchResponse = await fetch(url, {
      method: data.isEditing ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: data.name.trim(),
        code: data.code.trim(),
        provinceId: data.provinceId
      })
    })
    const contentType = fetchResponse.headers.get('content-type')
    let result
    if (contentType && contentType.includes('application/json')) {
      result = await fetchResponse.json()
    } else {
      result = { success: false, message: '响应不是JSON格式' }
    }
    if (result.success) {
      ElMessage.success(data.isEditing ? '城市编辑成功' : '城市添加成功')
      addCityDialogVisible.value = false
      if (currentProvinceId.value) await loadCities(currentProvinceId.value)
    } else {
      ElMessage.error(result.message || (data.isEditing ? '编辑城市失败' : '添加城市失败'))
    }
  } catch (error) {
    console.error(data.isEditing ? '编辑城市失败:' : '添加城市失败:', error)
    ElMessage.error(data.isEditing ? '编辑城市失败' : '添加城市失败')
  } finally {
    submitting.value = false
  }
}

const openAddCountyDialog = () => {
  editingCounty.value = null
  addCountyDialogVisible.value = true
}

const openEditCountyDialog = (county: any) => {
  editingCounty.value = county
  addCountyDialogVisible.value = true
}

const handleSaveCounty = async (data: any) => {
  submitting.value = true
  try {
    const url = data.isEditing ? `/api/counties/${data.id}` : '/api/counties'
    const response = await fetch(url, {
      method: data.isEditing ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: data.name.trim(),
        code: data.code.trim(),
        cityId: data.cityId
      })
    })
    const result = await response.json()
    if (result.success) {
      ElMessage.success(data.isEditing ? '旗县编辑成功' : '旗县添加成功')
      addCountyDialogVisible.value = false
      if (currentCityId.value) await loadCounties(currentCityId.value)
    } else {
      ElMessage.error(result.message || (data.isEditing ? '编辑旗县失败' : '添加旗县失败'))
    }
  } catch (error) {
    console.error(data.isEditing ? '编辑旗县失败:' : '添加旗县失败:', error)
    ElMessage.error(data.isEditing ? '编辑旗县失败' : '添加旗县失败')
  } finally {
    submitting.value = false
  }
}

const openAddProjectDialog = () => {
  editingProject.value = null
  addProjectDialogVisible.value = true
}

const openEditProjectDialog = (project: any) => {
  editingProject.value = project
  addProjectDialogVisible.value = true
}

const handleSaveProject = async (data: any) => {
  submitting.value = true
  try {
    const url = data.isEditing ? `/api/closing-projects/${data.id}` : '/api/closing-projects'
    const response = await fetch(url, {
      method: data.isEditing ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: data.name.trim(),
        description: data.description.trim(),
        status: data.status,
        price: data.price,
        dealTime: data.dealTime,
        serviceEndTime: data.serviceEndTime,
        nextYearFeeStatus: data.nextYearFeeStatus,
        contractFeeStatus: data.contractFeeStatus,
        remainingAmount: data.remainingAmount || 0,
        provinceId: data.provinceId,
        cityId: data.cityId,
        countyId: data.countyId
      })
    })
    const result = await response.json()
    if (result.success) {
      ElMessage.success(data.isEditing ? '项目编辑成功' : '项目添加成功')
      addProjectDialogVisible.value = false
      if (currentCountyId.value) await loadCountyProjects(currentCountyId.value)
    } else {
      ElMessage.error(result.message || (data.isEditing ? '编辑项目失败' : '添加项目失败'))
    }
  } catch (error) {
    console.error(data.isEditing ? '编辑项目失败:' : '添加项目失败:', error)
    ElMessage.error(data.isEditing ? '编辑项目失败' : '添加项目失败')
  } finally {
    submitting.value = false
  }
}

const deleteCounty = async (county: {id: number, name: string}) => {
  try {
    await ElMessageBox.confirm(`确定要删除旗县"${county.name}" 吗？`, '确认删除', {
      confirmButtonText: '确定', cancelButtonText: '取消', type: 'warning'
    })
    const response = await fetch(`/api/counties/${county.id}`, { method: 'DELETE' })
    const data = await response.json()
    if (data.success) {
      ElMessage.success('旗县删除成功')
      if (currentCityId.value) await loadCounties(currentCityId.value)
    } else {
      ElMessage.error(data.message || '删除旗县失败')
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除旗县失败:', error)
      ElMessage.error('删除旗县失败')
    }
  }
}

const deleteProject = async (project: {id: number, name: string}) => {
  try {
    await ElMessageBox.confirm(`确定要删除项目"${project.name}" 吗？`, '确认删除', {
      confirmButtonText: '确定', cancelButtonText: '取消', type: 'warning'
    })
    const response = await fetch(`/api/closing-projects/${project.id}`, { method: 'DELETE' })
    const data = await response.json()
    if (data.success) {
      ElMessage.success('项目删除成功')
      if (currentCountyId.value) await loadCountyProjects(currentCountyId.value)
    } else {
      ElMessage.error(data.message || '删除项目失败')
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除项目失败:', error)
      ElMessage.error('删除项目失败')
    }
  }
}

const deleteCity = async (city: {id: number, name: string}) => {
  try {
    await ElMessageBox.confirm(`确定要删除城市"${city.name}" 吗？`, '确认删除', {
      confirmButtonText: '确定', cancelButtonText: '取消', type: 'warning'
    })
    const response = await fetch(`/api/cities/${city.id}`, { method: 'DELETE' })
    const data = await response.json()
    if (data.success) {
      ElMessage.success('城市删除成功')
      if (currentProvinceId.value) await loadCities(currentProvinceId.value)
    } else {
      ElMessage.error(data.message || '删除城市失败')
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除城市失败:', error)
      ElMessage.error('删除城市失败')
    }
  }
}

const deleteProvince = async (province: {id: number, name: string}) => {
  try {
    await ElMessageBox.confirm(`确定要删除省份"${province.name}" 吗？`, '确认删除', {
      confirmButtonText: '确定', cancelButtonText: '取消', type: 'warning'
    })
    const response = await fetch(`/api/provinces/${province.id}`, { method: 'DELETE' })
    const data = await response.json()
    if (data.success) {
      ElMessage.success('省份删除成功')
      await loadProvinces()
    } else {
      ElMessage.error(data.message || '删除省份失败')
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除省份失败:', error)
      ElMessage.error('删除省份失败')
    }
  }
}

const loadProvinces = async () => {
  loading.value = true
  try {
    const response = await fetch('/api/provinces')
    const data = await response.json()
    if (data.success) provinces.value = data.data
    else ElMessage.error('获取省份数据失败')
  } catch (error) {
    console.error('加载省份数据失败:', error)
    ElMessage.error('加载省份数据失败')
  } finally {
    loading.value = false
  }
}

const loadCities = async (provinceId: number) => {
  loading.value = true
  try {
    const response = await fetch(`/api/provinces/${provinceId}/cities`)
    const data = await response.json()
    if (data.success) cities.value = data.data
    else ElMessage.error('获取城市数据失败')
  } catch (error) {
    console.error('加载城市数据失败:', error)
    ElMessage.error('加载城市数据失败')
  } finally {
    loading.value = false
  }
}

const loadCounties = async (cityId: number) => {
  loading.value = true
  try {
    const response = await fetch(`/api/cities/${cityId}/counties`)
    const data = await response.json()
    if (data.success) counties.value = data.data
    else ElMessage.error('获取旗县数据失败')
  } catch (error) {
    console.error('加载旗县数据失败:', error)
    ElMessage.error('加载旗县数据失败')
  } finally {
    loading.value = false
  }
}

const loadCountyProjects = async (countyId: number) => {
  loading.value = true
  try {
    const response = await fetch(`/api/counties/${countyId}/projects`)
    const data = await response.json()
    if (data.success) countyProjects.value = data.data
    else ElMessage.error('获取项目列表失败')
  } catch (error) {
    console.error('加载项目列表失败:', error)
    ElMessage.error('加载项目列表失败')
  } finally {
    loading.value = false
  }
}

const selectProvince = (province: {id: number, name: string, projectCount: number}) => {
  currentProvinceId.value = province.id
  currentProvinceName.value = province.name
  currentLevel.value = 1
  loadCities(province.id)
}

const selectCity = (city: {id: number, name: string, projectCount: number}) => {
  currentCityId.value = city.id
  currentCityName.value = city.name
  currentLevel.value = 2
  loadCounties(city.id)
}

const selectCounty = (county: {id: number, name: string, projectCount: number}) => {
  currentCountyId.value = county.id
  currentCountyName.value = county.name
  currentLevel.value = 3
  loadCountyProjects(county.id)
}

const goToLevel = (level: number) => {
  currentLevel.value = level
  if (level === 0) {
    currentProvinceId.value = null
    currentCityId.value = null
    currentCountyId.value = null
    currentProvinceName.value = ''
    currentCityName.value = ''
    currentCountyName.value = ''
    cities.value = []
    counties.value = []
    countyProjects.value = []
  } else if (level === 1) {
    currentCityId.value = null
    currentCountyId.value = null
    currentCityName.value = ''
    currentCountyName.value = ''
    counties.value = []
    countyProjects.value = []
  } else if (level === 2) {
    currentCountyId.value = null
    currentCountyName.value = ''
    countyProjects.value = []
  }
}

const handleBack = () => {
  if (currentLevel.value > 0) goToLevel(currentLevel.value - 1)
  else router.back()
}

onMounted(() => {
  loadProvinces()
})
</script>

<style scoped>
.project-classification-container {
  width: 100%;
  height: 100vh;
  display: flex;
  flex-direction: column;
  position: relative;
  overflow: hidden;
  background: #E4EDF2;
}

.header {
  background: rgba(255, 255, 255, 0.8);
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
  max-width: 500px;
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
  position: relative;
  overflow: hidden;
  font-size: 14px;
  font-weight: 500;
}

.logout-btn::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(244, 67, 54, 0.2), transparent);
  transition: left 0.3s ease;
}

.logout-btn:hover::before {
  left: 100%;
}

.logout-btn:hover {
  background: rgba(244, 67, 54, 0.2);
  box-shadow: 0 0 15px rgba(244, 67, 54, 0.2);
}

.main-content {
  flex: 1;
  overflow-y: auto;
  padding: 2rem;
  position: relative;
  z-index: 1;
}

.content-wrapper {
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.breadcrumb {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem 1.25rem;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.9), rgba(248, 250, 252, 0.9));
  border-radius: 12px;
  border: 1px solid rgba(100, 149, 237, 0.3);
  box-shadow: 0 3px 12px rgba(0, 0, 0, 0.1);
  margin-bottom: 2rem;
  animation: fadeInUp 0.6s ease-out;
}

.breadcrumb-item {
  color: #4169E1;
  cursor: pointer;
  transition: all 0.3s ease;
  font-weight: 500;
  font-size: 0.95rem;
  position: relative;
  padding: 0.3rem 0.75rem;
  border-radius: 6px;
}

.breadcrumb-item:hover {
  color: #1976D2;
  background: rgba(100, 149, 237, 0.15);
  transform: translateY(-2px);
  box-shadow: 0 3px 10px rgba(100, 149, 237, 0.25);
}

.breadcrumb-separator {
  color: rgba(44, 62, 80, 0.5);
  font-weight: 500;
  font-size: 1.1rem;
}

.title-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 1.5rem;
  margin-bottom: 2rem;
  padding-bottom: 1.5rem;
  border-bottom: 2px solid rgba(100, 149, 237, 0.2);
}

.title-with-count {
  display: flex;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
}

.project-total-count {
  background: linear-gradient(135deg, rgba(33, 150, 243, 0.1), rgba(25, 118, 210, 0.1));
  color: #1976D2;
  padding: 0.3rem 0.9rem;
  border-radius: 20px;
  font-size: 0.85rem;
  font-weight: 500;
  border: 1px solid rgba(33, 150, 243, 0.3);
  white-space: nowrap;
  box-shadow: 0 2px 4px rgba(33, 150, 243, 0.1);
  transition: all 0.3s ease;
}

.project-total-count:hover {
  background: linear-gradient(135deg, rgba(33, 150, 243, 0.2), rgba(25, 118, 210, 0.2));
  box-shadow: 0 4px 8px rgba(33, 150, 243, 0.2);
  transform: translateY(-1px);
}

.section-title {
  font-size: 1.8rem;
  font-weight: 700;
  color: #2c3e50;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 1rem;
  text-shadow: 0 0 15px rgba(100, 149, 237, 0.3);
  animation: fadeInUp 0.6s ease-out;
}

.title-icon {
  width: 48px;
  height: 48px;
  background: linear-gradient(135deg, #6495ED, #4169E1);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  box-shadow: 0 6px 20px rgba(100, 149, 237, 0.4);
  transition: all 0.3s ease;
}

.title-icon:hover {
  transform: scale(1.1);
  box-shadow: 0 8px 25px rgba(100, 149, 237, 0.5);
}

.title-icon svg {
  width: 24px;
  height: 24px;
}

.add-btn {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  background: linear-gradient(135deg, #4CAF50, #45a049) !important;
  border: none !important;
  border-radius: 12px !important;
  padding: 0.75rem 2rem !important;
  font-weight: 600 !important;
  font-size: 1rem !important;
  box-shadow: 0 6px 20px rgba(76, 175, 80, 0.4) !important;
  transition: all 0.3s ease !important;
  color: #fff !important;
  position: relative;
  overflow: hidden;
  animation: fadeInUp 0.6s ease-out 0.2s both;
}

.add-btn::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent);
  transition: left 0.6s ease;
}

.add-btn:hover::before {
  left: 100%;
}

.add-btn:hover {
  transform: translateY(-3px) !important;
  box-shadow: 0 8px 25px rgba(76, 175, 80, 0.5) !important;
}

.add-btn:active {
  transform: scale(0.95) !important;
}

.btn-icon {
  font-size: 1.3rem;
  font-weight: bold;
}

.loading-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 400px;
  background: rgba(255, 255, 255, 0.9);
  border-radius: 16px;
  margin-top: 2rem;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
}

.classification-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 2rem;
  margin-top: 2rem;
}

.project-list {
  display: flex;
  flex-direction: column;
  gap: 1.75rem;
  margin-top: 2rem;
}

.empty-message {
  text-align: center;
  padding: 4rem 2rem;
  color: rgba(44, 62, 80, 0.6);
  font-size: 1.25rem;
  font-weight: 500;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.9), rgba(248, 250, 252, 0.9));
  border-radius: 16px;
  border: 2px dashed rgba(100, 149, 237, 0.4);
  transition: all 0.3s ease;
  animation: fadeInUp 0.6s ease-out;
}

.empty-message:hover {
  border-color: rgba(100, 149, 237, 0.6);
  box-shadow: 0 4px 20px rgba(100, 149, 237, 0.2);
  transform: translateY(-5px);
}

.footer {
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.9), rgba(248, 250, 252, 0.9));
  backdrop-filter: blur(15px);
  border-top: 1px solid rgba(100, 149, 237, 0.3);
  padding: 1.5rem 2rem;
  text-align: center;
  color: rgba(44, 62, 80, 0.6);
  position: relative;
  z-index: 100;
  box-shadow: 0 -3px 15px rgba(0, 0, 0, 0.1);
  margin-top: 3rem;
}

.footer-content {
  display: flex;
  justify-content: center;
  align-items: center;
  font-size: 0.95rem;
}

.main-content::-webkit-scrollbar {
  width: 10px;
}

.main-content::-webkit-scrollbar-track {
  background: rgba(240, 248, 255, 0.8);
  border-radius: 5px;
}

.main-content::-webkit-scrollbar-thumb {
  background: linear-gradient(135deg, #6495ED, #4169E1);
  border-radius: 5px;
  transition: all 0.3s ease;
}

.main-content::-webkit-scrollbar-thumb:hover {
  background: linear-gradient(135deg, #4169E1, #6495ED);
  transform: scale(1.1);
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@media (max-width: 768px) {
  .main-content {
    padding: 1.5rem;
  }
  .title-row {
    flex-direction: column;
    align-items: flex-start;
    gap: 1rem;
  }
  .section-title {
    font-size: 1.5rem;
  }
  .title-icon {
    width: 40px;
    height: 40px;
  }
  .title-icon svg {
    width: 20px;
    height: 20px;
  }
  .classification-grid {
    grid-template-columns: 1fr;
    gap: 1.5rem;
  }
  .add-btn {
    padding: 0.6rem 1.5rem !important;
    font-size: 0.9rem !important;
  }
}
</style>
