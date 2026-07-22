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
      if (user.roleName) {
        role = user.roleName
      } else if (user.username === 'admin' || user.username === '管理员') {
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
                { path: '/file-storage' },
        { path: '/project-category' },
        { path: '/closing-project' },
        { path: '/sales-funnel' },
        { path: '/system' }
      ]
      localStorage.setItem('permissions', JSON.stringify(user.permissions && user.permissions.length > 0 ? user.permissions : defaultPermissions))
      
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

<style scoped src="../assets/login.css"></style>
