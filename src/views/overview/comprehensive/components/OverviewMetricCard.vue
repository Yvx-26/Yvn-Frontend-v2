<script setup lang="ts">
import type { OverviewMetric } from '../types'

defineProps<{
  metric: OverviewMetric
}>()
</script>

<template>
  <article class="overview-metric-card" :class="`tone-${metric.tone}`">
    <div class="overview-metric-icon" aria-hidden="true">
      <svg><use :href="`#icon-${metric.icon}`" /></svg>
    </div>
    <div class="overview-metric-copy">
      <span class="overview-metric-label">{{ metric.label }}</span>
      <strong class="overview-metric-value">
        {{ metric.value }}
        <small>{{ metric.suffix }}</small>
      </strong>
      <span class="overview-metric-note">{{ metric.note }}</span>
    </div>
  </article>
</template>
