<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import type { ManagedDevice } from '../../domain/infrastructure/types'
import { fetchDashboardDevices, fetchDashboardMap } from '../../services/telemetry-api'
import { useInfrastructureStore } from '../../stores/infrastructure'
import {
  cloneDevice,
  createDeviceDraft,
  nextAvailableId,
  hasCoordinate,
  parseOfflineThreshold,
} from '../../domain/infrastructure/helpers'
import { isRequestCancelled } from '../../services/http'
import ModuleState from '../../components/common/ModuleState.vue'
import { RouterLink } from 'vue-router'
import DeviceEditorPanel from './device-config/components/DeviceEditorPanel.vue'
import DeviceListPanel from './device-config/components/DeviceListPanel.vue'
import DeviceStatusPanel from './device-config/components/DeviceStatusPanel.vue'
import './device-config/device-config.css'

const infrastructureStore = useInfrastructureStore()
const initialDevice = infrastructureStore.devices[0]
const selectedDeviceId = ref(initialDevice?.id ?? '')
const editingOriginalId = ref(initialDevice?.id ?? '')
const draft = ref<ManagedDevice>(initialDevice ? cloneDevice(initialDevice) : createDeviceDraft())
const isCreating = ref(false)
const isSaving = ref(false)
const saveError = ref('')
const testingConnection = ref(false)
const connectionTestPassed = ref(false)
const saveMessageVisible = ref(false)
let toastTimer: number | undefined
let testController: AbortController | undefined

const selectedLine = computed(() =>
  infrastructureStore.lines.find((line) => line.id === draft.value.lineId),
)

const statusDevice = computed(() => {
  const saved = infrastructureStore.devices.find((device) => device.id === editingOriginalId.value)
  if (!saved) return draft.value
  return { ...draft.value, state: saved.state, lastSeen: saved.lastSeen }
})

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

const validOfflineThreshold = computed(() => {
  const value = String(draft.value.network.offlineThresholdSeconds).trim()
  return value === '' || parseOfflineThreshold(value) !== undefined
})

const isComplete = computed(
  () =>
    Boolean(draft.value.id.trim()) &&
    Boolean(draft.value.name.trim()) &&
    Boolean(draft.value.lineId) &&
    !duplicateId.value &&
    validOfflineThreshold.value &&
    hasCoordinate(draft.value.coordinate) &&
    (!draft.value.acquisition ||
      (Number.isInteger(draft.value.acquisition.batchSize) &&
        draft.value.acquisition.batchSize > 0)) &&
    (draft.value.category !== 'monitor' || Boolean(locationDevice.value)),
)

const validationText = computed(() => {
  if (saveError.value) return saveError.value
  if (duplicateId.value) return '设备编号已存在，请使用唯一编号'
  if (!draft.value.id.trim() || !draft.value.name.trim()) return '请补充设备编号和设备名称'
  if (!draft.value.lineId) return '请选择设备所属线路'
  if (!hasCoordinate(draft.value.coordinate)) return '请填写有效的经纬度，或为监测设备关联定位节点'
  if (!validOfflineThreshold.value) return '离线判定须为正整数秒，留空使用默认值'
  if (
    draft.value.acquisition &&
    (!Number.isInteger(draft.value.acquisition.batchSize) || draft.value.acquisition.batchSize <= 0)
  )
    return '采样点数须为正整数'
  if (draft.value.category === 'monitor' && !locationDevice.value) {
    return '监测设备必须关联所属线路中的定位设备'
  }
  return '设备配置完整，可保存并用于线路定位与实时监测'
})

function loadDevice(device: ManagedDevice) {
  saveError.value = ''
  selectedDeviceId.value = device.id
  editingOriginalId.value = device.id
  isCreating.value = false
  connectionTestPassed.value = false
  draft.value = cloneDevice(device)
}

