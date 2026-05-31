<template>
  <div class="login-container">
    <!-- 科技背景 -->
    <div class="tech-bg">
      <div class="bg-grid"></div>
      <div class="bg-particles"></div>
    </div>
    
    <!-- 左侧信息面板 -->
    <div class="login-info-panel">
      <div class="info-content">
        <div class="info-header">
          <h1 class="info-title">科技赋能未来</h1>
          <p class="info-subtitle">宏友智慧办公平台</p>
        </div>
        
        <!-- 政策新闻 -->
        <div class="policy-news">
          <h2 class="news-title">政策新闻</h2>
          <div class="news-list">
            <!-- AI政策 -->
            <div class="news-item">
              <div class="news-icon ai-icon">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                </svg>
              </div>
              <div class="news-content">
                <h3 class="news-item-title">人工智能发展规划</h3>
                <p class="news-item-desc">国务院发布《新一代人工智能发展规划》，推动人工智能技术在各行业的深度应用，促进经济社会数字化转型</p>
              </div>
            </div>
            
            <!-- 乡村振兴 -->
            <div class="news-item">
              <div class="news-icon rural-icon">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                </svg>
              </div>
              <div class="news-content">
                <h3 class="news-item-title">乡村振兴战略</h3>
                <p class="news-item-desc">国家实施乡村振兴战略，加大对农村基础设施建设和产业发展的支持力度，促进城乡融合发展</p>
              </div>
            </div>
            
            <!-- 农业三位一体-->
            <div class="news-item">
              <div class="news-icon three-in-one-icon">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                </svg>
              </div>
              <div class="news-content">
                <h3 class="news-item-title">农业三位一体改革</h3>
                <p class="news-item-desc">推进农业生产、供销、信用三位一体综合合作改革，提高农业生产效率和农民收入</p>
              </div>
            </div>
            
            <!-- 发改委政策-->
            <div class="news-item">
              <div class="news-icon policy-icon">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                </svg>
              </div>
              <div class="news-content">
                <h3 class="news-item-title">发改委产业政策</h3>
                <p class="news-item-desc">国家发改委发布产业转型升级指导意见，支持战略性新兴产业发展，推动经济高质量发展</p>
              </div>
            </div>
          </div>
        </div>
        
        <!-- 技术亮点-->
        <div class="tech-highlights">
          <h2 class="highlights-title">技术亮点</h2>
          <div class="highlights-grid">
            <div class="highlight-item">
              <div class="highlight-icon">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                </svg>
              </div>
              <h4>智能分析</h4>
              <p>利用AI技术对企业数据进行智能分析，提供决策支持</p>
            </div>
            <div class="highlight-item">
              <div class="highlight-icon">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                </svg>
              </div>
              <h4>实时监控</h4>
              <p>实时监控企业运营状态，及时发现并解决问题</p>
            </div>
            <div class="highlight-item">
              <div class="highlight-icon">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                </svg>
              </div>
              <h4>安全保障</h4>
              <p>多重安全措施保障企业数据安全，防止信息泄露</p>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- 右侧登录表单 -->
    <div class="login-form-wrapper">
      <!-- 背景装饰 -->
      <div class="login-bg-decoration">
        <div class="login-bg-circle login-bg-circle-1"></div>
        <div class="login-bg-circle login-bg-circle-2"></div>
      </div>
      
      <div class="login-header">
        <div class="logo">
          <span class="logo-text">宏友智慧办公平台</span>
          <div class="logo-glow"></div>
          <div class="logo-pulse"></div>
        </div>
        <p class="login-subtitle">科技赋能未来</p>
      </div>
      
      <el-form :model="loginForm" :rules="loginRules" ref="loginFormRef" class="login-form">
        <el-form-item prop="username">
          <el-input
            v-model="loginForm.username"
            placeholder="用户名"
            prefix-icon="el-icon-user"
            class="input-field"
            :class="{ 'input-active': activeInput === 'username' }"
            @focus="activeInput = 'username'"
            @blur="activeInput = ''"
          />
        </el-form-item>
        
        <el-form-item prop="password">
          <el-input
            v-model="loginForm.password"
            type="password"
            placeholder="密码"
            prefix-icon="el-icon-lock"
            class="input-field"
            :class="{ 'input-active': activeInput === 'password' }"
            @focus="activeInput = 'password'"
            @blur="activeInput = ''"
            show-password
          />
        </el-form-item>
        
        <el-form-item prop="captcha">
          <div class="captcha-container">
            <el-input
              v-model="loginForm.captcha"
              placeholder="验证码"
              prefix-icon="el-icon-shield"
              class="input-field captcha-input"
              :class="{ 'input-active': activeInput === 'captcha' }"
              @focus="activeInput = 'captcha'"
              @blur="activeInput = ''"
            />
            <img 
              :src="captchaImage" 
              alt="验证码" 
              class="captcha-img"
              @click="generateCaptcha"
              title="点击刷新验证码"
            />
          </div>
        </el-form-item>
        
        <el-form-item>
          <el-button type="primary" @click="handleLogin" class="login-btn" :loading="loading">
            <span class="btn-text">登录</span>
            <div class="btn-pulse"></div>
          </el-button>
        </el-form-item>
      </el-form>
      
      <!-- 技术指标-->
      <div class="tech-indicators">
        <div class="indicator">
          <div class="indicator-dot"></div>
          <span>系统在线</span>
        </div>
        <div class="indicator">
          <div class="indicator-dot"></div>
          <span>安全连接</span>
        </div>
        <div class="indicator">
          <div class="indicator-dot"></div>
          <span>实时监控</span>
        </div>
      </div>
    </div>
    
    <!-- 背景装饰 -->
    <div class="bg-decorations">
      <div class="bg-circle bg-circle-1"></div>
      <div class="bg-circle bg-circle-2"></div>
      <div class="bg-line bg-line-1"></div>
      <div class="bg-line bg-line-2"></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { login } from '../services/api'
