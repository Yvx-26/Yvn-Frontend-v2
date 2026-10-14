<script setup lang="ts">
import { computed } from 'vue'
import type { WaveMonitorRuntime } from '../types'

const props = defineProps<{
  runtime: WaveMonitorRuntime
}>()

const pointCount = computed(() => props.runtime.waveformSamples.length)
const completeness = computed(() => Math.min(100, Math.round((pointCount.value / 4000) * 100)))
const frameText = computed(() =>
  props.runtime.frameId === null ? '--' : `#${props.runtime.frameId}`,
)
const faultTypeText = computed(() => ({
  NORMAL: '正常',
  OPEN: '开路',
  SHORT: '短路',
}[props.runtime.faultType ?? ''] ?? props.runtime.faultType ?? '--'))
const faultDistanceText = computed(() =>
  props.runtime.faultDistanceM == null ? '--' : `${props.runtime.faultDistanceM} m`,
)
</script>

<template>
  <aside class="wave-monitor-detail-panel">
    <header>
      <div>
        <strong>当前帧状态</strong>
        <span>真实帧信息与接收事件</span>
      </div>
      <em>{{ runtime.phase ?? '--' }}</em>
    </header>

    <div class="wave-monitor-trigger-summary">
      <div>
        <span>帧编号</span>
        <strong>{{ frameText }}</strong>
      </div>
      <div>
        <span>当前相间</span>
        <strong>{{ runtime.phase ?? '--' }}</strong>
      </div>
      <div>
        <span>故障类型</span>
        <strong>{{ faultTypeText }}</strong>
      </div>
      <div>
        <span>故障距离</span>
        <strong>{{ faultDistanceText }}</strong>
      </div>
      <div>
        <span>数据点数</span>
        <strong>{{ pointCount }} 点</strong>
      </div>
      <div>
        <span>完整度</span>
        <strong>{{ completeness }}%</strong>
      </div>
    </div>

    <section class="wave-monitor-event-section">
      <strong>实时接收事件</strong>
      <div class="wave-monitor-event-list">
        <article v-for="event in runtime.events" :key="event.id" :class="`is-${event.level}`">
          <i></i>
          <div>
            <strong>{{ event.title }}</strong>
            <p>{{ event.description }}</p>
          </div>
          <time>{{ event.time }}</time>
        </article>
      </div>
    </section>
  </aside>
</template>
