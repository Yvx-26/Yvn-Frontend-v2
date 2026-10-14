<script setup lang="ts">
import type { OperationMetric } from '../types'

defineProps<{
  metric: OperationMetric
}>()
</script>

<template>
  <article class="operation-situation-metric" :class="`tone-${metric.tone}`">
    <span class="operation-situation-metric-icon" aria-hidden="true">
      <svg><use :href="`#icon-${metric.icon}`" /></svg>
    </span>
    <div>
      <span class="operation-situation-metric-label">{{ metric.label }}</span>
      <strong
        >{{ metric.value }} <small>{{ metric.suffix }}</small></strong
      >
    </div>
  </article>
</template>
