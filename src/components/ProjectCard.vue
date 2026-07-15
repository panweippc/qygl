<template>
  <div class="project-card">
    <div class="project-header">
      <h3 class="project-title">{{ project.name }}</h3>
      <div class="project-actions">
        <span class="project-status" :class="getStatusClass(project.status)">{{ project.status }}</span>
        <span class="project-status" :class="getContractFeeClass(project.contractFeeStatus || '未结')">{{ getContractFeeText(project.contractFeeStatus || '未结') }}</span>
        <span class="project-status" :class="getServiceFeeClass(project.nextYearFeeStatus || '未支付')">{{ getServiceFeeText(project.nextYearFeeStatus || '未支付') }}</span>
        <button class="action-btn edit-btn" @click="$emit('edit')" title="编辑项目">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
          </svg>
        </button>
        <button class="action-btn delete-btn" @click="$emit('delete')" title="删除项目">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
          </svg>
        </button>
      </div>
    </div>
    <p class="project-description">{{ project.description }}</p>
    <div class="project-meta">
      <span class="meta-item">
        <i class="meta-icon">📍</i>
        {{ project.provinceName }} - {{ project.cityName }} - {{ project.countyName }}
      </span>
      <span class="meta-item">
        <i class="meta-icon">💰</i>
        ¥{{ project.price?.toLocaleString() }}
      </span>
      <span class="meta-item">
        <i class="meta-icon">📅</i>
        成交时间: {{ project.dealTime }}
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  project: any
}>()

defineEmits<{
  edit: []
  delete: []
}>()

const getStatusClass = (status: string) => {
  switch (status) {
    case '进行中': return 'status-progress'
    case '已完成': return 'status-completed'
    case '已取消': return 'status-cancelled'
    default: return ''
  }
}

const getContractFeeClass = (status: string) => {
  switch (status) {
    case '结清': return 'status-contract-paid'
    case '未结': return 'status-contract-partial'
    case '未结算': return 'status-contract-unpaid'
    default: return 'status-contract-unpaid'
  }
}

const getContractFeeText = (status: string) => `合同费用：${status}`

const getServiceFeeClass = (nextYearFeeStatus: string) => {
  return nextYearFeeStatus === '已支付' ? 'status-service-active' : 'status-service-expired'
}

const getServiceFeeText = (nextYearFeeStatus: string) => {
  return nextYearFeeStatus === '已支付' ? '服务费：未到期' : '服务费：已到期'
}
</script>

<style scoped>
.project-card {
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.95), rgba(248, 250, 252, 0.95));
  border: 1px solid rgba(100, 149, 237, 0.25);
  border-radius: 16px;
  padding: 2rem;
  backdrop-filter: blur(10px);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.12);
  transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  position: relative;
  overflow: hidden;
  animation: fadeInUp 0.6s ease-out;
}

.project-card::before {
  content: '';
  position: absolute;
  top: -2px;
  left: -2px;
  right: -2px;
  bottom: -2px;
  background: linear-gradient(45deg, #6495ED, #87CEEB, #6495ED, #87CEEB);
  border-radius: 18px;
  z-index: -1;
  opacity: 0;
  transition: opacity 0.4s ease;
  animation: borderGlow 4s linear infinite;
  background-size: 300% 300%;
}

.project-card:hover::before {
  opacity: 1;
}

.project-card:hover {
  transform: translateY(-6px) scale(1.01);
  box-shadow: 0 12px 30px rgba(100, 149, 237, 0.35);
  border-color: rgba(100, 149, 237, 0.6);
}

.project-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1.25rem;
  flex-wrap: wrap;
  gap: 1rem;
  position: relative;
  z-index: 1;
}

.project-title {
  font-size: 1.5rem;
  font-weight: 600;
  color: #2c3e50;
  margin: 0;
  flex: 1;
  line-height: 1.3;
  min-width: 200px;
}

.project-actions {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.action-btn {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
  box-shadow: 0 3px 12px rgba(0, 0, 0, 0.15);
  font-size: 18px;
  position: relative;
  overflow: hidden;
}

.action-btn::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent);
  transition: left 0.5s ease;
}

.action-btn:hover::before {
  left: 100%;
}

