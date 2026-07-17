<template>
  <div class="city-sales-detail-container">
    <!-- 顶部导航 -->
    <header class="header">
      <div class="logo">
        <span class="logo-text">宏友智慧办公平台</span>
        <div class="logo-glow"></div>
      </div>
      <nav class="nav">
        <router-link to="/" class="nav-item">首页</router-link>
        <router-link to="/sales-funnel" class="nav-item">销售漏斗</router-link>
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
          {{ cityName }}销售详情
        </h2>



        <!-- 旗县乡镇销售数据-->
        <div class="county-section">
          <div class="section-header">
            <h3 class="section-subtitle">旗县乡镇销售分布</h3>
            <button class="add-btn" @click="openAddModal">添加旗县</button>
          </div>
          <div class="county-list">
            <div v-if="countySalesData.length === 0" class="no-data">
              <p>暂无旗县数据</p>
              <p>数据长度: {{ countySalesData.length }}</p>
            </div>
            <div v-else v-for="county in countySalesData" :key="county.id" class="county-card">
              <div class="county-header">
                <h4 class="county-name" @click="navigateToCountyDetail(county.name)">{{ county.name }}</h4>
                <div class="county-actions">
                  <button class="action-btn edit-btn" @click="editCounty(county)">编辑</button>
                  <button class="action-btn delete-btn" @click="deleteCounty(county.id)">删除</button>
                </div>
              </div>
              <div class="county-stats">
                <span class="county-sales">销售额: {{ county.sales.toLocaleString() }}元</span>
                <span class="county-customers">客户数: {{ county.customers }}</span>
              </div>
              <div class="county-bar-container">
                <div class="county-bar" :style="{ width: (county.sales / maxSales * 100) + '%' }"></div>
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
          <h3>{{ isEditing ? '编辑旗县' : '添加旗县' }}</h3>
          <button class="close-btn" @click="closeModal">&times;</button>
        </div>
        <div class="modal-body">
          <form @submit.prevent="submitForm">
            <div class="form-group">
              <label for="name">旗县名称</label>
              <input type="text" id="name" v-model="formData.name" required>
            </div>

            <div class="form-group">
              <label for="sales">销售额（元）</label>
              <input type="number" id="sales" v-model="formData.sales" min="0">
            </div>

            <div class="form-group">
              <label for="customers">客户数</label>
              <input type="number" id="customers" v-model="formData.customers" min="0">
            </div>

            <div class="form-actions">
              <button type="button" class="cancel-btn" @click="closeModal">取消</button>
              <button type="submit" class="submit-btn">{{ isEditing ? '保存' : '添加' }}</button>
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
import { ElMessage, ElMessageBox } from 'element-plus'

const router = useRouter()
const route = useRoute()

// 获取路由参数中的城市名称
const cityName = computed(() => route.params.cityName as string || '未知城市')

// 城市销售数据
  const citySalesData = ref({
  totalSales: 0,
  customers: 0,
  growthRate: 0
})

// 旗县销售数据
const countySalesData = ref([])

// 计算最大销售额，用于进度条显示
const maxSales = computed(() => {
  if (countySalesData.value.length === 0) return 1
  return Math.max(...countySalesData.value.map((item: any) => item.sales))
})

// 模态框状态
const showModal = ref(false)
const isEditing = ref(false)

// 表单数据
const formData = ref({
  id: '',
  name: '',
  sales: 100000,
  customers: 5
})

