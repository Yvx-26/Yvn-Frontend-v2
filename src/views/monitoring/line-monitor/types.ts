import type { ManagedLine } from '../../../domain/infrastructure/types'
import type { CableLineState } from '../../../domain/map/types'

export interface LineMonitorLineView extends CableLineState {
  line: ManagedLine
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
