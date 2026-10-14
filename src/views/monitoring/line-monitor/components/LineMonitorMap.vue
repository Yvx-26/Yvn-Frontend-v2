<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import type { BoundLineDevice, ManagedLine } from '../../../../domain/infrastructure/types'
import { loadAmap } from '../../../fault-map/fault-distribution/amap-loader'
import type {
  AMapMapInstance,
  AMapNamespace,
  AMapOverlay,
} from '../../../fault-map/fault-distribution/types'
import type { LineRuntimeStatus } from '../types'

const props = defineProps<{
  line: ManagedLine
  status: LineRuntimeStatus
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
let map: AMapMapInstance | undefined
let AMapApi: AMapNamespace | undefined
let initializationId = 0

const orderedDevices = computed(() =>
  props.line.devices.slice().sort((left, right) => left.sequence - right.sequence),
)

const lineSignature = computed(() =>
  orderedDevices.value
    .map((device) => `${device.id}:${device.sequence}:${device.state}:${device.coordinate.join(',')}`)
    .join('|'),
)

function createDeviceContent(device: BoundLineDevice) {
  const marker = document.createElement('button')
  marker.type = 'button'
  marker.className = `line-monitor-map-marker is-${device.state}`
  marker.setAttribute('aria-label', `${device.id}，${device.position}`)

  const point = document.createElement('i')
  point.textContent = String(device.sequence).padStart(2, '0')
  const copy = document.createElement('span')
  const id = document.createElement('strong')
  id.textContent = device.id
  const position = document.createElement('small')
  position.textContent = device.position
  copy.append(id, position)
  marker.append(point, copy)
  markerElements.set(device.id, marker)
  return marker
}

function createFlowContent() {
  const flow = document.createElement('span')
  flow.className = 'line-monitor-flow-particle'
  flow.textContent = '›'
  return flow
}

function midpoint(left: BoundLineDevice, right: BoundLineDevice): [number, number] {
  return [
    (left.coordinate[0] + right.coordinate[0]) / 2,
    (left.coordinate[1] + right.coordinate[1]) / 2,
  ]
}

function clearMap() {
  map?.destroy()
  map = undefined
  markerElements.clear()
  overlays.splice(0)
}

function syncSelectedDevice() {
  markerElements.forEach((element, deviceId) => {
    element.classList.toggle('is-selected', deviceId === props.selectedDeviceId)
  })
}

function syncLiveState() {
  const particles = mapContainer.value?.querySelectorAll<HTMLElement>('.line-monitor-flow-particle')
  particles?.forEach((particle) => particle.classList.toggle('is-paused', !props.isLive))
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

    if (orderedDevices.value.length >= 2) {
      const path = orderedDevices.value.map((device) => device.coordinate)
      overlays.push(
        new AMapApi.Polyline({
          path,
          strokeColor: '#0b3151',
          strokeOpacity: 0.92,
          strokeWeight: 11,
          lineJoin: 'round',
          lineCap: 'round',
          zIndex: 38,
        }),
        new AMapApi.Polyline({
          path,
          strokeColor: props.status === 'warning' ? '#f5a623' : '#20d9f5',
          strokeOpacity: 0.96,
          strokeWeight: 5,
          lineJoin: 'round',
          lineCap: 'round',
          showDir: true,
          zIndex: 42,
        }),
      )
    }

    orderedDevices.value.forEach((device, index) => {
      const marker = new AMapApi!.Marker({
        position: device.coordinate,
        content: createDeviceContent(device),
        anchor: 'center',
        zIndex: 62,
      })
      marker.on('click', () => emit('select-device', device.id))
      overlays.push(marker)

      const nextDevice = orderedDevices.value[index + 1]
      if (nextDevice) {
        overlays.push(
          new AMapApi!.Marker({
            position: midpoint(device, nextDevice),
            content: createFlowContent(),
            anchor: 'center',
            zIndex: 48,
          }),
        )
      }
    })

    if (overlays.length) {
      map.add(overlays)
      map.setFitView(overlays, false, [65, 85, 65, 85])
    }
    isLoading.value = false
    syncSelectedDevice()
    syncLiveState()
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
watch(() => props.isLive, syncLiveState)
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
      <span>{{ line.name }} · 设备位置、线路状态与实时数据流</span>
    </div>

    <div class="line-monitor-map-tools">
      <button type="button"><svg><use href="#icon-layers" /></svg>地图底图</button>
      <button type="button" @click="focusLine"><svg><use href="#icon-crosshair" /></svg>线路全景</button>
    </div>

    <div v-if="isLoading" class="line-monitor-map-loading">
      <i></i><span>正在加载线路地图</span>
    </div>
    <div v-else-if="loadError" class="line-monitor-map-error" role="alert">
      <svg><use href="#icon-warning" /></svg>
      <div><strong>地图加载失败</strong><span>{{ loadError }}</span></div>
    </div>

    <div v-if="line.devices.length === 0 && !isLoading" class="line-monitor-map-empty">
      <svg><use href="#icon-map-points" /></svg>
      <strong>尚未生成线路态势</strong>
      <span>请先在线路管理中绑定至少两个定位设备</span>
    </div>

    <div class="line-monitor-live-state" :class="{ 'is-paused': !isLive }">
      <i></i>{{ isLive ? '实时数据流接收中' : '实时刷新已暂停' }}
    </div>

    <div class="line-monitor-map-legend">
      <span><i class="line-monitor-state-dot is-online"></i>在线</span>
      <span><i class="line-monitor-state-dot is-warning"></i>异常</span>
      <span><i class="line-monitor-state-dot is-offline"></i>离线</span>
    </div>
  </section>
</template>
