import { describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { createMemoryHistory } from 'vue-router'
import App from '../App.vue'
import { navigationItems } from '../config/navigation'
import { createAppRouter } from '../router'
import { useInfrastructureStore } from '../stores/infrastructure'

async function mountAt(path = '/overview/comprehensive') {
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
          lines: [{
            id: 'LINE-A',
            name: '海缆 A 段',
            type: 'submarine',
            lengthKm: '18.6',
            description: '',
            state: 'enabled',
            updatedAt: '2026-09-22 15:40:00',
            devices: [{ ...device, sequence: 1 }],
          }],
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

  it('renders the comprehensive overview with real latest-frame statistics', async () => {
    const { wrapper } = await mountAt('/overview/comprehensive')

    expect(wrapper.text()).toContain('线路运行态势')
    expect(wrapper.text()).toContain('最新波形帧')
    expect(wrapper.text()).toContain('完整度 100%')
    expect(
      wrapper.findAll('[data-testid="frame-statistics"] .overview-measurement-item'),
    ).toHaveLength(5)
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
    expect(wrapper.text()).toContain('海缆 A 段拓扑')
    expect(wrapper.findAll('.line-situation-list button')).toHaveLength(1)
    expect(wrapper.find('.line-situation-detail-title').text()).toContain('海缆 A 段')
    expect(wrapper.findAll('.line-situation-node')).toHaveLength(1)
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
