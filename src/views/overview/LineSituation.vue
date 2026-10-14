<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { fetchDashboardDevices } from '../../services/telemetry-api'
import { useInfrastructureStore } from '../../stores/infrastructure'
import LineDetailPanel from './line-situation/components/LineDetailPanel.vue'
import LineEventPanel from './line-situation/components/LineEventPanel.vue'
import LineListPanel from './line-situation/components/LineListPanel.vue'
import LineMetricCard from './line-situation/components/LineMetricCard.vue'
import LineNodeTable from './line-situation/components/LineNodeTable.vue'
import LineTopologyPanel from './line-situation/components/LineTopologyPanel.vue'
import type { LineMetric, SituationLine } from './line-situation/types'
import './line-situation/line-situation.css'

const infrastructureStore = useInfrastructureStore()
const selectedLineId = ref(infrastructureStore.lines[0]?.id ?? '')
let refreshTimer: number | undefined

const situationLines = computed<SituationLine[]>(() =>
  infrastructureStore.lines.map((line) => {
    const onlineCount = line.devices.filter((device) => device.state === 'online').length
    const hasOffline = line.devices.some((device) => device.state === 'offline')
    const hasWarning = line.devices.some((device) => device.state === 'warning')
    const status = hasWarning || hasOffline ? 'warning' : 'normal'
    const updateValues = line.devices
      .map((device) => device.updatedAt || device.lastSeen)
      .filter(Boolean)
      .sort()
    const lastUpdate = updateValues[updateValues.length - 1] ?? line.updatedAt

    return {
      id: line.id,
      code: line.id,
      name: line.name,
      status,
      statusLabel: status === 'normal' ? '正常' : '存在离线设备',
      type: line.type === 'submarine' ? '海底电缆' : line.type === 'hybrid' ? '混合电缆' : '陆地电缆',
      length: line.lengthKm ? `${line.lengthKm} km` : '--',
      health: line.devices.length ? Math.round((onlineCount / line.devices.length) * 100) : 0,
      lastUpdate: lastUpdate || '--',
      notice: line.devices.length
        ? `${onlineCount} / ${line.devices.length} 台设备在线`
        : '尚未绑定设备',
      nodes: line.devices.map((device, index) => ({
        id: String(index + 1).padStart(2, '0'),
        deviceId: device.id,
        status:
          device.state === 'online' ? 'normal' : device.state === 'warning' ? 'warning' : 'offline',
        statusLabel:
          device.state === 'online' ? '在线' : device.state === 'warning' ? '数据异常' : '离线',
        batchProgress: device.state === 'online' ? '最新帧可用' : '暂无实时帧',
        lastUpload: device.lastSeen || '--',
        left: `${12 + (76 / Math.max(line.devices.length - 1, 1)) * index}%`,
      })),
      events: line.devices
        .filter((device) => device.state !== 'online')
        .map((device) => ({
          id: `${line.id}-${device.id}`,
          title: device.state === 'warning' ? '设备数据异常' : '设备当前离线',
          detail: `${device.id} · ${device.lastSeen || '暂无上报'}`,
          time: device.updatedAt?.split(' ')[1] ?? '--',
          level: 'warning' as const,
        })),
    }
  }),
)

const selectedLine = computed(
  () =>
    situationLines.value.find((line) => line.id === selectedLineId.value) ??
    situationLines.value[0],
)

const lineMetrics = computed<LineMetric[]>(() => {
  const total = situationLines.value.length
  const normal = situationLines.value.filter((line) => line.status === 'normal').length
  const warning = total - normal
  return [
    { id: 'line-total', label: '线路总数', value: String(total), suffix: '条', icon: 'route', tone: 'primary' },
    { id: 'line-normal', label: '正常运行', value: String(normal), suffix: '条', icon: 'line-status', tone: 'success' },
    { id: 'line-warning', label: '存在离线设备', value: String(warning), suffix: '条', icon: 'warning', tone: 'warning' },
    { id: 'line-fault', label: '已确认故障', value: '0', suffix: '条', icon: 'lightning', tone: 'danger' },
  ]
})

function selectLine(line: SituationLine) {
  selectedLineId.value = line.id
}

async function refreshStatuses() {
  infrastructureStore.applyRuntimeStatus(await fetchDashboardDevices())
  if (!situationLines.value.some((line) => line.id === selectedLineId.value)) {
    selectedLineId.value = situationLines.value[0]?.id ?? ''
  }
}

onMounted(() => {
  void refreshStatuses()
  refreshTimer = window.setInterval(() => void refreshStatuses(), 10000)
})

onBeforeUnmount(() => {
  if (refreshTimer) window.clearInterval(refreshTimer)
})
</script>

<template>
  <section class="line-situation-page" aria-label="线路态势数据看板">
    <div class="line-situation-metrics" aria-label="线路核心指标">
      <LineMetricCard v-for="metric in lineMetrics" :key="metric.id" :metric="metric" />
    </div>

    <div class="line-situation-layout">
      <LineListPanel :lines="situationLines" :selected-id="selectedLine?.id ?? ''" @select="selectLine" />

      <div v-if="selectedLine" class="line-situation-center-column">
        <LineTopologyPanel :line="selectedLine" />
        <LineNodeTable :nodes="selectedLine.nodes" />
      </div>

      <aside v-if="selectedLine" class="line-situation-right-column" aria-label="选中线路信息">
        <LineDetailPanel :line="selectedLine" />
        <LineEventPanel :line="selectedLine" />
      </aside>
    </div>
  </section>
</template>
