export type DeviceStatus = 'online' | 'warning' | 'offline'

export interface DeviceFrame {
  id: string
  phase: string
  pointCount: number
  min: number
  max: number
  peakAbs: number
  completeness: number
}

export interface SituationDevice {
  id: string
  name: string
  line: string
  position: string
  status: DeviceStatus
  statusLabel: string
  latency: string
  lastUpload: string
  frame: DeviceFrame
  connectionRate: string
  qualityTrend: number[]
}
