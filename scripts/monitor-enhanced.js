# =====================================================
# OA系统监控方案设计文档
# 适用环境：Linux/Windows服务器
# 监控维度：系统、应用、安全、日志、业务
# =====================================================

## 一、监控架构设计

### 1.1 监控层次
```
┌─────────────────────────────────────┐
│     监控告警中心 (Grafana + AlertManager)     │
└─────────────────────────────────────┘
                    ↑
        ┌───────────┼───────────┐
        ↓           ↓           ↓
┌──────────────┐ ┌──────────┐ ┌──────────────┐
│  系统监控    │ │ 应用监控 │ │  安全监控    │
│  (NodeExporter)│ │ (Custom) │ │  (Fail2ban)  │
└──────────────┘ └──────────┘ └──────────────┘
        ↓           ↓           ↓
┌─────────────────────────────────────┐
│          数据采集层 (Prometheus)      │
└─────────────────────────────────────┘
```

### 1.2 监控工具选型

| 监控类型 | 推荐工具 | 优势 | 适用场景 |
|---------|---------|------|---------|
| 系统监控 | Prometheus + Node Exporter | 时序数据库、强大查询语言 | 服务器资源监控 |
| 应用监控 | 自定义脚本 + Prometheus | 业务指标定制 | 应用性能监控 |
| 日志监控 | ELK Stack / Loki | 日志聚合、搜索分析 | 日志分析审计 |
| 安全监控 | Fail2ban + 自定义脚本 | 实时威胁检测 | 安全事件监控 |
| 告警通知 | AlertManager + Webhook | 多渠道告警 | 异常通知 |

---

## 二、系统监控方案

### 2.1 监控指标

**CPU监控**
- CPU使用率（用户/系统/空闲）
- CPU负载（1分钟/5分钟/15分钟）
- 进程数、线程数

**内存监控**
- 内存使用率、可用内存
- 交换空间使用率
- 缓存、缓冲区使用情况

**磁盘监控**
- 磁盘使用率（每个分区）
- 磁盘I/O（读写速率、IOPS）
- 磁盘Inode使用率

**网络监控**
- 网络流量（入站/出站）
- 网络连接数（TCP/UDP）
- 网络错误数

### 2.2 部署Node Exporter

```bash
# 下载Node Exporter
wget https://github.com/prometheus/node_exporter/releases/download/v1.6.1/node_exporter-1.6.1.linux-amd64.tar.gz

# 解压
tar xvfz node_exporter-1.6.1.linux-amd64.tar.gz

# 移动到系统目录
sudo mv node_exporter-1.6.1.linux-amd64/node_exporter /usr/local/bin/

# 创建系统服务
sudo cat > /etc/systemd/system/node_exporter.service << 'EOF'
[Unit]
Description=Node Exporter
After=network.target

[Service]
User=prometheus
ExecStart=/usr/local/bin/node_exporter
Restart=always

[Install]
WantedBy=multi-user.target
EOF

# 启动服务
sudo systemctl daemon-reload
sudo systemctl enable node_exporter
sudo systemctl start node_exporter
```

### 2.3 告警规则示例

```yaml
groups:
  - name: system_alerts
    rules:
      - alert: HighCPUUsage
        expr: 100 - (avg by(instance) (rate(node_cpu_seconds_total{mode="idle"}[5m])) * 100) > 80
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High CPU usage detected"
          description: "CPU usage is above 80% for more than 5 minutes."

      - alert: HighMemoryUsage
        expr: (1 - (node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes)) * 100 > 85
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High memory usage detected"
          description: "Memory usage is above 85% for more than 5 minutes."

      - alert: DiskSpaceLow
        expr: (node_filesystem_size_bytes - node_filesystem_free_bytes) / node_filesystem_size_bytes * 100 > 85
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Low disk space detected"
          description: "Disk usage is above 85% for more than 5 minutes."
```

---

## 三、应用监控方案

### 3.1 监控指标

