<script setup lang="ts">
import type { SituationLine } from '../types'

defineProps<{
  line: SituationLine
}>()
</script>

<template>
  <section class="line-situation-panel line-situation-event-panel">
    <header class="line-situation-panel-header">
      <div>
        <strong>线路当前异常</strong>
        <span class="asset-label">{{ line.name }}</span>
      </div>
      <span>当前设备状态</span>
    </header>

    <div class="line-situation-event-list">
      <article v-for="event in line.events" :key="event.id">
        <i :class="`is-${event.level}`" aria-hidden="true"></i>
        <div>
          <strong>{{ event.title }}</strong>
          <span>{{ event.detail }}</span>
        </div>
        <time>{{ event.time }}</time>
      </article>
    </div>
  </section>
</template>
