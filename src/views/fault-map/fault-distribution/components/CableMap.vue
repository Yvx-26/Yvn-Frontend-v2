<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { loadAmap } from '../amap-loader'
import type {
  AMapMapInstance,
  AMapNamespace,
  AMapOverlay,
  CableLine,
  LocatedFault,
  MapSelection,
  PositioningDevice,
} from '../types'

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

function createDeviceContent(device: PositioningDevice) {
  const marker = document.createElement('button')
  marker.type = 'button'
  marker.className = `fault-map-device-marker is-${device.status}`
  marker.setAttribute('aria-label', `${device.name}，${device.statusLabel}`)
  marker.innerHTML = `<i></i><span>${device.id}</span>`
  return marker
}

function createFaultContent(fault: LocatedFault) {
  const marker = document.createElement('button')
  marker.type = 'button'
  marker.className = 'fault-map-fault-marker'
  marker.setAttribute('aria-label', `故障点：${fault.title}`)
  marker.innerHTML = `<i></i><span><strong>${fault.title}</strong><small>${fault.distanceFromDevice}</small></span>`
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
    faultMarker.on('click', () =>
      emit('select-item', { kind: 'fault', line, fault: line.fault! }),
    )
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

  try {
    const AMap = await loadAmap(
      import.meta.env.VITE_AMAP_KEY,
      import.meta.env.VITE_AMAP_SECURITY_CODE,
    )
    map = new AMap.Map(mapContainer.value, {
      center: [113.545, 34.818],
      zoom: 12,
      mapStyle: 'amap://styles/darkblue',
      resizeEnable: true,
      showLabel: true,
      viewMode: '2D',
    })

    const overlays = props.lines.flatMap((line) => createLineOverlays(AMap, line))
    map.add(overlays)
    isLoading.value = false
    focusSelectedLine()
  } catch (error) {
    isLoading.value = false
    loadError.value = error instanceof Error ? error.message : '高德地图初始化失败'
  }
}

watch(() => props.selectedLineId, focusSelectedLine)

onMounted(initializeMap)
onBeforeUnmount(() => map?.destroy())
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
      <div><strong>地图加载失败</strong><span>{{ loadError }}</span></div>
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
