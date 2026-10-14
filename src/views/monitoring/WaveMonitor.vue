<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useInfrastructureStore } from '../../stores/infrastructure'
import { fetchLatestWaveform } from '../../services/telemetry-api'
import { createWaveMonitorRuntimes } from './wave-monitor/data'
import WaveDetailPanel from './wave-monitor/components/WaveDetailPanel.vue'
import WaveformPanel from './wave-monitor/components/WaveformPanel.vue'
import WaveSourceList from './wave-monitor/components/WaveSourceList.vue'
import './wave-monitor/wave-monitor.css'

const infrastructureStore = useInfrastructureStore()
const runtimes = ref(createWaveMonitorRuntimes(infrastructureStore.devices))
const latestMonitorDevice = infrastructureStore.devices
  .filter((device) => device.category !== 'locator')
  .sort((left, right) => (right.updatedAt || '').localeCompare(left.updatedAt || ''))[0]
const selectedDeviceId = ref(latestMonitorDevice?.id ?? '')
const selectedPhasePair = ref<string | null>(null)
const isLive = ref(true)
const toastMessage = ref('')
let waveRefreshTimer: number | undefined
let toastTimer: number | undefined
let waveformRequestId = 0

const monitorDevices = computed(() =>
  infrastructureStore.devices.filter((device) => device.category !== 'locator'),
)

const selectedDevice = computed(
  () =>
    monitorDevices.value.find((device) => device.id === selectedDeviceId.value) ??
    monitorDevices.value[0]!,
)

const selectedLine = computed(() =>
  infrastructureStore.lines.find((line) => line.id === selectedDevice.value.lineId),
)

const currentRuntime = computed(() => runtimes.value[selectedDevice.value.id]!)

const relationText = computed(() =>
  selectedDevice.value.category === 'monitor'
    ? `关联定位设备 ${selectedDevice.value.linkedLocatorId || '--'}`
    : '监测与定位功能一体化',
)

function selectDevice(deviceId: string) {
  selectedDeviceId.value = deviceId
  selectedPhasePair.value = null
  void refreshWaveform(true)
}

function selectPhasePair(phasePair: string) {
  selectedPhasePair.value = phasePair
  void refreshWaveform(true)
}

function toggleLive() {
  isLive.value = !isLive.value
}

function showToast(message: string) {
  toastMessage.value = message
  if (toastTimer) window.clearTimeout(toastTimer)
  toastTimer = window.setTimeout(() => (toastMessage.value = ''), 1800)
}

function freezeFrame() {
  isLive.value = false
  showToast('当前波形帧已冻结，可进行游标测量')
}

async function refreshWaveform(force = false) {
  const runtime = currentRuntime.value
  if (!runtime || !selectedDeviceId.value || (!isLive.value && !force)) return
  const requestId = ++waveformRequestId
  const requestedDeviceId = selectedDeviceId.value
  const requestedPhasePair = selectedPhasePair.value
  try {
    const frame = await fetchLatestWaveform(requestedDeviceId, requestedPhasePair)
    if (requestId !== waveformRequestId || requestedDeviceId !== selectedDeviceId.value) return
    if (frame.frame_id === null) {
      showToast(`${requestedPhasePair ?? '当前设备'}暂无可用波形帧`)
      return
    }
    if (frame.frame_id === null || frame.frame_id === runtime.frameId) return
    runtime.frameId = frame.frame_id
    runtime.createdAt = frame.created_at ?? null
    runtime.phase = frame.phase_pair ?? frame.cable ?? null
    runtime.faultType = frame.fault_type ?? null
    runtime.faultDistanceM = frame.fault_distance_m ?? null
    runtime.interphaseResults = frame.interphase_results ?? {}
    runtime.waveformSamples = frame.waveform_samples ?? []
    runtime.batchId = `#FRAME-${frame.frame_id}`
    runtime.receiveTime = frame.created_at?.split(' ')[1] ?? frame.created_at ?? '--'
    runtime.events.unshift({
      id: `${selectedDeviceId.value}-frame-${frame.frame_id}`,
      level: 'normal',
      title: requestedPhasePair ? `${requestedPhasePair} 相间波形已载入` : '真实波形帧已接收',
      description: `${runtime.phase ?? '--'} 相间 · ${runtime.waveformSamples.length} 个有效采样点`,
      time: '刚刚',
    })
    runtime.events = runtime.events.slice(0, 4)
  } catch (error) {
    showToast(error instanceof Error ? error.message : '波形加载失败')
  }
}

onMounted(() => {
  void refreshWaveform()
  waveRefreshTimer = window.setInterval(refreshWaveform, 5000)
})

onBeforeUnmount(() => {
  if (waveRefreshTimer) window.clearInterval(waveRefreshTimer)
  if (toastTimer) window.clearTimeout(toastTimer)
})
</script>

<template>
  <section class="wave-monitor-page" aria-label="行波监测">
    <section class="wave-monitor-summary">
      <div class="wave-monitor-summary-device">
        <span>当前数据源</span>
        <div>
          <i class="wave-monitor-state-dot" :class="`is-${selectedDevice.state}`"></i>
          <strong>{{ selectedDevice.name }}</strong>
        </div>
        <small>
          {{ selectedLine?.name ?? '未绑定线路' }} · {{ selectedDevice.position }} ·
          {{ relationText }}
        </small>
      </div>
      <div class="wave-monitor-summary-item">
        <span>当前帧</span>
        <strong class="is-text">{{ currentRuntime.batchId }}</strong>
      </div>
      <div class="wave-monitor-summary-item">
        <span>接收进度</span>
        <strong>{{ currentRuntime.waveformSamples.length }} / 4000<small>点</small></strong>
      </div>
      <div class="wave-monitor-summary-item">
        <span>采样率</span>
        <strong>{{ selectedDevice.acquisition?.sampleRate ?? '--' }}</strong>
      </div>
      <div class="wave-monitor-summary-item">
        <span>接收时间</span>
        <strong class="is-text">{{ currentRuntime.receiveTime }}</strong>
      </div>
    </section>

    <div class="wave-monitor-layout">
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
            <button type="button" @click="freezeFrame">
              <svg><use href="#icon-camera" /></svg>冻结当前帧
            </button>
            <button type="button" :class="{ 'is-live': isLive }" @click="toggleLive">
              <span>{{ isLive ? 'Ⅱ' : '▶' }}</span
              >{{ isLive ? '暂停刷新' : '继续刷新' }}
            </button>
          </div>
        </template>
      </WaveformPanel>

      <WaveDetailPanel :runtime="currentRuntime" />
    </div>

    <Transition name="wave-monitor-toast">
      <div v-if="toastMessage" class="wave-monitor-toast" role="status">
        <i></i>{{ toastMessage }}
      </div>
    </Transition>
  </section>
</template>
