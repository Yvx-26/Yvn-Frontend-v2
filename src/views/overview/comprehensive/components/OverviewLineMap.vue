<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import type { BoundLineDevice, ManagedLine } from '../../../../domain/infrastructure/types'
import { loadAmap } from '../../../../integrations/amap/loader'
import { cableStroke, createCableLabelLayer } from '../../../../integrations/amap/cable-lines'
import { nodeMarkerContent } from '../../../../integrations/amap/markers'
import type { CableLineState } from '../../../../domain/map/types'
import type {
  AMapMapInstance,
  AMapNamespace,
  AMapOverlay,
} from '../../../../integrations/amap/types'

const props = defineProps<{
  line: ManagedLine
  lineState: CableLineState
  selectedDeviceId: string
}>()

const emit = defineEmits<{
  'select-device': [deviceId: string]
}>()

const mapContainer = ref<HTMLElement>()
const isLoading = ref(true)
const loadError = ref('')
const markerElements = new Map<string, HTMLElement>()
const overlays: AMapOverlay[] = []
type PathOverlay = AMapOverlay & { setPath(path: [number, number][]): void }
let routeLine: PathOverlay | undefined
let routeGlow: AMapOverlay | undefined
let lineLabels: ReturnType<typeof createCableLabelLayer> | undefined
let lineRevealFrame = 0
let linePulseFrame = 0
let lastLinePulseAt = 0
let map: AMapMapInstance | undefined
let AMapApi: AMapNamespace | undefined
let initializationId = 0

function hasCoordinate(device: BoundLineDevice) {
  const [lng, lat] = device.coordinate
  return Number.isFinite(lng) && Number.isFinite(lat) && (lng !== 0 || lat !== 0)
}

const locatedDevices = computed(() =>
  props.line.devices
    .filter(hasCoordinate)
    .slice()
    .sort((left, right) => left.sequence - right.sequence),
)

const mapSignature = computed(() =>
  `${props.line.id}:${locatedDevices.value
    .map((device) => `${device.id}:${device.sequence}:${device.coordinate.join(',')}`)
    .join('|')}`,
)

const routeViewport = computed(() => {
  if (!locatedDevices.value.length) {
    return { center: [113.545, 34.818] as [number, number], zoom: 13 }
  }
  const lngValues = locatedDevices.value.map((device) => device.coordinate[0])
  const latValues = locatedDevices.value.map((device) => device.coordinate[1])
  const minLng = Math.min(...lngValues)
  const maxLng = Math.max(...lngValues)
  const minLat = Math.min(...latValues)
  const maxLat = Math.max(...latValues)
  const span = Math.max(maxLng - minLng, maxLat - minLat)
  const zoom = span > 0.1 ? 10 : span > 0.04 ? 11 : span > 0.02 ? 12 : span > 0.012 ? 13 : 15
  return {
    center: [(minLng + maxLng) / 2, (minLat + maxLat) / 2] as [number, number],
    zoom,
  }
})

function createDeviceContent(device: BoundLineDevice) {
  const marker = nodeMarkerContent(
    `overview-map-marker is-${device.state}`,
    device.sequence,
    `${device.id}，${device.position || device.name}`,
  )
  marker.style.setProperty('--node-delay', `${device.sequence * -0.16}s`)
  marker.setAttribute(
    'aria-label',
    `${marker.title}，${device.state === 'online' ? '在线' : device.state === 'warning' ? '数据异常' : '离线'}`,
  )
  marker.addEventListener('click', (event) => {
    event.stopPropagation()
    emit('select-device', device.id)
  })
  markerElements.set(device.id, marker)
  return marker
}

function revealLine(line: PathOverlay, path: [number, number][]) {
  if (path.length < 2 || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    line.setPath(path)
    return
  }

  const startedAt = performance.now()
  const duration = 1050
  const animate = (timestamp: number) => {
    const rawProgress = Math.max(0, Math.min(1, (timestamp - startedAt) / duration))
    const progress = 1 - Math.pow(1 - rawProgress, 3)
    const scaledPosition = progress * (path.length - 1)
    const completedIndex = Math.floor(scaledPosition)
    const partialPath = path.slice(0, completedIndex + 1)
    if (completedIndex < path.length - 1) {
      const from = path[completedIndex]!
      const to = path[completedIndex + 1]!
      const ratio = scaledPosition - completedIndex
      partialPath.push([from[0] + (to[0] - from[0]) * ratio, from[1] + (to[1] - from[1]) * ratio])
    }
    line.setPath(partialPath)
    if (rawProgress < 1) lineRevealFrame = requestAnimationFrame(animate)
  }
  lineRevealFrame = requestAnimationFrame(animate)
}

function pulseLine(glowLine: AMapOverlay) {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
  const startedAt = performance.now()
  const animate = (timestamp: number) => {
    if (timestamp - lastLinePulseAt >= 40) {
      const cycle = (Math.max(0, timestamp - startedAt) % 2600) / 2600
      const firstBeat = Math.exp(-Math.pow((cycle - 0.18) / 0.055, 2))
      const secondBeat = 0.68 * Math.exp(-Math.pow((cycle - 0.34) / 0.075, 2))
      const strength = Math.max(firstBeat, secondBeat)
      glowLine.setOptions({
        strokeOpacity: 0.12 + strength * 0.38,
        strokeWeight: 8 + strength * 2,
      })
      lastLinePulseAt = timestamp
    }
    linePulseFrame = requestAnimationFrame(animate)
  }
  linePulseFrame = requestAnimationFrame(animate)
}