import { io, Socket } from 'socket.io-client'

const router = useRouter()
const loginFormRef = ref()
const loading = ref(false)
const activeInput = ref('')
const socket = ref<Socket | null>(null)

const loginForm = reactive({
  username: '',
  password: '',
  captcha: ''
})

const captchaCode = ref('')
const captchaImage = ref('')

const generateCaptcha = () => {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz0123456789'
  let code = ''
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  captchaCode.value = code
  captchaImage.value = generateCaptchaImage(code)
}

const generateCaptchaImage = (code: string) => {
  const canvas = document.createElement('canvas')
  canvas.width = 100
  canvas.height = 40
  const ctx = canvas.getContext('2d')!
  
  ctx.fillStyle = '#f0f0f0'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  
  for (let i = 0; i < 10; i++) {
    ctx.beginPath()
    ctx.strokeStyle = `rgb(${Math.random() * 255}, ${Math.random() * 255}, ${Math.random() * 255})`
    ctx.lineWidth = 1
    ctx.moveTo(Math.random() * canvas.width, Math.random() * canvas.height)
    ctx.lineTo(Math.random() * canvas.width, Math.random() * canvas.height)
    ctx.stroke()
  }
  
  for (let i = 0; i < code.length; i++) {
    ctx.font = `${20 + Math.random() * 10}px Arial`
    ctx.fillStyle = `rgb(${Math.floor(Math.random() * 100) + 50}, ${Math.floor(Math.random() * 100) + 50}, ${Math.floor(Math.random() * 100) + 50})`
    ctx.textBaseline = 'middle'
    const x = 15 + i * 22
    const y = canvas.height / 2 + (Math.random() - 0.5) * 10
    ctx.fillText(code[i], x, y)
  }
  
  return canvas.toDataURL()
}

const loginRules = {
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' }
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' }
  ],
  captcha: [
    { required: true, message: '请输入验证码', trigger: 'blur' }
  ]
}

