<script setup lang="ts">
import type { DeviceMetric } from '../types'

defineProps<{
  metric: DeviceMetric
}>()
</script>

<template>
  <article class="device-situation-metric" :class="`tone-${metric.tone}`">
    <span class="device-situation-metric-icon" aria-hidden="true">
      <svg><use :href="`#icon-${metric.icon}`" /></svg>
    </span>
    <div>
      <span class="device-situation-metric-label">{{ metric.label }}</span>
      <strong
        >{{ metric.value }} <small>{{ metric.suffix }}</small></strong
      >
    </div>
  </article>
</template>
