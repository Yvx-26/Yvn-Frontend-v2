<script setup lang="ts">
import { computed } from 'vue'
import type { SituationDevice } from '../types'

const props = defineProps<{
  device: SituationDevice
}>()

const statistics = computed(() => [
  { id: 'phase', label: '当前相间', value: props.device.frame.phase },
  { id: 'points', label: '采样点', value: `${props.device.frame.pointCount}` },
  { id: 'min', label: '最小值', value: `${props.device.frame.min}` },
  { id: 'max', label: '最大值', value: `${props.device.frame.max}` },
  { id: 'peak', label: '峰值', value: `${props.device.frame.peakAbs}` },
])
</script>

<template>
  <section class="device-situation-panel device-situation-detail-panel">
    <header class="device-situation-panel-header">
      <div>
        <strong>设备详情</strong>
        <span>当前选择 {{ device.id }}</span>
      </div>
      <span class="device-situation-status" :class="`is-${device.status}`">
        {{ device.statusLabel }}
      </span>
    </header>

    <div class="device-situation-detail" aria-live="polite">
      <div class="device-situation-detail-title">
        <svg aria-hidden="true"><use href="#icon-device-status" /></svg>
        <strong>{{ device.name }}</strong>
      </div>

      <dl class="device-situation-detail-grid">
        <div>
          <dt>所属线路</dt>
          <dd>{{ device.line }}</dd>
        </div>
        <div>
          <dt>安装位置</dt>
          <dd>{{ device.position }}</dd>
        </div>
        <div>
          <dt>通信延迟</dt>
          <dd>{{ device.latency }}</dd>
        </div>
        <div>
          <dt>最后上传</dt>
          <dd>{{ device.lastUpload }}</dd>
        </div>
      </dl>

      <div class="device-situation-batch-heading">
        <span>最新波形帧 · {{ device.frame.id }}</span>
        <strong>完整度 {{ device.frame.completeness }}%</strong>
      </div>

      <div class="device-situation-measurements" data-testid="device-frame-statistics">
        <article
          v-for="item in statistics"
          :key="item.id"
          :aria-label="`${item.label}，${item.value}`"
        >
          <span>{{ item.label }}</span>
          <strong>{{ item.value }}</strong>
        </article>
      </div>
    </div>
  </section>
</template>
