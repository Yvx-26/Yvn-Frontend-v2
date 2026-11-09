<script setup lang="ts">
import type { BoundLineDevice } from '../../../../domain/infrastructure/types'
import type { LineBatchRuntime } from '../types'

defineProps<{
  devices: BoundLineDevice[]
  selectedDeviceId: string
  runtime: LineBatchRuntime
}>()

const emit = defineEmits<{
  select: [deviceId: string]
}>()
</script>

<template>
  <aside class="line-monitor-device-panel">
    <header>
      <div><strong>设备状态</strong><span>定位点与通信延迟</span></div>
      <em>{{ devices.length }} 台</em>
    </header>

    <div class="line-monitor-device-list">
      <button
        v-for="device in devices"
        :key="device.id"
        type="button"
        :class="{ 'is-active': device.id === selectedDeviceId }"
        @click="emit('select', device.id)"
      >
        <i class="line-monitor-state-dot" :class="`is-${device.state}`"></i>
        <span>
          <strong class="asset-identifier asset-truncate" :title="device.id">{{ device.id }}</strong>
          <small>{{ device.position }}</small>
        </span>
        <em :class="{ 'is-warning': (device.latencyMs ?? 0) > 200 }">
          {{ device.latencyMs === null ? '--' : `${device.latencyMs} ms` }}
        </em>
      </button>

      <div v-if="devices.length === 0" class="line-monitor-device-empty">
        <svg><use href="#icon-device-monitor" /></svg>
        <strong>尚未接入定位设备</strong>
        <span>请先在线路管理中完成设备绑定</span>
      </div>
    </div>

    <section class="line-monitor-event-feed">
      <h3>实时事件</h3>
      <p>{{ runtime.primaryEvent }}</p>
      <p>{{ runtime.secondaryEvent }}</p>
    </section>
  </aside>
</template>
