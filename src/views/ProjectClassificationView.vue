<template>
  <div class="project-classification-container">
    <!-- 顶部导航 -->
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

    <!-- 主内容区 -->
    <main class="main-content">
      <div class="content-wrapper">
        <!-- 面包屑导�?-->
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
          <!-- 添加省份按钮 - 仅在全国页面显示 -->
          <el-button 
            v-if="currentLevel === 0" 
            type="primary" 
            @click="openAddProvinceDialog"
            class="add-btn"
          >
            <span class="btn-icon">+</span>
            添加省份
          </el-button>
          <!-- 添加城市按钮 - 仅在省份页面显示 -->
          <el-button 
            v-if="currentLevel === 1" 
            type="primary" 
            @click="openAddCityDialog"
            class="add-btn"
          >
            <span class="btn-icon">+</span>
            添加城市
          </el-button>
          <!-- 添加旗县按钮 - 仅在城市页面显示 -->
          <el-button 
            v-if="currentLevel === 2" 
            type="primary" 
            @click="openAddCountyDialog"
            class="add-btn"
          >
            <span class="btn-icon">+</span>
            添加旗县
          </el-button>
          <!-- 添加项目按钮 - 仅在旗县页面显示 -->
          <el-button 
            v-if="currentLevel === 3" 
            type="primary" 
            @click="openAddProjectDialog"
            class="add-btn"
          >
            <span class="btn-icon">+</span>
            添加项目
          </el-button>
        </div>

        <!-- 加载状�?-->
        <div v-if="loading" class="loading-container">
          <el-loading :fullscreen="false" text="加载�?.."></el-loading>
        </div>

        <!-- 省份列表 -->
        <div v-else-if="currentLevel === 0" class="classification-grid">
          <div
            v-for="province in provinces"
            :key="province.id"
            class="classification-card"
          >
            <div class="card-content" @click="selectProvince(province)">
              <div class="card-header">
                <h3 class="card-title">{{ province.name }}</h3>
                <span class="project-count">{{ province.projectCount || 0 }}个项目</span>
              </div>
              <div class="card-body">
                <p class="card-description">点击查看{{ province.name }}的详细分类</p>
              </div>
            </div>
            <!-- 编辑和删除按钮-->
            <div class="card-actions">
              <button class="action-btn edit-btn" @click.stop="openEditProvinceDialog(province)" title="编辑省份">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
                </svg>
              </button>
              <button class="action-btn delete-btn" @click.stop="deleteProvince(province)" title="删除省份">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                </svg>
              </button>
            </div>
          </div>
        </div>

        <!-- 城市列表 -->
        <div v-else-if="currentLevel === 1" class="classification-grid">
          <div
            v-for="city in cities"
            :key="city.id"
            class="classification-card"
            :class="{ 'hovered': hoveredCityId === city.id }"
            @mouseenter="hoveredCityId = city.id"
            @mouseleave="hoveredCityId = null"
          >
            <div class="card-content" @click="selectCity(city)">
              <div class="card-header">
                <h3 class="card-title">{{ city.name }}</h3>
                <span class="project-count">{{ city.projectCount || 0 }}个项目</span>
              </div>
              <div class="card-body">
                <p class="card-description">点击查看{{ city.name }}的详细分类</p>
              </div>
            </div>
            <!-- 编辑和删除按钮-->
            <div class="card-actions" v-if="hoveredCityId === city.id">
              <button class="action-btn edit-btn" @click.stop="openEditCityDialog(city)" title="编辑城市">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
                </svg>
              </button>
              <button class="action-btn delete-btn" @click.stop="deleteCity(city)" title="删除城市">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                </svg>
              </button>
            </div>
          </div>
        </div>

        <!-- 旗县列表 -->
        <div v-else-if="currentLevel === 2" class="classification-grid">
          <div
            v-for="county in counties"
            :key="county.id"
            class="classification-card"
          >
            <div class="card-content" @click="selectCounty(county)">
              <div class="card-header">
                <h3 class="card-title">{{ county.name }}</h3>
                <span class="project-count">{{ county.projectCount || 0 }}个项目</span>
              </div>
              <div class="card-body">
                <p class="card-description">点击查看{{ county.name }}的项目列表</p>
              </div>
            </div>
            <!-- 编辑和删除按钮-->
            <div class="card-actions">
              <button class="action-btn edit-btn" @click.stop="openEditCountyDialog(county)" title="编辑旗县">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
                </svg>
              </button>
              <button class="action-btn delete-btn" @click.stop="deleteCounty(county)" title="删除旗县">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                </svg>
              </button>
            </div>
          </div>
        </div>

        <!-- 项目列表 -->
        <div v-else-if="currentLevel === 3" class="project-list">
          <div v-if="countyProjects.length === 0" class="empty-message">
            该旗县暂无项�?          </div>
          <div
            v-for="project in countyProjects"
            :key="project.id"
            class="project-card"
          >
            <div class="project-header">
              <h3 class="project-title">{{ project.name }}</h3>
              <div class="project-actions">
                <span class="project-status" :class="getStatusClass(project.status)">{{ project.status }}</span>
                <span class="project-status" :class="getContractFeeClass(project.contractFeeStatus || '未结')">{{ getContractFeeText(project.contractFeeStatus || '未结') }}</span>
                <span class="project-status" :class="getServiceFeeClass(project.nextYearFeeStatus || '未支付')">{{ getServiceFeeText(project.nextYearFeeStatus || '未支付') }}</span>
                <button class="action-btn edit-btn" @click="openEditProjectDialog(project)" title="编辑项目">
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
                  </svg>
                </button>
                <button class="action-btn delete-btn" @click="deleteProject(project)" title="删除项目">
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                  </svg>
                </button>
              </div>
            </div>
            <p class="project-description">{{ project.description }}</p>
            <div class="project-meta">
              <span class="meta-item">
                <i class="meta-icon">📍</i>
                {{ project.provinceName }} - {{ project.cityName }} - {{ project.countyName }}
              </span>
              <span class="meta-item">
                <i class="meta-icon">💰</i>
                ¥{{ project.price?.toLocaleString() }}
              </span>
              <span class="meta-item">
                <i class="meta-icon">📅</i>
                成交时间: {{ project.dealTime }}
              </span>
            </div>
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

    <!-- 添加/编辑省份对话�?-->
    <el-dialog
      v-model="addProvinceDialogVisible"
      :title="isEditingProvince ? '编辑省份' : '添加省份'"
      width="400px"
      :close-on-click-modal="false"
    >
      <el-form :model="provinceForm" label-width="80px">
        <el-form-item label="省份名称" required>
          <el-input v-model="provinceForm.name" placeholder="请输入省份名称" />
        </el-form-item>
        <el-form-item label="省份代码" required>
          <el-input v-model="provinceForm.code" placeholder="请输入省份代码，如：110000" />
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="addProvinceDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="submitProvince" :loading="submitting">
            确定
          </el-button>
        </span>
      </template>
    </el-dialog>

    <!-- 添加城市对话�?-->
    <el-dialog
      v-model="addCityDialogVisible"
      :title="isEditingCity ? '编辑城市' : '添加城市'"
      width="400px"
    >
      <el-form :model="cityForm" :rules="cityRules" ref="cityFormRef" label-width="80px">
        <el-form-item label="城市名称" prop="name" required>
          <el-input v-model="cityForm.name" placeholder="请输入城市名称" />
        </el-form-item>
        <el-form-item label="城市代码" prop="code" required>
          <el-input v-model="cityForm.code" placeholder="请输入城市代码" />
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="addCityDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="submitCity" :loading="submitting">
            确定
          </el-button>
        </span>
      </template>
    </el-dialog>

    <!-- 添加旗县对话�?-->
    <el-dialog
      v-model="addCountyDialogVisible"
      :title="isEditingCounty ? '编辑旗县' : '添加旗县'"
      width="400px"
      :close-on-click-modal="false"
    >
      <el-form :model="countyForm" label-width="80px">
        <el-form-item label="旗县名称" required>
          <el-input v-model="countyForm.name" placeholder="请输入旗县名称" />
        </el-form-item>
        <el-form-item label="旗县代码" required>
          <el-input v-model="countyForm.code" placeholder="请输入旗县代码，如：110101" />
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="addCountyDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="submitAddCounty" :loading="submitting">
            确定
          </el-button>
        </span>
      </template>
    </el-dialog>

    <!-- 添加项目对话�?-->
    <el-dialog
      v-model="addProjectDialogVisible"
      :title="isEditingProject ? '编辑项目' : '添加项目'"
      width="500px"
      :close-on-click-modal="false"
    >
      <el-form :model="projectForm" label-width="100px">
        <el-form-item label="项目名称" required>
          <el-input v-model="projectForm.name" placeholder="请输入项目名称" />
        </el-form-item>
        <el-form-item label="项目描述" required>
          <el-input type="textarea" v-model="projectForm.description" placeholder="请输入项目描述" :rows="3" />
        </el-form-item>
        <el-form-item label="项目状态" required>
          <el-select v-model="projectForm.status" placeholder="请选择项目状态">
            <el-option label="进行中" value="进行中" />
            <el-option label="已完成" value="已完成" />
            <el-option label="已取消" value="已取消" />
          </el-select>
        </el-form-item>
        <el-form-item label="项目价格" required>
          <el-input v-model.number="projectForm.price" type="number" placeholder="请输入项目价格" />
        </el-form-item>
        <el-form-item label="成交时间" required>
          <el-date-picker v-model="projectForm.dealTime" type="date" placeholder="请选择成交时间" style="width: 100%" />
        </el-form-item>
        <el-form-item label="服务结束时间" required>
          <el-date-picker v-model="projectForm.serviceEndTime" type="date" placeholder="请选择服务结束时间" style="width: 100%" />
        </el-form-item>
        <el-form-item label="次年费用状态" required>
          <el-select v-model="projectForm.nextYearFeeStatus" placeholder="请选择次年费用状态">
            <el-option label="已支付" value="已支付" />
            <el-option label="未支付" value="未支付" />
          </el-select>
        </el-form-item>
        <el-form-item label="合同费用状态" required>
          <el-select v-model="projectForm.contractFeeStatus" placeholder="请选择合同费用状态">
            <el-option label="未结" value="未结" />
            <el-option label="结清" value="结清" />
            <el-option label="未结算" value="未结算" />
          </el-select>
        </el-form-item>
        <el-form-item label="剩余金额" required v-if="projectForm.contractFeeStatus === '未结算'">
          <el-input v-model.number="projectForm.remainingAmount" type="number" placeholder="请输入剩余金额" />
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="addProjectDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="submitAddProject" :loading="submitting">
            确定
          </el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import api from '../services/api'

