<script setup lang="ts">
import type { Metric } from './metric'
defineProps<{
  metric: Metric
  variant: 'device-situation' | 'line-situation' | 'operation-situation'
}>()
</script>
<template>
  <article class="shared-metric" :class="[`${variant}-metric`, `tone-${metric.tone}`]">
    <span class="shared-metric-icon" :class="`${variant}-metric-icon`" aria-hidden="true">
      <svg><use :href="`#icon-${metric.icon}`" /></svg>
    </span>
    <div>
      <span class="shared-metric-label" :class="`${variant}-metric-label`">{{ metric.label }}</span>
      <strong
        >{{ metric.value }} <small>{{ metric.suffix }}</small></strong
      >
    </div>
  </article>
</template>
<style>
.shared-metric {
  position: relative;
  display: grid;
  min-width: 0;
  min-height: 104px;
  align-items: center;
  padding: 14px 16px;
  overflow: hidden;
  background: linear-gradient(135deg, rgba(14, 39, 66, 0.92), rgba(7, 25, 45, 0.86));
  border: 1px solid rgba(75, 158, 214, 0.22);
  border-radius: 8px;
  box-shadow: inset 0 1px rgba(255, 255, 255, 0.025);
  grid-template-columns: 46px minmax(0, 1fr);
  gap: 13px;
}
.shared-metric::before {
  position: absolute;
  top: 18px;
  bottom: 18px;
  left: 0;
  width: 2px;
  content: '';
  background: #1e90ff;
  box-shadow: 0 0 9px rgba(30, 144, 255, 0.72);
}
.shared-metric.tone-success::before {
  background: #22c55e;
  box-shadow: 0 0 9px rgba(34, 197, 94, 0.68);
}
.shared-metric.tone-warning::before {
  background: #f59e0b;
  box-shadow: 0 0 9px rgba(245, 158, 11, 0.68);
}
.shared-metric.tone-danger::before {
  background: #ef5468;
  box-shadow: 0 0 9px rgba(239, 84, 104, 0.68);
}
.shared-metric-icon {
  display: grid;
  width: 46px;
  height: 46px;
  place-items: center;
  color: #50c5ff;
  background: rgba(30, 144, 255, 0.1);
  border: 1px solid rgba(80, 197, 255, 0.2);
  border-radius: 8px;
}
.shared-metric.tone-success .shared-metric-icon {
  color: #3ddb81;
  background: rgba(34, 197, 94, 0.09);
  border-color: rgba(34, 197, 94, 0.2);
}
.shared-metric.tone-warning .shared-metric-icon {
  color: #f5b534;
  background: rgba(245, 158, 11, 0.09);
  border-color: rgba(245, 158, 11, 0.2);
}
.shared-metric.tone-danger .shared-metric-icon {
  color: #f16a7b;
  background: rgba(239, 84, 104, 0.09);
  border-color: rgba(239, 84, 104, 0.2);
}
.shared-metric-icon svg {
  width: 24px;
  height: 24px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.7;
  stroke-linecap: round;
  stroke-linejoin: round;
}
.shared-metric > div {
  min-width: 0;
}
.shared-metric-label,
.shared-metric strong {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.shared-metric-label {
  color: #bfd1de;
  font-size: 14px;
  font-weight: 600;
}
.shared-metric strong {
  margin-top: 5px;
  color: #f4fbff;
  font-family: Consolas, 'Roboto Mono', monospace;
  font-size: 29px;
  font-weight: 700;
  line-height: 1.1;
}
.shared-metric small {
  margin-left: 4px;
  color: #aec1d0;
  font-family: 'Microsoft YaHei UI', 'Microsoft YaHei', sans-serif;
  font-size: 12px;
  font-weight: 500;
}
</style>
