<script setup lang="ts">
import type { TopologyLine } from '../types'

defineProps<{
  lines: TopologyLine[]
  selectedLineId: string
}>()

const emit = defineEmits<{
  select: [line: TopologyLine | null]
}>()
</script>

<template>
  <section class="topology-line-tree" aria-label="线路结构">
    <header>
      <strong>线路结构</strong>
      <span>{{ lines.length }} 条线路</span>
    </header>

    <div class="topology-line-tree-list">
      <button
        type="button"
        :class="{ 'is-active': selectedLineId === 'all' }"
        @click="emit('select', null)"
      >
        <i class="is-online" aria-hidden="true"></i>
        <span><strong>全部线路</strong><small>主干设备与支路连接</small></span>
        <em>关系已加载</em>
      </button>

      <button
        v-for="line in lines"
        :key="line.id"
        type="button"
        :class="{ 'is-active': selectedLineId === line.id }"
        @click="emit('select', line)"
      >
        <i :class="`is-${line.status}`" aria-hidden="true"></i>
        <span>
          <strong>{{ line.name }}</strong>
          <small>{{ line.devices.length }} 个设备 · {{ line.length }}</small>
        </span>
        <em :class="`is-${line.status}`">{{ line.statusLabel }}</em>
      </button>
    </div>
  </section>
</template>
