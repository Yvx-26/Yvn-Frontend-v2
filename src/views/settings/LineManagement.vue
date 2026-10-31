<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useInfrastructureStore } from '../../stores/infrastructure'
import type { ManagedLine } from '../../domain/infrastructure/types'
import { routeLengthMetres } from '../../domain/infrastructure/line-length'
import {
  cloneDevice,
  cloneLine,
  createLineDraft,
  nextAvailableId,
} from '../../domain/infrastructure/helpers'
import ModuleState from '../../components/common/ModuleState.vue'
import DeviceSequencePanel from './line-management/components/DeviceSequencePanel.vue'
import LineDetailPanel from './line-management/components/LineDetailPanel.vue'
import LineListPanel from './line-management/components/LineListPanel.vue'
import './line-management/line-management.css'

const infrastructureStore = useInfrastructureStore()
const selectedLineId = ref(infrastructureStore.lines[0]?.id ?? '')
const selectedDeviceId = ref(infrastructureStore.lines[0]?.devices[0]?.id ?? '')
const editingOriginalId = ref(selectedLineId.value)
const isCreating = ref(false)
const isSaving = ref(false)
const saveError = ref('')
const saveMessageVisible = ref(false)
const draft = ref<ManagedLine>(
  infrastructureStore.lines[0] ? cloneLine(infrastructureStore.lines[0]) : createLineDraft(),
)
let toastTimer: number | undefined

const displayedLines = computed(() =>
  isCreating.value ? [...infrastructureStore.lines, draft.value] : infrastructureStore.lines,
)

const availableDevices = computed(() => {
  const boundIds = new Set(draft.value.devices.map((device) => device.id))
  return infrastructureStore.devices.filter(
    (device) =>
      device.category !== 'monitor' &&
      !boundIds.has(device.id) &&
      (!device.lineId ||
        device.lineId === editingOriginalId.value ||
        device.lineId === draft.value.id),
  )
})

const duplicateId = computed(() =>
  infrastructureStore.lines.some(
    (line) => line.id === draft.value.id && line.id !== editingOriginalId.value,
  ),
)
const isComplete = computed(
  () =>
    Boolean(draft.value.id.trim()) &&
    Boolean(draft.value.name.trim()) &&
    !duplicateId.value &&
    (!draft.value.lengthM.trim() ||
      (Number.isFinite(Number(draft.value.lengthM)) && Number(draft.value.lengthM) >= 0)),
)

function loadLine(line: ManagedLine) {
  saveError.value = ''
  selectedLineId.value = line.id
  editingOriginalId.value = line.id
  isCreating.value = false
  draft.value = cloneLine(line)
  selectedDeviceId.value = line.devices[0]?.id ?? ''
}

function createLine() {
  const id = nextAvailableId(
    'LINE',
    infrastructureStore.lines.map((line) => line.id),
  )
  saveError.value = ''
  isCreating.value = true
  selectedLineId.value = id
  editingOriginalId.value = ''
  selectedDeviceId.value = ''
  draft.value = { ...createLineDraft(id), name: '新建线路' }
}

function cancelChanges() {
  const original = infrastructureStore.lines.find((line) => line.id === editingOriginalId.value)
  if (original) loadLine(original)
  else if (infrastructureStore.lines[0]) loadLine(infrastructureStore.lines[0])
  else {
    isCreating.value = false
    draft.value = createLineDraft()
    selectedLineId.value = ''
  }
}

async function saveChanges() {
  if (!isComplete.value || isSaving.value) return
  isSaving.value = true
  saveError.value = ''
  draft.value.state = draft.value.devices.length < 2 ? 'draft' : 'enabled'
  try {
    await infrastructureStore.saveLine(draft.value, editingOriginalId.value || undefined)
    const saved = infrastructureStore.lines.find((line) => line.id === draft.value.id)
    if (saved) draft.value = cloneLine(saved)
    isCreating.value = false
    selectedLineId.value = draft.value.id
    editingOriginalId.value = draft.value.id
    showSaveMessage()
  } catch (error) {
    saveError.value = error instanceof Error ? error.message : '线路保存失败'
  } finally {
    isSaving.value = false
  }
}

function showSaveMessage() {
  saveMessageVisible.value = true
  if (toastTimer) window.clearTimeout(toastTimer)
  toastTimer = window.setTimeout(() => (saveMessageVisible.value = false), 1800)
}

