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
        <!-- 问候 + 天气（免登录，公开渲染） -->
        <div class="login-greeting">
          <div class="greet-main">
            <p class="greet-text">{{ greetText }}</p>
            <p class="greet-date">{{ todayText }}<span v-if="weather" class="greet-weather"> · {{ weather.text }} {{ weather.temp }}°C</span></p>
            <p v-if="dayTips" class="greet-festival">{{ dayTips }}</p>
            <p v-if="dailyQuote" class="greet-quote">{{ dailyQuote }}</p>
          </div>
          <div v-if="weather" class="greet-icon" v-html="weatherIcon(weather.code)"></div>
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

    <!-- 忘记密码指引 -->
    <el-dialog
      v-model="forgotVisible"
      title="忘记密码"
      width="90%"
      align-center
      append-to-body
    >
      <div class="forgot-body">
        <p class="forgot-lead">请联系本系统管理员 <b>李智鑫</b> 进行改密并获取新密码，获取新密码后请第一时间进行改密并妥善保存。</p>
      </div>
      <template #footer>
        <el-button @click="forgotVisible = false">知道了</el-button>
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
          <label class="field-label">请输入用户名</label>
          <el-input
            v-model="loginForm.username"
            :prefix-icon="User"
            class="input-field"
            :class="{ 'input-active': activeInput === 'username' }"
            @focus="activeInput = 'username'"
            @blur="activeInput = ''"
            :validate-event="false"
          />
        </el-form-item>

        <el-form-item prop="password">
          <div class="pwd-label-row">
            <label class="field-label">请输入密码</label>
            <span class="help-link" @click="forgotVisible = true">忘记密码？</span>
          </div>
          <el-input
            v-model="loginForm.password"
            type="password"
            :prefix-icon="Lock"
            class="input-field"
            :class="{ 'input-active': activeInput === 'password' }"
            @focus="activeInput = 'password'"
            @blur="activeInput = ''"
            show-password
            :validate-event="false"
            @keyup.enter="handleLogin"
          />
        </el-form-item>

        <el-form-item prop="captcha">
          <label class="field-label">请输入验证码</label>
          <div class="captcha-container">
            <el-input
              v-model="loginForm.captcha"
              :prefix-icon="CircleCheck"
              class="input-field captcha-input"
              :class="{ 'input-active': activeInput === 'captcha' }"
              @focus="activeInput = 'captcha'"
              @blur="activeInput = ''"
              :validate-event="false"
              @keyup.enter="handleLogin"
            />
            <div class="captcha-box">
              <img
                v-if="captchaImage"
                :src="captchaImage"
                alt="验证码"
                class="captcha-img"
                @click="generateCaptcha"
                title="点击刷新验证码"
              />
              <span v-else class="captcha-placeholder" @click="generateCaptcha">点击获取</span>
              <button type="button" class="captcha-refresh" @click="generateCaptcha" title="刷新验证码" aria-label="刷新验证码">
                <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
                  <path d="M20 12a8 8 0 1 1-2.34-5.66" stroke="#1E5AA8" stroke-width="2" fill="none" stroke-linecap="round"/>
                  <path d="M20 3v4h-4" stroke="#1E5AA8" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              </button>
            </div>
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

// 忘记密码对话框
const forgotVisible = ref(false)

// ===== 登录页公共信息（免登录）：问候 / 天气 / 节日节气 =====
// 天气（公开接口，失败不影响登录）
const weather = ref<{ temp: number; code: number; text: string } | null>(null)
// 天气定位：默认呼和浩特，如需其他城市请改经纬度
const WEATHER_LOCATION = { lat: 40.8424, lon: 111.7490 }

