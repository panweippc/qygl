<template>
  <div class="login-container">
    <!-- 科技背景：静态网格（极缓慢漂移） + 流光线条 + 缓慢浮动粒子 -->
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
        <!-- 问候 + 天气（免登录，公开渲染） -->
        <div class="login-greeting">
          <div class="greet-main">
            <p class="greet-text">{{ greetText }}</p>
            <p class="greet-date">{{ todayText }}<span v-if="weather" class="greet-weather"> · {{ weather.text }} {{ weather.temp }}°C</span></p>
          </div>
          <div v-if="weather" class="greet-icon" v-html="weatherIcon(weather.code)"></div>
        </div>

        <!-- 平台功能导览（登录前仅展示，不可点击） -->
        <div class="module-guide">
          <p class="guide-title">平台服务</p>
          <div class="guide-grid">
            <div class="guide-item" v-for="m in modules" :key="m.name" :title="m.name">
              <span class="guide-ico" :style="{ background: m.bg }" v-html="m.icon"></span>
              <span class="guide-name">{{ m.name }}</span>
            </div>
          </div>
        </div>

        <!-- 假期倒计时：下一个假期的天数（表内维护区间） -->
        <div v-if="holidayTip" class="holiday-strip">
          <span class="holiday-bar"></span>
          <div class="holiday-body">
            <span class="holiday-label">{{ holidayTip.label }}</span>
            <span class="holiday-value">{{ holidayTip.value }}</span>
          </div>
        </div>

        <!-- 动态公告（公告栏，唯一入口；同一公告只在此处出现一次） -->
        <div class="announce-board">
          <div class="board-head">
            <h2 class="board-title">动态公告</h2>
            <span class="board-sub">{{ todayText }}</span>
          </div>
          <!-- 置顶公告：永远固定在顶部，不参与跑马灯滚动 -->
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
          <!-- 其余公告：多于阈值时启用跑马灯，缓慢上滚，鼠标悬停暂停 -->
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
            {{ marqueeOn ? '滚动播报中 · 鼠标悬停可暂停' : '登录后可查看全部公告' }}
          </div>
        </div>

      </div>
    </div>
    
    <!-- 公告详情（登录页动态公告点击查看） -->
    <el-dialog
      v-model="announceVisible"
      :title="activeAnnounce.title || '公告详情'"
      width="620px"
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

    <!-- 忘记密码指引 -->
    <el-dialog
      v-model="forgotVisible"
      title="忘记密码"
      width="460px"
      align-center
      append-to-body
    >
      <div class="forgot-body">
        <p class="forgot-lead">账号密码由信息部统一管理。重置后浏览器已保存的密码需重新保存，请通过以下方式联系：</p>
        <ul class="forgot-list">
          <li>信息部 分机：<b>{{ SUPPORT_CONTACT.phone }}</b></li>
          <li>邮箱：<b>{{ SUPPORT_CONTACT.email }}</b></li>
          <li>或联系本系统管理员：<b>{{ SUPPORT_CONTACT.admin }}</b></li>
        </ul>
        <p class="forgot-tip">提示：主流浏览器已支持记住账号密码，登录时无需重复输入。</p>
      </div>
      <template #footer>
        <el-button @click="forgotVisible = false">知道了</el-button>
      </template>
    </el-dialog>

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
      
      <!-- 真实健康状态（取 /api/health，含版本号） -->
      <div class="sys-status" :class="appStatus.cls">
        <span class="status-dot"></span>
        <span class="status-text">{{ appStatus.text }}<template v-if="appStatus.version"> · {{ appStatus.version }}</template></span>
      </div>

      <!-- 忘记密码入口 -->
      <div class="login-help">
        <span class="help-link" @click="forgotVisible = true">忘记密码？</span>
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
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { login } from '../services/api'
import { io, Socket } from 'socket.io-client'
import { reinitSocket } from '../services/socket'
import { startIdleDetector } from '../utils/idle-detector'

const router = useRouter()
const loginFormRef = ref()
const loading = ref(false)
const activeInput = ref('')
const socket = ref<Socket | null>(null)

// ===== 登录页公共信息（免登录）：真实健康状态 / 天气 / 功能导览 =====
// 真实健康状态：取自后端 /api/health（含 git 标签版本），替代原三个静态假指标
const appStatus = ref({ cls: 'unknown', text: '服务状态未知', version: '' })
// 天气（公开接口，失败不影响登录）
const weather = ref<{ temp: number; code: number; text: string } | null>(null)
// 忘记密码对话框
const forgotVisible = ref(false)
// 联系信息：请改为公司实际联系方式（演示占位）
const SUPPORT_CONTACT = { phone: '8000（待确认）', email: 'it@your-company.com（待确认）', admin: '李智鑫' }
// 天气定位：默认上海，请改为公司所在城市经纬度
const WEATHER_LOCATION = { lat: 31.2304, lon: 121.4737 }
// 时段问候语
const greetText = computed(() => {
  const h = new Date().getHours()
  if (h < 11) return '上午好'
  if (h < 13) return '中午好'
  if (h < 18) return '下午好'
  return '晚上好'
})

