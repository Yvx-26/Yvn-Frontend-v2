export type MetricTone = 'primary' | 'success' | 'warning'

export interface OverviewMetric {
  id: string
  label: string
  value: string
  suffix: string
  icon: string
  tone: MetricTone
  note: string
}

export interface LineNode {
  id: string
  name: string
  position: string
  status: 'normal' | 'warning'
  top: string
  left: string
}

export interface MonitoringFrame {
  id: string
  deviceName: string
  receivedAt: string
  phase: string
  pointCount: number
  min: number
  max: number
  peakAbs: number
  completeness: number
}

export interface MonitoredDevice {
  id: string
  name: string
  area: string
  status: 'online' | 'offline'
  latency: string
}

export interface OverviewAlarm {
  id: string
  title: string
  location: string
  time: string
  level: 'critical' | 'warning'
}
