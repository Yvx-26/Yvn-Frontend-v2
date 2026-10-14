<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
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
import type {
  LineNode,
  MonitoredDevice,
  MonitoringFrame,
  OverviewAlarm,
  OverviewMetric,
} from './comprehensive/types'
import './comprehensive/overview.css'

const infrastructureStore = useInfrastructureStore()
const overviewMetrics = ref<OverviewMetric[]>([
  { id: 'online-devices', label: '在线监测设备', value: '0', suffix: '/ 0 台', icon: 'device-status', tone: 'success', note: '等待实时状态' },
  { id: 'received-batches', label: '今日接收帧', value: '0', suffix: '帧', icon: 'network', tone: 'primary', note: '来自设备原始数据表' },
  { id: 'location-devices', label: '定位设备', value: '0', suffix: '台', icon: 'wave-live', tone: 'primary', note: '已有最新定位记录' },
  { id: 'pending-alarms', label: '待处理告警', value: '0', suffix: '条', icon: 'siren', tone: 'warning', note: '告警业务待接入' },
])
const monitoredDevices = ref<MonitoredDevice[]>([])
const latestAlarms = ref<OverviewAlarm[]>([])
const latestBatch = ref<MonitoringFrame>({
  id: '--',
  deviceName: '暂无设备数据',
  receivedAt: '--',
  phase: '--',
  pointCount: 0,
  min: 0,
  max: 0,
  peakAbs: 0,
  completeness: 0,
})
let refreshTimer: number | undefined

const lineNodes = computed<LineNode[]>(() => {
  const line = infrastructureStore.lines.find((item) => item.devices.length > 0)
  if (!line) return []
  const count = Math.max(1, line.devices.length - 1)
  return line.devices.map((device, index) => ({
    id: String(device.sequence).padStart(2, '0'),
    name: device.position || device.name,
    position: line.name,
    status: device.state === 'online' ? 'normal' : 'warning',
    top: `${67 - (index / count) * 32}%`,
    left: `${10 + (index / count) * 73}%`,
  }))
})

async function refreshOverview() {
  try {
    const [summary, devices] = await Promise.all([
      fetchDashboardSummary(),
      fetchDashboardDevices(),
    ])
    infrastructureStore.applyRuntimeStatus(devices)
    const onlineCount = devices.filter((device) => device.online).length
    overviewMetrics.value = [
      { id: 'online-devices', label: '在线监测设备', value: String(onlineCount), suffix: `/ ${summary.device_total} 台`, icon: 'device-status', tone: 'success', note: summary.device_total ? `在线率 ${((onlineCount / summary.device_total) * 100).toFixed(1)}%` : '暂无设备上报' },
      { id: 'received-batches', label: '今日接收帧', value: summary.wave_today.toLocaleString(), suffix: '帧', icon: 'network', tone: 'primary', note: '数据链路持续接收' },
      { id: 'location-devices', label: '定位设备', value: String(summary.location_today), suffix: '台', icon: 'wave-live', tone: 'primary', note: '已有最新定位记录' },
      { id: 'pending-alarms', label: '待处理告警', value: String(summary.alarm_count), suffix: '条', icon: 'siren', tone: 'warning', note: '告警业务待接入' },
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
      const frame = await fetchLatestWaveform(latestDevice.imei)
      if (frame.frame_id !== null) {
        const configured = infrastructureStore.devices.find((device) => device.id === latestDevice.imei)
        const stats = waveformStatistics(frame.waveform_samples)
        latestBatch.value = {
          id: String(frame.frame_id),
          deviceName: configured?.name ?? latestDevice.imei,
          receivedAt: frame.created_at ?? '--',
          phase: frame.phase_pair ?? frame.cable ?? '--',
          ...stats,
        }
      }
    }
  } catch {
    // 保留上一次成功结果；基础资料页会显示统一的连接错误。
  }
}

onMounted(() => {
  void refreshOverview()
  refreshTimer = window.setInterval(() => void refreshOverview(), 10000)
})

onBeforeUnmount(() => {
  if (refreshTimer) window.clearInterval(refreshTimer)
})
</script>

<template>
  <section class="overview-dashboard" aria-label="综合总览数据看板">
    <div class="overview-metrics" aria-label="核心运行指标">
      <OverviewMetricCard v-for="metric in overviewMetrics" :key="metric.id" :metric="metric" />
    </div>

    <div class="overview-dashboard-grid">
      <div class="overview-main-column">
        <LineSituationPanel :nodes="lineNodes" />
        <BatchMonitorPanel :batch="latestBatch" />
      </div>

      <aside class="overview-side-column" aria-label="设备与告警信息">
        <DeviceStatusPanel :devices="monitoredDevices" />
        <AlarmPanel :alarms="latestAlarms" />
      </aside>
    </div>
  </section>
</template>
