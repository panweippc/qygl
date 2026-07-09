<template>
  <div class="home-container">
    <!-- 顶部导航 -->
    <header class="header">
      <div class="logo">
        <span class="logo-text">宏友智慧办公平台</span>
        <div class="logo-glow"></div>
      </div>
      <nav class="nav">
        <router-link to="/" class="nav-item">
          <span>首页</span>
          <div class="nav-item-indicator"></div>
        </router-link>
        <button class="nav-item user-btn" @click="handleUser">
          <span>{{ currentUser }}</span>
          <div class="nav-item-indicator"></div>
        </button>
        <button class="nav-item logout-btn" @click="handleLogout">
            <span>退出</span>
            <div class="nav-item-indicator"></div>
          </button>
      </nav>
    </header>

    <!-- 主内容区 -->
    <div class="main-container">
      <!-- 左侧导航�?-->
      <aside class="sidebar">
        <div class="sidebar-content">
          <nav class="sidebar-nav">
            <!-- 工具入库 -->
            <router-link v-if="hasPermission('/tool-inventory')" to="/tool-inventory" class="sidebar-item">
              <div class="sidebar-icon">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20 2H4C2.9 2 2 2.9 2 4V22L6 18H20C21.1 18 22 17.1 22 16V4C22 2.9 21.1 2 20 2ZM16 14H8V12H16V14ZM16 10H8V8H16V10Z"/>
                </svg>
              </div>
              <span>工具入库</span>
              <div class="sidebar-item-indicator"></div>
            </router-link>
            <!-- OA办公 -->
            <router-link v-if="hasPermission('/oa-office')" to="/oa-office" class="sidebar-item">
              <div class="sidebar-icon">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19 3H5C3.9 3 3 3.9 3 5V19C3 20.1 3.9 21 5 21H19C20.1 21 21 20.1 21 19V5C21 3.9 20.1 3 19 3ZM11 17H7V10H11V17ZM17 17H13V7H17V17Z"/>
                </svg>
              </div>
              <span>OA办公</span>
              <div class="sidebar-item-indicator"></div>
            </router-link>
            <!-- 月报 -->
            <router-link v-if="hasPermission('/monthly-report')" to="/monthly-report" class="sidebar-item">
              <div class="sidebar-icon">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19 3H5C3.9 3 3 3.9 3 5V19C3 20.1 3.9 21 5 21H19C20.1 21 21 20.1 21 19V5C21 3.9 20.1 3 19 3ZM19 19H5V5H19V19ZM16 11H13V8H11V11H8V13H11V16H13V13H16V11Z"/>
                </svg>
              </div>
              <span>月报</span>
              <div class="sidebar-item-indicator"></div>
            </router-link>
            <!-- 员工管理 -->
            <router-link v-if="hasPermission('/employee-management')" to="/employee-management" class="sidebar-item">
              <div class="sidebar-icon">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M16 11C17.66 11 19 9.66 19 8C19 6.34 17.66 5 16 5C14.34 5 13 6.34 13 8C13 9.66 14.34 11 16 11ZM8 11C9.66 11 11 9.66 11 8C11 6.34 9.66 5 8 5C6.34 5 5 6.34 5 8C5 9.66 6.34 11 8 11ZM8 13C5.67 13 1 14.17 1 16.5V19H15V16.5C15 14.17 10.33 13 8 13ZM16 13C13.67 13 9 14.17 9 16.5V19H23V16.5C23 14.17 18.33 13 16 13Z"/>
                </svg>
              </div>
              <span>员工管理</span>
              <div class="sidebar-item-indicator"></div>
            </router-link>
                        <!-- 文件存储 -->
            <router-link v-if="hasPermission('/file-storage')" to="/file-storage" class="sidebar-item">
              <div class="sidebar-icon">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M13 9H11V7H13V9ZM13 13H11V11H13V13ZM13 17H11V15H13V17ZM21 3H3C1.9 3 1 3.9 1 5V19C1 20.1 1.9 21 3 21H21C22.1 21 23 20.1 23 19V5C23 3.9 22.1 3 21 3ZM21 19H3V5H21V19Z"/>
                </svg>
              </div>
              <span>文件存储</span>
              <div class="sidebar-item-indicator"></div>
            </router-link>
            <!-- 项目分类 -->
            <router-link v-if="hasPermission('/project-category')" to="/project-category" class="sidebar-item">
              <div class="sidebar-icon">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19 3H5C3.9 3 3 3.9 3 5V19C3 20.1 3.9 21 5 21H19C20.1 21 21 20.1 21 19V5C21 3.9 20.1 3 19 3ZM9 17H7V10H9V17ZM13 17H11V7H13V17ZM17 17H15V13H17V17Z"/>
                </svg>
              </div>
              <span>项目分类</span>
              <div class="sidebar-item-indicator"></div>
            </router-link>
            <!-- 成交项目 -->
            <router-link v-if="hasPermission('/closing-project')" to="/closing-project" class="sidebar-item">
              <div class="sidebar-icon">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19 3H5C3.9 3 3 3.9 3 5V19C3 20.1 3.9 21 5 21H19C20.1 21 21 20.1 21 19V5C21 3.9 20.1 3 19 3ZM9 17H7V10H9V17ZM13 17H11V7H13V17ZM17 17H15V13H17V17Z"/>
                </svg>
              </div>
              <span>成交项目</span>
              <div class="sidebar-item-indicator"></div>
            </router-link>
            <!-- 销售漏�?-->
            <router-link v-if="hasPermission('/sales-funnel')" to="/sales-funnel" class="sidebar-item">
              <div class="sidebar-icon">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19 3H5C3.9 3 3 3.9 3 5V19C3 20.1 3.9 21 5 21H19C20.1 21 21 20.1 21 19V5C21 3.9 20.1 3 19 3ZM9 17H7V10H9V17ZM13 17H11V7H13V17ZM17 17H15V13H17V17Z"/>
                </svg>
              </div>
              <span>销售漏斗</span>
              <div class="sidebar-item-indicator"></div>
            </router-link>
            <!-- 系统管理 -->
            <router-link v-if="hasPermission('/system')" to="/system" class="sidebar-item">
              <div class="sidebar-icon">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z"/>
                </svg>
              </div>
              <span>系统管理</span>
              <div class="sidebar-item-indicator"></div>
            </router-link>

          </nav>
        </div>
      </aside>

      <!-- 右侧内容�?-->
      <main class="content">
        <div class="dashboard">
          
          <!-- 数据卡片 -->
          <div class="dashboard-cards">
            <div class="dashboard-card">
              <div class="card-header">
                <h3>文件存储</h3>
                <div class="card-icon">
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M13 9H11V7H13V9ZM13 13H11V11H13V13ZM13 17H11V15H13V17ZM21 3H3C1.9 3 1 3.9 1 5V19C1 20.1 1.9 21 3 21H21C22.1 21 23 20.1 23 19V5C23 3.9 22.1 3 21 3ZM21 19H3V5H21V19Z"/>
                  </svg>
                </div>
              </div>
              <div class="card-body">
                <div class="card-stats">
                  <div class="stat-item">
                    <span class="stat-value">{{ fileStats.total }}</span>
                    <span class="stat-label">总文件数</span>
                  </div>
                  <div class="stat-item">
                    <span class="stat-value">{{ fileStats.categories }}</span>
                    <span class="stat-label">分类数</span>
                  </div>
                </div>
              </div>
            </div>

            <div class="dashboard-card">
              <div class="card-header">
                <h3>项目分类</h3>
                <div class="card-icon">
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19 3H5C3.9 3 3 3.9 3 5V19C3 20.1 3.9 21 5 21H19C20.1 21 21 20.1 21 19V5C21 3.9 20.1 3 19 3ZM9 17H7V10H9V17ZM13 17H11V7H13V17ZM17 17H15V13H17V17Z"/>
                  </svg>
                </div>
              </div>
              <div class="card-body">
                <div class="card-stats">
                  <div class="stat-item">
                    <span class="stat-value">{{ projectStats.total }}</span>
                    <span class="stat-label">总项目数</span>
                  </div>
                  <div class="stat-item">
                    <span class="stat-value">{{ projectStats.categories }}</span>
                    <span class="stat-label">分类数</span>
                  </div>
                </div>
              </div>
            </div>

            <div class="dashboard-card">
              <div class="card-header">
                <h3>月报统计</h3>
                <div class="card-icon">
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19 3H5C3.9 3 3 3.9 3 5V19C3 20.1 3.9 21 5 21H19C20.1 21 21 20.1 21 19V5C21 3.9 20.1 3 19 3ZM19 19H5V5H19V19ZM16 11H13V8H11V11H8V13H11V16H13V13H16V11Z"/>
                  </svg>
                </div>
              </div>
              <div class="card-body">
                <div class="card-stats">
                  <div class="stat-item">
                    <span class="stat-value">{{ monthlyReportStats.total }}</span>
                    <span class="stat-label">总月报数</span>
                  </div>
                  <div class="stat-item">
                    <span class="stat-value">{{ monthlyReportStats.pending }}</span>
                    <span class="stat-label">待提交</span>
                  </div>
                </div>
              </div>
            </div>

            <div class="dashboard-card">
              <div class="card-header">
                <h3>工具管理</h3>
                <div class="card-icon">
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M20 2H4C2.9 2 2 2.9 2 4V22L6 18H20C21.1 18 22 17.1 22 16V4C22 2.9 21.1 2 20 2ZM16 14H8V12H16V14ZM16 10H8V8H16V10Z"/>
                  </svg>
                </div>
              </div>
              <div class="card-body">
                <div class="card-stats">
                  <div class="stat-item">
                    <span class="stat-value">{{ toolStats.total }}</span>
                    <span class="stat-label">总工具数</span>
                  </div>
                  <div class="stat-item">
                    <span class="stat-value">{{ toolStats.categories }}</span>
                    <span class="stat-label">分类数</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- 数据可视化区�?-->
          <div class="dashboard-visualization">
            <!-- 中部图表 -->
            <div class="visualization-row">
              <div class="visualization-card">
                <h3>盟市项目分布</h3>
                <div class="chart-container">
                  <div ref="trendChart" class="echart-container"></div>
                </div>
              </div>
              <div class="visualization-card">
                <h3>项目分类</h3>
                <div class="chart-container">
                  <div ref="pieChart" class="echart-container"></div>
                </div>
              </div>
            </div>
            
            <!-- 底部图表 -->
            <div class="visualization-row">
              <div class="visualization-card">
                <h3>文件个数</h3>
                <div class="chart-container">
                  <div ref="rankingChart" class="echart-container"></div>
                </div>
              </div>
              <div class="visualization-card">
                <h3>OA审批</h3>
                <div class="chart-container">
                  <div ref="comparisonChart" class="echart-container"></div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </main>
    </div>

    <!-- 页脚 -->
    <footer class="footer">
      <div class="footer-content">
        <p>© 2026 宏友智慧办公平台 | 科技赋能未来</p>
      </div>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watchEffect, computed } from 'vue'
