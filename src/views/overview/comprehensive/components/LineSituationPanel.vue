<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import CableLineLegend from '../../../../components/common/CableLineLegend.vue'
import { resolveCableLineState } from '../../../../domain/map/lines'
import type { ManagedDevice, ManagedLine } from '../../../../domain/infrastructure/types'
import OverviewLineMap from './OverviewLineMap.vue'

const props = defineProps<{
  lines: ManagedLine[]
  devices: ManagedDevice[]
}>()

const selectedLineId = ref('')
const selectedDeviceId = ref('')

const selectedLine = computed(
  () => props.lines.find((line) => line.id === selectedLineId.value) ?? props.lines[0],
)
const lineState = computed(() => selectedLine.value && resolveCableLineState(selectedLine.value, props.devices))
const selectedDevice = computed(() =>
  selectedLine.value?.devices.find((device) => device.id === selectedDeviceId.value),
)
const linkedDevices = computed(() =>
  selectedDevice.value
    ? props.devices.filter((device) => device.linkedLocatorId === selectedDevice.value?.id)
    : [],
)
const onlineCount = computed(
  () => selectedLine.value?.devices.filter((device) => device.state === 'online').length ?? 0,
)

function statusLabel(state: ManagedDevice['state']) {
  if (state === 'online') return '在线'
  if (state === 'warning') return '数据异常'
  return '离线'
}

function selectDevice(deviceId: string) {
  selectedDeviceId.value = deviceId
}

watch(
  () => props.lines.map((line) => line.id).join('|'),
  () => {
    if (!props.lines.some((line) => line.id === selectedLineId.value)) {
      selectedLineId.value = props.lines[0]?.id ?? ''
    }
  },
  { immediate: true },
)

watch(
  () =>
    `${selectedLine.value?.id}:${selectedLine.value?.devices.map((device) => device.id).join('|')}`,
  () => {
    const line = selectedLine.value
    if (!line?.devices.some((device) => device.id === selectedDeviceId.value))
      selectedDeviceId.value = line?.devices[0]?.id ?? ''
  },
  { immediate: true },
)
</script>

<template>
  <section class="overview-panel overview-line-panel">
    <header class="overview-panel-header">
      <div>
        <strong>线路运行态势</strong>
        <span v-if="selectedLine">
          {{ selectedLine.name }} · {{ onlineCount }}/{{ selectedLine.devices.length }} 个定位节点在线
          <template v-if="lineState"> · {{ lineState.statusLabel }}</template>
        </span>
        <span v-else>暂无已配置线路</span>
      </div>
      <div class="overview-panel-actions">
        <label v-if="lines.length" class="overview-line-selector">
          <span>当前线路</span>
          <select v-model="selectedLineId" aria-label="选择线路">
            <option v-for="line in lines" :key="line.id" :value="line.id">
              {{ line.name }}
            </option>
          </select>
        </label>
        <span class="overview-live-tag"><i></i>实时地图</span>
        <RouterLink
          :to="{ path: '/overview/lines', query: selectedLine ? { line: selectedLine.id } : {} }"
        >
          查看详情
        </RouterLink>
      </div>
    </header>

    <div v-if="selectedLine && lineState" class="overview-line-canvas">
      <OverviewLineMap
        :line="selectedLine"
        :line-state="lineState"
        :selected-device-id="selectedDeviceId"
        @select-device="selectDevice"
      />

      <nav class="overview-node-switcher" aria-label="线路节点快捷选择">
        <button
          v-for="device in selectedLine.devices"
          :key="device.id"
          type="button"
          :class="[`is-${device.state}`, { 'is-selected': device.id === selectedDeviceId }]"
          :title="`${device.name} · ${statusLabel(device.state)}`"
          :aria-label="`选择节点 ${String(device.sequence).padStart(2, '0')}，${device.name}`"
          @click="selectDevice(device.id)"
        >
          {{ String(device.sequence).padStart(2, '0') }}
        </button>
      </nav>

      <div class="overview-map-caption">
        <CableLineLegend />
        <span><i class="is-normal"></i>设备在线</span>
        <span><i class="is-warning"></i>设备异常</span>
        <span><i class="is-offline"></i>设备离线</span>
      </div>

      <aside v-if="selectedDevice" class="overview-node-detail" aria-live="polite">
        <header>
          <div>
            <span>节点 {{ String(selectedDevice.sequence).padStart(2, '0') }}</span>
            <strong>{{ selectedDevice.position || selectedDevice.name }}</strong>
          </div>
          <i :class="`is-${selectedDevice.state}`">{{ statusLabel(selectedDevice.state) }}</i>
        </header>
        <dl>
          <div>
            <dt>设备编号</dt>
            <dd class="asset-identifier">{{ selectedDevice.id }}</dd>
          </div>
          <div>
            <dt>最近上报</dt>
            <dd>{{ selectedDevice.lastSeen || '--' }}</dd>
          </div>
          <div>
            <dt>经纬度</dt>
            <dd>
              {{ selectedDevice.coordinate[0].toFixed(5) }},
              {{ selectedDevice.coordinate[1].toFixed(5) }}
            </dd>
          </div>
          <div>
            <dt>关联监测</dt>
            <dd>{{ linkedDevices.map((device) => device.id).join('、') || '未关联' }}</dd>
          </div>
        </dl>
      </aside>

      <small class="overview-map-hint">点击地图节点查看实时详情</small>
    </div>
    <div v-else class="overview-line-empty">
      <svg><use href="#icon-route-settings" /></svg>
      <strong>尚未配置线路</strong>
      <span>完成线路及定位设备配置后将在此显示</span>
    </div>
  </section>
</template>
