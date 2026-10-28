import type { ManagedLine } from '../infrastructure/types'
import { deviceStateLabels, hasCoordinate, lineColors } from '../infrastructure/helpers'
import type { CableLine } from './types'

export function toCableLines(lines: ManagedLine[]): CableLine[] {
  return lines
    .map((line, index): CableLine => {
      const devices = line.devices
        .filter((device) => hasCoordinate(device.coordinate))
        .map((device) => ({
          id: device.id,
          name: device.name,
          sequence: device.sequence,
          coordinate: device.coordinate,
          status: device.state,
          statusLabel: deviceStateLabels[device.state],
          latency: device.latencyMs == null ? '--' : `${device.latencyMs} ms`,
          lastUpload: device.lastSeen,
        }))
      const warning = devices.some((device) => device.status !== 'online')
      return {
        id: line.id,
        name: line.name,
        length: line.lengthKm ? `${line.lengthKm} km` : '--',
        status: warning ? 'warning' : 'normal',
        statusLabel: warning ? '设备状态异常' : '运行正常',
        color: lineColors[index % lineColors.length]!,
        devices,
      }
    })
    .filter((line) => line.devices.length > 0)
}