// ===== 实时节日 / 节气提醒（公历节日 + 24 节气 + 主要农历节日静态表） =====
const SOLAR_TERMS = ['小寒','大寒','立春','雨水','惊蛰','春分','清明','谷雨','立夏','小满','芒种','夏至','小暑','大暑','立秋','处暑','白露','秋分','寒露','霜降','立冬','小雪','大雪','冬至']
// 寿星公式基准（1900 年起，单位：分钟）
const S_TERM_BASE = [0,21208,42467,63836,85337,107014,128867,150921,173149,195551,218072,240693,263343,285989,308563,331033,353350,375494,397447,419210,440795,462224,483532,504758]
function solarTermDate(y: number, n: number) {
  return new Date((31556925974.7 * (y - 1900) + S_TERM_BASE[n - 1] * 60000) + Date.UTC(1900, 0, 6, 2, 5))
}
const FIXED_FESTIVALS = [
  { m: 1, d: 1, name: '元旦' }, { m: 3, d: 8, name: '妇女节' }, { m: 5, d: 1, name: '劳动节' },
  { m: 6, d: 1, name: '儿童节' }, { m: 9, d: 10, name: '教师节' }, { m: 10, d: 1, name: '国庆节' },
  { m: 12, d: 1, name: '艾滋病日' },
]
// 主要农历节日静态表（如需更多年份，按农历公历对照续表即可）
const LUNAR_FESTIVALS = [
  { y: 2026, m: 2, d: 17, name: '春节' }, { y: 2026, m: 6, d: 19, name: '端午节' }, { y: 2026, m: 9, d: 25, name: '中秋节' },
  { y: 2027, m: 2, d: 6, name: '春节' }, { y: 2027, m: 6, d: 9, name: '端午节' }, { y: 2027, m: 9, d: 15, name: '中秋节' },
  { y: 2028, m: 1, d: 26, name: '春节' }, { y: 2028, m: 5, d: 29, name: '端午节' }, { y: 2028, m: 10, d: 3, name: '中秋节' },
]
const FEST_DAY = 24 * 3600 * 1000
const festivalTip = computed(() => {
  const now = new Date()
  const t = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const y = now.getFullYear()
  const events: { date: Date; label: string }[] = []
  for (const yy of [y, y + 1]) {
    for (let n = 1; n <= 24; n++) {
      const dt = solarTermDate(yy, n)
      events.push({ date: new Date(dt.getFullYear(), dt.getMonth(), dt.getDate()), label: SOLAR_TERMS[n - 1] })
    }
    for (const f of FIXED_FESTIVALS) events.push({ date: new Date(yy, f.m - 1, f.d), label: f.name })
    for (const f of LUNAR_FESTIVALS) if (f.y === yy) events.push({ date: new Date(yy, f.m - 1, f.d), label: f.name })
  }
  for (const e of events) if (e.date.getTime() === t.getTime()) return `今日 ${e.label}`
  const future = events.filter((e) => e.date.getTime() > t.getTime()).sort((a, b) => a.date.getTime() - b.date.getTime())
  if (future.length) {
    const d = Math.round((future[0].date.getTime() - t.getTime()) / FEST_DAY)
    return `距离 ${future[0].label} 还有 ${d} 天`
  }
  return ''
})
// 时段问候语
const greetText = computed(() => {
  const h = new Date().getHours()
  if (h < 11) return '上午好'
  if (h < 13) return '中午好'
  if (h < 18) return '下午好'
  return '晚上好'
})

