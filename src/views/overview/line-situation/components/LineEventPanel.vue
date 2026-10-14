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
        <strong>线路最新事件</strong>
        <span>{{ line.name }}</span>
      </div>
      <span>最近 24 小时</span>
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
