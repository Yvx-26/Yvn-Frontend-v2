import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import { useInfrastructureStore } from '../stores/infrastructure'
import {
  fetchLatestWaveform,
  fetchDashboardDevices,
  fetchDashboardMap,
  fetchHistoryWaveform,
  fetchWaveHistory,
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
  fetchHistoryWaveform: vi.fn<typeof fetchHistoryWaveform>(),
  fetchWaveHistory: vi.fn<typeof fetchWaveHistory>(),
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
  vi.mocked(fetchWaveHistory).mockResolvedValue({ data: [], next_before_id: null })
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
  it('keeps the history list open and highlights the loaded frame', async () => {
    const historical = {
      frame_id: 18,
      imei: 'M1',
      phase_pair: 'A-B',
      frame_valid: true,
      fault_type: 'NORMAL',
      samples: [],
      waveform_samples: Array(4000).fill(20) as number[],
      points: 4096,
      waveform_points: 4000,
    }
    vi.mocked(fetchLatestWaveform).mockResolvedValue({ ...historical, frame_id: 19 })
    vi.mocked(fetchWaveHistory).mockResolvedValue({
      data: [
        {
          ID: 18,
          IMEI: 'M1',
          CABLE: 'A-B',
          PAYLOAD_LEN: 8192,
          CREATED_AT: null,
          frame_valid: true,
          frame_error: null,
          fault_type: 'NORMAL',
          fault_distance_m: null,
        },
      ],
      next_before_id: null,
    })
    vi.mocked(fetchHistoryWaveform).mockResolvedValue(historical)
    const { wrapper } = await setupPage(WaveMonitor, true)
    const phaseCard = wrapper.findAll('.wave-monitor-frame-stats button')[0]!
    await phaseCard.trigger('click')
    await flushPromises()
    await wrapper.get('.wave-history-list button').trigger('click')
    await flushPromises()
    expect(fetchHistoryWaveform).toHaveBeenCalledWith('M1', 18, expect.any(AbortSignal))
    expect(wrapper.text()).toContain('返回实时')
    expect(wrapper.get('.wave-history-list button.is-current').text()).toContain('#FRAME-18')
    expect(wrapper.get('.wave-monitor-zoom-range').text()).toContain('采样点 0–3999')
    await phaseCard.trigger('click')
    expect(wrapper.find('.wave-history-list').exists()).toBe(false)
    await phaseCard.trigger('click')
    expect(wrapper.get('.wave-history-list button.is-current').text()).toContain('#FRAME-18')
    await wrapper.get('[aria-label="放大纵轴"]').trigger('click')
    expect(wrapper.get('[aria-label="纵轴缩放"]').text()).toContain('纵轴 1.25×')
    expect(wrapper.get('.wave-monitor-zoom-range').text()).toContain('采样点 0–3999')

    await wrapper.get('[aria-label="放大横轴"]').trigger('click')
    const zoomedRange = wrapper.get('.wave-monitor-zoom-range').text()
    let resolveNextPhase!: (frame: typeof historical) => void
    vi.mocked(fetchLatestWaveform).mockReturnValueOnce(
      new Promise((resolve) => {
        resolveNextPhase = resolve
      }),
    )
    await wrapper.findAll('.wave-monitor-frame-stats button')[1]!.trigger('click')
    expect(wrapper.get('.wave-monitor-empty-chart').text()).toContain('正在读取当前相间波形')
    expect(wrapper.get('[aria-label="横轴缩放"]').text()).toContain('横轴 1.25×')

    resolveNextPhase({ ...historical, frame_id: 20, phase_pair: 'A-C' })
    await flushPromises()
    expect(wrapper.find('.wave-monitor-empty-chart').exists()).toBe(false)
    expect(wrapper.get('.wave-monitor-zoom-range').text()).toBe(zoomedRange)
    expect(wrapper.get('[aria-label="纵轴缩放"]').text()).toContain('纵轴 1.25×')
  })

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
