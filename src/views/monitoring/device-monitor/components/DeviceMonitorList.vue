<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type {
  ManagedDevice,
  ManagedDeviceCategory,
  ManagedDeviceState,
  ManagedLine,
} from '../../../../domain/infrastructure/types'
import type { DeviceMonitorFilter } from '../types'

const props = defineProps<{
  devices: ManagedDevice[]
  lines: ManagedLine[]
  selectedDeviceId: string
}>()

const emit = defineEmits<{
  select: [deviceId: string]
}>()

const activeFilter = ref<DeviceMonitorFilter>('all')
const searchText = ref('')

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

const filteredDevices = computed(() => {
  const keyword = searchText.value.trim().toLowerCase()
  const categoryOrder: Record<ManagedDeviceCategory, number> = {
    monitor: 0,
    locator: 1,
    integrated: 2,
  }

  return props.devices
    .filter((device) => {
      const line = props.lines.find((item) => item.id === device.lineId)
      const matchesCategory = activeFilter.value === 'all' || device.category === activeFilter.value
      const source = `${device.id}${device.name}${device.position}${line?.name ?? ''}`.toLowerCase()
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

watch(filteredDevices, (devices) => {
  if (devices.length && !devices.some((device) => device.id === props.selectedDeviceId)) {
    emit('select', devices[0]!.id)
  }
})
</script>

<template>
  <aside class="device-monitor-list-panel">
    <header>
      <div>
        <strong>设备列表</strong>
        <span>按设备类型快速筛选</span>
      </div>
      <em>{{ filteredDevices.length }} 台</em>
    </header>

    <div class="device-monitor-list-tools">
      <div class="device-monitor-filters">
        <button
          v-for="filter in (['all', 'monitor', 'locator', 'integrated'] as const)"
          :key="filter"
          type="button"
          :class="{ 'is-active': activeFilter === filter }"
          @click="activeFilter = filter"
        >
          {{
            filter === 'all'
              ? '全部'
              : filter === 'monitor'
                ? '监测'
                : filter === 'locator'
                  ? '定位'
                  : '一体化'
          }}
        </button>
      </div>

      <label class="device-monitor-search">
        <svg><use href="#icon-wave-search" /></svg>
        <input v-model="searchText" type="search" placeholder="搜索设备编号或线路" />
      </label>
    </div>

    <div class="device-monitor-device-list">
      <button
        v-for="device in filteredDevices"
        :key="device.id"
        type="button"
        :class="{ 'is-active': device.id === selectedDeviceId }"
        @click="emit('select', device.id)"
      >
        <span class="device-monitor-list-icon">
          <svg>
            <use
              :href="
                device.category === 'monitor'
                  ? '#icon-wave-live'
                  : device.category === 'locator'
                    ? '#icon-crosshair'
                    : '#icon-device-monitor'
              "
            />
          </svg>
        </span>
        <span class="device-monitor-list-copy">
          <strong class="asset-identifier asset-truncate" :title="device.id">{{ device.id }}</strong>
          <small class="asset-truncate" :title="lineName(device.lineId)">{{ categoryLabels[device.category] }} · {{ lineName(device.lineId) }}</small>
        </span>
        <span class="device-monitor-list-state" :class="`is-${device.state}`">
          {{ stateLabels[device.state] }}
        </span>
      </button>

      <div v-if="filteredDevices.length === 0" class="device-monitor-list-empty">
        未找到匹配设备
      </div>
    </div>
  </aside>
</template>
