<template>
  <div class="app-container">
    <!-- 全局科技背景 -->
    <div class="global-tech-bg">
      <div class="bg-grid"></div>
      <div class="bg-particles"></div>
    </div>
    
    <router-view />
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import websocketService from './services/websocket'

const router = useRouter()

// 连接WebSocket，用于监听被挤下线事件
const connectWebSocket = () => {
  try {
    console.log('正在连接全局WebSocket服务..');
    websocketService.connect();
    
    // 监听被挤下线事件
    websocketService.on('kickedOut', (data: any) => {
      console.log('被挤下线:', data);
      ElMessage.error(data.message || '您的账号在其他设备登录，已被强制退出');
      // 清除本地存储
      localStorage.removeItem('token');
      localStorage.removeItem('userId');
      localStorage.removeItem('username');
      // 跳转到登录页
      router.push('/login');
    });
    
  } catch (error) {
    console.error('全局WebSocket连接失败:', error);
  }
};

// 页面加载时检查登录状态
const checkLoginStatus = () => {
  const username = localStorage.getItem('username');
  if (username) {
    console.log(`检查登录状态，用户: ${username}`);
    // 确保WebSocket连接已建立并发送登录状态
    setTimeout(() => {
      if (websocketService.isConnected()) {
        console.log(`重新发送用户登录状态 ${username}`);
        websocketService.emit('setUserLogin', username);
      } else {
        console.log('WebSocket未连接，重新连接...');
        connectWebSocket();
      }
    }, 1000);
  }
};

// 组件挂载时连接WebSocket
onMounted(() => {
  connectWebSocket();
  checkLoginStatus();
});

// 组件卸载时清理WebSocket连接
onUnmounted(() => {
  // 不需要断开WebSocket连接，因为它是单例的
});
</script>

<style scoped>
.app-container {
  width: 100vw;
  height: 100vh;
  background: var(--bg-color);
  overflow: hidden;
  position: relative;
}

/* 全局科技背景 */
.global-tech-bg {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: -1;
  pointer-events: none;
}

.bg-grid {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-image: 
    linear-gradient(rgba(100, 149, 237, 0.1) 1px, transparent 1px),
    linear-gradient(90deg, rgba(100, 149, 237, 0.1) 1px, transparent 1px);
  background-size: 30px 30px;
  animation: gridMove 30s linear infinite;
}

@keyframes gridMove {
  0% { transform: translate(0, 0); }
  100% { transform: translate(30px, 30px); }
}

.bg-particles {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: radial-gradient(circle at 20% 30%, rgba(100, 149, 237, 0.1) 0%, transparent 20%),
              radial-gradient(circle at 80% 70%, rgba(100, 149, 237, 0.1) 0%, transparent 20%),
              radial-gradient(circle at 40% 80%, rgba(100, 149, 237, 0.1) 0%, transparent 20%),
              radial-gradient(circle at 70% 20%, rgba(100, 149, 237, 0.1) 0%, transparent 20%);
  animation: particleFloat 20s ease-in-out infinite;
}

@keyframes particleFloat {
  0%, 100% { transform: scale(1); opacity: 0.3; }
  50% { transform: scale(1.1); opacity: 0.6; }
}

/* 科技风格过渡效果 */
.tech-fade-enter-active,
.tech-fade-leave-active {
  transition: all var(--transition-slow);
}

.tech-fade-enter-from {
  opacity: 0;
  transform: translateY(20px) scale(0.95);
  filter: blur(10px);
}

.tech-fade-leave-to {
  opacity: 0;
  transform: translateY(-20px) scale(1.05);
  filter: blur(10px);
}
</style>
