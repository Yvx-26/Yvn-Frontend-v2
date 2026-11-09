import type { ManagedDevice, ManagedLine } from '../infrastructure/types'
import { deviceStateLabels, hasCoordinate } from '../infrastructure/helpers'
import type { CableLine, CableLineState, CableLineStatus } from './types'

export const cableLineStyles = {
  normal: { label: '运行正常', color: '#22c55e', dashed: false },
  warning: { label: '通信预警', color: '#f5a623', dashed: false },
  draft: { label: '待接入', color: '#9aabb9', dashed: true },
  fault: { label: '电缆故障', color: '#ff5268', dashed: false },
} satisfies Record<CableLineStatus, { label: string; color: string; dashed: boolean }>

export const activeCableStatuses = ['normal', 'warning', 'draft'] as const
export const cableSelectionOutline = '#dcebf3'

export function resolveCableLineState(line: ManagedLine, inventory: ManagedDevice[]): CableLineState {
  const byId = new Map<string, ManagedDevice>(line.devices.map((device) => [device.id, device]))
  for (const device of inventory) {
    if (device.lineId === line.id) byId.set(device.id, device)
  }
  const monitors = [...byId.values()].filter(
    (device) => device.enabled && device.category !== 'locator',
  )
  const reported = (device: ManagedDevice) =>
    device.state !== 'offline' || !['', '暂无上报', '--'].includes(device.lastSeen?.trim() ?? '')
  const pending = (statusDetail: string): CableLineState => ({
    status: 'draft', statusLabel: cableLineStyles.draft.label, statusDetail,
  })

  if (line.state === 'draft') return pending('线路尚未完成配置')
  if (line.state === 'verification') return pending('线路待校验')
  if (!monitors.length) return pending('没有已启用的监测设备')
  const issues = monitors.filter((device) => reported(device) && device.state !== 'online')
  if (issues.length) {
    return {
      status: 'warning',
      statusLabel: cableLineStyles.warning.label,
      statusDetail: issues.map((device) => `${device.id} ${deviceStateLabels[device.state]}`).join('、'),
    }
  }
  if (monitors.some((device) => !reported(device))) return pending('有监测设备尚无上报')
  return { status: 'normal', statusLabel: cableLineStyles.normal.label, statusDetail: '已启用的监测设备均在线' }
}

export function toCableLines(lines: ManagedLine[], inventory: ManagedDevice[] = []): CableLine[] {
  return lines
    .map((line): CableLine => {
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
      return {
        id: line.id,
        name: line.name,
        length: line.lengthM ? `${line.lengthM} m` : '--',
        ...resolveCableLineState(line, inventory),
        devices,
      }
    })
    .filter((line) => line.devices.length > 0)
}
