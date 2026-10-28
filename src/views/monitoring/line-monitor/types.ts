import type { ManagedLine } from '../../../domain/infrastructure/types'

export type LineRuntimeStatus = 'normal' | 'warning' | 'draft'

export interface LineMonitorLineView {
  line: ManagedLine
  status: LineRuntimeStatus
  statusText: string
  onlineCount: number
}

export interface LineBatchRuntime {
  frameError?: string
  lineId: string
  monitorDeviceId: string
  frameId: string
  phase: string
  pointCount: number
  min: number
  max: number
  peakAbs: number
  completeness: number
  primaryEvent: string
  secondaryEvent: string
}
