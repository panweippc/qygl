<template>
  <div class="county-detail-container">
    <!-- 顶部导航 -->
    <header class="header">
      <div class="logo">
        <span class="logo-text">宏友软件</span>
        <div class="logo-glow"></div>
      </div>
      <nav class="nav">
        <router-link to="/" class="nav-item">首页</router-link>
        <router-link to="/sales-funnel" class="nav-item">销售漏斗</router-link>
        <router-link :to="`/city-sales/${encodeURIComponent(cityName)}`" class="nav-item">返回盟市</router-link>
        <button class="nav-item logout-btn" @click="handleBack">返回</button>
      </nav>
    </header>

    <!-- 主内容区 -->
    <main class="main-content">
      <div class="content-wrapper">
        <h2 class="section-title">
          <span class="title-icon">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 3H5C3.9 3 3 3.9 3 5V19C3 20.1 3.9 21 5 21H19C20.1 21 21 20.1 21 19V5C21 3.9 20.1 3 19 3ZM9 17H7V10H9V17ZM13 17H11V7H13V17ZM17 17H15V13H17V17Z"/>
            </svg>
          </span>
          {{ countyName }}详细信息
        </h2>

        <!-- 旗县基本信息卡片 -->
        <div class="county-info-card">
          <h3 class="card-title">{{ countyName }}基本信息</h3>
          <div class="card-stats">
            <div class="stat-item">
              <span class="stat-value">{{ countyData.customers }}</span>
              <span class="stat-label">客户数</span>
            </div>
            <div class="stat-item">
              <span class="stat-value">{{ countyData.dealCustomers }}</span>
              <span class="stat-label">成交客户数</span>
            </div>
          </div>
        </div>

        <!-- 乡镇详细信息 -->
        <div class="town-section">
          <div class="section-header">
            <h3 class="section-subtitle">乡镇详细信息</h3>
            <div class="filter-add-container">
              <input 
                type="text" 
                v-model="managerFilter" 
                placeholder="按负责人筛选"
                class="filter-input"
              >
              <button class="add-btn" @click="openAddModal">添加乡镇</button>
            </div>
          </div>
          <div class="town-list">
            <div v-for="town in filteredTownData" :key="town.name" class="town-card">
              <div class="town-header">
                <router-link :to="`/town-detail/${encodeURIComponent(cityName)}/${encodeURIComponent(countyName)}/${encodeURIComponent(town.name)}`" class="town-name-link">
                  <h4 class="town-name">{{ town.name }}</h4>
                </router-link>
                <div class="town-actions">
                  <span class="intention-level" :class="getIntentionClass(town.intention)">{{ getIntentionText(town.intention) }}</span>
                  <span class="deal-status" :class="getDealStatusClass(town.isDealed)">{{ getDealStatusText(town.isDealed) }}</span>
                  <button class="action-btn edit-btn" @click="openEditModal(town)">编辑</button>
                  <button class="action-btn delete-btn" @click="deleteTown(town.id)">删除</button>
                </div>
              </div>
              <div class="town-details">
                <div class="detail-item">
                  <span class="detail-label">联系人:</span>
                  <span class="detail-value">{{ town.contactPerson }}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">联系电话:</span>
                  <span class="detail-value">{{ town.contactPhone }}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">负责人</span>
                  <span class="detail-value">{{ town.manager || '-' }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>

    <!-- 模态框 -->
    <div v-if="showModal" class="modal">
      <div class="modal-content">
        <div class="modal-header">
          <h3>{{ isEditMode ? '编辑乡镇' : '添加乡镇' }}</h3>
          <button class="close-btn" @click="showModal = false">&times;</button>
        </div>
        <div class="modal-body">
          <form @submit.prevent="submitForm" class="beautified-form">
            <div class="form-row">
              <div class="form-group">
                <label for="name">乡镇名称</label>
                <input type="text" id="name" v-model="formData.name" required class="form-input">
              </div>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label for="contactPerson">联系人</label>
                <input type="text" id="contactPerson" v-model="formData.contactPerson" required class="form-input">
              </div>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label for="contactPhone">联系电话</label>
                <input type="text" id="contactPhone" v-model="formData.contactPhone" required class="form-input">
              </div>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label for="manager">负责人</label>
                <input type="text" id="manager" v-model="formData.manager" required class="form-input">
              </div>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label for="intention">意向程度</label>
                <select id="intention" v-model="formData.intention" required class="form-select">
                  <option value="0">无</option>
                  <option value="30">模糊</option>
                  <option value="70">有一定</option>
                  <option value="90">很有意向</option>
                </select>
              </div>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label for="isDealed">成交状态</label>
                <select id="isDealed" v-model="formData.isDealed" required class="form-select">
                  <option value="false">未成交</option>
                  <option value="true">已成交</option>
                </select>
              </div>
            </div>

            <div class="form-actions">
              <button type="button" class="cancel-btn" @click="showModal = false">取消</button>
              <button type="submit" class="submit-btn">{{ isEditMode ? '更新' : '添加' }}</button>
            </div>
          </form>
        </div>
      </div>
    </div>

    <!-- 页脚 -->
    <footer class="footer">
      <div class="footer-content">
        <p>© 2026 企业管理系统 | 科技赋能未来</p>
      </div>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'

const router = useRouter()
const route = useRoute()

// 获取路由参数中的城市名称和旗县名称
const cityName = computed(() => route.params.cityName as string || '未知城市')
const countyName = computed(() => route.params.countyName as string || '未知旗县')

// 旗县数据
const countyData = ref({
  sales: 0,
  customers: 0,
  dealCustomers: 0
})

// 旗县ID
const countyId = ref('')

// 乡镇数据
const townData = ref([])
// 负责人筛选
const managerFilter = ref('')

// 模态框状态
const showModal = ref(false)
const isEditMode = ref(false)

// 表单数据
const formData = ref({
  id: '',
  name: '',
  contactPerson: '',
  contactPhone: '',
  manager: '',
  intention: 0,
  isDealed: false
})

// 意向程度文本
const getIntentionText = (intention: number) => {
    if (intention === 90) return '很有意向'
    if (intention === 70) return '有一定'
    if (intention === 30) return '模糊'
    return '无'
}

// 过滤后的乡镇数据
const filteredTownData = computed(() => {
  if (!managerFilter.value) {
    return townData.value
  }
  const filter = managerFilter.value.toLowerCase()
  return townData.value.filter(town => {
    const manager = (town.manager || '').toLowerCase()
    return manager.includes(filter)
  })
})

// 意向程度样式
  const getIntentionClass = (intention: number) => {
    if (intention === 90) return 'intention-high'
    if (intention === 70) return 'intention-medium'
    if (intention === 30) return 'intention-low'
  return 'intention-low'
}

// 成交状态文本
const getDealStatusText = (isDealed: any) => {
  return Boolean(isDealed) ? '已成交' : '未成交'
}

// 成交状态样式类
const getDealStatusClass = (isDealed: any) => {
  return Boolean(isDealed) ? 'deal-status-dealed' : 'deal-status-undealed'
}

// 加载旗县数据
const loadCountyData = async () => {
  try {
    // 获取盟市销售数据
    const cityResponse = await fetch('http://localhost:3005/api/city-sales')
    const cityData = await cityResponse.json()
    
    if (cityData.success) {
      const city = cityData.data.find((item: any) => item.name === cityName.value)
      if (city) {
        // 获取旗县销售数据
        const countyResponse = await fetch(`http://localhost:3005/api/county-sales/${city.id}`)
        const countyDataList = await countyResponse.json()
        
        if (countyDataList.success) {
          const county = countyDataList.data.find((item: any) => item.name === countyName.value)
          if (county) {
              countyData.value = {
                sales: county.sales,
                customers: county.customers,
                dealCustomers: county.customers // 暂时使用与客户数相同的值
              }
              
              // 存储旗县ID
              countyId.value = county.id

              // 获取乡镇销售数据
              const townResponse = await fetch(`http://localhost:3005/api/town-sales/${county.id}`)
              const townDataList = await townResponse.json()
              
              if (townDataList.success) {
                townData.value = townDataList.data
                // 根据乡镇数量更新客户数
                countyData.value.customers = townData.value.length
                // 根据乡镇的成交状态计算成交客户数
                countyData.value.dealCustomers = townData.value.filter(town => Boolean(town.isDealed)).length
              }
            }
        }
      }
    }
  } catch (error) {
    console.error('获取旗县销售数据失败', error)
  }
}

const handleBack = () => {
  // 返回上一页
  router.back()
}

// 打开添加模态框
const openAddModal = () => {
  isEditMode.value = false
  formData.value = {
    id: '',
    name: '',
    contactPerson: '',
    contactPhone: '',
    manager: '',
    intention: 0,
    isDealed: false
  }
  showModal.value = true
}

// 打开编辑模态框
const openEditModal = (town: any) => {
  isEditMode.value = true
  formData.value = {
    id: town.id,
    name: town.name,
    contactPerson: town.contactPerson,
    contactPhone: town.contactPhone,
    manager: town.manager || '',
    intention: town.intention,
    isDealed: Boolean(town.isDealed)
  }
  showModal.value = true
}

// 提交表单
const submitForm = async () => {
  try {
    let response
    if (isEditMode.value) {
      // 更新乡镇数据
      response = await fetch(`http://localhost:3005/api/town-sales/${formData.value.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: formData.value.name,
          contactPerson: formData.value.contactPerson,
          contactPhone: formData.value.contactPhone,
          manager: formData.value.manager,
          intention: formData.value.intention,
          isDealed: formData.value.isDealed
        })
      })
    } else {
      // 添加乡镇数据
      response = await fetch('http://localhost:3005/api/town-sales', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          countyId: countyId.value,
          name: formData.value.name,
          contactPerson: formData.value.contactPerson,
          contactPhone: formData.value.contactPhone,
          manager: formData.value.manager,
          intention: formData.value.intention,
          isDealed: formData.value.isDealed
        })
      })
    }
    
    // 解析响应
    const result = await response.json()
    
    // 显示提示
    if (result.success) {
      ElMessage.success(isEditMode.value ? '更新成功' : '添加成功')
      // 重新加载数据
      await loadCountyData()
      showModal.value = false
    } else {
      ElMessage.error(isEditMode.value ? '更新失败：' + result.message : '添加失败：' + result.message)
    }
  } catch (error) {
    console.error('提交表单失败:', error)
    ElMessage.error(isEditMode.value ? '更新失败：网络错误' : '添加失败：网络错误')
  }
}

// 删除乡镇
const deleteTown = async (townId: string) => {
  if (confirm('确定要删除这个乡镇吗？')) {
    try {
      await fetch(`http://localhost:3005/api/town-sales/${townId}`, {
        method: 'DELETE'
      })
      // 重新加载数据
      await loadCountyData()
    } catch (error) {
      console.error('删除乡镇失败:', error)
    }
  }
}

