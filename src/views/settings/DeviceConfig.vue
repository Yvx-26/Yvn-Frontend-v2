<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import type { ManagedDevice } from '../../domain/infrastructure/types'
import { fetchDashboardDevices, fetchDashboardMap } from '../../services/telemetry-api'
import { useInfrastructureStore } from '../../stores/infrastructure'
import DeviceEditorPanel from './device-config/components/DeviceEditorPanel.vue'
import DeviceListPanel from './device-config/components/DeviceListPanel.vue'
import DeviceStatusPanel from './device-config/components/DeviceStatusPanel.vue'
import './device-config/device-config.css'

function cloneDevice(device: ManagedDevice): ManagedDevice {
  return JSON.parse(JSON.stringify(device)) as ManagedDevice
}

const infrastructureStore = useInfrastructureStore()
const initialDevice =
  infrastructureStore.devices.find((device) => device.id === 'JC-04') ??
  infrastructureStore.devices[0]!
const selectedDeviceId = ref(initialDevice.id)
const editingOriginalId = ref(initialDevice.id)
const draft = ref<ManagedDevice>(cloneDevice(initialDevice))
const isCreating = ref(false)
const isSaving = ref(false)
const saveError = ref('')
const testingConnection = ref(false)
const connectionTestPassed = ref(false)
const saveMessageVisible = ref(false)
let toastTimer: number | undefined

const selectedLine = computed(() =>
  infrastructureStore.lines.find((line) => line.id === draft.value.lineId),
)

const locationDevice = computed(() => {
  if (draft.value.category !== 'monitor') return undefined
  return infrastructureStore.devices.find(
    (device) =>
      device.id === draft.value.linkedLocatorId &&
      device.category !== 'monitor' &&
      device.lineId === draft.value.lineId,
  )
})

const duplicateId = computed(() =>
  infrastructureStore.devices.some(
    (device) => device.id === draft.value.id && device.id !== editingOriginalId.value,
  ),
)

const isComplete = computed(
  () =>
    Boolean(draft.value.id.trim()) &&
    Boolean(draft.value.name.trim()) &&
    Boolean(draft.value.lineId) &&
    !duplicateId.value &&
    (draft.value.category !== 'monitor' || Boolean(locationDevice.value)),
)

const validationText = computed(() => {
  if (saveError.value) return saveError.value
  if (duplicateId.value) return '设备编号已存在，请使用唯一编号'
  if (!draft.value.id.trim() || !draft.value.name.trim()) return '请补充设备编号和设备名称'
  if (!draft.value.lineId) return '请选择设备所属线路'
  if (draft.value.category === 'monitor' && !locationDevice.value) {
    return '监测设备必须关联所属线路中的定位设备'
  }
  return '设备配置完整，可保存并用于线路定位与实时监测'
})

function loadDevice(device: ManagedDevice) {
  selectedDeviceId.value = device.id
  editingOriginalId.value = device.id
  isCreating.value = false
  connectionTestPassed.value = false
  draft.value = cloneDevice(device)
}

function createDevice() {
  const line = infrastructureStore.lines[0]!
  const locator = infrastructureStore.devices.find(
    (device) => device.lineId === line.id && device.category !== 'monitor',
  )
  const sequence = infrastructureStore.devices.length + 1
  const id = `NEW-${String(sequence).padStart(2, '0')}`
  isCreating.value = true
  selectedDeviceId.value = id
  editingOriginalId.value = ''
  connectionTestPassed.value = false
  draft.value = {
    id,
    name: '新建行波监测终端',
    category: 'monitor',
    lineId: line.id,
    position: '待配置监测点',
    coordinate: locator ? [...locator.coordinate] : [113.545, 34.818],
    linkedLocatorId: locator?.id ?? '',
    state: 'offline',
    enabled: true,
    lastSeen: '尚未连接',
    latencyMs: null,
    signalDbm: null,
    firmwareVersion: 'v1.0.0',
    updatedAt: '尚未保存',
    network: {
      accessMode: 'ethernet',
      protocol: 'MQTT',
      ipAddress: '192.168.10.100',
      serverPort: '1883',
      uploadTopic: `cable/device/${id.toLowerCase()}/data`,
      heartbeatSeconds: '30',
      retrySeconds: '5',
      timeoutSeconds: '10',
      offlineThresholdSeconds: '90',
    },
    acquisition: {
      batchSize: 4000,
      uploadMode: 'complete-batch',
      batchTimeoutSeconds: '30',
      missingDataPolicy: 'mark-and-upload',
      sampleRate: '1 MHz',
      triggerThreshold: '',
      offlineCacheBatches: '200',
      backfillEnabled: true,
    },
  }
}

