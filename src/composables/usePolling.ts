import { onBeforeUnmount, onMounted, ref, toValue, watch, type MaybeRefOrGetter } from 'vue'
import { isRequestCancelled } from '../services/http'

/** Run after the previous request settles; pausing, switching and unmounting cancel stale work. */
export function usePolling(
  task: (signal: AbortSignal) => Promise<void>,
  intervalMs = 10000,
  enabled: MaybeRefOrGetter<boolean> = true,
) {
  const error = ref('')
  const refreshing = ref(false)
  let timer: ReturnType<typeof setTimeout> | undefined
  let controller: AbortController | undefined
  let revision = 0
  let mounted = false
  let disposed = false

  function stop() {
    revision += 1
    clearTimeout(timer)
    timer = undefined
    controller?.abort()
    controller = undefined
    refreshing.value = false
  }

  async function refresh(force = false) {
    if (disposed || (!toValue(enabled) && !force)) return
    stop()
    const requestRevision = revision
    const currentController = new AbortController()
    controller = currentController
    refreshing.value = true
    try {
      await task(currentController.signal)
      if (requestRevision === revision && !currentController.signal.aborted) error.value = ''
    } catch (cause) {
      if (requestRevision === revision && !isRequestCancelled(cause)) {
        error.value = cause instanceof Error ? cause.message : '数据刷新失败'
      }
    } finally {
      if (requestRevision === revision && !disposed) {
        controller = undefined
        refreshing.value = false
        if (toValue(enabled)) timer = setTimeout(() => void refresh(), intervalMs)
      }
    }
  }

  watch(
    () => toValue(enabled),
    (active) => {
      stop()
      if (active && mounted) void refresh()
    },
  )
  onMounted(() => {
    mounted = true
    if (toValue(enabled)) void refresh()
  })
  onBeforeUnmount(() => {
    disposed = true
    stop()
  })
  return { refresh, error, refreshing }
}
