import type { ManagedDevice } from '../../../domain/infrastructure/types'
import type { WaveMonitorRuntime } from './types'

export function createWaveMonitorRuntimes(devices: ManagedDevice[]) {
  const monitorDevices = devices.filter((device) => device.category !== 'locator')

  return Object.fromEntries(
    monitorDevices.map((device) => {
      const runtime: WaveMonitorRuntime = {
        batchId: '等待真实波形',
        receiveTime: '--',
        frameId: null,
        frameValid: null,
        frameError: '',
        phase: null,
        faultType: null,
        faultDistanceM: null,
        interphaseResults: {},
        phaseStates: {},
        waveformSamples: [],
        events: [],
      }

      return [device.id, runtime]
    }),
  ) as Record<string, WaveMonitorRuntime>
}
