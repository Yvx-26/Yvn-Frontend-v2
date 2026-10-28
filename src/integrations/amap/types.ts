export type Coordinate = [number, number]

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
  Map: new (container: HTMLElement, options: Record<string, unknown>) => AMapMapInstance
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
    _AMapSecurityConfig?: { securityJsCode?: string }
  }
}
