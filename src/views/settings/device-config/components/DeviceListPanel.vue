<script setup lang="ts">
import { computed, ref } from 'vue'
import type {
  ManagedDevice,
  ManagedDeviceCategory,
  ManagedDeviceState,
  ManagedLine,
} from '../../../../domain/infrastructure/types'

const props = defineProps<{
  devices: ManagedDevice[]
  lines: ManagedLine[]
  selectedDeviceId: string
}>()

const emit = defineEmits<{
  select: [device: ManagedDevice]
}>()

type DeviceFilter = 'all' | ManagedDeviceCategory

const searchText = ref('')
const activeFilter = ref<DeviceFilter>('all')

const categoryLabels: Record<ManagedDeviceCategory, string> = {
  monitor: '监测设备',
  locator: '定位设备',
  integrated: '一体化终端',
}

const stateLabels: Record<ManagedDeviceState, string> = {
  online: '在线',
  warning: '异常',
  offline: '离线',
}

const categoryCounts = computed(() => ({
  all: props.devices.length,
  monitor: props.devices.filter((device) => device.category === 'monitor').length,
  locator: props.devices.filter((device) => device.category === 'locator').length,
  integrated: props.devices.filter((device) => device.category === 'integrated').length,
}))

const filteredDevices = computed(() => {
  const keyword = searchText.value.trim().toLowerCase()
  const categoryOrder: Record<ManagedDeviceCategory, number> = {
    monitor: 0,
    locator: 1,
    integrated: 2,
  }
  return props.devices
    .filter((device) => {
      const lineName = props.lines.find((line) => line.id === device.lineId)?.name ?? ''
      const matchesCategory = activeFilter.value === 'all' || device.category === activeFilter.value
      const source = `${device.id}${device.name}${device.position}${lineName}`.toLowerCase()
      return matchesCategory && source.includes(keyword)
    })
    .sort(
      (left, right) =>
        categoryOrder[left.category] - categoryOrder[right.category] ||
        left.id.localeCompare(right.id),
    )
})

function lineName(lineId: string) {
  return props.lines.find((line) => line.id === lineId)?.name ?? '未绑定线路'
}
</script>

<template>
  <aside class="device-config-list-panel">
    <header>
      <div>
        <strong>设备列表</strong>
        <span>监测、定位与一体化终端</span>
      </div>
      <em>{{ filteredDevices.length }} / {{ devices.length }}</em>
    </header>

    <div class="device-config-list-tools">
      <label class="device-config-search">
        <svg><use href="#icon-wave-search" /></svg>
        <input v-model="searchText" type="search" placeholder="搜索编号、名称或线路" />
      </label>

      <div class="device-config-filters" aria-label="设备类别筛选">
        <button
          v-for="filter in ['all', 'monitor', 'locator', 'integrated'] as const"
          :key="filter"
          type="button"
          :class="{ 'is-active': activeFilter === filter }"
          @click="activeFilter = filter"
        >
          <span>{{ filter === 'all' ? '全部' : categoryLabels[filter] }}</span>
          <strong>{{ categoryCounts[filter] }}</strong>
        </button>
      </div>
    </div>

    <div class="device-config-device-list">
      <button
        v-for="device in filteredDevices"
        :key="device.id"
        type="button"
        :class="{ 'is-active': device.id === selectedDeviceId }"
        @click="emit('select', device)"
      >
        <i class="device-config-state-dot" :class="`is-${device.state}`"></i>
        <span class="device-config-list-copy">
          <strong class="asset-identifier asset-truncate" :title="device.id">{{ device.id }}</strong>
          <span class="asset-truncate" :title="`${lineName(device.lineId)} · ${device.position}`">{{ lineName(device.lineId) }} · {{ device.position }}</span>
          <small>{{ categoryLabels[device.category] }}</small>
        </span>
        <span class="device-config-list-state" :class="`is-${device.state}`">
          {{ stateLabels[device.state] }}
          <small>{{ device.lastSeen }}</small>
        </span>
      </button>

      <div v-if="filteredDevices.length === 0" class="device-config-list-empty">未找到匹配设备</div>
    </div>
  </aside>
</template>
