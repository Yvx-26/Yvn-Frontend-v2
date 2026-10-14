export type WaveSourceFilter = 'all' | 'warning'

export interface WaveMonitorEvent {
  id: string
  level: 'normal' | 'info' | 'warning'
  title: string
  description: string
  time: string
}

export interface InterphaseFaultResult {
  type: string
  code: number
  distance_m: number | null
  distance_raw: number
}

export interface WaveMonitorRuntime {
  deviceId: string
  batchId: string
  receiveTime: string
  frameId: number | null
  createdAt: string | null
  phase: string | null
  faultType: string | null
  faultDistanceM: number | null
  interphaseResults: Record<string, InterphaseFaultResult>
  waveformSamples: number[]
  events: WaveMonitorEvent[]
}
