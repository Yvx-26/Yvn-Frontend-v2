<script setup lang="ts">
import type { OperationSummaryItem } from '../types'

defineProps<{
  items: OperationSummaryItem[]
}>()
</script>

<template>
  <section class="operation-situation-panel operation-situation-current-panel">
    <header class="operation-situation-panel-header">
      <div>
        <strong>当前运行概况</strong>
        <span>平台与数据链路状态</span>
      </div>
      <span>实时状态</span>
    </header>

    <div class="operation-situation-current-body">
      <div class="operation-situation-current-focus">
        <div>
          <strong>平台运行正常</strong>
          <span>后端数据接口已连接</span>
        </div>
        <b><i></i>正常</b>
      </div>

      <dl>
        <div v-for="item in items" :key="item.id">
          <dt>{{ item.label }}</dt>
          <dd :class="{ 'is-warning': item.warning }">{{ item.value }}</dd>
        </div>
      </dl>
    </div>
  </section>
</template>
