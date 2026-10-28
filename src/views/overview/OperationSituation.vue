<script setup lang="ts">
import { computed, ref } from 'vue'
import { usePolling } from '../../composables/usePolling'
import { fetchOperationDashboard, type OperationDashboard } from '../../services/telemetry-api'
import CurrentOperationPanel from './operation-situation/components/CurrentOperationPanel.vue'
import LineVolumePanel from './operation-situation/components/LineVolumePanel.vue'
import OnlineRatePanel from './operation-situation/components/OnlineRatePanel.vue'
import MetricCard from '../../components/common/MetricCard.vue'
import type { Metric as OperationMetric } from '../../components/common/metric'
import OperationRecordPanel from './operation-situation/components/OperationRecordPanel.vue'
import ReceiveTrendPanel from './operation-situation/components/ReceiveTrendPanel.vue'
import type { OperationRecord, OperationSummaryItem } from './operation-situation/types'
import './operation-situation/operation-situation.css'
import './overview-layout.css'

const dashboard = ref<OperationDashboard | null>(null)

const operationMetrics = computed<OperationMetric[]>(() => [
  {
    id: 'received-frames',
    label: '今日接收帧',
    value: String(dashboard.value?.wave_today ?? 0),
    suffix: '帧',
    icon: 'layers',
    tone: 'primary',
  },
  {
    id: 'received-points',
    label: '今日有效采样点',
    value: ((dashboard.value?.wave_today ?? 0) * 4000).toLocaleString(),
    suffix: '点',
    icon: 'server',
    tone: 'primary',
  },
  {
    id: 'upload-interval',
    label: '平均上传间隔',
    value: String(dashboard.value?.average_interval_seconds ?? 0),
    suffix: '秒',
    icon: 'history',
    tone: 'primary',
  },
  {
    id: 'online-rate',
    label: '设备在线率',
    value: String(dashboard.value?.online_rate ?? 0),
    suffix: '%',
    icon: 'wifi',
    tone: 'success',
  },
])

const receiveTrend = computed(() => dashboard.value?.receive_trend ?? [])
const onlineRateTrend = computed(() => [
  { label: '当前', value: dashboard.value?.online_rate ?? 0 },
])
const lineVolumes = computed(() => dashboard.value?.line_volumes ?? [])

const operationSummary = computed<OperationSummaryItem[]>(() => {
  const latest = (dashboard.value?.records ?? [])[0]
  return [
    { id: 'latest-frame', label: '最新帧', value: latest ? `#${latest.id}` : '--' },
    { id: 'latest-device', label: '最新上报设备', value: latest?.imei ?? '--' },
    {
      id: 'online-devices',
      label: '在线设备',
      value: `${dashboard.value?.online_devices ?? 0} / ${dashboard.value?.device_total ?? 0}`,
    },
    { id: 'pending-events', label: '待处理异常', value: '暂无告警数据' },
  ]
})

const operationRecords = computed<OperationRecord[]>(() =>
  (dashboard.value?.records ?? []).map((record) => ({
    id: record.id,
    title: '波形帧入库完成',
    detail: `${record.imei} · ${record.phase || '未标注相间'}`,
    time: record.created_at?.split(' ')[1] ?? record.created_at ?? '--',
    level: 'normal',
  })),
)

usePolling(async (signal) => {
  const result = await fetchOperationDashboard(signal)
  signal.throwIfAborted()
  dashboard.value = result
})
</script>

<template>
  <section class="operation-situation-page overview-page-layout" aria-label="运行态势数据看板">
    <div class="operation-situation-metrics overview-metric-grid" aria-label="运行核心指标">
      <MetricCard
        variant="operation-situation"
        v-for="metric in operationMetrics"
        :key="metric.id"
        :metric="metric"
      />
    </div>

    <div class="operation-situation-layout overview-content-grid">
      <div class="operation-situation-main-column overview-primary-region overview-aligned-column">
        <ReceiveTrendPanel :points="receiveTrend" />

        <div class="operation-situation-bottom-grid">
          <OnlineRatePanel :points="onlineRateTrend" />
          <LineVolumePanel :lines="lineVolumes" />
        </div>
      </div>

      <aside
        class="operation-situation-side-column overview-secondary-region overview-aligned-column"
        aria-label="当前运行信息"
      >
        <CurrentOperationPanel :items="operationSummary" />
        <OperationRecordPanel :records="operationRecords" />
      </aside>
    </div>
  </section>
</template>
