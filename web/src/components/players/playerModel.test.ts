import { describe, expect, it } from 'vitest'
import type { Entity, GameLogEntry, StatDef } from '../../domain/types'
import { summaryRow } from './headerModel'
import {
  activePlayer,
  changeText,
  chartStat,
  chosenEntries,
  describeTrend,
  fitLine,
  periodColumns,
  recentPeriods,
  statsWithData,
  trendChart,
  trendPoints,
  valueDomain,
} from './playerModel'

const week = (period: number, k: number | null, played = true): GameLogEntry => ({
  period,
  label: `Round ${period}`,
  shortLabel: `R${period}`,
  played,
  stats: played ? { k } : {},
})
const log = [week(1, 10), week(2, 20), week(3, null, false), week(4, null), week(5, 40)]
const def: StatDef = { key: 'k', label: 'K', group: 'g' }
const other: StatDef = { key: 'none', label: 'None', group: 'g' }
const player = (id: string): Entity => ({
  id,
  name: id,
  shortName: id,
  meta: '',
  badge: '',
  stats: {},
})

describe('activePlayer', () => {
  const players = [player('a'), player('b'), player('c')]
  it('prefers the chosen player', () => {
    expect(activePlayer(players, 'c', ['b'])?.id).toBe('c')
  })
  it('falls back to the first compared player, then the first player', () => {
    expect(activePlayer(players, '', ['gone', 'b'])?.id).toBe('b')
    expect(activePlayer(players, 'gone', [])?.id).toBe('a')
    expect(activePlayer([], '', [])).toBeUndefined()
  })
})

describe('stat choice', () => {
  it('lists only stats with a weekly value', () => {
    expect(statsWithData([other, def], log)).toEqual([def])
  })
  it('uses the chosen stat, then a preferred one, then the first', () => {
    const a = { ...def, key: 'a' }
    const b = { ...def, key: 'b' }
    expect(chartStat([a, b], 'b', [])).toBe(b)
    expect(chartStat([a, b], 'zz', ['zz', 'b'])).toBe(b)
    expect(chartStat([a, b], '', [])).toBe(a)
    expect(chartStat([], '', [])).toBeUndefined()
  })
})

describe('trends', () => {
  it('skips periods with no game or no value', () => {
    expect(trendPoints(log, 'k')).toEqual([
      { period: 1, value: 10 },
      { period: 2, value: 20 },
      { period: 5, value: 40 },
    ])
  })

  it('fits a straight line by period number, not by position', () => {
    const line = fitLine([
      { period: 1, value: 10 },
      { period: 5, value: 50 },
    ])
    expect(line).toEqual({ slope: 10, start: 0 })
    expect(fitLine([{ period: 1, value: 3 }])).toBeNull()
  })

  it('says whether a stat is rising and whether that is good', () => {
    const rising = trendPoints(log, 'k')
    expect(describeTrend(rising, def)).toEqual({
      direction: 'up',
      text: expect.stringMatching(/^Trending up: \+7\.\d per week \(improving\)$/),
    })
    expect(describeTrend(rising, { lowerIsBetter: true })?.text).toContain('(declining)')
    expect(describeTrend(rising.slice(0, 1), def)).toBeNull()
  })

  it('calls small changes and near-zero slopes steady', () => {
    const flat = [
      { period: 1, value: 100 },
      { period: 2, value: 101 },
    ]
    expect(describeTrend(flat, def)).toEqual({ direction: 'steady', text: 'Holding steady' })
    const tiny = [
      { period: 1, value: 0.004 },
      { period: 2, value: 0 },
    ]
    expect(describeTrend(tiny, def)?.direction).toBe('steady')
  })

  it('reports the change from the first to the last chosen value', () => {
    expect(changeText(log, def)).toBe('R1 to R5: +30')
    expect(changeText([week(1, 9), week(2, 4)], def)).toBe('R1 to R2: −5')
    expect(changeText([week(1, 9)], def)).toBeNull()
  })
})

describe('trendChart', () => {
  const model = trendChart(log, def)

  it('has one column per period, spread evenly', () => {
    expect(model.columns.map((c) => c.x)).toEqual([10, 30, 50, 70, 90])
  })

  it('leaves byes and missing values without a dot', () => {
    expect(model.columns.map((c) => c.y === null)).toEqual([false, false, true, true, false])
    expect(model.columns[2]).toMatchObject({ played: false, text: '—' })
  })

  it('draws higher values higher and ends the trend at the first and last values', () => {
    const [a, b] = model.columns
    expect(b.y!).toBeLessThan(a.y!)
    expect(model.trend).toMatchObject({ x1: 10, x2: 90 })
    expect(model.average?.text).toBe('23.3')
  })

  it('numbers the highest, middle and lowest values where they are drawn', () => {
    expect(model.ticks.map((t) => t.text)).toEqual(['40', '25', '10'])
    expect(model.ticks[0].y).toBe(model.columns[4].y)
  })

  it('does not repeat labels for small whole numbers', () => {
    const small = trendChart([week(1, 0), week(2, 1)], def)
    expect(small.ticks.map((t) => t.text)).toEqual(['1', '0'])
  })

  it('is empty but valid with no values', () => {
    const empty = trendChart([week(1, null)], def)
    expect(empty).toMatchObject({ ticks: [], average: null, trend: null })
  })
})

describe('valueDomain', () => {
  it('adds headroom without going below zero for non-negative values', () => {
    expect(valueDomain([0, 100])).toEqual([0, 112])
    expect(valueDomain([-10, 10])[0]).toBeLessThan(-10)
  })
  it('keeps a usable range when every value is the same', () => {
    const [low, high] = valueDomain([5, 5])
    expect(high).toBeGreaterThan(low)
  })
})

describe('choosing periods', () => {
  it('ignores periods without a game', () => {
    expect(chosenEntries(log, [3, 5, 1]).map((e) => e.period)).toEqual([1, 5])
  })
  it('picks the latest played periods', () => {
    expect(recentPeriods(log, 3)).toEqual([2, 4, 5])
  })
  it('turns periods into table columns', () => {
    const [first] = periodColumns([log[0]])
    expect(first.entity).toMatchObject({ id: '1', name: 'Round 1', shortName: 'R1' })
  })
})

describe('summaryRow', () => {
  const defs: StatDef[] = [
    { key: 'a', label: 'A', group: 'g' },
    { key: 'b', label: 'B', group: 'g' },
    { key: 'c', label: 'C', group: 'g', extra: true },
    { key: 'd', label: 'D', group: 'g' },
  ]
  it('puts picked stats first and skips extras and missing values', () => {
    expect(summaryRow(defs, { a: 1, b: null, c: 3, d: 4 }, ['d'])).toEqual([
      { key: 'd', label: 'D', text: '4' },
      { key: 'a', label: 'A', text: '1' },
    ])
  })
})
