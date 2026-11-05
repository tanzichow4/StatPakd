import { describe, expect, it } from 'vitest'
import type { RosterEntry, RosterUnitDef, StatDef } from '../../domain/types'
import { seriesColor, seriesTextColor } from '../../styles/series'
import {
  PCT_TEXT_MIN,
  buildShareRow,
  findUnit,
  legendItems,
  leaderName,
  shareStats,
  tooltipLeft,
} from './shareModel'

const DOT = '·'

const def: StatDef = { key: 'zk', label: 'Zk', group: 'zg', shareLabel: 'Zk tally' }

function entry(id: string, name: string, value: number | null | undefined): RosterEntry {
  return { id, name, position: 'ZA', stats: value === undefined ? {} : { zk: value } }
}

function roster(...values: (number | null | undefined)[]): RosterEntry[] {
  return values.map((v, i) => entry(`r${i}`, `First${i} Last${i}`, v))
}

function deepFreeze<T>(value: T): T {
  if (value && typeof value === 'object') {
    for (const v of Object.values(value)) deepFreeze(v)
    Object.freeze(value)
  }
  return value
}

const unit = (key: string, stats: StatDef[] = []): RosterUnitDef => ({ key, label: key, stats })

describe('AC16: the percent text threshold', () => {
  it('AC16: PCT_TEXT_MIN is 9', () => {
    expect(PCT_TEXT_MIN).toBe(9)
  })
})

describe('AC10/AC28: findUnit', () => {
  const units = [unit('za'), unit('zb')]
  it('AC10: finds a unit by key', () => {
    expect(findUnit(units, 'zb')).toBe(units[1])
  })
  it('AC28: an unknown key gives undefined', () => {
    expect(findUnit(units, 'zc')).toBeUndefined()
  })
  it('AC28: an empty list gives undefined', () => {
    expect(findUnit([], 'za')).toBeUndefined()
  })
})

describe('AC6/AC13: shareStats', () => {
  it('AC13: keeps only defs with a share label, in definition order', () => {
    const u = unit('za', [
      { key: 'a', label: 'A', group: 'g' },
      { key: 'b', label: 'B', group: 'g', shareLabel: 'Bs' },
      { key: 'c', label: 'C', group: 'g', shareLabel: 'Cs' },
      { key: 'd', label: 'D', group: 'g' },
      { key: 'e', label: 'E', group: 'g', shareLabel: 'Es', extra: true },
    ])
    expect(shareStats(u).map((s) => s.key)).toEqual(['b', 'c', 'e'])
  })
  it('AC6: an empty share label does not make a share stat', () => {
    const u = unit('za', [
      { key: 'a', label: 'A', group: 'g', shareLabel: '' },
      { key: 'b', label: 'B', group: 'g', shareLabel: 'Bs' },
    ])
    expect(shareStats(u).map((s) => s.key)).toEqual(['b'])
  })
  it('AC13: a unit with no share stats gives []', () => {
    expect(shareStats(unit('za', [{ key: 'a', label: 'A', group: 'g' }]))).toEqual([])
    expect(shareStats(unit('za'))).toEqual([])
  })
})

describe('AC17: leaderName drops the first word', () => {
  it('AC17: two words give the last word', () => {
    expect(leaderName('Ola Quenby')).toBe('Quenby')
  })
  it('AC17: three words keep everything after the first', () => {
    expect(leaderName('Jory Kestrel Vane')).toBe('Kestrel Vane')
  })
  it('AC17: one word gives the full name', () => {
    expect(leaderName('Cher')).toBe('Cher')
  })
  it('AC17: surrounding and repeated spaces are tolerated', () => {
    expect(leaderName('  Ola   Quenby ')).toBe('Quenby')
    expect(leaderName('  Cher ')).toBe('Cher')
  })
})

describe('AC14: totals', () => {
  it('AC14: the total is formatted with grouping', () => {
    expect(buildShareRow(def, roster(1000, 234)).totalText).toBe('1,234 total')
  })
  it('AC14: the stat decimals apply to the total', () => {
    const d: StatDef = { ...def, decimals: 1 }
    expect(buildShareRow(d, roster(1.5, 2.5)).totalText).toBe('4.0 total')
  })
  it('AC14/AC2: null, missing, zero and negative values do not count towards the total', () => {
    expect(buildShareRow(def, roster(5, null, undefined, 0, -3, 10)).totalText).toBe('15 total')
  })
  it('AC13: label and bar label come from the share label', () => {
    const row = buildShareRow(def, roster(1))
    expect(row.label).toBe('Zk tally')
    expect(row.barLabel).toBe('Zk tally share')
  })
})

