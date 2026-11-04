import { describe, expect, it } from 'vitest'
import type { Entity, StatDef } from '../../domain/types'
import { compareStatDefs, comparePlayers, compareTeams } from '../../test/compareFixtures'
import { barRows } from './barsModel'
import { resolveColumns, resolveRows } from './tableModel'

const defs = compareStatDefs()
const pool = comparePlayers()

function rowsFor(keys: string[]): StatDef[] {
  return resolveRows(keys, defs.players)
}
function cols(ids: string[]) {
  return resolveColumns(ids, pool)
}
function widths(keys: string[], ids: string[], key: string, p: readonly Entity[] = pool) {
  const row = barRows(rowsFor(keys), cols(ids), p).find((r) => r.def.key === key)
  return row!.lines.map((l) => l.width)
}

describe('barRows', () => {
  it('AC4: one row per resolved stat in the given row order, one line per column in order', () => {
    const result = barRows(rowsFor(['zbig', 'zhigh', 'zlow']), cols(['zp3', 'zp1', 'zp2']), pool)
    expect(result.map((r) => r.def.key)).toEqual(['zhigh', 'zlow', 'zbig'])
    for (const r of result) expect(r.lines.map((l) => l.entity.id)).toEqual(['zp3', 'zp1', 'zp2'])
  })

  it('AC6: colorIndex is carried through from the column', () => {
    const [row] = barRows(rowsFor(['zhigh']), cols(['zp3', 'nope', 'zp1']), pool)
    expect(row.lines.map((l) => [l.entity.id, l.colorIndex])).toEqual([
      ['zp3', 0],
      ['zp1', 2],
    ])
  })

  it('AC7: text is the formatted value', () => {
    const result = barRows(rowsFor(['zbig', 'zsign', 'zlow']), cols(['zp1', 'zp2']), pool)
    const text = (k: string) => result.find((r) => r.def.key === k)!.lines.map((l) => l.text)
    expect(text('zbig')).toEqual(['4,000', '1,200'])
    expect(text('zlow')).toEqual(['3.50', '1.25'])
    expect(text('zsign')).toEqual(['+2.0', '-1.0'])
  })

  it('AC9: widths come from the whole pool, not the selection (exact values)', () => {
    const keys = ['zhigh', 'zlow', 'zbig']
    const ids = ['zp1', 'zp2', 'zp3']
    expect(widths(keys, ids, 'zhigh')).toEqual([100, 100, 47])
    expect(widths(keys, ids, 'zlow')).toEqual([33, 5, 14])
    expect(widths(keys, ids, 'zbig')).toEqual([100, 11, 5])
  })

  it('AC9: pool min gets 5 and pool max gets 100', () => {
    // zp3 is pool min of zbig (1000), zp1 pool max (4000)
    const w = widths(['zbig'], ['zp3', 'zp1'], 'zbig')
    expect(w).toEqual([5, 100])
  })

  it('AC9: selected extremes that are not pool extremes stay strictly between 5 and 100', () => {
    // Select zp2 (1200) and zp5 (1500) of zbig only: neither is pool min/max.
    const [lo, hi] = widths(['zbig'], ['zp2', 'zp5'], 'zbig')
    expect(lo).toBeGreaterThan(5)
    expect(hi).toBeLessThan(100)
    expect(lo).toBeLessThan(hi)
    expect([lo, hi]).toEqual([11, 21])
  })

  it('AC9: teams use the team pool range (ztpts 25..30, zt3 = 28 -> 62)', () => {
    const teams = compareTeams()
    const r = barRows(
      resolveRows(['ztpts'], defs.teams),
      resolveColumns(['zt3', 'zt1', 'zt2'], teams),
      teams,
    )
    expect(r[0].lines.map((l) => l.width)).toEqual([62, 100, 5])
  })

  it('AC10: equal range gives the mid width (52 or 53) for every non-null value', () => {
    const [row] = barRows(rowsFor(['zsolo']), cols(['zp1', 'zp2']), pool)
    expect([52, 53]).toContain(row.lines[0].width)
    expect(row.lines[0].na).toBe(false)
    // single-entity pool with equal values
    const same: Entity[] = [
      { ...pool[0], id: 'a', stats: { zhigh: 4 } },
      { ...pool[0], id: 'b', stats: { zhigh: 4 } },
    ]
    const r = barRows(
      rowsFor(['zhigh']),
      same.map((entity, colorIndex) => ({ entity, colorIndex })),
      same,
    )
    expect(r[0].lines.map((l) => l.width)).toEqual([row.lines[0].width, row.lines[0].width])
  })

  it('AC11: lower-is-better stats are not inverted (larger value has the longer bar)', () => {
    const [zp1, zp2, zp3] = widths(['zlow'], ['zp1', 'zp2', 'zp3'], 'zlow')
    // values 3.5, 1.25, 2.0
    expect(zp1).toBeGreaterThan(zp3)
    expect(zp3).toBeGreaterThan(zp2)
    expect(zp2).toBe(5)
    // pool max (9, zp4) gets the full bar even though it is the worst
    expect(widths(['zlow'], ['zp4'], 'zlow')).toEqual([100])
  })

  it('AC13: null and missing values give width 0, na true and text "—"', () => {
    const [row] = barRows(rowsFor(['zhigh']), cols(['zp4']), pool)
    expect(row.lines[0]).toMatchObject({ width: 0, na: true, text: '—' })
    // zp2 has zsolo: null; zp3 has no zsolo key at all
    const [solo] = barRows(rowsFor(['zsolo']), cols(['zp2', 'zp3']), pool)
    for (const l of solo.lines) expect(l).toMatchObject({ width: 0, na: true, text: '—' })
  })

  it('AC14: an all-null stat gives no NaN and all lines N/A', () => {
    const emptyPool: Entity[] = [
      { ...pool[0], id: 'a', stats: { zhigh: null } },
      { ...pool[0], id: 'b', stats: {} },
    ]
    const r = barRows(
      rowsFor(['zhigh']),
      emptyPool.map((entity, colorIndex) => ({ entity, colorIndex })),
      emptyPool,
    )
    for (const l of r[0].lines) {
      expect(Number.isNaN(l.width)).toBe(false)
      expect(l).toMatchObject({ width: 0, na: true, text: '—' })
    }
  })

  it('AC14: N/A values do not affect the range', () => {
    // zhigh range is 1..10 despite zp4 null: zp1=100 and a value of 1 (zp6) is 5
    expect(widths(['zhigh'], ['zp6', 'zp1', 'zp4'], 'zhigh')).toEqual([5, 100, 0])
  })

  it('AC12: adding or removing selected entities does not change other widths', () => {
    const keys = ['zhigh', 'zlow', 'zbig']
    const base = barRows(rowsFor(keys), cols(['zp1', 'zp2', 'zp3']), pool)
    const more = barRows(rowsFor(keys), cols(['zp1', 'zp2', 'zp3', 'zp4', 'zp8']), pool)
    const fewer = barRows(rowsFor(keys), cols(['zp3']), pool)
    base.forEach((row, i) => {
      expect(more[i].lines.slice(0, 3).map((l) => l.width)).toEqual(row.lines.map((l) => l.width))
      expect(fewer[i].lines[0].width).toBe(row.lines[2].width)
    })
  })

  it('AC12: a different pool (season or kind change) recomputes widths', () => {
    const smaller = pool.filter((e) => e.id !== 'zp1') // removes zbig max 4000
    expect(widths(['zbig'], ['zp4'], 'zbig', smaller)).toEqual([100])
    expect(widths(['zbig'], ['zp4'], 'zbig', pool)).not.toEqual([100])
  })

  it('AC4: empty rows or columns give an empty result without throwing', () => {
    expect(barRows([], cols(['zp1']), pool)).toEqual([])
    expect(barRows(rowsFor(['zhigh']), [], pool)[0].lines).toEqual([])
  })
})
