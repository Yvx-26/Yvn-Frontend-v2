<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { fetchLatestWaveform } from '../../services/telemetry-api'
import { usePolling } from '../../composables/usePolling'
import ModuleState from '../../components/common/ModuleState.vue'
import { cableLineStyles, resolveCableLineState } from '../../domain/map/lines'
import { useInfrastructureStore } from '../../stores/infrastructure'
import { waveformStatistics } from '../../utils/waveform'
import LineBatchProgress from './line-monitor/components/LineBatchProgress.vue'
import LineMonitorDevices from './line-monitor/components/LineMonitorDevices.vue'
import LineMonitorList from './line-monitor/components/LineMonitorList.vue'
import LineMonitorMap from './line-monitor/components/LineMonitorMap.vue'
import type { LineBatchRuntime, LineMonitorLineView } from './line-monitor/types'
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
const refreshedAt = ref<Record<string, Date>>({})
const snapshotMessageVisible = ref(false)
let toastTimer: number | undefined

const lineViews = computed<LineMonitorLineView[]>(() =>
  infrastructureStore.lines.map((line) => {
    return {
      line,
      ...resolveCableLineState(line, infrastructureStore.devices),
      onlineCount: line.devices.filter((device) => device.state === 'online').length,
    }
  }),
)

const currentLineView = computed(
  () => lineViews.value.find((item) => item.line.id === selectedLineId.value) ?? lineViews.value[0],
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

const timeText = computed(
  () =>
    refreshedAt.value[selectedLineId.value]?.toLocaleTimeString('zh-CN', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }) ?? '等待读取',
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

async function refreshLineData(signal: AbortSignal) {
  await Promise.all(
    infrastructureStore.lines
      .filter((line) => line.id === selectedLineId.value)
      .map(async (line) => {
        const candidates = infrastructureStore.devices.filter(
          (device) => device.lineId === line.id && device.enabled && device.category !== 'locator',
        )
        const monitor =
          infrastructureStore.runtimeDevices
            .map((status) => candidates.find((device) => device.id === status.imei))
            .find(Boolean) ?? candidates[0]
        if (!monitor) {
          delete batchRuntime.value[line.id]
          delete refreshedAt.value[line.id]
          return
        }
        const frame = await fetchLatestWaveform(monitor.id, null, signal)
        signal.throwIfAborted()
        const samples = frame.frame_valid === false ? [] : (frame.waveform_samples ?? [])
        const stats = waveformStatistics(samples)
        batchRuntime.value[line.id] = {
          lineId: line.id,
          monitorDeviceId: monitor.id,
          frameId: frame.frame_id ? `#FRAME-${frame.frame_id}` : '尚无监测帧',
          phase: frame.phase_pair ?? frame.cable ?? '--',
          ...stats,
          frameError:
            frame.frame_valid === false ? `帧校验失败：${frame.frame_error || '协议无效'}` : '',
          primaryEvent:
            frame.frame_valid === false
              ? '最新波形帧未通过协议校验'
              : frame.frame_id
                ? `${frame.created_at ?? '--'} · ${monitor.id} 波形帧入库完成`
                : '尚未接收到监测数据',
          secondaryEvent: `${monitor.id} · ${monitor.lastSeen || '暂无上报'}`,
        }
        refreshedAt.value[line.id] = new Date()
      }),
  )
}

function showSnapshotMessage() {
  const current = currentLineView.value
  if (!current) return
  const snapshot = {
    capturedAt: new Date().toISOString(),
    line: {
      id: current.line.id,
      name: current.line.name,
      state: current.status,
      devices: current.line.devices.map((device) => ({
        id: device.id,
        coordinate: device.coordinate,
        state: device.state,
        lastSeen: device.lastSeen,
      })),
    },
    waveform: currentRuntime.value,
  }
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(snapshot, null, 2)], { type: 'application/json' }),
  )
  const link = document.createElement('a')
  link.href = url
  link.download = `线路快照-${current.line.id.replace(/[^\w\u4e00-\u9fff-]/g, '_')}-${Date.now()}.json`
  link.click()
  URL.revokeObjectURL(url)
  snapshotMessageVisible.value = true
  if (toastTimer) window.clearTimeout(toastTimer)
  toastTimer = window.setTimeout(() => (snapshotMessageVisible.value = false), 1800)
}

onBeforeUnmount(() => {
  if (toastTimer) window.clearTimeout(toastTimer)
})
const { refresh } = usePolling(
  refreshLineData,
  10000,
  () => isLive.value && Boolean(currentLineView.value),
)
watch(selectedLineId, () => {
  void refresh(true)
})
watch(
  () => infrastructureStore.lines.map((line) => line.id).join('|'),
  () => {
    if (!infrastructureStore.lines.some((line) => line.id === selectedLineId.value))
      selectLine(infrastructureStore.lines[0]?.id ?? '')
  },
)
</script>

<template>
  <section class="line-monitor-page" aria-label="线路监测">
    <ModuleState
      v-if="!currentLineView"
      title="暂无线路数据"
      description="请在线路管理中建立线路并绑定定位设备。"
    />
    <template v-else>
      <section class="line-monitor-summary" aria-label="当前线路摘要">
        <div>
          <i class="line-monitor-state-dot" :style="{ background: cableLineStyles[currentLineView.status].color }"></i>
          <strong class="asset-truncate" :title="currentLineView.line.name">{{ currentLineView.line.name }}</strong>
          <span>{{ currentLineView.statusLabel }} · {{ currentLineView.statusDetail }}</span>
        </div>
        <div>
          <span
            >线路长度<strong>{{ currentLineView.line.lengthM || '--' }} m</strong></span
          >
          <span
            >定位点<strong>{{ currentLineView.line.devices.length }}</strong></span
          >
          <span>
            在线定位点
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
              <svg><use href="#icon-history" /></svg>导出快照
            </button>
            <button type="button" :class="{ 'is-live': isLive }" @click="toggleLive">
              <span>{{ isLive ? 'Ⅱ' : '▶' }}</span
              >{{ isLive ? '暂停刷新' : '继续刷新' }}
            </button>
          </div>
        </div>
      </section>

      <div class="line-monitor-layout">
        <LineMonitorList
          :lines="lineViews"
          :selected-line-id="selectedLineId"
          @select="selectLine"
        />

        <div class="line-monitor-center">
          <LineMonitorMap
            :line="currentLineView.line"
            :line-state="currentLineView"
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
    </template>

    <Transition name="line-monitor-toast">
      <div v-if="snapshotMessageVisible" class="line-monitor-toast" role="status">
        <i></i>当前线路状态快照已导出
      </div>
    </Transition>
  </section>
</template>