const handleLogin = async () => {
  console.log('Login button clicked');
  try {
    // 验证表单
    if (!loginForm.username || !loginForm.password) {
      ElMessage.error('请输入用户名和密码');
      return;
    }
    
    // 验证验证码
    if (!loginForm.captcha) {
      ElMessage.error('请输入验证码');
      return;
    }
    
    if (loginForm.captcha.toLowerCase() !== captchaCode.value.toLowerCase()) {
      ElMessage.error('验证码错误');
      generateCaptcha();
      loginForm.captcha = '';
      return;
    }
    
    console.log('Login form submitted:', loginForm);
    
    // 调用实际的API
    const response = await login(loginForm.username, loginForm.password);
    
    console.log('Login API response:', response);
    
    if (response.success && response.user) {
      const user = response.user;
      
      localStorage.setItem('token', `session-${user.id}-${Date.now()}`)
      localStorage.setItem('userId', user.id.toString())
      localStorage.setItem('username', user.username)
      
      // 存储用户角色信息
      let role = 'employee'
      if (user.username === 'admin') {
          role = 'admin'
        } else if (user.username === '总经理' || user.position === '总经理') {
          role = '总经理'
        }
      
      localStorage.setItem('role', role)
      
      // 存储完整的用户信息（用于项目申请等模块）
      const userInfo = {
        id: user.id,
        name: user.name || user.username,
        username: user.username,
        role: role,
        roles: [role],
        department: user.department || '',
        position: user.position || ''
      }
      localStorage.setItem('user', JSON.stringify(userInfo))
      
      // 存储用户权限信息 - 如果没有权限数据，设置默认权限
      const defaultPermissions = [
        { path: '/tool-inventory' },
        { path: '/oa-office' },
        { path: '/monthly-report' },
        { path: '/employee-management' },
        { path: '/employee-chat' },
        { path: '/file-storage' },
        { path: '/project-category' },
        { path: '/closing-project' },
        { path: '/sales-funnel' },
        { path: '/system' }
      ]
      localStorage.setItem('permissions', JSON.stringify(user.permissions || defaultPermissions))
      
      console.log('登录成功，跳转到首页');
      router.push('/');
    } else {
      // 登录失败
      ElMessage.error(response.message || '用户名或密码错误');
    }
  } catch (error) {
    console.error('登录失败:', error)
    ElMessage.error('登录失败，请重试')
  }
}

// 组件挂载时初始化
onMounted(() => {
  console.log('Login page mounted');
  generateCaptcha();
  // 检查是否已有token，如果有则跳转到首页
  const token = localStorage.getItem('token');
  if (token) {
    console.log('Token already exists, redirecting to home');
    router.push('/');
  }
})
</script>

<style scoped>
.login-container {
  width: 100vw;
  height: 100vh;
  display: flex;
  align-items: stretch;
  background: #E4EDF2;
  position: relative;
  overflow: hidden;
}

/* 科技背景 */
.tech-bg {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 0;
}

/* 网格背景 */
.bg-grid {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-image: 
    linear-gradient(rgba(100, 149, 237, 0.1) 1px, transparent 1px),
    linear-gradient(90deg, rgba(100, 149, 237, 0.1) 1px, transparent 1px);
  background-size: 50px 50px;
  animation: gridMove 20s linear infinite;
}

@keyframes gridMove {
  0% { transform: translate(0, 0); }
  100% { transform: translate(50px, 50px); }
}

/* 粒子效果 */
.bg-particles {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
}

.bg-particles::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: radial-gradient(circle at 20% 30%, rgba(100, 149, 237, 0.1) 0%, transparent 20%),
              radial-gradient(circle at 80% 70%, rgba(100, 149, 237, 0.1) 0%, transparent 20%),
              radial-gradient(circle at 40% 80%, rgba(100, 149, 237, 0.1) 0%, transparent 20%),
              radial-gradient(circle at 70% 20%, rgba(100, 149, 237, 0.1) 0%, transparent 20%);
  animation: particleFloat 15s ease-in-out infinite;
}

@keyframes particleFloat {
  0%, 100% { transform: scale(1); opacity: 0.5; }
  50% { transform: scale(1.1); opacity: 0.8; }
}

/* 电路效果 */
.bg-circuits {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-image: 
    linear-gradient(45deg, transparent 49%, rgba(100, 149, 237, 0.05) 49%, rgba(100, 149, 237, 0.05) 51%, transparent 51%),
    linear-gradient(-45deg, transparent 49%, rgba(100, 149, 237, 0.05) 49%, rgba(100, 149, 237, 0.05) 51%, transparent 51%);
  background-size: 100px 100px;
  animation: circuitPulse 8s ease-in-out infinite;
}

@keyframes circuitPulse {
  0%, 100% { opacity: 0.3; }
  50% { opacity: 0.6; }
}

/* 闪电效果 */
.bg-lightning {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(100, 149, 237, 0.05), transparent);
  animation: lightning 3s ease-in-out infinite;
}

