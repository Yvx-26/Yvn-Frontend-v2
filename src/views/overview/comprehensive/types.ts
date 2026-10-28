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

export interface MonitoringFrame {
  id: string
  deviceId: string
  samples: number[]
  min: number
  max: number
  error: string
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
