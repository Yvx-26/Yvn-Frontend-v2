import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import CableMap from '../views/fault-map/fault-distribution/components/CableMap.vue'
import LayerMap from '../views/fault-map/map-layers/components/LayerMap.vue'
import TopologyCanvas from '../views/fault-map/line-topology/components/TopologyCanvas.vue'
import { loadAmap } from '../integrations/amap/loader'
import { createCableLabelLayer } from '../integrations/amap/cable-lines'
import { markerContent } from '../integrations/amap/markers'
import type { AMapMapInstance, AMapNamespace, Coordinate } from '../integrations/amap/types'
import { cableLineStyles, resolveCableLineState, toCableLines } from '../domain/map/lines'
import { device, line } from './fixtures/infrastructure'

vi.mock('../integrations/amap/loader', () => ({ loadAmap: vi.fn<typeof loadAmap>() }))
enableAutoUnmount(afterEach)
const overlays: FakeOverlay[] = []
const maps: FakeMap[] = []
class FakeOverlay {
  constructor(public options: Record<string, unknown>) {
    overlays.push(this)
  }
  on() {}
  setOptions(options: Record<string, unknown>) {
    Object.assign(this.options, options)
  }
  hide() {}
  show() {}
}
class FakeMap {
  handlers = new Map<string, () => void>()
  constructor() {
    maps.push(this)
  }
  add() {}
  on(event: string, handler: () => void) {
    this.handlers.set(event, handler)
  }
  off(event: string) {
    this.handlers.delete(event)
  }
  lngLatToContainer([x, y]: Coordinate) {
    return { x, y }
  }
  remove = vi.fn<(overlays: unknown) => void>()
  destroy = vi.fn<() => void>()
  setFitView() {}
  setMapStyle() {}
  setFeatures() {}
  zoomIn() {}
  zoomOut() {}
}
const sdk = {
  Map: FakeMap,
  Polyline: FakeOverlay,
  Marker: FakeOverlay,
  Circle: FakeOverlay,
  Pixel: class {},
  TileLayer: { Satellite: FakeOverlay, RoadNet: FakeOverlay },
} as unknown as AMapNamespace

beforeEach(() => {
  overlays.length = 0
  maps.length = 0
  vi.mocked(loadAmap).mockReset().mockResolvedValue(sdk)
})
const initial = () => toCableLines([line('L1', [device('D1', 'locator')])])

