<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { loadAmap } from '../../../../integrations/amap/loader'
import { markerContent } from '../../../../integrations/amap/markers'
import type {
  AMapMapInstance,
  AMapNamespace,
  AMapOverlay,
} from '../../../../integrations/amap/types'
import type {
  CableLine,
  CableLineStatus,
  LocatedFault,
  PositioningDevice,
} from '../../../../domain/map/types'
import type { BaseMapType, LayerVisibility, StatusVisibility } from '../types'

const props = defineProps<{
  baseMap: BaseMapType
  layerVisibility: LayerVisibility
  lines: CableLine[]
  overlayOpacity: number
  statusVisibility: StatusVisibility
}>()

const mapContainer = ref<HTMLElement>()
const isLoading = ref(true)
const loadError = ref('')
const lineOverlays = new Map<string, AMapOverlay>()
const deviceOverlays = new Map<string, AMapOverlay[]>()
const faultOverlays = new Map<string, AMapOverlay>()
const warningAreaOverlays = new Map<string, AMapOverlay>()
let boundaryOverlay: AMapOverlay | undefined
let satelliteOverlays: AMapOverlay[] = []
let map: AMapMapInstance | undefined
let AMapApi: AMapNamespace | undefined
let disposed = false

const lineColors: Record<CableLineStatus, string> = {
  normal: '#22c55e',
  warning: '#f5a623',
  fault: '#ff5268',
}

function createDeviceContent(device: PositioningDevice) {
  const marker = markerContent(`map-layer-device-marker is-${device.status}`, device.id)
  marker.setAttribute('aria-label', `${device.name}，${device.statusLabel}`)
  return marker
}

function createFaultContent(fault: LocatedFault) {
  const marker = markerContent('map-layer-fault-marker', fault.title, fault.distanceFromDevice)
  marker.setAttribute('aria-label', `故障点：${fault.title}`)
  return marker
}

function setOverlayVisible(overlay: AMapOverlay | undefined, visible: boolean) {
  if (!overlay) return
  if (visible) overlay.show()
  else overlay.hide()
}

function applyBaseMap() {
  if (!map || !AMapApi) return

  if (satelliteOverlays.length) {
    map.remove(satelliteOverlays)
    satelliteOverlays = []
  }

  if (props.baseMap === 'satellite') {
    map.setMapStyle('amap://styles/normal')
    satelliteOverlays = [new AMapApi.TileLayer.Satellite(), new AMapApi.TileLayer.RoadNet()]
    map.add(satelliteOverlays)
    return
  }

  map.setMapStyle(props.baseMap === 'dark' ? 'amap://styles/darkblue' : 'amap://styles/normal')
}

function applyLayerState() {
  if (!map) return
  const opacity = props.overlayOpacity / 100

  props.lines.forEach((line) => {
    const statusEnabled = props.statusVisibility[line.status]
    const lineOverlay = lineOverlays.get(line.id)
    const devices = deviceOverlays.get(line.id) ?? []
    const fault = faultOverlays.get(line.id)
    const warningArea = warningAreaOverlays.get(line.id)

    setOverlayVisible(lineOverlay, props.layerVisibility.lines && statusEnabled)
    lineOverlay?.setOptions({ strokeOpacity: opacity })

    devices.forEach((device) => {
      setOverlayVisible(device, props.layerVisibility.devices && statusEnabled)
      device.setOptions({ opacity })
    })

    setOverlayVisible(fault, props.layerVisibility.faults && statusEnabled)
    fault?.setOptions({ opacity })

    setOverlayVisible(
      warningArea,
      props.layerVisibility.warningAreas && statusEnabled && line.status !== 'normal',
    )
    warningArea?.setOptions({
      fillOpacity: 0.1 * opacity,
      strokeOpacity: 0.8 * opacity,
    })
  })

  setOverlayVisible(boundaryOverlay, props.layerVisibility.boundary)
  boundaryOverlay?.setOptions({ strokeOpacity: 0.7 * opacity })
  map.setFeatures(
    props.layerVisibility.labels ? ['bg', 'road', 'building', 'point'] : ['bg', 'road', 'building'],
  )
}

function createLineLayers(AMap: AMapNamespace, line: CableLine) {
  const orderedDevices = line.devices.slice().sort((left, right) => left.sequence - right.sequence)
  const lineOverlay = new AMap.Polyline({
    path: orderedDevices.map((device) => device.coordinate),
    strokeColor: lineColors[line.status],
    strokeOpacity: 0.85,
    strokeWeight: 7,
    lineJoin: 'round',
    lineCap: 'round',
    showDir: true,
    zIndex: 42,
  })
  lineOverlays.set(line.id, lineOverlay)

  const devices = orderedDevices.map(
    (device) =>
      new AMap.Marker({
        position: device.coordinate,
        content: createDeviceContent(device),
        anchor: 'center',
        zIndex: 62,
      }),
  )
  deviceOverlays.set(line.id, devices)

  if (line.fault) {
    const faultOverlay = new AMap.Marker({
      position: line.fault.coordinate,
      content: createFaultContent(line.fault),
      anchor: 'bottom-left',
      offset: new AMap.Pixel(-8, -12),
      zIndex: 86,
    })
    const warningArea = new AMap.Circle({
      center: line.fault.coordinate,
      radius: 2700,
      fillColor: '#f5a623',
      fillOpacity: 0.1,
      strokeColor: '#f5a623',
      strokeOpacity: 0.8,
      strokeWeight: 2,
      strokeStyle: 'dashed',
      zIndex: 30,
    })
    faultOverlays.set(line.id, faultOverlay)
    warningAreaOverlays.set(line.id, warningArea)
  } else if (line.status === 'warning') {
    const warningDevice = orderedDevices.find((device) => device.status === 'warning')
    if (warningDevice) {
      warningAreaOverlays.set(
        line.id,
        new AMap.Circle({
          center: warningDevice.coordinate,
          radius: 1800,
          fillColor: '#f5a623',
          fillOpacity: 0.08,
          strokeColor: '#f5a623',
          strokeOpacity: 0.72,
          strokeWeight: 2,
          strokeStyle: 'dashed',
          zIndex: 30,
        }),
      )
    }
  }

  return [
    lineOverlay,
    ...devices,
    ...(faultOverlays.has(line.id) ? [faultOverlays.get(line.id)!] : []),
    ...(warningAreaOverlays.has(line.id) ? [warningAreaOverlays.get(line.id)!] : []),
  ]
}

