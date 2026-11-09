import { cableLineStyles, cableSelectionOutline } from '../../domain/map/lines'
import type { CableLineStatus, Coordinate } from '../../domain/map/types'
import type { AMapMapInstance } from './types'

export function cableStroke(status: CableLineStatus, selected = false) {
  const { color, dashed } = cableLineStyles[status]
  return {
    strokeColor: color,
    strokeStyle: dashed ? 'dashed' : 'solid',
    strokeDasharray: [8, 6],
    strokeWeight: selected ? 7 : 5,
    isOutline: selected,
    outlineColor: cableSelectionOutline,
    borderWeight: 2,
    showDir: !dashed,
    zIndex: selected ? 45 : 40,
  }
}

export interface CableLabelRoute {
  path: Coordinate[]
  name: string
  statusLabel: string
}

type Point = { x: number; y: number }
type Box = { left: number; top: number; right: number; bottom: number }
type Segment = { start: Point; end: Point }

function intersects({ start, end }: Segment, box: Box) {
  let enter = 0
  let exit = 1
  for (const [origin, delta, min, max] of [
    [start.x, end.x - start.x, box.left, box.right],
    [start.y, end.y - start.y, box.top, box.bottom],
  ] as const) {
    if (delta === 0) {
      if (origin < min || origin > max) return false
      continue
    }
    const near = (min - origin) / delta
    const far = (max - origin) / delta
    enter = Math.max(enter, Math.min(near, far))
    exit = Math.min(exit, Math.max(near, far))
    if (enter > exit) return false
  }
  return true
}

function overlaps(a: Box, b: Box) {
  return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top
}

function padded(box: Box, gap: number): Box {
  return {
    left: box.left - gap,
    top: box.top - gap,
    right: box.right + gap,
    bottom: box.bottom + gap,
  }
}

function segments(points: Point[]): Segment[] {
  return points.slice(1).map((end, index) => ({ start: points[index]!, end }))
}

export function createCableLabelLayer(map: AMapMapInstance, container: HTMLElement) {
  const layer = document.createElement('div')
  layer.className = 'cable-map-label-layer'
  container.classList.add('cable-annotated-map')
  container.append(layer)
  let routes: CableLabelRoute[] = []
  let entries: { index: number; label: HTMLSpanElement }[] = []
  let frame = 0
  const events = [
    'complete',
    'mapmove',
    'moveend',
    'zoomchange',
    'zoomend',
    'rotatechange',
    'resize',
  ]

  function layout() {
    frame = 0
    if (!entries.length) return
    if (layer.parentElement !== container) container.append(layer)
    const viewport = {
      left: 0,
      top: 0,
      right: container.clientWidth,
      bottom: container.clientHeight,
    }
    const paths = routes.map(({ path }) => path.map((point) => map.lngLatToContainer(point)))
    const obstacles = paths.flatMap(segments).filter((segment) => intersects(segment, viewport))
    const occupied = paths
      .flat()
      .map(({ x, y }) => ({ left: x - 16, top: y - 16, right: x + 16, bottom: y + 16 }))
      .filter((box) => overlaps(box, viewport))
    entries.forEach(({ index, label }) => {
      const width = label.offsetWidth
      const height = label.offsetHeight
      const candidates = segments(paths[index]!)
        .filter((segment) => intersects(segment, viewport))
        .sort(
          (a, b) =>
            Math.hypot(b.end.x - b.start.x, b.end.y - b.start.y) -
            Math.hypot(a.end.x - a.start.x, a.end.y - a.start.y),
        )
      for (const { start, end } of candidates.slice(0, 8)) {
        const vertical = Math.abs(end.y - start.y) > Math.abs(end.x - start.x)
        const gap = 16
        for (const ratio of [0.5, 0.25, 0.75]) {
          const x = start.x + (end.x - start.x) * ratio
          const y = start.y + (end.y - start.y) * ratio
          const sides = [
            [x + gap, y - height / 2],
            [x - gap - width, y - height / 2],
          ] as const
          const ends = [
            [x - width / 2, y - gap - height],
            [x - width / 2, y + gap],
          ] as const
          for (const [left, top] of vertical ? [...sides, ...ends] : [...ends, ...sides]) {
            const box = { left, top, right: left + width, bottom: top + height }
            if (
              box.left < 8 ||
              box.top < 8 ||
              box.right > viewport.right - 8 ||
              box.bottom > viewport.bottom - 8
            )
              continue
            const safe = padded(box, 6)
            if (
              occupied.some((other) => overlaps(safe, other)) ||
              obstacles.some((line) => intersects(line, safe))
            )
              continue
            occupied.push(box)
            label.style.transform = `translate(${box.left}px, ${box.top}px)`
            label.style.visibility = 'visible'
            return
          }
        }
      }
      label.style.visibility = 'hidden'
    })
  }

  function schedule() {
    if (!frame) frame = requestAnimationFrame(layout)
  }
  events.forEach((event) => map.on(event, schedule))

  return {
    setRoutes(nextRoutes: CableLabelRoute[], opacity = 1) {
      routes = nextRoutes
      entries = routes.flatMap((route, index) => {
        if (route.path.length < 2) return []
        const label = document.createElement('span')
        label.className = 'cable-map-label'
        label.textContent = `${route.name} · ${route.statusLabel}`
        return [{ index, label }]
      })
      layer.style.opacity = String(opacity)
      layer.replaceChildren(...entries.map(({ label }) => label))
      schedule()
    },
    destroy() {
      events.forEach((event) => map.off(event, schedule))
      cancelAnimationFrame(frame)
      layer.remove()
      container.classList.remove('cable-annotated-map')
    },
  }
}