describe('AC15/AC25: segments', () => {
  it('AC15: one segment per player with a positive value, in roster order', () => {
    const r = [
      entry('a', 'A One', 3),
      entry('b', 'B Two', 0),
      entry('c', 'C Three', null),
      entry('d', 'D Four', -4),
      entry('e', 'E Five', undefined),
      entry('f', 'F Six', 7),
    ]
    const row = buildShareRow(def, r)
    expect(row.segments.map((s) => s.value)).toEqual([3, 7])
    expect(row.segments.map((s) => s.tooltip.split(` ${DOT} `)[0])).toEqual(['A One', 'F Six'])
  })
  it('AC25: colours follow the roster index, even after a skipped player', () => {
    const row = buildShareRow(def, roster(5, 0, 5, null, 5))
    expect(row.segments.map((s) => s.color)).toEqual([
      seriesColor(0),
      seriesColor(2),
      seriesColor(4),
    ])
    expect(seriesColor(0)).toBe('var(--series-1)')
  })
  it('AC24: text colour follows the roster index like the segment colour', () => {
    const row = buildShareRow(def, roster(5, 0, 5, null, 5))
    expect(row.segments.map((s) => s.textColor)).toEqual([
      seriesTextColor(0),
      seriesTextColor(2),
      seriesTextColor(4),
    ])
  })
  it('AC25: colours wrap after 8 players', () => {
    const row = buildShareRow(def, roster(...Array.from({ length: 10 }, () => 1)))
    expect(row.segments).toHaveLength(10)
    expect(row.segments[8]?.color).toBe(row.segments[0]?.color)
    expect(row.segments[9]?.color).toBe(row.segments[1]?.color)
    expect(row.segments[7]?.color).not.toBe(row.segments[0]?.color)
  })
})

describe('AC16: segment percent text', () => {
  it('AC16: text appears from 9% and not at 8%', () => {
    const row = buildShareRow(def, roster(8, 9, 83))
    expect(row.segments.map((s) => s.pct)).toEqual([8, 9, 83])
    expect(row.segments.map((s) => s.text)).toEqual([null, '9%', '83%'])
  })
  it('AC16: a single player shows 100%', () => {
    expect(buildShareRow(def, roster(7)).segments[0]?.text).toBe('100%')
  })
})

describe('AC21: tooltips', () => {
  it('AC21: name, grouped value and percent joined with a middle dot', () => {
    const r = [entry('a', 'Saquon Barkley', 1234)]
    expect(buildShareRow(def, r).segments[0]?.tooltip).toBe(`Saquon Barkley ${DOT} 1,234 (100%)`)
  })
  it('AC21: the stat decimals apply to the value', () => {
    const d: StatDef = { ...def, decimals: 1 }
    const r = [entry('a', 'Ola Quenby', 2), entry('b', 'Pim Rastow', 2)]
    expect(buildShareRow(d, r).segments.map((s) => s.tooltip)).toEqual([
      `Ola Quenby ${DOT} 2.0 (50%)`,
      `Pim Rastow ${DOT} 2.0 (50%)`,
    ])
  })
  it('AC3/AC21: a positive value that rounds to 0% still gets a segment', () => {
    const row = buildShareRow(def, roster(1, 1000))
    expect(row.segments).toHaveLength(2)
    expect(row.segments[0]?.pct).toBe(0)
    expect(row.segments[0]?.text).toBeNull()
    expect(row.segments[0]?.tooltip).toMatch(/ \(0%\)$/)
  })
})

describe('AC17/AC18: leader and consistent percentages', () => {
  it('AC17: the leader is the largest value, by last name', () => {
    const r = [entry('a', 'Ada Brindle', 10), entry('b', 'Bo Cantrell', 30), entry('c', 'C D', 60)]
    expect(buildShareRow(def, r).leaderText).toBe('Leader: D 60%')
  })
  it('AC17: on a tie the first in roster order leads', () => {
    const r = [
      entry('a', 'Ada Brindle', 10),
      entry('b', 'Bo Cantrell', 40),
      entry('c', 'C Dee', 40),
    ]
    expect(buildShareRow(def, r).leaderText).toBe('Leader: Cantrell 45%')
  })
  it('AC17: a one-word leader name is shown in full', () => {
    const r = [entry('a', 'Cher', 9), entry('b', 'Bo Cantrell', 1)]
    expect(buildShareRow(def, r).leaderText).toBe('Leader: Cher 90%')
  })
  it('AC17: a multi-word leader keeps everything after the first word', () => {
    const r = [entry('a', 'Jory Kestrel Vane', 1)]
    expect(buildShareRow(def, r).leaderText).toBe('Leader: Kestrel Vane 100%')
  })
  it('AC17: ignores null, missing and negative values when finding the leader', () => {
    const r = [entry('a', 'A Neg', -50), entry('b', 'B Nul', null), entry('c', 'C Pos', 2)]
    expect(buildShareRow(def, r).leaderText).toBe('Leader: Pos 100%')
  })
  it('AC18: [1,1,1] gives 34/33/33 in segments, tooltips and leader', () => {
    const row = buildShareRow(def, roster(1, 1, 1))
    expect(row.segments.map((s) => s.pct)).toEqual([34, 33, 33])
    expect(row.segments.map((s) => s.tooltip)).toEqual([
      `First0 Last0 ${DOT} 1 (34%)`,
      `First1 Last1 ${DOT} 1 (33%)`,
      `First2 Last2 ${DOT} 1 (33%)`,
    ])
    expect(row.leaderText).toBe('Leader: Last0 34%')
  })
  it('AC18: the percentages in a row sum to 100', () => {
    const row = buildShareRow(def, roster(331, 20, 150, null, -10, 100, 0, 60, 40, 30))
    expect(row.segments.map((s) => s.pct)).toEqual([45, 3, 21, 14, 8, 5, 4])
    expect(row.segments.reduce((a, s) => a + s.pct, 0)).toBe(100)
  })
})