const router = useRouter()

// 当前层级�?-全国�?-省份�?-城市�?-旗县
const currentLevel = ref(0)
const currentProvinceId = ref<number | null>(null)
const currentCityId = ref<number | null>(null)
const currentCountyId = ref<number | null>(null)
const currentProvinceName = ref('')
const currentCityName = ref('')
const currentCountyName = ref('')
const loading = ref(false)

// 页面标题
const pageTitle = computed(() => {
  switch (currentLevel.value) {
    case 0:
      return '全国成交项目区划'
    case 1:
      return `${currentProvinceName.value} - 市级分类`
    case 2:
      return `${currentCityName.value} - 旗县分类`
    case 3:
      return `${currentCountyName.value} - 项目列表`
    default:
      return '项目分类'
  }
})

// 计算属性：项目总数
const totalProjectCount = computed(() => {
  switch (currentLevel.value) {
    case 0: // 全国
      return provinces.value.reduce((sum, province) => sum + (province.projectCount || 0), 0)
    case 1: // 省份
      return cities.value.reduce((sum, city) => sum + (city.projectCount || 0), 0)
    case 2: // 城市
      return counties.value.reduce((sum, county) => sum + (county.projectCount || 0), 0)
    case 3: // 旗县
      return countyProjects.value.length
    default:
      return 0
  }
})

