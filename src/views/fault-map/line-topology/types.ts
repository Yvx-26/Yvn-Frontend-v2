import type { CableLineState, DeviceMapStatus } from '../../../domain/map/types'

export type TopologyFocusMode = string

export interface TopologyDevice {
  id: string
  name: string
  position: string
  sequence: number
  status: DeviceMapStatus
  statusLabel: string
  latency: string
  lastUpload: string
  linkedDeviceIds: string[]
  parentId?: string
}

export interface TopologyFaultSegment {
  fromDeviceId: string
  toDeviceId: string
  title: string
}

export interface TopologyLine extends CableLineState {
  id: string
  name: string
  length: string
  devices: TopologyDevice[]
  faultSegment?: TopologyFaultSegment
}

export interface TopologyNodeLayout {
  device: TopologyDevice
  line: TopologyLine
  x: number
  y: number
}
