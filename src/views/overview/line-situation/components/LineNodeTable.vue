<script setup lang="ts">
import type { SituationLineNode } from '../types'

defineProps<{
  nodes: SituationLineNode[]
}>()
</script>

<template>
  <section class="line-situation-panel line-situation-node-panel">
    <header class="line-situation-panel-header">
      <div>
        <strong>监测节点状态</strong>
        <span>设备连接与最新批次</span>
      </div>
      <span>{{ nodes.length }} 个节点</span>
    </header>

    <div class="line-situation-node-table-wrap">
      <table class="line-situation-node-table">
        <thead>
          <tr>
            <th>节点</th>
            <th>设备</th>
            <th>连接状态</th>
            <th>批次完整度</th>
            <th>最后上传</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="node in nodes" :key="node.id">
            <td>监测点 {{ node.id }}</td>
            <td class="asset-identifier" :title="node.deviceId">{{ node.deviceId }}</td>
            <td>
              <span class="line-situation-node-status" :class="`is-${node.status}`">
                {{ node.statusLabel }}
              </span>
            </td>
            <td>{{ node.batchProgress }}</td>
            <td>{{ node.lastUpload }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>
