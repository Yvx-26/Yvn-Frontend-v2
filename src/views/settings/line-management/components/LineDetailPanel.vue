<script setup lang="ts">
import type { BoundLineDevice, ManagedLine } from '../../../../domain/infrastructure/types'
import LineRouteMap from './LineRouteMap.vue'

const line = defineModel<ManagedLine>({ required: true })

defineProps<{
  selectedDeviceId: string
}>()

const emit = defineEmits<{
  'select-device': [deviceId: string]
  'update-device': [device: BoundLineDevice]
}>()
</script>

<template>
  <section class="line-management-detail-panel">
    <nav aria-label="线路配置区域">
      <button type="button" class="is-active">基础信息与地图路径</button>
      <button type="button">变更记录</button>
    </nav>

    <form class="line-management-form" @submit.prevent>
      <label>
        <span>线路编号 <i>*</i></span>
        <input v-model.trim="line.id" autocomplete="off" />
      </label>
      <label>
        <span>线路名称 <i>*</i></span>
        <input v-model.trim="line.name" autocomplete="off" />
      </label>
      <label>
        <span>线路类型</span>
        <select v-model="line.type">
          <option value="submarine">海底电缆</option>
          <option value="land">陆地电缆</option>
          <option value="hybrid">混合线路</option>
        </select>
      </label>
      <label>
        <span>线路长度（km）</span>
        <input v-model.trim="line.lengthKm" inputmode="decimal" />
      </label>
      <label class="is-wide">
        <span>线路说明</span>
        <textarea v-model.trim="line.description"></textarea>
      </label>
    </form>

    <LineRouteMap
      :devices="line.devices"
      :selected-device-id="selectedDeviceId"
      @select-device="emit('select-device', $event)"
      @update-device="emit('update-device', $event)"
    />
  </section>
</template>
