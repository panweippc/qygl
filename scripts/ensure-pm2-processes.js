#!/usr/bin/env node
/*
 * 确保部署机 PM2 进程齐全：已存在则跳过，缺失/异常则自动重建（幂等，不扰动在跑的进程）。
 *
 * 背景：Windows 下 PM2 无 `pm2 startup`，机器重启后 `pm2 save` 列表不会自动拉起，
 *       导致 qygl / qygl-nginx / 各运维定时进程丢失。本脚本在每次 Jenkins 构建（含无新提交轮询）时
 *       检查 pm2 列表，缺哪个补哪个，从而自愈因重启/部署丢失的进程。
 *
 * 用法: node scripts/ensure-pm2-processes.js [--dry-run]
 *   --dry-run : 仅打印将执行的操作，不实际启动进程（用于本地校验逻辑，不会触碰任何进程）
 *
 * 注意：脚本全 ASCII（部署机代码页 GBK(936)，中文命令会被错误解码），进程启动参数集中在 PROCESSES。
 */
import { execSync } from 'child_process'

const ROOT = 'E:/qygl/qygl'
const NGINX_DIR = 'E:/qygl/qygl/nginx-1.22.1'
const NGINX_EXE = 'E:/qygl/qygl/nginx-1.22.1/nginx.exe'

// 期望存在的全部 PM2 进程；cron 为 null 表示常驻（脚本自身已实现循环/调度）
// 注意：health/inventory-plan/backup/cleanup/inactive 已改造为常驻自调度，不再使用 --cron-restart
const PROCESSES = [
  { name: 'qygl',                    script: ROOT + '/server.js',                           cron: null, cwd: ROOT },
  { name: 'qygl-nginx',              script: NGINX_EXE,                                     cron: null, cwd: NGINX_DIR },
  { name: 'qygl-inventory-plan',     script: ROOT + '/scripts/cron-inventory-plan.js',      cron: null, cwd: ROOT },
  { name: 'qygl-monitor',            script: ROOT + '/monitor-service.js',                  cron: null, cwd: ROOT },
  { name: 'qygl-monitor-collector',  script: ROOT + '/scripts/monitor-collector.js',        cron: null, cwd: ROOT },
  { name: 'qygl-health',             script: ROOT + '/scripts/monitor-health.js',           cron: null, cwd: ROOT },
  { name: 'qygl-backup',             script: ROOT + '/scripts/auto-backup.js',              cron: null, cwd: ROOT },
  { name: 'qygl-cleanup',            script: ROOT + '/scripts/cleanup-logs.js',             cron: null, cwd: ROOT },
  // qygl-security-audit 默认不自动重建：它会执行 npm audit，Windows 下可能弹出 cmd 窗口干扰桌面；如需启用请取消下面注释
  // { name: 'qygl-security-audit',     script: ROOT + '/scripts/security-audit.js',           cron: '0 4 * * 1', cwd: ROOT },
  { name: 'qygl-inactive',           script: ROOT + '/scripts/inactive-account-check.js',    cron: null, cwd: ROOT },
]

const DRY_RUN = process.argv.includes('--dry-run')

function normalizePath(p) {
  // Windows 路径大小写、正斜杠/反斜杠差异不影响实际执行，但会导致字符串比较不一致，统一归一化
  return (p || '').toLowerCase().replace(/\\/g, '/')
}

function runPm2(cmd) {
  // 使用 execSync 执行完整命令字符串,与 Jenkinsfile bat 步骤行为完全一致,
  // 避免 spawnSync + shell:true 在 Windows 下对含空格/逗号的 cron 表达式解析异常
  // (此前出现 --cron-restart "0,30 * * * *" 只被 pm2 识别为 "0,30" 的问题)。
  try {
    const stdout = execSync(cmd, { encoding: 'utf8', windowsHide: true }).toString()
    return { status: 0, stdout, stderr: '' }
  } catch (e) {
    return {
      status: e.status || 1,
      stdout: e.stdout ? e.stdout.toString() : '',
      stderr: e.stderr ? e.stderr.toString() : (e.message || ''),
    }
  }
}