// 数据列表
const provinces = ref<Array<{id: number, name: string, code: string, projectCount: number}>>([])
const cities = ref<Array<{id: number, name: string, code: string, projectCount: number}>>([])
const counties = ref<Array<{id: number, name: string, code: string, projectCount: number}>>([])
const countyProjects = ref<Array<any>>([])

// 悬停状�?const hoveredProvinceId = ref<number | null>(null)
const hoveredCityId = ref<number | null>(null)
const hoveredCountyId = ref<number | null>(null)

// 添加省份对话�?const addProvinceDialogVisible = ref(false)
const isEditingProvince = ref(false)
const submitting = ref(false)
const provinceForm = ref({
  id: '',
  name: '',
  code: ''
})

// 打开添加省份对话框
const openAddProvinceDialog = () => {
  isEditingProvince.value = false
  provinceForm.value = { id: '', name: '', code: '' }
  addProvinceDialogVisible.value = true
}

// 打开编辑省份对话框
const openEditProvinceDialog = (province: any) => {
  isEditingProvince.value = true
  provinceForm.value = {
    id: province.id.toString(),
    name: province.name,
    code: province.code
  }
  addProvinceDialogVisible.value = true
}

// 提交省份（添加或编辑）
const submitProvince = async () => {
  if (!provinceForm.value.name.trim()) {
    ElMessage.warning('请输入省份名称')
    return
  }
  if (!provinceForm.value.code.trim()) {
    ElMessage.warning('请输入省份代码')
    return
  }
  
  submitting.value = true
  try {
    const url = isEditingProvince.value && provinceForm.value.id 
      ? `http://localhost:3005/api/provinces/${provinceForm.value.id}` 
      : 'http://localhost:3005/api/provinces'
    
    const response = await fetch(url, {
      method: isEditingProvince.value ? 'PUT' : 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: provinceForm.value.name.trim(),
        code: provinceForm.value.code.trim()
      })
    })
    const data = await response.json()
    if (data.success) {
      ElMessage.success(isEditingProvince.value ? '省份编辑成功' : '省份添加成功')
      addProvinceDialogVisible.value = false
      // 刷新省份列表
      await loadProvinces()
    } else {
      ElMessage.error(data.message || (isEditingProvince.value ? '编辑省份失败' : '添加省份失败'))
    }
  } catch (error) {
    console.error(isEditingProvince.value ? '编辑省份失败:' : '添加省份失败:', error)
    ElMessage.error(isEditingProvince.value ? '编辑省份失败' : '添加省份失败')
  } finally {
    submitting.value = false
  }
}

// 添加城市对话�?const addCityDialogVisible = ref(false)
const isEditingCity = ref(false)
const cityForm = ref({
  id: '',
  name: '',
  code: ''
})

// 城市表单验证规则
const cityRules = {
    name: [
      { required: true, message: '请输入城市名称', trigger: 'blur' }
    ],
    code: [
      { required: true, message: '请输入城市代码', trigger: 'blur' }
    ]
}

// 城市表单引用
const cityFormRef = ref()

// 打开添加城市对话框
const openAddCityDialog = () => {
  isEditingCity.value = false
  cityForm.value = { id: '', name: '', code: '' }
  addCityDialogVisible.value = true
}

// 打开编辑城市对话框
const openEditCityDialog = (city: any) => {
  isEditingCity.value = true
  cityForm.value = {
    id: city.id.toString(),
    name: String(city.name),
    code: String(city.code)
  }
  addCityDialogVisible.value = true
}

