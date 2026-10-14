export type DeviceStatus = 'online' | 'receiving' | 'warning' | 'offline'

export interface DeviceMetric {
  id: string
  label: string
  value: string
  suffix: string
  icon: string
  tone: 'primary' | 'success' | 'warning'
}

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
