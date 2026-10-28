<script setup lang="ts">
defineProps<{
  enabledLayerNames: string[]
  overlayOpacity: number
}>()

const emit = defineEmits<{
  'update-opacity': [value: number]
}>()

function updateOpacity(event: Event) {
  emit('update-opacity', Number((event.target as HTMLInputElement).value))
}
</script>

<template>
  <aside class="map-layer-summary-panel">
    <header>
      <div><strong>显示设置</strong><span>当前图层效果与图例</span></div>
      <em>实时生效</em>
    </header>

    <section class="map-layer-summary-section">
      <h3>图层透明度</h3>
      <div class="map-layer-opacity-label">
        <span>业务覆盖物</span><strong>{{ overlayOpacity }}%</strong>
      </div>
      <input
        type="range"
        min="25"
        max="100"
        :value="overlayOpacity"
        aria-label="业务图层透明度"
        @input="updateOpacity"
      />
    </section>

    <section class="map-layer-summary-section">
      <h3>地图图例</h3>
      <div class="map-layer-legend">
        <span><i class="is-normal"></i>正常线路</span>
        <span><i class="is-warning"></i>预警线路</span>
        <span><i class="is-fault"></i>故障线路</span>
        <span><i class="is-device"></i>定位设备</span>
      </div>
    </section>

    <section class="map-layer-summary-section">
      <h3>当前显示</h3>
      <div class="map-layer-visible-list" aria-live="polite">
        <span v-for="name in enabledLayerNames" :key="name">{{ name }}</span>
        <span v-if="enabledLayerNames.length === 0" class="is-empty">仅显示基础地图</span>
      </div>
    </section>

    <section class="map-layer-summary-section">
      <h3>显示范围</h3>
      <p>当前线路定位范围 · 高德地图底图</p>
      <p>线路由定位设备坐标依次生成</p>
    </section>
  </aside>
</template>
