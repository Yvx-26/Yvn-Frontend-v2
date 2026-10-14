<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { ManagedDevice, ManagedLine } from '../../../../domain/infrastructure/types'
import type { WaveSourceFilter } from '../types'

const props = defineProps<{
  devices: ManagedDevice[]
  lines: ManagedLine[]
  selectedDeviceId: string
}>()

const emit = defineEmits<{
  select: [deviceId: string]
}>()

const activeFilter = ref<WaveSourceFilter>('all')

const monitorDevices = computed(() =>
  props.devices
    .filter(
      (device) =>
        device.enabled &&
        device.category !== 'locator' &&
        (activeFilter.value === 'all' || device.state === 'warning'),
    )
    .sort((left, right) => {
      const leftOrder = left.category === 'monitor' ? 0 : 1
      const rightOrder = right.category === 'monitor' ? 0 : 1
      return leftOrder - rightOrder || left.id.localeCompare(right.id)
    }),
)

const onlineCount = computed(
  () =>
    props.devices.filter(
      (device) => device.enabled && device.category !== 'locator' && device.state === 'online',
    ).length,
)

function lineName(lineId: string) {
  return props.lines.find((line) => line.id === lineId)?.name ?? '未绑定线路'
}

watch(monitorDevices, (devices) => {
  if (devices.length && !devices.some((device) => device.id === props.selectedDeviceId)) {
    emit('select', devices[0]!.id)
  }
})
</script>

<template>
  <aside class="wave-monitor-source-panel">
    <header>
      <div>
        <strong>监测数据源</strong>
        <span>监测设备与一体化终端</span>
      </div>
      <em>在线 {{ onlineCount }}</em>
    </header>

    <div class="wave-monitor-source-filters">
      <button
        type="button"
        :class="{ 'is-active': activeFilter === 'all' }"
        @click="activeFilter = 'all'"
      >
        全部
      </button>
      <button
        type="button"
        :class="{ 'is-active': activeFilter === 'warning' }"
        @click="activeFilter = 'warning'"
      >
        异常优先
      </button>
    </div>

    <div class="wave-monitor-source-list">
      <button
        v-for="device in monitorDevices"
        :key="device.id"
        type="button"
        :class="{ 'is-active': device.id === selectedDeviceId }"
        @click="emit('select', device.id)"
      >
        <i class="wave-monitor-state-dot" :class="`is-${device.state}`"></i>
        <span>
          <strong>{{ device.id }}</strong>
          <small>{{ lineName(device.lineId) }} · {{ device.position }}</small>
        </span>
        <em :class="`is-${device.state}`">{{ device.state === 'warning' ? '异常' : device.state === 'offline' ? '离线' : '在线' }}</em>
      </button>

      <div v-if="monitorDevices.length === 0" class="wave-monitor-source-empty">
        当前没有异常数据源
      </div>
    </div>
  </aside>
</template>
