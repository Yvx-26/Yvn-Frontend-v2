<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useInfrastructureStore } from '../../stores/infrastructure'
import { fetchDashboardDevices, fetchLatestWaveform } from '../../services/telemetry-api'
import { waveformStatistics } from '../../utils/waveform'
import { createDeviceMonitorRuntimes } from './device-monitor/data'
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
const reconnecting = ref(false)
const toastMessage = ref('')
let statusTimer: number | undefined
let toastTimer: number | undefined

const selectedDevice = computed(
  () =>
    infrastructureStore.devices.find((device) => device.id === selectedDeviceId.value) ??
    infrastructureStore.devices[0]!,
)

const selectedLine = computed(() =>
  infrastructureStore.lines.find((line) => line.id === selectedDevice.value.lineId),
)

const currentRuntime = computed(() => runtimes.value[selectedDevice.value.id]!)
const categoryLabels = {
  monitor: '监测设备',
  locator: '定位设备',
  integrated: '一体化终端',
}

const relationText = computed(() => {
  const device = selectedDevice.value
  if (device.category === 'monitor') return `关联定位设备 ${device.linkedLocatorId || '--'}`
  if (device.category === 'locator') return `关联监测设备 ${device.id.replace('DW', 'JC')}`
  return '监测与定位功能一体化'
})

const lastSeenText = computed(() => {
  if (!isLive.value) return '已暂停'
  return selectedDevice.value.lastSeen || '暂无上报'
})

function toggleLive() {
  isLive.value = !isLive.value
}

function showToast(message: string) {
  toastMessage.value = message
  if (toastTimer) window.clearTimeout(toastTimer)
  toastTimer = window.setTimeout(() => (toastMessage.value = ''), 1800)
}

async function reconnect() {
  if (reconnecting.value) return
  reconnecting.value = true
  try {
    await refreshDeviceStatus()
    showToast('设备状态已刷新')
  } catch (error) {
    showToast(error instanceof Error ? error.message : '设备状态刷新失败')
  } finally {
    reconnecting.value = false
  }
}

async function refreshDeviceStatus() {
  if (!isLive.value) return
  const items = await fetchDashboardDevices()
  infrastructureStore.applyRuntimeStatus(items)
  const runtime = currentRuntime.value
  const status = items.find((item) => item.imei === selectedDeviceId.value)
  if (!runtime || !status || selectedDevice.value.category === 'locator') return
  const frame = await fetchLatestWaveform(selectedDeviceId.value)
  const samples = frame.waveform_samples ?? []
  const stats = waveformStatistics(samples)
  runtime.frameId = frame.frame_id ? `#FRAME-${frame.frame_id}` : '--'
  runtime.phase = frame.phase_pair ?? frame.cable ?? '--'
  runtime.pointCount = stats.pointCount
  runtime.min = stats.min
  runtime.max = stats.max
  runtime.peakAbs = stats.peakAbs
  runtime.integrityPercent = stats.completeness
  runtime.events = frame.frame_id
    ? [
        {
          id: `frame-${frame.frame_id}`,
          level: 'normal',
          title: '最新波形帧已入库',
          description: `${frame.waveform_points} 个有效采样点`,
          time: frame.created_at ?? status.last_wave_time ?? '--',
        },
      ]
    : []
}

onMounted(() => {
  void reconnect()
  statusTimer = window.setInterval(() => void refreshDeviceStatus(), 10000)
})

watch(selectedDeviceId, () => void refreshDeviceStatus())

onBeforeUnmount(() => {
  if (statusTimer) window.clearInterval(statusTimer)
  if (toastTimer) window.clearTimeout(toastTimer)
})
</script>

<template>
  <section class="device-monitor-page" aria-label="设备监测">
    <section class="device-monitor-summary">
      <div class="device-monitor-summary-device">
        <span>当前监测对象</span>
        <div>
          <i class="device-monitor-state-dot" :class="`is-${selectedDevice.state}`"></i>
          <strong>{{ selectedDevice.name }}</strong>
          <em>{{ categoryLabels[selectedDevice.category] }}</em>
        </div>
        <small>
          {{ selectedLine?.name ?? '未绑定线路' }} · {{ selectedDevice.position }} ·
          {{ relationText }}
        </small>
      </div>

      <div class="device-monitor-summary-metric">
        <span>通信延迟</span>
        <strong>{{ selectedDevice.latencyMs ?? '--' }}<small>ms</small></strong>
      </div>
      <div class="device-monitor-summary-metric">
        <span>信号强度</span>
        <strong>{{ selectedDevice.signalDbm ?? '--' }}<small>dBm</small></strong>
      </div>
      <div class="device-monitor-summary-metric">
        <span>最后上报</span>
        <strong class="is-text">{{ lastSeenText }}</strong>
      </div>
      <div class="device-monitor-summary-metric">
        <span>最新波形帧</span>
        <strong class="is-text">
          {{
            selectedDevice.category === 'locator'
              ? '不适用'
              : `${currentRuntime.pointCount} / 4000 点`
          }}
        </strong>
      </div>
    </section>

    <div class="device-monitor-layout">
      <DeviceMonitorList
        :devices="infrastructureStore.devices"
        :lines="infrastructureStore.lines"
        :selected-device-id="selectedDeviceId"
        @select="selectedDeviceId = $event"
      />

      <DeviceTelemetryPanel :device="selectedDevice" :runtime="currentRuntime" :is-live="isLive">
        <template #actions>
          <div class="monitor-panel-actions" aria-label="设备监测操作">
            <button type="button" :disabled="reconnecting" @click="reconnect">
              <svg><use href="#icon-history" /></svg>
              {{ reconnecting ? '刷新中…' : '刷新状态' }}
            </button>
            <button type="button" :class="{ 'is-live': isLive }" @click="toggleLive">
              <span>{{ isLive ? 'Ⅱ' : '▶' }}</span
              >{{ isLive ? '暂停刷新' : '继续刷新' }}
            </button>
          </div>
        </template>
      </DeviceTelemetryPanel>

      <DeviceDetailPanel :device="selectedDevice" :runtime="currentRuntime" />
    </div>

    <Transition name="device-monitor-toast">
      <div v-if="toastMessage" class="device-monitor-toast" role="status">
        <i></i>{{ toastMessage }}
      </div>
    </Transition>
  </section>
</template>
