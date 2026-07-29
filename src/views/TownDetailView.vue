<template>
  <div class="town-detail-container">
    <!-- 椤堕儴瀵艰埅 -->
    <header class="header">
      <div class="logo">
        <span class="logo-text">瀹忓弸鏅烘収鍔炲叕骞冲彴</span>
        <div class="logo-glow"></div>
      </div>
      <nav class="nav">
        <router-link to="/" class="nav-item">棣栭〉</router-link>
        <router-link to="/sales-funnel" class="nav-item">销售漏斗</router-link>
        <router-link :to="`/city-sales/${encodeURIComponent(cityName)}`" class="nav-item">杩斿洖鐩熷競</router-link>
        <router-link :to="`/county-detail/${encodeURIComponent(cityName)}/${encodeURIComponent(countyName)}`" class="nav-item">杩斿洖鏃楀幙</router-link>
        <button class="nav-item logout-btn" @click="handleBack">杩斿洖</button>
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
          {{ townName }}瀹㈡埛璇︾粏淇℃伅
        </h2>

        <!-- 涔￠晣基本信息鍗＄墖 -->
        <div class="town-info-card">
          <h3 class="card-title">{{ townName }}基本信息</h3>
          <div class="card-details">
            <div class="detail-item">
              <span class="detail-label">联系人</span>
              <span class="detail-value">{{ townData.contactPerson }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">联系电话:</span>
              <span class="detail-value">{{ townData.contactPhone }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">瀹㈡埛绫诲瀷:</span>
              <span class="detail-value">{{ townData.contactType || '未设置 }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">鎰忓悜绋嬪害:</span>
              <span class="detail-value">{{ getIntentionText(townData.intention) }}</span>
            </div>
          </div>
        </div>

        <!-- 拜访记录鍒楄〃 -->
        <div class="customer-section">
          <div class="section-header">
            <h3 class="section-subtitle">拜访记录</h3>
            <button class="add-btn" @click="openAddModal">添加拜访</button>
          </div>
          <div class="customer-list">
            <div v-for="(visit, index) in visitData" :key="visit.id" class="customer-card">
              <div class="customer-header">
                <h4 class="customer-name">{{ getVisitNumber(index) }}</h4>
                <div class="customer-actions">
                  <button class="action-btn edit-btn" @click="openEditModal(visit)">编辑</button>
                  <button class="action-btn delete-btn" @click="deleteVisit(visit.id)">删除</button>
                </div>
              </div>
              <div class="customer-details">
                <div class="detail-item">
                  <span class="detail-label">客户名称:</span>
                  <span class="detail-value">{{ visit.customerName }}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">详细地址:</span>
                  <span class="detail-value">{{ visit.address }}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">拜访日期:</span>
                  <span class="detail-value">{{ visit.visitDate }}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">拜访人</span>
                  <span class="detail-value">{{ visit.visitPerson }}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">拜访内容:</span>
                  <span class="detail-value">{{ visit.visitContent }}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">后续计划:</span>
                  <span class="detail-value">{{ visit.nextPlan }}</span>
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
          <h3>{{ isEditMode ? '编辑鎷滆' : '添加拜访' }}</h3>
          <button class="close-btn" @click="showModal = false">&times;</button>
        </div>
        <div class="modal-body">
          <form @submit.prevent="submitForm">
            <div class="form-group">
              <label for="customerName">客户名称</label>
              <input type="text" id="customerName" v-model="formData.customerName" required>
            </div>
            <div class="form-group">
              <label for="address">详细地址</label>
              <input type="text" id="address" v-model="formData.address" required>
            </div>
            <div class="form-group">
              <label for="visitDate">拜访日期</label>
              <input type="date" id="visitDate" v-model="formData.visitDate" required>
            </div>
            <div class="form-group">
              <label for="visitPerson">拜访人</label>
              <input type="text" id="visitPerson" v-model="formData.visitPerson" required>
            </div>
            <div class="form-group">
              <label for="visitContent">拜访内容</label>
              <textarea id="visitContent" v-model="formData.visitContent" rows="3" required></textarea>
            </div>
            <div class="form-group">
              <label for="nextPlan">后续计划</label>
              <textarea id="nextPlan" v-model="formData.nextPlan" rows="2" required></textarea>
            </div>
            <div class="form-actions">
              <button type="button" class="cancel-btn" @click="showModal = false">鍙栨秷</button>
              <button type="submit" class="submit-btn">{{ isEditMode ? '鏇存柊' : '娣诲姞' }}</button>
            </div>
          </form>
        </div>
      </div>
    </div>

    <!-- 页脚 -->
    <footer class="footer">
      <div class="footer-content">
        <p>漏 2026 浼佷笟绠＄悊绯荤粺 | 绉戞妧璧嬭兘鏈潵</p>
      </div>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'

const router = useRouter()
const route = useRoute()

// 鑾峰彇璺敱鍙傛暟
const cityName = computed(() => route.params.cityName as string || '鏈煡鍩庡競')
const countyName = computed(() => route.params.countyName as string || '鏈煡鏃楀幙')
const townName = computed(() => route.params.townName as string || '鏈煡涔￠晣')

// 涔￠晣鏁版嵁
const townData = ref({
  id: '',
  name: '',
  contactPerson: '',
  contactPhone: '',
  contactType: '',
  intention: 0
})

// 鎷滆鏁版嵁
const visitData = ref([])

// 模态框鐘舵€?
const showModal = ref(false)
const isEditMode = ref(false)

// 琛ㄥ崟鏁版嵁
const formData = ref({
  id: '',
  customerName: '',
  address: '',
  visitDate: '',
  visitPerson: '',
  visitContent: '',
  nextPlan: ''
})

// 鎰忓悜绋嬪害鏂囨湰
const getIntentionText = (intention: number) => {
  if (intention === 90) return '很有意向'
  if (intention === 70) return '有一定意向'
  if (intention === 30) return '模糊'
  return '无'
}

// 鑾峰彇拜访次数鏂囨湰
const getVisitNumber = (index: number) => {
  const numberMap = ['涓€', '二', '三', '四', '二', '六', '三', '六', '九', '十']
  if (index < 10) {
    return `${numberMap[index]}娆℃嫓璁縛
  } else {
    return `${index + 1}娆℃嫓璁縛
  }
}

// 鍔犺浇涔￠晣鏁版嵁
const loadTownData = async () => {
  try {
    // 鑾峰彇鐩熷競閿€鍞暟鎹?
    const cityResponse = await fetch('/api/city-sales')
    const cityData = await cityResponse.json()
    
    if (cityData.success) {
          const city = cityData.data.find((item: any) => item.name === cityName.value)
          if (city) {
            // 鑾峰彇鏃楀幙閿€鍞暟鎹?
            const countyResponse = await fetch(`/api/county-sales/${city.id}`)
            const countyDataList = await countyResponse.json()
        
        if (countyDataList.success) {
          const county = countyDataList.data.find((item: any) => item.name === countyName.value)
          if (county) {
            // 鑾峰彇涔￠晣閿€鍞暟鎹?
            const townResponse = await fetch(`/api/town-sales/${county.id}`)
            const townDataList = await townResponse.json()
            
            if (townDataList.success) {
              const town = townDataList.data.find((item: any) => item.name === townName.value)
              if (town) {
                townData.value = town
                // 浠嶢PI鑾峰彇拜访记录
                await loadVisitRecords(town.id)
              }
            }
          }
        }
      }
    }
  } catch (error) {
    console.error('鑾峰彇涔￠晣鏁版嵁澶辫触:', error)
  }
}

// 鍔犺浇拜访记录
const loadVisitRecords = async (townId: number) => {
  try {
    const response = await fetch(`/api/visit-records/${townId}`)
    const data = await response.json()
    if (data.success) {
      visitData.value = data.data
    }
  } catch (error) {
    console.error('鑾峰彇拜访记录澶辫触:', error)
  }
}

const handleBack = () => {
  // 杩斿洖涓婁竴椤?
  router.back()
}

// 鎵撳紑娣诲姞模态框
const openAddModal = () => {
  isEditMode.value = false
  formData.value = {
    id: '',
    customerName: '',
    address: '',
    visitDate: '',
    visitPerson: '',
    visitContent: '',
    nextPlan: ''
  }
  showModal.value = true
}

// 鎵撳紑编辑模态框
const openEditModal = (visit: any) => {
  isEditMode.value = true
  formData.value = {
    id: visit.id,
    customerName: visit.customerName,
    address: visit.address || '',
    visitDate: visit.visitDate,
    visitPerson: visit.visitPerson,
    visitContent: visit.visitContent,
    nextPlan: visit.nextPlan
  }
  showModal.value = true
}

// 鎻愪氦琛ㄥ崟
const submitForm = async () => {
  try {
    if (isEditMode.value) {
      // 鏇存柊鎷滆鏁版嵁
      const response = await fetch(`/api/visit-records/${formData.value.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          customerName: formData.value.customerName,
          address: formData.value.address,
          visitDate: formData.value.visitDate,
          visitPerson: formData.value.visitPerson,
          visitContent: formData.value.visitContent,
          nextPlan: formData.value.nextPlan
        })
      })
      const data = await response.json()
      if (data.success) {
        await loadVisitRecords(townData.value.id)
      }
    } else {
      // 添加拜访鏁版嵁
      const response = await fetch('/api/visit-records', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          townId: townData.value.id,
          customerName: formData.value.customerName,
          address: formData.value.address,
          visitDate: formData.value.visitDate,
          visitPerson: formData.value.visitPerson,
          visitContent: formData.value.visitContent,
          nextPlan: formData.value.nextPlan
        })
      })
      const data = await response.json()
      if (data.success) {
        await loadVisitRecords(townData.value.id)
      }
    }
    
    showModal.value = false
  } catch (error) {
    console.error('提交表单失败:'', error)
  }
}

// 删除鎷滆
const deleteVisit = async (visitId: string) => {
  if (confirm('确定要删除这个拜访记录吗？')) {
    try {
      const response = await fetch(`/api/visit-records/${visitId}`, {
        method: 'DELETE'
      })
      const data = await response.json()
      if (data.success) {
        await loadVisitRecords(townData.value.id)
      }
    } catch (error) {
      console.error('删除拜访记录澶辫触:', error)
    }
  }
}

onMounted(async () => {
  await loadTownData()
})
</script>

<style scoped>
.town-detail-container {
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
  max-width: 800px;
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

/* 鏍囬 */
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

/* 涔￠晣淇℃伅鍗＄墖 */
.town-info-card {
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

.card-details {
  display: flex;
  flex-direction: column;
  gap: 1rem;
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

/* 瀹㈡埛鍒楄〃 */
.customer-section {
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

.customer-list {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
  gap: 1.5rem;
}

.customer-card {
  background: rgba(100, 149, 237, 0.1);
  border: 1px solid rgba(100, 149, 237, 0.2);
  border-radius: 8px;
  padding: 1.5rem;
  transition: all 0.3s ease;
}

.customer-card:hover {
  background: rgba(100, 149, 237, 0.2);
  border-color: rgba(100, 149, 237, 0.4);
  box-shadow: 0 4px 10px rgba(100, 149, 237, 0.3);
  transform: translateY(-2px);
}

.customer-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.customer-actions {
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

.customer-name {
  font-size: 1.1rem;
  font-weight: 600;
  color: #333;
  margin: 0;
}

.customer-details {
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
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

.form-group input,
.form-group textarea,
.form-group select {
  width: 100%;
  padding: 0.8rem;
  border: 1px solid rgba(100, 149, 237, 0.4);
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.8);
  color: #333;
  font-size: 1rem;
  transition: all 0.3s ease;
}

.form-group input:focus,
.form-group textarea:focus,
.form-group select:focus {
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

/* 滚动条样式 */
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

/* 响应式设计 */
@media (max-width: 768px) {
  .customer-list {
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

