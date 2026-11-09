<script setup lang="ts">
import type { CableLine } from '../../../../domain/map/types'
import { cableLineStyles } from '../../../../domain/map/lines'

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
        <i :style="{ color: cableLineStyles[line.status].color }" aria-hidden="true"></i>
        <span class="fault-line-copy">
          <strong class="asset-truncate" :title="line.name">{{ line.name }}</strong>
          <small :title="line.statusDetail">{{ line.statusDetail }}</small>
        </span>
        <span class="fault-line-status" :style="{ color: cableLineStyles[line.status].color }">{{ line.statusLabel }}</span>
      </button>
    </div>
  </section>
</template>
