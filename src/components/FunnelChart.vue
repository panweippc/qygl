<template>
  <div class="funnel-chart-card">
    <div class="funnel-header">
      <h3>销售漏斗转化图</h3>
      <div class="funnel-legend">
        <span v-for="item in legendData" :key="item.name" class="legend-item">
          <span class="legend-dot" :style="{ background: item.color }"></span>
          {{ item.label }}: {{ item.count }}
        </span>
      </div>
    </div>
    <div ref="chartRef" class="funnel-container"></div>
    <div v-if="!hasData" class="funnel-empty">
      <span class="empty-icon">📊</span>
      <p>暂无漏斗数据，请先导入销售记录</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import * as echarts from 'echarts'

const chartRef = ref<HTMLElement | null>(null)
let chartInstance: echarts.ECharts | null = null
const hasData = ref(false)
const legendData = ref<{ name: string; label: string; count: number; color: string }[]>([])

const funnelColors = ['#4CAF50', '#2196F3', '#FF9800', '#F44336', '#9C27B0']

const initChart = async () => {
  if (!chartRef.value) return
  try {
    const res = await fetch('/api/sales-funnel/data')
    const result = await res.json()
    if (!result.success || !result.data || result.data.length === 0) return

    const stages = result.data.map((d: any, i: number) => ({
      name: d.stageName || ('阶段' + d.stageId),
      value: d.count || 0,
      amount: d.amount || 0,
      color: funnelColors[i % funnelColors.length]
    }))

    legendData.value = stages.map(s => ({
      name: s.name,
      label: s.name,
      count: s.value,
      color: s.color
    }))

    const total = stages.reduce((sum: number, s: any) => sum + s.value, 0)
    if (total === 0) return
    hasData.value = true

    chartInstance = echarts.init(chartRef.value)
    const option = {
      tooltip: {
        trigger: 'item',
        formatter: (params: any) => {
          const stage = stages[params.dataIndex]
          return `${stage.name}<br/>数量: ${stage.value}<br/>金额: ${Number(stage.amount).toLocaleString()}`
        }
      },
      series: [{
        type: 'funnel',
        left: '5%',
        right: '20%',
        top: 20,
        bottom: 20,
        min: 0,
        max: total,
        minSize: '10%',
        maxSize: '100%',
        sort: 'descending',
        gap: 4,
        label: {
          show: true,
          position: 'inside',
          formatter: (params: any) => `${params.name}\n${params.value}`
        },
        labelLine: { length: 10, lineStyle: { width: 1 } },
        itemStyle: { borderColor: '#fff', borderWidth: 2 },
        emphasis: {
          label: { fontSize: 16 },
          itemStyle: { shadowBlur: 10, shadowOffsetX: 0, shadowColor: 'rgba(0,0,0,0.3)' }
        },
        data: stages
      }]
    }
    chartInstance.setOption(option)
  } catch (e) {
    console.error('漏斗图加载失败:', e)
  }
}

onMounted(initChart)
onUnmounted(() => { chartInstance?.dispose() })
</script>

<style scoped>
.funnel-chart-card {
  background: #fff;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 2px 12px rgba(0,0,0,0.06);
  position: relative;
}
.funnel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}
.funnel-header h3 {
  font-size: 15px;
  color: #333;
}
.funnel-legend {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}
.legend-item {
  font-size: 12px;
  color: #666;
}
.legend-dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  margin-right: 4px;
}
.funnel-container {
  width: 100%;
  height: 320px;
}
.funnel-empty {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  text-align: center;
  color: #999;
}
.funnel-empty .empty-icon {
  font-size: 40px;
}
.funnel-empty p {
  margin-top: 8px;
  font-size: 13px;
}
</style>
