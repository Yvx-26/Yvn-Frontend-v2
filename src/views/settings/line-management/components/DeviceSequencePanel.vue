<script setup lang="ts">
import { computed, ref } from 'vue'
import type { BoundLineDevice, ManagedDevice } from '../../../../domain/infrastructure/types'

defineProps<{
  availableDevices: ManagedDevice[]
  devices: BoundLineDevice[]
  selectedDeviceId: string
}>()

const emit = defineEmits<{
  bind: [deviceId: string]
  move: [deviceId: string, direction: -1 | 1]
  remove: [deviceId: string]
  select: [deviceId: string]
}>()

const selectedAvailableDeviceId = ref('')
const canBind = computed(() => Boolean(selectedAvailableDeviceId.value))

function bindSelectedDevice() {
  if (!selectedAvailableDeviceId.value) return
  emit('bind', selectedAvailableDeviceId.value)
  selectedAvailableDeviceId.value = ''
}
</script>

<template>
  <aside class="line-management-device-panel">
    <header>
      <div><strong>定位设备顺序</strong><span>顺序决定线路绘制方向</span></div>
      <em>{{ devices.length }} 台</em>
    </header>

    <div class="line-management-device-list">
      <div v-if="devices.length === 0" class="line-management-device-empty">
        <strong>尚未绑定定位设备</strong>
        <span>绑定设备后自动生成线路路径</span>
      </div>

      <div
        v-for="(device, index) in devices"
        :key="device.id"
        class="line-management-device-item"
        :class="{ 'is-active': selectedDeviceId === device.id }"
      >
        <button
          type="button"
          class="line-management-device-select"
          @click="emit('select', device.id)"
        >
          <span class="line-management-device-order">{{ String(index + 1).padStart(2, '0') }}</span>
          <span class="line-management-device-copy">
            <strong>{{ device.id }}</strong>
            <span>{{ device.position }}</span>
            <small>{{ device.coordinate[0].toFixed(4) }}, {{ device.coordinate[1].toFixed(4) }}</small>
          </span>
        </button>
        <span class="line-management-device-actions">
          <button
            type="button"
            aria-label="设备上移"
            :disabled="index === 0"
            @click="emit('move', device.id, -1)"
          >↑</button>
          <button
            type="button"
            aria-label="设备下移"
            :disabled="index === devices.length - 1"
            @click="emit('move', device.id, 1)"
          >↓</button>
          <button type="button" aria-label="解除设备绑定" @click="emit('remove', device.id)">×</button>
        </span>
      </div>
    </div>

    <div class="line-management-bind-device">
      <select v-model="selectedAvailableDeviceId" aria-label="选择待绑定设备">
        <option value="">选择待绑定设备</option>
        <option v-for="device in availableDevices" :key="device.id" :value="device.id">
          {{ device.id }} · {{ device.position }}
        </option>
      </select>
      <button type="button" :disabled="!canBind" @click="bindSelectedDevice">＋ 绑定</button>
    </div>
  </aside>
</template>