@keyframes lightning {
  0%, 100% { opacity: 0; }
  5% { opacity: 0.8; }
  6% { opacity: 0.3; }
  7% { opacity: 0.8; }
  8% { opacity: 0; }
  20% { opacity: 0; }
  21% { opacity: 0.8; }
  22% { opacity: 0; }
  80% { opacity: 0; }
  81% { opacity: 0.5; }
  82% { opacity: 0; }
}

/*  glow效果 */
.bg-glow {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 600px;
  height: 600px;
  background: radial-gradient(circle, rgba(100, 149, 237, 0.1), transparent 70%);
  animation: glowPulse 4s ease-in-out infinite;
}

@keyframes glowPulse {
  0%, 100% { transform: translate(-50%, -50%) scale(1); opacity: 0.3; }
  50% { transform: translate(-50%, -50%) scale(1.1); opacity: 0.6; }
}

/* 左侧信息面板 */
.login-info-panel {
  flex: 1;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: 4rem;
  position: relative;
  z-index: 10;
  overflow-y: auto;
  max-height: 100vh;
}

.info-content {
  max-width: 600px;
  width: 100%;
  color: #333;
}

.info-header {
  margin-bottom: 3rem;
}

.info-title {
  font-size: 2.5rem;
  font-weight: bold;
  color: #333;
  margin-bottom: 1rem;
  text-shadow: 0 0 10px rgba(100, 149, 237, 0.3);
  line-height: 1.2;
}

.info-subtitle {
  font-size: 1.25rem;
  color: rgba(51, 51, 51, 0.7);
  margin-bottom: 0;
}

/* 政策新闻 */
.policy-news {
  margin-bottom: 3rem;
}

.news-title {
  font-size: 1.5rem;
  font-weight: 600;
  color: #333;
  margin-bottom: 1.5rem;
  position: relative;
  padding-bottom: 0.5rem;
}

.news-title::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  width: 60px;
  height: 3px;
  background: linear-gradient(90deg, #6495ED, #87CEFA);
  border-radius: 3px;
}

.news-list {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.news-item {
  display: flex;
  align-items: flex-start;
  gap: 1.5rem;
  padding: 1.5rem;
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(10px);
  border-radius: 12px;
  border: 1px solid rgba(100, 149, 237, 0.3);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
}

.news-item:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(100, 149, 237, 0.2);
  border-color: rgba(100, 149, 237, 0.5);
}

.news-icon {
  flex-shrink: 0;
  width: 50px;
  height: 50px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 20px;
  box-shadow: 0 4px 12px rgba(100, 149, 237, 0.4);
}

