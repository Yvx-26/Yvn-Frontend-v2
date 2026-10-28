import type { ManagedDevice, ManagedLine } from '../domain/infrastructure/types'
import { apiRequest } from './http'
import { deviceConfiguration } from '../domain/infrastructure/helpers'

interface InfrastructureSnapshot {
  devices: ManagedDevice[]
  lines: ManagedLine[]
}

export function fetchInfrastructure(signal?: AbortSignal) {
  return apiRequest<InfrastructureSnapshot>('/api/infrastructure', { signal })
}

export function putDevice(device: ManagedDevice, previousId?: string) {
  const pathId = encodeURIComponent(previousId || device.id)
  return apiRequest<ManagedDevice>(`/api/infrastructure/devices/${pathId}`, {
    method: 'PUT',
    body: JSON.stringify(deviceConfiguration(device)),
  })
}

export function putLine(line: ManagedLine, previousId?: string) {
  const pathId = encodeURIComponent(previousId || line.id)
  return apiRequest<ManagedLine>(`/api/infrastructure/lines/${pathId}`, {
    method: 'PUT',
    body: JSON.stringify({
      ...line,
      devices: line.devices.map(({ id, sequence }) => ({ id, sequence })),
    }),
  })
}
