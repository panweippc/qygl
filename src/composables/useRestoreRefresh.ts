// 回收站恢复后的跨页面刷新。
// 抽屉是挂在 App 上的全局浮层，恢复动作发生在当前路由之外，业务页面不会自动重拉数据，
// 因此用 window 自定义事件通知当前页面「就地重载」，保留筛选、分页与滚动位置。
import { onMounted, onUnmounted } from 'vue'

export const RESTORE_EVENT = 'recycle-bin-restored'

export interface RestoreDetail {
  module: string
  recordId: number | null
  title: string
  // 页面认领后置 true，App 层的兜底重建就不会触发
  handled: boolean
}

/**
 * 订阅「恢复成功」事件。订阅方只需传入自己的重载函数。
 * 未订阅的页面由 App.vue 递增版本号重建路由组件兜底，保证任何模块都不用手动刷新。
 */
export function useRestoreRefresh(reload: () => void | Promise<unknown>) {
  const handler = (e: Event) => {
    const detail = (e as CustomEvent<RestoreDetail>).detail
    if (detail) detail.handled = true
    // 放到微任务里执行，避免与抽屉自身的列表刷新抢同一轮响应
    Promise.resolve().then(() => reload()).catch(() => {})
  }
  onMounted(() => window.addEventListener(RESTORE_EVENT, handler))
  onUnmounted(() => window.removeEventListener(RESTORE_EVENT, handler))
}