import { useRouter } from 'vue-router'
import * as echarts from 'echarts'
import { getFiles, getProjects, getWeeklyReports, getTools, getClosingProjects, getLeaveApplications, getReimbursements, getMeetings, getOfficeSupplies } from '../services/api'
import { getBusinessTrips, getProjectApplications } from '../services/workflow'

// 设置 ECharts 全局默认配置
echarts.registerTheme('default', {
  textStyle: {
    fontFamily: 'Microsoft YaHei, SimHei, sans-serif'
  },
  tooltip: {
    trigger: 'item',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderColor: '#4169E1',
    borderWidth: 2,
    borderRadius: 10,
    padding: 15,
    textStyle: {
      color: '#333',
      fontSize: 14,
      fontWeight: '500',
      fontFamily: 'Microsoft YaHei, SimHei, sans-serif'
    }
  }
});

const router = useRouter()
const currentUser = ref('用户')

// 权限管理
const permissions = ref<any[]>([])

// 计算属性：是否为管理员（包括总经理角色）
const isAdmin = computed(() => {
  const role = localStorage.getItem('role')
  const username = localStorage.getItem('username')
  return role === 'admin' || username === '总经理'
})

// 检查是否有特定权限（基于菜单路径）
// 简化权限检查，先让系统能正常运行
const hasPermission = (menuPath: string) => {
  console.log('权限检查 - menuPath:', menuPath, '-> 允许访问')
  return true
}

// 加载用户权限
const loadUserPermissions = () => {
  try {
    const storedPermissions = localStorage.getItem('permissions')
    if (storedPermissions) {
      permissions.value = JSON.parse(storedPermissions)
    }
  } catch (error) {
    console.error('加载权限失败:', error)
  }
}

// 从服务器获取最新的权限数据
const fetchLatestPermissions = async () => {
  try {
    const token = localStorage.getItem('token')
    if (token) {
      // 这里应该调用一个API来获取最新的权限数据
      // 由于目前没有这样的API，我们暂时清空权限数据，强制用户重新登录
      // 实际项目中，应该调用类似 /api/user/permissions 的API
      console.log('获取最新权限数据')
    }
  } catch (error) {
    console.error('获取最新权限数据失败:', error)
  }
}

// 仪表盘统计数�?
const fileStats = ref({
  total: 0,
  categories: 0
})

const projectStats = ref({
  total: 0,
  categories: 0
})

const monthlyReportStats = ref({
  total: 0,
  pending: 0
})

const toolStats = ref({
  total: 0,
  categories: 0
})

// ECharts 实例引用
const trendChart = ref<HTMLElement | null>(null)
const pieChart = ref<HTMLElement | null>(null)
const rankingChart = ref<HTMLElement | null>(null)
const comparisonChart = ref<HTMLElement | null>(null)

// ECharts 实例
let trendChartInstance: echarts.ECharts | null = null
let pieChartInstance: echarts.ECharts | null = null
let rankingChartInstance: echarts.ECharts | null = null
let comparisonChartInstance: echarts.ECharts | null = null

const handleUser = () => {
  // 用户功能
  console.log('用户功能')
}

const handleLogout = () => {
  // 清除本地存储中的登录信息
  localStorage.removeItem('token')
  localStorage.removeItem('userId')
  localStorage.removeItem('username')
  localStorage.removeItem('role')
  localStorage.removeItem('user')
  localStorage.removeItem('permissions')
  // 跳转到登录页�?
  router.push('/login')
}

// 获取当前登录用户信息
const loadCurrentUser = () => {
  // 从localStorage中获取用户名，这里简化处理，实际应该从后端API获取
  // 由于我们在登录时没有存储用户名，所以这里使用默认值
  const username = localStorage.getItem('username') || '用户'
  // 如果是admin用户，显示系统管理员
  if (username === 'admin') {
    currentUser.value = '系统管理员'
  } else {
    // 从emp_姓名_时间戳格式中提取真实姓名
    const match = username.match(/^emp_(.+?)_\d+$/)
    if (match) {
      currentUser.value = match[1]
    } else {
      currentUser.value = username
    }
  }
}

