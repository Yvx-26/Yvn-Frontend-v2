<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import type { BoundLineDevice } from '../../../../domain/infrastructure/types'
import { loadAmap } from '../../../fault-map/fault-distribution/amap-loader'
import type {
  AMapMapInstance,
  AMapNamespace,
  AMapOverlay,
} from '../../../fault-map/fault-distribution/types'

const props = defineProps<{
  devices: BoundLineDevice[]
  selectedDeviceId: string
}>()

const emit = defineEmits<{
  'select-device': [deviceId: string]
  'update-device': [device: BoundLineDevice]
}>()

const mapContainer = ref<HTMLElement>()
const isLoading = ref(true)
const loadError = ref('')
const markerElements = new Map<string, HTMLElement>()
const overlays: AMapOverlay[] = []
let map: AMapMapInstance | undefined
let AMapApi: AMapNamespace | undefined
let initializationId = 0

const selectedDevice = computed(() =>
  props.devices.find((device) => device.id === props.selectedDeviceId),
)

const deviceSignature = computed(() =>
  props.devices
    .map((device) => `${device.id}:${device.sequence}:${device.coordinate.join(',')}`)
    .join('|'),
)

function createDeviceContent(device: BoundLineDevice) {
  const marker = document.createElement('button')
  marker.type = 'button'
  marker.className = `line-route-device-marker is-${device.state}`
  marker.innerHTML = `<i>${String(device.sequence).padStart(2, '0')}</i><span><strong>${device.id}</strong><small>${device.position}</small></span>`
  marker.setAttribute('aria-label', `第${device.sequence}个定位设备，${device.id}，${device.position}`)
  markerElements.set(device.id, marker)
  return marker
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

    const orderedDevices = props.devices.slice().sort((left, right) => left.sequence - right.sequence)
    const center = orderedDevices[0]?.coordinate ?? [113.545, 34.818]
    map = new AMapApi.Map(mapContainer.value, {
      center,
      zoom: 12,
      mapStyle: 'amap://styles/darkblue',
      resizeEnable: true,
      showLabel: true,
      viewMode: '2D',
    })

    if (orderedDevices.length >= 2) {
      overlays.push(
        new AMapApi.Polyline({
          path: orderedDevices.map((device) => device.coordinate),
          strokeColor: '#20d9f5',
          strokeOpacity: 0.95,
          strokeWeight: 7,
          lineJoin: 'round',
          lineCap: 'round',
          showDir: true,
          zIndex: 42,
        }),
      )
    }

    orderedDevices.forEach((device) => {
      const marker = new AMapApi!.Marker({
        position: device.coordinate,
        content: createDeviceContent(device),
        anchor: 'center',
        zIndex: 62,
      })
      marker.on('click', () => emit('select-device', device.id))
      overlays.push(marker)
    })

    if (overlays.length) {
      map.add(overlays)
      map.setFitView(overlays, false, [70, 90, 70, 90])
    }
    isLoading.value = false
    syncSelectedDevice()
  } catch (error) {
    isLoading.value = false
    loadError.value = error instanceof Error ? error.message : '高德地图初始化失败'
  }
}

function focusRoute() {
  if (overlays.length) map?.setFitView(overlays, false, [70, 90, 70, 90])
}

watch(deviceSignature, initializeMap)
watch(() => props.selectedDeviceId, syncSelectedDevice)
onMounted(initializeMap)
onBeforeUnmount(() => {
  initializationId += 1
  clearMap()
})
</script>

<template>
  <section class="line-route-map-shell" aria-label="线路地图路径">
    <div ref="mapContainer" class="line-route-map"></div>

    <div v-if="isLoading" class="line-route-map-loading">
      <span></span><strong>正在加载线路地图</strong>
    </div>
    <div v-else-if="loadError" class="line-route-map-error" role="alert">
      <svg><use href="#icon-warning" /></svg>
      <div><strong>地图加载失败</strong><span>{{ loadError }}</span></div>
    </div>

    <div v-if="devices.length < 2 && !isLoading" class="line-route-map-empty">
      <svg><use href="#icon-map-points" /></svg>
      <strong>尚未生成线路路径</strong>
      <span>绑定至少两个定位设备后自动生成</span>
    </div>

    <div class="line-route-map-tools">
      <button type="button" @click="focusRoute"><svg><use href="#icon-crosshair" /></svg>线路全景</button>
    </div>

    <div class="line-route-map-coordinate">
      <template v-if="selectedDevice">
        {{ selectedDevice.id }} · {{ selectedDevice.coordinate[0].toFixed(4) }},
        {{ selectedDevice.coordinate[1].toFixed(4) }}
      </template>
      <template v-else>请选择定位设备</template>
    </div>
  </section>
</template>
