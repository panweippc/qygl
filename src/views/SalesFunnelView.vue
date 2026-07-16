<template>
  <div class="sales-funnel-container">
    <!-- 装饰性形�?-->
    <div class="decorative-shapes">
      <div class="shape shape-1"></div>
      <div class="shape shape-2"></div>
      <div class="shape shape-3"></div>
    </div>
    
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
        <h2 class="section-title">
          <span class="title-icon">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 3H5C3.9 3 3 3.9 3 5V19C3 20.1 3.9 21 5 21H19C20.1 21 21 20.1 21 19V5C21 3.9 20.1 3 19 3ZM9 17H7V10H9V17ZM13 17H11V7H13V17ZM17 17H15V13H17V17Z"/>
            </svg>
          </span>
          销售漏斗管理        </h2>

        <!-- 内容区域 -->
        <div class="map-section">
          <div class="map-header">
            <h3 class="map-title">内蒙古地区销售分布</h3>
            <el-button type="primary" size="small" @click="showAddCityDialog = true">+ 添加盟市</el-button>
          </div>
          <div ref="mapRef" class="map-container"></div>
        </div>
      </div>
    </main>

    <el-dialog v-model="showAddCityDialog" title="添加盟市" width="450px">
      <el-form :model="cityForm" label-width="100px">
        <el-form-item label="盟市名称" required>
          <el-input v-model="cityForm.name" placeholder="请输入盟市名称" />
        </el-form-item>
        <el-form-item label="客户数量" required>
          <el-input v-model.number="cityForm.customers" type="number" placeholder="请输入客户数量" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showAddCityDialog = false">取消</el-button>
        <el-button type="primary" @click="submitAddCity" :loading="submittingCity">确定添加</el-button>
      </template>
    </el-dialog>

    <!-- 页脚 -->
    <footer class="footer">
      <div class="footer-content">
        <p>© 2026 企业管理系统 | 科技赋能未来</p>
      </div>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import * as echarts from 'echarts'

const router = useRouter()
const mapRef = ref<HTMLElement | null>(null)
let mapChart: echarts.ECharts | null = null

const showAddCityDialog = ref(false)
const submittingCity = ref(false)
const cityForm = ref({ name: '', customers: 0 })

const submitAddCity = async () => {
  if (!cityForm.value.name.trim()) {
    ElMessage.warning('请输入盟市名称')
    return
  }
  submittingCity.value = true
  try {
    const response = await fetch('http://localhost:3005/api/city-sales', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: cityForm.value.name.trim(),
        sales: 0,
        customers: cityForm.value.customers || 0,
        growthRate: 0
      })
    })
    const result = await response.json()
    if (result.success) {
      ElMessage.success('盟市添加成功')
      showAddCityDialog.value = false
      cityForm.value = { name: '', customers: 0 }
      initMap()
    } else {
      ElMessage.error(result.message || '添加失败')
    }
  } catch (error) {
    console.error('添加盟市失败:', error)
    ElMessage.error('添加盟市失败')
  } finally {
    submittingCity.value = false
  }
}

const handleBack = () => {
  router.back()
}

// 获取盟市销售数据
const fetchCitySalesData = async () => {
  try {
    const response = await fetch('http://localhost:3005/api/city-sales')
    const data = await response.json()
    if (data.success) {
      return data.data.map((city: any) => ({
        name: city.name,
        value: city.customers
      }))
    }
    return []
  } catch (error) {
    console.error('获取盟市销售数据失败', error)
    return []
  }
}

const initMap = async () => {
  if (!mapRef.value) return
  
  // 初始化地图
  mapChart = echarts.init(mapRef.value)
  
  // 获取盟市销售数据
  const mapData = await fetchCitySalesData()
  
  // 地图配置
  const option = {
    title: {
      text: '内蒙古销售分布',
      left: 'center',
      textStyle: {
        color: '#333'
      }
    },
    tooltip: {
      trigger: 'item',
      formatter: '{b}',
      backgroundColor: 'rgba(255, 255, 255, 0.9)',
      borderColor: 'rgba(100, 149, 237, 0.3)',
      textStyle: {
        color: '#333'
      }
    },
    visualMap: {
      min: 0,
      max: 100,
      left: 'left',
      top: 'bottom',
      text: ['低', '高'],
      calculable: true,
      textStyle: {
        color: '#333'
      },
      inRange: {
        color: ['#6495ED', '#87CEEB', '#B0C4DE']
      }
    },
    series: [
      {
        name: '销售数据',
        type: 'map',
        map: 'china',
        roam: true,
        zoom: 1.2,
        center: [111.65, 40.82], // 内蒙古中心坐标
        label: {
          show: true,
          color: '#333',
          fontSize: 10
        },
        emphasis: {
          label: {
            show: true,
            color: '#333',
            fontSize: 12
          },
          itemStyle: {
            areaColor: '#6495ED',
            shadowBlur: 10,
            shadowColor: 'rgba(100, 149, 237, 0.5)'
          }
        },
        data: mapData
      }
    ]
  }
  
  // 动态加载内蒙古地图数据
  fetch('https://cdn.jsdelivr.net/npm/echarts/map/json/province/neimenggu.json')
    .then(response => response.json())
    .then(neimengguJson => {
      echarts.registerMap('neimenggu', neimengguJson)
      // 更新地图配置为使用内蒙古地图
      const neimengguOption = {
        ...option,
        series: [
          {
            ...option.series[0],
            map: 'neimenggu',
            zoom: 1.5,
            center: [111.65, 40.82], // 内蒙古中心坐标
            emphasis: {
              label: {
                show: true,
                color: '#333',
                fontSize: 12
              },
              itemStyle: {
                areaColor: '#6495ED',
                shadowBlur: 10,
                shadowColor: 'rgba(100, 149, 237, 0.5)'
              }
            },
            data: mapData
          }
        ]
      }
      mapChart?.setOption(neimengguOption)
      
      // 添加地图点击事件
      mapChart?.on('click', function(params) {
        const cityName = params.name
        router.push(`/city-sales/${encodeURIComponent(cityName)}`)
      })
    })
    .catch(error => {
      console.error('加载地图数据失败:', error)
    })
  
  // 响应式调整
  window.addEventListener('resize', () => {
    mapChart?.resize()
  })
}

