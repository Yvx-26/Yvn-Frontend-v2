import { afterEach, describe, expect, it, vi } from 'vitest'

afterEach(() => {
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

describe('HTTP cancellation and errors', () => {
  it('honors a caller abort without reporting a timeout', async () => {
    const { apiRequest } = await import('../services/http')
    vi.stubGlobal(
      'fetch',
      vi.fn(
        (_url, init: RequestInit) =>
          new Promise((_resolve, reject) => {
            init.signal?.addEventListener('abort', () =>
              reject(new DOMException('Aborted', 'AbortError')),
            )
          }),
      ),
    )
    const controller = new AbortController()
    const request = apiRequest('/api/cancel-test', { signal: controller.signal })
    controller.abort()
    await expect(request).rejects.toMatchObject({ name: 'AbortError' })
  })

  it('shows structured validation messages instead of coercing an array to text', async () => {
    const { apiRequest } = await import('../services/http')
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: false,
        status: 422,
        json: async () => ({ detail: [{ msg: 'Extra inputs are not permitted' }] }),
      })),
    )
    await expect(apiRequest('/api/validation-test')).rejects.toThrow(
      'Extra inputs are not permitted',
    )
  })

  it('sends configuration without live status or node sequence fields', async () => {
    const { putDevice } = await import('../services/infrastructure-api')
    const { device } = await import('./fixtures/infrastructure')
    const fetch = vi.fn<typeof globalThis.fetch>(
      async () => ({ ok: true, status: 200, json: async () => device() }) as Response,
    )
    vi.stubGlobal('fetch', fetch)
    await putDevice({ ...device(), state: 'online', lastSeen: '刚刚' })
    const sent = JSON.parse(String(fetch.mock.calls[0]![1]?.body))
    expect(sent).not.toHaveProperty('state')
    expect(sent).not.toHaveProperty('lastSeen')
    expect(sent).not.toHaveProperty('sequence')
    expect(sent).toHaveProperty('id', 'M1')
  })

  it('sends only node IDs and order when saving a line', async () => {
    const { putLine } = await import('../services/infrastructure-api')
    const { device, line } = await import('./fixtures/infrastructure')
    const value = line('L1', [device('D1', 'locator')])
    const fetch = vi.fn<typeof globalThis.fetch>(
      async () => ({ ok: true, status: 200, json: async () => value }) as Response,
    )
    vi.stubGlobal('fetch', fetch)
    await putLine(value)
    const sent = JSON.parse(String(fetch.mock.calls[0]![1]?.body))
    expect(sent.devices).toEqual([{ id: 'D1', sequence: 1 }])
    expect(sent.devices[0]).not.toHaveProperty('network')
    expect(sent.devices[0]).not.toHaveProperty('name')
  })
})