**性能指标**
- 响应时间（P50/P95/P99）
- 请求吞吐量（QPS）
- 错误率
- 并发连接数

**业务指标**
- 登录成功率
- API调用次数
- 数据库查询时间
- 文件上传/下载次数

**资源指标**
- Node.js进程内存使用
- 事件循环延迟
- 垃圾回收频率
- 数据库连接池状态

### 3.2 自定义应用监控脚本

我已经为你创建了应用监控脚本 `scripts/monitor-health.js`，现在创建增强版本：<tool_call>Write<arg_key>content</arg_key><arg_value>#!/usr/bin/env node
/**
 * OA系统应用监控增强脚本
 * 功能：采集应用性能指标，暴露给Prometheus抓取
 * 用途：配合Prometheus进行应用监控
 */

import http from 'http';
import fs from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 监控端口
const MONITOR_PORT = process.env.MONITOR_PORT || 9090;

// 指标存储
const metrics = {
  // 应用信息
  app_info: {
    name: 'oa-system',
    version: '1.0.0',
    uptime: 0,
    timestamp: Date.now()
  },

  // HTTP请求指标
  http_requests_total: 0,
  http_requests_success: 0,
  http_requests_error: 0,
  http_requests_duration: [],

  // 数据库指标
  db_connections_active: 0,
  db_queries_total: 0,
  db_queries_slow: 0,
  db_queries_duration: [],

  // 业务指标
  logins_total: 0,
  logins_success: 0,
  logins_failed: 0,
  logins_new_ip: 0,

  // 安全指标
  security_alerts_total: 0,
  brute_force_attempts: 0,
  ip_banned: 0,

  // 系统资源
  memory_usage: 0,
  cpu_usage: 0
};

// 更新应用运行时间
setInterval(() => {
  metrics.app_info.uptime = Math.floor((Date.now() - metrics.app_info.timestamp) / 1000);
}, 1000);

// 更新内存使用
setInterval(() => {
  const memoryUsage = process.memoryUsage();
  metrics.memory_usage = Math.round((memoryUsage.heapUsed / memoryUsage.heapTotal) * 100);
}, 5000);

// Prometheus指标格式化
function formatPrometheusMetric(name, help, type, value, labels = {}) {
  let labelString = '';
  if (Object.keys(labels).length > 0) {
    labelString = '{' + Object.entries(labels).map(([k, v]) => `${k}="${v}"`).join(',') + '}';
  }
  return `# HELP ${name} ${help}\n# TYPE ${name} ${type}\n${name}${labelString} ${value}\n`;
}

