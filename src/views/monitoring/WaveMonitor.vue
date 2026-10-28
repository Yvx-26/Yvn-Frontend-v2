<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useInfrastructureStore } from '../../stores/infrastructure'
import { fetchLatestWaveform } from '../../services/telemetry-api'
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
const { refresh } = usePolling(
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

function selectDevice(deviceId: string) {
  selectedDeviceId.value = deviceId
  selectedPhasePair.value = null
  void refresh(true)
}
function selectPhasePair(phasePair: string) {
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
async function refreshWaveform(signal: AbortSignal) {
  const runtime = currentRuntime.value
  const deviceId = selectedDeviceId.value
  const phase = selectedPhasePair.value
  if (!runtime || !deviceId) return
  const frame = await fetchLatestWaveform(deviceId, phase, signal)
  signal.throwIfAborted()
  if (deviceId !== selectedDeviceId.value || phase !== selectedPhasePair.value) return
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
  if (frame.frame_id !== null) {
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
      >
        <template #actions>
          <div class="monitor-panel-actions" aria-label="行波监测操作">
            <button type="button" :class="{ 'is-live': isLive }" @click="isLive = !isLive">
              <span>{{ isLive ? 'Ⅱ' : '▶' }}</span
              >{{ isLive ? '暂停刷新' : '继续刷新' }}
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
