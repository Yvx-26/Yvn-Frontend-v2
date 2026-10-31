<script setup lang="ts">
import { computed, ref } from 'vue'
import type { ManagedLine, ManagedLineState, ManagedLineType } from '../../../../domain/infrastructure/types'

const props = defineProps<{
  lines: ManagedLine[]
  selectedLineId: string
}>()

const emit = defineEmits<{
  select: [line: ManagedLine]
}>()

const searchText = ref('')
const filteredLines = computed(() => {
  const keyword = searchText.value.trim().toLowerCase()
  if (!keyword) return props.lines
  return props.lines.filter((line) => `${line.id}${line.name}`.toLowerCase().includes(keyword))
})

const typeLabels: Record<ManagedLineType, string> = {
  submarine: '海底电缆',
  land: '陆地电缆',
  hybrid: '混合线路',
}

const stateLabels: Record<ManagedLineState, string> = {
  enabled: '已启用',
  verification: '待校验',
  draft: '待配置',
}
</script>

<template>
  <aside class="line-management-list-panel">
    <header>
      <div><strong>线路列表</strong><span>按线路档案选择</span></div>
      <em>{{ lines.length }} 条</em>
    </header>

    <label class="line-management-search">
      <svg><use href="#icon-wave-search" /></svg>
      <input v-model="searchText" type="search" placeholder="搜索线路名称或编号" />
    </label>

    <div class="line-management-list">
      <button
        v-for="line in filteredLines"
        :key="line.id"
        type="button"
        :class="{ 'is-active': line.id === selectedLineId }"
        @click="emit('select', line)"
      >
        <span class="line-management-list-copy">
          <strong>{{ line.name }}</strong>
          <span>{{ typeLabels[line.type] }} · {{ line.lengthM || '--' }} m · {{ line.devices.length }} 台设备</span>
          <small>{{ line.id }}</small>
        </span>
        <span class="line-management-list-state" :class="`is-${line.state}`">
          <i></i>{{ stateLabels[line.state] }}
        </span>
      </button>

      <div v-if="filteredLines.length === 0" class="line-management-list-empty">
        未找到匹配线路
      </div>
    </div>
  </aside>
</template>
