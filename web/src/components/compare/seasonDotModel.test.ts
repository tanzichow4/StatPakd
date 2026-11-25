import { describe, expect, it } from 'vitest'
import type { Entity, StatDef } from '../../domain/types'
import { rowGraph, scatterGraph } from './seasonDotModel'

const entity = (id: string, stats: Entity['stats']): Entity => ({
  id,
  name: id.toUpperCase(),
  shortName: id,
  meta: '',
  badge: '',
  stats,
})
const pool = [
  entity('a', { x: 10, y: 1 }),
  entity('b', { x: null, y: 2 }),
  entity('c', { x: 30, y: 3 }),
]
const x: StatDef = { key: 'x', label: 'X', group: 'g' }
const y: StatDef = { key: 'y', label: 'Y', group: 'g' }
const columns = [
  { entity: pool[0], colorIndex: 0 },
  { entity: pool[1], colorIndex: 1 },
]

describe('rowGraph', () => {
  const graph = rowGraph(columns, pool, x)
  it('gives each selected entity its own row', () => {
    expect(graph.model.yTicks).toEqual([
      { at: 25, label: 'a' },
      { at: 75, label: 'b' },
    ])
    expect(graph.model.points.map((p) => [p.id, p.y, p.text])).toEqual([['a', 25, '10']])
  })
  it('names the entities without a value', () => {
    expect(graph.missing).toEqual(['b'])
  })
})

describe('scatterGraph', () => {
  const graph = scatterGraph(columns, pool, x, y)
  it('plots the pool, with selected entities coloured and drawn last', () => {
    expect(graph.model.points.map((p) => [p.id, Boolean(p.muted)])).toEqual([
      ['c', true],
      ['a', false],
    ])
    expect(graph.model.points[1].description).toBe('A: X 10, Y 1')
  })
  it('puts higher y values higher', () => {
    const [c, a] = graph.model.points
    expect(c.y).toBeLessThan(a.y)
  })
  it('names the selected entities that lack either stat', () => {
    expect(graph.missing).toEqual(['b'])
  })
})
