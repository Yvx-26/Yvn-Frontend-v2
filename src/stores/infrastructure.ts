import { ref } from 'vue'
import { defineStore } from 'pinia'
import type { ManagedDevice, ManagedLine } from '../domain/infrastructure/types'
import { fetchInfrastructure, putDevice, putLine } from '../services/infrastructure-api'
import type { DashboardDevice } from '../services/telemetry-api'

function cloneLine(line: ManagedLine): ManagedLine {
  return JSON.parse(JSON.stringify(line)) as ManagedLine
}

function cloneDevice(device: ManagedDevice): ManagedDevice {
  return JSON.parse(JSON.stringify(device)) as ManagedDevice
}

export const useInfrastructureStore = defineStore('infrastructure', () => {
  const lines = ref<ManagedLine[]>([])
  const devices = ref<ManagedDevice[]>([])
  const loading = ref(false)
  const backendConnected = ref(false)
  const usingDemoData = ref(false)
  const errorMessage = ref('')
  let initializePromise: Promise<void> | undefined

  async function initialize() {
    if (initializePromise) return initializePromise
    initializePromise = (async () => {
      loading.value = true
      errorMessage.value = ''
      try {
        const snapshot = await fetchInfrastructure()
        backendConnected.value = true
        devices.value = snapshot.devices.map(cloneDevice)
        lines.value = snapshot.lines.map(cloneLine)
        usingDemoData.value = false
      } catch (error) {
        errorMessage.value = error instanceof Error ? error.message : '基础资料加载失败'
      } finally {
        loading.value = false
      }
    })()
    return initializePromise
  }

  async function saveLine(line: ManagedLine, previousId?: string) {
    const persistedLine = await putLine(line, previousId)
    const targetId = previousId ?? line.id
    const index = lines.value.findIndex((item) => item.id === targetId)
    const savedLine = cloneLine(persistedLine)
    if (index >= 0) lines.value.splice(index, 1, savedLine)
    else lines.value.push(savedLine)
    savedLine.devices.forEach((device) => {
      const deviceIndex = devices.value.findIndex((item) => item.id === device.id)
      const normalized = cloneDevice(device)
      if (deviceIndex >= 0) devices.value.splice(deviceIndex, 1, normalized)
      else devices.value.push(normalized)
    })
    backendConnected.value = true
    usingDemoData.value = false
  }

  async function saveDevice(device: ManagedDevice, previousId?: string) {
    const persistedDevice = await putDevice(device, previousId)
    const targetId = previousId ?? device.id
    const index = devices.value.findIndex((item) => item.id === targetId)
    const savedDevice = cloneDevice(persistedDevice)
    if (index >= 0) devices.value.splice(index, 1, savedDevice)
    else devices.value.push(savedDevice)

    lines.value.forEach((line) => {
      line.devices = line.devices.map((item) =>
        item.id === targetId ? { ...cloneDevice(savedDevice), sequence: item.sequence } : item,
      )
    })
    backendConnected.value = true
    usingDemoData.value = false
  }

  function applyRuntimeStatus(items: DashboardDevice[]) {
    const statusById = new Map(items.map((item) => [item.imei, item]))
    devices.value.forEach((device) => {
      const status = statusById.get(device.id)
      if (!status) return
      device.state = status.online ? (device.state === 'warning' ? 'warning' : 'online') : 'offline'
      if (status.age_seconds == null) device.lastSeen = status.last_wave_time ?? '暂无上报'
      else if (status.age_seconds < 5) device.lastSeen = '刚刚'
      else if (status.age_seconds < 60) device.lastSeen = `${status.age_seconds} 秒前`
      else device.lastSeen = `${Math.floor(status.age_seconds / 60)} 分钟前`
    })
  }

  return {
    devices,
    lines,
    loading,
    backendConnected,
    usingDemoData,
    errorMessage,
    initialize,
    applyRuntimeStatus,
    saveDevice,
    saveLine,
  }
})
