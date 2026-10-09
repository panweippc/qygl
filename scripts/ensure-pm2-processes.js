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
import { spawnSync } from 'child_process'

const ROOT = 'E:/qygl/qygl'
const NGINX_DIR = 'E:/qygl/qygl/nginx-1.22.1'
const NGINX_EXE = 'E:/qygl/qygl/nginx-1.22.1/nginx.exe'

// 期望存在的全部 PM2 进程；cron 为 null 表示常驻（如后端/nginx/监控采集），否则为 cron-restart 表达式
const PROCESSES = [
  { name: 'qygl',                script: ROOT + '/server.js',                       cron: null,           cwd: ROOT },
  { name: 'qygl-nginx',          script: NGINX_EXE,                                 cron: null,           cwd: NGINX_DIR },
  { name: 'qygl-inventory-plan', script: ROOT + '/scripts/cron-inventory-plan.js',  cron: '0 2 * * *',    cwd: ROOT },
  { name: 'qygl-monitor',        script: ROOT + '/scripts/monitor-collector.js',    cron: null,           cwd: ROOT },
  { name: 'qygl-health',         script: ROOT + '/scripts/monitor-health.js',       cron: '0,30 * * * *', cwd: ROOT },
  { name: 'qygl-backup',         script: ROOT + '/scripts/auto-backup.js',          cron: '0 2 * * *',    cwd: ROOT },
  { name: 'qygl-cleanup',        script: ROOT + '/scripts/cleanup-logs.js',         cron: '30 3 * * *',   cwd: ROOT },
  { name: 'qygl-security-audit', script: ROOT + '/scripts/security-audit.js',       cron: '0 4 * * 1',    cwd: ROOT },
  { name: 'qygl-inactive',       script: ROOT + '/scripts/inactive-account-check.js', cron: '30 3 * * 1',  cwd: ROOT },
]

const DRY_RUN = process.argv.includes('--dry-run')

function runPm2(args) {
  // 直接用 spawnSync 传参数数组,避免 cmd /c 对引号的重复解析导致路径/cron表达式被嵌套引号污染
  // Windows 下 pm2 实际可执行文件是 pm2.cmd,spawnSync 默认不搜索 .cmd 扩展名,
  // 使用 shell:true 让 Node 通过系统 shell 执行,从而正确解析 .cmd 并继承 PATH。
  const r = spawnSync('pm2', args, { encoding: 'utf8', windowsHide: true, shell: true })
  if (r.error) {
    console.error('[ensure-pm2] spawn error: ' + r.error.message)
  }
  return r
}

function parsePm2List() {
  const r = runPm2(['jlist'])
  if (r.status === 0 && r.stdout && r.stdout.trim()) {
    try {
      const list = JSON.parse(r.stdout)
      const map = {}
      for (const item of list) {
        const name = item?.name
        if (!name) continue
        const env = item?.pm2_env || {}
        const status = env?.status || item?.status || 'unknown'
        map[name] = { status, pid: env?.pm_id ?? item?.pid }
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
  const r2 = runPm2(['list', '--no-color'])
  const map = {}
  const lines = (r2.stdout || '').split('\n')
  for (const line of lines) {
    const m = line.match(/\|\s*\d+\s*\|\s*([\w\-]+)\s*\|/)
    if (m) map[m[1]] = { status: 'unknown' }
  }
  return map
}

function deleteProcess(name) {
  console.log('[ensure-pm2] exec: pm2 delete ' + name)
  if (DRY_RUN) return true
  const r = runPm2(['delete', name])
  if (r.stdout && r.stdout.trim()) console.log(r.stdout.trim())
  if (r.stderr && r.stderr.trim()) console.log(r.stderr.trim())
  return r.status === 0 || (r.stderr || '').toLowerCase().includes('not found')
}

function startProcess(p) {
  const args = ['start', p.script, '--name', p.name, '--cwd', p.cwd]
  if (p.cron) args.push('--cron-restart', p.cron)
  const cmdPreview = 'pm2 ' + args.map((a) => (a.includes(' ') ? '"' + a + '"' : a)).join(' ')
  console.log('[ensure-pm2] exec: ' + cmdPreview)
  if (DRY_RUN) return true
  const r = runPm2(args)
  if (r.stdout && r.stdout.trim()) console.log(r.stdout.trim())
  if (r.stderr && r.stderr.trim()) console.log(r.stderr.trim())
  return r.status === 0 && !r.error
}

function main() {
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
      if (info.status === 'errored') {
        console.log('[ensure-pm2] exists but errored -> delete and recreate: ' + p.name)
        if (DRY_RUN) {
          console.log('[ensure-pm2] [dry-run] would delete+start: ' + desc)
          changed = true
          continue
        }
        deleteProcess(p.name)
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
    const r = runPm2(['save'])
    if (r.status === 0) {
      console.log('[ensure-pm2] pm2 save done')
    } else {
      console.error('[ensure-pm2] pm2 save failed: ' + (r.stderr || '').trim())
    }
  }
  console.log('[ensure-pm2] done' + (DRY_RUN ? ' (dry-run)' : ''))
}

main()
