<script setup lang="ts">
import { computed } from 'vue'
import type { LineVolume } from '../types'

const props = defineProps<{
  lines: LineVolume[]
}>()

const maximum = computed(() => Math.max(...props.lines.map((line) => line.value)))

function barWidth(value: number) {
  return `${maximum.value ? (value / maximum.value) * 100 : 0}%`
}
</script>

<template>
  <section class="operation-situation-panel operation-situation-volume-panel">
    <header class="operation-situation-panel-header">
      <div>
        <strong>各线路数据量</strong>
        <span>今日累计波形帧</span>
      </div>
      <span>单位：帧</span>
    </header>

    <div class="operation-situation-volume-body">
      <article v-for="line in lines" :key="line.id">
        <span class="asset-truncate" :title="line.name">{{ line.name }}</span>
        <i><i :style="{ width: barWidth(line.value) }"></i></i>
        <strong>{{ line.value }}</strong>
      </article>
    </div>
  </section>
</template>
