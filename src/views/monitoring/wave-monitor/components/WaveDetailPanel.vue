<script setup lang="ts">
import { computed } from 'vue'
import type { ManagedDevice } from '../../../../domain/infrastructure/types'
import type { WaveMonitorRuntime } from '../types'

const props = defineProps<{
  runtime: WaveMonitorRuntime
  device: ManagedDevice
  lineName: string
  relationText: string
}>()

const pointCount = computed(() => props.runtime.waveformSamples.length)
const completeness = computed(() => Math.min(100, Math.round((pointCount.value / 4000) * 100)))
const faultTypeText = computed(
  () =>
    ({
      NORMAL: '正常',
      OPEN: '开路',
      SHORT: '短路',
    })[props.runtime.faultType ?? ''] ??
    props.runtime.faultType ??
    '--',
)
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

    <section class="wave-monitor-detail-source">
      <span>当前数据源</span>
      <div>
        <i class="wave-monitor-state-dot" :class="`is-${device.state}`"></i>
        <strong class="asset-label">{{ device.name }}</strong>
      </div>
      <small class="asset-label">{{ lineName }} · {{ device.position }}</small>
      <small>{{ relationText }}</small>
    </section>

    <div class="wave-monitor-trigger-summary">
      <div>
        <span>协议校验</span
        ><strong>{{
          runtime.frameValid === null ? '--' : runtime.frameValid ? '通过' : '失败'
        }}</strong>
      </div>
      <div>
        <span>当前帧</span>
        <strong>{{ runtime.batchId }}</strong>
      </div>
      <div>
        <span>当前相间</span>
        <strong>{{ runtime.phase ?? '--' }}</strong>
      </div>
      <div>
        <span>接收进度</span>
        <strong>{{ pointCount }} / 4000 点</strong>
      </div>
      <div>
        <span>完整度</span>
        <strong>{{ completeness }}%</strong>
      </div>
      <div>
        <span>采样率</span>
        <strong>{{ device.acquisition?.sampleRate || '--' }}</strong>
      </div>
      <div>
        <span>接收时间</span>
        <strong>{{ runtime.receiveTime }}</strong>
      </div>
      <div>
        <span>故障类型</span>
        <strong>{{ faultTypeText }}</strong>
      </div>
      <div>
        <span>故障距离</span>
        <strong>{{ faultDistanceText }}</strong>
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
