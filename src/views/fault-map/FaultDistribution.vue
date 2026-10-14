<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { fetchDashboardDevices, fetchDashboardMap } from '../../services/telemetry-api'
import { useInfrastructureStore } from '../../stores/infrastructure'
import CableMap from './fault-distribution/components/CableMap.vue'
import FaultMapDetail from './fault-distribution/components/FaultMapDetail.vue'
import LineFilterPanel from './fault-distribution/components/LineFilterPanel.vue'
import type { CableLine, MapSelection } from './fault-distribution/types'
import './fault-distribution/fault-distribution.css'

const router = useRouter()
const infrastructureStore = useInfrastructureStore()
const colors = ['#00d8ff', '#3c8cff', '#f5a623', '#8c7bff']

function createLines(pointByDevice = new Map<string, { lng: number; lat: number; updated_at: string | null }>()) {
  return infrastructureStore.lines
    .filter((line) => line.devices.length > 0)
    .map((line, lineIndex): CableLine => {
      const devices = line.devices
        .map((device) => {
          const point = pointByDevice.get(device.id)
          const status = device.state
          return {
            id: device.id,
            name: device.name,
            sequence: device.sequence,
            coordinate: point ? ([point.lng, point.lat] as [number, number]) : device.coordinate,
            status,
            statusLabel: status === 'online' ? '在线' : status === 'warning' ? '数据预警' : '离线',
            latency: device.latencyMs == null ? '--' : `${device.latencyMs} ms`,
            lastUpload: point?.updated_at ?? device.lastSeen,
          }
        })
        .filter((device) => device.coordinate[0] !== 0 || device.coordinate[1] !== 0)
      const hasWarning = devices.some((device) => device.status !== 'online')
      return {
        id: line.id,
        name: line.name,
        length: line.lengthKm ? `${line.lengthKm} km` : '--',
        status: hasWarning ? 'warning' : 'normal',
        statusLabel: hasWarning ? '设备状态异常' : '运行正常',
        color: colors[lineIndex % colors.length]!,
        devices,
      }
    })
    .filter((line) => line.devices.length > 0)
}

const lines = ref<CableLine[]>(createLines())
const selectedLineId = ref(lines.value[0]?.id ?? '')
const selection = ref<MapSelection>(null)
let refreshTimer: number | undefined

const selectedLine = computed(
  () => lines.value.find((line) => line.id === selectedLineId.value) ?? lines.value[0],
)

async function refreshMap() {
  try {
    const [points, deviceStatuses] = await Promise.all([
      fetchDashboardMap(),
      fetchDashboardDevices(),
    ])
    infrastructureStore.applyRuntimeStatus(deviceStatuses)
    const pointByDevice = new Map(points.map((point) => [point.imei, point]))
    const nextLines = createLines(pointByDevice)
    lines.value = nextLines
    if (!nextLines.some((line) => line.id === selectedLineId.value)) {
      selectedLineId.value = nextLines[0]!.id
    }
    selection.value = null
  } catch {
    // 保留上一次成功读取的真实结果。
  }
}

function selectLine(line: CableLine) {
  selectedLineId.value = line.id
  selection.value = line.fault ? { kind: 'fault', line, fault: line.fault } : null
}

function selectMapItem(item: MapSelection) {
  selection.value = item
  if (item) selectedLineId.value = item.line.id
}

function enterRealtimeLocation() {
  void router.push('/fault-map/location')
}

onMounted(() => {
  void refreshMap()
  refreshTimer = window.setInterval(() => void refreshMap(), 10000)
})

onBeforeUnmount(() => {
  if (refreshTimer) window.clearInterval(refreshTimer)
})
</script>

<template>
  <section class="fault-distribution-page" aria-label="故障分布地图">
    <CableMap
      :lines="lines"
      :selected-line-id="selectedLineId"
      @select-line="selectLine"
      @select-item="selectMapItem"
    />

    <div class="fault-distribution-live-state">
      <i aria-hidden="true"></i>
      <span>地图数据已同步</span>
    </div>

    <LineFilterPanel
      :lines="lines"
      :selected-line-id="selectedLineId"
      @select="selectLine"
    />

    <Transition name="fault-detail">
      <FaultMapDetail
        v-if="selection"
        :selection="selection"
        @close="selection = null"
        @locate="enterRealtimeLocation"
      />
    </Transition>

    <footer class="fault-distribution-legend">
      <div>
        <span><i class="is-online"></i>设备在线</span>
        <span><i class="is-warning"></i>设备预警</span>
        <span><i class="is-offline"></i>设备离线</span>
        <span><i class="is-fault"></i>故障定位点</span>
      </div>
      <span v-if="selectedLine">{{ selectedLine.name }} · {{ selectedLine.devices.length }} 个定位设备</span>
    </footer>
  </section>
</template>
