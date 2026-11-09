<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import CableLineLegend from '../../../../components/common/CableLineLegend.vue'
import type { BoundLineDevice, ManagedLine } from '../../../../domain/infrastructure/types'
import { hasCoordinate } from '../../../../domain/infrastructure/helpers'
import type { CableLineState } from '../../../../domain/map/types'
import { loadAmap } from '../../../../integrations/amap/loader'
import { cableStroke, createCableLabelLayer } from '../../../../integrations/amap/cable-lines'
import { nodeMarkerContent } from '../../../../integrations/amap/markers'
import type {
  AMapMapInstance,
  AMapNamespace,
  AMapOverlay,
} from '../../../../integrations/amap/types'

const props = defineProps<{
  line: ManagedLine
  lineState: CableLineState
  selectedDeviceId: string
  isLive: boolean
}>()

const emit = defineEmits<{
  'select-device': [deviceId: string]
}>()

const mapContainer = ref<HTMLElement>()
const isLoading = ref(true)
const loadError = ref('')
const markerElements = new Map<string, HTMLElement>()
const overlays: AMapOverlay[] = []
let routeLine: AMapOverlay | undefined
let lineLabels: ReturnType<typeof createCableLabelLayer> | undefined
let map: AMapMapInstance | undefined
let AMapApi: AMapNamespace | undefined
let initializationId = 0

const orderedDevices = computed(() =>
  props.line.devices.filter((device) => hasCoordinate(device.coordinate)).sort((left, right) => left.sequence - right.sequence),
)

const lineSignature = computed(() =>
  `${props.line.id}:${orderedDevices.value
    .map((device) => `${device.id}:${device.sequence}:${device.coordinate.join(',')}`)
    .join('|')}`,
)

function createDeviceContent(device: BoundLineDevice) {
  const marker = nodeMarkerContent(
    `line-monitor-map-marker is-${device.state}`,
    device.sequence,
    `${device.id}，${device.position || device.name}`,
  )
  markerElements.set(device.id, marker)
  return marker
}

function clearMap() {
  lineLabels?.destroy()
  lineLabels = undefined
  map?.destroy()
  map = undefined
  markerElements.clear()
  overlays.splice(0)
  routeLine = undefined
}

function syncSelectedDevice() {
  markerElements.forEach((element, deviceId) => {
    element.classList.toggle('is-selected', deviceId === props.selectedDeviceId)
  })
}

function syncMarkers() {
  orderedDevices.value.forEach((device) => {
    const element = markerElements.get(device.id)
    if (!element) return
    element.classList.remove('is-online', 'is-offline', 'is-warning')
    element.classList.add(`is-${device.state}`)
    element.title = `${device.id}，${device.position || device.name}`
    element.setAttribute('aria-label', element.title)
  })
}

function syncLineState() {
  routeLine?.setOptions(cableStroke(props.lineState.status, true))
  lineLabels?.setRoutes([{
    path: orderedDevices.value.map((device) => device.coordinate),
    name: props.line.name,
    statusLabel: props.lineState.statusLabel,
  }])
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

    const center = orderedDevices.value[0]?.coordinate ?? [113.545, 34.818]
    map = new AMapApi.Map(mapContainer.value, {
      center,
      zoom: 12,
      mapStyle: 'amap://styles/darkblue',
      resizeEnable: true,
      showLabel: true,
      viewMode: '2D',
    })
    lineLabels = createCableLabelLayer(map, mapContainer.value)

    if (orderedDevices.value.length >= 2) {
      const path = orderedDevices.value.map((device) => device.coordinate)
      routeLine = new AMapApi.Polyline({
        path,
        ...cableStroke(props.lineState.status, true),
        strokeOpacity: 0.96,
        lineJoin: 'round',
        lineCap: 'round',
      })
      overlays.push(routeLine)
    }

    orderedDevices.value.forEach((device) => {
      const content = createDeviceContent(device)
      content.addEventListener('click', (event) => {
        event.stopPropagation()
        emit('select-device', device.id)
      })
      const marker = new AMapApi!.Marker({
        position: device.coordinate,
        content,
        anchor: 'center',
        zIndex: 62,
      })
      overlays.push(marker)
    })

    if (overlays.length) {
      map.add(overlays)
      map.setFitView(overlays, false, [65, 85, 65, 85])
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
  if (overlays.length) map?.setFitView(overlays, false, [65, 85, 65, 85])
}

watch(lineSignature, initializeMap)
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
  <section class="line-monitor-map-shell">
    <div ref="mapContainer" class="line-monitor-map"></div>

    <div class="line-monitor-map-heading">
      <strong>线路运行态势</strong>
      <span class="asset-truncate" :title="line.name">{{ line.name }} · 设备位置与线路状态</span>
    </div>

    <div class="line-monitor-map-tools">
      <button type="button" disabled title="请在故障地图的地图图层页切换底图">
        <svg><use href="#icon-layers" /></svg>地图底图
      </button>
      <button type="button" @click="focusLine">
        <svg><use href="#icon-crosshair" /></svg>线路全景
      </button>
    </div>

    <div v-if="isLoading" class="line-monitor-map-loading">
      <i></i><span>正在加载线路地图</span>
    </div>
    <div v-else-if="loadError" class="line-monitor-map-error" role="alert">
      <svg><use href="#icon-warning" /></svg>
      <div>
        <strong>地图加载失败</strong><span>{{ loadError }}</span
        ><button type="button" @click="initializeMap">重试</button>
      </div>
    </div>

    <div v-if="orderedDevices.length === 0 && !isLoading" class="line-monitor-map-empty">
      <svg><use href="#icon-map-points" /></svg>
      <strong>尚未生成线路态势</strong>
      <span>请先在线路管理中绑定至少两个定位设备</span>
    </div>

    <div class="line-monitor-live-state" :class="{ 'is-paused': !isLive }">
      <i></i>{{ isLive ? '实时刷新中' : '实时刷新已暂停' }}
    </div>

    <div class="line-monitor-map-legend">
      <CableLineLegend />
      <span><i class="line-monitor-state-dot is-online"></i>在线</span>
      <span><i class="line-monitor-state-dot is-warning"></i>异常</span>
      <span><i class="line-monitor-state-dot is-offline"></i>离线</span>
    </div>
  </section>
</template>
