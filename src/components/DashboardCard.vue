<template>
  <div class="dashboard-card" :class="{ clickable: !!to }" @click="navigate">
    <div class="card-header">
      <h3>{{ title }}</h3>
      <div class="card-icon">
        <slot name="icon"></slot>
      </div>
    </div>
    <div class="card-body">
      <div class="card-stats">
        <div class="stat-item" v-for="stat in stats" :key="stat.label">
          <span class="stat-value">{{ stat.value }}</span>
          <span class="stat-label">{{ stat.label }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'

const props = defineProps<{
  title: string
  stats: { value: number; label: string }[]
  to?: string
}>()

const router = useRouter()
const navigate = () => {
  if (props.to) router.push(props.to)
}
</script>

<style scoped>
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
  from { opacity: 0; transform: translateY(20px) scale(0.95); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}

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

.dashboard-card.clickable { cursor: pointer; }

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
</style>
