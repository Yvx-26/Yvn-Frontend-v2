import { afterEach, describe, expect, it, vi } from 'vitest'
import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { createMemoryHistory } from 'vue-router'
import App from '../App.vue'
import { navigationItems } from '../config/navigation'
import { createAppRouter } from '../router'
import { useInfrastructureStore } from '../stores/infrastructure'
import { overviewRuntimeCache } from '../views/overview/comprehensive/overview-cache'
enableAutoUnmount(afterEach)
afterEach(() => {
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

async function mountAt(path = '/overview/comprehensive', emptyWave = false) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)
      let payload: unknown = {}
      if (url.includes('/api/dashboard/summary')) {
        payload = { device_total: 1, wave_today: 12, location_today: 1, alarm_count: 0 }
      } else if (url.endsWith('/api/infrastructure')) {
        const device = {
          id: 'ZT-04',
          name: '监测终端 ZT-04',
          category: 'monitor',
          lineId: 'LINE-A',
          position: '下游参考点',
          coordinate: [113.57, 34.83],
          linkedLocatorId: '',
          state: 'online',
          enabled: true,
          lastSeen: '2026-09-22 15:40:00',
          latencyMs: null,
          signalDbm: null,
          firmwareVersion: '',
          updatedAt: '2026-09-22 15:40:00',
          network: {
            accessMode: 'cellular',
            protocol: 'MQTT',
            ipAddress: '',
            serverPort: '1883',
            uploadTopic: 'device/ac07e57d/up',
            heartbeatSeconds: '30',
            retrySeconds: '5',
            timeoutSeconds: '10',
            offlineThresholdSeconds: '90',
          },
          acquisition: {
            batchSize: 10,
            uploadMode: 'sequential',
            batchTimeoutSeconds: '30',
            missingDataPolicy: 'mark-and-upload',
            sampleRate: '',
            triggerThreshold: '',
            offlineCacheBatches: '',
            backfillEnabled: false,
          },
        }
        payload = {
          devices: [device],
          lines: [
            {
              id: 'LINE-A',
              name: '海缆 A 段',
              type: 'submarine',
              lengthM: '18.6',
              description: '',
              state: 'enabled',
              updatedAt: '2026-09-22 15:40:00',
              devices: [{ ...device, sequence: 1 }],
            },
          ],
        }
      } else if (url.includes('/api/dashboard/devices')) {
        payload = [
          {
            imei: 'ZT-04',
            cable_key: 'LINE-A',
            cable_name: '海缆 A 段',
            last_wave_time: '2026-09-22 15:40:00',
            online: true,
            age_seconds: 2,
          },
        ]
      } else if (url.includes('/api/dashboard/map')) {
        payload = [
          {
            imei: 'ZT-04',
            lng: 113.57,
            lat: 34.83,
            ts: null,
            updated_at: '2026-09-22 15:40:00',
            cable_key: 'LINE-A',
            cable_name: '海缆 A 段',
            online: true,
            age_seconds: 2,
          },
        ]
      } else if (url.includes('/api/dashboard/wave/latest')) {
        payload = {
          frame_id: 1286,
          imei: 'ZT-04',
          cable: 'A-B',
          phase_pair: 'A-B',
          phase_pair_code: 0,
          fault_type: 'NORMAL',
          fault_distance_m: null,
          interphase_results: {
            'A-B': { type: 'NORMAL', code: 0, distance_m: null, distance_raw: 0 },
          },
          frame_valid: true,
          created_at: '2026-09-22 15:40:00',
          points: 4096,
          waveform_points: 4000,
          samples: [],
          waveform_samples: Array.from({ length: 4000 }, (_, index) => index % 128),
        }
        if (emptyWave)
          payload = {
            frame_id: null,
            waveform_samples: [],
            samples: [],
            points: 0,
            waveform_points: 0,
          }
      } else if (url.includes('/api/dashboard/operation')) {
        payload = {
          wave_today: 12,
          average_interval_seconds: 8.4,
          online_devices: 1,
          device_total: 1,
          online_rate: 100,
          receive_trend: Array.from({ length: 12 }, (_, index) => ({
            label: `${String(index * 2).padStart(2, '0')}:00`,
            value: index + 1,
          })),
          line_volumes: [{ id: 'LINE-A', name: '海缆 A 段', value: 12 }],
          records: [{ id: '1286', imei: 'ZT-04', phase: 'A-B', created_at: '2026-09-22 15:40:00' }],
        }
      }
      return { ok: true, status: 200, json: async () => payload } as Response
    }),
  )
  const router = createAppRouter(createMemoryHistory())
  await router.push(path)
  await router.isReady()

  const pinia = createPinia()
  await useInfrastructureStore(pinia).initialize()
  const wrapper = mount(App, {
    global: {
      plugins: [pinia, router],
    },
  })
  await flushPromises()

  return { router, wrapper }
}

