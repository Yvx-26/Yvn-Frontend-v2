<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, useId, watch } from 'vue'
import type { WaveMonitorRuntime } from '../types'
import { toSignedSample } from '../../../../utils/waveform'

const props = defineProps<{
  runtime: WaveMonitorRuntime
  isLive: boolean
  selectedPhasePair: string | null
}>()

const emit = defineEmits<{
  selectPhase: [phasePair: string]
  scrollHistory: [delta: number]
}>()

const chartContainer = ref<HTMLElement>()
const cursorTip = ref<HTMLElement>()
const wavePanel = ref<HTMLElement>()
const chartWidth = ref(620)
const chartHeight = ref(280)
const cursorTipWidth = ref(240)
const isNativeFullscreen = ref(false)
const isFallbackFullscreen = ref(false)
// 横纵轴共用同一个倍率；只变换视窗，不改变原始采样数据。
const zoomFactors = [1, 1.5, 2, 3, 4, 6, 8, 12, 16, 24, 32, 48, 64]
const clipId = `wave-plot-${useId()}`
const viewport = ref({ xMin: 0, xMax: 3999, yMin: -150, yMax: 150 })
const zoomAnchor = ref<{ x: number; y: number } | null>(null)
let wheelDelta = 0
const zoomIndex = ref(0)
const cursorSampleIndex = ref(0)
let resizeObserver: ResizeObserver | undefined

// 为轴标题预留独立区域，避免与两端刻度值发生文字重叠。
const margin = { top: 34, right: 24, bottom: 52, left: 58 }
const plotWidth = computed(() => Math.max(180, chartWidth.value - margin.left - margin.right))
const plotHeight = computed(() => Math.max(130, chartHeight.value - margin.top - margin.bottom))
const sampleCount = computed(() => props.runtime.waveformSamples.length)
const isFullscreen = computed(() => isNativeFullscreen.value || isFallbackFullscreen.value)
const visibleStart = computed(() => viewport.value.xMin)
const visibleEnd = computed(() => viewport.value.xMax)
const zoomFactor = computed(() => zoomFactors[zoomIndex.value] ?? 1)
const cursorRatio = computed(
  () =>
    (cursorSampleIndex.value - visibleStart.value) /
    Math.max(1, visibleEnd.value - visibleStart.value),
)
const cursorVisible = computed(
  () => sampleCount.value > 0 && cursorRatio.value >= 0 && cursorRatio.value <= 1,
)

function formatTick(value: number) {
  return Number(value.toFixed(2)).toString()
}

const horizontalGrid = computed(() =>
  Array.from({ length: 7 }, (_, index) => ({
    value: formatTick(
      viewport.value.yMax - (index / 6) * (viewport.value.yMax - viewport.value.yMin),
    ),
    y: margin.top + (index / 6) * plotHeight.value,
  })),
)

const verticalGrid = computed(() =>
  Array.from({ length: 6 }, (_, index) => ({
    value: formatTick(visibleStart.value + (index / 5) * (visibleEnd.value - visibleStart.value)),
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
    const state = props.runtime.phaseStates[phasePair]
    // 当前相间与主波形、右侧详情使用同一帧；其他相间仍各自取最新帧。
    const isCurrentFrame = props.runtime.frameId !== null && props.runtime.phase === phasePair
    const valid = isCurrentFrame ? props.runtime.frameValid === true : state?.frame_valid === true
    const type = isCurrentFrame ? props.runtime.faultType : state?.result?.type
    const distance = isCurrentFrame ? props.runtime.faultDistanceM : state?.result?.distance_m
    const hasFrame = isCurrentFrame || state?.frame_id != null
    return {
      phasePair,
      isCurrentFrame,
      faultType: valid
        ? type
          ? (faultTypeLabels[type] ?? type)
          : '--'
        : hasFrame
          ? '帧无效'
          : '暂无数据',
      distance: valid && distance != null ? `${distance} m` : '--',
      faultCode: valid ? (type === 'SHORT' ? 2 : type === 'OPEN' ? 1 : 0) : undefined,
    }
  }),
)

function scrollPhaseHistory(event: WheelEvent, phase: string) {
  if (props.selectedPhasePair !== phase) return
  event.preventDefault()
  emit(
    'scrollHistory',
    (event.deltaY || event.deltaX) * (event.deltaMode === 1 ? 24 : event.deltaMode === 2 ? 300 : 1),
  )
}

function xToPixel(ratio: number) {
  return margin.left + ratio * plotWidth.value
}

function yToPixel(value: number) {
  return (
    margin.top +
    ((viewport.value.yMax - value) / (viewport.value.yMax - viewport.value.yMin)) * plotHeight.value
  )
}

const tracePath = computed(() => {
  // 保留视窗边界外相邻一点，裁剪后的折线仍与原始采样位置准确对应。
  const start = Math.max(0, Math.floor(visibleStart.value))
  const end = Math.min(sampleCount.value - 1, Math.ceil(visibleEnd.value))
  const path: string[] = []
  for (let index = start; index <= end; index += 1) {
    const value = toSignedSample(props.runtime.waveformSamples[index] ?? 0)
    const x = xToPixel(
      (index - visibleStart.value) / Math.max(1, visibleEnd.value - visibleStart.value),
    )
    path.push(`${index === start ? 'M' : 'L'} ${x.toFixed(2)} ${yToPixel(value).toFixed(2)}`)
  }
  return path.join(' ')
})

const cursorX = computed(() => xToPixel(cursorRatio.value))
const cursorRawValue = computed(() => props.runtime.waveformSamples[cursorSampleIndex.value] ?? 0)
const cursorValue = computed(() => toSignedSample(cursorRawValue.value))
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
  if (cursorTip.value)
    cursorTipWidth.value = Math.ceil(cursorTip.value.getBoundingClientRect().width)
}

