export type InfrastructureCoordinate = [number, number]
export type ManagedLineType = 'submarine' | 'land' | 'hybrid'
export type ManagedLineState = 'enabled' | 'verification' | 'draft'
export type ManagedDeviceState = 'online' | 'warning' | 'offline'
export type ManagedDeviceCategory = 'monitor' | 'locator' | 'integrated'
export type ManagedDeviceProtocol = 'MQTT' | 'TCP' | 'HTTP'

export interface DeviceNetworkConfig {
  accessMode: 'ethernet' | 'cellular' | 'fiber'
  protocol: ManagedDeviceProtocol
  ipAddress: string
  serverPort: string
  uploadTopic: string
  heartbeatSeconds: string
  retrySeconds: string
  timeoutSeconds: string
  offlineThresholdSeconds: string
}

export interface DeviceAcquisitionConfig {
  batchSize: number
  uploadMode: 'complete-batch' | 'sequential'
  batchTimeoutSeconds: string
  missingDataPolicy: 'mark-and-upload' | 'wait-for-completion'
  sampleRate: string
  triggerThreshold: string
  offlineCacheBatches: string
  backfillEnabled: boolean
}

export interface ManagedDevice {
  id: string
  name: string
  category: ManagedDeviceCategory
  lineId: string
  position: string
  coordinate: InfrastructureCoordinate
  linkedLocatorId: string
  state: ManagedDeviceState
  enabled: boolean
  lastSeen: string
  latencyMs: number | null
  signalDbm: number | null
  firmwareVersion: string
  updatedAt: string
  network: DeviceNetworkConfig
  acquisition: DeviceAcquisitionConfig | null
}

export interface BoundLineDevice extends ManagedDevice {
  sequence: number
}

export type DeviceConfiguration = Omit<
  ManagedDevice,
  'state' | 'lastSeen' | 'latencyMs' | 'signalDbm' | 'updatedAt'
>

export interface ManagedLine {
  id: string
  name: string
  type: ManagedLineType
  lengthM: string
  description: string
  state: ManagedLineState
  updatedAt: string
  devices: BoundLineDevice[]
}