.ai-icon {
  background: linear-gradient(45deg, #6495ED, #4169E1);
}

.rural-icon {
  background: linear-gradient(45deg, #32CD32, #228B22);
}

.three-in-one-icon {
  background: linear-gradient(45deg, #FF6B6B, #FF4757);
}

.policy-icon {
  background: linear-gradient(45deg, #FFD700, #FFA500);
}

.news-content {
  flex: 1;
}

.news-item-title {
  font-size: 1.1rem;
  font-weight: 600;
  color: #333;
  margin-bottom: 0.5rem;
}

.news-item-desc {
  font-size: 0.95rem;
  color: rgba(51, 51, 51, 0.7);
  line-height: 1.5;
  margin: 0;
}

/* 技术亮�?*/
.tech-highlights {
  margin-top: 2rem;
}

.highlights-title {
  font-size: 1.5rem;
  font-weight: 600;
  color: #333;
  margin-bottom: 1.5rem;
  position: relative;
  padding-bottom: 0.5rem;
}

.highlights-title::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  width: 60px;
  height: 3px;
  background: linear-gradient(90deg, #6495ED, #87CEFA);
  border-radius: 3px;
}

.highlights-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1.5rem;
}

.highlight-item {
  padding: 1.5rem;
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(10px);
  border-radius: 12px;
  border: 1px solid rgba(100, 149, 237, 0.3);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  text-align: center;
  transition: all 0.3s ease;
}

.highlight-item:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(100, 149, 237, 0.2);
  border-color: rgba(100, 149, 237, 0.5);
}

.highlight-icon {
  width: 60px;
  height: 60px;
  background: linear-gradient(45deg, #6495ED, #87CEFA);
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 24px;
  margin: 0 auto 1rem;
  box-shadow: 0 4px 12px rgba(100, 149, 237, 0.4);
}

.highlight-item h4 {
  font-size: 1.1rem;
  font-weight: 600;
  color: #333;
  margin-bottom: 0.5rem;
}

.highlight-item p {
  font-size: 0.85rem;
  color: rgba(51, 51, 51, 0.7);
  line-height: 1.4;
  margin: 0;
}

/* 右侧登录表单 */
.login-form-wrapper {
  width: 450px;
  height: 480px;
  padding: 4rem;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(20px);
  border-radius: 24px;
  border: 1px solid rgba(100, 149, 237, 0.4);
  box-shadow: 
    0 8px 32px rgba(0, 0, 0, 0.15),
    0 0 0 1px rgba(255, 255, 255, 0.2),
    inset 0 1px 0 rgba(255, 255, 255, 0.6);
  z-index: 10;
  text-align: center;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  margin: auto 2rem;
  position: relative;
  overflow: hidden;
  transition: all 0.3s ease;
}

.login-form-wrapper:hover {
  box-shadow: 
    0 12px 40px rgba(100, 149, 237, 0.25),
    0 0 0 1px rgba(255, 255, 255, 0.3),
    inset 0 1px 0 rgba(255, 255, 255, 0.8);
  transform: translateY(-5px);
}

.login-form-wrapper::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(100, 149, 237, 0.15), transparent);
  animation: shine 2.5s ease-in-out infinite;
}

@keyframes shine {
  0% { left: -100%; }
  100% { left: 100%; }
}

/* 顶部渐变装饰 */
.login-form-wrapper::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 4px;
  background: linear-gradient(90deg, #6495ED, #87CEFA, #4169E1);
  border-radius: 24px 24px 0 0;
}

.logo {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 2.5rem;
  z-index: 1;
}

.logo-text {
  font-size: 1.8rem;
  font-weight: 700;
  color: #333;
  text-shadow: 0 0 20px rgba(100, 149, 237, 0.5);
  letter-spacing: 1.5px;
  position: relative;
  z-index: 2;
}

.logo-glow {
  position: absolute;
  top: -50%;
  left: -20%;
  width: 140%;
  height: 200%;
  background: linear-gradient(45deg, transparent, rgba(100, 149, 237, 0.5), transparent);
  filter: blur(30px);
  animation: glow 2.5s ease-in-out infinite;
  z-index: 1;
}

.logo-pulse {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 120%;
  height: 120%;
  border: 2px solid rgba(100, 149, 237, 0.5);
  border-radius: 50%;
  animation: pulse 1.8s ease-out infinite;
  z-index: 0;
}

@keyframes glow {
  0%, 100% { opacity: 0.3; }
  50% { opacity: 0.8; }
}

@keyframes pulse {
  0% {
    transform: translate(-50%, -50%) scale(1);
    opacity: 1;
  }
  100% {
    transform: translate(-50%, -50%) scale(1.8);
    opacity: 0;
  }
}



.login-subtitle {
  font-size: 1.1rem;
  color: rgba(51, 51, 51, 0.7);
  margin-bottom: 3rem;
  text-shadow: 0 0 15px rgba(100, 149, 237, 0.3);
  letter-spacing: 0.5px;
  position: relative;
  z-index: 1;
}

.login-form {
  width: 100%;
  max-width: 300px;
  position: relative;
  z-index: 1;
}

.input-field {
  background: rgba(255, 255, 255, 0.95) !important;
  border: 1px solid rgba(100, 149, 237, 0.3) !important;
  border-radius: 16px !important;
  color: #333 !important;
  height: 52px !important;
  transition: all 0.3s ease !important;
  position: relative;
  overflow: hidden;
  width: 100% !important;
  box-shadow: 
    0 2px 8px rgba(0, 0, 0, 0.05),
    inset 0 1px 0 rgba(255, 255, 255, 0.8) !important;
  font-size: 1rem !important;
}

.input-field::placeholder {
  color: rgba(51, 51, 51, 0.4) !important;
  font-size: 0.95rem !important;
  transition: all 0.3s ease !important;
}

.input-field:focus::placeholder {
  color: rgba(100, 149, 237, 0.5) !important;
  transform: translateY(-100%) !important;
  opacity: 0 !important;
}

.input-field.input-active {
  border-color: #6495ED !important;
  box-shadow: 
    0 0 25px rgba(100, 149, 237, 0.6),
    inset 0 1px 0 rgba(255, 255, 255, 1) !important;
  transform: translateY(-2px) !important;
}

.input-field.input-active::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(100, 149, 237, 0.4), transparent);
  animation: inputShine 0.8s ease-out;
}

