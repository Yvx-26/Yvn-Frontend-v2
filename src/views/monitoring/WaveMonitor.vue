<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useInfrastructureStore } from '../../stores/infrastructure'
import {
  fetchLatestWaveform,
  fetchWaveHistory,
  fetchHistoryWaveform,
  type WaveHistoryFrame,
} from '../../services/telemetry-api'
import { isRequestCancelled } from '../../services/http'
import WaveHistoryStrip from './wave-monitor/components/WaveHistoryStrip.vue'
import { usePolling } from '../../composables/usePolling'
import { linkedMonitorText } from '../../domain/infrastructure/helpers'
import ModuleState from '../../components/common/ModuleState.vue'
import { createWaveMonitorRuntimes } from './wave-monitor/runtime'
import WaveDetailPanel from './wave-monitor/components/WaveDetailPanel.vue'
import WaveformPanel from './wave-monitor/components/WaveformPanel.vue'
import WaveSourceList from './wave-monitor/components/WaveSourceList.vue'
import './wave-monitor/wave-monitor.css'

const infrastructureStore = useInfrastructureStore()
const route = useRoute()
const runtimes = ref(createWaveMonitorRuntimes(infrastructureStore.devices))
const selectedDeviceId = ref('')
const selectedPhasePair = ref<string | null>(null)
const isLive = ref(true)
const historyStrip = ref<InstanceType<typeof WaveHistoryStrip>>()
const historyOpen = ref(false)
const historyFrameId = ref<number | null>(null)
const historyFrames = ref<WaveHistoryFrame[]>([])
const historyBeforeId = ref<number | null>(null)
const historyHasMore = ref(false)
const historyLoading = ref(false)
const historyError = ref('')
let historyController: AbortController | undefined
let historyRevision = 0

function resetHistory() {
  historyRevision += 1
  historyController?.abort()
  historyFrames.value = []
  historyBeforeId.value = null
  historyHasMore.value = true
  historyLoading.value = false
  historyError.value = ''
}
async function loadMoreHistory() {
  const device = selectedDeviceId.value,
    phase = selectedPhasePair.value
  if (!device || !phase || historyLoading.value || !historyHasMore.value) return
  const revision = historyRevision
  const controller = new AbortController()
  historyController = controller
  historyLoading.value = true
  historyError.value = ''
  try {
    const page = await fetchWaveHistory(device, phase, historyBeforeId.value, controller.signal)
    if (controller.signal.aborted || revision !== historyRevision) return
    const ids = new Set(historyFrames.value.map((frame) => frame.ID))
    historyFrames.value.push(...page.data.filter((frame) => !ids.has(frame.ID)))
    historyBeforeId.value = page.next_before_id
    historyHasMore.value = page.data.length > 0 && page.next_before_id !== null
  } catch (cause) {
    if (revision === historyRevision && !isRequestCancelled(cause))
      historyError.value = cause instanceof Error ? cause.message : '历史列表读取失败'
  } finally {
    if (revision === historyRevision) historyLoading.value = false
  }
}
onBeforeUnmount(() => {
  historyController?.abort()
})
const monitorDevices = computed(() =>
  infrastructureStore.devices.filter((device) => device.enabled && device.category !== 'locator'),
)
const selectedDevice = computed(() =>
  monitorDevices.value.find((device) => device.id === selectedDeviceId.value),
)
const selectedLine = computed(() =>
  infrastructureStore.lines.find((line) => line.id === selectedDevice.value?.lineId),
)
const currentRuntime = computed(() => runtimes.value[selectedDeviceId.value])
const relationText = computed(() =>
  selectedDevice.value ? linkedMonitorText(selectedDevice.value, infrastructureStore.devices) : '',
)
const { refresh, error: waveformError } = usePolling(
  refreshWaveform,
  5000,
  () => isLive.value && Boolean(selectedDevice.value),
)

