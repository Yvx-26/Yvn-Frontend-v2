<script setup lang="ts">
import { ref, shallowRef } from 'vue'
import { usePolling } from '../../composables/usePolling'
import { useInfrastructureStore } from '../../stores/infrastructure'
import {
  fetchDashboardDevices,
  fetchDashboardSummary,
  fetchLatestWaveform,
} from '../../services/telemetry-api'
import { waveformStatistics } from '../../utils/waveform'
import AlarmPanel from './comprehensive/components/AlarmPanel.vue'
import BatchMonitorPanel from './comprehensive/components/BatchMonitorPanel.vue'
import DeviceStatusPanel from './comprehensive/components/DeviceStatusPanel.vue'
import LineSituationPanel from './comprehensive/components/LineSituationPanel.vue'
import OverviewMetricCard from './comprehensive/components/OverviewMetricCard.vue'
import { overviewRuntimeCache } from './comprehensive/overview-cache'
import type {
  MonitoredDevice,
  MonitoringFrame,
  OverviewAlarm,
  OverviewMetric,
} from './comprehensive/types'
import './comprehensive/overview.css'
import './overview-layout.css'

const infrastructureStore = useInfrastructureStore()
const overviewMetrics = ref<OverviewMetric[]>([
  {
    id: 'online-devices',
    label: '在线监测设备',
    value: '0',
    suffix: '/ 0 台',
    icon: 'device-status',
    tone: 'success',
    note: '等待实时状态',
  },
  {
    id: 'received-batches',
    label: '今日接收帧',
    value: '0',
    suffix: '帧',
    icon: 'network',
    tone: 'primary',
    note: '来自设备原始数据表',
  },
  {
    id: 'location-devices',
    label: '定位设备',
    value: '0',
    suffix: '台',
    icon: 'wave-live',
    tone: 'primary',
    note: '已有最新定位记录',
  },
  {
    id: 'pending-alarms',
    label: '待处理告警',
    value: '0',
    suffix: '条',
    icon: 'siren',
    tone: 'warning',
    note: '告警业务待接入',
  },
])
const monitoredDevices = ref<MonitoredDevice[]>([])
const latestAlarms = ref<OverviewAlarm[]>([])
const emptyLatestBatch: MonitoringFrame = {
  id: '--',
  deviceId: '',
  samples: [],
  min: 0,
  max: 0,
  error: '',
}
const latestBatch = shallowRef<MonitoringFrame>(
  overviewRuntimeCache.latestBatch ?? emptyLatestBatch,
)
usePolling(refreshOverview)

async function refreshOverview(signal: AbortSignal) {
  const [summary, devices] = await Promise.all([
    fetchDashboardSummary(signal),
    fetchDashboardDevices(signal),
  ])
  signal.throwIfAborted()
  infrastructureStore.applyRuntimeStatus(devices)
  const onlineCount = devices.filter((device) => device.online).length
  overviewMetrics.value = [
    {
      id: 'online-devices',
      label: '在线监测设备',
      value: String(onlineCount),
      suffix: `/ ${summary.device_total} 台`,
      icon: 'device-status',
      tone: 'success',
      note: summary.device_total
        ? `在线率 ${((onlineCount / summary.device_total) * 100).toFixed(1)}%`
        : '暂无设备上报',
    },
    {
      id: 'received-batches',
      label: '今日接收帧',
      value: summary.wave_today.toLocaleString(),
      suffix: '帧',
      icon: 'network',
      tone: 'primary',
      note: '数据链路持续接收',
    },
    {
      id: 'location-devices',
      label: '定位设备',
      value: String(summary.location_today),
      suffix: '台',
      icon: 'wave-live',
      tone: 'primary',
      note: '已有最新定位记录',
    },
    {
      id: 'pending-alarms',
      label: '待处理告警',
      value: String(summary.alarm_count),
      suffix: '条',
      icon: 'siren',
      tone: 'warning',
      note: '告警业务待接入',
    },
  ]
  monitoredDevices.value = devices.slice(0, 6).map((item) => {
    const configured = infrastructureStore.devices.find((device) => device.id === item.imei)
    return {
      id: item.imei,
      name: configured?.name ?? `监测终端 ${item.imei}`,
      area: configured?.position || item.cable_name || '未绑定位置',
      status: item.online ? 'online' : 'offline',
      latency: item.online ? configured?.lastSeen || '在线' : '离线',
    }
  })

  const latestDevice = devices[0]
  if (latestDevice) {
    const frame = await fetchLatestWaveform(latestDevice.imei, null, signal)
    signal.throwIfAborted()
    if (frame.frame_id !== null) {
      if (
        latestBatch.value.id === String(frame.frame_id) &&
        latestBatch.value.deviceId === latestDevice.imei
      )
        return
      const stats = waveformStatistics(frame.waveform_samples)
      const nextBatch: MonitoringFrame = {
        id: String(frame.frame_id),
        deviceId: latestDevice.imei,
        samples: frame.frame_valid === false ? [] : (frame.waveform_samples ?? []),
        min: stats.min,
        max: stats.max,
        error:
          frame.frame_valid === false ? `最新帧校验失败：${frame.frame_error || '协议无效'}` : '',
      }
      latestBatch.value = nextBatch
      overviewRuntimeCache.latestBatch = nextBatch
    } else {
      latestBatch.value = emptyLatestBatch
      overviewRuntimeCache.latestBatch = undefined
    }
  } else {
    latestBatch.value = emptyLatestBatch
    overviewRuntimeCache.latestBatch = undefined
  }
}
</script>

<template>
  <section class="overview-dashboard overview-page-layout" aria-label="综合总览数据看板">
    <div class="overview-metrics overview-metric-grid" aria-label="核心运行指标">
      <OverviewMetricCard v-for="metric in overviewMetrics" :key="metric.id" :metric="metric" />
    </div>

    <div class="overview-dashboard-grid overview-content-grid">
      <div class="overview-main-column overview-primary-region overview-aligned-column">
        <LineSituationPanel
          :lines="infrastructureStore.lines"
          :devices="infrastructureStore.devices"
        />
        <BatchMonitorPanel :batch="latestBatch" />
      </div>

      <aside
        class="overview-side-column overview-secondary-region overview-aligned-column"
        aria-label="设备与告警信息"
      >
        <DeviceStatusPanel :devices="monitoredDevices" />
        <AlarmPanel :alarms="latestAlarms" />
      </aside>
    </div>
  </section>
</template>
