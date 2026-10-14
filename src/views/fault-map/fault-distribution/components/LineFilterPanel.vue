<script setup lang="ts">
import type { CableLine } from '../types'

defineProps<{
  lines: CableLine[]
  selectedLineId: string
}>()

const emit = defineEmits<{
  select: [line: CableLine]
}>()
</script>

<template>
  <section class="fault-line-panel" aria-label="电缆线路筛选">
    <header>
      <div><strong>电缆线路</strong><span>按定位设备顺序绘制</span></div>
      <span>{{ lines.length }} 条</span>
    </header>

    <div class="fault-line-list">
      <button
        v-for="line in lines"
        :key="line.id"
        type="button"
        class="fault-line-item"
        :class="{ 'is-active': selectedLineId === line.id }"
        :aria-pressed="selectedLineId === line.id"
        @click="emit('select', line)"
      >
        <i :class="`is-${line.status}`" aria-hidden="true"></i>
        <span class="fault-line-copy">
          <strong>{{ line.name }}</strong>
          <small>{{ line.devices.length }} 个定位设备 · {{ line.length }}</small>
        </span>
        <span class="fault-line-status" :class="`is-${line.status}`">{{ line.statusLabel }}</span>
      </button>
    </div>
  </section>
</template>