// 功能导览：平台级常用模块（登录前仅展示，不可点击，避免死链）
const modules = [
  { name: '审批中心', bg: '#E6F1FB', icon: moduleIcon('approval') },
  { name: 'OA 申请', bg: '#FBEAF0', icon: moduleIcon('oa') },
  { name: '资料中心', bg: '#E1F5EE', icon: moduleIcon('file') },
  { name: '会议助手', bg: '#FAEEDA', icon: moduleIcon('meeting') },
  { name: '消息中心', bg: '#EDEDFE', icon: moduleIcon('bell') },
  { name: '下发管理', bg: '#FCEBEB', icon: moduleIcon('send') },
]

// 平台模块小图标（内联 SVG，随登录页公开渲染）
function moduleIcon(kind: string) {
  const c = '#1E5AA8'
  const map: Record<string, string> = {
    approval: `<path d="M4 11l5 5L20 5" stroke="${c}" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`,
    oa: `<path d="M6 3h9l4 4v14H6z" stroke="${c}" stroke-width="2" fill="none" stroke-linejoin="round"/><path d="M9 12h7M9 16h7" stroke="${c}" stroke-width="2" stroke-linecap="round"/>`,
    file: `<path d="M7 3h7l4 4v14H7z" stroke="${c}" stroke-width="2" fill="none" stroke-linejoin="round"/><path d="M14 3v4h4" stroke="${c}" stroke-width="2" fill="none" stroke-linejoin="round"/>`,
    meeting: `<circle cx="10" cy="10" r="6" stroke="${c}" stroke-width="2" fill="none"/><path d="M14 14l6 6" stroke="${c}" stroke-width="2" stroke-linecap="round"/>`,
    bell: `<path d="M12 5a5 5 0 0 1 5 5v4l2 3H5l2-3V10a5 5 0 0 1 5-5z" stroke="${c}" stroke-width="2" fill="none" stroke-linejoin="round"/><path d="M10 20a2 2 0 0 0 4 0" stroke="${c}" stroke-width="2" fill="none"/>`,
    send: `<path d="M21 4L3 11l7 3 3 7 8-17z" stroke="${c}" stroke-width="2" fill="none" stroke-linejoin="round"/>`,
  }
  return `<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">${map[kind] || map.file}</svg>`
}

// WMO 天气代码 → 中文文案
function weatherText(code: number) {
  if (code <= 1) return '晴'
  if (code === 2) return '多云'
  if (code === 3) return '阴'
  if (code === 45 || code === 48) return '雾'
  if (code >= 51 && code <= 67) return '小雨'
  if (code >= 71 && code <= 77) return '雪'
  if (code >= 80 && code <= 82) return '阵雨'
  if (code >= 85 && code <= 86) return '阵雪'
  if (code >= 95) return '雷阵雨'
  return '天气'
}

// 天气图标（内联 SVG，随状态切换）
function weatherIcon(code: number) {
  const sun = `<circle cx="12" cy="12" r="4.5" fill="#E8A33D"/>`
  const cloud = `<path d="M7 17a4 4 0 0 1 .4-8A5 5 0 0 1 17 9a3.5 3.5 0 0 1 0 8H7z" fill="#9BB3C9"/>`
  const rays = `<g stroke="#E8A33D" stroke-width="2" stroke-linecap="round"><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2"/></g>`
  const rain = `<g stroke="#5B8FC9" stroke-width="2" stroke-linecap="round"><path d="M8 19l-1 2M12 19l-1 2M16 19l-1 2"/></g>`
  const bolt = `<path d="M13 16l-3 5h4l-3 5" stroke="#E8B23D" stroke-width="2" fill="none" stroke-linejoin="round"/>`
  let body = cloud
  if (code <= 1) body = sun + rays
  else if (code === 2) body = sun + cloud
  else if (code >= 51 && code <= 67) body = cloud + rain
  else if (code >= 71 && code <= 77) body = cloud + `<g fill="#fff"><circle cx="9" cy="20" r="1.3"/><circle cx="13" cy="21" r="1.3"/><circle cx="17" cy="20" r="1.3"/></g>`
  else if (code >= 80 && code <= 86) body = cloud + rain
  else if (code >= 95) body = cloud + bolt
  return `<svg viewBox="0 0 24 24" width="30" height="30" aria-hidden="true">${body}</svg>`
}

