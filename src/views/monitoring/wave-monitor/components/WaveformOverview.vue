<script setup lang="ts">
import { computed } from 'vue'
import { toSignedSample } from '../../../../utils/waveform'

const props = defineProps<{
  samples: number[]
  start: number
  end: number
}>()

const emit = defineEmits<{ pan: [start: number] }>()

const width = 1000
const height = 48
const fullSpan = computed(() => Math.max(1, props.samples.length - 1))
const span = computed(() => props.end - props.start)
const maxStart = computed(() => Math.max(0, fullSpan.value - span.value))
const trace = computed(() =>
  props.samples
    .map((sample, index) => {
      const x = (index / fullSpan.value) * width
      const y = height / 2 - (toSignedSample(sample) / 150) * (height / 2 - 2)
      return `${index === 0 ? 'M' : 'L'}${x.toFixed(2)} ${y.toFixed(2)}`
    })
    .join(' '),
)

let drag: { pointerId: number; offset: number } | undefined

function sampleAt(event: PointerEvent) {
  const rect = (event.currentTarget as SVGSVGElement).getBoundingClientRect()
  return rect.width ? ((event.clientX - rect.left) / rect.width) * fullSpan.value : null
}

function beginDrag(event: PointerEvent) {
  if (event.button !== 0 || maxStart.value === 0) return
  const sample = sampleAt(event)
  if (sample === null) return
  const offset =
    sample >= props.start && sample <= props.end ? sample - props.start : span.value / 2
  drag = { pointerId: event.pointerId, offset }
  const svg = event.currentTarget as SVGSVGElement
  svg.setPointerCapture?.(event.pointerId)
  emit('pan', sample - offset)
}

function moveDrag(event: PointerEvent) {
  if (!drag || event.pointerId !== drag.pointerId) return
  const sample = sampleAt(event)
  if (sample !== null) emit('pan', sample - drag.offset)
}

function endDrag(event: PointerEvent) {
  if (drag?.pointerId === event.pointerId) drag = undefined
}

function moveSlider(event: Event) {
  emit('pan', Number((event.target as HTMLInputElement).value))
}
</script>

<template>
  <div class="wave-monitor-overview">
    <div class="wave-monitor-overview-heading">
      <strong>整帧波形</strong>
      <span class="wave-monitor-zoom-range" aria-live="polite">
        采样点 {{ Math.round(start) }}–{{ Math.round(end) }} / {{ samples.length }} 点
      </span>
    </div>
    <svg
      class="wave-monitor-overview-svg"
      :class="{ 'is-pannable': maxStart > 0 }"
      :viewBox="`0 0 ${width} ${height}`"
      preserveAspectRatio="none"
      role="img"
      aria-label="整帧波形，选框标记主图范围。放大横轴后可拖动选框"
      @pointerdown="beginDrag"
      @pointermove="moveDrag"
      @pointerup="endDrag"
      @pointercancel="endDrag"
      @lostpointercapture="endDrag"
    >
      <path class="wave-monitor-overview-trace" :d="trace" />
      <rect
        class="wave-monitor-overview-window"
        :x="(start / fullSpan) * width"
        y="1"
        :width="(span / fullSpan) * width"
        :height="height - 2"
      />
    </svg>
    <input
      class="wave-monitor-overview-slider"
      type="range"
      aria-label="横向移动波形查看范围"
      :aria-valuetext="`从采样点 ${Math.round(start)} 开始`"
      min="0"
      :max="maxStart || 1"
      :disabled="maxStart === 0"
      step="any"
      :value="start"
      @input="moveSlider"
    />
  </div>
</template>