function clearMap() {
  lineLabels?.destroy()
  lineLabels = undefined
  if (lineRevealFrame) cancelAnimationFrame(lineRevealFrame)
  if (linePulseFrame) cancelAnimationFrame(linePulseFrame)
  lineRevealFrame = 0
  linePulseFrame = 0
  lastLinePulseAt = 0
  map?.destroy()
  map = undefined
  markerElements.clear()
  overlays.splice(0)
  routeLine = undefined
  routeGlow = undefined
}

function syncLineState() {
  const stroke = cableStroke(props.lineState.status, true)
  routeLine?.setOptions(stroke)
  routeGlow?.setOptions({ strokeColor: stroke.strokeColor, strokeStyle: stroke.strokeStyle })
  lineLabels?.setRoutes([{
    path: locatedDevices.value.map((device) => device.coordinate),
    name: props.line.name,
    statusLabel: props.lineState.statusLabel,
  }])
}

function syncSelectedDevice() {
  markerElements.forEach((element, deviceId) => {
    element.classList.toggle('is-selected', deviceId === props.selectedDeviceId)
  })
}

function syncMarkers() {
  locatedDevices.value.forEach((device) => {
    const element = markerElements.get(device.id)
    if (!element) return
    element.classList.remove('is-online', 'is-offline', 'is-warning')
    element.classList.add(`is-${device.state}`)
    element.setAttribute(
      'aria-label',
      `${device.id}，${device.position || device.name}，${device.state === 'online' ? '在线' : device.state === 'warning' ? '数据异常' : '离线'}`,
    )
    element.title = element.getAttribute('aria-label') ?? ''
  })
}

async function initializeMap() {
  const currentInitializationId = ++initializationId
  clearMap()
  isLoading.value = true
  loadError.value = ''
  await nextTick()
  if (!mapContainer.value) return

  try {
    AMapApi ??= await loadAmap(
      import.meta.env.VITE_AMAP_KEY,
      import.meta.env.VITE_AMAP_SECURITY_CODE,
    )
    if (currentInitializationId !== initializationId || !mapContainer.value) return

    map = new AMapApi.Map(mapContainer.value, {
      center: routeViewport.value.center,
      zoom: routeViewport.value.zoom,
      mapStyle: 'amap://styles/darkblue',
      resizeEnable: true,
      showLabel: true,
      viewMode: '2D',
    })
    lineLabels = createCableLabelLayer(map, mapContainer.value)

    if (locatedDevices.value.length >= 2) {
      const path = locatedDevices.value.map((device) => device.coordinate) as [number, number][]
      const line = new AMapApi.Polyline({
        path: [path[0], path[0]],
        ...cableStroke(props.lineState.status, true),
        strokeOpacity: 0.96,
        lineJoin: 'round',
        lineCap: 'round',
      }) as PathOverlay
      const glowLine = new AMapApi.Polyline({
        path,
        ...cableStroke(props.lineState.status),
        strokeOpacity: 0.12,
        strokeWeight: 8,
        lineJoin: 'round',
        lineCap: 'round',
        zIndex: 40,
        showDir: false,
        clickable: false,
      })
      routeLine = line
      routeGlow = glowLine
      overlays.push(glowLine, line)
      queueMicrotask(() => {
        if (currentInitializationId !== initializationId) return
        revealLine(line, path)
        pulseLine(glowLine)
      })
    }

    locatedDevices.value.forEach((device) => {
      const marker = new AMapApi!.Marker({
        position: device.coordinate,
        content: createDeviceContent(device),
        anchor: 'center',
        zIndex: 62,
      })
      overlays.push(marker)
    })

    if (overlays.length) {
      map.add(overlays)
    }
    isLoading.value = false
    syncSelectedDevice()
    syncLineState()
  } catch (error) {
    isLoading.value = false
    loadError.value = error instanceof Error ? error.message : '高德地图初始化失败'
  }
}

function focusLine() {
  map?.setZoomAndCenter(routeViewport.value.zoom, routeViewport.value.center)
}

watch(mapSignature, initializeMap)
watch(() => props.selectedDeviceId, syncSelectedDevice)
watch(() => props.line.devices, syncMarkers, { deep: true })
watch(() => [props.lineState.status, props.line.name], syncLineState)
onMounted(initializeMap)
onBeforeUnmount(() => {
  initializationId += 1
  clearMap()
})
</script>

<template>
  <div class="overview-line-map-shell">
    <div ref="mapContainer" class="overview-line-map"></div>

    <div v-if="isLoading" class="overview-line-map-state">
      <i></i><strong>正在加载实时线路地图</strong>
    </div>
    <div v-else-if="loadError" class="overview-line-map-state is-error" role="alert">
      <svg><use href="#icon-warning" /></svg>
      <div>
        <strong>地图加载失败</strong><span>{{ loadError }}</span
        ><button type="button" @click="initializeMap">重试</button>
      </div>
    </div>
    <div v-else-if="!locatedDevices.length" class="overview-line-map-state is-empty">
      <svg><use href="#icon-map-points" /></svg>
      <div><strong>暂无有效定位点</strong><span>请在线路管理中配置设备坐标</span></div>
    </div>

    <button type="button" class="overview-line-map-focus" @click="focusLine">
      <svg><use href="#icon-crosshair" /></svg>
      线路全景
    </button>
  </div>
</template>