@keyframes inputShine {
  0% { left: -100%; }
  100% { left: 100%; }
}

/* 输入框图标样�?*/
:deep(.el-input__prefix-inner) {
  color: rgba(100, 149, 237, 0.6) !important;
  transition: all 0.3s ease !important;
}

:deep(.input-active .el-input__prefix-inner) {
  color: #6495ED !important;
  transform: scale(1.1) !important;
}

/* 密码可见性图�?*/
:deep(.el-input__suffix-inner) {
  color: rgba(100, 149, 237, 0.6) !important;
  transition: all 0.3s ease !important;
}

:deep(.el-input__suffix-inner:hover) {
  color: #6495ED !important;
}

.login-btn {
  width: 100%;
  height: 52px;
  background: linear-gradient(135deg, #6495ED, #4169E1, #87CEFA) !important;
  background-size: 200% 200% !important;
  border: none !important;
  border-radius: 16px !important;
  font-size: 1.1rem !important;
  font-weight: 600 !important;
  box-shadow: 
    0 8px 25px rgba(100, 149, 237, 0.6),
    inset 0 1px 0 rgba(255, 255, 255, 0.3) !important;
  transition: all 0.3s ease !important;
  position: relative;
  overflow: hidden;
  margin-top: 2rem;
  animation: gradientShift 3s ease-in-out infinite;
  letter-spacing: 1px !important;
  z-index: 1;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
}

.btn-text {
  position: relative;
  z-index: 2;
  color: white !important;
  font-weight: 600 !important;
  letter-spacing: 1px !important;
}

.login-btn:hover {
  transform: translateY(-4px) !important;
  box-shadow: 
    0 12px 35px rgba(100, 149, 237, 0.8),
    inset 0 1px 0 rgba(255, 255, 255, 0.5) !important;
  background-position: right center !important;
}

.login-btn:active {
  transform: translateY(0) !important;
  box-shadow: 
    0 6px 20px rgba(100, 149, 237, 0.5),
    inset 0 1px 0 rgba(255, 255, 255, 0.3) !important;
}

.login-btn::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent);
  animation: btnShine 2s ease-in-out infinite;
  z-index: 0;
}

@keyframes btnShine {
  0% { left: -100%; }
  100% { left: 100%; }
}

.btn-pulse {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 0;
  height: 0;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.4);
  animation: btnPulse 1.5s ease-out infinite;
  z-index: 0;
}

@keyframes gradientShift {
  0%, 100% { background-position: left center; }
  50% { background-position: right center; }
}

@keyframes btnPulse {
  0% {
    width: 0;
    height: 0;
    opacity: 0.6;
  }
  100% {
    width: 400px;
    height: 400px;
    opacity: 0;
  }
}

/* 技术指�?*/
.captcha-container {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
}

.captcha-input {
  flex: 1;
  max-width: 150px !important;
}

.captcha-img {
  width: 100px;
  height: 40px;
  border-radius: 12px;
  cursor: pointer;
  border: 1px solid rgba(100, 149, 237, 0.3);
  transition: all 0.3s ease;
}

.captcha-img:hover {
  border-color: #6495ED;
  box-shadow: 0 0 15px rgba(100, 149, 237, 0.4);
  transform: scale(1.02);
}

.tech-indicators {
  display: flex;
  justify-content: space-around;
  margin-top: 2.5rem;
  padding-top: 2rem;
  border-top: 1px solid rgba(100, 149, 237, 0.3);
  width: 100%;
  max-width: 300px;
  position: relative;
  z-index: 1;
}