// 提交城市（添加或编辑）
const submitCity = async () => {
  if (!cityFormRef.value) {
    ElMessage.warning('表单引用无效')
    return
  }
  
  // 执行表单验证
  await cityFormRef.value.validate(async (valid: boolean) => {
    if (!valid) {
        ElMessage.warning('表单验证失败，请检查输入')
        return
      }
    
    console.log('开始提交城市数据', {
      isEditing: isEditingCity.value,
      cityForm: cityForm.value,
      provinceId: currentProvinceId.value
    })
    
    submitting.value = true
    try {
      const data = {
        name: cityForm.value.name.trim(),
        code: cityForm.value.code.trim(),
        provinceId: currentProvinceId.value
      }
      
      console.log('准备发送的数据:', data)
      
      // 使用相对路径，避免端口重定向问题
      const url = isEditingCity.value && cityForm.value.id 
        ? `/api/cities/${cityForm.value.id}` 
        : '/api/cities'
      
      console.log('请求URL:', url)
      console.log('请求方法:', isEditingCity.value ? 'PUT' : 'POST')
      console.log('当前页面URL:', window.location.href)
      
      // 使用fetch直接发送请求，以便更好地控制请求过程
      console.log('开始发送请求..')
      const fetchResponse = await fetch(url, {
        method: isEditingCity.value ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      })
      
      console.log('响应状态', fetchResponse.status)
      console.log('响应状态文本', fetchResponse.statusText)
      console.log('响应URL:', fetchResponse.url)
      
      // 检查响应是否为JSON
      const contentType = fetchResponse.headers.get('content-type')
      console.log('响应Content-Type:', contentType)
      
      // 输出所有响应头
      console.log('响应头', Object.fromEntries(fetchResponse.headers.entries()))
      
      let result
      if (contentType && contentType.includes('application/json')) {
        result = await fetchResponse.json()
        console.log('响应数据:', result)
      } else {
        const text = await fetchResponse.text()
        console.log('响应文本:', text)
        // 尝试解析响应文本，看看是否包含HTML或其他信息
        if (text.includes('<html')) {
          console.log('响应是HTML页面，可能是错误页面')
          // 尝试提取HTML中的错误信息
          const match = text.match(/<title>(.*?)<\/title>/)
          if (match) {
            console.log('HTML标题:', match[1])
          }
        }
        result = { success: false, message: '响应不是JSON格式' }
      }
      
      if (result.success) {
        ElMessage.success(isEditingCity.value ? '城市编辑成功' : '城市添加成功')
        addCityDialogVisible.value = false
        // 刷新城市列表
        await loadCities(currentProvinceId.value!)
      } else {
        console.error('API返回错误:', result.message)
        ElMessage.error(result.message || (isEditingCity.value ? '编辑城市失败' : '添加城市失败'))
      }
    } catch (error) {
      console.error(isEditingCity.value ? '编辑城市失败:' : '添加城市失败:', error)
      ElMessage.error(isEditingCity.value ? '编辑城市失败' : '添加城市失败')
    } finally {
      submitting.value = false
    }
  })
}

// 添加旗县对话框
const addCountyDialogVisible = ref(false)
const isEditingCounty = ref(false)
const countyForm = ref({
  id: '',
  name: '',
  code: ''
})

// 打开添加旗县对话框
const openAddCountyDialog = () => {
  isEditingCounty.value = false
  countyForm.value = { id: '', name: '', code: '' }
  addCountyDialogVisible.value = true
}

// 打开编辑旗县对话框
const openEditCountyDialog = (county: {id: number, name: string, code: string}) => {
  isEditingCounty.value = true
  countyForm.value = { id: county.id.toString(), name: county.name, code: county.code }
  addCountyDialogVisible.value = true
}

// 提交添加旗县
const submitAddCounty = async () => {
  if (!countyForm.value.name.trim()) {
    ElMessage.warning('请输入旗县名称')
    return
  }
  if (!countyForm.value.code.trim()) {
    ElMessage.warning('请输入旗县代码')
    return
  }
  if (!currentCityId.value) {
    ElMessage.error('当前城市ID无效')
    return
  }
  
  submitting.value = true
  try {
    const url = isEditingCounty.value && countyForm.value.id 
      ? `http://localhost:3005/api/counties/${countyForm.value.id}` 
      : 'http://localhost:3005/api/counties'
    
    const response = await fetch(url, {
      method: isEditingCounty.value ? 'PUT' : 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: countyForm.value.name.trim(),
        code: countyForm.value.code.trim(),
        cityId: currentCityId.value
      })
    })
    const data = await response.json()
    if (data.success) {
      ElMessage.success(isEditingCounty.value ? '旗县编辑成功' : '旗县添加成功')
      addCountyDialogVisible.value = false
      // 刷新旗县列表
      if (currentCityId.value) {
        await loadCounties(currentCityId.value)
      }
    } else {
      ElMessage.error(data.message || (isEditingCounty.value ? '编辑旗县失败' : '添加旗县失败'))
    }
  } catch (error) {
    console.error(isEditingCounty.value ? '编辑旗县失败:' : '添加旗县失败:', error)
    ElMessage.error(isEditingCounty.value ? '编辑旗县失败' : '添加旗县失败')
  } finally {
    submitting.value = false
  }
}

