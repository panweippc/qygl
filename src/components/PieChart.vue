<template>
  <div class="visualization-card">
    <h3>项目分类</h3>
    <div class="chart-container">
      <div ref="chartRef" class="echart-container"></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import * as echarts from 'echarts'
import { getProjects } from '../services/api'

const chartRef = ref<HTMLElement | null>(null)
let chartInstance: echarts.ECharts | null = null

const initChart = async () => {
  if (!chartRef.value) return
  if (chartInstance) chartInstance.dispose()
  chartInstance = echarts.init(chartRef.value)

  try {
    const projectsResponse = await getProjects()

    if (projectsResponse.success) {
      const categoryCounts: Record<string, number> = {}
      projectsResponse.data.list.forEach((project: any) => {
        const category = project.projectType || project.project_type || '其他'
        categoryCounts[category] = (categoryCounts[category] || 0) + 1
      })

      const pieData = Object.entries(categoryCounts).map(([name, value]) => ({ name, value }))

      const colors = ['#4169E1', '#4682B4', '#20B2AA', '#32CD32', '#FFD700', '#9370DB', '#FF6B6B', '#FF6347']

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
      chartInstance.setOption(option, true)
    }
  } catch (error) {
    console.error('加载项目分类数据失败:', error)
    const defaultData = [
      { value: 15, name: '软件项目' },
      { value: 10, name: '硬件项目' },
      { value: 8, name: '服务项目' },
      { value: 5, name: '其他项目' }
    ]

    const colors = ['#4169E1', '#32CD32', '#FF6B6B', '#9370DB']

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
      animationDelay: function(idx: number) {
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
    chartInstance.setOption(option, true)
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