function cancelChanges() {
  const original = infrastructureStore.devices.find(
    (device) => device.id === editingOriginalId.value,
  )
  loadDevice(original ?? infrastructureStore.devices[0]!)
}

async function saveChanges() {
  if (!isComplete.value || isSaving.value) return
  isSaving.value = true
  saveError.value = ''
  try {
    await infrastructureStore.saveDevice(draft.value, editingOriginalId.value || undefined)
    selectedDeviceId.value = draft.value.id
    editingOriginalId.value = draft.value.id
    isCreating.value = false
    showSaveMessage()
  } catch (error) {
    saveError.value = error instanceof Error ? error.message : '设备保存失败'
  } finally {
    isSaving.value = false
  }
}

async function testConnection() {
  testingConnection.value = true
  connectionTestPassed.value = false
  saveError.value = ''
  try {
    if (draft.value.category === 'locator') {
      const points = await fetchDashboardMap()
      connectionTestPassed.value = points.some((point) => point.imei === draft.value.id)
    } else {
      const devices = await fetchDashboardDevices()
      connectionTestPassed.value = devices.some((device) => device.imei === draft.value.id)
    }
    if (!connectionTestPassed.value) saveError.value = '后端尚未收到该设备的真实上报数据'
  } catch (error) {
    saveError.value = error instanceof Error ? error.message : '真实连接状态检查失败'
  } finally {
    testingConnection.value = false
  }
}

function showSaveMessage() {
  saveMessageVisible.value = true
  if (toastTimer) window.clearTimeout(toastTimer)
  toastTimer = window.setTimeout(() => (saveMessageVisible.value = false), 1800)
}

watch(
  () => draft.value.linkedLocatorId,
  (deviceId) => {
    if (draft.value.category !== 'monitor' || !deviceId) return
    const locator = infrastructureStore.devices.find((device) => device.id === deviceId)
    if (locator) draft.value.coordinate = [...locator.coordinate]
  },
)

onBeforeUnmount(() => {
  if (toastTimer) window.clearTimeout(toastTimer)
})
</script>

<template>
  <section class="device-config-page" aria-label="设备配置">
    <header class="device-config-toolbar">
      <div>
        <strong>设备档案配置</strong>
        <span>统一维护监测设备、定位设备及一体化终端</span>
      </div>
      <div class="device-config-toolbar-actions">
        <button type="button"><svg><use href="#icon-download" /></svg>批量导入</button>
        <button type="button" class="is-primary" @click="createDevice">
          <span>＋</span>新增设备
        </button>
      </div>
    </header>

    <div class="device-config-layout">
      <DeviceListPanel
        :devices="infrastructureStore.devices"
        :lines="infrastructureStore.lines"
        :selected-device-id="selectedDeviceId"
        @select="loadDevice"
      />

      <DeviceEditorPanel
        v-model="draft"
        :devices="infrastructureStore.devices"
        :lines="infrastructureStore.lines"
        :testing-connection="testingConnection"
        :connection-test-passed="connectionTestPassed"
        @test-connection="testConnection"
      />

      <DeviceStatusPanel
        :device="draft"
        :line="selectedLine"
        :location-device="locationDevice"
      />
    </div>

    <footer class="device-config-actionbar">
      <div class="device-config-validation" :class="{ 'is-incomplete': !isComplete }">
        <i></i><span>{{ validationText }}</span>
      </div>
      <div>
        <button type="button" @click="cancelChanges">取消修改</button>
        <button type="button" class="is-primary" :disabled="!isComplete || isSaving" @click="saveChanges">
          {{ isSaving ? '保存中…' : '保存配置' }}
        </button>
      </div>
    </footer>

    <Transition name="device-config-toast">
      <div v-if="saveMessageVisible" class="device-config-save-toast" role="status">
        <i></i>设备配置已保存
      </div>
    </Transition>
  </section>
</template>