// 删除旗县
const deleteCounty = async (county: {id: number, name: string}) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除旗�?"${county.name}" 吗？删除后该旗县下的所有项目也将被删除。`,
      '确认删除',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    const response = await fetch(`http://localhost:3005/api/counties/${county.id}`, {
      method: 'DELETE'
    })
    const data = await response.json()
    if (data.success) {
      ElMessage.success('旗县删除成功')
      // 刷新旗县列表
      if (currentCityId.value) {
        await loadCounties(currentCityId.value)
      }
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

// 添加项目对话框
const addProjectDialogVisible = ref(false)
const isEditingProject = ref(false)
const projectForm = ref({
  id: '',
  name: '',
  description: '',
  status: '进行中',
  price: 0,
  dealTime: '',
  serviceEndTime: '',
  nextYearFeeStatus: '待确认',
  contractFeeStatus: '未结',
  remainingAmount: 0
})

// 打开添加项目对话框
const openAddProjectDialog = () => {
  isEditingProject.value = false
  projectForm.value = {
    id: '',
    name: '',
    description: '',
    status: '进行中',
    price: 0,
    dealTime: '',
    serviceEndTime: '',
    nextYearFeeStatus: '待确认',
    contractFeeStatus: '未结',
    remainingAmount: 0
  }
  addProjectDialogVisible.value = true
}

// 打开编辑项目对话框
const openEditProjectDialog = (project: any) => {
  isEditingProject.value = true
  projectForm.value = {
    id: project.id.toString(),
    name: project.name,
    description: project.description,
    status: project.status,
    price: project.price,
    dealTime: project.dealTime,
    serviceEndTime: project.serviceEndTime,
    nextYearFeeStatus: project.nextYearFeeStatus,
    contractFeeStatus: project.contractFeeStatus || '未结',
    remainingAmount: project.remainingAmount || 0
  }
  addProjectDialogVisible.value = true
}

// 提交添加项目
const submitAddProject = async () => {
  if (!projectForm.value.name.trim()) {
    ElMessage.warning('请输入项目名称')
    return
  }
  if (!projectForm.value.description.trim()) {
    ElMessage.warning('请输入项目描述')
    return
  }
  if (!currentCountyId.value) {
    ElMessage.error('当前旗县ID无效')
    return
  }
  
  submitting.value = true
  try {
    const url = isEditingProject.value && projectForm.value.id 
      ? `http://localhost:3005/api/closing-projects/${projectForm.value.id}` 
      : 'http://localhost:3005/api/closing-projects'
    
    console.log('提交项目数据:', {
      name: projectForm.value.name.trim(),
      description: projectForm.value.description.trim(),
      status: projectForm.value.status,
      price: projectForm.value.price,
      dealTime: projectForm.value.dealTime,
      serviceEndTime: projectForm.value.serviceEndTime,
      nextYearFeeStatus: projectForm.value.nextYearFeeStatus,
      contractFeeStatus: projectForm.value.contractFeeStatus,
      remainingAmount: projectForm.value.remainingAmount,
      provinceId: currentProvinceId.value,
      cityId: currentCityId.value,
      countyId: currentCountyId.value
    })
    
    const response = await fetch(url, {
      method: isEditingProject.value ? 'PUT' : 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        id: projectForm.value.id,
        name: projectForm.value.name.trim(),
        description: projectForm.value.description.trim(),
        status: projectForm.value.status,
        price: projectForm.value.price,
        dealTime: projectForm.value.dealTime,
        serviceEndTime: projectForm.value.serviceEndTime,
        nextYearFeeStatus: projectForm.value.nextYearFeeStatus,
        contractFeeStatus: projectForm.value.contractFeeStatus,
        remainingAmount: projectForm.value.remainingAmount,
        provinceId: currentProvinceId.value,
        cityId: currentCityId.value,
        countyId: currentCountyId.value
      })
    })
    
    console.log('API响应状�?', response.status)
    const data = await response.json()
    console.log('API响应数据:', data)
    
    if (data.success) {
      ElMessage.success(isEditingProject.value ? '项目编辑成功' : '项目添加成功')
      addProjectDialogVisible.value = false
      // 刷新项目列表
      if (currentCountyId.value) {
        await loadCountyProjects(currentCountyId.value)
      }
    } else {
      ElMessage.error(data.message || (isEditingProject.value ? '编辑项目失败' : '添加项目失败'))
    }
  } catch (error) {
    console.error(isEditingProject.value ? '编辑项目失败:' : '添加项目失败:', error)
    ElMessage.error(isEditingProject.value ? '编辑项目失败' : '添加项目失败')
  } finally {
    submitting.value = false
  }
}