.action-btn.edit-btn {
  background: linear-gradient(135deg, #6495ED, #4169E1);
  color: white;
}

.action-btn.edit-btn:hover {
  transform: scale(1.1);
  box-shadow: 0 5px 15px rgba(100, 149, 237, 0.4);
}

.action-btn.delete-btn {
  background: linear-gradient(135deg, #f44336, #d32f2f);
  color: white;
}

.action-btn.delete-btn:hover {
  transform: scale(1.1);
  box-shadow: 0 5px 15px rgba(244, 67, 54, 0.4);
}

.action-btn svg {
  width: 20px;
  height: 20px;
  z-index: 1;
  position: relative;
}

.project-status {
  padding: 0.45rem 1.25rem;
  border-radius: 25px;
  font-size: 0.95rem;
  font-weight: 500;
  box-shadow: 0 3px 10px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
}

.project-status:hover {
  transform: scale(1.05);
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.15);
}

.status-progress {
  background: linear-gradient(135deg, rgba(255, 193, 7, 0.2), rgba(255, 152, 0, 0.2));
  color: #e65100;
  border: 1px solid rgba(255, 193, 7, 0.4);
}

.status-completed {
  background: linear-gradient(135deg, rgba(76, 175, 80, 0.2), rgba(67, 160, 71, 0.2));
  color: #2e7d32;
  border: 1px solid rgba(76, 175, 80, 0.4);
}

.status-cancelled {
  background: linear-gradient(135deg, rgba(244, 67, 54, 0.2), rgba(211, 47, 47, 0.2));
  color: #c62828;
  border: 1px solid rgba(244, 67, 54, 0.4);
}

.status-contract-paid {
  background: linear-gradient(135deg, rgba(76, 175, 80, 0.2), rgba(67, 160, 71, 0.2));
  color: #2e7d32;
  border: 1px solid rgba(76, 175, 80, 0.4);
}

.status-contract-partial {
  background: linear-gradient(135deg, rgba(255, 193, 7, 0.2), rgba(255, 152, 0, 0.2));
  color: #e65100;
  border: 1px solid rgba(255, 193, 7, 0.4);
}

.status-contract-unpaid {
  background: linear-gradient(135deg, rgba(244, 67, 54, 0.2), rgba(211, 47, 47, 0.2));
  color: #c62828;
  border: 1px solid rgba(244, 67, 54, 0.4);
}

.status-service-active {
  background: linear-gradient(135deg, rgba(76, 175, 80, 0.2), rgba(67, 160, 71, 0.2));
  color: #2e7d32;
  border: 1px solid rgba(76, 175, 80, 0.4);
}

.status-service-expired {
  background: linear-gradient(135deg, rgba(244, 67, 54, 0.2), rgba(211, 47, 47, 0.2));
  color: #c62828;
  border: 1px solid rgba(244, 67, 54, 0.4);
}

.project-description {
  color: rgba(44, 62, 80, 0.7);
  margin: 0 0 1.25rem 0;
  line-height: 1.6;
  font-size: 1.05rem;
  position: relative;
  z-index: 1;
}

.project-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 1.25rem;
  padding-top: 1.25rem;
  border-top: 1px solid rgba(100, 149, 237, 0.25);
  position: relative;
  z-index: 1;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  color: rgba(44, 62, 80, 0.7);
  font-size: 0.95rem;
  background: rgba(248, 250, 252, 0.8);
  padding: 0.6rem 1.2rem;
  border-radius: 10px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  transition: all 0.3s ease;
}

.meta-item:hover {
  background: rgba(240, 244, 255, 0.9);
  box-shadow: 0 4px 15px rgba(100, 149, 237, 0.2);
  transform: translateY(-3px);
  color: rgba(44, 62, 80, 0.9);
}

.meta-icon {
  font-style: normal;
  font-size: 1.1rem;
  color: #6495ED;
}

.empty-message {
  text-align: center;
  padding: 4rem 2rem;
  color: rgba(44, 62, 80, 0.6);
  font-size: 1.25rem;
  font-weight: 500;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.9), rgba(248, 250, 252, 0.9));
  border-radius: 16px;
  border: 2px dashed rgba(100, 149, 237, 0.4);
  transition: all 0.3s ease;
  animation: fadeInUp 0.6s ease-out;
}

.empty-message:hover {
  border-color: rgba(100, 149, 237, 0.6);
  box-shadow: 0 4px 20px rgba(100, 149, 237, 0.2);
  transform: translateY(-5px);
}

@keyframes borderGlow {
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.project-card:nth-child(1) { animation-delay: 0.1s; }
.project-card:nth-child(2) { animation-delay: 0.2s; }
.project-card:nth-child(3) { animation-delay: 0.3s; }
.project-card:nth-child(4) { animation-delay: 0.4s; }
.project-card:nth-child(5) { animation-delay: 0.5s; }

@media (max-width: 768px) {
  .project-card {
    padding: 1.5rem;
  }
  .project-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.75rem;
  }
  .project-actions {
    width: 100%;
    justify-content: space-between;
  }
  .project-meta {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.75rem;
  }
  .meta-item {
    width: 100%;
    justify-content: space-between;
  }
  .project-title {
    font-size: 1.3rem;
  }
}
</style>
