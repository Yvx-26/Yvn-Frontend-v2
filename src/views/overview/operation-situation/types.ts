export interface OperationMetric {
  id: string
  label: string
  value: string
  suffix: string
  icon: string
  tone: 'primary' | 'success'
}

export interface TrendPoint {
  label: string
  value: number
}

export interface LineVolume {
  id: string
  name: string
  value: number
}

export interface OperationRecord {
  id: string
  title: string
  detail: string
  time: string
  level: 'normal' | 'warning'
}

export interface OperationSummaryItem {
  id: string
  label: string
  value: string
  warning?: boolean
}
