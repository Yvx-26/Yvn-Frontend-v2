<script setup lang="ts">
import { computed } from 'vue'
import type { TrendPoint } from '../types'

const props = defineProps<{
  points: TrendPoint[]
}>()

const total = computed(() => props.points.reduce((sum, point) => sum + point.value, 0))
const chartMaximum = computed(() => Math.max(1, ...props.points.map((point) => point.value)))
const latestPoint = computed(() => props.points[props.points.length - 1])

function barHeight(value: number) {
  return `${value ? Math.max((value / chartMaximum.value) * 100, 3) : 0}%`
}
</script>

<template>
  <section class="operation-situation-panel operation-situation-trend-panel">
    <header class="operation-situation-panel-header">
      <div>
        <strong>24 小时数据接收趋势</strong>
        <span>每 2 小时接收帧数</span>
      </div>
      <span>今日累计 {{ total.toLocaleString() }} 帧</span>
    </header>

    <div class="operation-situation-trend-body">
      <div class="operation-situation-y-axis">
        <span>{{ chartMaximum.toLocaleString() }}</span>
        <span>{{ Math.round(chartMaximum / 2).toLocaleString() }}</span>
        <span>0</span>
      </div>
      <div class="operation-situation-chart-area">
        <div class="operation-situation-bars" aria-label="过去二十四小时数据接收帧数">
          <article
            v-for="(point, index) in points"
            :key="point.label"
            :class="{ 'is-latest': index === points.length - 1 }"
          >
            <i :style="{ height: barHeight(point.value) }"></i>
          </article>
        </div>
        <div class="operation-situation-x-axis">
          <span v-for="point in points" :key="point.label">{{ point.label }}</span>
        </div>
      </div>
    </div>

    <div class="operation-situation-chart-summary">
      <span>数据来自今日 DEVICE_RAW_FRAME 入库记录</span>
      <strong>当前时段 {{ (latestPoint?.value ?? 0).toLocaleString() }} 帧</strong>
    </div>
  </section>
</template>
