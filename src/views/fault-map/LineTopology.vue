<script setup lang="ts">
import { computed, defineAsyncComponent, ref, watch } from 'vue'
import { lineColors, deviceStateLabels } from '../../domain/infrastructure/helpers'
import { useInfrastructureStore } from '../../stores/infrastructure'
import LineTreePanel from './line-topology/components/LineTreePanel.vue'
import TopologyCanvas from './line-topology/components/TopologyCanvas.vue'
import TopologyDetailPanel from './line-topology/components/TopologyDetailPanel.vue'
import type { TopologyDevice, TopologyFocusMode, TopologyLine } from './line-topology/types'
import './line-topology/line-topology.css'

const infrastructureStore = useInfrastructureStore()
const Topology3DScene = defineAsyncComponent(
  () => import('./line-topology/components/Topology3DScene.vue'),
)
const topologyLines = computed<TopologyLine[]>(() =>
  infrastructureStore.lines.map((line, lineIndex) => {
    const ordered = line.devices.slice().sort((left, right) => left.sequence - right.sequence)
    const devices = ordered.map((device, index): TopologyDevice => ({
      id: device.id,
      name: device.name,
      position: device.position || '未配置位置',
      sequence: device.sequence,
      status: device.state,
      statusLabel: deviceStateLabels[device.state],
      latency: device.latencyMs == null ? '--' : `${device.latencyMs} ms`,
      lastUpload: device.lastSeen || '--',
      linkedDeviceIds: [ordered[index - 1]?.id, ordered[index + 1]?.id].filter((id): id is string =>
        Boolean(id),
      ),
    }))
    const warning = devices.some((device) => device.status !== 'online')
    return {
      id: line.id,
      name: line.name,
      length: line.lengthM ? `${line.lengthM} m` : '--',
      color: lineColors[lineIndex % lineColors.length]!,
      status: warning || !devices.length ? 'warning' : 'normal',
      statusLabel: !devices.length ? '待接入节点' : warning ? '存在离线或预警设备' : '运行正常',
      devices,
    }
  }),
)

const focusMode = ref<TopologyFocusMode>('all')
const viewMode = ref<'3d' | '2d'>('3d')
const sceneRevision = ref(0)
const selectedLineId = ref('all')
const selectedDeviceId = ref(topologyLines.value[0]?.devices[0]?.id ?? '')

watch(
  () =>
    topologyLines.value
      .map((line) => `${line.id}:${line.devices.map((device) => device.id).join(',')}`)
      .join('|'),
  () => {
    const lines = topologyLines.value
    if (!lines.some((line) => line.id === focusMode.value)) setFocusMode('all')
    if (!lines.some((line) => line.devices.some((device) => device.id === selectedDeviceId.value)))
      selectedDeviceId.value = lines[0]?.devices[0]?.id ?? ''
  },
)

const selectedDevice = computed(() =>
  topologyLines.value
    .flatMap((line) => line.devices)
    .find((device) => device.id === selectedDeviceId.value),
)

const selectedLine = computed(() =>
  topologyLines.value.find((line) =>
    line.devices.some((device) => device.id === selectedDevice.value?.id),
  ),
)

function selectLine(line: TopologyLine | null) {
  selectedLineId.value = line?.id ?? 'all'
  focusMode.value = line ? (line.id as TopologyFocusMode) : 'all'
}

function selectDevice(device: TopologyDevice) {
  selectedDeviceId.value = device.id
}

function setFocusMode(mode: TopologyFocusMode) {
  focusMode.value = mode
  selectedLineId.value = mode
}
</script>

<template>
  <section class="line-topology-page" aria-label="线路拓扑">
    <header class="line-topology-toolbar">
      <div>
        <strong>线路连接拓扑</strong>
        <span>电缆主干、支路及定位设备连接关系</span>
      </div>

      <div class="line-topology-toolbar-actions">
        <nav aria-label="拓扑聚焦方式">
          <button
            type="button"
            :class="{ 'is-active': focusMode === 'all' }"
            @click="setFocusMode('all')"
          >
            线路全景
          </button>
          <button
            v-for="line in topologyLines"
            :key="line.id"
            type="button"
            :class="{ 'is-active': focusMode === line.id }"
            @click="setFocusMode(line.id)"
          >
            仅看{{ line.name }}
          </button>
        </nav>

        <div class="topology-view-switch" aria-label="拓扑视图模式">
          <button
            type="button"
            :class="{ 'is-active': viewMode === '3d' }"
            @click="viewMode = '3d'"
          >
            3D
          </button>
          <button
            type="button"
            :class="{ 'is-active': viewMode === '2d' }"
            @click="viewMode = '2d'"
          >
            2D
          </button>
        </div>
      </div>
    </header>

    <div class="line-topology-layout">
      <LineTreePanel
        :lines="topologyLines"
        :selected-line-id="selectedLineId"
        @select="selectLine"
      />

      <Topology3DScene
        v-if="viewMode === '3d'"
        :key="sceneRevision"
        :lines="topologyLines"
        :focus-mode="focusMode"
        :selected-device-id="selectedDevice?.id ?? ''"
        @select-device="selectDevice"
        @select-line="selectLine"
        @reset-scene="sceneRevision += 1"
      />

      <TopologyCanvas
        v-else
        :lines="topologyLines"
        :focus-mode="focusMode"
        :selected-device-id="selectedDevice?.id ?? ''"
        @select-device="selectDevice"
        @select-line="selectLine"
      />

      <TopologyDetailPanel
        v-if="selectedLine && selectedDevice"
        :line="selectedLine"
        :device="selectedDevice"
      />
    </div>

    <footer class="line-topology-legend">
      <div>
        <span><i class="is-online"></i>设备在线</span>
        <span><i class="is-warning"></i>设备预警</span>
        <span><i class="is-offline"></i>设备离线</span>
      </div>
      <span>
        {{
          viewMode === '3d'
            ? '真实 WebGL 场景 · 支持旋转、缩放、平移和节点点击'
            : '拓扑由线路与设备连接关系自动生成'
        }}
      </span>
    </footer>
  </section>
</template>
