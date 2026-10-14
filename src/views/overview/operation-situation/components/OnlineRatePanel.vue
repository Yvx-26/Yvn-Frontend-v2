<script setup lang="ts">
import { computed } from 'vue'
import type { TrendPoint } from '../types'

const props = defineProps<{
  points: TrendPoint[]
}>()

const currentRate = computed(() => props.points[props.points.length - 1]?.value ?? 0)
</script>

<template>
  <section class="operation-situation-panel operation-situation-online-panel">
    <header class="operation-situation-panel-header">
      <div>
        <strong>设备在线率趋势</strong>
        <span>当前查询结果</span>
      </div>
      <span>按最近 90 秒上报判断</span>
    </header>

    <div class="operation-situation-online-body">
      <div class="operation-situation-online-value">
        <strong>{{ currentRate }}%</strong>
        <span>当前在线率</span>
      </div>
      <div class="operation-situation-online-bars" aria-label="当前设备在线率">
        <i v-for="point in points" :key="point.label" :style="{ height: `${point.value}%` }"></i>
      </div>
      <div class="operation-situation-small-axis">
        <span>{{ points[0]?.label }}</span>
        <span>{{ points[points.length - 1]?.label }}</span>
      </div>
    </div>
  </section>
</template>