// 删除项目
const deleteProject = async (project: {id: number, name: string}) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除项�?"${project.name}" 吗？`,
      '确认删除',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    const response = await fetch(`http://localhost:3005/api/closing-projects/${project.id}`, {
      method: 'DELETE'
    })
    const data = await response.json()
    if (data.success) {
      ElMessage.success('项目删除成功')
      // 刷新项目列表
      if (currentCountyId.value) {
        await loadCountyProjects(currentCountyId.value)
      }
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



// 删除城市
const deleteCity = async (city: {id: number, name: string}) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除城�?"${city.name}" 吗？删除后该城市下的所有旗县和项目也将被删除。`,
      '确认删除',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    const response = await fetch(`http://localhost:3005/api/cities/${city.id}`, {
      method: 'DELETE'
    })
    const data = await response.json()
    if (data.success) {
      ElMessage.success('城市删除成功')
      // 刷新城市列表
      if (currentProvinceId.value) {
        await loadCities(currentProvinceId.value)
      }
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

// 删除省份
const deleteProvince = async (province: {id: number, name: string}) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除省�?"${province.name}" 吗？删除后该省份下的所有城市、旗县和项目也将被删除。`,
      '确认删除',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    const response = await fetch(`http://localhost:3005/api/provinces/${province.id}`, {
      method: 'DELETE'
    })
    const data = await response.json()
    if (data.success) {
      ElMessage.success('省份删除成功')
      // 刷新省份列表
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

// 加载省份数据
const loadProvinces = async () => {
  loading.value = true
  try {
    const response = await fetch('http://localhost:3005/api/provinces')
    const data = await response.json()
    if (data.success) {
      provinces.value = data.data
    } else {
      ElMessage.error('获取省份数据失败')
    }
  } catch (error) {
    console.error('加载省份数据失败:', error)
    ElMessage.error('加载省份数据失败')
  } finally {
    loading.value = false
  }
}

// 加载城市数据
const loadCities = async (provinceId: number) => {
  loading.value = true
  try {
    const response = await fetch(`http://localhost:3005/api/provinces/${provinceId}/cities`)
    const data = await response.json()
    if (data.success) {
      cities.value = data.data
    } else {
      ElMessage.error('获取城市数据失败')
    }
  } catch (error) {
    console.error('加载城市数据失败:', error)
    ElMessage.error('加载城市数据失败')
  } finally {
    loading.value = false
  }
}

// 加载旗县数据
const loadCounties = async (cityId: number) => {
  loading.value = true
  try {
    const response = await fetch(`http://localhost:3005/api/cities/${cityId}/counties`)
    const data = await response.json()
    if (data.success) {
      counties.value = data.data
    } else {
      ElMessage.error('获取旗县数据失败')
    }
  } catch (error) {
    console.error('加载旗县数据失败:', error)
    ElMessage.error('加载旗县数据失败')
  } finally {
    loading.value = false
  }
}

// 加载旗县项目
const loadCountyProjects = async (countyId: number) => {
  loading.value = true
  try {
    const response = await fetch(`http://localhost:3005/api/counties/${countyId}/projects`)
    const data = await response.json()
    if (data.success) {
      countyProjects.value = data.data
    } else {
      ElMessage.error('获取项目列表失败')
    }
  } catch (error) {
    console.error('加载项目列表失败:', error)
    ElMessage.error('加载项目列表失败')
  } finally {
    loading.value = false
  }
}

// 选择省份
const selectProvince = (province: {id: number, name: string, projectCount: number}) => {
  currentProvinceId.value = province.id
  currentProvinceName.value = province.name
  currentLevel.value = 1
  loadCities(province.id)
}

// 选择城市
const selectCity = (city: {id: number, name: string, projectCount: number}) => {
  currentCityId.value = city.id
  currentCityName.value = city.name
  currentLevel.value = 2
  loadCounties(city.id)
}

// 选择旗县
const selectCounty = (county: {id: number, name: string, projectCount: number}) => {
  currentCountyId.value = county.id
  currentCountyName.value = county.name
  currentLevel.value = 3
  loadCountyProjects(county.id)
}

// 返回指定层级
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

// 获取状态样式类
const getStatusClass = (status: string) => {
  switch (status) {
    case '进行中':
      return 'status-progress'
    case '已完成':
      return 'status-completed'
    case '已取消':
      return 'status-cancelled'
    default:
      return ''
  }
}

// 合同费用状态处理
const getContractFeeClass = (status: string) => {
  switch (status) {
    case '结清':
      return 'status-contract-paid'
    case '未结':
      return 'status-contract-partial'
    case '未结算':
      return 'status-contract-unpaid'
    default:
      return 'status-contract-unpaid'
  }
}

const getContractFeeText = (status: string) => {
  return `合同费用：${status}`
}

// 服务费状态处理（根据次年费用状态计算）
const getServiceFeeClass = (nextYearFeeStatus: string) => {
  if (nextYearFeeStatus === '已支付') {
    return 'status-service-active'
  } else {
    return 'status-service-expired'
  }
}

const getServiceFeeText = (nextYearFeeStatus: string) => {
  if (nextYearFeeStatus === '已支付') {
    return '服务费：未到期'
  } else {
    return '服务费：已到期'
  }
}

const handleBack = () => {
  if (currentLevel.value > 0) {
    goToLevel(currentLevel.value - 1)
  } else {
    router.back()
  }
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

/* 顶部导航 */
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

/* 主内容区 */
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

/* 面包屑导�?*/
.breadcrumb {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  background: rgba(255, 255, 255, 0.8);
  border-radius: 8px;
  border: 1px solid rgba(100, 149, 237, 0.3);
}

.breadcrumb-item {
  color: #6495ED;
  cursor: pointer;
  transition: all 0.3s ease;
  font-weight: 500;
}

.breadcrumb-item:hover {
  color: #4169E1;
  text-decoration: underline;
}

.breadcrumb-separator {
  color: rgba(51, 51, 51, 0.4);
}

/* 标题�?*/
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

/* 标题 */
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

/* 标题图标 */
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

/* 添加按钮样式 */
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

/* 卡片操作按钮容器 */
.card-actions {
  position: absolute;
  top: 1.25rem;
  right: 1.25rem;
  display: flex;
  gap: 0.75rem;
  z-index: 10;
  opacity: 0;
  transition: all 0.3s ease;
  transform: translateY(-10px);
}

.classification-card:hover .card-actions {
  opacity: 1;
  transform: translateY(0);
}

/* 项目操作按钮容器 */
.project-actions {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
  justify-content: flex-end;
}

/* 通用操作按钮样式 */
.action-btn {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
  box-shadow: 0 3px 12px rgba(0, 0, 0, 0.15);
  font-size: 18px;
  position: relative;
  overflow: hidden;
}

.action-btn::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent);
  transition: left 0.5s ease;
}

