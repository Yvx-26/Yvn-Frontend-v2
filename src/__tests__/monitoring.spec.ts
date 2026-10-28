import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import { useInfrastructureStore } from '../stores/infrastructure'
import {
  fetchLatestWaveform,
  fetchDashboardDevices,
  fetchDashboardMap,
} from '../services/telemetry-api'
import WaveMonitor from '../views/monitoring/WaveMonitor.vue'
import DeviceMonitor from '../views/monitoring/DeviceMonitor.vue'
import LineMonitor from '../views/monitoring/LineMonitor.vue'
import DeviceConfig from '../views/settings/DeviceConfig.vue'
import LineManagement from '../views/settings/LineManagement.vue'
import { device, line } from './fixtures/infrastructure'

vi.mock('../services/telemetry-api', () => ({
  fetchLatestWaveform: vi.fn<typeof fetchLatestWaveform>(),
  fetchDashboardDevices: vi.fn<typeof fetchDashboardDevices>(),
  fetchDashboardMap: vi.fn<typeof fetchDashboardMap>(),
}))
enableAutoUnmount(afterEach)
afterEach(() => {
  vi.unstubAllGlobals()
  vi.useRealTimers()
})
beforeEach(() => {
  vi.resetAllMocks()
  vi.mocked(fetchDashboardDevices).mockResolvedValue([])
  vi.mocked(fetchDashboardMap).mockResolvedValue([])
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      disconnect() {}
    },
  )
  vi.mocked(fetchLatestWaveform).mockResolvedValue({
    frame_id: 1,
    imei: 'M1',
    phase_pair: 'A-B',
    frame_valid: true,
    fault_type: 'NORMAL',
    samples: [],
    waveform_samples: [0, 1, 2, 3],
    points: 4096,
    waveform_points: 4,
  })
})

async function setupPage(
  component:
    | typeof WaveMonitor
    | typeof DeviceMonitor
    | typeof LineMonitor
    | typeof DeviceConfig
    | typeof LineManagement,
  seed = false,
) {
  const pinia = createPinia()
  const store = useInfrastructureStore(pinia)
  if (seed) {
    store.devices = [device(), device('D1', 'locator'), device('D2', 'locator')]
    store.lines = [
      line(
        'L1',
        store.devices.filter((item) => item.category === 'locator'),
      ),
    ]
  }
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/', component: { template: '<div />' } }],
  })
  await router.push('/')
  await router.isReady()
  const wrapper = mount(component, {
    global: {
      plugins: [pinia, router],
      stubs: { LineMonitorMap: true, DeviceLocationMap: true, LineRouteMap: true },
    },
  })
  await flushPromises()
  return { wrapper, store }
}

describe('empty infrastructure and monitored frames', () => {
  it('accepts recent GPS activity for an integrated device connection check', async () => {
    const { wrapper } = await setupPage(DeviceConfig, true)
    await wrapper.findAll('select')[0]!.setValue('integrated')
    vi.mocked(fetchDashboardMap).mockResolvedValue([
      {
        imei: 'M1',
        lng: 113.5,
        lat: 34.8,
        online: true,
        age_seconds: 2,
        updated_at: '2026-10-24 12:00:00',
        ts: null,
        cable_key: 'L1',
        cable_name: 'L1',
      },
    ])
    await wrapper
      .findAll('button')
      .find((button) => button.text() === '连接测试')!
      .trigger('click')
    await flushPromises()
    expect(wrapper.text()).toContain('连接正常')
    await wrapper.findAll('input')[1]!.setValue('different-id')
    await flushPromises()
    expect(wrapper.text()).not.toContain('连接正常')
  })

  it('shows a successful read time, not a continuously advancing clock', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-10-24T12:00:00'))
    const { wrapper } = await setupPage(LineMonitor, true)
    const summary = wrapper.get('.line-monitor-summary')
    expect(summary.text()).toContain('12:00:00')
    await vi.advanceTimersByTimeAsync(2000)
    expect(summary.text()).toContain('12:00:00')
    expect(summary.text()).not.toContain('12:00:02')
  })

  it.each([
    ['行波监测', WaveMonitor],
    ['设备监测', DeviceMonitor],
    ['线路监测', LineMonitor],
    ['设备配置', DeviceConfig],
    ['线路管理', LineManagement],
  ] as const)('%s renders a usable empty state', async (_name, component) => {
    const { wrapper } = await setupPage(component)
    expect(wrapper.find('.module-state').exists()).toBe(true)
    expect(fetchLatestWaveform).not.toHaveBeenCalled()
  })

  it('gets a line waveform from the monitor inventory rather than positioning nodes', async () => {
    const { wrapper } = await setupPage(LineMonitor, true)
    expect(fetchLatestWaveform).toHaveBeenCalledWith('M1', null, expect.any(AbortSignal))
    expect(wrapper.find('.line-monitor-batch-panel').text()).toContain('#FRAME-1')
  })

  it('does not draw a protocol-invalid frame even if it contains 4000 samples', async () => {
    vi.mocked(fetchLatestWaveform).mockResolvedValue({
      frame_id: 3,
      imei: 'M1',
      frame_valid: false,
      frame_error: '帧尾不正确',
      samples: [],
      waveform_samples: Array(4000).fill(0),
      points: 4096,
      waveform_points: 4000,
    })
    const { wrapper } = await setupPage(WaveMonitor, true)
    expect(wrapper.get('.wave-monitor-trace').attributes('d')).toBe('')
    expect(wrapper.get('.wave-monitor-empty-chart').text()).toContain('帧尾不正确')
    expect(wrapper.text()).toContain('波形帧校验失败')
  })

  it('clears the previous waveform when the selected phase has no data', async () => {
    const { wrapper } = await setupPage(WaveMonitor, true)
    expect(wrapper.get('.wave-monitor-trace').attributes('d')).toBeTruthy()
    vi.mocked(fetchLatestWaveform).mockResolvedValue({
      frame_id: null,
      imei: 'M1',
      phase_pair: 'C-N',
      samples: [],
      waveform_samples: [],
      points: 0,
      waveform_points: 0,
    })
    await wrapper.findAll('.wave-monitor-frame-stats > button')[7]!.trigger('click')
    await flushPromises()
    expect(wrapper.get('.wave-monitor-current-phase').text()).toContain('C-N')
    expect(wrapper.get('.wave-monitor-trace').attributes('d')).toBe('')
    expect(wrapper.get('.wave-monitor-empty-chart').text()).toContain('暂无可用波形帧')
  })

  it('allows creating a line draft before positioning devices exist', async () => {
    const { wrapper } = await setupPage(LineManagement)
    await wrapper.get('.module-state button').trigger('click')
    expect(wrapper.get('.line-management-form input').element).toHaveProperty('value', 'LINE-01')
    expect(
      wrapper.find('.line-management-actionbar .is-primary').attributes('disabled'),
    ).toBeUndefined()
  })
})