// 初始化趋势图表（成交项目�?
const initTrendChart = async () => {
  if (trendChart.value) {
    trendChartInstance = echarts.init(trendChart.value)
    
    // 从API获取成交项目数据
    try {
      const projectsResponse = await getClosingProjects()
      
      if (projectsResponse.success) {
        // 初始化每月项目数�?
        const monthlyData = Array(12).fill(0)
        
        // 计算每个月的项目�?
        projectsResponse.data.forEach((project: any) => {
          if (project.dealTime) {
            const dealDate = new Date(project.dealTime)
            const month = dealDate.getMonth() // 0-11
            if (month >= 0 && month < 12) {
              monthlyData[month]++
            }
          }
        })
        
        console.log('成交项目月度数据:', monthlyData)
        
        // 计算Y轴最大值，确保图表有足够的空间
        const maxValue = Math.max(...monthlyData, 5) * 1.2
        
        const option = {
          tooltip: {
            trigger: 'axis',
            axisPointer: {
              type: 'cross',
              label: {
                backgroundColor: 'rgba(51, 51, 51, 0.9)',
                color: '#fff',
                borderColor: '#333',
                borderWidth: 1,
                borderRadius: 4,
                padding: [8, 12]
              }
            },
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            borderColor: '#e0e0e0',
            borderWidth: 1,
            borderRadius: 6,
            padding: 10,
            textStyle: {
              color: '#333',
              fontSize: 13
            },
            formatter: function(params: any) {
              return `${params[0].name}<br/>${params[0].seriesName}: ${params[0].value}个`
            }
          },
          grid: {
            left: '3%',
            right: '4%',
            bottom: '20%',
            top: '15%',
            containLabel: true
          },
          xAxis: {
            type: 'category',
              boundaryGap: false,
              data: ['呼和浩特', '巴彦淖尔', '乌海', '阿拉善盟', '鄂尔多斯', '包头', '乌兰察布', '锡林郭勒', '赤峰', '通辽', '兴安', '呼伦贝尔'],
            axisLine: {
              lineStyle: {
                color: '#e0e0e0'
              }
            },
            axisLabel: {
              color: '#666',
              fontSize: 10,
              margin: 12,
              interval: 0,
              rotate: 45
            },
            axisTick: {
              show: false
            }
          },
          yAxis: {
            type: 'value',
            min: 0,
            max: maxValue,
            axisLine: {
              show: true,
              lineStyle: {
                color: '#e0e0e0'
              }
            },
            axisLabel: {
              color: '#666',
              fontSize: 12,
              margin: 12,
              formatter: '{value}'
            },
            splitLine: {
              lineStyle: {
                color: '#f0f0f0',
                type: 'dashed'
              }
            },
            axisTick: {
              show: false
            }
          },
          animation: true,
          animationDuration: 2000,
          animationEasing: 'elasticOut',
          animationDelay: function(idx) {
            return idx * 100;
          },
          series: [
            {
              name: '项目个数',
              type: 'line',
              smooth: true,
              symbol: 'circle',
              symbolSize: 8,
              showSymbol: true,
              lineStyle: {
                color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [
                  { offset: 0, color: '#4169E1' },
                  { offset: 1, color: '#87CEFA' }
                ]),
                width: 3,
                shadowColor: 'rgba(65, 105, 225, 0.3)',
                shadowBlur: 8,
                shadowOffsetX: 0,
                shadowOffsetY: 2
              },
              itemStyle: {
                color: new echarts.graphic.RadialGradient(0.5, 0.5, 0.5, [
                  { offset: 0, color: '#4169E1' },
                  { offset: 1, color: '#87CEFA' }
                ]),
                borderColor: '#fff',
                borderWidth: 2,
                shadowColor: 'rgba(65, 105, 225, 0.3)',
                shadowBlur: 6,
                shadowOffsetX: 0,
                shadowOffsetY: 2
              },
              areaStyle: {
                color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                  { offset: 0, color: 'rgba(65, 105, 225, 0.2)' },
                  { offset: 1, color: 'rgba(65, 105, 225, 0.05)' }
                ])
              },
              data: monthlyData,
              emphasis: {
                focus: 'series',
                itemStyle: {
                  symbolSize: 12,
                  shadowBlur: 10,
                  shadowColor: 'rgba(52, 152, 219, 0.6)'
                },
                lineStyle: {
                  width: 4
                }
              },
              animationDuration: 1500,
              animationEasing: 'cubicOut',
              animationDelay: function(idx) {
                return idx * 100;
              }
            }
          ]
        }
        trendChartInstance.setOption(option)
      }
    } catch (error) {
      console.error('加载成交项目数据失败:', error)
      // 显示默认数据
      const option = {
        tooltip: {
          trigger: 'axis',
          axisPointer: {
            type: 'cross',
            label: {
              backgroundColor: 'rgba(100, 149, 237, 0.9)',
              color: '#fff',
              borderColor: '#6495ED',
              borderWidth: 1,
              borderRadius: 4,
              padding: [8, 12]
            }
          },
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          borderColor: '#6495ED',
          borderWidth: 1,
          borderRadius: 8,
          padding: 12,
          textStyle: {
            color: '#333',
            fontSize: 14
          }
        },
        grid: {
          left: '-5%',
          right: '12%',
          bottom: '20%',
          top: '15%',
          containLabel: true
        },
        xAxis: {
          type: 'category',
              boundaryGap: false,
              data: ['呼和浩特', '巴彦淖尔', '乌海', '阿拉善盟', '鄂尔多斯', '包头', '乌兰察布', '锡林郭勒', '赤峰', '通辽', '兴安', '呼伦贝尔'],
          axisLine: {
            lineStyle: {
              color: 'rgba(100, 149, 237, 0.3)'
            }
          },
          axisLabel: {
            color: 'rgba(51, 51, 51, 0.7)',
            fontSize: 10,
            margin: 15,
            interval: 0,
            rotate: 45
          },
          axisTick: {
            show: false
          }
        },
        yAxis: {
          type: 'value',
          min: 0,
          max: 5,
          axisLine: {
            show: true,
            lineStyle: {
              color: 'rgba(100, 149, 237, 0.3)'
            }
          },
          axisLabel: {
            color: 'rgba(51, 51, 51, 0.7)',
            fontSize: 12,
            margin: 15,
            formatter: '{value}'
          },
          splitLine: {
            lineStyle: {
              color: 'rgba(100, 149, 237, 0.1)',
              type: 'dashed'
            }
          },
          axisTick: {
            show: false
          }
        },
        animation: true,
        animationDuration: 1500,
        animationEasing: 'cubicOut',
        series: [
            {
              name: '项目个数',
              type: 'line',
              smooth: true,
              symbol: 'circle',
              symbolSize: 12,
              showSymbol: true,
              lineStyle: {
                color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [
                  { offset: 0, color: '#4169E1' },
                  { offset: 1, color: '#87CEFA' }
                ]),
                width: 5,
                shadowColor: 'rgba(65, 105, 225, 0.6)',
                shadowBlur: 15,
                shadowOffsetX: 0,
                shadowOffsetY: 5
              },
              itemStyle: {
                color: new echarts.graphic.RadialGradient(0.5, 0.5, 0.5, [
                  { offset: 0, color: '#4169E1' },
                  { offset: 1, color: '#87CEFA' }
                ]),
                borderColor: '#fff',
                borderWidth: 4,
                shadowColor: 'rgba(65, 105, 225, 0.9)',
                shadowBlur: 12,
                shadowOffsetX: 0,
                shadowOffsetY: 3
              },
              areaStyle: {
                color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                  { offset: 0, color: 'rgba(65, 105, 225, 0.6)' },
                  { offset: 1, color: 'rgba(135, 206, 250, 0.1)' }
                ])
              },
              data: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
              emphasis: {
                focus: 'series',
                itemStyle: {
                  symbolSize: 18,
                  shadowBlur: 20,
                  shadowColor: 'rgba(65, 105, 225, 1)'
                },
                lineStyle: {
                  width: 6
                }
              },
              animationDuration: 2000,
              animationEasing: 'elasticOut',
              animationDelay: function(idx) {
                return idx * 100;
              }
            }
          ]
      }
      trendChartInstance.setOption(option)
    }
  }
}

