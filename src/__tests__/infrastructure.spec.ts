import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useInfrastructureStore } from '../stores/infrastructure'
import { fetchInfrastructure, putDevice, putLine } from '../services/infrastructure-api'
import { device, line } from './fixtures/infrastructure'

vi.mock('../services/infrastructure-api', () => ({
  fetchInfrastructure: vi.fn<typeof fetchInfrastructure>(),
  putDevice: vi.fn<typeof putDevice>(),
  putLine: vi.fn<typeof putLine>(),
}))

beforeEach(() => {
  vi.resetAllMocks()
  setActivePinia(createPinia())
  vi.mocked(fetchInfrastructure).mockResolvedValue({ devices: [], lines: [] })
  vi.mocked(putDevice).mockImplementation(async (item) => item)
  vi.mocked(putLine).mockImplementation(async (item) => item)
})

describe('infrastructure lifecycle and API payloads', () => {
  it('retries failed initialization and accepts a valid empty snapshot', async () => {
    const store = useInfrastructureStore()
    vi.mocked(fetchInfrastructure).mockRejectedValueOnce(new Error('offline'))
    await expect(store.initialize()).rejects.toThrow('offline')
    expect(store.initialized).toBe(false)
    await store.initialize()
    expect(fetchInfrastructure).toHaveBeenCalledTimes(2)
    expect(store.initialized).toBe(true)
    expect(store.errorMessage).toBe('')
  })

  it('strips bound-node fields and normalizes numeric form strings before a device PUT', async () => {
    const store = useInfrastructureStore()
    const bound = { ...device('D1', 'locator'), sequence: 9 }
    await store.saveDevice(bound)
    const payload = vi.mocked(putDevice).mock.calls[0]![0]
    expect(payload).not.toHaveProperty('sequence')
    expect(payload.network.heartbeatSeconds).toBe('30')
  })

  it('keeps a saved device in the new line when inventory reload temporarily fails', async () => {
    const store = useInfrastructureStore()
    const locator = device('D1', 'locator')
    store.devices = [locator]
    store.lines = [line('L1', [locator]), line('L2')]
    vi.mocked(fetchInfrastructure).mockRejectedValue(new Error('refresh failed'))
    await store.saveDevice({ ...locator, lineId: 'L2' }, 'D1')
    expect(store.lines[0]!.devices).toHaveLength(0)
    expect(store.lines[1]!.devices.map((item) => item.id)).toEqual(['D1'])
    expect(store.devices[0]!.lineId).toBe('L2')
  })

  it('prevents duplicate line IDs before issuing a write', async () => {
    const store = useInfrastructureStore()
    store.lines = [line('LINE-03')]
    await expect(store.saveLine(line('LINE-03'))).rejects.toThrow('编号已存在')
    expect(putLine).not.toHaveBeenCalled()
  })

  it('clears cross-line locator links immediately even if post-save refresh fails', async () => {
    const store = useInfrastructureStore()
    const locator = device('D1', 'locator')
    store.devices = [locator, { ...device('M1', 'monitor'), linkedLocatorId: 'D1' }]
    store.lines = [line('L1', [locator]), line('L2')]
    vi.mocked(fetchInfrastructure).mockRejectedValue(new Error('refresh failed'))
    await store.saveDevice({ ...locator, lineId: 'L2' }, 'D1')
    expect(store.devices.find((item) => item.id === 'M1')!.linkedLocatorId).toBe('')
  })

  it('clears old-line links when moving a node through the line editor', async () => {
    const store = useInfrastructureStore()
    const locator = device('D1', 'locator')
    store.devices = [locator, { ...device('M1', 'monitor'), linkedLocatorId: 'D1' }]
    store.lines = [line('L1', [locator]), line('L2')]
    vi.mocked(fetchInfrastructure).mockRejectedValue(new Error('refresh failed'))
    await store.saveLine(line('L2', [{ ...locator, lineId: 'L2' }]), 'L2')
    expect(store.lines[0]!.devices).toHaveLength(0)
    expect(store.devices.find((item) => item.id === 'M1')!.linkedLocatorId).toBe('')
  })

  it('does not let old GPS data mark a freshly uploading integrated terminal offline', () => {
    const store = useInfrastructureStore()
    store.devices = [device('I1', 'integrated')]
    store.applyRuntimeStatus([
      {
        imei: 'I1',
        online: true,
        age_seconds: 2,
        last_wave_time: '2026-10-24 12:00:00',
        cable_key: 'L1',
        cable_name: 'L1',
      },
    ])
    store.applyLocationStatus([
      {
        imei: 'I1',
        online: false,
        age_seconds: 600,
        lng: 113.6,
        lat: 34.9,
        updated_at: '2026-10-24 11:50:00',
        cable_key: 'L1',
        cable_name: 'L1',
        ts: null,
      },
    ])
    expect(store.devices[0]!.state).toBe('online')
    expect(store.devices[0]!.coordinate).toEqual([113.6, 34.9])
  })

  it('uses the saved timeout per device, including on either side of 90 seconds', () => {
    const store = useInfrastructureStore()
    const long = device('long')
    const short = device('short')
    long.network.offlineThresholdSeconds = '300'
    short.network.offlineThresholdSeconds = '30'
    store.devices = [long, short, device('default')]
    store.applyRuntimeStatus(
      [
        { imei: 'long', age_seconds: 300, online: false },
        { imei: 'short', age_seconds: 31, online: true },
        { imei: 'default', age_seconds: 90, online: true },
      ].map((item) => ({
        ...item,
        cable_key: 'L1',
        cable_name: 'L1',
        last_wave_time: '2026-10-24 12:00:00',
      })),
    )
    expect(store.devices.map((item) => item.state)).toEqual(['online', 'offline', 'online'])
  })

  it('does not reset the age of cached GPS data when reloading inventory', async () => {
    const store = useInfrastructureStore()
    const locator = device('GPS', 'locator')
    locator.network.offlineThresholdSeconds = '30'
    store.devices = [locator]
    store.applyLocationStatus([
      {
        imei: 'GPS',
        lng: 113.6,
        lat: 34.9,
        ts: null,
        updated_at: '2026-10-24 12:00:00',
        cable_key: 'L1',
        cable_name: 'L1',
        online: true,
        age_seconds: 30,
      },
    ])
    expect(store.devices[0]!.state).toBe('online')
    const clock = vi.spyOn(Date, 'now').mockReturnValue(Date.now() + 1000)
    try {
      vi.mocked(fetchInfrastructure).mockResolvedValue({ devices: [locator], lines: [] })
      await store.initialize()
      expect(store.devices[0]!.state).toBe('offline')
    } finally {
      clock.mockRestore()
    }
  })
})
