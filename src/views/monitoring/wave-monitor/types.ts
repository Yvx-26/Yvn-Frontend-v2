import type { InterphaseFaultResult, PhaseLatestState } from '../../../services/telemetry-api'

export type WaveSourceFilter = 'all' | 'warning'

export interface WaveMonitorEvent {
  id: string
  level: 'normal' | 'info' | 'warning'
  title: string
  description: string
  time: string
}

export interface WaveMonitorRuntime {
  batchId: string
  receiveTime: string
  frameId: number | null
  frameValid: boolean | null
  frameError: string
  phase: string | null
  faultType: string | null
  faultDistanceM: number | null
  interphaseResults: Record<string, InterphaseFaultResult>
  phaseStates: Record<string, PhaseLatestState>
  waveformSamples: number[]
  events: WaveMonitorEvent[]
}