// 加载城市数据
const loadCityData = async () => {
  try {
    const cityResponse = await fetch('http://localhost:3005/api/city-sales')
    const cityData = await cityResponse.json()
    if (!cityData.success) return
    
    let city = cityData.data.find((item: any) => item.name === cityName.value)
    if (!city) {
      const createRes = await fetch('http://localhost:3005/api/city-sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: cityName.value, sales: 0, customers: 0, growthRate: 0 })
      })
      const createData = await createRes.json()
      if (!createData.success) return
      const refetch = await fetch('http://localhost:3005/api/city-sales')
      const refetchData = await refetch.json()
      city = refetchData.data.find((item: any) => item.name === cityName.value)
      if (!city) return
    }
    
    citySalesData.value = {
      totalSales: parseFloat(city.sales) || 0,
      customers: parseInt(city.customers) || 0,
      growthRate: parseFloat(city.growthRate) || 0
    }
    
    const countyResponse = await fetch(`http://localhost:3005/api/county-sales/${city.id}`)
    if (!countyResponse.ok) return
    const countyData = await countyResponse.json()
    
    if (countyData.success) {
      countyData.data.forEach((county: any) => {
        county.customers = parseInt(county.customers) || 0
        county.sales = parseFloat(county.sales) || 0
      })
      countySalesData.value = countyData.data
      const totalSales = countyData.data.reduce((sum: number, county: any) => sum + county.sales, 0)
      const totalCustomers = countyData.data.reduce((sum: number, county: any) => sum + county.customers, 0)
      citySalesData.value = { totalSales, customers: totalCustomers, growthRate: 0 }
    }
  } catch (error) {
    console.error('获取城市销售数据失败', error)
  }
}

// 打开添加模态框
const openAddModal = () => {
  isEditing.value = false
  formData.value = {
    id: '',
    name: '',
    sales: 100000,
    customers: 5
  }
  showModal.value = true
}

// 打开编辑模态框
const editCounty = (county: any) => {
  isEditing.value = true
  formData.value = {
    id: county.id,
    name: county.name,
    sales: county.sales,
    customers: county.customers
  }
  showModal.value = true
}

const closeModal = () => {
  showModal.value = false
  isEditing.value = false
}



// 提交表单
const getOrCreateCity = async () => {
  const cityResponse = await fetch('http://localhost:3005/api/city-sales')
  const cityData = await cityResponse.json()
  if (!cityData.success) return null

  let city = cityData.data.find((item: any) => item.name === cityName.value)
  if (city) return city

  const createRes = await fetch('http://localhost:3005/api/city-sales', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: cityName.value, sales: 0, customers: 0, growthRate: 0 })
  })
  const createData = await createRes.json()
  if (!createData.success) return null

  const refetch = await fetch('http://localhost:3005/api/city-sales')
  const refetchData = await refetch.json()
  return refetchData.data.find((item: any) => item.name === cityName.value) || null
}

const submitForm = async () => {
  try {
    if (!formData.value.name.trim()) {
      ElMessage.warning('请输入旗县名称')
      return
    }

    if (isEditing.value) {
      const updateResponse = await fetch(`http://localhost:3005/api/county-sales/${formData.value.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.value.name,
          sales: Number(formData.value.sales) || 0,
          customers: Number(formData.value.customers) || 0
        })
      })
      const updateData = await updateResponse.json()
      if (updateData.success) {
        await loadCityData()
        closeModal()
        ElMessage.success('旗县编辑成功')
      } else {
        ElMessage.error(updateData.message || '编辑旗县失败')
      }
      return
    }

    const city = await getOrCreateCity()
    if (!city) {
      ElMessage.error('未找到城市: ' + cityName.value)
      return
    }
    
    const addResponse = await fetch('http://localhost:3005/api/county-sales', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        cityId: city.id,
        name: formData.value.name,
        sales: Number(formData.value.sales) || 100000,
        customers: Number(formData.value.customers) || 5
      })
    })
    const addData = await addResponse.json()
    
    if (addData.success) {
      await loadCityData()
      closeModal()
      ElMessage.success('旗县添加成功')
    } else {
      ElMessage.error(addData.message || '添加旗县失败')
    }
  } catch (error) {
    console.error('提交表单失败:', error)
    ElMessage.error(isEditing.value ? '编辑旗县失败: 网络错误' : '添加旗县失败: 网络错误')
  }
}

// 删除旗县
const deleteCounty = async (countyId: string) => {
  try {
    await ElMessageBox.confirm('确定要删除这个旗县吗？', '确认删除', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    const response = await fetch(`http://localhost:3005/api/county-sales/${countyId}`, {
      method: 'DELETE'
    })
    const data = await response.json()
    if (data.success) {
      await loadCityData()
      ElMessage.success('旗县删除成功')
    } else {
      ElMessage.error(data.message || '删除旗县失败')
    }
  } catch (error: any) {
    if (error !== 'cancel') {
      console.error('删除旗县失败:', error)
      ElMessage.error('删除旗县失败: 网络错误')
    }
  }
}



