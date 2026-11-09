<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { loadAmap } from '../../../../integrations/amap/loader'
import { markerContent, nodeMarkerContent } from '../../../../integrations/amap/markers'
import { cableStroke, createCableLabelLayer } from '../../../../integrations/amap/cable-lines'
import { cableLineStyles } from '../../../../domain/map/lines'
import type {
  AMapMapInstance,
  AMapNamespace,
  AMapOverlay,
} from '../../../../integrations/amap/types'
import type {
  CableLine,
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
let lineLabels: ReturnType<typeof createCableLabelLayer> | undefined
const selectedLineId = ref('')
const selectedDeviceId = ref('')
const selectedLine = computed(() =>
  props.layerVisibility.lines
    ? props.lines.find((line) => line.id === selectedLineId.value && props.statusVisibility[line.status])
    : undefined,
)
const selectedDevice = computed(() => {
  if (!props.layerVisibility.devices) return undefined
  const line = props.lines.find((line) => line.id === selectedLineId.value && props.statusVisibility[line.status])
  return line?.devices.find((device) => device.id === selectedDeviceId.value)
})
const deviceOverlays = new Map<string, AMapOverlay[]>()
const faultOverlays = new Map<string, AMapOverlay>()
const warningAreaOverlays = new Map<string, AMapOverlay>()
let boundaryOverlay: AMapOverlay | undefined
let satelliteOverlays: AMapOverlay[] = []
let map: AMapMapInstance | undefined
let AMapApi: AMapNamespace | undefined
let disposed = false

function createDeviceContent(device: PositioningDevice) {
  return nodeMarkerContent(
    `map-layer-device-marker is-${device.status}`,
    device.sequence,
    `节点 ${device.sequence}，设备 ${device.id}，${device.statusLabel}`,
  )
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
    lineOverlay?.setOptions({ ...cableStroke(line.status, line.id === selectedLineId.value), strokeOpacity: opacity })

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
  const visible = props.layerVisibility.lines ? props.lines.filter((line) => props.statusVisibility[line.status]) : []
  const ordered = visible.slice().sort((a, b) => Number(b.id === selectedLineId.value) - Number(a.id === selectedLineId.value))
  lineLabels?.setRoutes(ordered.map((line) => ({
    name: line.name,
    statusLabel: line.statusLabel,
    path: line.devices.slice().sort((a, b) => a.sequence - b.sequence).map((device) => device.coordinate),
  })), opacity)

  setOverlayVisible(boundaryOverlay, props.layerVisibility.boundary)
  boundaryOverlay?.setOptions({ strokeOpacity: 0.7 * opacity })
  map.setFeatures(
    props.layerVisibility.labels ? ['bg', 'road', 'building', 'point'] : ['bg', 'road', 'building'],
  )
}

function createLineLayers(AMap: AMapNamespace, line: CableLine) {
  const orderedDevices = line.devices.slice().sort((left, right) => left.sequence - right.sequence)
  const path = orderedDevices.map((device) => device.coordinate)
  if (path.length >= 2) {
    const lineOverlay = new AMap.Polyline({
      path,
      ...cableStroke(line.status, line.id === selectedLineId.value),
      strokeOpacity: 0.85,
      lineJoin: 'round',
      lineCap: 'round',
    })
    lineOverlay.on('click', () => {
      selectedDeviceId.value = ''
      selectedLineId.value = line.id
    })
    lineOverlays.set(line.id, lineOverlay)
  }

  const devices = orderedDevices.map((device) => {
    const content = createDeviceContent(device)
    content.addEventListener('click', (event) => {
      event.stopPropagation()
      selectedLineId.value = line.id
      selectedDeviceId.value = device.id
    })
    return new AMap.Marker({
        position: device.coordinate,
        content,
        anchor: 'center',
        zIndex: 62,
    })
  })
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
      fillColor: cableLineStyles.warning.color,
      fillOpacity: 0.1,
      strokeColor: cableLineStyles.warning.color,
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
          fillColor: cableLineStyles.warning.color,
          fillOpacity: 0.08,
          strokeColor: cableLineStyles.warning.color,
          strokeOpacity: 0.72,
          strokeWeight: 2,
          strokeStyle: 'dashed',
          zIndex: 30,
        }),
      )
    }
  }

  return [
    lineOverlays.get(line.id),
    ...devices,
    ...(faultOverlays.has(line.id) ? [faultOverlays.get(line.id)!] : []),
    ...(warningAreaOverlays.has(line.id) ? [warningAreaOverlays.get(line.id)!] : []),
  ].filter((overlay): overlay is AMapOverlay => Boolean(overlay))
}

async function initializeMap() {
  if (!mapContainer.value) return
  isLoading.value = true
  loadError.value = ''
  lineLabels?.destroy()
  lineLabels = undefined
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
    lineLabels = createCableLabelLayer(map, mapContainer.value)

    rebuildLayers()
    focusAllLines()
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
  const overlays = [...lineOverlays.values(), ...[...deviceOverlays.values()].flat()]
  if (overlays.length) map?.setFitView(overlays, false, [70, 300, 70, 300])
}

watch(() => props.baseMap, applyBaseMap)
watch(() => props.lines, rebuildLayers, { deep: true })
watch(
  () => [props.layerVisibility, props.statusVisibility, props.overlayOpacity, selectedLineId.value],
  applyLayerState,
  { deep: true },
)

onMounted(initializeMap)
onBeforeUnmount(() => {
  disposed = true
  lineLabels?.destroy()
  lineLabels = undefined
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

    <div class="map-layer-map-note" aria-live="polite">
      <template v-if="selectedDevice">
        节点 {{ selectedDevice.sequence }} · 设备 <span class="asset-identifier">{{ selectedDevice.id }}</span> · {{ selectedDevice.statusLabel }}
      </template>
      <template v-else>{{ selectedLine ? `${selectedLine.name} · ${selectedLine.statusDetail}` : '线路由定位设备坐标按顺序生成' }}</template>
    </div>
  </div>
</template>
