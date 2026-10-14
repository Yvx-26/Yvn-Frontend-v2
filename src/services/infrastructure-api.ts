import type { ManagedDevice, ManagedLine } from '../domain/infrastructure/types'
import { apiRequest } from './http'

interface InfrastructureSnapshot {
  devices: ManagedDevice[]
  lines: ManagedLine[]
}

export function fetchInfrastructure() {
  return apiRequest<InfrastructureSnapshot>('/api/infrastructure')
}

export function putDevice(device: ManagedDevice, previousId?: string) {
  const pathId = encodeURIComponent(previousId || device.id)
  return apiRequest<ManagedDevice>(`/api/infrastructure/devices/${pathId}`, {
    method: 'PUT',
    body: JSON.stringify(device),
  })
}

export function putLine(line: ManagedLine, previousId?: string) {
  const pathId = encodeURIComponent(previousId || line.id)
  return apiRequest<ManagedLine>(`/api/infrastructure/lines/${pathId}`, {
    method: 'PUT',
    body: JSON.stringify(line),
  })
}
