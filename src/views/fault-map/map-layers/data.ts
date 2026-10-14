import type { BaseMapOption, LayerItem } from './types'

export const baseMapOptions: BaseMapOption[] = [
  { id: 'standard', label: '标准' },
  { id: 'dark', label: '深色' },
  { id: 'satellite', label: '卫星' },
]

export const layerItems: LayerItem[] = [
  { id: 'lines', label: '电缆线路', icon: 'route' },
  { id: 'devices', label: '定位设备', icon: 'device-monitor' },
  { id: 'faults', label: '故障点', icon: 'lightning' },
  { id: 'warningAreas', label: '告警区域', icon: 'siren' },
  { id: 'boundary', label: '行政边界', icon: 'map-points' },
  { id: 'labels', label: '地名标注', icon: 'map-points' },
]