onMounted(async () => {
  await loadCountyData()
})
</script>

<style scoped>
.county-detail-container {
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
  max-width: 600px;
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
  box-shadow: 0 0 10px rgba(100, 149, 237, 0.3);
}

.logout-btn {
  background: rgba(244, 67, 54, 0.1);
  color: #f44336;
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
  box-shadow: 0 0 10px rgba(244, 67, 54, 0.3);
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
  gap: 2rem;
}

/* 标题 */
.section-title {
  font-size: 1.5rem;
  font-weight: 600;
  color: #333;
  margin-bottom: 1.5rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  text-shadow: 0 0 10px rgba(100, 149, 237, 0.3);
}

.title-icon {
  width: 32px;
  height: 32px;
  background: linear-gradient(45deg, #6495ED, #87CEFA);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  box-shadow: 0 4px 10px rgba(100, 149, 237, 0.4);
}

.title-icon svg {
  width: 18px;
  height: 18px;
}

.section-subtitle {
  font-size: 1.2rem;
  font-weight: 600;
  color: #333;
  margin-bottom: 1rem;
  text-shadow: 0 0 10px rgba(100, 149, 237, 0.3);
}

/* 旗县信息卡片 */
.county-info-card {
  background: rgba(255, 255, 255, 0.9);
  border: 1px solid rgba(100, 149, 237, 0.4);
  border-radius: 12px;
  padding: 2rem;
  backdrop-filter: blur(10px);
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

.card-title {
  font-size: 1.2rem;
  font-weight: 600;
  color: #6495ED;
  margin: 0 0 1.5rem 0;
  text-shadow: 0 0 10px rgba(100, 149, 237, 0.3);
}

.card-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1.5rem;
}

.stat-item {
  text-align: center;
  padding: 1rem;
  background: rgba(100, 149, 237, 0.1);
  border-radius: 8px;
  border: 1px solid rgba(100, 149, 237, 0.2);
}

.stat-value {
  display: block;
  font-size: 1.8rem;
  font-weight: 700;
  color: #6495ED;
  text-shadow: 0 0 10px rgba(100, 149, 237, 0.4);
  margin-bottom: 0.5rem;
}

.stat-label {
  font-size: 0.9rem;
  color: rgba(51, 51, 51, 0.7);
}

/* 乡镇列表 */
.town-section {
  background: rgba(255, 255, 255, 0.9);
  border: 1px solid rgba(100, 149, 237, 0.4);
  border-radius: 12px;
  padding: 2rem;
  backdrop-filter: blur(10px);
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.filter-add-container {
  display: flex;
  gap: 1rem;
  align-items: center;
}

.filter-input {
  padding: 0.6rem 1rem;
  border: 1px solid rgba(100, 149, 237, 0.4);
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.8);
  color: #333;
  font-size: 0.9rem;
  transition: all 0.3s ease;
  min-width: 200px;
}

.filter-input:focus {
  outline: none;
  border-color: #6495ED;
  box-shadow: 0 0 10px rgba(100, 149, 237, 0.3);
}

.add-btn {
  background: rgba(16, 185, 129, 0.1);
  color: #10b981;
  border: 1px solid rgba(16, 185, 129, 0.3);
  border-radius: 6px;
  padding: 0.5rem 1rem;
  cursor: pointer;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
  font-size: 14px;
  font-weight: 500;
}

.add-btn::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(16, 185, 129, 0.2), transparent);
  transition: left 0.3s ease;
}

