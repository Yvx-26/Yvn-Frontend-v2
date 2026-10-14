<script setup lang="ts">
import { RouterLink } from 'vue-router'
import type { LineNode } from '../types'

defineProps<{
  nodes: LineNode[]
}>()
</script>

<template>
  <section class="overview-panel overview-line-panel">
    <header class="overview-panel-header">
      <div>
        <strong>线路运行态势</strong>
        <span>设备位置与线路状态</span>
      </div>
      <div class="overview-panel-actions">
        <span class="overview-service-tag">地图服务待接入</span>
        <RouterLink to="/overview/lines">查看线路态势</RouterLink>
      </div>
    </header>

    <div class="overview-line-canvas">
      <div class="overview-map-grid" aria-hidden="true"></div>
      <div class="overview-route-glow" aria-hidden="true"></div>
      <div class="overview-route-branch" aria-hidden="true"></div>

      <button
        v-for="node in nodes"
        :key="node.id"
        type="button"
        class="overview-line-node"
        :class="`is-${node.status}`"
        :style="{ top: node.top, left: node.left }"
        :aria-label="`${node.name}，${node.status === 'normal' ? '运行正常' : '存在异常'}`"
      >
        <span>{{ node.id }}</span>
        <small>{{ node.name }}</small>
      </button>

      <div v-if="nodes.some((node) => node.status === 'warning')" class="overview-fault-callout">
        <i aria-hidden="true"></i>
        <div>
          <strong>线路设备状态异常</strong>
          <span>请进入设备监测查看最新状态</span>
        </div>
      </div>

      <div class="overview-map-caption">
        <span><i class="is-normal"></i>运行正常</span>
        <span><i class="is-warning"></i>存在异常</span>
        <small>节点状态来自实时设备上报</small>
      </div>
    </div>
  </section>
</template>
