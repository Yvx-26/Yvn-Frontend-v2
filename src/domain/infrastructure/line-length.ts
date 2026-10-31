import type { BoundLineDevice } from './types'
import { hasCoordinate } from './helpers'

// 与后端使用相同的球面距离公式；不跳过缺失坐标，以免错误连接两侧节点。
export function routeLengthMetres(
  devices: Pick<BoundLineDevice, 'coordinate' | 'sequence'>[],
): string {
  const ordered = devices.slice().sort((a, b) => a.sequence - b.sequence)
  if (ordered.length < 2) return '0.000'
  if (ordered.some((device) => !hasCoordinate(device.coordinate))) return ''
  let total = 0
  const radians = (degrees: number) => (degrees * Math.PI) / 180
  for (let index = 1; index < ordered.length; index += 1) {
    const [lng1, lat1] = ordered[index - 1]!.coordinate.map(radians)
    const [lng2, lat2] = ordered[index]!.coordinate.map(radians)
    const a =
      Math.sin((lat2! - lat1!) / 2) ** 2 +
      Math.cos(lat1!) * Math.cos(lat2!) * Math.sin((lng2! - lng1!) / 2) ** 2
    total += 2 * 6371008.8 * Math.asin(Math.sqrt(Math.min(1, Math.max(0, a))))
  }
  return total.toFixed(3)
}
