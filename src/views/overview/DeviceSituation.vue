<script setup lang="ts">
import { computed, ref } from 'vue'
import { usePolling } from '../../composables/usePolling'
import { fetchDashboardDevices, fetchLatestWaveform } from '../../services/telemetry-api'
import { useInfrastructureStore } from '../../stores/infrastructure'
import { waveformStatistics } from '../../utils/waveform'
import ConnectionQualityPanel from './device-situation/components/ConnectionQualityPanel.vue'
import DeviceDetailPanel from './device-situation/components/DeviceDetailPanel.vue'
import MetricCard from '../../components/common/MetricCard.vue'
import type { Metric as DeviceMetric } from '../../components/common/metric'
import DeviceTable from './device-situation/components/DeviceTable.vue'
import type { SituationDevice } from './device-situation/types'
import './device-situation/device-situation.css'
import './overview-layout.css'

const infrastructureStore = useInfrastructureStore()
const situationDevices = ref<SituationDevice[]>([])
const selectedDeviceId = ref('')
usePolling(refreshDevices)

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
    {
      id: 'device-total',
      label: '波形设备总数',
      value: String(total),
      suffix: '台',
      icon: 'device-status',
      tone: 'primary',
    },
    {
      id: 'device-online',
      label: '当前在线',
      value: String(online),
      suffix: `台 · ${total ? ((online / total) * 100).toFixed(1) : '0.0'}%`,
      icon: 'wifi',
      tone: 'success',
    },
    {
      id: 'device-abnormal',
      label: '当前离线',
      value: String(total - online),
      suffix: '台',
      icon: 'warning',
      tone: 'warning',
    },
    {
      id: 'frame-ready-rate',
      label: '最新帧可用率',
      value: total ? ((complete / total) * 100).toFixed(1) : '0.0',
      suffix: '%',
      icon: 'network',
      tone: 'primary',
    },
  ]
})

async function refreshDevices(signal: AbortSignal) {
  const statuses = await fetchDashboardDevices(signal)
  signal.throwIfAborted()
  infrastructureStore.applyRuntimeStatus(statuses)
  const frameResults = await Promise.all(
    statuses.map(async (status) => {
      try {
        return await fetchLatestWaveform(status.imei, null, signal)
      } catch {
        return null
      }
    }),
  )
  signal.throwIfAborted()

  situationDevices.value = statuses.map((status, index) => {
    const configured = infrastructureStore.devices.find((device) => device.id === status.imei)
    const frame = frameResults[index]
    const previousFrame = situationDevices.value.find((device) => device.id === status.imei)?.frame
    const samples = frame?.frame_valid === false ? [] : (frame?.waveform_samples ?? [])
    const stats = waveformStatistics(samples)
    return {
      id: status.imei,
      name: configured?.name ?? `监测终端 ${status.imei}`,
      line: status.cable_name ?? configured?.lineId ?? '未绑定线路',
      position: configured?.position || '未配置位置',
      status: !status.online ? 'offline' : frame?.frame_valid === false ? 'warning' : 'online',
      statusLabel: !status.online ? '离线' : frame?.frame_valid === false ? '帧校验失败' : '在线',
      latency: '--',
      lastUpload: status.last_wave_time ?? '暂无上报',
      frame:
        !frame && previousFrame
          ? previousFrame
          : {
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
</script>

<template>
  <section class="device-situation-page overview-page-layout" aria-label="设备态势数据看板">
    <div class="device-situation-metrics overview-metric-grid" aria-label="设备核心指标">
      <MetricCard
        variant="device-situation"
        v-for="metric in deviceMetrics"
        :key="metric.id"
        :metric="metric"
      />
    </div>

    <div class="device-situation-layout overview-content-grid">
      <DeviceTable
        class="overview-primary-region"
        :devices="situationDevices"
        :selected-id="selectedDevice?.id ?? ''"
        @select="selectDevice"
      />

      <aside
        v-if="selectedDevice"
        class="device-situation-right-column overview-secondary-region overview-aligned-column"
        aria-label="选中设备信息"
      >
        <DeviceDetailPanel :device="selectedDevice" />
        <ConnectionQualityPanel :device="selectedDevice" />
      </aside>
    </div>
  </section>
</template>
