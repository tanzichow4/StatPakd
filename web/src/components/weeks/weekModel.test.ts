import { describe, expect, it } from 'vitest'
import type { Entity, GameLogEntry, StatDef } from '../../domain/types'
import {
  allPeriods,
  chosenPeriods,
  describeTrend,
  groupedTotals,
  periodGraph,
  periodTotal,
  pickStat,
  statGraph,
  statsWithData,
  type GameLogs,
} from './weekModel'

const week = (period: number, stats: GameLogEntry['stats'] | null): GameLogEntry => ({
  period,
  label: `Round ${period}`,
  shortLabel: `R${period}`,
  played: stats !== null,
  stats: stats ?? {},
})
const logs: GameLogs = new Map([
  ['a', [week(1, { k: 10, m: 1 }), week(2, { k: 20, m: 3 }), week(3, null)]],
  ['b', [week(1, { k: 30, m: null }), week(2, null), week(3, { k: 50, m: 2 })]],
])
const k: StatDef = { key: 'k', label: 'K', group: 'g1' }
const m: StatDef = { key: 'm', label: 'M', group: 'g2' }
const column = (id: string, colorIndex: number) => ({
  colorIndex,
  entity: { id, name: id.toUpperCase(), shortName: id, meta: '', badge: '', stats: {} } as Entity,
})
const columns = [column('a', 0), column('b', 1)]
const periods = allPeriods(logs)

describe('periods', () => {
  it('lists every period of any player once, in order', () => {
    expect(periods.map((p) => p.period)).toEqual([1, 2, 3])
  })
  it('treats no choice as every period and keeps only real ones', () => {
    expect(chosenPeriods(periods, null)).toHaveLength(3)
    expect(chosenPeriods(periods, [3, 1, 9]).map((p) => p.period)).toEqual([1, 3])
    expect(chosenPeriods(periods, [])).toEqual([])
  })
})

describe('stats', () => {
  it('lists stats that have a value for someone, ordered by category', () => {
    // The first definition has no values but still sets the order of its category.
    const defs = [{ ...k, key: 'none' }, m, k]
    expect(statsWithData(defs, logs).map((d) => d.key)).toEqual(['k', 'm'])
  })
  it('picks the first wanted stat, then the fallback position', () => {
    expect(pickStat([k, m], ['zz', 'm'])).toBe(m)
    expect(pickStat([k, m], [''], 1)).toBe(m)
    expect(pickStat([k], [''], 1)).toBe(k)
    expect(pickStat([], [''])).toBeUndefined()
  })
})

describe('totals', () => {
  it('adds up only the chosen weeks that were played', () => {
    expect(periodTotal(logs, 'a', k, periods)).toBe(30)
    expect(periodTotal(logs, 'b', k, periods.slice(0, 2))).toBe(30)
    expect(periodTotal(logs, 'b', m, periods.slice(0, 1))).toBeNull()
  })
  it('groups rows by category with one value for each player', () => {
    expect(groupedTotals(columns, logs, [k, m], periods)).toEqual([
      { group: 'g1', rows: [{ def: k, values: [30, 80] }] },
      { group: 'g2', rows: [{ def: m, values: [4, 2] }] },
    ])
  })
})

describe('describeTrend', () => {
  const points = [
    { period: 1, value: 10 },
    { period: 3, value: 30 },
  ]
  it('gives the change per week and whether it is good', () => {
    expect(describeTrend(points, k)).toBe('Trending up: +10.0 per week (improving)')
    expect(describeTrend(points, { lowerIsBetter: true })).toContain('(declining)')
  })
  it('covers steady, single and missing values', () => {
    const flat = points.map((p) => ({ ...p, value: 5 }))
    expect(describeTrend(flat, k)).toBe('Holding steady')
    expect(describeTrend(points.slice(0, 1), k)).toBe('Not enough weeks for a trend')
    expect(describeTrend([], k)).toBe('No values in these weeks')
  })
})

describe('periodGraph', () => {
  const graph = periodGraph(columns, logs, k, periods, true)

  it('puts weeks along x and leaves byes empty', () => {
    expect(graph.xTicks.map((t) => t.label)).toEqual(['1', '2', '3'])
    expect(graph.points.map((p) => p.id)).toEqual(['a-1', 'a-2', 'b-1', 'b-3'])
  })

  it('sets players side by side in the same week', () => {
    const [a1, , b1] = graph.points
    expect(a1.x).toBeLessThan(b1.x)
  })

  it('draws higher values higher and one trend line for each player', () => {
    const [a1, a2] = graph.points
    expect(a2.y).toBeLessThan(a1.y)
    expect(graph.lines.map((l) => l.id)).toEqual(['a', 'b'])
    expect(periodGraph(columns, logs, k, periods, false).lines).toEqual([])
  })

  it('describes every dot', () => {
    expect(graph.points[0].description).toBe('A, Round 1: K 10')
  })

  it('prints values only for one player over a few weeks', () => {
    expect(graph.points[0].text).toBeUndefined()
    expect(periodGraph([columns[0]], logs, k, periods, true).points[0].text).toBe('10')
  })
})

describe('statGraph', () => {
  const graph = statGraph(columns, logs, k, m, periods, true)

  it('plots only weeks that have both stats', () => {
    expect(graph.points.map((p) => p.id)).toEqual(['a-1', 'a-2', 'b-3'])
    expect([graph.xTitle, graph.yTitle]).toEqual(['K', 'M'])
  })

  it('fits a line only where there are two different x values', () => {
    expect(graph.lines.map((l) => l.id)).toEqual(['a'])
  })

  it('labels dots with the week when there are few', () => {
    expect(graph.points[0].text).toBe('R1')
  })
})
