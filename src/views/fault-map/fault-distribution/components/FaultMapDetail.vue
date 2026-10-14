<script setup lang="ts">
import type { MapSelection } from '../types'

defineProps<{
  selection: Exclude<MapSelection, null>
}>()

defineEmits<{
  close: []
  locate: []
}>()
</script>

<template>
  <aside class="fault-map-detail" aria-live="polite">
    <header>
      <div>
        <strong>{{ selection.kind === 'fault' ? '故障定位详情' : '定位设备详情' }}</strong>
        <span>{{ selection.line.name }}</span>
      </div>
      <button type="button" aria-label="关闭详情" @click="$emit('close')">×</button>
    </header>

    <div v-if="selection.kind === 'fault'" class="fault-map-detail-body">
      <div class="fault-detail-title">
        <div><i class="is-fault"></i><strong>{{ selection.fault.title }}</strong></div>
        <span>严重</span>
      </div>
      <p>由 {{ selection.fault.between[0] }} 与 {{ selection.fault.between[1] }} 区间监测数据综合定位。</p>
      <dl>
        <div><dt>故障区间</dt><dd>{{ selection.fault.between.join(' — ') }}</dd></div>
        <div><dt>参考距离</dt><dd class="is-danger">{{ selection.fault.distanceFromDevice }}</dd></div>
        <div><dt>定位时间</dt><dd>{{ selection.fault.occurredAt }}</dd></div>
        <div><dt>定位状态</dt><dd>{{ selection.fault.locationStatus }}</dd></div>
        <div><dt>算法结果</dt><dd>{{ selection.fault.confidence }}</dd></div>
        <div><dt>事件编号</dt><dd>{{ selection.fault.id }}</dd></div>
      </dl>
      <button type="button" class="fault-detail-primary" @click="$emit('locate')">
        进入实时定位
      </button>
    </div>

    <div v-else class="fault-map-detail-body">
      <div class="fault-detail-title">
        <div><i :class="`is-${selection.device.status}`"></i><strong>{{ selection.device.name }}</strong></div>
        <span :class="`is-${selection.device.status}`">{{ selection.device.statusLabel }}</span>
      </div>
      <p>该设备是 {{ selection.line.name }} 的第 {{ selection.device.sequence }} 个线路定位点。</p>
      <dl>
        <div><dt>设备编号</dt><dd>{{ selection.device.id }}</dd></div>
        <div><dt>线路顺序</dt><dd>第 {{ selection.device.sequence }} 点</dd></div>
        <div><dt>经度</dt><dd>{{ selection.device.coordinate[0] }}</dd></div>
        <div><dt>纬度</dt><dd>{{ selection.device.coordinate[1] }}</dd></div>
        <div><dt>通信延迟</dt><dd>{{ selection.device.latency }}</dd></div>
        <div><dt>最后上传</dt><dd>{{ selection.device.lastUpload }}</dd></div>
      </dl>
    </div>
  </aside>
</template>
