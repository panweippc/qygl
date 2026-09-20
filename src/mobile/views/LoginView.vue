<template>
  <div class="login-container mobile-login">
    <!-- 科技背景：静态网格 + 流光线条 + 缓慢浮动粒子 -->
    <div class="tech-bg">
      <div class="bg-grid"></div>
      <div class="bg-glow-slow"></div>
      <div class="bg-streams">
        <span class="stream stream-1"></span>
        <span class="stream stream-2"></span>
        <span class="stream stream-3"></span>
        <span class="stream stream-4"></span>
      </div>
      <div class="bg-particles"></div>
      <div class="bg-dots">
        <span v-for="(d, i) in bgDots" :key="'dot' + i" :style="d"></span>
      </div>
    </div>

    <!-- 左侧信息面板 -->
    <div class="login-info-panel">
      <div class="info-content">
        <!-- 假期倒计时 -->
        <div v-if="holidayTip" class="holiday-strip">
          <span class="holiday-bar"></span>
          <div class="holiday-body">
            <span class="holiday-label">{{ holidayTip.label }}</span>
            <span class="holiday-value">{{ holidayTip.value }}</span>
          </div>
        </div>

        <!-- 动态公告 -->
        <div class="announce-board">
          <div class="board-head">
            <h2 class="board-title">动态公告</h2>
            <span class="board-sub">{{ todayText }}</span>
          </div>
          <div v-if="pinned.length" class="announce-pinned">
            <div
              class="announce-item"
              :class="['lv-' + levelOf(a), 'is-pinned']"
              v-for="a in pinned"
              :key="'pin_' + a.id"
              @click="openAnnouncement(a)"
            >
              <span class="announce-accent"></span>
              <div class="announce-main">
                <div class="announce-line">
                  <span class="announce-badge badge-top">置顶</span>
                  <span v-if="levelOf(a) !== 'info'" class="announce-badge" :class="'badge-' + levelOf(a)">{{ levelText(levelOf(a)) }}</span>
                  <span class="announce-badge" :class="'cat-' + levelOf(a)">{{ a.category }}</span>
                  <span v-if="isRecent(a)" class="announce-badge badge-new">NEW</span>
                  <span class="announce-title">{{ a.title }}</span>
                </div>
                <p class="announce-summary">{{ a.summary || '点击查看公告详情' }}</p>
              </div>
              <div class="announce-date">{{ fmtDate(a.publishAt) }}</div>
            </div>
          </div>
          <div
            v-if="rest.length"
            class="announce-list"
            :class="{ 'is-scrolling': marqueeOn }"
          >
            <div class="announce-track" :style="marqueeOn ? marqueeStyle : {}">
              <div
                class="announce-item"
                :class="'lv-' + levelOf(a)"
                v-for="(a, idx) in restTrack"
                :key="'r_' + idx + '_' + a.id"
                @click="openAnnouncement(a)"
              >
                <span class="announce-accent"></span>
                <div class="announce-main">
                  <div class="announce-line">
                    <span v-if="levelOf(a) !== 'info'" class="announce-badge" :class="'badge-' + levelOf(a)">{{ levelText(levelOf(a)) }}</span>
                    <span class="announce-badge" :class="'cat-' + levelOf(a)">{{ a.category }}</span>
                    <span v-if="idx === 0 && isRecent(a)" class="announce-badge badge-new">NEW</span>
                    <span class="announce-title">{{ a.title }}</span>
                  </div>
                  <p class="announce-summary">{{ a.summary || '点击查看公告详情' }}</p>
                </div>
                <div class="announce-date">{{ fmtDate(a.publishAt) }}</div>
              </div>
            </div>
          </div>
          <div v-if="!announcements.length" class="announce-empty">暂无公告</div>
          <div v-if="announcements.length" class="announce-foot">
            {{ marqueeOn ? '滚动播报中' : '登录后可查看全部公告' }}
          </div>
        </div>
      </div>
    </div>

    <!-- 公告详情弹窗 -->
    <el-dialog
      v-model="announceVisible"
      :title="activeAnnounce.title || '公告详情'"
      width="90%"
      align-center
      append-to-body
    >
      <div style="max-height:60vh;overflow-y:auto;">
        <div style="display:flex;align-items:center;gap:8px;font-size:12px;color:#909399;margin-bottom:12px;">
          <span style="background:rgba(30,90,168,0.1);color:#1E5AA8;padding:1px 8px;border-radius:10px;">{{ activeAnnounce.category }}</span>
          <span>{{ fmtDate(activeAnnounce.publishAt) }}</span>
          <span v-if="activeAnnounce.publisher">发布人：{{ activeAnnounce.publisher }}</span>
        </div>
        <div style="white-space:pre-wrap;line-height:1.8;color:#303133;font-size:14px;">{{ announceDetail || activeAnnounce.summary }}</div>
        <div v-if="activeAnnounce.attachments && activeAnnounce.attachments.length" class="ann-detail-attach">
          <div class="ann-attach-title">附件（{{ activeAnnounce.attachments.length }}）</div>
          <div class="ann-attach-list">
            <template v-for="(f, i) in activeAnnounce.attachments" :key="i">
              <img v-if="f.group === 'image'" class="ann-attach-img" :src="f.url" :alt="f.name" @click="windowOpen(f.url)" />
              <a v-else class="ann-attach-item" :href="f.url" target="_blank" rel="noopener">
                <span class="ann-attach-ico" :class="'ico-' + (f.group || 'file')">{{ extOf(f) }}</span>
                <span class="ann-attach-name">{{ f.name }}</span>
              </a>
            </template>
          </div>
        </div>
      </div>
      <template #footer>
        <el-button @click="announceVisible = false">关闭</el-button>
      </template>
    </el-dialog>

    <!-- 右侧登录表单 -->
    <div class="login-form-wrapper">
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
            :prefix-icon="User"
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
            :prefix-icon="Lock"
            class="input-field"
            :class="{ 'input-active': activeInput === 'password' }"
            @focus="activeInput = 'password'"
            @blur="activeInput = ''"
            show-password
            @keyup.enter="handleLogin"
          />
        </el-form-item>

        <el-form-item prop="captcha">
          <div class="captcha-container">
            <el-input
              v-model="loginForm.captcha"
              placeholder="验证码"
              :prefix-icon="CircleCheck"
              class="input-field captcha-input"
              :class="{ 'input-active': activeInput === 'captcha' }"
              @focus="activeInput = 'captcha'"
              @blur="activeInput = ''"
              @keyup.enter="handleLogin"
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

    <div class="bg-decorations">
      <div class="bg-circle bg-circle-1"></div>
      <div class="bg-circle bg-circle-2"></div>
      <div class="bg-line bg-line-1"></div>
      <div class="bg-line bg-line-2"></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { User, Lock, CircleCheck } from '@element-plus/icons-vue'
