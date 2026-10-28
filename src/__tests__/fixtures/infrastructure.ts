import { createDeviceDraft } from '../../domain/infrastructure/helpers'
import type { ManagedDevice, ManagedLine } from '../../domain/infrastructure/types'

export function device(id = 'M1', category: ManagedDevice['category'] = 'monitor'): ManagedDevice {
  return {
    ...createDeviceDraft(id, 'L1'),
    category,
    name: id,
    coordinate: [113.5, 34.8],
    enabled: true,
    linkedLocatorId: category === 'monitor' ? 'D1' : '',
  }
}
export function line(id = 'L1', devices: ManagedDevice[] = []): ManagedLine {
  return {
    id,
    name: id,
    type: 'land',
    state: devices.length ? 'enabled' : 'draft',
    lengthKm: '1',
    updatedAt: '',
    description: '',
    devices: devices.map((item, index) => ({ ...item, sequence: index + 1 })),
  }
}
