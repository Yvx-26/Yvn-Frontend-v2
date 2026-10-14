<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { fetchDashboardDevices, fetchLatestWaveform } from '../../services/telemetry-api'
import { useInfrastructureStore } from '../../stores/infrastructure'
import { waveformStatistics } from '../../utils/waveform'
import ConnectionQualityPanel from './device-situation/components/ConnectionQualityPanel.vue'
import DeviceDetailPanel from './device-situation/components/DeviceDetailPanel.vue'
import DeviceMetricCard from './device-situation/components/DeviceMetricCard.vue'
import DeviceTable from './device-situation/components/DeviceTable.vue'
import type { DeviceMetric, SituationDevice } from './device-situation/types'
import './device-situation/device-situation.css'

const infrastructureStore = useInfrastructureStore()
const situationDevices = ref<SituationDevice[]>([])
const selectedDeviceId = ref('')
let refreshTimer: number | undefined

const selectedDevice = computed(
  () =>
    situationDevices.value.find((device) => device.id === selectedDeviceId.value) ??
    situationDevices.value[0],
)

const deviceMetrics = computed<DeviceMetric[]>(() => {
  const total = situationDevices.value.length
  const online = situationDevices.value.filter((device) => device.status === 'online').length
  const complete = situationDevices.value.filter(
    (device) => device.frame.pointCount === 4000,
  ).length
  return [
    { id: 'device-total', label: '波形设备总数', value: String(total), suffix: '台', icon: 'device-status', tone: 'primary' },
    { id: 'device-online', label: '当前在线', value: String(online), suffix: `台 · ${total ? ((online / total) * 100).toFixed(1) : '0.0'}%`, icon: 'wifi', tone: 'success' },
    { id: 'device-abnormal', label: '当前离线', value: String(total - online), suffix: '台', icon: 'warning', tone: 'warning' },
    { id: 'frame-ready-rate', label: '最新帧可用率', value: total ? ((complete / total) * 100).toFixed(1) : '0.0', suffix: '%', icon: 'network', tone: 'primary' },
  ]
})

async function refreshDevices() {
  const statuses = await fetchDashboardDevices()
  infrastructureStore.applyRuntimeStatus(statuses)
  const frameResults = await Promise.all(
    statuses.map(async (status) => {
      try {
        return await fetchLatestWaveform(status.imei)
      } catch {
        return null
      }
    }),
  )

  situationDevices.value = statuses.map((status, index) => {
    const configured = infrastructureStore.devices.find((device) => device.id === status.imei)
    const frame = frameResults[index]
    const samples = frame?.waveform_samples ?? []
    const stats = waveformStatistics(samples)
    return {
      id: status.imei,
      name: configured?.name ?? `监测终端 ${status.imei}`,
      line: status.cable_name ?? configured?.lineId ?? '未绑定线路',
      position: configured?.position || '未配置位置',
      status: status.online ? 'online' : 'offline',
      statusLabel: status.online ? '在线' : '离线',
      latency: '--',
      lastUpload: status.last_wave_time ?? '暂无上报',
      frame: {
        id: frame?.frame_id ? `FRAME-${frame.frame_id}` : '--',
        phase: frame?.phase_pair ?? frame?.cable ?? '--',
        ...stats,
      },
      connectionRate: status.online ? '当前在线' : '当前离线',
      qualityTrend: [status.online ? 100 : 0],
    }
  })

  if (!situationDevices.value.some((device) => device.id === selectedDeviceId.value)) {
    selectedDeviceId.value = situationDevices.value[0]?.id ?? ''
  }
}

function selectDevice(device: SituationDevice) {
  selectedDeviceId.value = device.id
}

onMounted(() => {
  void refreshDevices()
  refreshTimer = window.setInterval(() => void refreshDevices(), 10000)
})

onBeforeUnmount(() => {
  if (refreshTimer) window.clearInterval(refreshTimer)
})
</script>

<template>
  <section class="device-situation-page" aria-label="设备态势数据看板">
    <div class="device-situation-metrics" aria-label="设备核心指标">
      <DeviceMetricCard v-for="metric in deviceMetrics" :key="metric.id" :metric="metric" />
    </div>

    <div class="device-situation-layout">
      <DeviceTable
        :devices="situationDevices"
        :selected-id="selectedDevice?.id ?? ''"
        @select="selectDevice"
      />

      <aside v-if="selectedDevice" class="device-situation-right-column" aria-label="选中设备信息">
        <DeviceDetailPanel :device="selectedDevice" />
        <ConnectionQualityPanel :device="selectedDevice" />
      </aside>
    </div>
  </section>
</template>
