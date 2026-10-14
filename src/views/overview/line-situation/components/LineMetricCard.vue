<script setup lang="ts">
import type { LineMetric } from '../types'

defineProps<{
  metric: LineMetric
}>()
</script>

<template>
  <article class="line-situation-metric" :class="`tone-${metric.tone}`">
    <span class="line-situation-metric-icon" aria-hidden="true">
      <svg><use :href="`#icon-${metric.icon}`" /></svg>
    </span>
    <div>
      <span class="line-situation-metric-label">{{ metric.label }}</span>
      <strong
        >{{ metric.value }} <small>{{ metric.suffix }}</small></strong
      >
    </div>
  </article>
</template>
