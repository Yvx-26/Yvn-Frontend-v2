<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type {
  ManagedDevice,
  ManagedDeviceCategory,
  ManagedLine,
} from '../../../../domain/infrastructure/types'
import { createAcquisitionConfig } from '../../../../domain/infrastructure/helpers'

const props = defineProps<{
  devices: ManagedDevice[]
  lines: ManagedLine[]
  testingConnection: boolean
  connectionTestPassed: boolean
}>()

const emit = defineEmits<{
  'test-connection': []
}>()

const draft = defineModel<ManagedDevice>({ required: true })
const activeTab = ref<'basic' | 'network' | 'acquisition'>('basic')

const categoryLabels: Record<ManagedDeviceCategory, string> = {
  monitor: '监测设备',
  locator: '定位设备',
  integrated: '一体化终端',
}

const positioningDevices = computed(() =>
  props.devices.filter(
    (device) =>
      device.id !== draft.value.id &&
      device.category !== 'monitor' &&
      (!draft.value.lineId || device.lineId === draft.value.lineId),
  ),
)

const relatedMonitors = computed(() =>
  props.devices.filter((device) => device.linkedLocatorId === draft.value.id),
)

const selectedLine = computed(() => props.lines.find((line) => line.id === draft.value.lineId))

function changeCategory() {
  if (draft.value.category === 'locator') {
    draft.value.linkedLocatorId = ''
    draft.value.acquisition = null
    activeTab.value = 'basic'
    return
  }
  if (draft.value.category === 'integrated') draft.value.linkedLocatorId = ''
  if (!draft.value.acquisition) draft.value.acquisition = createAcquisitionConfig()
}

watch(
  () => draft.value.category,
  (category) => {
    if (category === 'locator' && activeTab.value === 'acquisition') activeTab.value = 'basic'
  },
)
</script>

