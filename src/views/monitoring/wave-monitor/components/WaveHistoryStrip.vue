<script setup lang="ts">
import { ref } from 'vue'
import type { WaveHistoryFrame } from '../../../../services/telemetry-api'
const props = defineProps<{
  phase: string
  frames: WaveHistoryFrame[]
  currentFrameId: number | null
  loading: boolean
  hasMore: boolean
  error: string
  readError?: string
}>()
const emit = defineEmits<{ select: [frame: WaveHistoryFrame]; more: [] }>()
const list = ref<HTMLElement>()
function checkEnd() {
  const el = list.value
  if (
    el &&
    el.scrollLeft + el.clientWidth >= el.scrollWidth - 120 &&
    !props.loading &&
    props.hasMore
  )
    emit('more')
}
function scrollHistory(delta: number) {
  const el = list.value
  if (!el) return
  el.scrollLeft += delta
  checkEnd()
}
function wheel(event: WheelEvent) {
  event.preventDefault()
  const delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY
  scrollHistory(
    delta *
      (event.deltaMode === 1 ? 24 : event.deltaMode === 2 ? (list.value?.clientWidth ?? 300) : 1),
  )
}
defineExpose({ scrollHistory })
function fault(frame: WaveHistoryFrame) {
  if (!frame.frame_valid) return '帧无效'
  return (
    ({ NORMAL: '正常', OPEN: '开路', SHORT: '短路' } as Record<string, string>)[
      frame.fault_type ?? ''
    ] ?? '--'
  )
}
</script>
<template>
  <section class="wave-history" :aria-label="`${phase} 历史帧`">
    <header>
      <strong>{{ phase }} 历史帧</strong><span>滚轮浏览 · 点击查看波形</span>
    </header>
    <div ref="list" class="wave-history-list" @wheel="wheel" @scroll="checkEnd">
      <button
        v-for="frame in frames"
        :key="frame.ID"
        type="button"
        :class="{ 'is-current': frame.ID === currentFrameId }"
        :aria-pressed="frame.ID === currentFrameId"
        @click="emit('select', frame)"
      >
        <strong>#FRAME-{{ frame.ID }}</strong>
        <span
          >{{ fault(frame)
          }}<template v-if="frame.fault_distance_m != null">
            · {{ frame.fault_distance_m }} m</template
          ></span
        >
        <time>{{ frame.CREATED_AT?.replace('T', ' ') ?? '时间未知' }}</time>
        <small>{{ frame.ID === currentFrameId ? '当前帧' : '点击查看' }}</small>
      </button>
      <button v-if="hasMore || error" type="button" :disabled="loading" @click="emit('more')">
        {{ loading ? '正在加载…' : error ? '重试加载' : '更早的帧 →' }}
      </button>
      <span v-if="loading && !frames.length" role="status">正在读取历史帧…</span>
      <span v-else-if="!frames.length && !error" role="status">该相间暂无历史数据</span>
    </div>
    <p v-if="error || readError" role="alert">{{ error || readError }}</p>
  </section>
</template>
