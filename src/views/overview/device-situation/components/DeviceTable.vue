<script setup lang="ts">
import type { SituationDevice } from '../types'

defineProps<{
  devices: SituationDevice[]
  selectedId: string
}>()

const emit = defineEmits<{
  select: [device: SituationDevice]
}>()
</script>

<template>
  <section class="device-situation-panel device-situation-table-panel">
    <header class="device-situation-panel-header">
      <div>
        <strong>设备运行列表</strong>
        <span>设备连接与最新波形帧</span>
      </div>
      <span>选择设备查看详细状态</span>
    </header>

    <div class="device-situation-table-wrap">
      <table class="device-situation-table">
        <thead>
          <tr>
            <th>设备</th>
            <th>所属线路</th>
            <th>安装位置</th>
            <th>状态</th>
            <th>最新帧点数</th>
            <th>最后上传</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="device in devices"
            :key="device.id"
            :class="{ 'is-selected': selectedId === device.id }"
            :data-device-id="device.id"
            @click="emit('select', device)"
          >
            <td>
              <button
                type="button"
                class="device-situation-name"
                :aria-pressed="selectedId === device.id"
                @click.stop="emit('select', device)"
              >
                <i :class="`is-${device.status}`" aria-hidden="true"></i>
                <span>{{ device.name }}</span>
              </button>
            </td>
            <td>{{ device.line }}</td>
            <td>{{ device.position }}</td>
            <td>
              <span class="device-situation-status" :class="`is-${device.status}`">
                {{ device.statusLabel }}
              </span>
            </td>
            <td>
              <span
                class="device-situation-batch-count"
                :class="{ 'is-incomplete': device.frame.pointCount < 4000 }"
              >
                {{ device.frame.pointCount }} / 4000
              </span>
            </td>
            <td>{{ device.lastUpload }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>
