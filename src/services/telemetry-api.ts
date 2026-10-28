import { apiRequest } from './http'

export interface DashboardSummary {
  device_total: number
  wave_today: number
  location_today: number
  alarm_count: number
}

export interface DashboardDevice {
  imei: string
  cable_key: string | null
  cable_name: string | null
  last_wave_time: string | null
  online: boolean
  age_seconds?: number | null
}

export interface DashboardMapPoint {
  imei: string
  lng: number
  lat: number
  ts: number | null
  updated_at: string | null
  cable_key: string | null
  cable_name: string | null
  online: boolean
  age_seconds: number | null
}

export interface WaveformFrame {
  frame_id: number | null
  imei: string
  cable?: string | null
  phase_pair?: string | null
  phase_pair_code?: number | null
  fault_type?: string | null
  fault_distance_m?: number | null
  interphase_results?: Record<string, InterphaseFaultResult>
  device_reported_cable_length_m?: number | null
  frame_valid?: boolean
  frame_error?: string | null
  created_at?: string | null
  points: number
  waveform_points: number
  min?: number
  max?: number
  samples: number[]
  waveform_samples: number[]
}

export interface InterphaseFaultResult {
  type: string
  code: number
  distance_m: number | null
  distance_raw: number
}

export interface OperationDashboard {
  wave_today: number
  average_interval_seconds: number
  online_devices: number
  device_total: number
  online_rate: number
  receive_trend: Array<{ label: string; value: number }>
  line_volumes: Array<{ id: string; name: string; value: number }>
  records: Array<{
    id: string
    imei: string
    phase: string | null
    created_at: string | null
  }>
}

export function fetchDashboardSummary(signal?: AbortSignal) {
  return apiRequest<DashboardSummary>('/api/dashboard/summary', { signal })
}

export function fetchDashboardDevices(signal?: AbortSignal) {
  return apiRequest<DashboardDevice[]>('/api/dashboard/devices', { signal })
}

export function fetchDashboardMap(signal?: AbortSignal) {
  return apiRequest<DashboardMapPoint[]>('/api/dashboard/map', { signal })
}

export function fetchLatestWaveform(imei: string, phasePair?: string | null, signal?: AbortSignal) {
  const query = new URLSearchParams({ imei })
  if (phasePair) query.set('phase_pair', phasePair)
  return apiRequest<WaveformFrame>(`/api/dashboard/wave/latest?${query.toString()}`, { signal })
}

export function fetchOperationDashboard(signal?: AbortSignal) {
  return apiRequest<OperationDashboard>('/api/dashboard/operation', { signal })
}