<template>
  <section class="device-config-editor-panel">
    <header class="device-config-editor-header">
      <div>
        <strong>{{ draft.name || '未命名设备' }}</strong>
        <span>
          {{ categoryLabels[draft.category] }} · {{ selectedLine?.name || '未绑定线路' }} ·
          {{ draft.position || '位置待配置' }}
        </span>
      </div>
      <button
        type="button"
        :class="{ 'is-success': connectionTestPassed }"
        :disabled="testingConnection"
        @click="emit('test-connection')"
      >
        <svg><use href="#icon-network" /></svg>
        {{ testingConnection ? '正在测试' : connectionTestPassed ? '连接正常' : '连接测试' }}
      </button>
    </header>

    <nav class="device-config-editor-tabs" aria-label="设备参数类别">
      <button
        type="button"
        :class="{ 'is-active': activeTab === 'basic' }"
        @click="activeTab = 'basic'"
      >
        基础信息
      </button>
      <button
        type="button"
        :class="{ 'is-active': activeTab === 'network' }"
        @click="activeTab = 'network'"
      >
        通信参数
      </button>
      <button
        type="button"
        :disabled="draft.category === 'locator'"
        :class="{ 'is-active': activeTab === 'acquisition' }"
        @click="activeTab = 'acquisition'"
      >
        {{ draft.category === 'locator' ? '采集策略（不适用）' : '采集策略' }}
      </button>
    </nav>

    <div class="device-config-form-scroll">
      <template v-if="activeTab === 'basic'">
        <section class="device-config-form-section">
          <h3>设备档案</h3>
          <div class="device-config-fields">
            <label>
              <span>设备编号<i>*</i></span>
              <input v-model.trim="draft.id" type="text" />
            </label>
            <label>
              <span>设备名称<i>*</i></span>
              <input v-model.trim="draft.name" type="text" />
            </label>
            <label>
              <span>设备类别</span>
              <select v-model="draft.category" @change="changeCategory">
                <option value="monitor">监测设备</option>
                <option value="locator">定位设备</option>
                <option value="integrated">一体化终端</option>
              </select>
            </label>
            <label>
              <span>所属线路<i>*</i></span>
              <select v-model="draft.lineId">
                <option value="">请选择线路</option>
                <option v-for="line in lines" :key="line.id" :value="line.id">
                  {{ line.name }}
                </option>
              </select>
            </label>
            <label>
              <span>线路位置</span>
              <input v-model.trim="draft.position" type="text" />
            </label>
            <label>
              <span>启用状态</span>
              <select v-model="draft.enabled">
                <option :value="true">已启用</option>
                <option :value="false">已停用</option>
              </select>
            </label>
          </div>
        </section>

        <section class="device-config-form-section">
          <h3>设备关联与定位</h3>
          <div class="device-config-fields">
            <label v-if="draft.category === 'monitor'" class="is-wide">
              <span>关联定位设备<i>*</i></span>
              <select v-model="draft.linkedLocatorId">
                <option value="">请选择提供定位点的设备</option>
                <option v-for="device in positioningDevices" :key="device.id" :value="device.id">
                  {{ device.id }} · {{ device.position }} · {{ device.name }}
                </option>
              </select>
            </label>
            <div v-else-if="draft.category === 'locator'" class="device-config-relation is-wide">
              <span>已关联监测设备</span>
              <div>
                <em v-for="device in relatedMonitors" :key="device.id" class="asset-identifier">{{ device.id }}</em>
                <small v-if="relatedMonitors.length === 0">暂未关联监测设备</small>
              </div>
            </div>
            <div v-else class="device-config-relation is-wide">
              <span>定位方式</span>
              <div><em>使用本机定位模块</em></div>
            </div>
            <label>
              <span>经度</span>
              <input v-model.number="draft.coordinate[0]" type="number" step="0.000001" />
            </label>
            <label>
              <span>纬度</span>
              <input v-model.number="draft.coordinate[1]" type="number" step="0.000001" />
            </label>
          </div>
          <p class="device-config-relation-note" :class="`is-${draft.category}`">
            <template v-if="draft.category === 'monitor'">
              监测数据通过关联定位设备接入所属线路与故障地图。
            </template>
            <template v-else-if="draft.category === 'locator'">
              本设备坐标作为线路绘制定位点，可被多个监测设备关联。
            </template>
            <template v-else>
              本机同时提供线路定位点，并按相间上传每帧 4000 个波形采样点。
            </template>
          </p>
        </section>
      </template>

      <template v-else-if="activeTab === 'network'">
        <section class="device-config-form-section">
          <h3>网络连接</h3>
          <div class="device-config-fields">
            <label>
              <span>接入方式</span>
              <select v-model="draft.network.accessMode">
                <option value="ethernet">有线以太网</option>
                <option value="cellular">4G / 5G</option>
                <option value="fiber">光纤</option>
              </select>
            </label>
            <label>
              <span>通信协议</span>
              <select v-model="draft.network.protocol">
                <option value="MQTT">MQTT</option>
                <option value="TCP">TCP</option>
                <option value="HTTP">HTTP</option>
              </select>
            </label>
            <label>
              <span>设备 IP</span>
              <input v-model.trim="draft.network.ipAddress" type="text" />
            </label>
            <label>
              <span>服务端口</span>
              <input v-model.trim="draft.network.serverPort" type="text" />
            </label>
            <label class="is-wide">
              <span>上报主题</span>
              <input v-model.trim="draft.network.uploadTopic" type="text" />
            </label>
          </div>
        </section>

        <section class="device-config-form-section">
          <h3>连接保持</h3>
          <div class="device-config-fields">
            <label>
              <span>心跳间隔（秒）</span>
              <input v-model.trim="draft.network.heartbeatSeconds" type="number" />
            </label>
            <label>
              <span>断线重试（秒）</span>
              <input v-model.trim="draft.network.retrySeconds" type="number" />
            </label>
            <label>
              <span>连接超时（秒）</span>
              <input v-model.trim="draft.network.timeoutSeconds" type="number" />
            </label>
            <label>
              <span>离线判定（秒）</span>
              <input
                v-model.trim="draft.network.offlineThresholdSeconds"
                type="number"
                min="1"
                step="1"
                placeholder="默认 90 秒"
              />
            </label>
          </div>
        </section>
      </template>

      <template v-else-if="draft.acquisition">
        <section class="device-config-form-section">
          <h3>波形帧采集</h3>
          <div class="device-config-fields">
            <label>
              <span>每帧采样点数</span>
              <input v-model.number="draft.acquisition.batchSize" type="number" min="1" />
            </label>
            <label>
              <span>数据上报方式</span>
              <select v-model="draft.acquisition.uploadMode">
                <option value="complete-batch">完整波形帧上报</option>
                <option value="sequential">分片到达后拼帧</option>
              </select>
            </label>
            <label>
              <span>波形帧等待超时（秒）</span>
              <input v-model.trim="draft.acquisition.batchTimeoutSeconds" type="number" />
            </label>
            <label>
              <span>不完整帧处理</span>
              <select v-model="draft.acquisition.missingDataPolicy">
                <option value="mark-and-upload">标记异常并上报</option>
                <option value="wait-for-completion">继续等待补齐</option>
              </select>
            </label>
            <label>
              <span>采样频率</span>
              <input v-model.trim="draft.acquisition.sampleRate" type="text" />
            </label>
          </div>
          <p class="device-config-batch-note">
            <strong>{{ draft.acquisition.batchSize }} 点 / 帧</strong>
            每帧通过 Byte1 标记 A-B 至 N-E 中的一个当前相间，同时携带 10 组相间故障结果和 4000
            个采样点。
          </p>
        </section>

        <section class="device-config-form-section">
          <h3>本地缓存</h3>
          <div class="device-config-fields">
            <label>
              <span>离线缓存帧数</span>
              <input v-model.trim="draft.acquisition.offlineCacheBatches" type="number" />
            </label>
            <label>
              <span>恢复后补传</span>
              <select v-model="draft.acquisition.backfillEnabled">
                <option :value="true">启用</option>
                <option :value="false">停用</option>
              </select>
            </label>
          </div>
        </section>
      </template>
    </div>
  </section>
</template>
