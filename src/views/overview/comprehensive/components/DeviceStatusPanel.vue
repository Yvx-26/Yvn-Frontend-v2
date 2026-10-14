<script setup lang="ts">
import { RouterLink } from 'vue-router'
import type { MonitoredDevice } from '../types'

defineProps<{
  devices: MonitoredDevice[]
}>()
</script>

<template>
  <section class="overview-panel overview-device-panel">
    <header class="overview-panel-header">
      <div>
        <strong>设备接入状态</strong>
        <span>监测终端实时连接情况</span>
      </div>
      <RouterLink to="/overview/devices">设备态势</RouterLink>
    </header>

    <div class="overview-device-list">
      <article v-for="device in devices" :key="device.id" class="overview-device-item">
        <i :class="`is-${device.status}`" aria-hidden="true"></i>
        <div>
          <strong>{{ device.name }}</strong>
          <span>{{ device.area }}</span>
        </div>
        <small :class="`is-${device.status}`">{{ device.latency }}</small>
      </article>
    </div>
  </section>
</template>
