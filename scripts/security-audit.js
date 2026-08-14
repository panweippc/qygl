/**
 * 依赖安全审计脚本
 * 功能：执行 npm audit 检查生产依赖的已知漏洞，并输出简明报告。
 * 用法：node scripts/security-audit.js
 * 建议：可加入 Windows 计划任务定期执行（如每周一次），实现依赖漏洞持续监控。
 */
import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

console.log('=== 依赖安全审计开始 ===\n');

try {
  // --omit=dev 只审计生产依赖（devDependencies 不进入生产环境，风险较低）
  const output = execSync('npm audit --omit=dev --json', {
    cwd: root,
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'pipe'],
    timeout: 120000, // 120秒超时，避免卡住
  }).toString();

  const data = JSON.parse(output);
  const meta = data.metadata || {};
  const vulns = data.vulnerabilities || {};

  const summary = meta.vulnerabilities || { info: 0, low: 0, moderate: 0, high: 0, critical: 0 };
  console.log('生产依赖漏洞汇总:');
  console.log(`  信息(info): ${summary.info ?? 0}`);
  console.log(`  低危(low): ${summary.low ?? 0}`);
  console.log(`  中危(moderate): ${summary.moderate ?? 0}`);
  console.log(`  高危(high): ${summary.high ?? 0}`);
  console.log(`  严重(critical): ${summary.critical ?? 0}`);

  const criticalHigh = Object.entries(vulns).filter(([, v]) => (v.severity === 'critical' || v.severity === 'high'));
  if (criticalHigh.length > 0) {
    console.log('\n⚠️ 存在高危/严重漏洞的依赖:');
    for (const [name, v] of criticalHigh) {
      console.log(`  - ${name} (${v.severity}): ${v.isDirect ? '直接依赖' : '间接依赖'}`);
      if (v.via) {
        console.log(`      原因: ${v.via.map(x => (typeof x === 'string' ? x : x.title)).join('; ')}`);
      }
    }
  } else {
    console.log('\n✅ 生产依赖无高危/严重漏洞');
  }
  process.exit(0);
} catch (err) {
  // npm audit 在发现漏洞时可能以非零码退出，此时 stderr/stdout 可能含 JSON
  const raw = err.stdout ? err.stdout.toString() : (err.message || '');
  try {
    const data = JSON.parse(raw);
    const summary = data.metadata?.vulnerabilities || {};
    console.log('依赖审计完成（存在漏洞，npm 返回非零码）:');
    console.log(JSON.stringify(summary, null, 2));
  } catch (_) {
    console.log('npm audit 执行失败（可能网络问题或依赖未安装）:');
    console.log(String(raw || err.message).slice(0, 500));
  }
  process.exit(1);
}
