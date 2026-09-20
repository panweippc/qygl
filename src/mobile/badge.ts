import { reactive } from 'vue'

// 底部导航未读数共享状态（首页/消息页写入，App.vue 读取）
export const badge = reactive({
  todo: 0,
  msg: 0
})
