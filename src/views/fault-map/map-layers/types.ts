import type { CableLineStatus } from '../../../domain/map/types'

export type BaseMapType = 'standard' | 'dark' | 'satellite'
export type MapLayerKey = 'lines' | 'devices' | 'faults' | 'warningAreas' | 'boundary' | 'labels'

export type LayerVisibility = Record<MapLayerKey, boolean>
export type StatusVisibility = Record<CableLineStatus, boolean>

export interface LayerItem {
  id: MapLayerKey
  label: string
  icon: string
}

export interface BaseMapOption {
  id: BaseMapType
  label: string
}