.action-btn:hover::before {
  left: 100%;
}

.action-btn.edit-btn {
  background: linear-gradient(135deg, #6495ED, #4169E1);
  color: white;
}

.action-btn.edit-btn:hover {
  transform: scale(1.1);
  box-shadow: 0 5px 15px rgba(100, 149, 237, 0.4);
}

.action-btn.delete-btn {
  background: linear-gradient(135deg, #f44336, #d32f2f);
  color: white;
}

.action-btn.delete-btn:hover {
  transform: scale(1.1);
  box-shadow: 0 5px 15px rgba(244, 67, 54, 0.4);
}

.action-btn svg {
  width: 20px;
  height: 20px;
  z-index: 1;
  position: relative;
}

/* 加载状�?*/
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

/* 分类网格 */
.classification-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 2rem;
  margin-top: 2rem;
}

.classification-card {
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.95), rgba(248, 250, 252, 0.95));
  border: 1px solid rgba(100, 149, 237, 0.25);
  border-radius: 16px;
  padding: 2rem;
  backdrop-filter: blur(10px);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.12);
  transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  cursor: pointer;
  position: relative;
  overflow: hidden;
  animation: fadeInUp 0.6s ease-out;
}

.classification-card::before {
  content: '';
  position: absolute;
  top: -2px;
  left: -2px;
  right: -2px;
  bottom: -2px;
  background: linear-gradient(45deg, #6495ED, #87CEEB, #6495ED, #87CEEB);
  border-radius: 18px;
  z-index: -1;
  opacity: 0;
  transition: opacity 0.4s ease;
  animation: borderGlow 4s linear infinite;
  background-size: 300% 300%;
}

.classification-card:hover::before {
  opacity: 1;
}

.classification-card:hover {
  transform: translateY(-8px) scale(1.02);
  box-shadow: 0 12px 30px rgba(100, 149, 237, 0.35);
  border-color: rgba(100, 149, 237, 0.6);
}

.card-content {
  flex: 1;
  cursor: pointer;
  position: relative;
  z-index: 1;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.card-header {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1.25rem;
  position: relative;
  z-index: 1;
}

.card-title {
  font-size: 1.4rem;
  font-weight: 600;
  color: #2c3e50;
  margin: 0;
  line-height: 1.3;
}

.project-count {
  background: linear-gradient(135deg, #6495ED, #4169E1);
  color: #fff;
  padding: 0.3rem 0.9rem;
  border-radius: 20px;
  font-size: 0.85rem;
  font-weight: 500;
  box-shadow: 0 2px 8px rgba(100, 149, 237, 0.3);
  transition: all 0.3s ease;
  white-space: nowrap;
}

.project-count:hover {
  transform: scale(1.05);
  box-shadow: 0 5px 15px rgba(100, 149, 237, 0.4);
}

.card-body {
  color: rgba(44, 62, 80, 0.7);
  position: relative;
  z-index: 1;
  flex: 1;
  display: flex;
  align-items: center;
}

.card-description {
  margin: 0;
  font-size: 1.05rem;
  line-height: 1.6;
}

/* 项目列表 */
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

.project-card {
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.95), rgba(248, 250, 252, 0.95));
  border: 1px solid rgba(100, 149, 237, 0.25);
  border-radius: 16px;
  padding: 2rem;
  backdrop-filter: blur(10px);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.12);
  transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  position: relative;
  overflow: hidden;
  animation: fadeInUp 0.6s ease-out;
}

.project-card::before {
  content: '';
  position: absolute;
  top: -2px;
  left: -2px;
  right: -2px;
  bottom: -2px;
  background: linear-gradient(45deg, #6495ED, #87CEEB, #6495ED, #87CEEB);
  border-radius: 18px;
  z-index: -1;
  opacity: 0;
  transition: opacity 0.4s ease;
  animation: borderGlow 4s linear infinite;
  background-size: 300% 300%;
}

.project-card:hover::before {
  opacity: 1;
}

.project-card:hover {
  transform: translateY(-6px) scale(1.01);
  box-shadow: 0 12px 30px rgba(100, 149, 237, 0.35);
  border-color: rgba(100, 149, 237, 0.6);
}

.project-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1.25rem;
  flex-wrap: wrap;
  gap: 1rem;
  position: relative;
  z-index: 1;
}

