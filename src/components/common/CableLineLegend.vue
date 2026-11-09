<script setup lang="ts">
import { activeCableStatuses, cableLineStyles } from '../../domain/map/lines'
</script>

<template>
  <div class="cable-line-legend" aria-label="线路状态图例">
    <span v-for="status in activeCableStatuses" :key="status">
      <b
        aria-hidden="true"
        :style="{ borderColor: cableLineStyles[status].color }"
        :class="{ 'is-dashed': cableLineStyles[status].dashed }"
      ></b>
      {{ cableLineStyles[status].label }}
    </span>
  </div>
</template>
