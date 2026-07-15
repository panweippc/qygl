import { ref } from 'vue'
import { ElMessage } from 'element-plus'

export function useRequest() {
  const loading = ref(false)

  async function run<T>(
    fn: () => Promise<T>,
    options?: {
      onSuccess?: (data: T) => void
      onError?: (error: any) => void
      successMessage?: string
      errorMessage?: string
    }
  ): Promise<T | null> {
    loading.value = true
    try {
      const result = await fn()
      if (options?.successMessage) {
        ElMessage.success(options.successMessage)
      }
      options?.onSuccess?.(result)
      return result
    } catch (error: any) {
      const msg = error?.response?.data?.message || error?.message || '操作失败'
      if (options?.errorMessage) {
        ElMessage.error(options.errorMessage)
      } else {
        ElMessage.error(msg)
      }
      options?.onError?.(error)
      return null
    } finally {
      loading.value = false
    }
  }

  return { loading, run }
}