describe('map data and lifecycle', () => {
  it('treats marker labels as text instead of HTML', () => {
    const element = markerContent('marker', '<img src=x>', '<script>alert(1)</script>')
    expect(element.querySelector('img,script')).toBeNull()
    expect(element.textContent).toContain('<img src=x>')
  })

  it('places vertical and horizontal route labels off the line, without covering each other', async () => {
    const container = document.createElement('div')
    Object.defineProperties(container, {
      clientWidth: { value: 350 },
      clientHeight: { value: 240 },
    })
    const map = new FakeMap()
    const layer = createCableLabelLayer(map as unknown as AMapMapInstance, container)
    try {
      layer.setRoutes([
        {
          name: '竖向线路',
          statusLabel: '预警',
          path: [
            [110, 40],
            [110, 200],
          ],
        },
        {
          name: '横向线路',
          statusLabel: '正常',
          path: [
            [140, 110],
            [320, 110],
          ],
        },
      ])
      const [vertical, horizontal] = container.querySelectorAll<HTMLElement>('.cable-map-label')
      for (const label of [vertical!, horizontal!]) {
        Object.defineProperties(label, { offsetWidth: { value: 96 }, offsetHeight: { value: 22 } })
      }
      await new Promise<number>((resolve) => requestAnimationFrame(resolve))
      expect(vertical!.style.visibility).toBe('visible')
      expect(horizontal!.style.visibility).toBe('visible')
      // The first right-hand candidate crosses the horizontal cable, so the layout must try another spot.
      expect(vertical!.style.transform).not.toBe('translate(126px, 109px)')
      expect(horizontal!.style.transform).toMatch(/translate\([\d.]+px, (72|126)px\)/)
    } finally {
      layer.destroy()
    }
    expect(map.handlers.size).toBe(0)
  })

  it.each(['distribution', 'layers'] as const)(
    '%s replaces outdated map overlays when coordinates change',
    async (kind) => {
      const lines = initial()
      const wrapper =
        kind === 'distribution'
          ? mount(CableMap, { props: { lines, selectedLineId: 'L1' } })
          : mount(LayerMap, {
              props: {
                lines,
                baseMap: 'dark',
                overlayOpacity: 80,
                layerVisibility: {
                  lines: true,
                  devices: true,
                  faults: true,
                  warningAreas: true,
                  boundary: true,
                  labels: true,
                },
                statusVisibility: { normal: true, warning: true, draft: true, fault: true },
              },
            })
      await flushPromises()
      const next = initial()
      next[0]!.devices[0]!.coordinate = [114, 35]
      await wrapper.setProps({ lines: next })
      await flushPromises()
      const markers = overlays.filter((item) => item.options.position)
      expect(markers[markers.length - 1]!.options.position).toEqual([114, 35])
      expect(maps).toHaveLength(1)
      expect(maps[0]!.remove).toHaveBeenCalled()
    },
  )

  it('does not create a map if the SDK resolves after unmount', async () => {
    let resolve!: (sdk: AMapNamespace) => void
    vi.mocked(loadAmap).mockReturnValue(
      new Promise<AMapNamespace>((done) => {
        resolve = done
      }),
    )
    const wrapper = mount(CableMap, { props: { lines: initial(), selectedLineId: 'L1' } })
    wrapper.unmount()
    resolve(sdk)
    await flushPromises()
    expect(maps).toHaveLength(0)
  })

  it('uses enabled monitors and integrated terminals to determine line status, excluding locators', () => {
    const locator = { ...device('D1', 'locator'), state: 'offline' as const, lastSeen: '2 分钟前' }
    const monitor = { ...device('M1'), state: 'offline' as const, lastSeen: '暂无上报' }
    const managed = line('L1', [locator])
    expect(resolveCableLineState(managed, [monitor]).status).toBe('draft')
    expect(resolveCableLineState(managed, [{ ...monitor, lastSeen: '2 分钟前' }])).toMatchObject({
      status: 'warning',
      statusDetail: 'M1 离线',
    })
    expect(resolveCableLineState(managed, [{ ...monitor, enabled: false }])).toMatchObject({
      status: 'draft',
      statusDetail: '没有已启用的监测设备',
    })
    expect(resolveCableLineState(managed, [{ ...monitor, state: 'online' }]).status).toBe('normal')
    const integrated = { ...device('I1', 'integrated'), state: 'online' as const }
    expect(resolveCableLineState(line('L1', [locator, integrated]), []).status).toBe('normal')
  })

  it('keeps the line status color when selected and reapplies the outline when the map refreshes', async () => {
    const first = { ...device('D1', 'locator'), state: 'online' as const }
    const second = {
      ...device('D2', 'locator'),
      state: 'online' as const,
      coordinate: [114, 35] as [number, number],
    }
    const managed = line('L1', [first, second])
    const monitor = { ...device('M1'), state: 'online' as const }
    const lines = toCableLines([managed], [monitor])
    const wrapper = mount(CableMap, { props: { lines, selectedLineId: '' } })
    await flushPromises()
    const polyline = overlays.find((item) => item.options.path)!
    await wrapper.setProps({ selectedLineId: 'L1' })
    expect(polyline.options).toMatchObject({
      strokeColor: cableLineStyles.normal.color,
      strokeWeight: 7,
      isOutline: true,
    })

    const next = toCableLines([managed], [{ ...monitor, state: 'offline', lastSeen: '2 分钟前' }])
    await wrapper.setProps({ lines: next })
    const routes = overlays.filter((item) => item.options.path)
    const refreshed = routes[routes.length - 1]!
    expect(refreshed.options).toMatchObject({
      strokeColor: cableLineStyles.warning.color,
      isOutline: true,
    })
    expect(wrapper.get('.cable-map-label').text()).toBe('L1 · 通信预警')
    const node = overlays
      .map((item) => item.options.content)
      .find((item): item is HTMLButtonElement => item instanceof HTMLButtonElement)!
    expect(node).toBeInstanceOf(HTMLButtonElement)
    expect(node.textContent).toBe('01')
    expect(node.getAttribute('aria-label')).toContain('D1')
    node.click()
    expect(wrapper.emitted('select-item')?.[0]?.[0]).toMatchObject({
      kind: 'device',
      device: { id: 'D1' },
    })

    await wrapper.setProps({
      lines: toCableLines([{ ...managed, state: 'draft' }], [monitor]),
    })
    const pendingRoutes = overlays.filter((item) => item.options.path)
    expect(pendingRoutes[pendingRoutes.length - 1]!.options).toMatchObject({
      strokeColor: cableLineStyles.draft.color,
      strokeStyle: 'dashed',
      isOutline: true,
    })
  })

  it('gives every node a valid vertical position with more than three lines', () => {
    const lines = Array.from({ length: 5 }, (_, index) => ({
      id: `L${index}`,
      name: 'line',
      length: '1000 m',
      status: 'normal' as const,
      statusLabel: '正常',
      statusDetail: '',
      devices: [
        {
          id: `D${index}`,
          name: 'node',
          sequence: 1,
          position: 'test',
          status: 'online' as const,
          statusLabel: '在线',
          latency: '--',
          lastUpload: '--',
          linkedDeviceIds: [],
        },
      ],
    }))
    const wrapper = mount(TopologyCanvas, {
      props: { lines, focusMode: 'all', selectedDeviceId: '', selectedLineId: '' },
    })
    const nodes = wrapper.findAll('.topology-device-node')
    expect(nodes).toHaveLength(5)
    nodes.forEach((node) => expect(node.attributes('style')).toMatch(/top: [\d.]+%/))
  })
})
