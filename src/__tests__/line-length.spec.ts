import { describe, expect, it } from 'vitest'
import { routeLengthMetres } from '../domain/infrastructure/line-length'

const node = (sequence: number, coordinate: [number, number]) => ({ sequence, coordinate })

describe('route length in metres', () => {
  it('measures one equatorial degree and sums in sequence order', () => {
    expect(Number(routeLengthMetres([node(2, [2, 0]), node(1, [1, 0])]))).toBeCloseTo(111195.08, 3)
    expect(
      Number(routeLengthMetres([node(1, [1, 0]), node(3, [2, 0]), node(2, [3, 0])])),
    ).toBeCloseTo(333585.241, 3)
  })
  it('recomputes when an endpoint is added, removed or moved', () => {
    const nodes = [node(1, [1, 0]), node(2, [2, 0])]
    const length = Number(routeLengthMetres(nodes))
    expect(Number(routeLengthMetres([...nodes, node(3, [3, 0])]))).toBeCloseTo(length * 2, 2)
    expect(routeLengthMetres(nodes.slice(0, 1))).toBe('0.000')
    expect(Number(routeLengthMetres([nodes[0]!, node(2, [3, 0])]))).toBeCloseTo(length * 2, 2)
  })
  it('does not bridge unknown coordinates and handles empty and repeated points', () => {
    expect(routeLengthMetres([])).toBe('0.000')
    expect(routeLengthMetres([node(1, [1, 0]), node(2, [1, 0])])).toBe('0.000')
    for (const coordinate of [
      [0, 0],
      [181, 0],
      [NaN, 20],
    ] as [number, number][]) {
      expect(routeLengthMetres([node(1, [1, 0]), node(2, coordinate), node(3, [2, 0])])).toBe('')
    }
  })
})
