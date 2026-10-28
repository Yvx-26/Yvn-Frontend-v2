const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '')

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

export async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const controller = new AbortController()
  const externalSignal = init?.signal
  const cancel = () => controller.abort()
  if (externalSignal?.aborted) cancel()
  externalSignal?.addEventListener('abort', cancel, { once: true })
  const timeoutId = window.setTimeout(() => controller.abort(), 5000)

  try {
    const response = await fetch(`${apiBaseUrl}${path}`, {
      ...init,
      headers: buildHeaders(init),
      signal: controller.signal,
    })
    recordConnection(path, response.status < 500)

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { detail?: unknown } | null
      const detail = payload?.detail
      const message =
        typeof detail === 'string'
          ? detail
          : Array.isArray(detail)
            ? detail
                .map((item) => (typeof item?.msg === 'string' ? item.msg : '参数校验失败'))
                .join('；')
            : ''
      throw new ApiError(message || `请求失败（${response.status}）`, response.status)
    }
    return (await response.json()) as T
  } catch (error) {
    if (externalSignal?.aborted) throw new DOMException('请求已取消', 'AbortError')
    if (error instanceof ApiError) throw error
    recordConnection(path, false)
    if (isRequestCancelled(error)) {
      throw new ApiError('后端连接超时')
    }
    throw new ApiError('暂时无法连接后端服务')
  } finally {
    window.clearTimeout(timeoutId)
    externalSignal?.removeEventListener('abort', cancel)
  }
}
import { recordConnection } from './connection'

function buildHeaders(init?: RequestInit) {
  const headers = new Headers(init?.headers)
  if (init?.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json')
  return headers
}

export function isRequestCancelled(error: unknown) {
  return (
    typeof error === 'object' && error !== null && 'name' in error && error.name === 'AbortError'
  )
}