describe('App', () => {
  it.each([
    ['/overview/comprehensive', '.overview-dashboard'],
    ['/monitoring/lines', '.line-monitor-page'],
  ])(
    'keeps %s visible without banners while detecting and recovering from disconnection',
    async (path, pageSelector) => {
      vi.useFakeTimers()
      const { wrapper } = await mountAt(path)
      const fetchMock = vi.mocked(fetch)
      const healthyFetch = fetchMock.getMockImplementation()!
      const contentBeforeFailure = wrapper.get('.workspace').element.children.length
      expect(wrapper.get('.connection-state').text()).toBe('平台连接正常')
      fetchMock.mockResolvedValue({
        ok: false,
        status: 502,
        json: async () => ({ detail: '请求失败（502）' }),
      } as Response)

      await vi.advanceTimersByTimeAsync(10000)
      await flushPromises()
      expect(wrapper.get('.connection-state').text()).toBe('平台连接异常')
      expect(wrapper.find(pageSelector).exists()).toBe(true)
      expect(wrapper.get('.workspace').element.children.length).toBe(contentBeforeFailure)
      expect(wrapper.find('.data-notice').exists()).toBe(false)
      expect(wrapper.text()).not.toContain('部分数据可能不是最新')

      const attemptsAfterFailure = fetchMock.mock.calls.length
      await vi.advanceTimersByTimeAsync(10000)
      await flushPromises()
      expect(fetchMock.mock.calls.length).toBeGreaterThan(attemptsAfterFailure)

      fetchMock.mockImplementation(healthyFetch)
      await vi.advanceTimersByTimeAsync(10000)
      await flushPromises()
      expect(wrapper.get('.connection-state').text()).toBe('平台连接正常')
      expect(wrapper.find(pageSelector).exists()).toBe(true)
      expect(wrapper.get('.workspace').element.children.length).toBe(contentBeforeFailure)
    },
  )

  it.each([
    ['/overview/comprehensive', 'overview-primary-region'],
    ['/overview/operation', 'overview-primary-region'],
    ['/overview/lines', 'overview-center-region'],
    ['/overview/devices', 'overview-primary-region'],
  ])('uses the shared overview grid for %s', async (path, mainClass) => {
    const { wrapper } = await mountAt(path)
    const page = wrapper.get('.overview-page-layout')
    expect(page.findAll('.overview-metric-grid > article')).toHaveLength(4)
    const content = page.get('.overview-content-grid')
    expect(content.find(`.${mainClass}`).exists()).toBe(true)
    expect(content.get('.overview-secondary-region').classes()).toContain('overview-aligned-column')
    expect(content.find('.overview-list-region').exists()).toBe(path === '/overview/lines')
  })

  it('clears the overview return cache if the backend no longer has a frame', async () => {
    const first = await mountAt()
    expect(overviewRuntimeCache.latestBatch?.samples).toHaveLength(4000)
    first.wrapper.unmount()
    const { wrapper } = await mountAt('/overview/comprehensive', true)
    expect(overviewRuntimeCache.latestBatch).toBeUndefined()
    expect(wrapper.find('.overview-wave-trace').exists()).toBe(false)
    expect(wrapper.get('.overview-wave-empty').text()).toContain('等待最新波形数据')
  })

  it('redirects the root route to the comprehensive overview', async () => {
    const { router, wrapper } = await mountAt('/')

    expect(router.currentRoute.value.path).toBe('/overview/comprehensive')
    expect(wrapper.text()).toContain('线缆行波智能解析及实时故障地图定位云平台')
    expect(wrapper.text()).toContain('综合总览')
  })

  it('uses routes for sidebar menu selection', async () => {
    const { router, wrapper } = await mountAt()

    await wrapper.get('.collapse-button').trigger('click')
    expect(wrapper.get('.sidebar').classes()).toContain('expanded')

    const pushSpy = vi.spyOn(router, 'push')
    const lineMenu = wrapper.get('.side-menu-item[aria-label="线路态势"]')
    await lineMenu.trigger('click')
    await pushSpy.mock.results[0]!.value
    await flushPromises()

    expect(pushSpy).toHaveBeenCalledWith('/overview/lines')
    expect(router.currentRoute.value.path).toBe('/overview/lines')
    expect(wrapper.get('.workspace-header h2').text()).toBe('线路态势')
  })

  it('switches route groups and restores the last visited child route', async () => {
    const { router, wrapper } = await mountAt()
    const pushSpy = vi.spyOn(router, 'push')
    const topMenu = (label: string) => wrapper.get(`.top-nav-item[aria-label="${label}"]`)
    const waitForNavigation = async () => {
      await pushSpy.mock.results[pushSpy.mock.results.length - 1]!.value
      await flushPromises()
    }

    await topMenu('智能解析').trigger('click')
    await waitForNavigation()
    expect(router.currentRoute.value.path).toBe('/analysis/waves')

    const diagnosisMenu = wrapper.get('.side-menu-item[aria-label="故障研判"]')
    await diagnosisMenu.trigger('click')
    await waitForNavigation()
    expect(router.currentRoute.value.path).toBe('/analysis/diagnosis')

    await topMenu('首页总览').trigger('click')
    await waitForNavigation()
    await topMenu('智能解析').trigger('click')
    await waitForNavigation()
    expect(router.currentRoute.value.path).toBe('/analysis/diagnosis')
  })

  it('provides a unique icon and route for every sidebar function', async () => {
    const { wrapper } = await mountAt()
    const symbolIds = new Set(wrapper.findAll('symbol').map((symbol) => symbol.attributes('id')))
    const children = navigationItems.flatMap((item) => item.children)
    const configuredIcons = children.map((child) => `icon-${child.icon}`)
    const configuredPaths = children.map((child) => child.path)

    expect(new Set(configuredIcons).size).toBe(configuredIcons.length)
    expect(new Set(configuredPaths).size).toBe(configuredPaths.length)
    expect(configuredIcons.filter((icon) => !symbolIds.has(icon))).toEqual([])
  })

  it('renders the comprehensive overview with the real latest-frame waveform', async () => {
    const { wrapper } = await mountAt('/overview/comprehensive')

    expect(wrapper.text()).toContain('线路运行态势')
    expect(wrapper.get('.overview-batch-panel').attributes('aria-label')).toBe('最新波形曲线')
    expect(wrapper.get('.overview-wave-header strong').text()).toBe('最新波形曲线')
    expect(wrapper.get('.overview-wave-header a').attributes('href')).toBe(
      '/monitoring/waves?device=ZT-04',
    )
    const waveformPath =
      wrapper.get('[data-testid="latest-waveform"] .overview-wave-trace').attributes('d') ?? ''
    expect(waveformPath).toBeTruthy()
    expect(waveformPath.match(/[ML]/g)?.length).toBe(4000)
    expect(wrapper.get('.overview-wave-trace-glow').attributes('d')).toBe(waveformPath)
    expect(wrapper.findAll('.overview-wave-latest-dot')).toHaveLength(1)
  })

  it('renders the device situation and switches the selected device details', async () => {
    const { wrapper } = await mountAt('/overview/devices')

    expect(wrapper.text()).toContain('设备运行列表')
    expect(wrapper.text()).toContain('最新帧可用率')
    expect(wrapper.findAll('.device-situation-table tbody tr')).toHaveLength(1)
    expect(wrapper.find('.device-situation-detail-title').text()).toContain('ZT-04')
    expect(wrapper.findAll('[data-testid="device-frame-statistics"] article')).toHaveLength(5)
  })

  it('renders the line situation and switches topology details by line', async () => {
    const { wrapper } = await mountAt('/overview/lines')

    expect(wrapper.text()).toContain('线路列表')
    expect(wrapper.text()).toContain('监测节点状态')
    expect(wrapper.text()).not.toContain('拓扑示意')
    expect(wrapper.findAll('.line-situation-list button')).toHaveLength(1)
    expect(wrapper.find('.line-situation-detail-title').text()).toContain('海缆 A 段')
    expect(wrapper.findAll('.line-situation-node-table tbody tr')).toHaveLength(1)
  })

  it('renders the operation situation with trend and runtime records', async () => {
    const { wrapper } = await mountAt('/overview/operation')

    expect(wrapper.text()).toContain('24 小时数据接收趋势')
    expect(wrapper.text()).toContain('设备在线率趋势')
    expect(wrapper.text()).toContain('各线路数据量')
    expect(wrapper.text()).toContain('当前运行概况')
    expect(wrapper.findAll('.operation-situation-bars article')).toHaveLength(12)
    expect(wrapper.findAll('.operation-situation-record-list article')).toHaveLength(1)
  })
})