async function initializeMap() {
  if (!mapContainer.value) return
  isLoading.value = true
  loadError.value = ''
  map?.destroy()
  map = undefined
  lineOverlays.clear()
  deviceOverlays.clear()
  faultOverlays.clear()
  warningAreaOverlays.clear()
  boundaryOverlay = undefined
  satelliteOverlays = []

  try {
    AMapApi = await loadAmap(import.meta.env.VITE_AMAP_KEY, import.meta.env.VITE_AMAP_SECURITY_CODE)
    if (disposed || !mapContainer.value) return
    map = new AMapApi.Map(mapContainer.value, {
      center: [113.545, 34.818],
      zoom: 12,
      mapStyle: 'amap://styles/darkblue',
      resizeEnable: true,
      showLabel: true,
      viewMode: '2D',
    })

    rebuildLayers()
    if (lineOverlays.size) map.setFitView([...lineOverlays.values()], false, [70, 300, 70, 300])
    applyBaseMap()
    applyLayerState()
    isLoading.value = false
  } catch (error) {
    isLoading.value = false
    loadError.value = error instanceof Error ? error.message : '高德地图初始化失败'
  }
}

function rebuildLayers() {
  if (!map || !AMapApi) return
  const previous = [
    ...lineOverlays.values(),
    ...[...deviceOverlays.values()].flat(),
    ...faultOverlays.values(),
    ...warningAreaOverlays.values(),
    ...(boundaryOverlay ? [boundaryOverlay] : []),
  ]
  if (previous.length) map.remove(previous)
  lineOverlays.clear()
  deviceOverlays.clear()
  faultOverlays.clear()
  warningAreaOverlays.clear()
  boundaryOverlay = undefined
  const overlays = props.lines.flatMap((line) => createLineLayers(AMapApi!, line))
  const points = props.lines.flatMap((line) => line.devices.map((device) => device.coordinate))
  if (points.length) {
    const left = Math.min(...points.map((point) => point[0])) - 0.003
    const right = Math.max(...points.map((point) => point[0])) + 0.003
    const top = Math.max(...points.map((point) => point[1])) + 0.003
    const bottom = Math.min(...points.map((point) => point[1])) - 0.003
    boundaryOverlay = new AMapApi.Polyline({
      path: [
        [left, top],
        [right, top],
        [right, bottom],
        [left, bottom],
        [left, top],
      ],
      strokeColor: '#778bff',
      strokeOpacity: 0.7,
      strokeWeight: 2,
      strokeStyle: 'dashed',
      zIndex: 24,
    })
    overlays.push(boundaryOverlay)
  }
  if (overlays.length) map.add(overlays)
  applyLayerState()
}

function focusAllLines() {
  map?.setFitView([...lineOverlays.values()], false, [70, 300, 70, 300])
}

watch(() => props.baseMap, applyBaseMap)
watch(() => props.lines, rebuildLayers, { deep: true })
watch(
  () => [props.layerVisibility, props.statusVisibility, props.overlayOpacity],
  applyLayerState,
  { deep: true },
)

onMounted(initializeMap)
onBeforeUnmount(() => {
  disposed = true
  map?.destroy()
  map = undefined
})
</script>

<template>
  <div class="map-layer-map-shell">
    <div ref="mapContainer" class="map-layer-map"></div>

    <div v-if="isLoading" class="map-layer-loading">
      <span></span><strong>正在加载高德地图图层</strong>
    </div>
    <div v-else-if="loadError" class="map-layer-error" role="alert">
      <svg><use href="#icon-warning" /></svg>
      <div>
        <strong>地图加载失败</strong><span>{{ loadError }}</span
        ><button type="button" @click="initializeMap">重试</button>
      </div>
    </div>

    <div class="map-layer-tools">
      <button type="button" aria-label="放大地图" @click="map?.zoomIn()">+</button>
      <button type="button" aria-label="缩小地图" @click="map?.zoomOut()">−</button>
      <button type="button" aria-label="查看线路全景" @click="focusAllLines">
        <svg><use href="#icon-crosshair" /></svg>
      </button>
    </div>

    <div class="map-layer-map-note">线路由定位设备坐标按顺序生成</div>
  </div>
</template>