onMounted(async () => {
  await initMap()
})
</script>

<style scoped>
.sales-funnel-container {
  width: 100%;
  height: 100vh;
  display: flex;
  flex-direction: column;
  position: relative;
  overflow: hidden;
  background: #E4EDF2;
}

.sales-funnel-container::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: radial-gradient(circle at 30% 20%, rgba(100, 149, 237, 0.1) 0%, transparent 50%),
              radial-gradient(circle at 70% 80%, rgba(135, 206, 235, 0.1) 0%, transparent 50%),
              radial-gradient(circle at 50% 50%, rgba(100, 149, 237, 0.05) 0%, transparent 50%);
  z-index: 0;
}

.decorative-shapes {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 0;
}

.shape {
  position: absolute;
  border-radius: 50%;
  filter: blur(40px);
  opacity: 0.3;
  animation: float 20s ease-in-out infinite;
}

.shape-1 {
  width: 300px;
  height: 300px;
  background: linear-gradient(45deg, #6495ED, #87CEEB);
  top: -50px;
  left: -50px;
  animation-delay: 0s;
}

.shape-2 {
  width: 200px;
  height: 200px;
  background: linear-gradient(45deg, #87CEEB, #6495ED);
  bottom: -30px;
  right: -30px;
  animation-delay: 5s;
}

.shape-3 {
  width: 150px;
  height: 150px;
  background: linear-gradient(45deg, #6495ED, #87CEEB);
  top: 50%;
  right: 10%;
  animation-delay: 10s;
}

@keyframes float {
  0%, 100% {
    transform: translate(0, 0) rotate(0deg);
  }
  25% {
    transform: translate(20px, -20px) rotate(5deg);
  }
  50% {
    transform: translate(0, 20px) rotate(0deg);
  }
  75% {
    transform: translate(-20px, -10px) rotate(-5deg);
  }
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
  background: linear-gradient(45deg, #6495ED, #87CEEB);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  box-shadow: 0 4px 15px rgba(100, 149, 237, 0.3);
}

.title-icon svg {
  width: 18px;
  height: 18px;
}

/* 地图部分 */
.map-section {
  background: rgba(255, 255, 255, 0.8);
  border: 1px solid rgba(100, 149, 237, 0.3);
  border-radius: 16px;
  padding: 2rem;
  backdrop-filter: blur(5px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  height: 600px;
  position: relative;
  overflow: hidden;
  z-index: 1;
}

.map-section::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(100, 149, 237, 0.6), transparent);
  z-index: 2;
}

.map-section::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(135, 206, 235, 0.6), transparent);
  z-index: 2;
}

.map-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  position: relative;
  z-index: 2;
}

.map-title {
  font-size: 1.3rem;
  font-weight: 600;
  color: #333;
  margin: 0;
  text-shadow: 0 0 15px rgba(100, 149, 237, 0.3);
}

.map-container {
  flex: 1;
  border-radius: 12px;
  overflow: hidden;
  position: relative;
  z-index: 1;
  border: 1px solid rgba(100, 149, 237, 0.3);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  background: #f8fafc;
}

.map-container::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(135deg, rgba(100, 149, 237, 0.05), rgba(135, 206, 235, 0.05));
  z-index: -1;
}

/* 页脚 */
.footer {
  background: rgba(255, 255, 255, 0.8);
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
  background: rgba(255, 255, 255, 0.6);
  border-radius: 4px;
}

.main-content::-webkit-scrollbar-thumb {
  background: rgba(100, 149, 237, 0.5);
  border-radius: 4px;
}

.main-content::-webkit-scrollbar-thumb:hover {
  background: rgba(100, 149, 237, 0.7);
}
</style>
