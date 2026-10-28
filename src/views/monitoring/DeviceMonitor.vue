<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { usePolling } from '../../composables/usePolling'
import ModuleState from '../../components/common/ModuleState.vue'
import { linkedMonitorText } from '../../domain/infrastructure/helpers'
import { useInfrastructureStore } from '../../stores/infrastructure'
import { fetchLatestWaveform } from '../../services/telemetry-api'
import { waveformStatistics } from '../../utils/waveform'
import { createDeviceMonitorRuntimes } from './device-monitor/runtime'
import DeviceDetailPanel from './device-monitor/components/DeviceDetailPanel.vue'
import DeviceMonitorList from './device-monitor/components/DeviceMonitorList.vue'
import DeviceTelemetryPanel from './device-monitor/components/DeviceTelemetryPanel.vue'
import './device-monitor/device-monitor.css'

const infrastructureStore = useInfrastructureStore()
const runtimes = ref(createDeviceMonitorRuntimes(infrastructureStore.devices))
const latestDevice = infrastructureStore.devices
  .slice()
  .sort((left, right) => (right.updatedAt || '').localeCompare(left.updatedAt || ''))[0]
const selectedDeviceId = ref(latestDevice?.id ?? '')
const isLive = ref(true)

const selectedDevice = computed(
  () =>
    infrastructureStore.devices.find((device) => device.id === selectedDeviceId.value) ??
    infrastructureStore.devices[0],
)

const selectedLine = computed(() =>
  infrastructureStore.lines.find((line) => line.id === selectedDevice.value?.lineId),
)

const currentRuntime = computed(() =>
  selectedDevice.value ? runtimes.value[selectedDevice.value.id] : undefined,
)

const relationText = computed(() => {
  const device = selectedDevice.value
  return device ? linkedMonitorText(device, infrastructureStore.devices) : ''
})

const lastSeenText = computed(() => {
  if (!isLive.value) return '已暂停'
  return selectedDevice.value?.lastSeen || '暂无上报'
})

function toggleLive() {
  isLive.value = !isLive.value
}

async function refreshDeviceStatus(signal: AbortSignal) {
  const runtime = currentRuntime.value
  const device = selectedDevice.value
  if (!runtime || !device) return
  runtime.signalQuality =
    device.signalDbm == null
      ? null
      : Math.max(0, Math.min(100, Math.round(((device.signalDbm + 100) / 60) * 100)))
  if (device.latencyMs != null)
    runtime.latencyHistory = [...runtime.latencyHistory, device.latencyMs].slice(-6)
  if (device.category === 'locator') return
  const frame = await fetchLatestWaveform(device.id, null, signal)
  signal.throwIfAborted()
  const samples = frame.frame_valid === false ? [] : (frame.waveform_samples ?? [])
  const stats = waveformStatistics(samples)
  runtime.frameId = frame.frame_id ? `#FRAME-${frame.frame_id}` : '--'
  runtime.phase = frame.phase_pair ?? frame.cable ?? '--'
  runtime.pointCount = stats.pointCount
  runtime.min = stats.min
  runtime.max = stats.max
  runtime.peakAbs = stats.peakAbs
  runtime.integrityPercent = stats.completeness
  runtime.frameValid = frame.frame_id === null ? null : frame.frame_valid !== false
  runtime.frameError = frame.frame_valid === false ? frame.frame_error || '协议无效' : ''
  runtime.events = frame.frame_id
    ? [
        {
          id: `frame-${frame.frame_id}`,
          level: frame.frame_valid === false ? 'warning' : 'normal',
          title: frame.frame_valid === false ? '波形帧校验失败' : '最新波形帧已入库',
          description: runtime.frameError || `${frame.waveform_points} 个有效采样点`,
          time: frame.created_at ?? '--',
        },
      ]
    : []
}

const { refresh } = usePolling(
  refreshDeviceStatus,
  10000,
  () => isLive.value && Boolean(selectedDevice.value),
)
watch(
  () => infrastructureStore.devices.map((device) => device.id).join('|'),
  () => {
    const created = createDeviceMonitorRuntimes(infrastructureStore.devices)
    Object.keys(runtimes.value).forEach((id) => {
      if (!created[id]) delete runtimes.value[id]
    })
    Object.keys(created).forEach((id) => {
      if (!runtimes.value[id]) runtimes.value[id] = created[id]!
    })
    if (!infrastructureStore.devices.some((device) => device.id === selectedDeviceId.value))
      selectedDeviceId.value = infrastructureStore.devices[0]?.id ?? ''
  },
  { immediate: true },
)
watch(selectedDeviceId, () => {
  void refresh(true)
})
</script>

<template>
  <section class="device-monitor-page" aria-label="设备监测">
    <ModuleState
      v-if="!selectedDevice || !currentRuntime"
      title="暂无设备数据"
      description="请先在设备配置中添加设备。"
    />
    <div v-else class="device-monitor-layout">
      <DeviceMonitorList
        :devices="infrastructureStore.devices"
        :lines="infrastructureStore.lines"
        :selected-device-id="selectedDeviceId"
        @select="selectedDeviceId = $event"
      />

      <DeviceTelemetryPanel :device="selectedDevice" :runtime="currentRuntime" :is-live="isLive">
        <template #actions>
          <div class="monitor-panel-actions" aria-label="设备监测操作">
            <button type="button" :class="{ 'is-live': isLive }" @click="toggleLive">
              <span>{{ isLive ? 'Ⅱ' : '▶' }}</span
              >{{ isLive ? '暂停刷新' : '继续刷新' }}
            </button>
          </div>
        </template>
      </DeviceTelemetryPanel>

      <DeviceDetailPanel
        :device="selectedDevice"
        :runtime="currentRuntime"
        :line-name="selectedLine?.name ?? '未绑定线路'"
        :relation-text="relationText"
        :last-seen-text="lastSeenText"
      />
    </div>
  </section>
</template>
