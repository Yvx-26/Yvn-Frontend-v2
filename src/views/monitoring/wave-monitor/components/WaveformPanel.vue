<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import type { WaveMonitorRuntime } from '../types'

const props = defineProps<{
  runtime: WaveMonitorRuntime
  isLive: boolean
  selectedPhasePair: string | null
}>()

const emit = defineEmits<{
  selectPhase: [phasePair: string]
}>()

const chartContainer = ref<HTMLElement>()
const cursorTip = ref<HTMLElement>()
const chartWidth = ref(620)
const chartHeight = ref(280)
const cursorTipWidth = ref(240)
const zoomPointCounts = [4000, 2000, 1000, 500, 400, 300, 200]
const zoomIndex = ref(0)
const cursorSampleIndex = ref(0)
let resizeObserver: ResizeObserver | undefined

// 为轴标题预留独立区域，避免与两端刻度值发生文字重叠。
const margin = { top: 34, right: 24, bottom: 52, left: 58 }
const plotWidth = computed(() => Math.max(180, chartWidth.value - margin.left - margin.right))
const plotHeight = computed(() => Math.max(130, chartHeight.value - margin.top - margin.bottom))
const sampleCount = computed(() => props.runtime.waveformSamples.length)
const visiblePointCount = computed(() => {
  if (sampleCount.value === 0) return 0
  return Math.min(sampleCount.value, zoomPointCounts[zoomIndex.value] ?? 4000)
})
const visibleStart = computed(() => 0)
const visibleEnd = computed(() => (visiblePointCount.value > 0 ? visiblePointCount.value - 1 : 0))
const cursorRatio = computed(() => {
  const span = Math.max(1, visibleEnd.value - visibleStart.value)
  return Math.max(0, Math.min(1, (cursorSampleIndex.value - visibleStart.value) / span))
})
const visibleSamples = computed(() =>
  props.runtime.waveformSamples
    .slice(visibleStart.value, visibleEnd.value + 1)
    .map((value) => (value > 127 ? value - 256 : value)),
)
const yScale = { min: -150, max: 150 }

const horizontalGrid = computed(() =>
  Array.from({ length: 7 }, (_, index) => ({
    value: yScale.max - index * 50,
    y: margin.top + (index / 6) * plotHeight.value,
  })),
)

const verticalGrid = computed(() =>
  Array.from({ length: 6 }, (_, index) => ({
    value: Math.round(visibleStart.value + (index / 5) * (visibleEnd.value - visibleStart.value)),
    x: margin.left + (index / 5) * plotWidth.value,
  })),
)

const phasePairOrder = ['A-B', 'A-C', 'A-N', 'A-E', 'B-C', 'B-N', 'B-E', 'C-N', 'C-E', 'N-E']
const faultTypeLabels: Record<string, string> = {
  NORMAL: '正常',
  OPEN: '开路',
  SHORT: '短路',
}
const interphaseCards = computed(() =>
  phasePairOrder.map((phasePair) => {
    const result = props.runtime.interphaseResults[phasePair]
    return {
      phasePair,
      faultType: result ? (faultTypeLabels[result.type] ?? result.type) : '--',
      distance: result?.distance_m == null ? '--' : `${result.distance_m} m`,
      faultCode: result?.code,
    }
  }),
)

function xToPixel(ratio: number) {
  return margin.left + ratio * plotWidth.value
}

function yToPixel(value: number) {
  return margin.top + ((yScale.max - value) / (yScale.max - yScale.min)) * plotHeight.value
}

function tracePath() {
  if (visibleSamples.value.length === 0) return ''
  return visibleSamples.value
    .map((value, index) => {
      const ratio =
        visibleSamples.value.length === 1 ? 0 : index / (visibleSamples.value.length - 1)
      const x = xToPixel(ratio)
      const y = yToPixel(value)
      return `${index === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`
    })
    .join(' ')
}

