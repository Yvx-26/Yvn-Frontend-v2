<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import type { ManagedDevice, ManagedLine } from '../../../../domain/infrastructure/types'
import { loadAmap } from '../../../fault-map/fault-distribution/amap-loader'
import type {
  AMapMapInstance,
  AMapNamespace,
  AMapOverlay,
} from '../../../fault-map/fault-distribution/types'

const props = defineProps<{
  device: ManagedDevice
  locationDevice?: ManagedDevice
  line?: ManagedLine
}>()

const mapContainer = ref<HTMLElement>()
const isLoading = ref(true)
const loadError = ref('')
const locationSource = computed(() => props.locationDevice ?? props.device)
const overlays: AMapOverlay[] = []
let map: AMapMapInstance | undefined
let AMapApi: AMapNamespace | undefined
let initializationId = 0

const mapSignature = computed(() => {
  const source = locationSource.value
  const route = props.line?.devices
    .map((device) => `${device.id}:${device.coordinate.join(',')}`)
    .join('|')
  return `${source.id}:${source.coordinate.join(',')}:${source.state}:${route ?? ''}`
})

function createMarkerContent() {
  const wrapper = document.createElement('div')
  wrapper.className = `device-config-map-marker is-${locationSource.value.state}`
  const point = document.createElement('i')
  const label = document.createElement('span')
  label.textContent = locationSource.value.id
  wrapper.append(point, label)
  return wrapper
}

function clearMap() {
  map?.destroy()
  map = undefined
  overlays.splice(0)
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
      center: locationSource.value.coordinate,
      zoom: 13,
      mapStyle: 'amap://styles/darkblue',
      resizeEnable: true,
      showLabel: true,
      viewMode: '2D',
    })

    const routeDevices = props.line?.devices.slice().sort((left, right) => left.sequence - right.sequence)
    if (routeDevices && routeDevices.length >= 2) {
      overlays.push(
        new AMapApi.Polyline({
          path: routeDevices.map((device) => device.coordinate),
          strokeColor: '#20d9f5',
          strokeOpacity: 0.72,
          strokeWeight: 5,
          lineJoin: 'round',
          lineCap: 'round',
          showDir: true,
          zIndex: 35,
        }),
      )
    }

    overlays.push(
      new AMapApi.Circle({
        center: locationSource.value.coordinate,
        radius: 420,
        strokeColor: '#20d9f5',
        strokeOpacity: 0.45,
        strokeWeight: 1,
        fillColor: '#20d9f5',
        fillOpacity: 0.08,
        zIndex: 38,
      }),
      new AMapApi.Marker({
        position: locationSource.value.coordinate,
        content: createMarkerContent(),
        anchor: 'center',
        zIndex: 60,
      }),
    )

    map.add(overlays)
    map.setFitView(overlays, false, [42, 44, 42, 44])
    isLoading.value = false
  } catch (error) {
    isLoading.value = false
    loadError.value = error instanceof Error ? error.message : '高德地图初始化失败'
  }
}

function focusLocation() {
  map?.setZoomAndCenter(14, locationSource.value.coordinate)
}

watch(mapSignature, initializeMap)
onMounted(initializeMap)
onBeforeUnmount(() => {
  initializationId += 1
  clearMap()
})
</script>

<template>
  <div class="device-config-location-map-shell">
    <div ref="mapContainer" class="device-config-location-map"></div>

    <div v-if="isLoading" class="device-config-map-loading">
      <i></i><span>正在加载定位地图</span>
    </div>
    <div v-else-if="loadError" class="device-config-map-error" role="alert">
      <svg><use href="#icon-warning" /></svg>
      <div><strong>地图加载失败</strong><span>{{ loadError }}</span></div>
    </div>

    <div class="device-config-map-source">
      定位来源：{{
        device.category === 'monitor'
          ? locationDevice?.id || '未关联定位设备'
          : '本机坐标'
      }}
    </div>
    <button type="button" class="device-config-map-focus" @click="focusLocation">
      <svg><use href="#icon-crosshair" /></svg>重新定位
    </button>
    <div class="device-config-map-coordinate">
      {{ locationSource.coordinate[0].toFixed(6) }},
      {{ locationSource.coordinate[1].toFixed(6) }}
    </div>
  </div>
</template>
