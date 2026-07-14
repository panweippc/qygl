<template>
  <div class="visualization-card">
    <h3>OA审批</h3>
    <div class="chart-container">
      <div ref="chartRef" class="echart-container"></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import * as echarts from 'echarts'
import { getLeaveApplications, getReimbursements, getMeetings } from '../services/api'
import { getBusinessTrips, getProjectApplications } from '../services/workflow'

const chartRef = ref<HTMLElement | null>(null)
let chartInstance: echarts.ECharts | null = null

const initChart = async () => {
  if (!chartRef.value) return
  chartInstance = echarts.init(chartRef.value)

  let leaveCount = 0
  let reimbursementCount = 0
  let meetingCount = 0
  let projectCount = 0
  let businessTripCount = 0

  try {
    const leaveResponse = await getLeaveApplications()
    leaveCount = leaveResponse.success && Array.isArray(leaveResponse.data) ? leaveResponse.data.length : 0
  } catch (error) {
    console.error('获取请假申请数据失败:', error)
  }

  try {
    const reimbursementResponse = await getReimbursements()
    reimbursementCount = reimbursementResponse.success && Array.isArray(reimbursementResponse.data) ? reimbursementResponse.data.length : 0
  } catch (error) {
    console.error('获取报销数据失败:', error)
  }

  try {
    const meetingResponse = await getMeetings()
    meetingCount = meetingResponse.success && Array.isArray(meetingResponse.data) ? meetingResponse.data.length : 0
  } catch (error) {
    console.error('获取会议数据失败:', error)
  }

  try {
    const projectResponse = await getProjectApplications()
    projectCount = projectResponse.success && Array.isArray(projectResponse.data?.list) ? projectResponse.data.list.length : 0
  } catch (error) {
    console.error('获取项目申请数据失败:', error)
  }

  try {
    const businessTripResponse = await getBusinessTrips()
    businessTripCount = businessTripResponse.success && Array.isArray(businessTripResponse.data) ? businessTripResponse.data.length : 0
  } catch (error) {
    console.error('获取出差申请数据失败:', error)
  }

  const approvalData = [businessTripCount, leaveCount, reimbursementCount, projectCount, meetingCount]

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
      textStyle: { color: '#333', fontSize: 14 },
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
      axisLine: { show: true, lineStyle: { color: 'rgba(100, 149, 237, 0.3)' } },
      axisLabel: { color: 'rgba(51, 51, 51, 0.7)', fontSize: 12, margin: 15, interval: 0, rotate: 0 },
      axisTick: { show: false }
    },
    yAxis: {
      type: 'value',
      axisLine: { show: true, lineStyle: { color: 'rgba(100, 149, 237, 0.3)' } },
      axisLabel: { color: 'rgba(51, 51, 51, 0.7)', fontSize: 12, margin: 15, formatter: '{value}' },
      splitLine: { lineStyle: { color: 'rgba(100, 149, 237, 0.1)', type: 'dashed' } },
      axisTick: { show: false }
    },
    animation: true,
    animationDuration: 2000,
    animationEasing: 'elasticOut',
    animationDelay: function(idx: number) {
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
          label: { fontSize: 15, fontWeight: 'bold' }
        },
        animationDuration: 1500,
        animationEasing: 'elasticOut',
        animationDelay: function(idx: number) {
          return idx * 100
        }
      }
    ]
  }
  chartInstance.setOption(option)
}

const handleResize = () => {
  chartInstance?.resize()
}

onMounted(() => {
  setTimeout(initChart, 100)
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  chartInstance?.dispose()
})
</script>

<style scoped>
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
}

.echart-container {
  width: 100%;
  height: 100%;
  min-height: 280px;
  max-width: 95%;
  max-height: 95%;
}

@keyframes borderGlow {
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}
</style>