function createDevice() {
  const line = infrastructureStore.lines[0]
  if (!line) return
  const id = nextAvailableId(
    'NEW',
    infrastructureStore.devices.map((device) => device.id),
  )
  saveError.value = ''
  isCreating.value = true
  selectedDeviceId.value = id
  editingOriginalId.value = ''
  connectionTestPassed.value = false
  draft.value = { ...createDeviceDraft(id, line.id), name: '新建设备' }
}

function cancelChanges() {
  const original = infrastructureStore.devices.find(
    (device) => device.id === editingOriginalId.value,
  )
  const fallback = original ?? infrastructureStore.devices[0]
  if (fallback) loadDevice(fallback)
  else {
    isCreating.value = false
    draft.value = createDeviceDraft()
    selectedDeviceId.value = ''
  }
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
  testController?.abort()
  const controller = new AbortController()
  testController = controller
  const requestedId = draft.value.id
  const requestedCategory = draft.value.category
  testingConnection.value = true
  connectionTestPassed.value = false
  saveError.value = ''
  try {
    let online = false
    if (requestedCategory === 'integrated') {
      const results = await Promise.allSettled([
        fetchDashboardDevices(controller.signal),
        fetchDashboardMap(controller.signal),
      ])
      online = results.some(
        (result) =>
          result.status === 'fulfilled' &&
          result.value.some((item) => item.imei === requestedId && item.online),
      )
      const failure = results.find((result) => result.status === 'rejected')
      if (!online && failure?.status === 'rejected') throw failure.reason
    } else if (requestedCategory === 'locator') {
      const points = await fetchDashboardMap(controller.signal)
      online = points.some((point) => point.imei === requestedId && point.online)
    } else {
      const devices = await fetchDashboardDevices(controller.signal)
      online = devices.some((device) => device.imei === requestedId && device.online)
    }
    if (controller.signal.aborted || draft.value.id !== requestedId) return
    connectionTestPassed.value = online
    if (!online) saveError.value = '设备当前不在线，未检测到近期上报'
  } catch (error) {
    if (!isRequestCancelled(error))
      saveError.value = error instanceof Error ? error.message : '真实连接状态检查失败'
  } finally {
    if (testController === controller) testingConnection.value = false
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

watch(
  () => [draft.value.id, draft.value.category, JSON.stringify(draft.value.network)],
  () => {
    testController?.abort()
    connectionTestPassed.value = false
    testingConnection.value = false
  },
)

onBeforeUnmount(() => {
  testController?.abort()
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
        <button type="button" disabled title="批量导入尚未开放">
          <svg><use href="#icon-download" /></svg>批量导入（未开放）
        </button>
        <button
          type="button"
          class="is-primary"
          :disabled="!infrastructureStore.lines.length"
          @click="createDevice"
        >
          <span>＋</span>新增设备
        </button>
      </div>
    </header>

    <ModuleState
      v-if="!infrastructureStore.lines.length"
      title="请先建立线路档案"
      description="设备需要关联已建立的线路。"
    >
    </ModuleState>
    <RouterLink v-if="!infrastructureStore.lines.length" to="/settings/lines"
      >前往线路管理</RouterLink
    >
    <ModuleState
      v-else-if="!infrastructureStore.devices.length && !isCreating"
      title="尚未配置设备"
      description="可以先添加定位设备，再为监测设备建立关联。"
      action-label="新增设备"
      @action="createDevice"
    />
    <div v-else class="device-config-layout">
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

      <DeviceStatusPanel :device="statusDevice" :line="selectedLine" :location-device="locationDevice" />
    </div>

    <footer
      v-if="infrastructureStore.lines.length && (infrastructureStore.devices.length || isCreating)"
      class="device-config-actionbar"
    >
      <div class="device-config-validation" :class="{ 'is-incomplete': !isComplete }">
        <i></i><span>{{ validationText }}</span>
      </div>
      <div>
        <button type="button" @click="cancelChanges">取消修改</button>
        <button
          type="button"
          class="is-primary"
          :disabled="!isComplete || isSaving"
          @click="saveChanges"
        >
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
