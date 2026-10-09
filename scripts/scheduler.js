/**
 * 轻量常驻调度器
 * 将原本 "跑完即 process.exit" 的一次性脚本，改造为按周期自调度的常驻进程。
 * 避免 PM2 --cron-restart 与 process.exit 冲突导致的崩溃循环/errored 状态。
 *
 * 支持调度规格：
 *   { everyMinutes: 30 }                              -> 每 30 分钟执行一次
 *   { hour: 2, minute: 0 }                            -> 每天 02:00 执行
 *   { hour: 3, minute: 30, weekday: 1 }               -> 每周一 03:30 执行（weekday: 0=周日..6=周六）
 *
 * 调度器会计算下一次执行时间，用 setTimeout 等待；任务异常只记日志、不退出进程。
 */

const PAD = (n) => String(n).padStart(2, '0');

function formatNext(d) {
  return `${d.getFullYear()}-${PAD(d.getMonth() + 1)}-${PAD(d.getDate())} ${PAD(d.getHours())}:${PAD(d.getMinutes())}:${PAD(d.getSeconds())}`;
}

/**
 * @param {object} spec
 * @param {number} [spec.everyMinutes]
 * @param {number} [spec.hour]
 * @param {number} [spec.minute]
 * @param {number} [spec.weekday]
 * @param {() => Promise<void>|void} task
 */
export function startScheduler(spec, task) {
  function computeNextDelay() {
    const now = new Date();
    if (spec.everyMinutes && spec.everyMinutes > 0) {
      return spec.everyMinutes * 60 * 1000;
    }
    const target = new Date(now);
    target.setSeconds(0, 0);
    target.setHours(spec.hour ?? 0, spec.minute ?? 0, 0, 0);
    if (typeof spec.weekday === 'number') {
      const dayDiff = (spec.weekday - now.getDay() + 7) % 7;
      target.setDate(target.getDate() + dayDiff);
      if (target <= now) target.setDate(target.getDate() + 7);
    } else {
      if (target <= now) target.setDate(target.getDate() + 1);
    }
    return target - now;
  }

  async function tick() {
    try {
      await task();
    } catch (e) {
      console.error('[scheduler] 任务执行失败:', e?.message || e);
    }
    const delay = computeNextDelay();
    console.log(`[scheduler] 下次执行: ${formatNext(new Date(Date.now() + delay))}`);
    setTimeout(tick, delay);
  }

  const firstDelay = computeNextDelay();
  console.log(`[scheduler] 已启动，下次执行: ${formatNext(new Date(Date.now() + firstDelay))}`);
  setTimeout(tick, firstDelay);
}