.add-btn:hover::before {
  left: 100%;
}

.add-btn:hover {
  background: rgba(16, 185, 129, 0.2);
  box-shadow: 0 0 10px rgba(16, 185, 129, 0.3);
}

.town-list {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
  gap: 1.5rem;
}

.town-card {
  background: rgba(100, 149, 237, 0.1);
  border: 1px solid rgba(100, 149, 237, 0.2);
  border-radius: 8px;
  padding: 1.5rem;
  transition: all 0.3s ease;
}

.town-card:hover {
  background: rgba(100, 149, 237, 0.2);
  border-color: rgba(100, 149, 237, 0.4);
  box-shadow: 0 4px 10px rgba(100, 149, 237, 0.3);
  transform: translateY(-2px);
}

.town-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.town-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.action-btn {
  padding: 0.3rem 0.6rem;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
  border: none;
}

.edit-btn {
  background: rgba(100, 149, 237, 0.2);
  color: #6495ED;
  border: 1px solid rgba(100, 149, 237, 0.4);
}

.edit-btn:hover {
  background: rgba(100, 149, 237, 0.3);
  box-shadow: 0 0 10px rgba(100, 149, 237, 0.3);
}

.delete-btn {
  background: rgba(244, 67, 54, 0.2);
  color: #f44336;
  border: 1px solid rgba(244, 67, 54, 0.4);
}

