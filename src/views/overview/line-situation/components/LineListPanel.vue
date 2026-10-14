<script setup lang="ts">
import type { SituationLine } from '../types'

defineProps<{
  lines: SituationLine[]
  selectedId: string
}>()

const emit = defineEmits<{
  select: [line: SituationLine]
}>()

function onlineNodeCount(line: SituationLine) {
  return line.nodes.filter((node) => node.status !== 'offline').length
}
</script>

<template>
  <section class="line-situation-panel line-situation-list-panel">
    <header class="line-situation-panel-header">
      <div>
        <strong>线路列表</strong>
        <span>全部监测线路</span>
      </div>
      <span>{{ lines.length }} 条线路</span>
    </header>

    <div class="line-situation-list">
      <button
        v-for="line in lines"
        :key="line.id"
        type="button"
        :class="{ 'is-selected': selectedId === line.id }"
        :data-line-id="line.id"
        :aria-pressed="selectedId === line.id"
        @click="emit('select', line)"
      >
        <i :class="`is-${line.status}`" aria-hidden="true"></i>
        <span class="line-situation-list-copy">
          <strong>{{ line.name }}</strong>
          <span>{{ line.nodes.length }} 个节点 · {{ onlineNodeCount(line) }} 在线</span>
        </span>
        <span class="line-situation-list-state" :class="`is-${line.status}`">
          {{ line.statusLabel }}
        </span>
      </button>
    </div>
  </section>
</template>
