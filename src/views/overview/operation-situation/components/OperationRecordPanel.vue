<script setup lang="ts">
import type { OperationRecord } from '../types'

defineProps<{
  records: OperationRecord[]
}>()
</script>

<template>
  <section class="operation-situation-panel operation-situation-record-panel">
    <header class="operation-situation-panel-header">
      <div>
        <strong>最近运行记录</strong>
        <span>设备与线路状态变化</span>
      </div>
      <span>实时更新</span>
    </header>

    <div class="operation-situation-record-list">
      <article v-for="record in records" :key="record.id">
        <i :class="`is-${record.level}`" aria-hidden="true"></i>
        <div>
          <strong class="asset-label">{{ record.title }}</strong>
          <span class="asset-label">{{ record.detail }}</span>
        </div>
        <time>{{ record.time }}</time>
      </article>
    </div>
  </section>
</template>
