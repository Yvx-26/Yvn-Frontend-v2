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
  LocatedFault,
  MapSelection,
  PositioningDevice,
} from '../../../../domain/map/types'

const props = defineProps<{
  lines: CableLine[]
  selectedLineId: string
}>()

const emit = defineEmits<{
  'select-line': [line: CableLine]
  'select-item': [item: MapSelection]
}>()

const mapContainer = ref<HTMLElement>()
const isLoading = ref(true)
const loadError = ref('')
const lineOverlays = new Map<string, AMapOverlay>()
const lineDeviceOverlays = new Map<string, AMapOverlay[]>()
const faultOverlays = new Map<string, AMapOverlay>()
let map: AMapMapInstance | undefined
let mapApi: AMapNamespace | undefined
let disposed = false

function createDeviceContent(device: PositioningDevice) {
  const marker = markerContent(`fault-map-device-marker is-${device.status}`, device.id)
  marker.setAttribute('aria-label', `${device.name}，${device.statusLabel}`)
  return marker
}

function createFaultContent(fault: LocatedFault) {
  const marker = markerContent('fault-map-fault-marker', fault.title, fault.distanceFromDevice)
  marker.setAttribute('aria-label', `故障点：${fault.title}`)
  return marker
}

function createLineOverlays(AMap: AMapNamespace, line: CableLine) {
  const polyline = new AMap.Polyline({
    path: line.devices
      .slice()
      .sort((left, right) => left.sequence - right.sequence)
      .map((device) => device.coordinate),
    strokeColor: line.color,
    strokeOpacity: 0.95,
    strokeWeight: 6,
    lineJoin: 'round',
    lineCap: 'round',
    showDir: true,
    zIndex: 40,
  })

  polyline.on('click', () => emit('select-line', line))
  lineOverlays.set(line.id, polyline)

  const devices = line.devices.map((device) => {
    const marker = new AMap.Marker({
      position: device.coordinate,
      content: createDeviceContent(device),
      anchor: 'center',
      zIndex: 60,
    })
    marker.on('click', () => emit('select-item', { kind: 'device', line, device }))
    return marker
  })
  lineDeviceOverlays.set(line.id, devices)

  if (line.fault) {
    const faultMarker = new AMap.Marker({
      position: line.fault.coordinate,
      content: createFaultContent(line.fault),
      anchor: 'bottom-left',
      offset: new AMap.Pixel(-10, -8),
      zIndex: 90,
    })
    faultMarker.on('click', () => emit('select-item', { kind: 'fault', line, fault: line.fault! }))
    faultOverlays.set(line.id, faultMarker)
  }

  return [polyline, ...devices, ...(line.fault ? [faultOverlays.get(line.id)!] : [])]
}

function focusSelectedLine() {
  if (!map) return

  const activeLine = lineOverlays.get(props.selectedLineId)
  const activeDevices = lineDeviceOverlays.get(props.selectedLineId) ?? []
  const activeFault = faultOverlays.get(props.selectedLineId)

  lineOverlays.forEach((overlay, lineId) => {
    overlay.setOptions({
      strokeOpacity: lineId === props.selectedLineId ? 0.98 : 0.25,
      strokeWeight: lineId === props.selectedLineId ? 7 : 4,
      zIndex: lineId === props.selectedLineId ? 45 : 35,
    })
  })

  lineDeviceOverlays.forEach((overlays, lineId) => {
    overlays.forEach((overlay) =>
      overlay.setOptions({ opacity: lineId === props.selectedLineId ? 1 : 0.32 }),
    )
  })

  faultOverlays.forEach((overlay, lineId) => {
    overlay.setOptions({ opacity: lineId === props.selectedLineId ? 1 : 0.18 })
  })

  const focusOverlays = [activeLine, ...activeDevices, activeFault].filter(
    (overlay): overlay is AMapOverlay => Boolean(overlay),
  )
  map.setFitView(focusOverlays, false, [90, 360, 90, 320])
}

function focusAllLines() {
  if (!map) return
  const overlays = [...lineOverlays.values(), ...faultOverlays.values()]
  lineOverlays.forEach((overlay) => overlay.setOptions({ strokeOpacity: 0.9, strokeWeight: 6 }))
  lineDeviceOverlays.forEach((devices) =>
    devices.forEach((overlay) => overlay.setOptions({ opacity: 1 })),
  )
  faultOverlays.forEach((overlay) => overlay.setOptions({ opacity: 1 }))
  map.setFitView(overlays, false, [90, 80, 90, 310])
}

async function initializeMap() {
  if (!mapContainer.value) return
  isLoading.value = true
  loadError.value = ''
  map?.destroy()
  map = undefined
  lineOverlays.clear()
  lineDeviceOverlays.clear()
  faultOverlays.clear()

  try {
    const AMap = await loadAmap(
      import.meta.env.VITE_AMAP_KEY,
      import.meta.env.VITE_AMAP_SECURITY_CODE,
    )
    if (disposed || !mapContainer.value) return
    mapApi = AMap
    map = new AMap.Map(mapContainer.value, {
      center: [113.545, 34.818],
      zoom: 12,
      mapStyle: 'amap://styles/darkblue',
      resizeEnable: true,
      showLabel: true,
      viewMode: '2D',
    })

    updateOverlays()
    isLoading.value = false
    focusSelectedLine()
  } catch (error) {
    isLoading.value = false
    loadError.value = error instanceof Error ? error.message : '高德地图初始化失败'
  }
}

function updateOverlays() {
  if (!map || !mapApi) return
  const previous = [
    ...lineOverlays.values(),
    ...[...lineDeviceOverlays.values()].flat(),
    ...faultOverlays.values(),
  ]
  if (previous.length) map.remove(previous)
  lineOverlays.clear()
  lineDeviceOverlays.clear()
  faultOverlays.clear()
  const overlays = props.lines.flatMap((line) => createLineOverlays(mapApi!, line))
  if (overlays.length) map.add(overlays)
}

watch(() => props.selectedLineId, focusSelectedLine)
watch(() => props.lines, updateOverlays, { deep: true })

onMounted(initializeMap)
onBeforeUnmount(() => {
  disposed = true
  map?.destroy()
  map = undefined
})
</script>

<template>
  <div class="fault-distribution-map-shell">
    <div ref="mapContainer" class="fault-distribution-map"></div>

    <div v-if="isLoading" class="fault-map-loading">
      <span></span>
      <strong>正在加载高德地图</strong>
    </div>

    <div v-else-if="loadError" class="fault-map-error" role="alert">
      <svg><use href="#icon-warning" /></svg>
      <div>
        <strong>地图加载失败</strong><span>{{ loadError }}</span
        ><button type="button" @click="initializeMap">重试</button>
      </div>
    </div>

    <div class="fault-map-tools" aria-label="地图操作">
      <button type="button" aria-label="放大地图" @click="map?.zoomIn()">+</button>
      <button type="button" aria-label="缩小地图" @click="map?.zoomOut()">−</button>
      <button type="button" aria-label="查看线路全景" @click="focusAllLines">
        <svg><use href="#icon-crosshair" /></svg>
      </button>
      <button type="button" aria-label="聚焦当前线路" @click="focusSelectedLine">
        <svg><use href="#icon-route" /></svg>
      </button>
    </div>
  </div>
</template>
