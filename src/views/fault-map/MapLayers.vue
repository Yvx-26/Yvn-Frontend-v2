<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { useInfrastructureStore } from '../../stores/infrastructure'
import LayerControlPanel from './map-layers/components/LayerControlPanel.vue'
import LayerMap from './map-layers/components/LayerMap.vue'
import LayerSummaryPanel from './map-layers/components/LayerSummaryPanel.vue'
import { layerItems } from './map-layers/data'
import type {
  BaseMapType,
  LayerVisibility,
  MapLayerKey,
  StatusVisibility,
} from './map-layers/types'
import type { CableLineStatus } from './fault-distribution/types'
import type { CableLine } from './fault-distribution/types'
import './map-layers/map-layers.css'

const infrastructureStore = useInfrastructureStore()
const colors = ['#00d8ff', '#3c8cff', '#f5a623', '#8c7bff']
const cableLines = computed<CableLine[]>(() =>
  infrastructureStore.lines
    .filter((line) => line.devices.length > 0)
    .map((line, lineIndex): CableLine => {
      const devices = line.devices
        .filter((device) => device.coordinate[0] !== 0 || device.coordinate[1] !== 0)
        .map((device) => ({
          id: device.id,
          name: device.name,
          sequence: device.sequence,
          coordinate: device.coordinate,
          status: device.state,
          statusLabel:
            device.state === 'online' ? '在线' : device.state === 'warning' ? '数据预警' : '离线',
          latency: device.latencyMs == null ? '--' : `${device.latencyMs} ms`,
          lastUpload: device.lastSeen,
        }))
      const warning = devices.some((device) => device.status !== 'online')
      return {
        id: line.id,
        name: line.name,
        length: line.lengthKm ? `${line.lengthKm} km` : '--',
        status: warning ? 'warning' : 'normal',
        statusLabel: warning ? '存在离线设备' : '运行正常',
        color: colors[lineIndex % colors.length]!,
        devices,
      }
    })
    .filter((line) => line.devices.length > 0),
)

const baseMap = ref<BaseMapType>('dark')
const overlayOpacity = ref(85)
const layerVisibility = reactive<LayerVisibility>({
  lines: true,
  devices: true,
  faults: true,
  warningAreas: true,
  boundary: true,
  labels: true,
})
const statusVisibility = reactive<StatusVisibility>({
  normal: true,
  warning: true,
  fault: true,
})

const enabledLayerNames = computed(() =>
  layerItems.filter((item) => layerVisibility[item.id]).map((item) => item.label),
)

function toggleLayer(key: MapLayerKey) {
  layerVisibility[key] = !layerVisibility[key]
}

function toggleStatus(status: CableLineStatus) {
  statusVisibility[status] = !statusVisibility[status]
}
</script>

<template>
  <section class="map-layers-page" aria-label="地图图层">
    <LayerMap
      :base-map="baseMap"
      :layer-visibility="layerVisibility"
      :lines="cableLines"
      :overlay-opacity="overlayOpacity"
      :status-visibility="statusVisibility"
    />

    <div class="map-layers-service-state"><i></i>地图服务正常 · 图层配置实时生效</div>

    <LayerControlPanel
      :base-map="baseMap"
      :layer-visibility="layerVisibility"
      :status-visibility="statusVisibility"
      @select-base-map="baseMap = $event"
      @toggle-layer="toggleLayer"
      @toggle-status="toggleStatus"
    />

    <LayerSummaryPanel
      :enabled-layer-names="enabledLayerNames"
      :overlay-opacity="overlayOpacity"
      @update-opacity="overlayOpacity = $event"
    />
  </section>
</template>