function positionInPlot(event: MouseEvent) {
  const svg = chartContainer.value?.querySelector('svg')
  if (!svg) return null
  const rect = svg.getBoundingClientRect()
  if (!rect.width || !rect.height) return null
  // 用 SVG 实际尺寸换算，窗口变化及全屏后仍与 viewBox 坐标一致。
  const x = ((event.clientX - rect.left) / rect.width) * chartWidth.value
  const y = ((event.clientY - rect.top) / rect.height) * chartHeight.value
  const rx = (x - margin.left) / plotWidth.value
  const ry = (y - margin.top) / plotHeight.value
  if (rx < 0 || rx > 1 || ry < 0 || ry > 1) return null
  return { rx, ry }
}

function anchorAt(rx: number) {
  const view = viewport.value
  const x = Math.max(
    0,
    Math.min(sampleCount.value - 1, Math.round(view.xMin + rx * (view.xMax - view.xMin))),
  )
  // 缩放中心吸附到实际采样点，纵坐标以样本值为准。
  return { x, y: toSignedSample(props.runtime.waveformSamples[x] ?? 0) }
}

function placeCursor(event: MouseEvent) {
  const position = positionInPlot(event)
  if (!position || !sampleCount.value) return
  zoomAnchor.value = anchorAt(position.rx)
  cursorSampleIndex.value = zoomAnchor.value.x
  wheelDelta = 0
}

function resetZoom() {
  zoomIndex.value = 0
  viewport.value = { xMin: 0, xMax: Math.max(1, sampleCount.value - 1), yMin: -150, yMax: 150 }
  zoomAnchor.value = null
  cursorSampleIndex.value = 0
  wheelDelta = 0
}

function setZoom(nextIndex: number) {
  if (sampleCount.value < 2) return
  const next = Math.max(0, Math.min(zoomFactors.length - 1, nextIndex))
  if (next === zoomIndex.value) return
  const anchor = zoomAnchor.value ?? anchorAt(0.5)
  const factor = zoomFactors[next] ?? 1
  const fullXSpan = sampleCount.value - 1
  const xSpan = fullXSpan / factor
  const ySpan = 300 / factor
  // 局部视图以选中采样点为正中心，而不是固定其原来的屏幕比例。
  // 边缘允许留白，避免靠近首尾的采样点因边界钳制而无法居中。
  const xMin = next === 0 ? 0 : anchor.x - xSpan / 2
  const yMin = next === 0 ? -150 : anchor.y - ySpan / 2
  zoomIndex.value = next
  viewport.value = { xMin, xMax: xMin + xSpan, yMin, yMax: yMin + ySpan }
  zoomAnchor.value = anchor
  cursorSampleIndex.value = anchor.x
}

function zoomIn() {
  setZoom(zoomIndex.value + 1)
}

function zoomOut() {
  setZoom(zoomIndex.value - 1)
}

function handleWheel(event: WheelEvent) {
  const position = positionInPlot(event)
  if (!position || sampleCount.value < 2 || event.deltaY === 0) return
  event.preventDefault()
  if (!zoomAnchor.value) zoomAnchor.value = anchorAt(position.rx)
  const delta =
    event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? chartHeight.value : 1)
  if (Math.sign(delta) !== Math.sign(wheelDelta)) wheelDelta = 0
  wheelDelta += delta
  if (Math.abs(wheelDelta) < 40) return
  setZoom(zoomIndex.value + (wheelDelta < 0 ? 1 : -1))
  wheelDelta = 0
}

function handleFullscreenChange() {
  isNativeFullscreen.value = document.fullscreenElement === wavePanel.value
}

function handleFullscreenKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape' && isFallbackFullscreen.value) {
    isFallbackFullscreen.value = false
  }
}

async function toggleFullscreen() {
  const panel = wavePanel.value
  if (!panel) return

  if (isNativeFullscreen.value) {
    await document.exitFullscreen?.()
    return
  }

  if (isFallbackFullscreen.value) {
    isFallbackFullscreen.value = false
    return
  }

  if (panel.requestFullscreen) {
    try {
      await panel.requestFullscreen()
      return
    } catch {
      // 浏览器拒绝原生全屏时，仍以铺满视口的方式提供完整行波视图。
    }
  }

  isFallbackFullscreen.value = true
}