watch(
  () => monitorDevices.value.map((device) => device.id).join('|'),
  () => {
    const created = createWaveMonitorRuntimes(monitorDevices.value)
    Object.keys(runtimes.value).forEach((id) => {
      if (!created[id]) delete runtimes.value[id]
    })
    Object.keys(created).forEach((id) => {
      if (!runtimes.value[id]) runtimes.value[id] = created[id]!
    })
    if (!monitorDevices.value.some((device) => device.id === selectedDeviceId.value)) {
      const requested = typeof route.query.device === 'string' ? route.query.device : ''
      selectedDeviceId.value =
        monitorDevices.value.find((device) => device.id === requested)?.id ??
        monitorDevices.value[0]?.id ??
        ''
    }
  },
  { immediate: true },
)
watch(
  () => route.query.device,
  (id) => {
    if (typeof id === 'string' && monitorDevices.value.some((device) => device.id === id))
      selectDevice(id)
  },
)

watch([selectedDeviceId, selectedPhasePair], () => {
  resetHistory()
  if (selectedPhasePair.value) void loadMoreHistory()
})

async function selectHistoryFrame(frame: WaveHistoryFrame) {
  if (frame.CABLE !== selectedPhasePair.value || frame.IMEI !== selectedDeviceId.value) return
  isLive.value = false
  historyFrameId.value = frame.ID
  // 等待轮询的停用监听完成，再发起可取消的指定帧请求。
  await nextTick()
  void refresh(true)
}
function toggleLive() {
  if (isLive.value) {
    isLive.value = false
    return
  }
  historyFrameId.value = null
  isLive.value = true
  // 回到最新数据时重新加载列表，使新接收的帧也可供选择。
  resetHistory()
  if (selectedPhasePair.value) void loadMoreHistory()
}

function selectDevice(deviceId: string) {
  historyOpen.value = false
  historyFrameId.value = null
  selectedDeviceId.value = deviceId
  selectedPhasePair.value = null
  void refresh(true)
}
function selectPhasePair(phasePair: string) {
  historyOpen.value = true
  if (phasePair === selectedPhasePair.value) return
  historyFrameId.value = null
  selectedPhasePair.value = phasePair
  const runtime = currentRuntime.value
  if (runtime) {
    runtime.waveformSamples = []
    runtime.phase = phasePair
    runtime.frameId = null
    runtime.frameValid = null
    runtime.frameError = '正在读取当前相间波形'
    runtime.batchId = '正在读取'
    runtime.receiveTime = '--'
    runtime.faultType = null
    runtime.faultDistanceM = null
    runtime.interphaseResults = {}
  }
  void refresh(true)
}
async function browseHistory(delta: number) {
  if (!selectedPhasePair.value) return
  historyOpen.value = true
  await nextTick()
  historyStrip.value?.scrollHistory(delta)
}
async function refreshWaveform(signal: AbortSignal) {
  const runtime = currentRuntime.value
  const deviceId = selectedDeviceId.value
  const phase = selectedPhasePair.value
  if (!runtime || !deviceId) return
  const requestedFrameId = historyFrameId.value
  const frame =
    requestedFrameId === null
      ? await fetchLatestWaveform(deviceId, phase, signal, true)
      : await fetchHistoryWaveform(deviceId, requestedFrameId, signal)
  signal.throwIfAborted()
  if (
    deviceId !== selectedDeviceId.value ||
    phase !== selectedPhasePair.value ||
    requestedFrameId !== historyFrameId.value
  )
    return
  if (requestedFrameId !== null && frame.frame_id !== requestedFrameId)
    throw new Error('该历史帧已不存在，请重新选择')
  if (requestedFrameId !== null && frame.frame_valid !== false && frame.phase_pair !== phase)
    throw new Error('历史帧的相间与当前选择不符')
  // 其他相间可能更新，而当前选中相间的波形帧没有变化。
  if (requestedFrameId === null) runtime.phaseStates = frame.phase_states ?? {}
  // 指定历史帧成功返回后收起列表，重复选择当前帧也适用。
  if (requestedFrameId !== null && frame.frame_valid !== false) historyOpen.value = false
  if (frame.frame_id === runtime.frameId && frame.frame_id !== null) return
  runtime.frameId = frame.frame_id
  runtime.frameValid = frame.frame_id === null ? null : frame.frame_valid !== false
  runtime.frameError =
    frame.frame_id === null
      ? `${phase ?? '当前设备'}暂无可用波形帧`
      : frame.frame_valid === false
        ? `帧校验失败：${frame.frame_error || '协议无效'}`
        : ''
  runtime.phase = frame.phase_pair ?? phase ?? frame.cable ?? null
  runtime.waveformSamples = runtime.frameValid ? (frame.waveform_samples ?? []) : []
  runtime.faultType = runtime.frameValid ? (frame.fault_type ?? null) : null
  runtime.faultDistanceM = runtime.frameValid ? (frame.fault_distance_m ?? null) : null
  runtime.interphaseResults = runtime.frameValid ? (frame.interphase_results ?? {}) : {}
  runtime.batchId = frame.frame_id === null ? '暂无波形' : `#FRAME-${frame.frame_id}`
  runtime.receiveTime = frame.created_at?.split(' ')[1] ?? frame.created_at ?? '--'
  if (frame.frame_id !== null && requestedFrameId === null) {
    runtime.events.unshift({
      id: `${deviceId}-${frame.frame_id}`,
      level: runtime.frameValid ? 'normal' : 'warning',
      title: runtime.frameValid ? '真实波形帧已接收' : '波形帧校验失败',
      description: runtime.frameValid
        ? `${runtime.phase ?? '--'} 相间 · ${runtime.waveformSamples.length} 个有效采样点`
        : runtime.frameError,
      time: frame.created_at ?? '--',
    })
    runtime.events = runtime.events.slice(0, 4)
  }
}
</script>

