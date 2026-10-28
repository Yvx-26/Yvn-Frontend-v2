import type { ManagedDevice } from '../../../domain/infrastructure/types'
import type { DeviceMonitorRuntime } from './types'

function signalQuality(device: ManagedDevice) {
  if (device.signalDbm == null) return null
  return Math.max(0, Math.min(100, Math.round(((device.signalDbm + 100) / 60) * 100)))
}

export function createDeviceMonitorRuntimes(devices: ManagedDevice[]) {
  return Object.fromEntries(
    devices.map((device) => {
      const runtime: DeviceMonitorRuntime = {
        frameId: '--',
        phase: '--',
        pointCount: 0,
        min: 0,
        max: 0,
        peakAbs: 0,
        integrityPercent: 0,
        frameValid: null,
        frameError: '',
        signalQuality: signalQuality(device),
        latencyHistory: [],
        events: [],
      }
      return [device.id, runtime]
    }),
  ) as Record<string, DeviceMonitorRuntime>
}