function parsePm2List() {
  const r = runPm2('pm2 jlist')
  if (r.status === 0 && r.stdout && r.stdout.trim()) {
    try {
      const list = JSON.parse(r.stdout)
      const map = {}
      for (const item of list) {
        const name = item?.name
        if (!name) continue
        const env = item?.pm2_env || {}
        const status = env?.status || item?.status || 'unknown'
        const script = env?.pm_exec_path || ''
        const cwd = env?.cwd || env?.pm_cwd || item?.cwd || ''
        map[name] = { status, script, cwd, pid: env?.pm_id ?? item?.pid }
      }
      return map
    } catch (e) {
      console.log('[ensure-pm2] warn: pm2 jlist parse failed, fallback to text scan')
    }
  }
  if (r.status !== 0) {
    console.log('[ensure-pm2] warn: pm2 jlist exited ' + r.status)
    if (r.stderr) console.log('[ensure-pm2] jlist stderr: ' + r.stderr.trim())
  }
  // 退化：从 pm2 list 文本扫描名字
  const r2 = runPm2('pm2 list --no-color')
  const map = {}
  const lines = (r2.stdout || '').split('\n')
  for (const line of lines) {
    const m = line.match(/\|\s*\d+\s*\|\s*([\w\-]+)\s*\|/)
    if (m) map[m[1]] = { status: 'unknown' }
  }
  return map
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function deleteProcess(name) {
  console.log('[ensure-pm2] exec: pm2 delete ' + name)
  if (DRY_RUN) return true
  const r = runPm2('pm2 delete ' + name)
  if (r.stdout && r.stdout.trim()) console.log(r.stdout.trim())
  if (r.stderr && r.stderr.trim()) console.log(r.stderr.trim())
  return r.status === 0 || (r.stderr || '').toLowerCase().includes('not found')
}

function buildStartCmd(p) {
  const args = ['start', p.script, '--name', p.name, '--cwd', p.cwd]
  if (p.cron) args.push('--cron-restart', p.cron)
  return 'pm2 ' + args.map((a) => (a.includes(' ') ? '"' + a + '"' : a)).join(' ')
}

function startProcess(p) {
  const cmd = buildStartCmd(p)
  console.log('[ensure-pm2] exec: ' + cmd)
  if (DRY_RUN) return true
  const r = runPm2(cmd)
  if (r.stdout && r.stdout.trim()) console.log(r.stdout.trim())
  if (r.stderr && r.stderr.trim()) console.log(r.stderr.trim())
  return r.status === 0
}

async function main() {
  console.log('[ensure-pm2] running as user: ' + (process.env.USERDOMAIN ? process.env.USERDOMAIN + '\\' : '') + (process.env.USERNAME || 'unknown'))
  if (process.env.PM2_HOME) console.log('[ensure-pm2] PM2_HOME: ' + process.env.PM2_HOME)
  const processMap = parsePm2List()
  const existing = Object.keys(processMap)
  console.log('[ensure-pm2] existing processes: ' + (existing.length ? existing.join(', ') : '(none)'))
  let changed = false
  for (const p of PROCESSES) {
    const info = processMap[p.name]
    const desc = p.name + ' (' + p.script + (p.cron ? ', cron=' + p.cron : '') + ')'
    if (info) {
      // 当进程在线但启动脚本/cwd 与当前配置不一致时（例如变更过 script 或 cwd），需要删除重建
      const scriptMismatched = info.script && normalizePath(info.script) !== normalizePath(p.script)
      const cwdMismatched = info.cwd && normalizePath(info.cwd) !== normalizePath(p.cwd)
      const configMismatched = scriptMismatched || cwdMismatched
      if (info.status === 'errored' || configMismatched) {
        if (info.status === 'errored') {
          console.log('[ensure-pm2] exists but errored -> delete and recreate: ' + p.name)
        } else if (configMismatched) {
          console.log('[ensure-pm2] config mismatch (script=' + scriptMismatched + ', cwd=' + cwdMismatched + ') -> delete and recreate: ' + p.name)
        }
        if (DRY_RUN) {
          console.log('[ensure-pm2] [dry-run] would delete+start: ' + desc)
          changed = true
          continue
        }
        deleteProcess(p.name)
        // 等待 PM2 内部状态刷新，避免 delete 后立即 start 出现 "Process X not found"
        await sleep(800)
      } else {
        console.log('[ensure-pm2] skip (already exists, status=' + info.status + '): ' + p.name)
        continue
      }
    } else if (DRY_RUN) {
      console.log('[ensure-pm2] [dry-run] would start: ' + desc)
      changed = true
      continue
    } else {
      console.log('[ensure-pm2] MISSING -> start: ' + desc)
    }
    const ok = startProcess(p)
    if (ok) {
      changed = true
    } else {
      console.error('[ensure-pm2] FAILED to start: ' + p.name)
    }
  }
  if (changed && !DRY_RUN) {
    const r = runPm2('pm2 save')
    if (r.status === 0) {
      console.log('[ensure-pm2] pm2 save done')
    } else {
      console.error('[ensure-pm2] pm2 save failed: ' + (r.stderr || '').trim())
    }
  }
  console.log('[ensure-pm2] done' + (DRY_RUN ? ' (dry-run)' : ''))
}

main().catch((e) => {
  console.error('[ensure-pm2] unexpected error:', e)
  process.exit(1)
})
