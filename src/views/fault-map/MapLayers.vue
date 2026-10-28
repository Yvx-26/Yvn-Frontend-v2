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
import type { CableLineStatus } from '../../domain/map/types'
import { toCableLines } from '../../domain/map/lines'
import './map-layers/map-layers.css'

const infrastructureStore = useInfrastructureStore()
const cableLines = computed(() => toCableLines(infrastructureStore.lines))

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

    <div class="map-layers-service-state">
      <i></i>{{ infrastructureStore.backendConnected ? '数据持续同步' : '数据连接异常' }} ·
      图层配置实时生效
    </div>

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