.delete-btn:hover {
  background: rgba(244, 67, 54, 0.3);
  box-shadow: 0 0 10px rgba(244, 67, 54, 0.3);
}

.town-name-link {
  text-decoration: none;
  color: #6495ED;
  transition: color 0.3s ease;
}

.town-name-link:hover {
  color: #87CEFA;
  text-shadow: 0 0 10px rgba(100, 149, 237, 0.3);
}

.town-name {
  font-size: 1.1rem;
  font-weight: 600;
  margin: 0;
}

.intention-level {
  padding: 0.3rem 0.8rem;
  border-radius: 20px;
  font-size: 0.8rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.intention-high {
  background: rgba(16, 185, 129, 0.1);
  color: #10b981;
  border: 1px solid rgba(16, 185, 129, 0.3);
}

.intention-medium {
  background: rgba(245, 158, 11, 0.1);
  color: #f59e0b;
  border: 1px solid rgba(245, 158, 11, 0.3);
}

.intention-low {
  background: rgba(239, 68, 68, 0.1);
  color: #ef4444;
  border: 1px solid rgba(239, 68, 68, 0.3);
}

.deal-status {
  padding: 0.3rem 0.8rem;
  border-radius: 20px;
  font-size: 0.8rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-right: 0.5rem;
}

.deal-status-dealed {
  background: rgba(16, 185, 129, 0.1);
  color: #10b981;
  border: 1px solid rgba(16, 185, 129, 0.3);
}

.deal-status-undealed {
  background: rgba(245, 158, 11, 0.1);
  color: #f59e0b;
  border: 1px solid rgba(245, 158, 11, 0.3);
}

.town-details {
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
}

.detail-item {
  display: flex;
  align-items: flex-start;
  gap: 0.8rem;
}

.detail-label {
  font-size: 0.9rem;
  font-weight: 600;
  color: rgba(51, 51, 51, 0.8);
  min-width: 80px;
  flex-shrink: 0;
}

.detail-value {
  font-size: 0.9rem;
  color: rgba(51, 51, 51, 0.7);
  flex: 1;
  line-height: 1.4;
}

/* 模态框 */
.modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  backdrop-filter: blur(5px);
}

