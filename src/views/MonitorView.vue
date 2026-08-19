<template>
  <div class="monitor-container">
    <el-card class="header-card">
      <div class="header-content">
        <h2>系统监控仪表板</h2>
        <div class="status-summary">
          <el-tag 
            :type="healthStatus.overall === 'healthy' ? 'success' : 
                   healthStatus.overall === 'warning' ? 'warning' : 'danger'"
            size="large"
          >
            {{ healthStatus.overall === 'healthy' ? '系统健康' : 
               healthStatus.overall === 'warning' ? '系统警告' : '系统异常' }}
          </el-tag>
          <span class="update-time">最后更新: {{ lastUpdateTime }}</span>
          <el-button type="primary" size="small" @click="refreshAll" :loading="loading">
            刷新
          </el-button>
        </div>
      </div>
    </el-card>

    <!-- 系统健康状态 -->
    <el-row :gutter="20" class="status-row">
      <el-col :span="8" v-for="(component, key) in healthStatus.components" :key="key">
        <el-card :class="`status-card status-${component.status}`">
          <div class="status-icon">
            <el-icon :size="40" :color="getStatusColor(component.status)">
              <component :is="getStatusIcon(component.status)" />
            </el-icon>
          </div>
          <div class="status-info">
            <h3>{{ getComponentName(key) }}</h3>
            <p :class="`status-message status-${component.status}`">
              {{ component.message }}
            </p>
            <p v-if="component.responseTime" class="response-time">
              响应时间: {{ component.responseTime }}ms
            </p>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 监控指标卡片 -->
    <el-row :gutter="20" class="metrics-row">
      <el-col :span="6" v-for="metric in flattenedMetrics" :key="metric.name">
        <el-card class="metric-card">
          <div class="metric-header">
            <span class="metric-name">{{ getMetricDisplayName(metric.name) }}</span>
            <el-tag 
              :type="getMetricStatus(metric.value, metric.name) === 'danger' ? 'danger' : 
                     getMetricStatus(metric.value, metric.name) === 'warning' ? 'warning' : 'success'"
              size="small"
            >
              {{ getMetricStatus(metric.value, metric.name) === 'danger' ? '异常' : 
                 getMetricStatus(metric.value, metric.name) === 'warning' ? '警告' : '正常' }}
            </el-tag>
          </div>
          <div class="metric-value">
            <span class="value">{{ metric.value }}</span>
            <span class="unit">{{ metric.unit }}</span>
          </div>
          <div class="metric-footer">
            <span class="timestamp">{{ formatTime(metric.timestamp) }}</span>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 图表区域 -->
    <el-row :gutter="20" class="charts-row">
      <el-col :span="12" v-for="chart in chartConfigs" :key="chart.key">
        <el-card class="chart-card">
          <template #header>
            <div class="chart-header">
              <span>{{ chart.title }}</span>
              <el-select 
                v-model="chart.timeRange" 
                size="small" 
                @change="loadChartData"
                style="width: 120px"
              >
                <el-option label="1小时" :value="1" />
                <el-option label="6小时" :value="6" />
                <el-option label="24小时" :value="24" />
                <el-option label="7天" :value="168" />
              </el-select>
            </div>
          </template>
          <div :id="chart.key" class="chart-container"></div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 告警记录 -->
    <el-card class="alerts-card">
      <template #header>
        <div class="alerts-header">
          <span>告警记录</span>
          <el-button type="primary" size="small" @click="loadAlerts">
            刷新
          </el-button>
        </div>
      </template>
      <el-table :data="alerts" stripe style="width: 100%">
        <el-table-column prop="alert_type" label="告警类型" width="150" />
        <el-table-column prop="alert_level" label="级别" width="100">
          <template #default="scope">
            <el-tag 
              :type="scope.row.alert_level === 'CRITICAL' ? 'danger' : 
                     scope.row.alert_level === 'HIGH' ? 'danger' : 
                     scope.row.alert_level === 'WARNING' ? 'warning' : 'info'"
              size="small"
            >
              {{ scope.row.alert_level }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="alert_message" label="消息" />
        <el-table-column prop="created_at" label="时间" width="180">
          <template #default="scope">
            {{ formatTime(scope.row.created_at) }}
          </template>
        </el-table-column>
        <el-table-column prop="is_resolved" label="状态" width="100">
          <template #default="scope">
            <el-tag 
              :type="scope.row.is_resolved ? 'success' : 'danger'"
              size="small"
            >
              {{ scope.row.is_resolved ? '已解决' : '未解决' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="120" v-if="hasPermission">
          <template #default="scope">
            <el-button 
              v-if="!scope.row.is_resolved"
              type="primary" 
              size="small" 
              @click="resolveAlert(scope.row.id)"
            >
              解决
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, nextTick, computed } from 'vue';
import * as echarts from 'echarts';
import axios from 'axios';

// 响应式数据
const healthStatus = ref({
  overall: 'unknown',
  components: {}
});

const summaryMetrics = ref({
  system: [],
  database: [],
  application: []
});

const alerts = ref([]);
const lastUpdateTime = ref('');
const loading = ref(false);

// 图表配置
const chartConfigs = ref([
  { key: 'cpuChart', title: 'CPU使用率', metricName: 'cpu_usage', timeRange: 24 },
  { key: 'memoryChart', title: '内存使用率', metricName: 'memory_usage', timeRange: 24 },
  { key: 'dbLatencyChart', title: '数据库延迟', metricName: 'db_latency', timeRange: 24 },
  { key: 'nodeMemoryChart', title: 'Node.js内存', metricName: 'node_memory', timeRange: 24 }
]);

// 图表实例
const chartInstances = {};

// 权限检查
const hasPermission = ref(false);

// 计算属性：展平所有指标
const flattenedMetrics = computed(() => {
  const allMetrics = [];
  Object.keys(summaryMetrics.value).forEach(type => {
    summaryMetrics.value[type].forEach(metric => {
      allMetrics.push(metric);
    });
  });
  return allMetrics;
});

// 获取健康状态
const loadHealthStatus = async () => {
  try {
    const response = await axios.get('/api/monitor/health');
    if (response.data.success) {
      healthStatus.value = response.data.data;
      lastUpdateTime.value = formatTime(new Date());
    }
  } catch (error) {
    console.error('获取健康状态失败:', error);
  }
};

// 获取监控摘要
const loadSummary = async () => {
  try {
    const response = await axios.get('/api/monitor/summary');
    if (response.data.success) {
      summaryMetrics.value = response.data.data;
    }
  } catch (error) {
    console.error('获取监控摘要失败:', error);
  }
};

// 获取告警记录
const loadAlerts = async () => {
  try {
    const response = await axios.get('/api/monitor/alerts?limit=20');
    if (response.data.success) {
      alerts.value = response.data.data;
    }
  } catch (error) {
    console.error('获取告警记录失败:', error);
  }
};

// 加载图表数据
const loadChartData = async () => {
  try {
    for (const chart of chartConfigs.value) {
      const response = await axios.get('/api/monitor/metrics', {
        params: {
          name: chart.metricName,
          hours: chart.timeRange
        }
      });

      if (response.data.success && response.data.data.length > 0) {
        const chartData = response.data.data[0];
        updateChart(chart.key, chartData);
      }
    }
  } catch (error) {
    console.error('加载图表数据失败:', error);
  }
};

// 更新图表
const updateChart = (chartKey, chartData) => {
  const chart = chartInstances[chartKey];
  if (!chart) return;

  const option = {
    tooltip: {
      trigger: 'axis',
      formatter: function(params) {
        const param = params[0];
        return `${param.name}<br/>${param.seriesName}: ${param.value}${chartData.unit}`;
      }
    },
    xAxis: {
      type: 'category',
      data: chartData.data.map(item => formatChartTime(item.timestamp)),
      boundaryGap: false
    },
    yAxis: {
      type: 'value',
      axisLabel: {
        formatter: `{value}${chartData.unit}`
      }
    },
    series: [{
      name: chartData.name,
      type: 'line',
      data: chartData.data.map(item => item.value),
      smooth: true,
      areaStyle: {
        opacity: 0.3
      },
      lineStyle: {
        width: 2
      }
    }],
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      containLabel: true
    }
  };

  chart.setOption(option);
};

// 初始化图表
const initCharts = () => {
  chartConfigs.value.forEach(chart => {
    const chartDom = document.getElementById(chart.key);
    if (chartDom) {
      chartInstances[chart.key] = echarts.init(chartDom);
    }
  });
  
  // 窗口大小变化时重新渲染图表
  window.addEventListener('resize', () => {
    Object.values(chartInstances).forEach(chart => chart.resize());
  });
};

// 解决告警
const resolveAlert = async (alertId) => {
  try {
    await axios.put(`/api/monitor/alerts/${alertId}/resolve`);
    await loadAlerts();
  } catch (error) {
    console.error('解决告警失败:', error);
  }
};

// 刷新所有数据
const refreshAll = async () => {
  loading.value = true;
  try {
    await Promise.all([
      loadHealthStatus(),
      loadSummary(),
      loadAlerts(),
      loadChartData()
    ]);
  } finally {
    loading.value = false;
  }
};

// 辅助函数
const getStatusColor = (status) => {
  const colors = {
    healthy: '#67C23A',
    warning: '#E6A23C',
    unhealthy: '#F56C6C',
    unknown: '#909399'
  };
  return colors[status] || colors.unknown;
};

const getStatusIcon = (status) => {
  const icons = {
    healthy: 'CircleCheck',
    warning: 'Warning',
    unhealthy: 'CircleClose',
    unknown: 'QuestionFilled'
  };
  return icons[status] || icons.unknown;
};

const getComponentName = (key) => {
  const names = {
    database: '数据库',
    application: '应用服务',
    system: '系统资源'
  };
  return names[key] || key;
};

const getMetricDisplayName = (name) => {
  const displayNames = {
    cpu_usage: 'CPU使用率',
    memory_usage: '内存使用率',
    system_load: '系统负载',
    disk_usage: '磁盘使用率',
    db_latency: '数据库延迟',
    active_connections: '活跃连接数',
    node_memory: 'Node.js内存',
    event_loop_lag: '事件循环延迟'
  };
  return displayNames[name] || name;
};

const getMetricStatus = (value, name) => {
  const thresholds = {
    cpu_usage: 80,
    memory_usage: 85,
    system_load: 2,
    disk_usage: 85,
    db_latency: 1000,
    active_connections: 100,
    node_memory: 90,
    event_loop_lag: 100
  };
  
  if (value === -1) return 'danger';
  const threshold = thresholds[name];
  if (threshold && value >= threshold) {
    return value >= threshold * 1.2 ? 'danger' : 'warning';
  }
  return 'success';
};

const formatTime = (time) => {
  if (!time) return '';
  const date = new Date(time);
  return date.toLocaleString('zh-CN');
};

const formatChartTime = (time) => {
  const date = new Date(time);
  return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
};

// 自动刷新
let refreshInterval = null;

onMounted(async () => {
  await nextTick();
  
  // 初始化图表
  initCharts();
  
  // 初始加载数据
  await refreshAll();

  // 设置自动刷新（每30秒）
  refreshInterval = setInterval(async () => {
    await Promise.all([
      loadHealthStatus(),
      loadSummary(),
      loadChartData()
    ]);
  }, 30000);

  // 检查权限
  try {
    const response = await axios.get('/api/user/info');
    const role = response.data.user?.roleName;
    hasPermission.value = ['系统管理员', '总经理'].includes(role);
  } catch (error) {
    console.error('获取用户权限失败:', error);
  }
});

onUnmounted(() => {
  // 清理定时器
  if (refreshInterval) {
    clearInterval(refreshInterval);
  }
  
  // 销毁图表实例
  Object.values(chartInstances).forEach(chart => chart.dispose());
  
  // 移除窗口监听
  window.removeEventListener('resize', () => {});
});
</script>

<style scoped>
.monitor-container {
  padding: 20px;
}

.header-card {
  margin-bottom: 20px;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-content h2 {
  margin: 0;
  color: #303133;
}

.status-summary {
  display: flex;
  align-items: center;
  gap: 15px;
}

.update-time {
  color: #909399;
  font-size: 14px;
}

.status-row {
  margin-bottom: 20px;
}

.status-card {
  border-radius: 8px;
  transition: all 0.3s;
}

.status-card.status-healthy {
  border-left: 4px solid #67C23A;
}

.status-card.status-warning {
  border-left: 4px solid #E6A23C;
}

.status-card.status-unhealthy {
  border-left: 4px solid #F56C6C;
}

.status-card.status-unknown {
  border-left: 4px solid #909399;
}

.status-icon {
  display: flex;
  justify-content: center;
  margin-bottom: 15px;
}

.status-info h3 {
  margin: 0 0 10px 0;
  font-size: 18px;
  color: #303133;
}

.status-message {
  margin: 5px 0;
  font-size: 14px;
  color: #606266;
}

.status-message.status-healthy {
  color: #67C23A;
}

.status-message.status-warning {
  color: #E6A23C;
}

.status-message.status-unhealthy {
  color: #F56C6C;
}

.status-message.status-unknown {
  color: #909399;
}

.response-time {
  margin: 5px 0 0 0;
  font-size: 12px;
  color: #909399;
}

.metrics-row {
  margin-bottom: 20px;
}

.metric-card {
  text-align: center;
  border-radius: 8px;
  transition: all 0.3s;
}

.metric-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.metric-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.metric-name {
  font-size: 14px;
  color: #606266;
}

.metric-value {
  margin: 15px 0;
}

.metric-value .value {
  font-size: 32px;
  font-weight: bold;
  color: #303133;
}

.metric-value .unit {
  font-size: 14px;
  color: #909399;
  margin-left: 5px;
}

.metric-footer {
  border-top: 1px solid #EBEEF5;
  padding-top: 10px;
}

.timestamp {
  font-size: 12px;
  color: #909399;
}

.charts-row {
  margin-bottom: 20px;
}

.chart-card {
  border-radius: 8px;
}

.chart-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.chart-container {
  height: 300px;
  width: 100%;
}

.alerts-card {
  border-radius: 8px;
}

.alerts-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

/* 响应式设计 */
@media (max-width: 1200px) {
  .metrics-row .el-col {
    margin-bottom: 20px;
  }
}

@media (max-width: 768px) {
  .status-row .el-col {
    margin-bottom: 20px;
  }
  
  .charts-row .el-col {
    margin-bottom: 20px;
  }
  
  .monitor-container {
    padding: 10px;
  }
}
</style>