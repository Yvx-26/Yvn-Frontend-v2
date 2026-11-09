<script setup lang="ts">
import type { LineMonitorLineView } from '../types'
import { cableLineStyles } from '../../../../domain/map/lines'

defineProps<{
  lines: LineMonitorLineView[]
  selectedLineId: string
}>()

const emit = defineEmits<{
  select: [lineId: string]
}>()

const typeLabels = {
  submarine: '海底电缆',
  land: '陆地电缆',
  hybrid: '混合线路',
}
</script>

<template>
  <aside class="line-monitor-list-panel">
    <header>
      <div><strong>监测线路</strong><span>实时运行状态</span></div>
      <em>{{ lines.length }} 条</em>
    </header>

    <div class="line-monitor-line-list">
      <button
        v-for="item in lines"
        :key="item.line.id"
        type="button"
        :class="{ 'is-active': item.line.id === selectedLineId }"
        @click="emit('select', item.line.id)"
      >
        <i class="line-monitor-state-dot" :style="{ background: cableLineStyles[item.status].color }"></i>
        <span class="line-monitor-list-copy">
          <strong class="asset-truncate" :title="item.line.name">{{ item.line.name }}</strong>
          <span :title="item.statusDetail">{{ typeLabels[item.line.type] }} · {{ item.statusLabel }}</span>
          <small>
            <span>定位点 <b>{{ item.line.devices.length }}</b></span>
            <span>在线 <b>{{ item.onlineCount }}/{{ item.line.devices.length || '--' }}</b></span>
          </small>
        </span>
      </button>
    </div>
  </aside>
</template>
