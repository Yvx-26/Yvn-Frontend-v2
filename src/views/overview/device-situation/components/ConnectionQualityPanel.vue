<script setup lang="ts">
import type { SituationDevice } from '../types'

defineProps<{
  device: SituationDevice
}>()
</script>

<template>
  <section class="device-situation-panel device-situation-quality-panel">
    <header class="device-situation-panel-header">
      <div>
        <strong>当前通信状态</strong>
        <span class="asset-truncate" :title="device.name">{{ device.name }}</span>
      </div>
      <strong class="device-situation-quality-rate">{{ device.connectionRate }}</strong>
    </header>

    <div class="device-situation-quality-body">
      <div class="device-situation-quality-summary">
        <span>通信质量变化</span>
        <strong>当前延迟 {{ device.latency }}</strong>
      </div>
      <div class="device-situation-quality-chart" aria-label="当前通信状态图">
        <i
          v-for="(value, index) in device.qualityTrend"
          :key="index"
          :class="{ 'is-warning': value < 80 }"
          :style="{ height: `${value}%` }"
        ></i>
      </div>
      <div class="device-situation-quality-axis">
        <span>本次查询</span>
        <span>当前</span>
      </div>
    </div>
  </section>
</template>