<template>
  <section class="wave-monitor-page" aria-label="行波监测">
    <ModuleState
      v-if="!selectedDevice || !currentRuntime"
      title="暂无可监测的数据源"
      description="请在设备配置中添加并启用监测设备或一体化终端。"
    />
    <div v-else class="wave-monitor-layout">
      <WaveSourceList
        :devices="infrastructureStore.devices"
        :lines="infrastructureStore.lines"
        :selected-device-id="selectedDeviceId"
        @select="selectDevice"
      />
      <WaveformPanel
        :runtime="currentRuntime"
        :is-live="isLive"
        :selected-phase-pair="selectedPhasePair"
        @select-phase="selectPhasePair"
        @scroll-history="browseHistory"
      >
        <template #history>
          <WaveHistoryStrip
            v-if="selectedPhasePair && historyOpen"
            ref="historyStrip"
            :key="`${selectedDeviceId}-${selectedPhasePair}`"
            :phase="selectedPhasePair"
            :frames="historyFrames"
            :current-frame-id="currentRuntime.frameId"
            :loading="historyLoading"
            :has-more="historyHasMore"
            :error="historyError"
            :read-error="waveformError"
            @select="selectHistoryFrame"
            @more="loadMoreHistory"
          />
        </template>
        <template #actions>
          <div class="monitor-panel-actions" aria-label="行波监测操作">
            <button type="button" :class="{ 'is-live': isLive }" @click="toggleLive">
              <span>{{ isLive ? 'Ⅱ' : '▶' }}</span
              >{{ isLive ? '暂停刷新' : historyFrameId !== null ? '返回实时' : '继续刷新' }}
            </button>
          </div>
        </template>
      </WaveformPanel>
      <WaveDetailPanel
        :runtime="currentRuntime"
        :device="selectedDevice"
        :line-name="selectedLine?.name ?? '未绑定线路'"
        :relation-text="relationText"
      />
    </div>
  </section>
</template>
