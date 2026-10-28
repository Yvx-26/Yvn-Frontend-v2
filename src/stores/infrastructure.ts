import { ref, shallowRef } from 'vue'
import { acceptHMRUpdate, defineStore } from 'pinia'
import type { ManagedDevice, ManagedLine } from '../domain/infrastructure/types'
import { cloneDevice, cloneLine, formatAge, hasCoordinate } from '../domain/infrastructure/helpers'
import { fetchInfrastructure, putDevice, putLine } from '../services/infrastructure-api'
import {
  fetchDashboardDevices,
  fetchDashboardMap,
  type DashboardDevice,
  type DashboardMapPoint,
} from '../services/telemetry-api'
import { backendConnected } from '../services/connection'
import { isRequestCancelled } from '../services/http'

interface Activity {
  at: string | null
  age: number | null
  online: boolean
  checkedAt: number
}

export const useInfrastructureStore = defineStore('infrastructure', () => {
  const lines = ref<ManagedLine[]>([])
  const devices = ref<ManagedDevice[]>([])
  const loading = ref(false)
  const initialized = ref(false)
  const saving = ref(false)
  const errorMessage = ref('')
  const runtimeDevices = shallowRef<DashboardDevice[]>([])
  const locationPoints = shallowRef<DashboardMapPoint[]>([])
  const waveActivity = new Map<string, Activity>()
  const locationActivity = new Map<string, Activity>()
  let initializePromise: Promise<void> | undefined
  let inventoryAt = 0
  let inventoryRevision = 0

  function syncLineDevices() {
    const byId = new Map(devices.value.map((device) => [device.id, device]))
    lines.value.forEach((line) => {
      line.devices = line.devices
        .filter((item) => byId.has(item.id) && byId.get(item.id)?.lineId === line.id)
        .map((item) => ({ ...cloneDevice(byId.get(item.id)!), sequence: item.sequence }))
    })
  }

  function repairLocatorLinks() {
    const byId = new Map(devices.value.map((device) => [device.id, device]))
    devices.value.forEach((device) => {
      if (!device.linkedLocatorId) return
      const target = byId.get(device.linkedLocatorId)
      if (
        !target ||
        target.id === device.id ||
        target.category === 'monitor' ||
        !device.lineId ||
        target.lineId !== device.lineId
      )
        device.linkedLocatorId = ''
    })
  }

  function activity(device: ManagedDevice) {
    const sources =
      device.category === 'locator'
        ? [locationActivity.get(device.id)]
        : device.category === 'monitor'
          ? [waveActivity.get(device.id)]
          : [waveActivity.get(device.id), locationActivity.get(device.id)]
    const now = Date.now()
    return sources
      .filter((item): item is Activity => Boolean(item))
      .map((item) => ({
        ...item,
        age: item.age == null ? null : item.age + (now - item.checkedAt) / 1000,
      }))
      .sort((a, b) => (a.age ?? Infinity) - (b.age ?? Infinity))[0]
  }

  function applyActivity() {
    devices.value.forEach((device) => {
      const current = activity(device)
      if (!current) return
      device.state =
        current.online && (current.age == null || current.age <= 90) ? 'online' : 'offline'
      device.lastSeen = formatAge(current.age, current.at ?? '暂无上报')
    })
    syncLineDevices()
  }

  function lastActivityAt(deviceId: string) {
    const device = devices.value.find((item) => item.id === deviceId)
    return device ? (activity(device)?.at ?? '') : ''
  }

  function applyRuntimeStatus(items: DashboardDevice[]) {
    runtimeDevices.value = items
    items.forEach((item) =>
      waveActivity.set(item.imei, {
        at: item.last_wave_time,
        age: item.age_seconds ?? null,
        online: item.online,
        checkedAt: Date.now(),
      }),
    )
    applyActivity()
  }

  function applyLocationStatus(items: DashboardMapPoint[]) {
    locationPoints.value = items
    const byId = new Map(devices.value.map((device) => [device.id, device]))
    items.forEach((item) => {
      locationActivity.set(item.imei, {
        at: item.updated_at,
        age: item.age_seconds,
        online: item.online,
        checkedAt: Date.now(),
      })
      const device = byId.get(item.imei)
      if (device && hasCoordinate([item.lng, item.lat])) device.coordinate = [item.lng, item.lat]
    })
    applyActivity()
  }

  async function initialize(signal?: AbortSignal) {
    if (initializePromise) return initializePromise
    const revision = ++inventoryRevision
    loading.value = true
    initializePromise = (async () => {
      try {
        const snapshot = await fetchInfrastructure(signal)
        signal?.throwIfAborted()
        if (revision !== inventoryRevision) return
        devices.value = snapshot.devices.map(cloneDevice)
        lines.value = snapshot.lines.map(cloneLine)
        applyLocationStatus(locationPoints.value)
        applyActivity()
        initialized.value = true
        inventoryAt = Date.now()
        errorMessage.value = ''
      } catch (error) {
        if (!isRequestCancelled(error))
          errorMessage.value = error instanceof Error ? error.message : '基础资料加载失败'
        throw error
      } finally {
        loading.value = false
        initializePromise = undefined
      }
    })()
    return initializePromise
  }

  async function refreshRuntime(signal: AbortSignal) {
    if (!initialized.value || (!saving.value && Date.now() - inventoryAt >= 30000))
      await initialize(signal)
    const results = await Promise.allSettled([
      fetchDashboardDevices(signal),
      fetchDashboardMap(signal),
    ])
    signal.throwIfAborted()
    if (results[0].status === 'fulfilled') applyRuntimeStatus(results[0].value)
    if (results[1].status === 'fulfilled') applyLocationStatus(results[1].value)
    const failure = results.find((result) => result.status === 'rejected')
    if (failure?.status === 'rejected') throw failure.reason
  }

  async function reloadAfterSave() {
    try {
      // A pre-save read may still be settling; its revision is invalidated by the save.
      if (initializePromise) await initializePromise.catch(() => undefined)
      await initialize()
    } catch {
      /* The successful write remains applied locally; retry inventory on the next poll. */
    }
  }

  async function saveLine(line: ManagedLine, previousId?: string) {
    if (lines.value.some((item) => item.id === line.id && item.id !== previousId))
      throw new Error('线路编号已存在')
    saving.value = true
    inventoryRevision += 1
    try {
      const saved = cloneLine(await putLine(cloneLine(line), previousId))
      const targetId = previousId ?? line.id
      const old = lines.value.find((item) => item.id === targetId)
      const retained = new Set(saved.devices.map((item) => item.id))
      old?.devices.forEach((item) => {
        if (!retained.has(item.id)) {
          const device = devices.value.find((device) => device.id === item.id)
          if (device?.lineId === targetId) device.lineId = ''
        }
      })
      const index = lines.value.findIndex((item) => item.id === targetId)
      if (index >= 0) lines.value.splice(index, 1, saved)
      else lines.value.push(saved)
      devices.value.forEach((device) => {
        if (device.lineId === targetId) device.lineId = saved.id
      })
      saved.devices.forEach((item) => {
        const device = { ...cloneDevice(item), lineId: saved.id }
        const deviceIndex = devices.value.findIndex((current) => current.id === device.id)
        if (deviceIndex >= 0) devices.value.splice(deviceIndex, 1, device)
        else devices.value.push(device)
      })
      repairLocatorLinks()
      syncLineDevices()
      await reloadAfterSave()
    } finally {
      saving.value = false
    }
  }

  async function saveDevice(device: ManagedDevice, previousId?: string) {
    if (devices.value.some((item) => item.id === device.id && item.id !== previousId))
      throw new Error('设备编号已存在')
    saving.value = true
    inventoryRevision += 1
    try {
      const saved = cloneDevice(await putDevice(cloneDevice(device), previousId))
      const targetId = previousId ?? device.id
      const index = devices.value.findIndex((item) => item.id === targetId)
      if (index >= 0) devices.value.splice(index, 1, saved)
      else devices.value.push(saved)
      devices.value.forEach((item) => {
        if (item.linkedLocatorId === targetId) item.linkedLocatorId = saved.id
      })
      lines.value.forEach((line) => {
        line.devices = line.devices
          .filter((item) => item.id !== targetId || saved.lineId === line.id)
          .map((item) => (item.id === targetId ? { ...saved, sequence: item.sequence } : item))
        if (
          saved.category !== 'monitor' &&
          line.id === saved.lineId &&
          !line.devices.some((item) => item.id === saved.id)
        ) {
          line.devices.push({
            ...saved,
            sequence: Math.max(0, ...line.devices.map((item) => item.sequence)) + 1,
          })
        }
      })
      repairLocatorLinks()
      syncLineDevices()
      await reloadAfterSave()
    } finally {
      saving.value = false
    }
  }

  return {
    devices,
    lines,
    loading,
    initialized,
    saving,
    backendConnected,
    errorMessage,
    runtimeDevices,
    locationPoints,
    initialize,
    refreshRuntime,
    applyRuntimeStatus,
    applyLocationStatus,
    lastActivityAt,
    saveDevice,
    saveLine,
  }
})

if (import.meta.hot)
  import.meta.hot.accept(acceptHMRUpdate(useInfrastructureStore, import.meta.hot))
