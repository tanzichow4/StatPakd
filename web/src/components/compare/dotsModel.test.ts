import { describe, expect, it } from 'vitest'
import type { Entity, StatDef } from '../../domain/types'
import { LANE_GAP, dotRows, laneOffsets } from './dotsModel'

const entity = (id: string, stats: Entity['stats']): Entity => ({
  id,
  name: `Name ${id}`,
  shortName: id,
  meta: '',
  badge: '',
  stats,
})
const pool = [
  entity('a', { k: 0 }),
  entity('b', { k: 50 }),
  entity('c', { k: 100 }),
  entity('d', { k: null }),
  entity('e', {}),
]
const def: StatDef = { key: 'k', label: 'K', group: 'g' }
const column = (id: string, colorIndex: number) => ({
  entity: pool.find((e) => e.id === id)!,
  colorIndex,
})

describe('dotRows', () => {
  it('places each selected value between the league minimum and maximum', () => {
    const [row] = dotRows([def], [column('b', 0), column('c', 1)], pool)
    expect(row.marks.map((m) => m.x)).toEqual([50, 100])
    expect([row.minText, row.maxText]).toEqual(['0', '100'])
  })

  it('lists unselected entities with a value as league dots', () => {
    const [row] = dotRows([def], [column('b', 0)], pool)
    expect(row.league).toEqual([
      { id: 'a', x: 0 },
      { id: 'c', x: 100 },
    ])
  })

  it('does not flip lower-is-better stats but marks the lowest as best', () => {
    const [row] = dotRows([{ ...def, lowerIsBetter: true }], [column('b', 0), column('c', 1)], pool)
    expect(row.marks.map((m) => m.x)).toEqual([50, 100])
    expect(row.marks.map((m) => m.best)).toEqual([true, false])
  })

  it('flags null and missing values as not applicable', () => {
    const [row] = dotRows([def], [column('d', 0), column('e', 1)], pool)
    expect(row.marks.map((m) => m.na)).toEqual([true, true])
    expect(row.marks.map((m) => m.offset)).toEqual([0, 0])
  })

  it('shows placeholders when nobody has the stat', () => {
    const [row] = dotRows([{ ...def, key: 'none' }], [column('a', 0)], pool)
    expect([row.minText, row.maxText]).toEqual(['—', '—'])
    expect(row.league).toEqual([])
  })
})

describe('laneOffsets', () => {
  it('keeps well separated dots on the line', () => {
    expect(laneOffsets([0, 50, 100])).toEqual([0, 0, 0])
  })

  it('moves equal values above and below the line', () => {
    expect(laneOffsets([40, 40, 40, 40])).toEqual([0, -1, 1, -2])
  })

  it('returns to the line once the gap is wide enough', () => {
    expect(laneOffsets([10, 11, 10 + LANE_GAP])).toEqual([0, -1, 0])
  })

  it('gives not-applicable values no lane', () => {
    expect(laneOffsets([null, 5, null, 5])).toEqual([0, 0, 0, -1])
  })
})
