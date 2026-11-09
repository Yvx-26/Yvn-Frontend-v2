<script setup lang="ts">
import type { TopologyDevice, TopologyLine } from '../types'

defineProps<{
  line: TopologyLine
  device: TopologyDevice
}>()
</script>

<template>
  <aside class="topology-detail-panel" aria-live="polite">
    <header>
      <div><strong>节点详情</strong><span class="asset-label">{{ line.name }}</span></div>
      <span class="asset-identifier asset-truncate" :title="device.id">{{ device.id }}</span>
    </header>

    <div class="topology-detail-body">
      <div class="topology-detail-title">
        <strong class="asset-label">{{ device.name }}</strong>
        <span :class="`is-${device.status}`">{{ device.statusLabel }}</span>
      </div>
      <p>{{ line.name }}第 {{ device.sequence }} 个{{ device.parentId ? '支路' : '主干' }}定位点，安装于{{ device.position }}。</p>

      <dl>
        <div><dt>设备编号</dt><dd class="asset-identifier">{{ device.id }}</dd></div>
        <div><dt>线路顺序</dt><dd>第 {{ device.sequence }} 点</dd></div>
        <div><dt>通信延迟</dt><dd>{{ device.latency }}</dd></div>
        <div><dt>最后上传</dt><dd>{{ device.lastUpload }}</dd></div>
        <div><dt>连接设备</dt><dd>{{ device.linkedDeviceIds.join(' / ') }}</dd></div>
        <div><dt>当前状态</dt><dd>{{ device.statusLabel }}</dd></div>
      </dl>

      <div class="topology-data-heading">
        <strong>节点实时状态</strong>
        <span>定位节点</span>
      </div>

      <div class="topology-data-grid">
        <article><span>连接状态</span><strong>{{ device.statusLabel }}</strong></article>
        <article><span>最后上传</span><strong>{{ device.lastUpload }}</strong></article>
        <article><span>相邻节点</span><strong>{{ device.linkedDeviceIds.length }}</strong></article>
      </div>
    </div>
  </aside>
</template>
