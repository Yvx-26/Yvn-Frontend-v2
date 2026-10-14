<script setup lang="ts">
import { ref } from 'vue'
import type { ManagedDevice } from '../../../../domain/infrastructure/types'
import type { DeviceDetailTab, DeviceMonitorRuntime } from '../types'

defineProps<{
  device: ManagedDevice
  runtime: DeviceMonitorRuntime
}>()

const activeTab = ref<DeviceDetailTab>('events')

const categoryLabels = {
  monitor: '监测设备',
  locator: '定位设备',
  integrated: '一体化终端',
}

const uploadModeLabels = {
  'complete-batch': '完整波形帧',
  sequential: '分片拼帧',
}
</script>

<template>
  <aside class="device-monitor-detail-panel">
    <header>
      <div>
        <strong>设备详情</strong>
        <span>仅展示当前所选设备</span>
      </div>
      <em>在线诊断</em>
    </header>

    <div class="device-monitor-detail-tabs">
      <button
        type="button"
        :class="{ 'is-active': activeTab === 'events' }"
        @click="activeTab = 'events'"
      >
        实时事件
      </button>
      <button
        type="button"
        :class="{ 'is-active': activeTab === 'config' }"
        @click="activeTab = 'config'"
      >
        配置参数
      </button>
    </div>

    <div v-if="activeTab === 'events'" class="device-monitor-event-list">
      <article v-for="event in runtime.events" :key="event.id" :class="`is-${event.level}`">
        <i></i>
        <div>
          <strong>{{ event.title }}</strong>
          <p>{{ event.description }}</p>
        </div>
        <time>{{ event.time }}</time>
      </article>
    </div>

    <div v-else class="device-monitor-config-list">
      <div><span>设备编号</span><strong>{{ device.id }}</strong></div>
      <div><span>设备类型</span><strong>{{ categoryLabels[device.category] }}</strong></div>
      <div><span>固件版本</span><strong>{{ device.firmwareVersion }}</strong></div>
      <div><span>通信协议</span><strong>{{ device.network.protocol }}</strong></div>
      <div><span>设备 IP</span><strong>{{ device.network.ipAddress }}</strong></div>
      <div><span>心跳周期</span><strong>{{ device.network.heartbeatSeconds }} 秒</strong></div>
      <template v-if="device.acquisition">
        <div><span>每帧采样点</span><strong>{{ device.acquisition.batchSize }} 点</strong></div>
        <div>
          <span>上传方式</span>
          <strong>{{ uploadModeLabels[device.acquisition.uploadMode] }}</strong>
        </div>
        <div><span>采样率</span><strong>{{ device.acquisition.sampleRate }}</strong></div>
      </template>
    </div>
  </aside>
</template>