.project-title {
  font-size: 1.5rem;
  font-weight: 600;
  color: #2c3e50;
  margin: 0;
  flex: 1;
  line-height: 1.3;
  min-width: 200px;
}

.project-status {
  padding: 0.45rem 1.25rem;
  border-radius: 25px;
  font-size: 0.95rem;
  font-weight: 500;
  box-shadow: 0 3px 10px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
}

.project-status:hover {
  transform: scale(1.05);
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.15);
}

.status-progress {
  background: linear-gradient(135deg, rgba(255, 193, 7, 0.2), rgba(255, 152, 0, 0.2));
  color: #e65100;
  border: 1px solid rgba(255, 193, 7, 0.4);
}

.status-completed {
  background: linear-gradient(135deg, rgba(76, 175, 80, 0.2), rgba(67, 160, 71, 0.2));
  color: #2e7d32;
  border: 1px solid rgba(76, 175, 80, 0.4);
}

.status-cancelled {
  background: linear-gradient(135deg, rgba(244, 67, 54, 0.2), rgba(211, 47, 47, 0.2));
  color: #c62828;
  border: 1px solid rgba(244, 67, 54, 0.4);
}

/* 合同费用状态样�?*/
.status-contract-paid {
  background: linear-gradient(135deg, rgba(76, 175, 80, 0.2), rgba(67, 160, 71, 0.2));
  color: #2e7d32;
  border: 1px solid rgba(76, 175, 80, 0.4);
}

.status-contract-partial {
  background: linear-gradient(135deg, rgba(255, 193, 7, 0.2), rgba(255, 152, 0, 0.2));
  color: #e65100;
  border: 1px solid rgba(255, 193, 7, 0.4);
}

.status-contract-unpaid {
  background: linear-gradient(135deg, rgba(244, 67, 54, 0.2), rgba(211, 47, 47, 0.2));
  color: #c62828;
  border: 1px solid rgba(244, 67, 54, 0.4);
}

/* 服务费状态样�?*/
.status-service-active {
  background: linear-gradient(135deg, rgba(76, 175, 80, 0.2), rgba(67, 160, 71, 0.2));
  color: #2e7d32;
  border: 1px solid rgba(76, 175, 80, 0.4);
}

.status-service-expired {
  background: linear-gradient(135deg, rgba(244, 67, 54, 0.2), rgba(211, 47, 47, 0.2));
  color: #c62828;
  border: 1px solid rgba(244, 67, 54, 0.4);
}

.project-description {
  color: rgba(44, 62, 80, 0.7);
  margin: 0 0 1.25rem 0;
  line-height: 1.6;
  font-size: 1.05rem;
  position: relative;
  z-index: 1;
}

.project-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 1.25rem;
  padding-top: 1.25rem;
  border-top: 1px solid rgba(100, 149, 237, 0.25);
  position: relative;
  z-index: 1;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  color: rgba(44, 62, 80, 0.7);
  font-size: 0.95rem;
  background: rgba(248, 250, 252, 0.8);
  padding: 0.6rem 1.2rem;
  border-radius: 10px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  transition: all 0.3s ease;
}

.meta-item:hover {
  background: rgba(240, 244, 255, 0.9);
  box-shadow: 0 4px 15px rgba(100, 149, 237, 0.2);
  transform: translateY(-3px);
  color: rgba(44, 62, 80, 0.9);
}

.meta-icon {
  font-style: normal;
  font-size: 1.1rem;
  color: #6495ED;
}

/* 页脚 */
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

/* 滚动条样�?*/
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

/* 动画 */
@keyframes borderGlow {
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
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

/* 卡片动画延迟 */
.classification-card:nth-child(1) { animation-delay: 0.1s; }
.classification-card:nth-child(2) { animation-delay: 0.2s; }
.classification-card:nth-child(3) { animation-delay: 0.3s; }
.classification-card:nth-child(4) { animation-delay: 0.4s; }
.classification-card:nth-child(5) { animation-delay: 0.5s; }
.classification-card:nth-child(6) { animation-delay: 0.6s; }

.project-card:nth-child(1) { animation-delay: 0.1s; }
.project-card:nth-child(2) { animation-delay: 0.2s; }
.project-card:nth-child(3) { animation-delay: 0.3s; }
.project-card:nth-child(4) { animation-delay: 0.4s; }
.project-card:nth-child(5) { animation-delay: 0.5s; }

/* 响应式设�?*/
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
  
  .classification-card,
  .project-card {
    padding: 1.5rem;
  }
  
  .project-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.75rem;
  }
  
  .project-actions {
    width: 100%;
    justify-content: space-between;
  }
  
  .project-meta {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.75rem;
  }
  
  .meta-item {
    width: 100%;
    justify-content: space-between;
  }
  
  .add-btn {
    padding: 0.6rem 1.5rem !important;
    font-size: 0.9rem !important;
  }
  
  .card-title {
    font-size: 1.2rem;
  }
  
  .project-title {
    font-size: 1.3rem;
  }
}

/* 面包屑导航增�?*/
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
</style>
