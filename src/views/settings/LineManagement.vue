<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useInfrastructureStore } from '../../stores/infrastructure'
import type { BoundLineDevice, ManagedLine } from '../../domain/infrastructure/types'
import DeviceSequencePanel from './line-management/components/DeviceSequencePanel.vue'
import LineDetailPanel from './line-management/components/LineDetailPanel.vue'
import LineListPanel from './line-management/components/LineListPanel.vue'
import './line-management/line-management.css'

function cloneLine(line: ManagedLine): ManagedLine {
  return JSON.parse(JSON.stringify(line)) as ManagedLine
}

const infrastructureStore = useInfrastructureStore()
const selectedLineId = ref(infrastructureStore.lines[0]!.id)
const selectedDeviceId = ref(infrastructureStore.lines[0]!.devices[0]!.id)
const editingOriginalId = ref(selectedLineId.value)
const isCreating = ref(false)
const isSaving = ref(false)
const saveError = ref('')
const saveMessageVisible = ref(false)
const draft = ref<ManagedLine>(cloneLine(infrastructureStore.lines[0]!))
let toastTimer: number | undefined

const displayedLines = computed(() =>
  isCreating.value ? [...infrastructureStore.lines, draft.value] : infrastructureStore.lines,
)

const availableDevices = computed(() => {
  const boundIds = new Set(draft.value.devices.map((device) => device.id))
  return infrastructureStore.devices.filter(
    (device) => device.category !== 'monitor' && !boundIds.has(device.id),
  )
})

const isComplete = computed(
  () =>
    Boolean(draft.value.id.trim()) &&
    Boolean(draft.value.name.trim()) &&
    Boolean(draft.value.lengthKm.trim()) &&
    draft.value.devices.length >= 2,
)

function loadLine(line: ManagedLine) {
  selectedLineId.value = line.id
  editingOriginalId.value = line.id
  isCreating.value = false
  draft.value = cloneLine(line)
  selectedDeviceId.value = line.devices[0]?.id ?? ''
}

function createLine() {
  const sequence = infrastructureStore.lines.length + 1
  const id = `LINE-${String(sequence).padStart(2, '0')}`
  isCreating.value = true
  selectedLineId.value = id
  editingOriginalId.value = ''
  selectedDeviceId.value = ''
  draft.value = {
    id,
    name: '新建线路',
    type: 'land',
    lengthKm: '',
    description: '',
    state: 'draft',
    updatedAt: '尚未保存',
    devices: [],
  }
}

function cancelChanges() {
  const original = infrastructureStore.lines.find((line) => line.id === editingOriginalId.value)
  if (original) loadLine(original)
  else loadLine(infrastructureStore.lines[0]!)
}

async function saveChanges() {
  if (!isComplete.value || isSaving.value) return
  isSaving.value = true
  saveError.value = ''
  draft.value.state = draft.value.state === 'draft' ? 'enabled' : draft.value.state
  try {
    await infrastructureStore.saveLine(draft.value, editingOriginalId.value || undefined)
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
  draft.value.devices.push({ ...JSON.parse(JSON.stringify(device)), sequence: draft.value.devices.length + 1 })
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

function updateDevice(device: BoundLineDevice) {
  const index = draft.value.devices.findIndex((item) => item.id === device.id)
  if (index >= 0) draft.value.devices.splice(index, 1, device)
}

watch(
  () => draft.value.devices,
  (devices) => {
    if (devices.length && !devices.some((device) => device.id === selectedDeviceId.value)) {
      selectedDeviceId.value = devices[0]!.id
    }
  },
  { deep: true },
)
</script>

<template>
  <section class="line-management-page" aria-label="线路管理">
    <header class="line-management-toolbar">
      <div>
        <strong>线路档案配置</strong>
        <span>统一维护线路、地图路径及定位设备顺序</span>
      </div>
      <div class="line-management-toolbar-actions">
        <button type="button"><svg><use href="#icon-download" /></svg>批量导入</button>
        <button type="button" class="is-primary" @click="createLine">
          <span>＋</span>新增线路
        </button>
      </div>
    </header>

    <div class="line-management-layout">
      <LineListPanel
        :lines="displayedLines"
        :selected-line-id="selectedLineId"
        @select="loadLine"
      />

      <LineDetailPanel
        v-model="draft"
        :selected-device-id="selectedDeviceId"
        @select-device="selectedDeviceId = $event"
        @update-device="updateDevice"
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

    <footer class="line-management-actionbar">
      <div class="line-management-validation" :class="{ 'is-incomplete': !isComplete }">
        <i></i>
        <span>
          {{
            saveError || (isComplete
              ? '线路信息完整，可以保存并用于实时监测'
              : '配置尚未完整，请补充必填项并绑定至少两个定位设备')
          }}
        </span>
      </div>
      <div>
        <button type="button" @click="cancelChanges">取消修改</button>
        <button type="button" class="is-primary" :disabled="!isComplete || isSaving" @click="saveChanges">
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
