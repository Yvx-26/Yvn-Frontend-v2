<script setup lang="ts">
import type { SituationLine } from '../types'

defineProps<{
  line: SituationLine
}>()
</script>

<template>
  <section class="line-situation-panel line-situation-topology-panel">
    <header class="line-situation-panel-header">
      <div>
        <strong>{{ line.name }}拓扑</strong>
        <span>监测设备在线状态与线路结构</span>
      </div>
      <span>拓扑示意 · 非地理地图</span>
    </header>

    <div class="line-situation-topology-canvas" aria-live="polite">
      <span class="line-situation-track" aria-hidden="true"></span>
      <span class="line-situation-branch" aria-hidden="true"></span>

      <div class="line-situation-node-layer">
        <article
          v-for="node in line.nodes"
          :key="node.id"
          class="line-situation-node"
          :class="`is-${node.status}`"
          :style="{ left: node.left }"
          :aria-label="`${node.deviceId}，${node.statusLabel}`"
        >
          <span>{{ node.id }}</span>
          <strong>{{ node.deviceId }}</strong>
        </article>
      </div>

      <span class="line-situation-topology-notice" :class="`is-${line.status}`">
        {{ line.notice }}
      </span>

      <div class="line-situation-topology-legend">
        <span><i class="is-normal"></i>正常</span>
        <span><i class="is-warning"></i>预警/故障</span>
        <span><i class="is-offline"></i>离线</span>
      </div>
    </div>
  </section>
</template>