// ===== 每日鼓励语：内置寄语数组，按当天序号确定（全员当天一致），零外链 =====
const DAILY_QUOTES = [
  '把简单的事做到极致，就是不简单。',
  '今天的努力，是明天的实力。',
  '认真工作的人，运气都不会太差。',
  '每一步都算数，每一天都值得。',
  '与其担心未来，不如现在努力。',
  '成功来自坚持，坚持造就非凡。',
  '把小事做好，把大事做细。',
  '心中有目标，脚下有力量。',
  '不积跬步，无以至千里。',
  '效率源于专注，成果源于积累。',
  '用学习拥抱变化，用行动回答问题。',
  '保持热爱，奔赴山海。',
  '细节决定成败，态度决定高度。',
  '每一次全力以赴，都是对未来的投资。',
  '越努力，越幸运。',
  '同心同行，共创共赢。',
  '今日事，今日毕。',
  '灵感是勤奋的回报。',
  '你的价值，藏在你解决问题的能力里。',
  '沟通让协作更顺畅，协作让成果更出色。',
  '专注当下，静待花开。',
  '让标准成为习惯，让习惯符合标准。',
  '信任建立在每一次靠谱的交付上。',
  '进步一点点，日久见差距。',
  '微笑面对客户，用心对待工作。',
  '把困难当台阶，步步向上。',
  '守时守信，是职场最好的名片。',
  '最好的时机是现在，最好的方式是行动。',
  '热爱可抵岁月漫长。',
  '做正确的事，正确地做事。',
  '心怀感恩，脚踏实地。',
  '专业成就价值，服务赢得口碑。',
  '不懂就问，不会就学，学了就干。',
  '安全无小事，责任大于天。',
  '数据会说话，结果见真章。',
  '昨天删繁就简，今天精益求精。',
  '轻装上阵，全力以赴。',
  '靠谱，是对一个人最高的评价。',
  '聚沙成塔，滴水穿石。',
  '主动一点，机会就多一分。',
  '好习惯是高效的原动力。',
  '心怀热忱，眼里有光。',
  '把每个平凡的日子，过出不平凡的收获。',
  '认真是一种态度，更是一种能力。',
  '和优秀的人同行，与更好的自己相遇。',
  '与其羡慕别人，不如成就自己。',
  '付出不亚于任何人的努力。',
  '今天的你，要比昨天更进一步。',
  '心中有光，何惧路长。',
  '始于初心，成于坚守。',
  '坚持是普通人唯一的捷径。',
  '把复杂留给自己，把简单留给同事。',
  '一次把事情做对，就是最大的节约。',
  '向阳而生，逐光而行。',
  '凡是过往，皆为序章。',
  '千里之行，始于足下。',
  '质量是尊严，信誉是生命。',
  '有志者，事竟成。',
  '行动是治愈恐惧的良药。',
  '用结果说话，让实力证明。',
  '不驰于空想，不骛于虚声。',
  '行胜于言，实干为本。',
  '保持好奇心，永远在路上。',
  '每天进步1%，一年强大37倍。',
  '星光不问赶路人，时光不负有心人。',
]
const dailyQuote = computed(() => {
  const now = new Date()
  const start = new Date(now.getFullYear(), 0, 0)
  const dayOfYear = Math.floor((now.getTime() - start.getTime()) / 86400000)
  return DAILY_QUOTES[dayOfYear % DAILY_QUOTES.length] || ''
})

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
  const sun = `<circle cx="12" cy="12" r="4.5" fill="#F2C063"/>`
  const cloud = `<path d="M7 17a4 4 0 0 1 .4-8A5 5 0 0 1 17 9a3.5 3.5 0 0 1 0 8H7z" fill="#C9DCEF"/>`
  const rays = `<g stroke="#F2C063" stroke-width="2" stroke-linecap="round"><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2"/></g>`
  const rain = `<g stroke="#9CC3E8" stroke-width="2" stroke-linecap="round"><path d="M8 19l-1 2M12 19l-1 2M16 19l-1 2"/></g>`
  const bolt = `<path d="M13 16l-3 5h4l-3 5" stroke="#F2C063" stroke-width="2" fill="none" stroke-linejoin="round"/>`
  let body = cloud
  if (code <= 1) body = sun + rays
  else if (code === 2) body = sun + cloud
  else if (code >= 51 && code <= 67) body = cloud + rain
  else if (code >= 71 && code <= 77) body = cloud + `<g fill="#fff"><circle cx="9" cy="20" r="1.3"/><circle cx="13" cy="21" r="1.3"/><circle cx="17" cy="20" r="1.3"/></g>`
  else if (code >= 80 && code <= 86) body = cloud + rain
  else if (code >= 95) body = cloud + bolt
  return `<svg viewBox="0 0 24 24" width="30" height="30" aria-hidden="true">${body}</svg>`
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

// 真实健康状态：取自后端 /api/health（含 git 标签版本），替代原三个静态假指标
const appStatus = ref({ cls: 'unknown', text: '服务状态未知', version: '' })

