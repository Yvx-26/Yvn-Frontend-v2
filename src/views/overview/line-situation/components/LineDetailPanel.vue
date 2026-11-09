<script setup lang="ts">
import { computed } from 'vue'
import type { SituationLine } from '../types'

const props = defineProps<{
  line: SituationLine
}>()

const onlineCount = computed(
  () => props.line.nodes.filter((node) => node.status !== 'offline').length,
)

const abnormalCount = computed(
  () => props.line.nodes.filter((node) => node.status !== 'normal').length,
)
</script>

<template>
  <section class="line-situation-panel line-situation-detail-panel">
    <header class="line-situation-panel-header">
      <div>
        <strong>线路详情</strong>
        <span>{{ line.code }}</span>
      </div>
      <span class="line-situation-detail-state" :class="`is-${line.status}`">
        {{ line.statusLabel }}
      </span>
    </header>

    <div class="line-situation-detail" aria-live="polite">
      <div class="line-situation-detail-title">
        <svg aria-hidden="true"><use href="#icon-line-status" /></svg>
        <strong class="asset-label">{{ line.name }}</strong>
      </div>

      <dl class="line-situation-detail-grid">
        <div>
          <dt>线路类型</dt>
          <dd>{{ line.type }}</dd>
        </div>
        <div>
          <dt>线路长度</dt>
          <dd>{{ line.length }}</dd>
        </div>
        <div>
          <dt>监测节点</dt>
          <dd>{{ line.nodes.length }} 个</dd>
        </div>
        <div>
          <dt>在线设备</dt>
          <dd>{{ onlineCount }} / {{ line.nodes.length }}</dd>
        </div>
        <div>
          <dt>最新数据</dt>
          <dd>{{ line.lastUpdate }}</dd>
        </div>
        <div>
          <dt>当前异常</dt>
          <dd>{{ abnormalCount }} 项</dd>
        </div>
      </dl>

      <div class="line-situation-health-heading">
        <span>线路健康度</span>
        <strong>{{ line.health }}%</strong>
      </div>
      <div
        class="line-situation-health-track"
        role="progressbar"
        :aria-valuenow="line.health"
        aria-valuemin="0"
        aria-valuemax="100"
      >
        <i :class="`is-${line.status}`" :style="{ width: `${line.health}%` }"></i>
      </div>
    </div>
  </section>
</template>
