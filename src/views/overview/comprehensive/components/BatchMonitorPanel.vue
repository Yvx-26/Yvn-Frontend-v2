<script setup lang="ts">
import { computed } from 'vue'
import type { MonitoringFrame } from '../types'

const props = defineProps<{
  batch: MonitoringFrame
}>()

const statistics = computed(() => [
  { id: 'phase', label: '当前相间', value: props.batch.phase },
  { id: 'points', label: '采样点数', value: `${props.batch.pointCount} / 4000` },
  { id: 'min', label: '有符号最小值', value: String(props.batch.min) },
  { id: 'max', label: '有符号最大值', value: String(props.batch.max) },
  { id: 'peak', label: '峰值绝对值', value: String(props.batch.peakAbs) },
])
</script>

<template>
  <section class="overview-panel overview-batch-panel">
    <header class="overview-panel-header">
      <div>
        <strong>最新波形帧</strong>
        <span>{{ batch.deviceName }} · {{ batch.receivedAt }}</span>
      </div>
      <div class="overview-batch-progress">
        <span>帧 #{{ batch.id }}</span>
        <strong>完整度 {{ batch.completeness }}%</strong>
      </div>
    </header>

    <div class="overview-measurement-grid" data-testid="frame-statistics">
      <article
        v-for="item in statistics"
        :key="item.id"
        class="overview-measurement-item"
      >
        <span>{{ item.label }}</span>
        <strong>{{ item.value }}</strong>
        <small>真实帧数据</small>
      </article>
    </div>
  </section>
</template>
