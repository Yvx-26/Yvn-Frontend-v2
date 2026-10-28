<script setup lang="ts">
import { computed } from 'vue'
import type { LineBatchRuntime } from '../types'

const props = defineProps<{
  runtime: LineBatchRuntime
  isLive: boolean
}>()

const frameState = computed(() => {
  if (props.runtime.frameError) return props.runtime.frameError
  if (props.runtime.pointCount === 0) return '等待监测数据'
  if (!props.isLive) return '实时刷新已暂停'
  return props.runtime.pointCount === 4000 ? '波形帧完整' : '波形帧不完整'
})

const statistics = computed(() => [
  { id: 'phase', label: '当前相间', value: props.runtime.phase },
  { id: 'points', label: '采样点数', value: `${props.runtime.pointCount} / 4000` },
  { id: 'min', label: '有符号最小值', value: String(props.runtime.min) },
  { id: 'max', label: '有符号最大值', value: String(props.runtime.max) },
  { id: 'peak', label: '峰值绝对值', value: String(props.runtime.peakAbs) },
])
</script>

<template>
  <section class="line-monitor-batch-panel">
    <header>
      <div>
        <strong>最新波形帧</strong>
        <span>{{ runtime.monitorDeviceId }} · {{ runtime.frameId }}</span>
      </div>
      <div>
        <strong>完整度 {{ runtime.completeness }}%</strong>
        <span>{{ frameState }}</span>
      </div>
    </header>

    <div class="line-monitor-batch-cells">
      <div
        v-for="item in statistics"
        :key="item.id"
        class="line-monitor-batch-cell"
        :class="{ 'is-received': runtime.pointCount > 0 }"
      >
        <span>{{ item.label }}</span>
        <strong>{{ runtime.pointCount > 0 ? item.value : '--' }}</strong>
        <small>{{ runtime.pointCount > 0 ? '真实帧数据' : '等待' }}</small>
      </div>
    </div>
  </section>
</template>
