<script setup lang="ts">
import { computed } from 'vue'
import type { CableLineStatus } from '../../fault-distribution/types'
import { baseMapOptions, layerItems } from '../data'
import type {
  BaseMapType,
  LayerVisibility,
  MapLayerKey,
  StatusVisibility,
} from '../types'

const props = defineProps<{
  baseMap: BaseMapType
  layerVisibility: LayerVisibility
  statusVisibility: StatusVisibility
}>()

const emit = defineEmits<{
  'select-base-map': [baseMap: BaseMapType]
  'toggle-layer': [key: MapLayerKey]
  'toggle-status': [status: CableLineStatus]
}>()

const enabledCount = computed(
  () => layerItems.filter((item) => props.layerVisibility[item.id]).length,
)

const statuses: { id: CableLineStatus; label: string }[] = [
  { id: 'normal', label: '正常' },
  { id: 'warning', label: '预警' },
  { id: 'fault', label: '故障' },
]
</script>

<template>
  <aside class="map-layer-control-panel">
    <header>
      <div><strong>图层控制</strong><span>控制地图可见内容</span></div>
      <em>{{ enabledCount }} / {{ layerItems.length }}</em>
    </header>

    <section class="map-layer-control-section">
      <h3>底图类型</h3>
      <div class="map-layer-base-options">
        <button
          v-for="option in baseMapOptions"
          :key="option.id"
          type="button"
          :class="[`is-${option.id}`, { 'is-active': baseMap === option.id }]"
          @click="emit('select-base-map', option.id)"
        >
          <i></i><span>{{ option.label }}</span>
        </button>
      </div>
    </section>

    <section class="map-layer-control-section">
      <h3>业务图层</h3>
      <div class="map-layer-switch-list">
        <label v-for="item in layerItems" :key="item.id">
          <span><svg><use :href="`#icon-${item.icon}`" /></svg>{{ item.label }}</span>
          <input
            type="checkbox"
            :checked="layerVisibility[item.id]"
            :aria-label="`显示${item.label}`"
            @change="emit('toggle-layer', item.id)"
          />
        </label>
      </div>
    </section>

    <section class="map-layer-control-section">
      <h3>线路状态筛选</h3>
      <div class="map-layer-status-options">
        <label v-for="status in statuses" :key="status.id" :class="`is-${status.id}`">
          <input
            type="checkbox"
            :checked="statusVisibility[status.id]"
            @change="emit('toggle-status', status.id)"
          />
          <span>{{ status.label }}</span>
        </label>
      </div>
    </section>
  </aside>
</template>
