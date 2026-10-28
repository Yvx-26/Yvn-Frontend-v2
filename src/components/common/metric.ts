export interface Metric {
  id: string
  label: string
  value: string
  suffix: string
  icon: string
  tone: 'primary' | 'success' | 'warning' | 'danger'
}
