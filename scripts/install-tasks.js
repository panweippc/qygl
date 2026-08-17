/**
 * 安全运维定时任务安装脚本（Windows 计划任务）
 * 功能：注册以下定时任务，实现自动化的持续安全防护：
 *   1. qygl-backup          每天 02:00  数据库自动备份
 *   2. qygl-cleanup-logs    每天 03:30  清理操作日志 + 轮转安全/访问/错误日志
 *   3. qygl-security-audit  每周一 04:00 依赖漏洞审计（npm audit）
 *   4. qygl-monitor-health  每 30 分钟  服务健康监控（异常邮件告警）
 * 用法：node scripts/install-tasks.js
 * 说明：以当前用户的最高权限注册；node 与脚本路径自动探测
 */
import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

// 探测 node 可执行文件路径
const nodePath = process.execPath || 'node';
// 脚本基于项目根目录执行，.env 与 node_modules 均在项目根
const runner = (script, extra = '') => `"${nodePath}" "${path.join(root, script)}" ${extra}`;

const tasks = [
  {
    name: 'qygl-backup',
    desc: '数据库自动备份（每天 02:00）',
    cmd: runner('scripts/auto-backup.js'),
    trigger: '/SC DAILY /ST 02:00'
  },
  {
    name: 'qygl-cleanup-logs',
    desc: '操作日志清理与日志轮转（每天 03:30）',
    cmd: runner('scripts/cleanup-logs.js'),
    trigger: '/SC DAILY /ST 03:30'
  },
  {
    name: 'qygl-security-audit',
    desc: '依赖漏洞审计（每周一 04:00）',
    cmd: runner('scripts/security-audit.js'),
    trigger: '/SC WEEKLY /D MON /ST 04:00'
  },
  {
    name: 'qygl-monitor-health',
    desc: '服务健康监控（每 30 分钟）',
    cmd: runner('scripts/monitor-health.js'),
    trigger: '/SC MINUTE /MO 30'
  }
];

// 生成一个日志目录用于接收任务输出，便于排查
const logDir = path.join(root, 'logs');
if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });

function run(scriptName) {
  const task = tasks.find(t => t.name === scriptName);
  if (!task) return false;
  console.log(`\n=== 注册计划任务: ${task.name} ===`);
  console.log(`  ${task.desc}`);
  const outFile = path.join(logDir, `${task.name}.log`);
  // schtasks 的 /TR 参数：内层引号用 \" 转义，重定向放在 cmd /c 内部，避免 >> 被误判为参数
  const cmdLine = `cmd /c "${task.cmd}" >> "${outFile}" 2>&1`;
  const sch = `schtasks /Create /F /TN "${task.name}" ${task.trigger} /TR "${cmdLine.replace(/"/g, '\\"')}" /RL HIGHEST`;
  try {
    const out = execSync(sch, { stdio: ['pipe', 'pipe', 'pipe'] }).toString();
    console.log(`  ✓ ${out.trim()}`);
    return true;
  } catch (e) {
    console.error(`  ✗ 注册失败: ${(e.stderr || e.message || '').toString().trim()}`);
    console.error(`    如需管理员权限，请以"管理员身份"运行此脚本。`);
    return false;
  }
}

console.log('=== 智慧办公平台 · 安全运维定时任务安装 ===');
let ok = true;
for (const t of tasks) {
  if (!run(t.name)) ok = false;
}

console.log('\n=== 完成 ===');
if (ok) {
  console.log('全部计划任务注册成功。');
} else {
  console.log('部分任务注册失败，请以管理员身份重新运行。');
}
console.log('可用命令：');
console.log('  schtasks /Query /TN qygl-backup          # 查看备份任务');
console.log('  schtasks /Delete /TN qygl-backup /F      # 删除备份任务');