// 真实健康状态
async function loadHealth() {
  try {
    const resp = await fetch('/api/health', { cache: 'no-store' })
    const json = await resp.json()
    if (json.success) {
      const ok = json.status === 'ok'
      appStatus.value = {
        cls: ok ? 'ok' : 'warn',
        text: ok ? '系统服务正常' : '服务负载较高 · 请稍候',
        version: (json.version && json.version.app) || '',
      }
    }
  } catch (e) {
    appStatus.value = { cls: 'unknown', text: '服务状态未知', version: '' }
  }
}

// 天气（open-meteo，无需 key，支持 CORS）
async function loadWeather() {
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${WEATHER_LOCATION.lat}&longitude=${WEATHER_LOCATION.lon}&current=temperature_2m,weather_code&timezone=Asia%2FShanghai`
    const resp = await fetch(url, { cache: 'no-store' })
    const json = await resp.json()
    if (json && json.current) {
      weather.value = {
        temp: Math.round(json.current.temperature_2m),
        code: json.current.weather_code,
        text: weatherText(json.current.weather_code),
      }
    }
  } catch (e) { /* 天气失败不影响登录 */ }
}

// ===== 登录页左侧面板：动态公告（B，免鉴权公开接口） =====
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

/* ===== 公告排序与滚动播报（跑马灯） ===== */
/**
 * 置顶优先 + 发布时间倒序：置顶公告恒在最前。
 * pinned：置顶公告，固定顶部不参与滚动；rest：其余公告，多于阈值才跑马灯。
 */
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
/** 其余列表复制一份尾接，配合 translateY(-50%) 实现无缝循环 */
const restTrack = computed(() =>
  marqueeOn.value ? [...rest.value, ...rest.value] : rest.value
)
/** 时长随条数增长：每条约 4 秒，滚动速度恒定不因条数忽快忽慢 */
const marqueeStyle = computed(() => ({
  animationDuration: `${Math.max(16, rest.value.length * 4)}s`,
}))

/* ===== 紧急程度视觉化：优先取管理端设置的 priority，缺省按标题/分类关键字推断 ===== */
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

/** 背景粒子：一次性生成固定参数（伪随机种子），避免每次渲染跳动 */
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

/* ===== 假期倒计时：表内维护下一批假期区间，跨年补新一年即可 ===== */
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
    // 假期进行中
    if (today.getTime() >= s.getTime() && today.getTime() <= e.getTime()) {
      const left = Math.round((e.getTime() - today.getTime()) / DAY_MS) + 1
      return { label: `${h.name}进行中`, value: `剩余 ${left} 天` }
    }
    // 下一个未开始的假期
    if (today.getTime() < s.getTime()) {
      const days = Math.round((s.getTime() - today.getTime()) / DAY_MS)
      return { label: `距离${h.name}`, value: days <= 0 ? '就是今天' : `还有 ${days} 天` }
    }
  }
  return null
})

/** 登录页为未登录态：读取免鉴权公开公告接口 */
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
      
      localStorage.setItem('token', response.token || `session-${user.id}-${Date.now()}`)
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
        position: user.position || '',
        avatar: user.avatar || ''
      }
      localStorage.setItem('user', JSON.stringify(userInfo))
      
      // 存储用户权限信息 - 使用API返回的权限数据，无权限则为空数组
      localStorage.setItem('permissions', JSON.stringify(user.permissions || []))
      if (user.buttonPermissions) {
        localStorage.setItem('buttonPermissions', JSON.stringify(user.buttonPermissions))
      }
      
      // 建立 Socket 连接，维持单设备登录
      reinitSocket()
      // E8: 启用会话空闲超时检测
      startIdleDetector()

      console.log('登录成功，跳转到首页');
      router.push('/');
    } else {
      // 登录失败
      ElMessage.error(response.message || '用户名或密码错误');
    }
  } catch (error: any) {
    console.error('登录失败:', error)
    // 提取后端返回的具体错误信息（如 429 限流提示），避免被统一文案掩盖
    const msg = error?.response?.data?.message
    ElMessage.error(msg || '登录失败，请重试')
  }
}

// 组件挂载时初始化
onMounted(() => {
  console.log('Login page mounted');
  generateCaptcha();
  // 登录页左侧面板数据：动态公告（免鉴权公开接口）
  loadPublicData();
  // 真实健康状态 + 天气（免鉴权公开接口）
  loadHealth();
  loadWeather();
  // E8: 若是因空闲超时被登出，提示用户
  const urlParams = new URLSearchParams(window.location.search)
  if (urlParams.get('reason') === 'idle') {
    ElMessage.warning('长时间未操作，已自动退出登录，请重新登录')
    // 清除 URL 中的原因参数
    urlParams.delete('reason')
    const qs = urlParams.toString()
    window.history.replaceState({}, '', qs ? '/login?' + qs : '/login')
  }
  // 检查是否已有token，如果有则跳转到首页
  const token = localStorage.getItem('token');
  if (token) {
    console.log('Token already exists, redirecting to home');
    router.push('/');
  }
})
</script>

<style scoped src="../assets/login.css"></style>
