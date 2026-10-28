<script setup lang="ts">
import { computed } from 'vue'
import type { ManagedDevice } from '../../../../domain/infrastructure/types'
import type { DeviceMonitorRuntime } from '../types'
import { useInfrastructureStore } from '../../../../stores/infrastructure'
import { linkedMonitorText } from '../../../../domain/infrastructure/helpers'

const props = defineProps<{
  device: ManagedDevice
  runtime: DeviceMonitorRuntime
  isLive: boolean
}>()

const maxLatency = computed(() => Math.max(40, ...props.runtime.latencyHistory) * 1.15)

const chartPoints = computed(() =>
  props.runtime.latencyHistory.map((value, index, values) => ({
    x: 45 + (index * 455) / Math.max(1, values.length - 1),
    y: 176 - (value / maxLatency.value) * 142,
  })),
)

const linePath = computed(() =>
  chartPoints.value
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x.toFixed(1)} ${point.y.toFixed(1)}`)
    .join(' '),
)

const areaPath = computed(() => `${linePath.value} L 500 176 L 45 176 Z`)

const lastPoint = computed(
  () => chartPoints.value[chartPoints.value.length - 1] ?? { x: 500, y: 120 },
)
const isLocator = computed(() => props.device.category === 'locator')
const infrastructureStore = useInfrastructureStore()
const linkedDeviceText = computed(() =>
  linkedMonitorText(props.device, infrastructureStore.devices),
)
const frameStatistics = computed(() => [
  { id: 'phase', label: '当前相间', value: props.runtime.phase },
  { id: 'points', label: '采样点数', value: `${props.runtime.pointCount} / 4000` },
  { id: 'min', label: '有符号最小值', value: String(props.runtime.min) },
  { id: 'max', label: '有符号最大值', value: String(props.runtime.max) },
  { id: 'peak', label: '峰值绝对值', value: String(props.runtime.peakAbs) },
])
</script>

<template>
  <section class="device-monitor-telemetry-panel">
    <header>
      <div>
        <strong>实时运行状态</strong>
        <span>通信质量与设备数据链路</span>
      </div>
      <div class="monitor-panel-header-controls">
        <em class="device-monitor-live-state" :class="{ 'is-paused': !isLive }"
          ><i></i>{{ isLive ? '实时刷新中' : '已暂停刷新' }}</em
        >
        <slot name="actions"></slot>
      </div>
    </header>

    <div class="device-monitor-telemetry-body">
      <div class="device-monitor-chart-section">
        <div class="device-monitor-section-title">
          <strong>通信延迟趋势</strong>
          <span>最近 6 次有效读取 · 单位 ms</span>
        </div>

        <div class="device-monitor-chart">
          <div v-if="!runtime.latencyHistory.length" class="device-monitor-empty-chart">
            暂无通信延迟数据
          </div>
          <svg
            v-else
            viewBox="0 0 520 205"
            preserveAspectRatio="none"
            aria-label="通信延迟读取记录"
          >
            <defs>
              <linearGradient id="device-monitor-area-gradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color="#31d8f5" stop-opacity="0.3" />
                <stop offset="100%" stop-color="#31d8f5" stop-opacity="0" />
              </linearGradient>
            </defs>
            <g class="device-monitor-chart-grid">
              <line x1="45" y1="28" x2="500" y2="28" />
              <line x1="45" y1="77" x2="500" y2="77" />
              <line x1="45" y1="126" x2="500" y2="126" />
              <line x1="45" y1="176" x2="500" y2="176" />
              <line x1="45" y1="28" x2="45" y2="176" />
              <line x1="273" y1="28" x2="273" y2="176" />
              <line x1="500" y1="28" x2="500" y2="176" />
            </g>
            <g class="device-monitor-chart-labels">
              <text x="12" y="31">{{ Math.round(maxLatency) }}</text>
              <text x="12" y="80">{{ Math.round(maxLatency * 0.66) }}</text>
              <text x="12" y="129">{{ Math.round(maxLatency * 0.33) }}</text>
              <text x="12" y="179">0</text>
              <text x="42" y="197">较早</text>
              <text x="493" y="197">最新</text>
            </g>
            <path class="device-monitor-chart-area" :d="areaPath" />
            <path class="device-monitor-chart-line" :d="linePath" />
            <circle class="device-monitor-chart-point" :cx="lastPoint.x" :cy="lastPoint.y" r="4" />
          </svg>
        </div>
      </div>

      <div class="device-monitor-quality-section">
        <div class="device-monitor-quality-card">
          <div>
            <span>信号质量</span
            ><strong>{{
              runtime.signalQuality == null ? '暂无数据' : `${runtime.signalQuality}%`
            }}</strong>
          </div>
          <i><span :style="{ width: `${runtime.signalQuality ?? 0}%` }"></span></i>
        </div>

        <div class="device-monitor-quality-card">
          <div>
            <span>数据完整率</span><strong>{{ runtime.integrityPercent }}%</strong>
          </div>
          <i><span :style="{ width: `${runtime.integrityPercent}%` }"></span></i>
        </div>

        <div class="device-monitor-link-card">
          <div class="device-monitor-section-title">
            <strong>数据链路</strong>
            <span>{{ device.network.protocol }}</span>
          </div>
          <div class="device-monitor-link-flow" :class="{ 'is-paused': !isLive }">
            <span
              ><svg><use href="#icon-network" /></svg
            ></span>
            <i></i>
            <span
              ><svg><use href="#icon-server" /></svg
            ></span>
            <i></i>
            <span
              ><svg><use href="#icon-monitor" /></svg
            ></span>
          </div>
          <div class="device-monitor-link-labels">
            <span>设备</span><span>后端服务</span><span>前端</span>
          </div>
        </div>
      </div>
    </div>

    <div v-if="!isLocator" class="device-monitor-batch-panel">
      <div class="device-monitor-batch-head">
        <div>
          <strong>最新波形帧 · {{ runtime.frameId }}</strong>
          <span>一帧标记一个当前相间，并携带 10 组相间故障结果与 4000 个采样点</span>
        </div>
        <em>完整度 {{ runtime.integrityPercent }}%</em>
      </div>

      <div class="device-monitor-batch-cells">
        <div
          v-for="item in frameStatistics"
          :key="item.id"
          class="device-monitor-batch-cell"
          :class="{ 'is-received': runtime.pointCount > 0 }"
        >
          <span>{{ item.label }}</span>
          <strong>{{ runtime.pointCount > 0 ? item.value : '等待' }}</strong>
        </div>
      </div>
    </div>

    <div v-else class="device-monitor-location-panel">
      <div>
        <span>实时定位坐标（GCJ-02）</span>
        <strong
          >{{ device.coordinate[0].toFixed(6) }}, {{ device.coordinate[1].toFixed(6) }}</strong
        >
      </div>
      <div>
        <span>设备关联关系</span>
        <strong>{{ linkedDeviceText }}</strong>
      </div>
    </div>
  </section>
</template>
