<template>
  <div class="visualization-card">
    <h3>盟市项目分布</h3>
    <div class="chart-container">
      <div ref="chartRef" class="echart-container"></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import * as echarts from 'echarts'
import { getClosingProjects } from '../services/api'

const chartRef = ref<HTMLElement | null>(null)
let chartInstance: echarts.ECharts | null = null

const initChart = async () => {
  if (!chartRef.value) return
  chartInstance = echarts.init(chartRef.value)

  try {
    const projectsResponse = await getClosingProjects()

    if (projectsResponse.success) {
      const monthlyData = Array(12).fill(0)

      projectsResponse.data.forEach((project: any) => {
        if (project.dealTime) {
          const dealDate = new Date(project.dealTime)
          const month = dealDate.getMonth()
          if (month >= 0 && month < 12) {
            monthlyData[month]++
          }
        }
      })

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
            lineStyle: { color: '#e0e0e0' }
          },
          axisLabel: {
            color: '#666',
            fontSize: 10,
            margin: 12,
            interval: 0,
            rotate: 45
          },
          axisTick: { show: false }
        },
        yAxis: {
          type: 'value',
          min: 0,
          max: maxValue,
          axisLine: {
            show: true,
            lineStyle: { color: '#e0e0e0' }
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
          axisTick: { show: false }
        },
        animation: true,
        animationDuration: 2000,
        animationEasing: 'elasticOut',
        animationDelay: function(idx: number) {
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
              lineStyle: { width: 4 }
            },
            animationDuration: 1500,
            animationEasing: 'cubicOut',
            animationDelay: function(idx: number) {
              return idx * 100;
            }
          }
        ]
      }
      chartInstance.setOption(option)
    }
  } catch (error) {
    console.error('加载成交项目数据失败:', error)
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
        textStyle: { color: '#333', fontSize: 14 }
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
        axisLine: { lineStyle: { color: 'rgba(100, 149, 237, 0.3)' } },
        axisLabel: { color: 'rgba(51, 51, 51, 0.7)', fontSize: 10, margin: 15, interval: 0, rotate: 45 },
        axisTick: { show: false }
      },
      yAxis: {
        type: 'value',
        min: 0,
        max: 5,
        axisLine: { show: true, lineStyle: { color: 'rgba(100, 149, 237, 0.3)' } },
        axisLabel: { color: 'rgba(51, 51, 51, 0.7)', fontSize: 12, margin: 15, formatter: '{value}' },
        splitLine: { lineStyle: { color: 'rgba(100, 149, 237, 0.1)', type: 'dashed' } },
        axisTick: { show: false }
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
            lineStyle: { width: 6 }
          },
          animationDuration: 2000,
          animationEasing: 'elasticOut',
          animationDelay: function(idx: number) {
            return idx * 100;
          }
        }
      ]
    }
    chartInstance.setOption(option)
  }
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
