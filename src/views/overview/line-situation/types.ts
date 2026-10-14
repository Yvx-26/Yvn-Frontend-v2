export type LineStatus = 'normal' | 'warning' | 'fault'
export type LineNodeStatus = 'normal' | 'warning' | 'fault' | 'offline'

export interface LineMetric {
  id: string
  label: string
  value: string
  suffix: string
  icon: string
  tone: 'primary' | 'success' | 'warning' | 'danger'
}

export interface SituationLineNode {
  id: string
  deviceId: string
  status: LineNodeStatus
  statusLabel: string
  batchProgress: string
  lastUpload: string
  left: string
}

export interface LineEvent {
  id: string
  title: string
  detail: string
  time: string
  level: 'normal' | 'warning' | 'danger'
}

export interface SituationLine {
  id: string
  code: string
  name: string
  status: LineStatus
  statusLabel: string
  type: string
  length: string
  health: number
  lastUpdate: string
  notice: string
  nodes: SituationLineNode[]
  events: LineEvent[]
}
