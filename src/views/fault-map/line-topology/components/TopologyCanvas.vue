<script setup lang="ts">
import { computed } from 'vue'
import type { TopologyDevice, TopologyFocusMode, TopologyLine, TopologyNodeLayout } from '../types'

const props = defineProps<{
  lines: TopologyLine[]
  focusMode: TopologyFocusMode
  selectedDeviceId: string
}>()

const emit = defineEmits<{
  'select-device': [device: TopologyDevice]
  'select-line': [line: TopologyLine]
}>()

const canvasHeight = computed(() => Math.max(610, props.lines.length * 180 + 70))
const laneY = computed(() => props.lines.map((_, index) => 130 + index * 180))

const nodeLayouts = computed<TopologyNodeLayout[]>(() =>
  props.lines.flatMap((line, lineIndex) => {
    const mainDevices = line.devices
      .filter((device) => !device.parentId)
      .slice()
      .sort((left, right) => left.sequence - right.sequence)
    const mainLayouts = mainDevices.map((device, index) => ({
      device,
      line,
      x: mainDevices.length === 1 ? 500 : 110 + (780 / (mainDevices.length - 1)) * index,
      y: laneY.value[lineIndex]!,
    }))
    const branchLayouts = line.devices
      .filter((device) => device.parentId)
      .map((device, index) => {
        const parent = mainLayouts.find((layout) => layout.device.id === device.parentId)
        return {
          device,
          line,
          x: (parent?.x ?? 500) + 115 + index * 100,
          y: (parent?.y ?? laneY.value[lineIndex]!) + 88,
        }
      })
    return [...mainLayouts, ...branchLayouts]
  }),
)

const lineLayouts = computed(() =>
  props.lines.map((line, lineIndex) => {
    const mainNodes = nodeLayouts.value.filter(
      (layout) => layout.line.id === line.id && !layout.device.parentId,
    )
    const branchNodes = nodeLayouts.value.filter(
      (layout) => layout.line.id === line.id && layout.device.parentId,
    )
    return {
      line,
      y: laneY.value[lineIndex]!,
      startX: mainNodes[0]?.x ?? 110,
      endX: mainNodes[mainNodes.length - 1]?.x ?? 890,
      mainNodes,
      branches: branchNodes.map((branch) => ({
        branch,
        parent: mainNodes.find((node) => node.device.id === branch.device.parentId)!,
      })),
    }
  }),
)

function isLineDimmed(lineId: string) {
  if (props.focusMode === 'all') return false
  return lineId !== props.focusMode
}

function isNodeDimmed(lineId: string) {
  return isLineDimmed(lineId)
}

function nodeStyle(layout: TopologyNodeLayout) {
  return {
    left: `${(layout.x / 1000) * 100}%`,
    top: `${(layout.y / canvasHeight.value) * 100}%`,
  }
}

function faultPath(line: TopologyLine) {
  if (!line.faultSegment) return ''
  const from = nodeLayouts.value.find(
    (layout) => layout.device.id === line.faultSegment!.fromDeviceId,
  )
  const to = nodeLayouts.value.find((layout) => layout.device.id === line.faultSegment!.toDeviceId)
  return from && to ? `M${from.x} ${from.y}H${to.x}` : ''
}
</script>

<template>
  <section class="topology-canvas" aria-label="线路拓扑画布">
    <svg
      :viewBox="`0 0 1000 ${canvasHeight}`"
      preserveAspectRatio="none"
      role="img"
      aria-label="电缆线路及定位设备连接拓扑"
    >
      <g
        v-for="layout in lineLayouts"
        :key="layout.line.id"
        class="topology-line-group"
        :class="{ 'is-dimmed': isLineDimmed(layout.line.id) }"
        @click="emit('select-line', layout.line)"
      >
        <text class="topology-lane-label" x="24" :y="layout.y - 18">{{ layout.line.name }}</text>
        <path class="topology-line-shadow" :d="`M${layout.startX} ${layout.y}H${layout.endX}`" />
        <path
          class="topology-main-line"
          :style="{ stroke: layout.line.color }"
          :d="`M${layout.startX} ${layout.y}H${layout.endX}`"
        />
        <path class="topology-line-flow" :d="`M${layout.startX} ${layout.y}H${layout.endX}`" />

        <template v-for="branch in layout.branches" :key="branch.branch.device.id">
          <path
            class="topology-line-shadow"
            :d="`M${branch.parent.x} ${branch.parent.y}V${branch.branch.y}H${branch.branch.x}`"
          />
          <path
            class="topology-main-line"
            :style="{ stroke: layout.line.color }"
            :d="`M${branch.parent.x} ${branch.parent.y}V${branch.branch.y}H${branch.branch.x}`"
          />
          <circle
            class="topology-branch-junction"
            :style="{ stroke: layout.line.color }"
            :cx="branch.parent.x"
            :cy="branch.parent.y"
            r="7"
          />
        </template>

        <path
          v-if="layout.line.faultSegment"
          class="topology-fault-segment"
          :d="faultPath(layout.line)"
        />
      </g>
    </svg>

    <button
      v-for="layout in nodeLayouts"
      :key="layout.device.id"
      type="button"
      class="topology-device-node"
      :class="[
        `is-${layout.device.status}`,
        {
          'is-selected': selectedDeviceId === layout.device.id,
          'is-dimmed': isNodeDimmed(layout.line.id),
          'is-fault-reference': layout.line.faultSegment?.toDeviceId === layout.device.id,
        },
      ]"
      :style="nodeStyle(layout)"
      @click="emit('select-device', layout.device)"
    >
      <strong>{{ layout.device.id }}</strong>
      <span>{{ layout.device.position }}</span>
    </button>
  </section>
</template>