const cursorX = computed(() => xToPixel(cursorRatio.value))
const cursorRawValue = computed(() => props.runtime.waveformSamples[cursorSampleIndex.value] ?? 0)
const cursorValue = computed(() =>
  cursorRawValue.value > 127 ? cursorRawValue.value - 256 : cursorRawValue.value,
)
const cursorY = computed(() => yToPixel(cursorValue.value))
const cursorTipLeft = computed(() => {
  const plotLeft = margin.left + 8
  const plotRight = chartWidth.value - margin.right - 8
  const centeredLeft = cursorX.value - cursorTipWidth.value / 2
  return Math.max(plotLeft, Math.min(centeredLeft, plotRight - cursorTipWidth.value))
})

function updateSize() {
  if (!chartContainer.value) return
  const rect = chartContainer.value.getBoundingClientRect()
  chartWidth.value = Math.max(300, Math.round(rect.width))
  chartHeight.value = Math.max(255, Math.round(rect.height))
  if (cursorTip.value) cursorTipWidth.value = Math.ceil(cursorTip.value.getBoundingClientRect().width)
}

function placeCursor(event: MouseEvent) {
  if (!chartContainer.value) return
  const rect = chartContainer.value.getBoundingClientRect()
  const localX = event.clientX - rect.left
  const ratio = Math.max(
    0,
    Math.min(1, (localX - margin.left) / Math.max(1, rect.width - margin.left - margin.right)),
  )
  cursorSampleIndex.value = Math.round(
    visibleStart.value + ratio * Math.max(0, visibleEnd.value - visibleStart.value),
  )
}

function zoomIn() {
  zoomIndex.value = Math.min(zoomPointCounts.length - 1, zoomIndex.value + 1)
  cursorSampleIndex.value = Math.min(cursorSampleIndex.value, visibleEnd.value)
}

function zoomOut() {
  zoomIndex.value = Math.max(0, zoomIndex.value - 1)
}

watch(
  () => props.runtime.frameId,
  () => {
    zoomIndex.value = 0
    cursorSampleIndex.value = 0
  },
  { immediate: true },
)

onMounted(() => {
  updateSize()
  resizeObserver = new ResizeObserver(updateSize)
  if (chartContainer.value) resizeObserver.observe(chartContainer.value)
  if (cursorTip.value) resizeObserver.observe(cursorTip.value)
})

onBeforeUnmount(() => resizeObserver?.disconnect())
</script>