// 生成Prometheus格式的指标
function generateMetrics() {
  let output = '';

  // 应用信息
  output += formatPrometheusMetric(
    'app_info',
    'Application information',
    'gauge',
    1,
    { name: metrics.app_info.name, version: metrics.app_info.version }
  );

  output += formatPrometheusMetric(
    'app_uptime_seconds',
    'Application uptime in seconds',
    'gauge',
    metrics.app_info.uptime
  );

  // HTTP请求指标
  output += formatPrometheusMetric(
    'http_requests_total',
    'Total HTTP requests',
    'counter',
    metrics.http_requests_total
  );

  output += formatPrometheusMetric(
    'http_requests_success_total',
    'Total successful HTTP requests',
    'counter',
    metrics.http_requests_success
  );

  output += formatPrometheusMetric(
    'http_requests_error_total',
    'Total failed HTTP requests',
    'counter',
    metrics.http_requests_error
  );

  // HTTP请求时长（计算P95）
  if (metrics.http_requests_duration.length > 0) {
    const sorted = [...metrics.http_requests_duration].sort((a, b) => a - b);
    const p95Index = Math.floor(sorted.length * 0.95);
    const p95 = sorted[p95Index] || 0;

    output += formatPrometheusMetric(
      'http_requests_duration_seconds_p95',
      'HTTP request duration 95th percentile',
      'gauge',
      (p95 / 1000).toFixed(3)
    );
  }

  // 数据库指标
  output += formatPrometheusMetric(
    'db_connections_active',
    'Active database connections',
    'gauge',
    metrics.db_connections_active
  );

  output += formatPrometheusMetric(
    'db_queries_total',
    'Total database queries',
    'counter',
    metrics.db_queries_total
  );

  output += formatPrometheusMetric(
    'db_queries_slow_total',
    'Total slow database queries',
    'counter',
    metrics.db_queries_slow
  );

  // 业务指标
  output += formatPrometheusMetric(
    'logins_total',
    'Total login attempts',
    'counter',
    metrics.logins_total
  );

  output += formatPrometheusMetric(
    'logins_success_total',
    'Total successful logins',
    'counter',
    metrics.logins_success
  );

  output += formatPrometheusMetric(
    'logins_failed_total',
    'Total failed logins',
    'counter',
    metrics.logins_failed
  );

  output += formatPrometheusMetric(
    'logins_new_ip_total',
    'Total logins from new IPs',
    'counter',
    metrics.logins_new_ip
  );

  // 安全指标
  output += formatPrometheusMetric(
    'security_alerts_total',
    'Total security alerts',
    'counter',
    metrics.security_alerts_total
  );

  output += formatPrometheusMetric(
    'brute_force_attempts_total',
    'Total brute force attempts',
    'counter',
    metrics.brute_force_attempts
  );

  output += formatPrometheusMetric(
    'ip_banned_total',
    'Total IPs banned',
    'counter',
    metrics.ip_banned
  );

  // 系统资源
  output += formatPrometheusMetric(
    'app_memory_usage_percent',
    'Application memory usage percentage',
    'gauge',
    metrics.memory_usage
  );

  return output;
}

// 创建HTTP服务器暴露指标
const server = http.createServer((req, res) => {
  if (req.url === '/metrics') {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end(generateMetrics());
  } else if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'healthy', uptime: metrics.app_info.uptime }));
  } else {
    res.writeHead(404);
    res.end('Not Found');
  }
});

// 启动监控服务
server.listen(MONITOR_PORT, () => {
  console.log(`应用监控服务已启动，端口: ${MONITOR_PORT}`);
  console.log(`指标地址: http://localhost:${MONITOR_PORT}/metrics`);
  console.log(`健康检查: http://localhost:${MONITOR_PORT}/health`);
});

// 导出指标更新函数（供主应用调用）
export function updateMetrics(metricType, data) {
  switch (metricType) {
    case 'http_request':
      metrics.http_requests_total++;
      if (data.success) {
        metrics.http_requests_success++;
      } else {
        metrics.http_requests_error++;
      }
      if (data.duration) {
        metrics.http_requests_duration.push(data.duration);
        // 保持最近1000个样本
        if (metrics.http_requests_duration.length > 1000) {
          metrics.http_requests_duration.shift();
        }
      }
      break;

    case 'login':
      metrics.logins_total++;
      if (data.success) {
        metrics.logins_success++;
      } else {
        metrics.logins_failed++;
      }
      if (data.isNewIp) {
        metrics.logins_new_ip++;
      }
      break;

    case 'security_alert':
      metrics.security_alerts_total++;
      if (data.type === 'login_brute_force') {
        metrics.brute_force_attempts++;
      }
      break;

    case 'ip_banned':
      metrics.ip_banned++;
      break;

    case 'db_query':
      metrics.db_queries_total++;
      if (data.slow) {
        metrics.db_queries_slow++;
      }
      if (data.duration) {
        metrics.db_queries_duration.push(data.duration);
        if (metrics.db_queries_duration.length > 1000) {
          metrics.db_queries_duration.shift();
        }
      }
      break;

    case 'db_connections':
      metrics.db_connections_active = data.active;
      break;
  }
}

// 处理优雅关闭
process.on('SIGTERM', () => {
  console.log('收到SIGTERM信号，正在关闭监控服务...');
  server.close(() => {
    console.log('监控服务已关闭');
    process.exit(0);
  });
});

export default server;