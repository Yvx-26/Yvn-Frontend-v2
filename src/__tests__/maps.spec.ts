import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import CableMap from '../views/fault-map/fault-distribution/components/CableMap.vue'
import LayerMap from '../views/fault-map/map-layers/components/LayerMap.vue'
import TopologyCanvas from '../views/fault-map/line-topology/components/TopologyCanvas.vue'
import { loadAmap } from '../integrations/amap/loader'
import { markerContent } from '../integrations/amap/markers'
import type { AMapNamespace } from '../integrations/amap/types'
import { toCableLines } from '../domain/map/lines'
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
  constructor() {
    maps.push(this)
  }
  add() {}
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
                statusVisibility: { normal: true, warning: true, fault: true },
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

  it('gives every node a valid vertical position with more than three lines', () => {
    const lines = Array.from({ length: 5 }, (_, index) => ({
      id: `L${index}`,
      name: 'line',
      color: '#00d8ff',
      length: '1000 m',
      status: 'normal' as const,
      statusLabel: '正常',
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
      props: { lines, focusMode: 'all', selectedDeviceId: '' },
    })
    const nodes = wrapper.findAll('.topology-device-node')
    expect(nodes).toHaveLength(5)
    nodes.forEach((node) => expect(node.attributes('style')).toMatch(/top: [\d.]+%/))
  })
})