function bindDevice(deviceId: string) {
  const device = infrastructureStore.devices.find((item) => item.id === deviceId)
  if (!device) return
  draft.value.devices.push({ ...cloneDevice(device), sequence: draft.value.devices.length + 1 })
  selectedDeviceId.value = device.id
}

function removeDevice(deviceId: string) {
  draft.value.devices = draft.value.devices
    .filter((device) => device.id !== deviceId)
    .map((device, index) => ({ ...device, sequence: index + 1 }))
  if (selectedDeviceId.value === deviceId) {
    selectedDeviceId.value = draft.value.devices[0]?.id ?? ''
  }
}

function moveDevice(deviceId: string, direction: -1 | 1) {
  const index = draft.value.devices.findIndex((device) => device.id === deviceId)
  const targetIndex = index + direction
  if (index < 0 || targetIndex < 0 || targetIndex >= draft.value.devices.length) return
  const devices = draft.value.devices.slice()
  const [device] = devices.splice(index, 1)
  devices.splice(targetIndex, 0, device!)
  draft.value.devices = devices.map((item, itemIndex) => ({ ...item, sequence: itemIndex + 1 }))
}

watch(
  () =>
    infrastructureStore.devices
      .map((device) => `${device.id}:${device.coordinate.join(',')}`)
      .join('|'),
  () => {
    const byId = new Map(infrastructureStore.devices.map((device) => [device.id, device]))
    draft.value.devices.forEach((device) => {
      const current = byId.get(device.id)
      if (current) device.coordinate = [...current.coordinate]
    })
  },
)

watch(
  () => draft.value.devices,
  (devices) => {
    draft.value.lengthM = routeLengthMetres(devices)
    if (devices.length && !devices.some((device) => device.id === selectedDeviceId.value)) {
      selectedDeviceId.value = devices[0]!.id
    }
  },
  { deep: true, immediate: true },
)
onBeforeUnmount(() => {
  if (toastTimer) window.clearTimeout(toastTimer)
})
</script>

<template>
  <section class="line-management-page" aria-label="线路管理">
    <header class="line-management-toolbar">
      <div>
        <strong>线路档案配置</strong>
        <span>统一维护线路、地图路径及定位设备顺序</span>
      </div>
      <div class="line-management-toolbar-actions">
        <button type="button" disabled title="批量导入尚未开放">
          <svg><use href="#icon-download" /></svg>批量导入（未开放）
        </button>
        <button type="button" class="is-primary" @click="createLine">
          <span>＋</span>新增线路
        </button>
      </div>
    </header>

    <ModuleState
      v-if="!infrastructureStore.lines.length && !isCreating"
      title="尚未建立线路档案"
      description="先创建线路，保存后可在设备配置中新增设备，再绑定定位节点。"
      action-label="新增线路"
      @action="createLine"
    />
    <div v-else class="line-management-layout">
      <LineListPanel
        :lines="displayedLines"
        :selected-line-id="selectedLineId"
        @select="loadLine"
      />

      <LineDetailPanel
        v-model="draft"
        :selected-device-id="selectedDeviceId"
        @select-device="selectedDeviceId = $event"
      />

      <DeviceSequencePanel
        :available-devices="availableDevices"
        :devices="draft.devices"
        :selected-device-id="selectedDeviceId"
        @bind="bindDevice"
        @move="moveDevice"
        @remove="removeDevice"
        @select="selectedDeviceId = $event"
      />
    </div>

    <footer v-if="infrastructureStore.lines.length || isCreating" class="line-management-actionbar">
      <div class="line-management-validation" :class="{ 'is-incomplete': !isComplete }">
        <i></i>
        <span>
          {{
            saveError ||
            (duplicateId
              ? '线路编号已存在'
              : isComplete
                ? draft.devices.length >= 2
                  ? '线路信息完整，可以保存并用于实时监测'
                  : '可先保存线路档案，再新增设备并绑定至少两个定位节点'
                : '请填写线路编号和名称，线路长度须为非负数字')
          }}
        </span>
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

    <Transition name="line-management-toast">
      <div v-if="saveMessageVisible" class="line-management-save-toast" role="status">
        <i></i>线路配置已保存
      </div>
    </Transition>
  </section>
</template>
