<script setup lang="ts">
import { computed } from 'vue'
import { cableLineStyles, cableSelectionOutline } from '../../../../domain/map/lines'
import type { TopologyDevice, TopologyFocusMode, TopologyLine, TopologyNodeLayout } from '../types'

const props = defineProps<{
  lines: TopologyLine[]
  focusMode: TopologyFocusMode
  selectedLineId: string
  selectedDeviceId: string
}>()

const emit = defineEmits<{
  'select-device': [device: TopologyDevice]
  'select-line': [line: TopologyLine]
}>()

const canvasHeight = computed(() => Math.max(610, props.lines.length * 180 + 70))
const laneY = computed(() => props.lines.map((_, index) => 130 + index * 180))
const planeSize = computed(() => {
  const mostNodes = Math.max(1, ...props.lines.map((line) => line.devices.length))
  return {
    minWidth: `${Math.max(420, (mostNodes - 1) * 48)}px`,
    minHeight: `${props.lines.length * 72}px`,
  }
})

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
      startX: mainNodes.length === 1 ? 350 : (mainNodes[0]?.x ?? 110),
      endX: mainNodes.length === 1 ? 650 : (mainNodes[mainNodes.length - 1]?.x ?? 890),
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
    <div class="topology-canvas-plane" :style="planeSize">
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
          :class="{
            'is-dimmed': isLineDimmed(layout.line.id),
            'is-selected': selectedLineId === layout.line.id,
            'is-dashed': cableLineStyles[layout.line.status].dashed,
          }"
          :style="{
            '--cable-line-color': cableLineStyles[layout.line.status].color,
            '--cable-selection-outline': cableSelectionOutline,
          }"
          @click="emit('select-line', layout.line)"
        >
          <title>{{ layout.line.name }} · {{ layout.line.statusLabel }}</title>
          <text class="topology-lane-label" x="24" :y="layout.y - 46">
            {{
              layout.line.name.length > 40 ? `${layout.line.name.slice(0, 40)}…` : layout.line.name
            }}
            · {{ layout.line.statusLabel }}
          </text>
          <path class="topology-line-shadow" :d="`M${layout.startX} ${layout.y}H${layout.endX}`" />
          <path class="topology-main-line" :d="`M${layout.startX} ${layout.y}H${layout.endX}`" />
          <path
            v-if="!cableLineStyles[layout.line.status].dashed"
            class="topology-line-flow"
            :d="`M${layout.startX} ${layout.y}H${layout.endX}`"
          />

          <template v-for="branch in layout.branches" :key="branch.branch.device.id">
            <path
              class="topology-line-shadow"
              :d="`M${branch.parent.x} ${branch.parent.y}V${branch.branch.y}H${branch.branch.x}`"
            />
            <path
              class="topology-main-line"
              :d="`M${branch.parent.x} ${branch.parent.y}V${branch.branch.y}H${branch.branch.x}`"
            />
            <circle
              class="topology-branch-junction"
              :cx="branch.parent.x"
              :cy="branch.parent.y"
              r="7"
            />
          </template>

          <path
            v-if="layout.line.faultSegment"
            class="topology-fault-segment"
            :style="{ stroke: cableLineStyles.fault.color }"
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
        :title="`${layout.line.name} · 节点 ${layout.device.sequence} · ${layout.device.id}`"
        :aria-label="`${layout.line.name}，节点 ${layout.device.sequence}，设备 ${layout.device.id}，${layout.device.statusLabel}`"
        @click="emit('select-device', layout.device)"
      >
        <strong aria-hidden="true">{{ String(layout.device.sequence).padStart(2, '0') }}</strong>
      </button>
    </div>
  </section>
</template>