.tech-indicators::before {
  content: '';
  position: absolute;
  top: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 80px;
  height: 3px;
  background: linear-gradient(90deg, transparent, #6495ED, transparent);
  border-radius: 3px;
}

.indicator {
  display: flex;
  align-items: center;
  gap: 0.7rem;
  color: rgba(51, 51, 51, 0.7);
  font-size: 0.85rem;
  flex: 1;
  justify-content: center;
  font-weight: 500;
  transition: all 0.3s ease;
  position: relative;
}

.indicator:hover {
  color: #6495ED;
  transform: translateY(-3px);
}

.indicator-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: linear-gradient(135deg, #10b981, #34d399);
  animation: indicatorPulse 2s ease-in-out infinite;
  box-shadow: 0 0 15px rgba(16, 185, 129, 0.6);
  position: relative;
}

.indicator-dot::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.8);
  box-shadow: 0 0 5px rgba(255, 255, 255, 0.8);
}

@keyframes indicatorPulse {
  0%, 100% { 
    opacity: 1; 
    transform: scale(1); 
    box-shadow: 0 0 15px rgba(16, 185, 129, 0.6); 
  }
  50% { 
    opacity: 0.8; 
    transform: scale(1.4); 
    box-shadow: 0 0 25px rgba(16, 185, 129, 0.9); 
  }
}

/* 登录表单背景装饰 */
.login-bg-decoration {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 0;
  overflow: hidden;
}

.login-bg-circle {
  position: absolute;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(100, 149, 237, 0.1), transparent 70%);
  animation: loginCircleFloat 6s ease-in-out infinite;
}

.login-bg-circle-1 {
  width: 200px;
  height: 200px;
  top: -50px;
  right: -50px;
  animation-delay: 0s;
}

.login-bg-circle-2 {
  width: 150px;
  height: 150px;
  bottom: -30px;
  left: -30px;
  animation-delay: 2s;
}

@keyframes loginCircleFloat {
  0%, 100% {
    transform: translateY(0) scale(1);
  }
  50% {
    transform: translateY(-20px) scale(1.1);
  }
}

/* 背景装饰 */
.bg-decorations {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 1;
}

.bg-circle {
  position: absolute;
  border-radius: 50%;
  background: linear-gradient(45deg, rgba(100, 149, 237, 0.1), rgba(100, 149, 237, 0.1));
  filter: blur(50px);
  animation: float 6s ease-in-out infinite;
}

.bg-circle-1 {
  width: 300px;
  height: 300px;
  top: 10%;
  left: 10%;
  animation-delay: 0s;
}

.bg-circle-2 {
  width: 400px;
  height: 400px;
  bottom: 10%;
  right: 10%;
  animation-delay: 2s;
}

.bg-circle-3 {
  width: 200px;
  height: 200px;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  animation-delay: 4s;
}

/* 背景线条 */
.bg-line {
  position: absolute;
  background: linear-gradient(90deg, transparent, rgba(100, 149, 237, 0.2), transparent);
  animation: lineMove 10s linear infinite;
}

.bg-line-1 {
  width: 2px;
  height: 100%;
  top: 0;
  left: 25%;
  animation-delay: 0s;
}

.bg-line-2 {
  width: 2px;
  height: 100%;
  top: 0;
  left: 75%;
  animation-delay: 3s;
}

.bg-line-3 {
  width: 100%;
  height: 2px;
  top: 50%;
  left: 0;
  animation-delay: 6s;
}

@keyframes float {
  0%, 100% {
    transform: translateY(0) scale(1);
  }
  50% {
    transform: translateY(-20px) scale(1.05);
  }
}

@keyframes lineMove {
  0% {
    opacity: 0;
    transform: translateX(-100%);
  }
  10% {
    opacity: 1;
  }
  90% {
    opacity: 1;
  }
  100% {
    opacity: 0;
    transform: translateX(100%);
  }
}

/* 响应式设�?*/
@media (max-width: 1200px) {
  .login-container {
    flex-direction: column;
  }
  
  .login-info-panel {
    width: 100%;
    padding: 2rem;
  }
  
  .login-form-wrapper {
    width: 90%;
    max-width: 450px;
    margin: 2rem auto;
    padding: 2rem;
  }
  
  .highlights-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .login-form-wrapper {
    width: 95%;
    padding: 1.5rem;
  }
  
  .logo-text {
    font-size: 2.429028rem;
  }
  
  .login-title {
    font-size: 1.25rem;
  }
  
  .info-title {
    font-size: 2rem;
  }
  
  .info-subtitle {
    font-size: 1rem;
  }
  
  .news-item {
    flex-direction: column;
    align-items: center;
    text-align: center;
  }
  
  .news-icon {
    margin-bottom: 1rem;
  }
}
</style>