// 初始化饼图（项目分类数
const initPieChart = async () => {
  if (pieChart.value) {
    // 先销毁旧实例
    if (pieChartInstance) {
      pieChartInstance.dispose()
    }
    // 重新初始化
    pieChartInstance = echarts.init(pieChart.value)
    
    // 从API获取项目数据
    try {
      const projectsResponse = await getProjects()
      
      if (projectsResponse.success) {
        // 计算每个分类的项目数
        const categoryCounts: Record<string, number> = {}
        projectsResponse.data.list.forEach((project: any) => {
          const category = project.projectType || project.project_type || '其他'
          categoryCounts[category] = (categoryCounts[category] || 0) + 1
        })
        
        // 准备饼图数据
        const pieData = Object.entries(categoryCounts).map(([name, value]) => ({
          name,
          value
        }))
        
        console.log('Pie data:', pieData)
        
        // 定义颜色数组 - 使用纯色，避免渐变可能导致的渲染问题
        const colors = [
          '#4169E1',
          '#4682B4',
          '#20B2AA',
          '#32CD32',
          '#FFD700',
          '#9370DB',
          '#FF6B6B',
          '#FF6347'
        ]
        
        const option = {
          tooltip: {
            trigger: 'item',
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            borderColor: '#4169E1',
            borderWidth: 2,
            borderRadius: 10,
            padding: 15,
            textStyle: {
              color: '#333',
              fontSize: 14,
              fontWeight: '500',
              fontFamily: 'Arial, Microsoft YaHei, SimHei, sans-serif'
            },
            formatter: function(params: any) {
              return params.seriesName + '<br/>' + params.name + ': ' + params.value + '个(' + params.percent.toFixed(1) + '%)'
            },
            extraCssText: 'box-shadow: 0 4px 12px rgba(65, 105, 225, 0.3);'
          },
          textStyle: {
            fontFamily: 'Arial, Microsoft YaHei, SimHei, sans-serif'
          },
          legend: {
            orient: 'vertical',
            left: '8%',
            top: 'center',
            textStyle: {
              color: 'rgba(51, 51, 51, 0.8)',
              fontSize: 13,
              fontWeight: '500',
              fontFamily: 'Arial, Microsoft YaHei, SimHei, sans-serif'
            },
            itemWidth: 16,
            itemHeight: 16,
            itemGap: 20,
            formatter: '{name}'
          },
          color: colors,
          animation: true,
          animationDuration: 2000,
          animationEasing: 'elasticOut',
          animationType: 'scale',
          animationThreshold: 2,
          series: [
            {
              name: '项目分类',
              type: 'pie',
              radius: ['45%', '75%'],
              center: ['65%', '50%'],
              avoidLabelOverlap: false,
              selectedMode: 'single',
              selectedOffset: 10,
              minAngle: 5,
              data: pieData,
              emphasis: {
                itemStyle: {
                  shadowBlur: 25,
                  shadowOffsetX: 0,
                  shadowColor: 'rgba(65, 105, 225, 0.9)'
                },
                scale: true,
                scaleSize: 20,
                label: {
                  show: true,
                  fontWeight: 'bold',
                  fontFamily: 'Arial, Microsoft YaHei, SimHei, sans-serif'
                }
              },
              itemStyle: {
                borderRadius: 15,
                borderColor: 'rgba(255, 255, 255, 0.95)',
                borderWidth: 4,
                shadowColor: 'rgba(65, 105, 225, 0.4)',
                shadowBlur: 10,
                shadowOffsetX: 0,
                shadowOffsetY: 3
              },
              label: {
                show: true,
                position: 'outside',
                align: 'center',
                verticalAlign: 'middle',
                formatter: '{b}\n{c}',
                color: 'rgba(51, 51, 51, 0.8)',
                fontSize: 13,
                fontWeight: '500',
                distance: 20,
                fontFamily: 'Arial, Microsoft YaHei, SimHei, sans-serif'
              },
              labelLine: {
                show: true,
                length: 20,
                length2: 15,
                lineStyle: {
                  color: 'rgba(65, 105, 225, 0.4)',
                  width: 2,
                  type: 'solid'
                }
              }
            }
          ]
        }
        pieChartInstance.setOption(option, true)
      }
    } catch (error) {
      console.error('加载项目分类数据失败:', error)
      // 显示默认数据
      const defaultData = [
        { value: 15, name: '软件项目' },
        { value: 10, name: '硬件项目' },
        { value: 8, name: '服务项目' },
        { value: 5, name: '其他项目' }
      ]
      
      // 定义颜色数组 - 使用纯色
      const colors = [
        '#4169E1',
        '#32CD32',
        '#FF6B6B',
        '#9370DB'
      ]
      
      const option = {
        tooltip: {
          trigger: 'item',
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          borderColor: '#4169E1',
          borderWidth: 2,
          borderRadius: 10,
          padding: 15,
          textStyle: {
            color: '#333',
            fontSize: 14,
            fontWeight: '500',
            fontFamily: 'Arial, Microsoft YaHei, SimHei, sans-serif'
          },
          formatter: function(params: any) {
            return params.seriesName + '<br/>' + params.name + ': ' + params.value + '个(' + params.percent.toFixed(1) + '%)'
          },
          extraCssText: 'box-shadow: 0 4px 12px rgba(65, 105, 225, 0.3);'
        },
        legend: {
          orient: 'vertical',
          left: '8%',
          top: 'center',
          textStyle: {
            color: 'rgba(51, 51, 51, 0.8)',
            fontSize: 13,
            fontWeight: '500',
            fontFamily: 'Arial, Microsoft YaHei, SimHei, sans-serif'
          },
          itemWidth: 16,
          itemHeight: 16,
          itemGap: 20,
          formatter: '{name}'
        },
        color: colors,
        animation: true,
        animationDuration: 2500,
        animationEasing: 'elasticOut',
        animationType: 'scale',
        animationThreshold: 2,
        animationDelay: function(idx) {
          return idx * 200;
        },
        series: [
          {
            name: '项目分类',
            type: 'pie',
            radius: ['45%', '75%'],
            center: ['65%', '50%'],
            avoidLabelOverlap: false,
            selectedMode: 'single',
            selectedOffset: 10,
            data: defaultData,
            emphasis: {
              itemStyle: {
                shadowBlur: 25,
                shadowOffsetX: 0,
                shadowColor: 'rgba(65, 105, 225, 0.9)'
              },
              scale: true,
              scaleSize: 20,
              label: {
                show: true,
                fontWeight: 'bold',
                fontFamily: 'Arial, Microsoft YaHei, SimHei, sans-serif'
              }
            },
            itemStyle: {
              borderRadius: 15,
              borderColor: 'rgba(255, 255, 255, 0.95)',
              borderWidth: 4,
              shadowColor: 'rgba(65, 105, 225, 0.4)',
              shadowBlur: 10,
              shadowOffsetX: 0,
              shadowOffsetY: 3
            },
            label: {
              show: true,
              position: 'outside',
              align: 'center',
              verticalAlign: 'middle',
              formatter: '{b}\n{c}',
              color: 'rgba(51, 51, 51, 0.8)',
              fontSize: 13,
              fontWeight: '500',
              distance: 20,
              fontFamily: 'Arial, Microsoft YaHei, SimHei, sans-serif'
            },
            labelLine: {
              show: true,
              length: 20,
              length2: 15,
              lineStyle: {
                color: 'rgba(65, 105, 225, 0.4)',
                width: 2,
                type: 'solid'
              }
            }
          }
        ]
      }
      pieChartInstance.setOption(option, true)
    }
  }
}

