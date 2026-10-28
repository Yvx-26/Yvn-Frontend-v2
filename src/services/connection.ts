import { computed, shallowReactive } from 'vue'

// Each endpoint retains its health so one successful request cannot hide another failure.
const endpoints = shallowReactive(new Map<string, { healthy: boolean; at: number }>())
export const backendConnected = computed(
  () => endpoints.size > 0 && [...endpoints.values()].every((item) => item.healthy),
)

export function recordConnection(path: string, healthy: boolean) {
  const now = Date.now()
  endpoints.forEach((item, key) => {
    if (now - item.at > 30000) endpoints.delete(key)
  })
  endpoints.set(path.split('?')[0] ?? path, { healthy, at: now })
}
