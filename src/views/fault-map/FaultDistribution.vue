<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useInfrastructureStore } from '../../stores/infrastructure'
import CableLineLegend from '../../components/common/CableLineLegend.vue'
import CableMap from './fault-distribution/components/CableMap.vue'
import FaultMapDetail from './fault-distribution/components/FaultMapDetail.vue'
import LineFilterPanel from './fault-distribution/components/LineFilterPanel.vue'
import type { CableLine, MapSelection } from '../../domain/map/types'
import { toCableLines } from '../../domain/map/lines'
import './fault-distribution/fault-distribution.css'

const router = useRouter()
const infrastructureStore = useInfrastructureStore()
const lines = computed(() => toCableLines(infrastructureStore.lines, infrastructureStore.devices))
const selectedLineId = ref(lines.value[0]?.id ?? '')
const selection = ref<MapSelection>(null)

const selectedLine = computed(
  () => lines.value.find((line) => line.id === selectedLineId.value) ?? lines.value[0],
)

watch(lines, (nextLines) => {
  if (!nextLines.some((line) => line.id === selectedLineId.value))
    selectedLineId.value = nextLines[0]?.id ?? ''
  const current = selection.value
  if (current) {
    const line = nextLines.find((line) => line.id === current.line.id)
    const device =
      current.kind === 'device'
        ? line?.devices.find((device) => device.id === current.device.id)
        : undefined
    selection.value = line && device ? { kind: 'device', line, device } : null
  }
})

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
      <span>{{
        infrastructureStore.backendConnected ? '地图数据持续同步' : '地图数据连接异常'
      }}</span>
    </div>

    <LineFilterPanel :lines="lines" :selected-line-id="selectedLineId" @select="selectLine" />

    <Transition name="fault-detail">
      <FaultMapDetail
        v-if="selection"
        :selection="selection"
        @close="selection = null"
        @locate="enterRealtimeLocation"
      />
    </Transition>

    <footer class="fault-distribution-legend">
      <CableLineLegend />
      <div aria-label="设备与故障点图例">
        <span><i class="is-online"></i>设备在线</span>
        <span><i class="is-warning"></i>设备预警</span>
        <span><i class="is-offline"></i>设备离线</span>
        <span><i class="is-fault"></i>故障定位点</span>
      </div>
      <span v-if="selectedLine"
        :title="selectedLine.statusDetail"
        >{{ selectedLine.name }} · {{ selectedLine.statusDetail }}</span
      >
    </footer>
  </section>
</template>