// 初始化排名图表（文件个数�?
const initRankingChart = async () => {
  if (rankingChart.value) {
    rankingChartInstance = echarts.init(rankingChart.value)
    
    // 从API获取文件数据
    try {
      const filesResponse = await getFiles()
      
      if (filesResponse.success) {
        // 计算每个分类的文件数�?
        const categoryCounts: Record<string, number> = {}
        filesResponse.data.forEach((file: any) => {
          const category = file.category || '其他'
          categoryCounts[category] = (categoryCounts[category] || 0) + 1
        })
        
        // 准备图表数据
        const categoryData = Object.entries(categoryCounts).map(([name, value]) => ({
          name,
          count: value
        }))
        
        // 按文件数量降序排�?
        const sortedData = categoryData.sort((a, b) => b.count - a.count)
        
        const categoryNames = sortedData.map(item => item.name)
        const fileCounts = sortedData.map(item => item.count)
        
        console.log('使用文件存储模块数据:', categoryNames, fileCounts)
        
        // 计算X轴最大值，确保图表有足够的空间
        const maxValue = Math.max(...fileCounts, 10) * 1.2
        
        const option = {
          tooltip: {
            trigger: 'axis',
            axisPointer: {
              type: 'shadow',
              label: {
                backgroundColor: 'rgba(100, 149, 237, 0.9)',
                color: '#fff',
                borderColor: '#6495ED',
                borderWidth: 1,
                borderRadius: 4,
                padding: [8, 12]
              }
            },
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            borderColor: '#6495ED',
            borderWidth: 1,
            borderRadius: 8,
            padding: 12,
            textStyle: {
              color: '#333',
              fontSize: 14
            },
            formatter: function(params: any) {
              return `${params[0].name}<br/>${params[0].seriesName}: ${params[0].value}个`
            }
          },
          grid: {
            left: '20%', // 增加左侧空间以显示完整的分类名称
            right: '8%',
            bottom: '3%',
            top: '10%',
            containLabel: true
          },
          xAxis: {
            type: 'value',
            min: 0,
            max: maxValue,
            axisLine: {
              show: true,
              lineStyle: {
                color: 'rgba(100, 149, 237, 0.3)'
              }
            },
            axisLabel: {
              color: 'rgba(51, 51, 51, 0.7)',
              fontSize: 12,
              margin: 15,
              formatter: '{value}'
            },
            splitLine: {
              lineStyle: {
                color: 'rgba(100, 149, 237, 0.1)',
                type: 'dashed'
              }
            },
            axisTick: {
              show: false
            }
          },
          yAxis: {
            type: 'category',
            data: categoryNames,
            axisLine: {
              show: true,
              lineStyle: {
                color: 'rgba(100, 149, 237, 0.3)'
              }
            },
            axisLabel: {
              color: 'rgba(51, 51, 51, 0.7)',
              fontSize: 12,
              margin: 15,
              interval: 0
            },
            axisTick: {
              show: false
            }
          },
          animation: true,
          animationDuration: 2000,
          animationEasing: 'elasticOut',
          animationDelay: function(idx) {
            return idx * 150;
          },
          series: [
            {
              name: '文件个数',
              type: 'bar',
              data: fileCounts,
              barWidth: '65%',
              itemStyle: {
                color: function(params: any) {
                  // 为每个柱子生成不同的渐变色彩
                  const colors = [
                    new echarts.graphic.LinearGradient(0, 0, 1, 0, [
                      { offset: 0, color: '#4169E1' },
                      { offset: 1, color: '#87CEFA' }
                    ]),
                    new echarts.graphic.LinearGradient(0, 0, 1, 0, [
                      { offset: 0, color: '#4682B4' },
                      { offset: 1, color: '#B0C4DE' }
                    ]),
                    new echarts.graphic.LinearGradient(0, 0, 1, 0, [
                      { offset: 0, color: '#20B2AA' },
                      { offset: 1, color: '#7FFFD4' }
                    ]),
                    new echarts.graphic.LinearGradient(0, 0, 1, 0, [
                      { offset: 0, color: '#32CD32' },
                      { offset: 1, color: '#98FB98' }
                    ]),
                    new echarts.graphic.LinearGradient(0, 0, 1, 0, [
                      { offset: 0, color: '#FFD700' },
                      { offset: 1, color: '#FFFAF0' }
                    ])
                  ]
                  return colors[params.dataIndex % colors.length]
                },
                borderRadius: [0, 10, 10, 0],
                shadowColor: 'rgba(65, 105, 225, 0.4)',
                shadowBlur: 12,
                shadowOffsetX: 0,
                shadowOffsetY: 3
              },
              label: {
                show: true,
                position: 'right',
                color: function(params: any) {
                  // 标签颜色与柱子颜色匹�?
                  const labelColors = ['#4169E1', '#4682B4', '#20B2AA', '#32CD32', '#FFD700']
                  return labelColors[params.dataIndex % labelColors.length]
                },
                fontSize: 13,
                fontWeight: 'bold',
                distance: 15,
                formatter: '{c}个'
              },
              emphasis: {
                itemStyle: {
                  shadowBlur: 20,
                  shadowColor: 'rgba(65, 105, 225, 0.8)',
                  scale: true,
                  scaleX: 1.05,
                  scaleY: 1.05
                },
                label: {
                  fontSize: 15,
                  fontWeight: 'bold'
                }
              },
              animationDuration: 1500,
              animationEasing: 'elasticOut',
              animationDelay: function(idx) {
                return idx * 100
              }
            }
          ]
        }
        
        rankingChartInstance.setOption(option)
      }
    } catch (error) {
      console.error('加载文件分类数据失败:', error)
      // 显示默认数据
      const defaultData = [
        { name: '综合平台', count: 10 },
        { name: '三位一体', count: 8 },
        { name: '智慧农业', count: 5 },
        { name: '乡村振兴', count: 3 },
        { name: '其他', count: 2 }
      ]
      
      const sortedData = defaultData.sort((a, b) => b.count - a.count)
      const categoryNames = sortedData.map(item => item.name)
      const fileCounts = sortedData.map(item => item.count)
      
      const option = {
        tooltip: {
          trigger: 'axis',
          axisPointer: {
            type: 'shadow',
            label: {
              backgroundColor: 'rgba(100, 149, 237, 0.9)',
              color: '#fff',
              borderColor: '#6495ED',
              borderWidth: 1,
              borderRadius: 4,
              padding: [8, 12]
            }
          },
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          borderColor: '#6495ED',
          borderWidth: 1,
          borderRadius: 8,
          padding: 12,
          textStyle: {
            color: '#333',
            fontSize: 14
          },
          formatter: function(params: any) {
            return `${params[0].name}<br/>${params[0].seriesName}: ${params[0].value}个`
          }
        },
        grid: {
          left: '20%', // 增加左侧空间以显示完整的分类名称
          right: '8%',
          bottom: '3%',
          top: '10%',
          containLabel: true
        },
        xAxis: {
          type: 'value',
          min: 0,
          max: 15,
          axisLine: {
            show: true,
            lineStyle: {
              color: 'rgba(100, 149, 237, 0.3)'
            }
          },
          axisLabel: {
            color: 'rgba(51, 51, 51, 0.7)',
            fontSize: 12,
            margin: 15,
            formatter: '{value}'
          },
          splitLine: {
            lineStyle: {
              color: 'rgba(100, 149, 237, 0.1)',
              type: 'dashed'
            }
          },
          axisTick: {
            show: false
          }
        },
        yAxis: {
          type: 'category',
          data: categoryNames,
          axisLine: {
            show: true,
            lineStyle: {
              color: 'rgba(100, 149, 237, 0.3)'
            }
          },
          axisLabel: {
            color: 'rgba(51, 51, 51, 0.7)',
            fontSize: 12,
            margin: 15,
            interval: 0
          },
          axisTick: {
            show: false
          }
        },
        animation: true,
        animationDuration: 1500,
        animationEasing: 'cubicOut',
        series: [
            {
              name: '文件个数',
              type: 'bar',
              data: fileCounts,
              barWidth: '65%',
              itemStyle: {
                color: function(params: any) {
                  // 为每个柱子生成不同的渐变色彩
                  const colors = [
                    new echarts.graphic.LinearGradient(0, 0, 1, 0, [
                      { offset: 0, color: '#4169E1' },
                      { offset: 1, color: '#87CEFA' }
                    ]),
                    new echarts.graphic.LinearGradient(0, 0, 1, 0, [
                      { offset: 0, color: '#4682B4' },
                      { offset: 1, color: '#B0C4DE' }
                    ]),
                    new echarts.graphic.LinearGradient(0, 0, 1, 0, [
                      { offset: 0, color: '#20B2AA' },
                      { offset: 1, color: '#7FFFD4' }
                    ]),
                    new echarts.graphic.LinearGradient(0, 0, 1, 0, [
                      { offset: 0, color: '#32CD32' },
                      { offset: 1, color: '#98FB98' }
                    ]),
                    new echarts.graphic.LinearGradient(0, 0, 1, 0, [
                      { offset: 0, color: '#FFD700' },
                      { offset: 1, color: '#FFFAF0' }
                    ])
                  ]
                  return colors[params.dataIndex % colors.length]
                },
                borderRadius: [0, 10, 10, 0],
                shadowColor: 'rgba(65, 105, 225, 0.4)',
                shadowBlur: 12,
                shadowOffsetX: 0,
                shadowOffsetY: 3
              },
              label: {
                show: true,
                position: 'right',
                color: function(params: any) {
                  // 标签颜色与柱子颜色匹�?
                  const labelColors = ['#4169E1', '#4682B4', '#20B2AA', '#32CD32', '#FFD700']
                  return labelColors[params.dataIndex % labelColors.length]
                },
                fontSize: 13,
                fontWeight: 'bold',
                distance: 15,
                formatter: '{c}个'
              },
              emphasis: {
                itemStyle: {
                  shadowBlur: 20,
                  shadowColor: 'rgba(65, 105, 225, 0.8)',
                  scale: true,
                  scaleX: 1.05,
                  scaleY: 1.05
                },
                label: {
                  fontSize: 15,
                  fontWeight: 'bold'
                }
              },
              animationDuration: 1500,
              animationEasing: 'elasticOut',
              animationDelay: function(idx) {
                return idx * 100
              }
            }
          ]
      }
      
      rankingChartInstance.setOption(option)
    }
  }
}