describe('AC19/AC20: zero total and empty roster', () => {
  it.each([
    ['all zero', roster(0, 0, 0)],
    ['all null', roster(null, null)],
    ['all missing', roster(undefined, undefined)],
    ['all negative', roster(-1, -5)],
    ['empty roster', [] as RosterEntry[]],
  ])('AC19: %s renders no segments, "0 total" and no leader', (_name, r) => {
    const row = buildShareRow(def, r)
    expect(row.segments).toEqual([])
    expect(row.totalText).toBe('0 total')
    expect(row.leaderText).toBeNull()
  })
  it('AC19: no string contains NaN, Infinity or undefined for bad values', () => {
    const rows = [
      roster(null, undefined, -1, 0, Number.NaN, Number.POSITIVE_INFINITY),
      roster(null, undefined, -1, 0, Number.NaN, 4),
      roster(Number.NaN),
      [],
    ]
    for (const r of rows) {
      const row = buildShareRow(def, r)
      const strings = [
        row.label,
        row.barLabel,
        row.totalText,
        row.leaderText ?? '',
        ...row.segments.flatMap((s) => [s.tooltip, s.text ?? '', String(s.pct), String(s.value)]),
      ]
      for (const t of strings) expect(t).not.toMatch(/NaN|Infinity|undefined|null/)
    }
  })
})

describe('AC5/AC31: purity', () => {
  it('AC5: the model does not mutate frozen inputs', () => {
    const r = deepFreeze(roster(3, 0, 5))
    const d = deepFreeze({ ...def })
    expect(() => buildShareRow(d, r)).not.toThrow()
    expect(() => legendItems(r)).not.toThrow()
  })
  it('AC18: calling twice gives equal results', () => {
    const r = roster(3, 4, 5)
    expect(buildShareRow(def, r)).toEqual(buildShareRow(def, r))
  })
})

describe('AC24/AC25: legendItems', () => {
  it('AC24: lists every player in roster order, with full names', () => {
    const r = [entry('a', 'Ada Brindle', 0), entry('b', 'Cher', null), entry('c', 'D E F', -2)]
    const items = legendItems(r)
    expect(items.map((i) => i.name)).toEqual(['Ada Brindle', 'Cher', 'D E F'])
  })
  it('AC25: colours are the series colours by index and wrap after 8', () => {
    const items = legendItems(roster(...Array.from({ length: 10 }, () => 1)))
    expect(items.map((i) => i.color)).toEqual(Array.from({ length: 10 }, (_, i) => seriesColor(i)))
    expect(items[8]?.color).toBe(items[0]?.color)
  })
  it('AC25: legend colours equal the segment colours of the same player', () => {
    const r = roster(1, 0, 1, 1)
    const items = legendItems(r)
    const row = buildShareRow(def, r)
    expect(row.segments.map((s) => s.color)).toEqual([0, 2, 3].map((i) => items[i]?.color))
  })
  it('AC20: an empty roster gives an empty legend', () => {
    expect(legendItems([])).toEqual([])
  })
})

describe('AC12: tooltipLeft', () => {
  it('AC12: centres the tooltip on the segment centre', () => {
    expect(tooltipLeft(200, 100, 400)).toBe(150)
  })
  it('AC12: clamps to the left edge', () => {
    expect(tooltipLeft(20, 100, 400)).toBe(0)
  })
  it('AC12: clamps to the right edge', () => {
    expect(tooltipLeft(390, 100, 400)).toBe(300)
  })
  it('AC12: a tooltip wider than the wrapper starts at 0', () => {
    expect(tooltipLeft(100, 500, 400)).toBe(0)
  })
})