const todayText = (() => {
  const d = new Date()
  const week = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'][d.getDay()]
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${week}`
})()

/* ===== 假期倒计时：表内维护下一批假期区间，跨年补新一年即可（合并展示于问候区 dayTips） ===== */
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

// 合并展示：节日/节气 + 假期倒计时（一行内用 · 分隔，替代原独立假期条）
const dayTips = computed(() => {
  const parts: string[] = []
  if (festivalTip.value) parts.push(festivalTip.value)
  const h = holidayTip.value
  if (h) parts.push(`${h.label.replace(/^距离/, '')} ${h.value}`)
  return parts.join(' · ')
})

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

// 真实健康状态
async function loadHealth() {
  try {
    const resp = await fetch('/api/health', { cache: 'no-store' })
    const json = await resp.json()
    if (json.success) {
      const ok = json.status === 'ok'
      appStatus.value = {
        cls: ok ? 'ok' : 'warn',
        text: ok ? '系统服务正常' : '服务波动 · 请稍候',
        version: (json.version && json.version.app) || '',
      }
    }
  } catch (e) {
    appStatus.value = { cls: 'unknown', text: '服务状态未知', version: '' }
  }
}

const loginForm = reactive({
  username: '',
  password: '',
  captcha: ''
})

const captchaToken = ref('')
const captchaImage = ref('')

// 服务端验证码：向后端 /api/captcha 取一次性 token + SVG 图片；失败时显示占位可重试
const generateCaptcha = async () => {
  try {
    const resp = await fetch('/api/captcha', { cache: 'no-store' })
    const json = await resp.json()
    if (json.success && json.svg) {
      captchaImage.value = json.svg
      captchaToken.value = json.token
    } else {
      captchaImage.value = ''
      captchaToken.value = ''
    }
  } catch (e) {
    captchaImage.value = ''
    captchaToken.value = ''
  }
}

// 校验时机：输入过程不触发（validate-event=false），仅在点击登录时统一校验
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
    // 提交时才触发表单校验，红字提示不会在输入前出现
    const valid = await loginFormRef.value?.validate().catch(() => false)
    if (!valid) return

    loading.value = true
    const response = await api.post('/login', {
      username: loginForm.username.trim(),
      password: loginForm.password,
      captcha: loginForm.captcha,
      captchaToken: captchaToken.value,
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
      // 登录失败：验证码 token 已一次性消费，刷新并重输
      ElMessage.error(data?.message || '用户名或密码错误')
      loginForm.captcha = ''
      generateCaptcha()
    }
  } catch (error: any) {
    // 提取后端返回的具体错误信息（如 429 限流提示、验证码错误等），避免被统一文案掩盖
    const msg = error?.response?.data?.message
    ElMessage.error(msg || '登录失败，请重试')
    loginForm.captcha = ''
    generateCaptcha()
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  generateCaptcha()
  loadPublicData()
  loadWeather()
  loadHealth()
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
  display: flex !important;
  flex-direction: column !important;
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
.mobile-login .captcha-box {
  display: flex !important;
  align-items: center !important;
  gap: 4px !important;
  flex: 0 0 auto !important;
}
.mobile-login .login-btn { height: 42px !important; }
.mobile-login .announce-board { padding: 12px !important; }
/* 问候卡：移动端收窄，置于公告面板上方的深蓝侧栏内 */
.mobile-login .login-greeting {
  margin-bottom: 0.85rem !important;
  padding: 0.7rem 0.85rem !important;
  border-radius: 12px !important;
  background: rgba(255, 255, 255, 0.92) !important;
}
.mobile-login .greet-text { font-size: 1rem !important; }
.mobile-login .greet-date { font-size: 0.74rem !important; }
.mobile-login .greet-festival { font-size: 0.72rem !important; }
.mobile-login .greet-quote { font-size: 0.72rem !important; line-height: 1.4 !important; margin-top: 2px !important; }
.mobile-login .greet-icon { width: 34px !important; height: 34px !important; }
.mobile-login .board-title { font-size: 1rem !important; }
.mobile-login .board-sub { font-size: 11px !important; }
.mobile-login .announce-title { font-size: 12px !important; }
.mobile-login .announce-summary { font-size: 11px !important; }
.mobile-login .announce-date { font-size: 10px !important; }
.mobile-login .announce-badge { font-size: 10px !important; }
/* sys-status 在移动端全宽贴卡底 */
.mobile-login .sys-status {
  max-width: none !important;
  margin-top: auto !important;
  padding: 0.7rem 1rem !important;
  font-size: 11px !important;
}
.mobile-login .forgot-body { font-size: 13px !important; }
</style>
