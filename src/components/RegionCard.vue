<template>
  <div class="classification-card" :class="{ hovered }">
    <div class="card-content" @click="$emit('click')">
      <div class="card-header">
        <h3 class="card-title">{{ name }}</h3>
        <span class="project-count">{{ projectCount || 0 }}个项目</span>
      </div>
      <div class="card-body">
        <p class="card-description">{{ description }}</p>
      </div>
    </div>
    <div v-if="actionsVisible" class="card-actions">
      <button class="action-btn edit-btn" @click.stop="$emit('edit')" title="编辑">
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
        </svg>
      </button>
      <button class="action-btn delete-btn" @click.stop="$emit('delete')" title="删除">
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
        </svg>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  name: string
  projectCount?: number
  description?: string
  hovered?: boolean
  actionsVisible?: boolean
}>()

defineEmits<{
  click: []
  edit: []
  delete: []
}>()
</script>

<style scoped>
.classification-card {
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.95), rgba(248, 250, 252, 0.95));
  border: 1px solid rgba(100, 149, 237, 0.25);
  border-radius: 16px;
  padding: 2rem;
  backdrop-filter: blur(10px);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.12);
  transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  cursor: pointer;
  position: relative;
  overflow: hidden;
  animation: fadeInUp 0.6s ease-out;
}

.classification-card::before {
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

.classification-card:hover::before {
  opacity: 1;
}

.classification-card:hover {
  transform: translateY(-8px) scale(1.02);
  box-shadow: 0 12px 30px rgba(100, 149, 237, 0.35);
  border-color: rgba(100, 149, 237, 0.6);
}

.card-content {
  flex: 1;
  cursor: pointer;
  position: relative;
  z-index: 1;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.card-header {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1.25rem;
  position: relative;
  z-index: 1;
}

.card-title {
  font-size: 1.4rem;
  font-weight: 600;
  color: #2c3e50;
  margin: 0;
  line-height: 1.3;
}

.project-count {
  background: linear-gradient(135deg, #6495ED, #4169E1);
  color: #fff;
  padding: 0.3rem 0.9rem;
  border-radius: 20px;
  font-size: 0.85rem;
  font-weight: 500;
  box-shadow: 0 2px 8px rgba(100, 149, 237, 0.3);
  transition: all 0.3s ease;
  white-space: nowrap;
}

.project-count:hover {
  transform: scale(1.05);
  box-shadow: 0 5px 15px rgba(100, 149, 237, 0.4);
}

.card-body {
  color: rgba(44, 62, 80, 0.7);
  position: relative;
  z-index: 1;
  flex: 1;
  display: flex;
  align-items: center;
}

.card-description {
  margin: 0;
  font-size: 1.05rem;
  line-height: 1.6;
}

.card-actions {
  position: absolute;
  top: 1.25rem;
  right: 1.25rem;
  display: flex;
  gap: 0.75rem;
  z-index: 10;
  opacity: 0;
  transition: all 0.3s ease;
  transform: translateY(-10px);
}

.classification-card:hover .card-actions {
  opacity: 1;
  transform: translateY(0);
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

.classification-card:nth-child(1) { animation-delay: 0.1s; }
.classification-card:nth-child(2) { animation-delay: 0.2s; }
.classification-card:nth-child(3) { animation-delay: 0.3s; }
.classification-card:nth-child(4) { animation-delay: 0.4s; }
.classification-card:nth-child(5) { animation-delay: 0.5s; }
.classification-card:nth-child(6) { animation-delay: 0.6s; }

@media (max-width: 768px) {
  .classification-card {
    padding: 1.5rem;
  }
  .card-title {
    font-size: 1.2rem;
  }
}
</style>
