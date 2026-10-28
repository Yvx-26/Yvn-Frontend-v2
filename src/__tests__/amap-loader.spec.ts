import { afterEach, describe, expect, it, vi } from 'vitest'

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
  delete window.AMap
  delete window.__initializeCableFaultMap
  document.querySelectorAll('script[src*="webapi.amap.com"]').forEach((script) => script.remove())
})

describe('shared AMap loader recovery', () => {
  it('does not cache a missing-key failure and retries after script failure', async () => {
    vi.resetModules()
    const { loadAmap } = await import('../integrations/amap/loader')
    await expect(loadAmap('', '')).rejects.toThrow('Key')
    const first = loadAmap('test-key', '')
    const rejected = first.catch((cause: unknown) => cause)
    document
      .querySelector<HTMLScriptElement>('script[src*="webapi.amap.com"]')!
      .dispatchEvent(new Event('error'))
    expect(await rejected).toHaveProperty('message', '高德地图资源加载失败，请检查网络或 Key 配置')
    const second = loadAmap('test-key', '')
    expect(second).not.toBe(first)
    const noSdk = second.catch((cause: unknown) => cause)
    window.__initializeCableFaultMap!()
    expect(await noSdk).toHaveProperty('message', '高德地图接口加载完成，但未返回地图对象')
  })

  it('times out a stalled SDK request and permits another attempt', async () => {
    vi.useFakeTimers()
    vi.resetModules()
    const { loadAmap } = await import('../integrations/amap/loader')
    const stalled = loadAmap('test-key', '')
    const rejected = stalled.catch((cause: unknown) => cause)
    await vi.advanceTimersByTimeAsync(15000)
    expect(await rejected).toHaveProperty('message', '地图加载超时，请检查网络后重试')
    expect(document.querySelector('script[src*="webapi.amap.com"]')).toBeNull()
    const retried = loadAmap('test-key', '')
    const rejectedAgain = retried.catch((cause: unknown) => cause)
    document
      .querySelector<HTMLScriptElement>('script[src*="webapi.amap.com"]')!
      .dispatchEvent(new Event('error'))
    expect(await rejectedAgain).toHaveProperty(
      'message',
      '高德地图资源加载失败，请检查网络或 Key 配置',
    )
  })
})
