<script setup lang="ts">
import { computed } from 'vue'
import type {
  ManagedDevice,
  ManagedDeviceCategory,
  ManagedLine,
} from '../../../../domain/infrastructure/types'
import DeviceLocationMap from './DeviceLocationMap.vue'

const props = defineProps<{
  device: ManagedDevice
  locationDevice?: ManagedDevice
  line?: ManagedLine
}>()

const categoryLabels: Record<ManagedDeviceCategory, string> = {
  monitor: '监测端',
  locator: '定位端',
  integrated: '一体机',
}

const latencyText = computed(() =>
  props.device.latencyMs === null ? '--' : `${props.device.latencyMs} ms`,
)
const signalText = computed(() =>
  props.device.signalDbm === null ? '--' : `${props.device.signalDbm} dBm`,
)
const batchText = computed(() => {
  if (!props.device.acquisition) return '--'
  return `${props.device.acquisition.batchSize} / ${props.device.acquisition.batchSize} 完整`
})
</script>

<template>
  <aside class="device-config-status-panel">
    <header>
      <div>
        <strong>定位与状态</strong>
        <span>{{ line?.name || '尚未绑定线路' }}</span>
      </div>
      <i class="device-config-state-dot" :class="`is-${device.state}`"></i>
    </header>

    <DeviceLocationMap :device="device" :line="line" :location-device="locationDevice" />

    <section class="device-config-status-section">
      <h3>通信链路</h3>
      <div class="device-config-link-flow">
        <span>{{ categoryLabels[device.category] }}</span>
        <i></i>
        <span>{{ device.network.protocol }}</span>
        <i></i>
        <span>云平台</span>
      </div>
    </section>

    <section class="device-config-status-section is-health">
      <h3>实时状态</h3>
      <div><span>网络延迟</span><strong :class="{ 'is-warning': (device.latencyMs ?? 0) > 200 }">{{ latencyText }}</strong></div>
      <div><span>信号强度</span><strong>{{ signalText }}</strong></div>
      <div><span>最后通信</span><strong>{{ device.lastSeen }}</strong></div>
      <div v-if="device.acquisition"><span>最近批次</span><strong class="is-normal">{{ batchText }}</strong></div>
      <div><span>固件版本</span><strong>{{ device.firmwareVersion }}</strong></div>
    </section>
  </aside>
</template>
