<script setup lang="ts">
import { RouterLink } from 'vue-router'
import type { OverviewAlarm } from '../types'

defineProps<{
  alarms: OverviewAlarm[]
}>()
</script>

<template>
  <section class="overview-panel overview-alarm-panel">
    <header class="overview-panel-header">
      <div>
        <strong>最新告警</strong>
        <span>当前待处理事件</span>
      </div>
      <RouterLink to="/overview/alarms">查看全部</RouterLink>
    </header>

    <div class="overview-alarm-list">
      <p v-if="alarms.length === 0">暂无告警数据，告警业务接口将在下一阶段接入。</p>
      <article v-for="alarm in alarms" :key="alarm.id" class="overview-alarm-item">
        <i :class="`is-${alarm.level}`" aria-hidden="true"></i>
        <div>
          <strong>{{ alarm.title }}</strong>
          <span>{{ alarm.location }}</span>
        </div>
        <time>{{ alarm.time }}</time>
      </article>
    </div>
  </section>
</template>
