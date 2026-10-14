export type Coordinate = [number, number]
export type DeviceMapStatus = 'online' | 'warning' | 'offline'
export type CableLineStatus = 'normal' | 'warning' | 'fault'

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

export interface CableLine {
  id: string
  name: string
  length: string
  status: CableLineStatus
  statusLabel: string
  color: string
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

export interface AMapOverlay {
  on(eventName: string, handler: () => void): void
  setOptions(options: Record<string, unknown>): void
  hide(): void
  show(): void
}

export interface AMapMapInstance {
  add(overlays: AMapOverlay | AMapOverlay[]): void
  destroy(): void
  remove(overlays: AMapOverlay | AMapOverlay[]): void
  setFeatures(features: string[]): void
  setFitView(overlays?: AMapOverlay[], immediately?: boolean, avoid?: number[]): void
  setMapStyle(style: string): void
  setZoomAndCenter(zoom: number, center: Coordinate): void
  zoomIn(): void
  zoomOut(): void
}

export interface AMapNamespace {
  Map: new (
    container: HTMLElement,
    options: Record<string, unknown>,
  ) => AMapMapInstance
  Circle: new (options: Record<string, unknown>) => AMapOverlay
  Polyline: new (options: Record<string, unknown>) => AMapOverlay
  Marker: new (options: Record<string, unknown>) => AMapOverlay
  Pixel: new (x: number, y: number) => unknown
  TileLayer: {
    Satellite: new (options?: Record<string, unknown>) => AMapOverlay
    RoadNet: new (options?: Record<string, unknown>) => AMapOverlay
  }
}

declare global {
  interface Window {
    AMap?: AMapNamespace
    __initializeCableFaultMap?: () => void
    _AMapSecurityConfig?: {
      securityJsCode?: string
    }
  }
}