import api from '@/services/api'
import { initSocket } from '@/services/socket'

const router = useRouter()
const loginFormRef = ref()
const loading = ref(false)
const activeInput = ref('')

// 登录页左侧面板：动态公告（免鉴权公开接口）
const announcements = ref<any[]>([])
const announceVisible = ref(false)
const announceDetail = ref('')
const activeAnnounce = ref<any>({})

const todayText = (() => {
  const d = new Date()
  const week = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'][d.getDay()]
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${week}`
})()

function fmtDate(v: any) {
  if (!v) return ''
  return String(v).replace('T', ' ').slice(0, 10)
}

const sortedAnn = computed(() => {
  const arr = [...(announcements.value || [])]
  arr.sort((a: any, b: any) => {
    const ta = a?.isTop ? 1 : 0
    const tb = b?.isTop ? 1 : 0
    if (ta !== tb) return tb - ta
    const t = (v: any) => new Date(String(v?.publishAt || 0).replace(' ', 'T')).getTime() || 0
    return t(b) - t(a)
  })
  return arr
})
const pinned = computed(() => sortedAnn.value.filter((a: any) => a?.isTop))
const rest = computed(() => sortedAnn.value.filter((a: any) => !a?.isTop))

const MARQUEE_THRESHOLD = 4
const marqueeOn = computed(() => rest.value.length > MARQUEE_THRESHOLD)
const restTrack = computed(() =>
  marqueeOn.value ? [...rest.value, ...rest.value] : rest.value
)
const marqueeStyle = computed(() => ({
  animationDuration: `${Math.max(16, rest.value.length * 4)}s`,
}))

const URGENT_RE = /紧急|安全|漏洞|补丁|故障|停服|中断|事故|风险|断电|宕机|严重|红色预警/i
const WARN_RE = /维护|升级|停机|检修|迁移|变更|调整|注意|提醒|限流|整改|排查/i
function levelOf(a: any) {
  const p = String(a?.priority || '')
  if (p === '紧急') return 'urgent'
  if (p === '重要') return 'warn'
  if (p === '普通') return 'info'
  const text = `${a?.title || ''} ${a?.category || ''}`
  if (URGENT_RE.test(text)) return 'urgent'
  if (WARN_RE.test(text)) return 'warn'
  return 'info'
}
const LEVEL_TEXT: Record<string, string> = { urgent: '紧急', warn: '重要', info: '普通' }
const levelText = (lv: string) => LEVEL_TEXT[lv] || '普通'

const bgDots = Array.from({ length: 22 }, (_, i) => {
  const seed = (n: number) => {
    const v = Math.sin(i * 12.9898 + n * 78.233) * 43758.5453
    return v - Math.floor(v)
  }
  const size = 2 + Math.round(seed(1) * 3)
  return {
    left: (seed(2) * 100).toFixed(2) + '%',
    top: (seed(3) * 100).toFixed(2) + '%',
    width: size + 'px',
    height: size + 'px',
    opacity: (0.18 + seed(6) * 0.4).toFixed(2),
    animationDuration: (22 + seed(4) * 26).toFixed(1) + 's',
    animationDelay: (-seed(5) * 45).toFixed(1) + 's',
  }
})

function extOf(f: any) {
  return (f?.ext || '').toUpperCase() || '文件'
}
function windowOpen(url: string) {
  if (url) window.open(url, '_blank')
}

function isRecent(a: any) {
  if (!a?.publishAt) return false
  const t = new Date(String(a.publishAt).replace(' ', 'T')).getTime()
  if (Number.isNaN(t)) return false
  return Date.now() - t < 7 * 24 * 3600 * 1000
}

const HOLIDAYS = [
  { name: '中秋国庆假期', start: '2026-09-25', end: '2026-10-07' },
  { name: '元旦假期', start: '2027-01-01', end: '2027-01-03' },
]
const DAY_MS = 24 * 3600 * 1000
function dayStart(v: string) {
  const [y, m, d] = String(v).split('-').map(Number)
  return new Date(y, (m || 1) - 1, d || 1)
}
const holidayTip = computed<{ label: string; value: string } | null>(() => {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  for (const h of HOLIDAYS) {
    const s = dayStart(h.start)
    const e = dayStart(h.end)
    if (today.getTime() >= s.getTime() && today.getTime() <= e.getTime()) {
      const left = Math.round((e.getTime() - today.getTime()) / DAY_MS) + 1
      return { label: `${h.name}进行中`, value: `剩余 ${left} 天` }
    }
    if (today.getTime() < s.getTime()) {
      const days = Math.round((s.getTime() - today.getTime()) / DAY_MS)
      return { label: `距离${h.name}`, value: days <= 0 ? '就是今天' : `还有 ${days} 天` }
    }
  }
  return null
})

async function loadPublicData() {
  try {
    const resp = await fetch('/api/public/announcements?limit=8', { cache: 'no-store' })
    const json = await resp.json()
    if (json.success) {
      announcements.value = json.data || []
    }
  } catch (e) { /* 公开接口异常不影响登录 */ }
}

async function openAnnouncement(a: any) {
  activeAnnounce.value = a
  announceDetail.value = ''
  announceVisible.value = true
  try {
    const resp = await fetch(`/api/public/announcements/${a.id}`)
    const json = await resp.json()
    if (json.success && json.data) {
      announceDetail.value = json.data.content || ''
      activeAnnounce.value = { ...a, ...json.data }
    }
  } catch (e) { /* 详情失败则仅展示摘要 */ }
}

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
  try {
    if (!loginForm.username || !loginForm.password) {
      ElMessage.error('请输入用户名和密码')
      return
    }
    if (!loginForm.captcha) {
      ElMessage.error('请输入验证码')
      return
    }
    if (loginForm.captcha.toLowerCase() !== captchaCode.value.toLowerCase()) {
      ElMessage.error('验证码错误')
      generateCaptcha()
      loginForm.captcha = ''
      return
    }

    loading.value = true
    const response = await api.post('/login', {
      username: loginForm.username.trim(),
      password: loginForm.password,
      deviceType: 'mobile'
    })
    const data = response.data

    if (data && data.success && data.token) {
      const user = data.user
      localStorage.setItem('token', data.token)
      localStorage.setItem('userId', String(user.id))
      localStorage.setItem('username', user.username)

      let role = user.roleName || user.role || 'employee'
      if (!user.roleName && (user.username === 'admin' || user.username === '管理员')) {
        role = 'admin'
      } else if (!user.roleName && (user.username === '总经理' || user.position === '总经理')) {
        role = '总经理'
      }
      localStorage.setItem('role', role)

      const userInfo = {
        id: user.id,
        name: user.name || user.username,
        username: user.username,
        role,
        roles: [role],
        department: user.department || '',
        position: user.position || '',
        avatar: user.avatar || ''
      }
      localStorage.setItem('user', JSON.stringify(userInfo))
      localStorage.setItem('permissions', JSON.stringify(user.permissions || []))
      if (user.buttonPermissions) {
        localStorage.setItem('buttonPermissions', JSON.stringify(user.buttonPermissions))
      }

      initSocket()
      router.replace('/')
    } else {
      ElMessage.error(data?.message || '用户名或密码错误')
      generateCaptcha()
    }
  } catch (error: any) {
    console.error('登录失败:', error)
    const msg = error?.response?.data?.message
    ElMessage.error(msg || '登录失败，请重试')
    generateCaptcha()
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  generateCaptcha()
  loadPublicData()
  const token = localStorage.getItem('token')
  if (token) {
    router.replace('/')
  }
})
</script>

<style scoped src="@/assets/login.css"></style>

<style scoped>
/* 移动端强制左右布局，覆盖 src/assets/login.css 的 @media(max-width:1200px) 纵向堆叠 */
.login-container.mobile-login {
  flex-direction: row !important;
  align-items: stretch !important;
  justify-content: center !important;
  gap: 0.6rem !important;
  padding: 0.6rem !important;
  height: 100vh !important;
  min-height: 100vh !important;
  overflow: hidden !important;
}
.mobile-login .login-info-panel {
  flex: 0 0 56% !important;
  width: 56% !important;
  max-width: none !important;
  max-height: none !important;
  overflow-y: auto !important;
  padding: 1.5rem 1rem 1.5rem !important;
}
.mobile-login .login-form-wrapper {
  flex: 0 0 42% !important;
  width: 100% !important;
  max-width: none !important;
  max-height: none !important;
  padding: 1.25rem 0.7rem !important;
  margin: auto 0 !important;
}
.mobile-login .login-header { margin-bottom: 1rem !important; }
.mobile-login .logo-text { font-size: 1.25rem !important; }
.mobile-login .login-subtitle { font-size: 0.8rem !important; }
.mobile-login .input-field :deep(.el-input__inner) { height: 40px !important; }
/* 验证码在移动端收窄：图片缩小 + 输入框弹性占满剩余宽度，确保可输入 */
.mobile-login .captcha-container { gap: 6px !important; }
.mobile-login .captcha-input {
  flex: 1 1 auto !important;
  max-width: 140px !important;
  min-width: 0 !important;
}
.mobile-login .input-field.captcha-input { height: 40px !important; }
.mobile-login .captcha-img {
  width: 70px !important;
  height: 34px !important;
  flex: 0 0 auto !important;
}
.mobile-login .login-btn { height: 42px !important; }
.mobile-login .announce-board { padding: 12px !important; }
.mobile-login .board-title { font-size: 1rem !important; }
.mobile-login .board-sub { font-size: 11px !important; }
.mobile-login .announce-title { font-size: 12px !important; }
.mobile-login .announce-summary { font-size: 11px !important; }
.mobile-login .announce-date { font-size: 10px !important; }
.mobile-login .announce-badge { font-size: 10px !important; }
.mobile-login .tech-indicators { margin-top: 1rem !important; font-size: 11px !important; }
.mobile-login .indicator-dot { width: 6px !important; height: 6px !important; }
</style>
