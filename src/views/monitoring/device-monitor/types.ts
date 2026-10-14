import type { ManagedDeviceCategory } from '../../../domain/infrastructure/types'

export type DeviceMonitorFilter = 'all' | ManagedDeviceCategory
export type DeviceDetailTab = 'events' | 'config'

export interface DeviceMonitorEvent {
  id: string
  level: 'normal' | 'info' | 'warning'
  title: string
  description: string
  time: string
}

export interface DeviceMonitorRuntime {
  deviceId: string
  frameId: string
  phase: string
  pointCount: number
  min: number
  max: number
  peakAbs: number
  integrityPercent: number
  signalQuality: number
  latencyHistory: number[]
  events: DeviceMonitorEvent[]
}