// 初始化对比图表（OA审批�?
const initComparisonChart = async () => {
  if (comparisonChart.value) {
    comparisonChartInstance = echarts.init(comparisonChart.value)
    
    // 从API获取OA审批数据
    // 初始化数据为0
    let leaveCount = 0
    let reimbursementCount = 0
    let meetingCount = 0
    let projectCount = 0
    let businessTripCount = 0
    
    console.log('开始获取OA审批数据');
    
    try {
      console.log('获取请假申请数据...');
      const leaveResponse = await getLeaveApplications()
      console.log('请假申请数据:', leaveResponse);
      leaveCount = leaveResponse.success && Array.isArray(leaveResponse.data) ? leaveResponse.data.length : 0
      console.log('请假申请个数:', leaveCount);
    } catch (error) {
      console.error('获取请假申请数据失败:', error)
    }
    
    try {
      console.log('获取报销数据...');
      const reimbursementResponse = await getReimbursements()
      console.log('报销数据:', reimbursementResponse);
      reimbursementCount = reimbursementResponse.success && Array.isArray(reimbursementResponse.data) ? reimbursementResponse.data.length : 0
      console.log('报销个数:', reimbursementCount);
    } catch (error) {
      console.error('获取报销数据失败:', error)
    }
    
    try {
      console.log('获取会议数据...');
      const meetingResponse = await getMeetings()
      console.log('会议数据:', meetingResponse);
      meetingCount = meetingResponse.success && Array.isArray(meetingResponse.data) ? meetingResponse.data.length : 0
      console.log('会议个数:', meetingCount);
    } catch (error) {
      console.error('获取会议数据失败:', error)
    }
    
    try {
      console.log('获取项目申请数据...');
      const projectResponse = await getProjectApplications()
      console.log('项目申请数据:', projectResponse);
      projectCount = projectResponse.success && Array.isArray(projectResponse.data?.list) ? projectResponse.data.list.length : 0
      console.log('项目申请个数:', projectCount);
    } catch (error) {
      console.error('获取项目申请数据失败:', error)
    }
    
    try {
      console.log('获取出差申请数据...');
      const businessTripResponse = await getBusinessTrips()
      console.log('出差申请数据:', businessTripResponse);
      businessTripCount = businessTripResponse.success && Array.isArray(businessTripResponse.data) ? businessTripResponse.data.length : 0
      console.log('出差申请个数:', businessTripCount);
    } catch (error) {
      console.error('获取出差申请数据失败:', error)
    }
    
    const approvalData = [businessTripCount, leaveCount, reimbursementCount, projectCount, meetingCount]
    console.log('最终审批数�?', approvalData);
    
    const option = {
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'shadow',
          label: {
            backgroundColor: 'rgba(100, 149, 237, 0.9)',
            color: '#fff',
            borderColor: '#6495ED',
            borderWidth: 1,
            borderRadius: 4,
            padding: [8, 12]
          }
        },
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        borderColor: '#6495ED',
        borderWidth: 1,
        borderRadius: 8,
        padding: 12,
        textStyle: {
          color: '#333',
          fontSize: 14
        },
        formatter: function(params: any) {
          return `${params[0].name}<br/>${params[0].seriesName}: ${params[0].value}个`
        }
      },
      legend: {
        data: ['审批'],
        textStyle: {
          color: 'rgba(51, 51, 51, 0.7)',
          fontSize: 12
        },
        top: '10%',
        right: '8%'
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '15%',
        top: '25%',
        containLabel: true
      },
      xAxis: {
        type: 'category',
        data: ['出差', '请假', '报销', '项目', '会议'],
        axisLine: {
          show: true,
          lineStyle: {
            color: 'rgba(100, 149, 237, 0.3)'
          }
        },
        axisLabel: {
          color: 'rgba(51, 51, 51, 0.7)',
          fontSize: 12,
          margin: 15,
          interval: 0,
          rotate: 0
        },
        axisTick: {
          show: false
        }
      },
      yAxis: {
        type: 'value',
        axisLine: {
          show: true,
          lineStyle: {
            color: 'rgba(100, 149, 237, 0.3)'
          }
        },
        axisLabel: {
          color: 'rgba(51, 51, 51, 0.7)',
          fontSize: 12,
          margin: 15,
          formatter: '{value}'
        },
        splitLine: {
          lineStyle: {
            color: 'rgba(100, 149, 237, 0.1)',
            type: 'dashed'
          }
        },
        axisTick: {
          show: false
        }
      },
      animation: true,
      animationDuration: 2000,
      animationEasing: 'elasticOut',
      animationDelay: function(idx) {
        return idx * 150;
      },
      series: [
            {
              name: '审批',
              type: 'bar',
              data: approvalData,
              barWidth: '65%',
              itemStyle: {
                color: function(params: any) {
                  // 为每个柱子生成不同的渐变色彩
                  const colors = [
                    new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                      { offset: 0, color: '#4169E1' },
                      { offset: 1, color: '#87CEFA' }
                    ]),
                    new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                      { offset: 0, color: '#4682B4' },
                      { offset: 1, color: '#B0C4DE' }
                    ]),
                    new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                      { offset: 0, color: '#20B2AA' },
                      { offset: 1, color: '#7FFFD4' }
                    ]),
                    new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                      { offset: 0, color: '#32CD32' },
                      { offset: 1, color: '#98FB98' }
                    ]),
                    new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                      { offset: 0, color: '#FFD700' },
                      { offset: 1, color: '#FFFAF0' }
                    ])
                  ]
                  return colors[params.dataIndex % colors.length]
                },
                borderRadius: [10, 10, 0, 0],
                shadowColor: 'rgba(65, 105, 225, 0.4)',
                shadowBlur: 12,
                shadowOffsetX: 0,
                shadowOffsetY: 3
              },
              label: {
                show: true,
                position: 'top',
                color: function(params: any) {
                  // 标签颜色与柱子颜色匹�?
                  const labelColors = ['#4169E1', '#4682B4', '#20B2AA', '#32CD32', '#FFD700']
                  return labelColors[params.dataIndex % labelColors.length]
                },
                fontSize: 13,
                fontWeight: 'bold',
                distance: 15,
                formatter: '{c}个'
              },
              emphasis: {
                itemStyle: {
                  shadowBlur: 20,
                  shadowColor: 'rgba(65, 105, 225, 0.8)',
                  scale: true,
                  scaleX: 1.05,
                  scaleY: 1.05
                },
                label: {
                  fontSize: 15,
                  fontWeight: 'bold'
                }
              },
              animationDuration: 1500,
              animationEasing: 'elasticOut',
              animationDelay: function(idx) {
                return idx * 100
              }
            }
          ]
    }
    comparisonChartInstance.setOption(option)
  }
}

// 响应式调整图表大�?
const handleResize = () => {
  trendChartInstance?.resize()
  pieChartInstance?.resize()
  rankingChartInstance?.resize()
  comparisonChartInstance?.resize()
}

// 加载仪表盘数�?
const loadDashboardData = async () => {
  try {
    // 获取文件数据
    const filesResponse = await getFiles()
    if (filesResponse.success) {
      fileStats.value = {
        total: filesResponse.data.length,
        categories: new Set(filesResponse.data.map((file: any) => file.categoryId).filter(Boolean)).size
      }
    }
    
    // 获取项目数据
    const projectsResponse = await getProjects()
    if (projectsResponse.success) {
      projectStats.value = {
        total: projectsResponse.data.list.length,
        categories: new Set(projectsResponse.data.list.map((project: any) => project.project_type)).size
      }
    }
    
    // 获取月报数据
    const reportsResponse = await getWeeklyReports()
    if (reportsResponse.success) {
      monthlyReportStats.value = {
        total: reportsResponse.data.length,
        pending: 0 // 这里可以根据实际业务逻辑计算待提交的月报数量
      }
    }
    
    // 获取工具数据
    const toolsResponse = await getTools()
    if (toolsResponse.success) {
      toolStats.value = {
        total: toolsResponse.data.length,
        categories: new Set(toolsResponse.data.map((tool: any) => tool.category)).size
      }
    }
  } catch (error) {
    console.error('加载仪表盘数据失�?', error)
  }
}

// 组件挂载时初始化
onMounted(async () => {
  loadCurrentUser()
  loadUserPermissions()
  await loadDashboardData()
  setTimeout(async () => {
    await initTrendChart()
    await initPieChart()
    await initRankingChart()
    await initComparisonChart()
  }, 100)
  
  window.addEventListener('resize', handleResize)
})
</script>

<style scoped>
.home-container {
  width: 100%;
  height: 100vh;
  display: flex;
  flex-direction: column;
  color: #333;
  position: relative;
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
  overflow: hidden;
  animation: pageFadeIn 0.8s ease-out;
}