.modal-content {
  background: rgba(255, 255, 255, 0.95);
  border: 1px solid rgba(100, 149, 237, 0.4);
  border-radius: 12px;
  padding: 2rem;
  width: 90%;
  max-width: 500px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
}

.modal-header h3 {
  font-size: 1.2rem;
  font-weight: 600;
  color: #6495ED;
  margin: 0;
  text-shadow: 0 0 10px rgba(100, 149, 237, 0.3);
}

.close-btn {
  background: none;
  border: none;
  color: rgba(51, 51, 51, 0.6);
  font-size: 1.5rem;
  cursor: pointer;
  transition: color 0.3s ease;
}

.close-btn:hover {
  color: #333;
}

.beautified-form {
  width: 100%;
}

.form-row {
  margin-bottom: 1.2rem;
}

.form-group {
  width: 100%;
}

.form-group label {
  display: block;
  font-size: 0.9rem;
  font-weight: 600;
  color: #6495ED;
  margin-bottom: 0.6rem;
  text-shadow: 0 0 5px rgba(100, 149, 237, 0.2);
}

.form-input,
.form-select {
  width: 100%;
  padding: 0.9rem 1rem;
  border: 1px solid rgba(100, 149, 237, 0.4);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.9);
  color: #333;
  font-size: 1rem;
  transition: all 0.3s ease;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.05);
}

.form-input:focus,
.form-select:focus {
  outline: none;
  border-color: #6495ED;
  box-shadow: 0 0 15px rgba(100, 149, 237, 0.4);
  transform: translateY(-1px);
}

.form-actions {
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
  margin-top: 2.5rem;
  padding-top: 1.5rem;
  border-top: 1px solid rgba(100, 149, 237, 0.2);
}

.cancel-btn {
  padding: 0.9rem 1.8rem;
  border: 1px solid rgba(100, 149, 237, 0.3);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.9);
  color: rgba(51, 51, 51, 0.8);
  cursor: pointer;
  transition: all 0.3s ease;
  font-size: 1rem;
  font-weight: 500;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.05);
}

.cancel-btn:hover {
  background: rgba(255, 255, 255, 1);
  color: #333;
  box-shadow: 0 4px 10px rgba(100, 149, 237, 0.3);
  transform: translateY(-1px);
}

.submit-btn {
  padding: 0.9rem 1.8rem;
  border: 1px solid rgba(100, 149, 237, 0.4);
  border-radius: 8px;
  background: linear-gradient(45deg, #6495ED, #87CEEB);
  color: #fff;
  cursor: pointer;
  transition: all 0.3s ease;
  font-size: 1rem;
  font-weight: 600;
  box-shadow: 0 4px 15px rgba(100, 149, 237, 0.4);
}

.submit-btn:hover {
  background: linear-gradient(45deg, #4169E1, #6495ED);
  box-shadow: 0 6px 20px rgba(100, 149, 237, 0.6);
  transform: translateY(-2px);
}

/* 页脚 */
.footer {
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(10px);
  border-top: 1px solid rgba(100, 149, 237, 0.3);
  padding: 1rem 2rem;
  text-align: center;
  color: rgba(51, 51, 51, 0.6);
  position: relative;
  z-index: 100;
  box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.1);
}

.footer-content {
  display: flex;
  justify-content: center;
  align-items: center;
}

/* 滚动条样式*/
.main-content::-webkit-scrollbar {
  width: 8px;
}

.main-content::-webkit-scrollbar-track {
  background: rgba(100, 149, 237, 0.1);
  border-radius: 4px;
}

.main-content::-webkit-scrollbar-thumb {
  background: rgba(100, 149, 237, 0.5);
  border-radius: 4px;
}

.main-content::-webkit-scrollbar-thumb:hover {
  background: rgba(100, 149, 237, 0.7);
}

/* 响应式设计*/
@media (max-width: 768px) {
  .town-list {
    grid-template-columns: 1fr;
  }
  
  .nav {
    flex-wrap: wrap;
  }
  
  .header {
    padding: 0 1rem;
  }
  
  .main-content {
    padding: 1rem;
  }
}
</style>