watch(() => [props.runtime.frameId, sampleCount.value], resetZoom, { immediate: true })

onMounted(() => {
  updateSize()
  chartContainer.value?.addEventListener('wheel', handleWheel, { passive: false })
  resizeObserver = new ResizeObserver(updateSize)
  if (chartContainer.value) resizeObserver.observe(chartContainer.value)
  if (cursorTip.value) resizeObserver.observe(cursorTip.value)
  document.addEventListener('fullscreenchange', handleFullscreenChange)
  window.addEventListener('keydown', handleFullscreenKeydown)
})

onBeforeUnmount(() => {
  chartContainer.value?.removeEventListener('wheel', handleWheel)
  resizeObserver?.disconnect()
  document.removeEventListener('fullscreenchange', handleFullscreenChange)
  window.removeEventListener('keydown', handleFullscreenKeydown)
})
</script>

<template>
  <section
    ref="wavePanel"
    class="wave-monitor-wave-panel"
    :class="{ 'is-fullscreen-fallback': isFallbackFullscreen }"
  >
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
          采样点 {{ formatTick(visibleStart) }}–{{ formatTick(visibleEnd) }} / {{ sampleCount }} ·
          {{ zoomFactor }}×
        </span>
        <button
          type="button"
          aria-label="缩小波形"
          title="将选中采样点居中，等比例缩小横纵坐标"
          :disabled="zoomIndex === 0"
          @click="zoomOut"
        >
          <svg><use href="#icon-zoom-out" /></svg>
        </button>
        <button
          type="button"
          aria-label="放大波形"
          title="将选中采样点居中，等比例放大横纵坐标"
          :disabled="sampleCount < 2 || zoomIndex === zoomFactors.length - 1"
          @click="zoomIn"
        >
          <svg><use href="#icon-zoom-in" /></svg>
        </button>
        <button
          type="button"
          aria-label="重置波形缩放"
          title="恢复完整波形和坐标范围（也可双击图形）"
          :disabled="zoomIndex === 0"
          @click="resetZoom"
        >
          ↺
        </button>
        <button
          type="button"
          class="wave-monitor-fullscreen-button"
          :aria-label="isFullscreen ? '退出实时行波全屏' : '全屏查看实时行波'"
          :aria-pressed="isFullscreen"
          :title="isFullscreen ? '退出全屏' : '全屏查看实时行波'"
          @click="toggleFullscreen"
        >
          <svg>
            <use :href="isFullscreen ? '#icon-exit-fullscreen' : '#icon-fullscreen'" />
          </svg>
        </button>
      </div>
    </div>

    <div
      ref="chartContainer"
      class="wave-monitor-chart-wrap"
      title="点击选中采样点，滚轮缩放时将该点移至中心，双击复位"
      @click="placeCursor"
      @dblclick="resetZoom"
    >
      <svg
        class="wave-monitor-wave-svg"
        :viewBox="`0 0 ${chartWidth} ${chartHeight}`"
        role="img"
        aria-label="实时行波采样曲线，横轴为采样点序号，纵轴为原始字节转换后的有符号采样值"
      >
        <title>实时行波幅值曲线</title>
        <desc>
          横轴为原始采样点序号，纵轴为原始字节转换后的有符号采样值。点击选择缩放中心，
          使用滚轮或加减按钮将选中采样点居中，并等比例缩放横纵坐标；双击或点击复位恢复完整视图。
        </desc>

        <defs>
          <clipPath :id="clipId">
            <rect :x="margin.left" :y="margin.top" :width="plotWidth" :height="plotHeight" />
          </clipPath>
        </defs>
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
        <g :clip-path="`url(#${clipId})`">
          <path class="wave-monitor-trace" :d="tracePath" />
          <line
            class="wave-monitor-cursor-line"
            :x1="cursorX"
            :y1="margin.top"
            :x2="cursorX"
            :y2="chartHeight - margin.bottom"
          />
          <circle class="wave-monitor-cursor-point" :cx="cursorX" :cy="cursorY" r="4" />
        </g>
      </svg>

      <div v-if="!sampleCount" class="wave-monitor-empty-chart" role="status">
        {{ runtime.frameError || '等待波形数据' }}
      </div>
      <div
        v-show="cursorVisible"
        ref="cursorTip"
        class="wave-monitor-cursor-tip"
        :style="{ left: `${cursorTipLeft}px` }"
      >
        采样点 {{ cursorSampleIndex }} · 有符号值 {{ cursorValue }} · 原始字节 {{ cursorRawValue }}
      </div>
    </div>

    <div class="wave-monitor-frame-stats" aria-label="各相间最新帧故障状态">
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
        @click="emit('selectPhase', item.phasePair)"
        @wheel="scrollPhaseHistory($event, item.phasePair)"
      >
        <span>{{ item.phasePair }}</span>
        <strong>{{ item.faultType }}</strong>
        <small>{{ item.distance }}</small>
        <small>{{ item.isCurrentFrame ? '当前帧' : '最新帧' }}</small>
      </button>
    </div>
    <slot name="history"></slot>
  </section>
</template>