const handleBack = () => {
  // 返回上一页
  router.back()
}

const navigateToCountyDetail = (countyName: string) => {
  router.push(`/city-sales/${encodeURIComponent(cityName.value)}/${encodeURIComponent(countyName)}`)
}

onMounted(async () => {
  await loadCityData()
})
</script>

<style scoped>
.city-sales-detail-container {
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



/* 旗县列表 */
.county-section {
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

.county-list {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1rem;
}

.county-card {
  background: rgba(100, 149, 237, 0.1);
  border: 1px solid rgba(100, 149, 237, 0.2);
  border-radius: 8px;
  padding: 1rem;
  transition: all 0.3s ease;
}

.county-card:hover {
  background: rgba(100, 149, 237, 0.2);
  border-color: rgba(100, 149, 237, 0.4);
  box-shadow: 0 4px 10px rgba(100, 149, 237, 0.3);
  transform: translateY(-2px);
}

.county-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}

.county-name {
  font-size: 1rem;
  font-weight: 600;
  color: #333;
  margin: 0;
  cursor: pointer;
  transition: color 0.3s ease;
}

.county-name:hover {
  color: #6495ED;
  text-shadow: 0 0 10px rgba(100, 149, 237, 0.5);
}

.county-actions {
  display: flex;
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

.form-group {
  margin-bottom: 1rem;
}

.form-group label {
  display: block;
  font-size: 0.9rem;
  font-weight: 600;
  color: rgba(51, 51, 51, 0.8);
  margin-bottom: 0.5rem;
}

.form-group input {
  width: 100%;
  padding: 0.8rem;
  border: 1px solid rgba(100, 149, 237, 0.4);
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.8);
  color: #333;
  font-size: 1rem;
  transition: all 0.3s ease;
}

.form-group input:focus {
  outline: none;
  border-color: #6495ED;
  box-shadow: 0 0 10px rgba(100, 149, 237, 0.3);
}

.form-actions {
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
  margin-top: 2rem;
}

.cancel-btn {
  padding: 0.8rem 1.5rem;
  border: 1px solid rgba(100, 149, 237, 0.3);
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.8);
  color: rgba(51, 51, 51, 0.8);
  cursor: pointer;
  transition: all 0.3s ease;
  font-size: 1rem;
  font-weight: 500;
}

.cancel-btn:hover {
  background: rgba(255, 255, 255, 1);
  color: #333;
  box-shadow: 0 0 10px rgba(100, 149, 237, 0.2);
}

.submit-btn {
  padding: 0.8rem 1.5rem;
  border: 1px solid rgba(100, 149, 237, 0.4);
  border-radius: 6px;
  background: rgba(100, 149, 237, 0.2);
  color: #6495ED;
  cursor: pointer;
  transition: all 0.3s ease;
  font-size: 1rem;
  font-weight: 500;
}

.submit-btn:hover {
  background: rgba(100, 149, 237, 0.3);
  box-shadow: 0 0 15px rgba(100, 149, 237, 0.3);
  color: #333;
}

.county-stats {
  display: flex;
  gap: 1rem;
  margin-bottom: 0.5rem;
  font-size: 0.9rem;
  color: rgba(51, 51, 51, 0.7);
}

.county-sales {
  color: #10b981;
  font-weight: 600;
}

.county-bar-container {
  height: 8px;
  background: rgba(100, 149, 237, 0.2);
  border-radius: 4px;
  overflow: hidden;
}

.county-bar {
  height: 100%;
  background: linear-gradient(90deg, #6495ED, #87CEFA);
  border-radius: 4px;
  transition: width 0.3s ease;
  min-width: 2px;
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

/* 滚动条样�?*/
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

/* 动画 */
@keyframes borderGlow {
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}
</style>