<template>
  <section class="wave-monitor-wave-panel">
    <header>
      <div>
        <strong>实时行波视图</strong>
        <span
          >{{ runtime.phase ? `${runtime.phase} 相间` : '相间未知' }} · 单帧 4000 点采样数据</span
        >
      </div>
      <div class="monitor-panel-header-controls">
        <em class="wave-monitor-live-state" :class="{ 'is-paused': !isLive }"
          ><i></i>{{ isLive ? '实时刷新中' : '已暂停刷新' }}</em
        >
        <slot name="actions"></slot>
      </div>
    </header>

    <div class="wave-monitor-wave-toolbar">
      <div class="wave-monitor-current-phase">
        <span>当前相间</span>
        <strong>{{ runtime.phase ?? '--' }}</strong>
      </div>

      <div class="wave-monitor-view-actions">
        <span class="wave-monitor-zoom-range">
          采样点 {{ visibleStart }}–{{ visibleEnd }} / {{ sampleCount }}
        </span>
        <button
          type="button"
          aria-label="缩小波形"
          title="缩小，显示更多采样点"
          :disabled="zoomIndex === 0"
          @click="zoomOut"
        >
          <svg><use href="#icon-zoom-out" /></svg>
        </button>
        <button
          type="button"
          aria-label="放大波形"
          title="减少显示的前段采样点"
          :disabled="zoomIndex === zoomPointCounts.length - 1"
          @click="zoomIn"
        >
          <svg><use href="#icon-zoom-in" /></svg>
        </button>
      </div>
    </div>

    <div ref="chartContainer" class="wave-monitor-chart-wrap" @click="placeCursor">
      <svg
        class="wave-monitor-wave-svg"
        :viewBox="`0 0 ${chartWidth} ${chartHeight}`"
        role="img"
        aria-label="实时行波采样曲线，横轴为采样点序号，纵轴为原始字节转换后的有符号采样值"
      >
        <title>实时行波幅值曲线</title>
        <desc>
          横轴为采样点序号；纵轴为原始字节经过有符号转换后的采样值，范围固定为负 150 到正
          150。点击波形区域可移动测量游标，使用加减按钮可切换前段采样点数量。
        </desc>

        <g>
          <line
            v-for="item in horizontalGrid"
            :key="`h-${item.value}`"
            class="wave-monitor-grid-line"
            :x1="margin.left"
            :y1="item.y"
            :x2="chartWidth - margin.right"
            :y2="item.y"
          />
          <line
            v-for="item in verticalGrid"
            :key="`v-${item.value}`"
            class="wave-monitor-grid-line"
            :x1="item.x"
            :y1="margin.top"
            :x2="item.x"
            :y2="chartHeight - margin.bottom"
          />
        </g>

        <line
          class="wave-monitor-axis-line"
          :x1="margin.left"
          :y1="margin.top"
          :x2="margin.left"
          :y2="chartHeight - margin.bottom"
        />
        <line
          class="wave-monitor-axis-line"
          :x1="margin.left"
          :y1="chartHeight - margin.bottom"
          :x2="chartWidth - margin.right"
          :y2="chartHeight - margin.bottom"
        />

        <text
          v-for="item in horizontalGrid"
          :key="`hy-${item.value}`"
          class="wave-monitor-axis-label"
          :x="margin.left - 12"
          :y="item.y + 4"
          text-anchor="end"
        >
          {{ item.value }}
        </text>
        <text
          v-for="item in verticalGrid"
          :key="`vx-${item.value}`"
          class="wave-monitor-axis-label"
          :x="item.x"
          :y="chartHeight - margin.bottom + 20"
          text-anchor="middle"
        >
          {{ item.value }}
        </text>
        <text class="wave-monitor-axis-title" :x="margin.left" y="16" text-anchor="start">
          有符号采样值
        </text>
        <text
          class="wave-monitor-axis-title"
          :x="chartWidth - margin.right"
          :y="chartHeight - 7"
          text-anchor="end"
        >
          采样点
        </text>
        <path class="wave-monitor-trace" :d="tracePath()" />
        <line
          class="wave-monitor-cursor-line"
          :x1="cursorX"
          :y1="margin.top"
          :x2="cursorX"
          :y2="chartHeight - margin.bottom"
        />
        <circle class="wave-monitor-cursor-point" :cx="cursorX" :cy="cursorY" r="4" />
      </svg>

      <div ref="cursorTip" class="wave-monitor-cursor-tip" :style="{ left: `${cursorTipLeft}px` }">
        采样点 {{ cursorSampleIndex }} · 有符号值 {{ cursorValue }} · 原始字节 {{ cursorRawValue }}
      </div>
    </div>

    <div class="wave-monitor-frame-stats" aria-label="十组相间故障结果">
      <button
        v-for="item in interphaseCards"
        :key="item.phasePair"
        type="button"
        :class="{
          'is-current': item.phasePair === runtime.phase,
          'is-selected': item.phasePair === selectedPhasePair,
          'is-fault': item.faultCode === 1 || item.faultCode === 2,
        }"
        :aria-pressed="item.phasePair === selectedPhasePair"
        :title="`查看 ${item.phasePair} 相间最近一帧波形`"
        @click="emit('selectPhase', item.phasePair)"
      >
        <span>{{ item.phasePair }}</span>
        <strong>{{ item.faultType }}</strong>
        <small>{{ item.distance }}</small>
      </button>
    </div>
  </section>
</template>
