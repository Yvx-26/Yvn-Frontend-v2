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
  frameId: string
  phase: string
  pointCount: number
  min: number
  max: number
  peakAbs: number
  integrityPercent: number
  signalQuality: number | null
  frameValid: boolean | null
  frameError: string
  latencyHistory: number[]
  events: DeviceMonitorEvent[]
}
