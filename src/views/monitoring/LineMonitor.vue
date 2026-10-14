<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { fetchDashboardDevices, fetchLatestWaveform } from '../../services/telemetry-api'
import { useInfrastructureStore } from '../../stores/infrastructure'
import { waveformStatistics } from '../../utils/waveform'
import LineBatchProgress from './line-monitor/components/LineBatchProgress.vue'
import LineMonitorDevices from './line-monitor/components/LineMonitorDevices.vue'
import LineMonitorList from './line-monitor/components/LineMonitorList.vue'
import LineMonitorMap from './line-monitor/components/LineMonitorMap.vue'
import type { LineBatchRuntime, LineMonitorLineView, LineRuntimeStatus } from './line-monitor/types'
import './line-monitor/line-monitor.css'

const infrastructureStore = useInfrastructureStore()
const batchRuntime = ref<Record<string, LineBatchRuntime>>({})
const latestLine = infrastructureStore.lines.slice().sort((left, right) => {
  const latest = (line: (typeof infrastructureStore.lines)[number]) =>
    line.devices
      .map((device) => device.updatedAt || '')
      .sort()
      .pop() ?? ''
  return latest(right).localeCompare(latest(left))
})[0]
const selectedLineId = ref(latestLine?.id ?? '')
const selectedDeviceId = ref(latestLine?.devices[0]?.id ?? '')
const isLive = ref(true)
const currentTime = ref(new Date())
const snapshotMessageVisible = ref(false)
let refreshTimer: number | undefined
let clockTimer: number | undefined
let toastTimer: number | undefined

function resolveStatus(line: (typeof infrastructureStore.lines)[number]): LineRuntimeStatus {
  if (line.state === 'draft' || line.devices.length === 0) return 'draft'
  if (line.devices.some((device) => device.state !== 'online')) return 'warning'
  return 'normal'
}

const statusLabels: Record<LineRuntimeStatus, string> = {
  normal: '运行正常',
  warning: '通信预警',
  draft: '待接入',
}

const lineViews = computed<LineMonitorLineView[]>(() =>
  infrastructureStore.lines.map((line) => {
    const status = resolveStatus(line)
    return {
      line,
      status,
      statusText: statusLabels[status],
      onlineCount: line.devices.filter((device) => device.state === 'online').length,
    }
  }),
)

const currentLineView = computed(
  () =>
    lineViews.value.find((item) => item.line.id === selectedLineId.value) ?? lineViews.value[0]!,
)

const currentRuntime = computed<LineBatchRuntime>(
  () =>
    batchRuntime.value[selectedLineId.value] ?? {
      lineId: selectedLineId.value,
      monitorDeviceId: '--',
      frameId: '尚无监测帧',
      phase: '--',
      pointCount: 0,
      min: 0,
      max: 0,
      peakAbs: 0,
      completeness: 0,
      primaryEvent: '尚未接收到监测数据',
      secondaryEvent: '等待设备接入实时数据链路',
    },
)

const timeText = computed(() =>
  currentTime.value.toLocaleTimeString('zh-CN', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }),
)

function selectLine(lineId: string) {
  selectedLineId.value = lineId
  const line = infrastructureStore.lines.find((item) => item.id === lineId)
  selectedDeviceId.value =
    line?.devices.find((device) => device.state === 'warning')?.id ?? line?.devices[0]?.id ?? ''
}

function toggleLive() {
  isLive.value = !isLive.value
}

async function refreshLineData() {
  if (!isLive.value) return
  infrastructureStore.applyRuntimeStatus(await fetchDashboardDevices())
  await Promise.all(
    infrastructureStore.lines.map(async (line) => {
      const monitor = line.devices.find((device) => device.category !== 'locator')
      if (!monitor) return
      try {
        const frame = await fetchLatestWaveform(monitor.id)
        const samples = frame.waveform_samples ?? []
        const stats = waveformStatistics(samples)
        batchRuntime.value[line.id] = {
          lineId: line.id,
          monitorDeviceId: monitor.id,
          frameId: frame.frame_id ? `#FRAME-${frame.frame_id}` : '尚无监测帧',
          phase: frame.phase_pair ?? frame.cable ?? '--',
          ...stats,
          primaryEvent: frame.frame_id
            ? `${frame.created_at ?? '--'} · ${monitor.id} 波形帧入库完成`
            : '尚未接收到监测数据',
          secondaryEvent: `${monitor.id} · ${monitor.lastSeen || '暂无上报'}`,
        }
      } catch {
        // 保留上一次成功读取的真实结果。
      }
    }),
  )
}

function showSnapshotMessage() {
  snapshotMessageVisible.value = true
  if (toastTimer) window.clearTimeout(toastTimer)
  toastTimer = window.setTimeout(() => (snapshotMessageVisible.value = false), 1800)
}

onMounted(() => {
  void refreshLineData()
  refreshTimer = window.setInterval(() => void refreshLineData(), 10000)
  clockTimer = window.setInterval(() => (currentTime.value = new Date()), 1000)
})

onBeforeUnmount(() => {
  if (refreshTimer) window.clearInterval(refreshTimer)
  if (clockTimer) window.clearInterval(clockTimer)
  if (toastTimer) window.clearTimeout(toastTimer)
})
</script>

<template>
  <section class="line-monitor-page" aria-label="线路监测">
    <section class="line-monitor-summary" aria-label="当前线路摘要">
      <div>
        <i class="line-monitor-state-dot" :class="`is-${currentLineView.status}`"></i>
        <strong>{{ currentLineView.line.name }}</strong>
        <span>{{ currentLineView.statusText }}</span>
      </div>
      <div>
        <span
          >线路长度<strong>{{ currentLineView.line.lengthKm || '--' }} km</strong></span
        >
        <span
          >定位点<strong>{{ currentLineView.line.devices.length }}</strong></span
        >
        <span>
          在线设备
          <strong
            >{{ currentLineView.onlineCount }}/{{
              currentLineView.line.devices.length || '--'
            }}</strong
          >
        </span>
        <span
          >刷新时间<strong>{{ isLive ? timeText : '已暂停' }}</strong></span
        >
        <div class="monitor-panel-actions line-monitor-summary-actions" aria-label="线路监测操作">
          <button type="button" @click="showSnapshotMessage">
            <svg><use href="#icon-history" /></svg>历史快照
          </button>
          <button type="button" :class="{ 'is-live': isLive }" @click="toggleLive">
            <span>{{ isLive ? 'Ⅱ' : '▶' }}</span
            >{{ isLive ? '暂停刷新' : '继续刷新' }}
          </button>
        </div>
      </div>
    </section>

    <div class="line-monitor-layout">
      <LineMonitorList :lines="lineViews" :selected-line-id="selectedLineId" @select="selectLine" />

      <div class="line-monitor-center">
        <LineMonitorMap
          :line="currentLineView.line"
          :status="currentLineView.status"
          :selected-device-id="selectedDeviceId"
          :is-live="isLive"
          @select-device="selectedDeviceId = $event"
        />
        <LineBatchProgress :runtime="currentRuntime" :is-live="isLive" />
      </div>

      <LineMonitorDevices
        :devices="currentLineView.line.devices"
        :selected-device-id="selectedDeviceId"
        :runtime="currentRuntime"
        @select="selectedDeviceId = $event"
      />
    </div>

    <Transition name="line-monitor-toast">
      <div v-if="snapshotMessageVisible" class="line-monitor-toast" role="status">
        <i></i>当前线路状态快照已记录
      </div>
    </Transition>
  </section>
</template>
