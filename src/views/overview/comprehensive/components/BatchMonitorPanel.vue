<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import { toSignedSample } from '../../../../utils/waveform'
import type { MonitoringFrame } from '../types'

const props = defineProps<{
  batch: MonitoringFrame
}>()

const chartWidth = 1000
const chartHeight = 180
const chartMargin = { top: 12, right: 12, bottom: 12, left: 12 }
const plotWidth = chartWidth - chartMargin.left - chartMargin.right
const plotHeight = chartHeight - chartMargin.top - chartMargin.bottom

const yBounds = computed(() => {
  if (props.batch.samples.length === 0) return { min: -1, max: 1 }
  const sourceMin = Math.min(props.batch.min, 0)
  const sourceMax = Math.max(props.batch.max, 0)
  const sourceSpan = Math.max(1, sourceMax - sourceMin)
  const padding = Math.max(2, sourceSpan * 0.14)
  return { min: sourceMin - padding, max: sourceMax + padding }
})

const horizontalGrid = computed(() =>
  Array.from({ length: 5 }, (_, index) => ({
    y: chartMargin.top + (index / 4) * plotHeight,
  })),
)
const verticalGrid = Array.from({ length: 5 }, (_, index) => ({
  id: index,
  x: chartMargin.left + (index / 4) * plotWidth,
}))

const tracePath = computed(() => {
  const samples = props.batch.samples
  if (samples.length === 0) return ''
  const { min, max } = yBounds.value
  return samples
    .map((sample, index) => {
      const ratio = samples.length === 1 ? 0 : index / (samples.length - 1)
      const x = chartMargin.left + ratio * plotWidth
      const value = toSignedSample(sample)
      const y = chartMargin.top + ((max - value) / (max - min)) * plotHeight
      return `${index === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`
    })
    .join(' ')
})

const zeroLineY = computed(() => {
  const { min, max } = yBounds.value
  return chartMargin.top + ((max - 0) / (max - min)) * plotHeight
})

const lastPoint = computed(() => {
  const samples = props.batch.samples
  if (!samples.length) return { x: chartMargin.left, y: zeroLineY.value }
  const { min, max } = yBounds.value
  const value = toSignedSample(samples[samples.length - 1]!)
  return {
    x: chartWidth - chartMargin.right,
    y: chartMargin.top + ((max - value) / (max - min)) * plotHeight,
  }
})
</script>

<template>
  <section class="overview-panel overview-batch-panel" aria-label="最新波形曲线">
    <header class="overview-wave-header">
      <strong>最新波形曲线</strong>
      <RouterLink
        :to="{ name: 'wave-monitor', query: batch.deviceId ? { device: batch.deviceId } : {} }"
        >查看详情</RouterLink
      >
    </header>
    <div class="overview-wave-chart" data-testid="latest-waveform">
      <svg
        :viewBox="`0 0 ${chartWidth} ${chartHeight}`"
        preserveAspectRatio="none"
        role="img"
        aria-label="最新波形曲线"
      >
        <title>最新波形曲线</title>
        <g>
          <line
            v-for="(item, index) in horizontalGrid"
            :key="`h-${index}`"
            class="overview-wave-grid-line"
            :x1="chartMargin.left"
            :y1="item.y"
            :x2="chartWidth - chartMargin.right"
            :y2="item.y"
          />
          <line
            v-for="item in verticalGrid"
            :key="`v-${item.id}`"
            class="overview-wave-grid-line"
            :x1="item.x"
            :y1="chartMargin.top"
            :x2="item.x"
            :y2="chartHeight - chartMargin.bottom"
          />
          <line
            class="overview-wave-zero-line"
            :x1="chartMargin.left"
            :y1="zeroLineY"
            :x2="chartWidth - chartMargin.right"
            :y2="zeroLineY"
          />
        </g>
        <g v-if="tracePath" :key="batch.id" class="overview-wave-frame">
          <path
            class="overview-wave-trace-glow overview-wave-trace-draw"
            :d="tracePath"
            pathLength="1"
          />
          <path class="overview-wave-trace" :d="tracePath" />
          <g class="overview-wave-latest-marker" aria-hidden="true">
            <circle class="overview-wave-latest-ring" :cx="lastPoint.x" :cy="lastPoint.y" r="7" />
            <circle class="overview-wave-latest-dot" :cx="lastPoint.x" :cy="lastPoint.y" r="2.7" />
          </g>
        </g>
      </svg>
      <div v-if="!tracePath" class="overview-wave-empty" :role="batch.error ? 'alert' : 'status'">
        {{ batch.error || '等待最新波形数据' }}
      </div>
    </div>
  </section>
</template>