@keyframes pageFadeIn {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.home-container::before {
  content: '';
  position: absolute;
  top: -50%;
  left: -50%;
  width: 200%;
  height: 200%;
  background: radial-gradient(circle, rgba(100, 149, 237, 0.1) 0%, transparent 70%);
  animation: float 20s ease-in-out infinite;
  z-index: 0;
}

@keyframes float {
  0% {
    transform: translate(0, 0) rotate(0deg);
  }
  50% {
    transform: translate(5%, 5%) rotate(180deg);
  }
  100% {
    transform: translate(0, 0) rotate(360deg);
  }
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
  animation: headerSlideDown 0.5s ease-out;
}

@keyframes headerSlideDown {
  from {
    opacity: 0;
    transform: translateY(-20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.logo {
  display: flex;
  align-items: center;
  position: relative;
  z-index: 1;
}

.logo-text {
  font-size: 1.5rem;
  font-weight: bold;
  color: #333;
  text-shadow: 0 0 10px rgba(100, 149, 237, 0.3);
  position: relative;
  z-index: 2;
  transition: all 0.3s ease;
}

.logo-text:hover {
  transform: scale(1.05);
  text-shadow: 0 0 20px rgba(100, 149, 237, 0.6);
}

.logo-glow {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 120%;
  height: 120%;
  background: radial-gradient(circle, rgba(100, 149, 237, 0.4), transparent 70%);
  filter: blur(20px);
  opacity: 0;
  transition: opacity 0.3s ease;
  z-index: 1;
}

.logo:hover .logo-glow {
  opacity: 1;
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
  transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  position: relative;
  overflow: hidden;
  border: none;
  background: none;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
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
  box-shadow: 0 4px 15px rgba(100, 149, 237, 0.4);
  transform: translateY(-2px);
}

.nav-item-indicator {
  position: absolute;
  bottom: -2px;
  left: 50%;
  transform: translateX(-50%) scaleX(0);
  width: 80%;
  height: 2px;
  background: linear-gradient(90deg, #6495ED, #87CEFA);
  border-radius: 1px;
  transition: transform 0.3s ease;
}

.nav-item:hover .nav-item-indicator,
.nav-item.active .nav-item-indicator {
  transform: translateX(-50%) scaleX(1);
}

.user-btn {
  background: rgba(100, 149, 237, 0.2);
  color: #6495ED;
  border: 1px solid rgba(100, 149, 237, 0.4);
  border-radius: 6px;
  padding: 0.5rem 1rem;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  position: relative;
  overflow: hidden;
  font-size: 14px;
  font-weight: 500;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
}

.user-btn::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(100, 149, 237, 0.2), transparent);
  transition: left 0.3s ease;
}

.user-btn:hover::before {
  left: 100%;
}

.user-btn:hover {
  background: rgba(100, 149, 237, 0.3);
  box-shadow: 0 4px 15px rgba(100, 149, 237, 0.4);
  transform: translateY(-2px);
}

.logout-btn {
  background: rgba(244, 67, 54, 0.1);
  color: #f44336;
  border: 1px solid rgba(244, 67, 54, 0.3);
  border-radius: 6px;
  padding: 0.5rem 1rem;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  position: relative;
  overflow: hidden;
  font-size: 14px;
  font-weight: 500;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
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
  box-shadow: 0 4px 15px rgba(244, 67, 54, 0.4);
  transform: translateY(-2px);
}

/* 主容�?*/
.main-container {
  flex: 1;
  display: flex;
  position: relative;
  z-index: 1;
  overflow: hidden;
  animation: mainContainerFadeIn 0.6s ease-out 0.2s both;
}

@keyframes mainContainerFadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

/* 左侧导航�?*/
.sidebar {
  width: 187px;
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(10px);
  border-right: 1px solid rgba(100, 149, 237, 0.3);
  padding: 1.5rem 1rem;
  overflow-y: auto;
  position: relative;
  z-index: 10;
  box-shadow: 2px 0 10px rgba(0, 0, 0, 0.1);
  animation: sidebarSlideIn 0.5s ease-out 0.3s both;
}

@keyframes sidebarSlideIn {
  from {
    opacity: 0;
    transform: translateX(-20px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

.sidebar-content {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.sidebar-nav {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  flex: 1;
}

.sidebar-item {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  border-radius: 8px;
  color: rgba(51, 51, 51, 0.8);
  text-decoration: none;
  transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  position: relative;
  overflow: hidden;
  animation: sidebarItemFadeIn 0.4s ease-out;
}

@keyframes sidebarItemFadeIn {
  from {
    opacity: 0;
    transform: translateX(-10px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

.sidebar-item:nth-child(1) { animation-delay: 0.4s; }
.sidebar-item:nth-child(2) { animation-delay: 0.45s; }
.sidebar-item:nth-child(3) { animation-delay: 0.5s; }
.sidebar-item:nth-child(4) { animation-delay: 0.55s; }
.sidebar-item:nth-child(5) { animation-delay: 0.6s; }
.sidebar-item:nth-child(6) { animation-delay: 0.65s; }
.sidebar-item:nth-child(7) { animation-delay: 0.7s; }
.sidebar-item:nth-child(8) { animation-delay: 0.75s; }
.sidebar-item:nth-child(9) { animation-delay: 0.8s; }
.sidebar-item:nth-child(10) { animation-delay: 0.85s; }

.sidebar-item::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(100, 149, 237, 0.2), transparent);
  transition: left 0.3s ease;
}

.sidebar-item:hover::before,
.sidebar-item.active::before {
  left: 100%;
}

.sidebar-item:hover,
.sidebar-item.active {
  color: #333;
  background: rgba(100, 149, 237, 0.2);
  box-shadow: 0 6px 20px rgba(100, 149, 237, 0.4);
  transform: translateX(8px);
}

.sidebar-item-indicator {
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%) scaleY(0);
  width: 3px;
  height: 60%;
  background: linear-gradient(180deg, #6495ED, #87CEFA);
  border-radius: 0 2px 2px 0;
  transition: transform 0.3s ease;
}

.sidebar-item:hover .sidebar-item-indicator,
.sidebar-item.active .sidebar-item-indicator {
  transform: translateY(-50%) scaleY(1);
}

.sidebar-icon {
  width: 32px;
  height: 32px;
  background: linear-gradient(45deg, #6495ED, #87CEFA);
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  flex-shrink: 0;
  box-shadow: 0 4px 10px rgba(100, 149, 237, 0.4);
  transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  position: relative;
  overflow: hidden;
}

.sidebar-icon::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.4), transparent);
  transition: left 0.3s ease;
}

.sidebar-item:hover .sidebar-icon::before,
.sidebar-item.active .sidebar-icon::before {
  left: 100%;
}

.sidebar-item:hover .sidebar-icon,
.sidebar-item.active .sidebar-icon {
  transform: scale(1.15) rotate(5deg);
  box-shadow: 0 8px 20px rgba(100, 149, 237, 0.6);
}

.sidebar-icon svg {
  width: 16px;
  height: 16px;
  transition: all 0.3s ease;
}

.sidebar-item:hover .sidebar-icon svg,
.sidebar-item.active .sidebar-icon svg {
  transform: scale(1.1);
}



/* 右侧内容�?*/
.content {
  flex: 1;
  padding: 2rem;
  overflow-y: auto;
  position: relative;
  animation: contentFadeIn 0.6s ease-out 0.4s both;
}

@keyframes contentFadeIn {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* 仪表�?*/
.dashboard {
  min-height: 100%;
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

/* 数据卡片 */
.dashboard-cards {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1rem;
}

.dashboard-card {
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.95), rgba(240, 248, 255, 0.95));
  border: 1px solid rgba(100, 149, 237, 0.4);
  border-radius: 16px;
  padding: 1.8rem;
  backdrop-filter: blur(15px);
  box-shadow: 0 4px 20px rgba(100, 149, 237, 0.2);
  transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  position: relative;
  overflow: hidden;
  animation: cardFadeIn 0.5s ease-out;
}

@keyframes cardFadeIn {
  from {
    opacity: 0;
    transform: translateY(20px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.dashboard-card:nth-child(1) { animation-delay: 0.5s; }
.dashboard-card:nth-child(2) { animation-delay: 0.55s; }
.dashboard-card:nth-child(3) { animation-delay: 0.6s; }
.dashboard-card:nth-child(4) { animation-delay: 0.65s; }

.dashboard-card::before {
  content: '';
  position: absolute;
  top: -2px;
  left: -2px;
  right: -2px;
  bottom: -2px;
  background: linear-gradient(45deg, #6495ED, #87CEFA, #6495ED);
  border-radius: 18px;
  z-index: -1;
  opacity: 0;
  transition: opacity 0.4s ease;
  animation: borderGlow 3s linear infinite;
  background-size: 200% 200%;
}

@keyframes borderGlow {
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}

.dashboard-card:hover::before {
  opacity: 1;
}

.dashboard-card:hover {
  transform: translateY(-8px) scale(1.03);
  box-shadow: 0 8px 30px rgba(100, 149, 237, 0.4);
  border-color: rgba(100, 149, 237, 0.8);
}

.dashboard-card:hover .card-icon {
  transform: scale(1.15) rotate(5deg);
  box-shadow: 0 6px 20px rgba(100, 149, 237, 0.6);
}

.dashboard-card:hover .stat-value {
  transform: translateY(-3px);
  text-shadow: 0 0 15px rgba(100, 149, 237, 0.8);
}

.dashboard-card:hover .stat-item {
  background: rgba(100, 149, 237, 0.15);
  border-color: rgba(100, 149, 237, 0.4);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
}

.card-header h3 {
  font-size: 1.1rem;
  font-weight: 600;
  color: #333;
  margin: 0;
  text-shadow: 0 0 10px rgba(100, 149, 237, 0.3);
}

.card-icon {
  width: 40px;
  height: 40px;
  background: linear-gradient(45deg, #6495ED, #87CEFA);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  box-shadow: 0 4px 10px rgba(100, 149, 237, 0.4);
  transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

.card-icon svg {
  width: 20px;
  height: 20px;
  transition: all 0.4s ease;
}

.card-body {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.card-stats {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
}

.stat-item {
  flex: 1;
  text-align: center;
  padding: 1rem;
  background: rgba(100, 149, 237, 0.1);
  border-radius: 8px;
  border: 1px solid rgba(100, 149, 237, 0.2);
  transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

.stat-value {
  display: block;
  font-size: 1.8rem;
  font-weight: 700;
  color: #6495ED;
  text-shadow: 0 0 10px rgba(100, 149, 237, 0.4);
  margin-bottom: 0.5rem;
  transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

.stat-label {
  font-size: 0.9rem;
  color: rgba(51, 51, 51, 0.7);
  transition: all 0.4s ease;
}

.visualization-card h3 {
  font-size: 1.1rem;
  font-weight: 600;
  color: #4682B4;
  margin: 0;
  text-shadow: 0 0 15px rgba(100, 149, 237, 0.4);
  text-align: center;
  border-bottom: 2px solid rgba(100, 149, 237, 0.3);
  padding-bottom: 0.8rem;
  letter-spacing: 0.5px;
  transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

.chart-container {
  flex: 1;
  position: relative;
  min-height: 320px;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.9), rgba(240, 248, 255, 0.9));
  border-radius: 10px;
  border: 1px solid rgba(100, 149, 237, 0.3);
  overflow: hidden;
  box-shadow: inset 0 2px 5px rgba(100, 149, 237, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

/* 图表区域 */
.dashboard-charts {
  display: flex;
  gap: 1rem;
  flex: 1;
  overflow-x: auto;
}

.chart-container {
  background: rgba(15, 23, 42, 0.9);
  border: 1px solid rgba(59, 130, 246, 0.3);
  border-radius: 8px;
  padding: 1rem;
  backdrop-filter: none;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  width: 500px;
  height: 400px;
}

.chart-container h3 {
  font-size: 1rem;
  font-weight: 500;
  color: #e2e8f0;
  margin: 0;
  text-shadow: none;
}

.chart-placeholder {
  flex: 1;
  display: flex;
  align-items: flex-end;
  justify-content: space-around;
  gap: 0.5rem;
  padding: 1rem;
  background: rgba(59, 130, 246, 0.05);
  border-radius: 6px;
  border: 1px solid rgba(59, 130, 246, 0.15);
  height: 320px;
}

.chart-bar {
  flex: 1;
  background: #3b82f6;
  border-radius: 4px 4px 0 0;
  transition: all 0.2s ease;
  position: relative;
  min-width: 20px;
}

.chart-bar:hover {
  transform: scaleY(1.03);
  box-shadow: 0 0 8px rgba(59, 130, 246, 0.4);
}

/* 折线�?*/
.line-chart {
  position: relative;
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 1rem 0;
}

.chart-x-axis {
  display: flex;
  justify-content: space-between;
  margin-top: auto;
  padding: 0 0.5rem;
  font-size: 0.7rem;
  color: rgba(255, 255, 255, 0.7);
}

.chart-x-axis span {
  flex: 1;
  text-align: center;
  white-space: nowrap;
  line-height: 1;
}

.chart-lines {
  position: relative;
  flex: 1;
  margin: 1rem 0;
  padding: 0 1rem;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.chart-svg {
  width: 100%;
  height: 100%;
  display: block;
  z-index: 1;
}

/* 数据可视化区�?*/
.dashboard-visualization {
  display: flex;
  flex-direction: column;
  gap: 2.5rem;
  margin-top: 3rem;
  padding: 2rem;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.95), rgba(240, 248, 255, 0.95));
  border-radius: 20px;
  border: 1px solid rgba(100, 149, 237, 0.4);
  box-shadow: 0 8px 30px rgba(100, 149, 237, 0.2);
  position: relative;
  overflow: hidden;
  z-index: 1;
}

.dashboard-visualization::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 4px;
  background: linear-gradient(90deg, #6495ED, #87CEFA, #6495ED);
  border-radius: 20px 20px 0 0;
  z-index: 2;
}

.dashboard-visualization::after {
  content: '';
  position: absolute;
  top: 50%;
  right: -10%;
  width: 30%;
  height: 100%;
  background: radial-gradient(circle, rgba(100, 149, 237, 0.1) 0%, transparent 70%);
  transform: translateY(-50%);
  z-index: 0;
  animation: pulse 4s ease-in-out infinite;
}

@keyframes pulse {
  0% {
    opacity: 0.3;
    transform: translateY(-50%) scale(1);
  }
  50% {
    opacity: 0.6;
    transform: translateY(-50%) scale(1.1);
  }
  100% {
    opacity: 0.3;
    transform: translateY(-50%) scale(1);
  }
}

.visualization-row {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 2.5rem;
}

.visualization-card {
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.95), rgba(240, 248, 255, 0.95));
  border: 1px solid rgba(100, 149, 237, 0.4);
  border-radius: 16px;
  padding: 1.8rem;
  backdrop-filter: blur(15px);
  box-shadow: 0 8px 25px rgba(100, 149, 237, 0.2);
  display: flex;
  flex-direction: column;
  gap: 1.8rem;
  transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  position: relative;
  overflow: hidden;
}

/* 响应式设�?*/
@media (max-width: 1440px) {
  .dashboard-cards {
    grid-template-columns: repeat(2, 1fr);
    gap: 1.5rem;
  }
  
  .visualization-row {
    grid-template-columns: 1fr;
    gap: 2rem;
  }
  
  .visualization-card {
    min-height: 380px;
  }
}

@media (max-width: 1200px) {
  .dashboard-cards {
    grid-template-columns: repeat(2, 1fr);
    gap: 1.5rem;
  }
  
  .visualization-row {
    grid-template-columns: 1fr;
    gap: 2rem;
  }
  
  .visualization-card {
    min-height: 350px;
  }
  
  .content {
    padding: 1.5rem;
  }
  
  .dashboard-visualization {
    padding: 1.5rem;
    gap: 2rem;
  }
}

@media (max-width: 768px) {
  .dashboard-cards {
    grid-template-columns: 1fr;
    gap: 1.2rem;
  }
  
  .dashboard-visualization {
    padding: 1.2rem;
    gap: 1.5rem;
    margin-top: 2rem;
  }
  
  .visualization-row {
    gap: 1.5rem;
  }
  
  .visualization-card {
    padding: 1.2rem;
    min-height: 300px;
    border-radius: 12px;
  }
  
  .visualization-card h3 {
    font-size: 1rem;
    padding-bottom: 0.6rem;
  }
  
  .chart-container {
    min-height: 280px;
    padding: 15px;
  }
  
  .content {
    padding: 1rem;
  }
  
  .header {
    padding: 0 1rem;
  }
  
  .sidebar {
    width: 160px;
    padding: 1rem 0.8rem;
  }
  
  .stat-value {
    font-size: 1.5rem;
  }
  
  .stat-label {
    font-size: 0.8rem;
  }
}

@media (max-width: 480px) {
  .dashboard-cards {
    grid-template-columns: 1fr;
    gap: 1rem;
  }
  
  .dashboard-visualization {
    padding: 1rem;
    gap: 1.2rem;
    margin-top: 1.5rem;
  }
  
  .visualization-card {
    padding: 1rem;
    min-height: 280px;
    border-radius: 10px;
  }
  
  .visualization-card h3 {
    font-size: 0.9rem;
    padding-bottom: 0.5rem;
  }
  
  .chart-container {
    min-height: 250px;
    padding: 10px;
  }
  
  .content {
    padding: 0.8rem;
  }
  
  .header {
    padding: 0 0.8rem;
  }
  
  .logo-text {
    font-size: 1.2rem;
  }
  
  .sidebar {
    width: 140px;
    padding: 0.8rem 0.6rem;
  }
  
  .sidebar-item {
    padding: 0.8rem;
    gap: 0.8rem;
  }
  
  .stat-value {
    font-size: 1.3rem;
  }
  
  .stat-label {
    font-size: 0.7rem;
  }
  
  .card-icon {
    width: 35px;
    height: 35px;
  }
  
  .card-icon svg {
    width: 18px;
    height: 18px;
  }
}

.visualization-card::before {
  content: '';
  position: absolute;
  top: -2px;
  left: -2px;
  right: -2px;
  bottom: -2px;
  background: linear-gradient(45deg, #6495ED, #87CEFA, #6495ED);
  border-radius: 18px;
  z-index: -1;
  opacity: 0;
  transition: opacity 0.4s ease;
  animation: borderGlow 3s linear infinite;
  background-size: 200% 200%;
}

.visualization-card:hover::before {
  opacity: 1;
}

.visualization-card:hover {
  transform: translateY(-8px) scale(1.02);
  box-shadow: 0 16px 40px rgba(100, 149, 237, 0.4);
}

.visualization-card:hover h3 {
  transform: translateY(-2px);
  text-shadow: 0 0 20px rgba(100, 149, 237, 0.6);
}

.visualization-card:hover .chart-container {
  box-shadow: inset 0 4px 10px rgba(100, 149, 237, 0.2);
}

.visualization-card h3 {
  font-size: 1.1rem;
  font-weight: 600;
  color: #4682B4;
  margin: 0;
  text-shadow: 0 0 15px rgba(100, 149, 237, 0.4);
  text-align: center;
  border-bottom: 2px solid rgba(100, 149, 237, 0.3);
  padding-bottom: 0.8rem;
  letter-spacing: 0.5px;
}

/* 图表容器 */
.chart-container {
  flex: 1;
  position: relative;
  min-height: 320px;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.9), rgba(240, 248, 255, 0.9));
  border-radius: 10px;
  border: 1px solid rgba(100, 149, 237, 0.3);
  overflow: hidden;
  box-shadow: inset 0 2px 5px rgba(100, 149, 237, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.echart-container {
  width: 100%;
  height: 100%;
  min-height: 280px;
  max-width: 95%;
  max-height: 95%;
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
}

.footer-content {
  display: flex;
  justify-content: center;
  align-items: center;
}

/* 滚动条样�?*/
.sidebar::-webkit-scrollbar,
.content::-webkit-scrollbar {
  width: 8px;
}

.sidebar::-webkit-scrollbar-track,
.content::-webkit-scrollbar-track {
  background: rgba(15, 23, 42, 0.6);
  border-radius: 4px;
}

.sidebar::-webkit-scrollbar-thumb,
.content::-webkit-scrollbar-thumb {
  background: rgba(59, 130, 246, 0.5);
  border-radius: 4px;
}

.sidebar::-webkit-scrollbar-thumb:hover,
.content::-webkit-scrollbar-thumb:hover {
  background: rgba(59, 130, 246, 0.7);
}

/* 动画 */
@keyframes borderGlow {
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}

/* 响应式设�?*/
@media (max-width: 768px) {
  .sidebar {
    width: 200px;
  }
  
  .dashboard-cards {
    grid-template-columns: 1fr;
  }
  
  .dashboard-charts {
    grid-template-columns: 1fr;
  }
  
  .chart-container {
    min-width: 100%;
  }
}
</style>
