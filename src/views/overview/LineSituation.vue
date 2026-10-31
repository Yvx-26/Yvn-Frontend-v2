<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useInfrastructureStore } from '../../stores/infrastructure'
import LineDetailPanel from './line-situation/components/LineDetailPanel.vue'
import LineEventPanel from './line-situation/components/LineEventPanel.vue'
import LineListPanel from './line-situation/components/LineListPanel.vue'
import MetricCard from '../../components/common/MetricCard.vue'
import type { Metric as LineMetric } from '../../components/common/metric'
import LineNodeTable from './line-situation/components/LineNodeTable.vue'
import type { SituationLine } from './line-situation/types'
import './line-situation/line-situation.css'
import './overview-layout.css'

const infrastructureStore = useInfrastructureStore()
const route = useRoute()
const requestedLineId = typeof route.query.line === 'string' ? route.query.line : ''
const selectedLineId = ref(
  infrastructureStore.lines.some((line) => line.id === requestedLineId)
    ? requestedLineId
    : (infrastructureStore.lines[0]?.id ?? ''),
)

const situationLines = computed<SituationLine[]>(() =>
  infrastructureStore.lines.map((line) => {
    const onlineCount = line.devices.filter((device) => device.state === 'online').length
    const hasOffline = line.devices.some((device) => device.state === 'offline')
    const hasWarning = line.devices.some((device) => device.state === 'warning')
    const status = !line.devices.length || hasWarning || hasOffline ? 'warning' : 'normal'
    const updateValues = line.devices
      .map((device) => infrastructureStore.lastActivityAt(device.id))
      .filter(Boolean)
      .sort()
    const lastUpdate = updateValues[updateValues.length - 1] ?? ''

    return {
      id: line.id,
      code: line.id,
      name: line.name,
      status,
      statusLabel: !line.devices.length
        ? '尚未接入节点'
        : hasOffline
          ? '存在离线设备'
          : hasWarning
            ? '存在数据异常'
            : '正常',
      type:
        line.type === 'submarine' ? '海底电缆' : line.type === 'hybrid' ? '混合电缆' : '陆地电缆',
      length: line.lengthM ? `${line.lengthM} m` : '--',
      health: line.devices.length ? Math.round((onlineCount / line.devices.length) * 100) : 0,
      lastUpdate: lastUpdate || '--',
      nodes: line.devices.map((device, index) => ({
        id: String(index + 1).padStart(2, '0'),
        deviceId: device.id,
        status:
          device.state === 'online' ? 'normal' : device.state === 'warning' ? 'warning' : 'offline',
        statusLabel:
          device.state === 'online' ? '在线' : device.state === 'warning' ? '数据异常' : '离线',
        batchProgress:
          device.category === 'locator' ? '定位节点（不上传波形）' : '请在行波监测查看',
        lastUpload: device.lastSeen || '--',
      })),
      events: line.devices
        .filter((device) => device.state !== 'online')
        .map((device) => ({
          id: `${line.id}-${device.id}`,
          title: device.state === 'warning' ? '设备数据异常' : '设备当前离线',
          detail: `${device.id} · ${device.lastSeen || '暂无上报'}`,
          time: infrastructureStore.lastActivityAt(device.id)?.split(' ')[1] ?? '--',
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
    {
      id: 'line-total',
      label: '线路总数',
      value: String(total),
      suffix: '条',
      icon: 'route',
      tone: 'primary',
    },
    {
      id: 'line-normal',
      label: '正常运行',
      value: String(normal),
      suffix: '条',
      icon: 'line-status',
      tone: 'success',
    },
    {
      id: 'line-warning',
      label: '存在离线设备',
      value: String(warning),
      suffix: '条',
      icon: 'warning',
      tone: 'warning',
    },
    {
      id: 'line-fault',
      label: '已确认故障',
      value: '0',
      suffix: '条',
      icon: 'lightning',
      tone: 'danger',
    },
  ]
})

function selectLine(line: SituationLine) {
  selectedLineId.value = line.id
}

watch(
  () => infrastructureStore.lines.map((line) => line.id).join('|'),
  () => {
    if (!situationLines.value.some((line) => line.id === selectedLineId.value)) {
      selectedLineId.value = situationLines.value[0]?.id ?? ''
    }
  },
)
</script>

<template>
  <section class="line-situation-page overview-page-layout" aria-label="线路态势数据看板">
    <div class="line-situation-metrics overview-metric-grid" aria-label="线路核心指标">
      <MetricCard
        variant="line-situation"
        v-for="metric in lineMetrics"
        :key="metric.id"
        :metric="metric"
      />
    </div>

    <div class="line-situation-layout overview-content-grid">
      <LineListPanel
        class="overview-list-region"
        :lines="situationLines"
        :selected-id="selectedLine?.id ?? ''"
        @select="selectLine"
      />

      <div v-if="selectedLine" class="line-situation-center-column overview-center-region">
        <LineNodeTable :nodes="selectedLine.nodes" />
      </div>

      <aside
        v-if="selectedLine"
        class="line-situation-right-column overview-secondary-region overview-aligned-column"
        aria-label="选中线路信息"
      >
        <LineDetailPanel :line="selectedLine" />
        <LineEventPanel :line="selectedLine" />
      </aside>
    </div>
  </section>
</template>
