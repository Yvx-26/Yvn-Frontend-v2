import type { DeviceConfiguration, ManagedDevice, ManagedLine } from './types'

export function deviceConfiguration(device: ManagedDevice): DeviceConfiguration {
  const value = cloneDevice(device)
  return {
    id: value.id,
    name: value.name,
    category: value.category,
    lineId: value.lineId,
    position: value.position,
    coordinate: value.coordinate,
    linkedLocatorId: value.linkedLocatorId,
    enabled: value.enabled,
    firmwareVersion: value.firmwareVersion,
    network: value.network,
    acquisition: value.acquisition,
  }
}

export function cloneDevice(device: ManagedDevice): ManagedDevice {
  // Pick the API fields explicitly: BoundLineDevice.sequence must never enter a device PUT.
  return JSON.parse(
    JSON.stringify({
      id: device.id,
      name: device.name,
      category: device.category,
      lineId: device.lineId,
      position: device.position,
      coordinate: device.coordinate,
      linkedLocatorId: device.linkedLocatorId,
      state: device.state,
      enabled: device.enabled,
      lastSeen: device.lastSeen,
      latencyMs: device.latencyMs,
      signalDbm: device.signalDbm,
      firmwareVersion: device.firmwareVersion,
      updatedAt: device.updatedAt,
      network: {
        ...device.network,
        serverPort: String(device.network.serverPort),
        heartbeatSeconds: String(device.network.heartbeatSeconds),
        retrySeconds: String(device.network.retrySeconds),
        timeoutSeconds: String(device.network.timeoutSeconds),
        offlineThresholdSeconds: String(device.network.offlineThresholdSeconds),
      },
      acquisition: device.acquisition
        ? {
            ...device.acquisition,
            batchTimeoutSeconds: String(device.acquisition.batchTimeoutSeconds),
            offlineCacheBatches: String(device.acquisition.offlineCacheBatches),
          }
        : null,
    }),
  ) as ManagedDevice
}

export function cloneLine(line: ManagedLine): ManagedLine {
  return {
    ...line,
    devices: line.devices.map((device) => ({ ...cloneDevice(device), sequence: device.sequence })),
  }
}

export function nextAvailableId(prefix: string, ids: string[]) {
  const existing = new Set(ids)
  let index = 1
  while (existing.has(`${prefix}-${String(index).padStart(2, '0')}`)) index += 1
  return `${prefix}-${String(index).padStart(2, '0')}`
}

export function createDeviceDraft(id = '', lineId = ''): ManagedDevice {
  return {
    id,
    name: '',
    category: 'locator',
    lineId,
    position: '',
    coordinate: [0, 0],
    linkedLocatorId: '',
    state: 'offline',
    enabled: true,
    lastSeen: '暂无上报',
    latencyMs: null,
    signalDbm: null,
    firmwareVersion: '',
    updatedAt: '',
    network: {
      accessMode: 'ethernet',
      protocol: 'MQTT',
      ipAddress: '',
      serverPort: '1883',
      uploadTopic: '',
      heartbeatSeconds: '30',
      retrySeconds: '5',
      timeoutSeconds: '10',
      offlineThresholdSeconds: '90',
    },
    acquisition: null,
  }
}

export function createLineDraft(id = ''): ManagedLine {
  return {
    id,
    name: '',
    type: 'land',
    lengthM: '',
    description: '',
    state: 'draft',
    updatedAt: '',
    devices: [],
  }
}

export function createAcquisitionConfig(): NonNullable<ManagedDevice['acquisition']> {
  return {
    batchSize: 4000,
    uploadMode: 'complete-batch',
    batchTimeoutSeconds: '30',
    missingDataPolicy: 'mark-and-upload',
    sampleRate: '',
    triggerThreshold: '',
    offlineCacheBatches: '200',
    backfillEnabled: true,
  }
}

export function linkedMonitorText(device: ManagedDevice, devices: ManagedDevice[]) {
  if (device.category === 'monitor') return `关联定位设备 ${device.linkedLocatorId || '--'}`
  if (device.category === 'integrated') return '监测与定位功能一体化'
  const monitors = devices.filter(
    (item) => item.category === 'monitor' && item.linkedLocatorId === device.id,
  )
  return `关联监测设备 ${monitors.map((item) => item.id).join('、') || '未关联'}`
}

export const deviceStateLabels = { online: '在线', warning: '数据异常', offline: '离线' } as const
export const lineColors = ['#00d8ff', '#3c8cff', '#f5a623', '#8c7bff']

export function hasCoordinate(coordinate: [number, number]) {
  const [lng, lat] = coordinate
  return (
    Number.isFinite(lng) &&
    Number.isFinite(lat) &&
    Math.abs(lng) <= 180 &&
    Math.abs(lat) <= 90 &&
    (lng !== 0 || lat !== 0)
  )
}

export function formatAge(seconds: number | null | undefined, fallback = '暂无上报') {
  if (seconds == null || !Number.isFinite(seconds)) return fallback
  if (seconds < 5) return '刚刚'
  if (seconds < 60) return `${Math.floor(seconds)} 秒前`
  if (seconds < 3600) return `${Math.floor(seconds / 60)} 分钟前`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} 小时前`
  return `${Math.floor(seconds / 86400)} 天前`
}
