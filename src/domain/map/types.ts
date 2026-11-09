import type { InfrastructureCoordinate } from '../infrastructure/types'
export type Coordinate = InfrastructureCoordinate
export type DeviceMapStatus = 'online' | 'warning' | 'offline'
export type CableLineStatus = 'normal' | 'warning' | 'draft' | 'fault'

export interface CableLineState {
  status: CableLineStatus
  statusLabel: string
  statusDetail: string
}

export interface PositioningDevice {
  id: string
  name: string
  sequence: number
  coordinate: Coordinate
  status: DeviceMapStatus
  statusLabel: string
  latency: string
  lastUpload: string
}

export interface LocatedFault {
  id: string
  title: string
  level: 'critical' | 'warning'
  coordinate: Coordinate
  between: [string, string]
  distanceFromDevice: string
  occurredAt: string
  locationStatus: string
  confidence: string
}

export interface CableLine extends CableLineState {
  id: string
  name: string
  length: string
  devices: PositioningDevice[]
  fault?: LocatedFault
}

export type MapSelection =
  | {
      kind: 'fault'
      line: CableLine
      fault: LocatedFault
    }
  | {
      kind: 'device'
      line: CableLine
      device: PositioningDevice
    }
  | null
