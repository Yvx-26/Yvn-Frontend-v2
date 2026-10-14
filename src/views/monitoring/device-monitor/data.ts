import type { ManagedDevice } from '../../../domain/infrastructure/types'
import type { DeviceMonitorRuntime } from './types'

function signalQuality(device: ManagedDevice) {
  if (device.signalDbm == null) return 0
  return Math.max(0, Math.min(100, Math.round(((device.signalDbm + 100) / 60) * 100)))
}

export function createDeviceMonitorRuntimes(devices: ManagedDevice[]) {
  return Object.fromEntries(
    devices.map((device) => {
      const runtime: DeviceMonitorRuntime = {
        deviceId: device.id,
        frameId: '--',
        phase: '--',
        pointCount: 0,
        min: 0,
        max: 0,
        peakAbs: 0,
        integrityPercent: 0,
        signalQuality: signalQuality(device),
        latencyHistory: [device.latencyMs ?? 0],
        events: [],
      }
      return [device.id, runtime]
    }),
  ) as Record<string, DeviceMonitorRuntime>
}
