import { describe, expect, it } from 'vitest'
import type { RosterEntry, RosterUnitDef, StatDef } from '../../domain/types'
import { seriesColor } from '../../styles/series'
import {
  barPercent,
  buildRosterTable,
  cellText,
  columnLeaders,
  playerMeta,
  sortRosterEntries,
  tableColumns,
} from './rosterModel'

const DASH = '—'
const DOT = '·'

type V = number | null | undefined

function entry(id: string, value: V, extra: Partial<RosterEntry> = {}): RosterEntry {
  return {
    id,
    name: `Name ${id}`,
    position: 'ZP',
    stats: value === undefined ? {} : { zk: value },
    ...extra,
  }
}

function roster(...values: V[]): RosterEntry[] {
  return values.map((v, i) => entry(`r${i}`, v))
}

function ids(list: readonly RosterEntry[]): string[] {
  return list.map((e) => e.id)
}

function idx(list: readonly RosterEntry[], source: readonly RosterEntry[]): number[] {
  return list.map((e) => source.indexOf(e))
}

function deepFreeze<T>(value: T): T {
  if (value && typeof value === 'object') {
    for (const v of Object.values(value)) deepFreeze(v)
    Object.freeze(value)
  }
  return value
}

describe('AC5: sortRosterEntries worked example', () => {
  const r = roster(3, null, 5, 3, undefined, 5)
  it('AC5: descending gives index order [2, 5, 0, 3, 1, 4]', () => {
    expect(idx(sortRosterEntries(r, 'zk', -1), r)).toEqual([2, 5, 0, 3, 1, 4])
  })
  it('AC5: ascending gives index order [0, 3, 2, 5, 1, 4]', () => {
    expect(idx(sortRosterEntries(r, 'zk', 1), r)).toEqual([0, 3, 2, 5, 1, 4])
  })
})

describe('AC1/AC2: sortRosterEntries ordering and purity', () => {
  it('AC2: orders numeric values descending', () => {
    expect(ids(sortRosterEntries(roster(1, 9, 4), 'zk', -1))).toEqual(['r1', 'r2', 'r0'])
  })
  it('AC2: orders numeric values ascending', () => {
    expect(ids(sortRosterEntries(roster(1, 9, 4), 'zk', 1))).toEqual(['r0', 'r2', 'r1'])
  })
  it('AC2: handles negatives and zero', () => {
    const r = roster(0, -3, 2, -1)
    expect(ids(sortRosterEntries(r, 'zk', 1))).toEqual(['r1', 'r3', 'r0', 'r2'])
    expect(ids(sortRosterEntries(r, 'zk', -1))).toEqual(['r2', 'r0', 'r3', 'r1'])
  })
  it('AC2: zero is a number, not a missing value', () => {
    expect(ids(sortRosterEntries(roster(null, 0), 'zk', -1))).toEqual(['r1', 'r0'])
    expect(ids(sortRosterEntries(roster(null, 0), 'zk', 1))).toEqual(['r1', 'r0'])
  })
  it('AC1: returns a new array holding the same entry objects', () => {
    const r = roster(2, 1)
    const out = sortRosterEntries(r, 'zk', 1)
    expect(out).not.toBe(r)
    expect(out[0]).toBe(r[1])
    expect(out[1]).toBe(r[0])
  })
  it('AC1: a frozen input and frozen entries are not mutated and do not throw', () => {
    const r = deepFreeze(roster(3, null, 5, 3, undefined, 5))
    const before = JSON.stringify(r)
    expect(() => sortRosterEntries(r, 'zk', -1)).not.toThrow()
    expect(() => sortRosterEntries(r, 'zk', 1)).not.toThrow()
    expect(JSON.stringify(r)).toBe(before)
    expect(ids(r)).toEqual(['r0', 'r1', 'r2', 'r3', 'r4', 'r5'])
  })
  it('AC1: a new array is returned even when nothing moves', () => {
    const r = roster(3, 2, 1)
    const out = sortRosterEntries(r, 'zk', -1)
    expect(out).not.toBe(r)
    expect(out).toEqual(r)
  })
})

describe('AC3: non-numeric values go last in both directions', () => {
  const r = roster(null, 2, undefined, NaN, 7, Infinity, -Infinity, 1)
  const numeric = ['r4', 'r1', 'r7']
  const rest = ['r0', 'r2', 'r3', 'r5', 'r6']
  it('AC3: descending puts null, missing, NaN and +/-Infinity last in original order', () => {
    expect(ids(sortRosterEntries(r, 'zk', -1))).toEqual([...numeric, ...rest])
  })
  it('AC3: ascending puts them last in original order too', () => {
    expect(ids(sortRosterEntries(r, 'zk', 1))).toEqual(['r7', 'r1', 'r4', ...rest])
  })
  it('AC3: an all-non-numeric roster keeps its order in both directions', () => {
    const none = roster(null, undefined, NaN, Infinity)
    expect(ids(sortRosterEntries(none, 'zk', -1))).toEqual(['r0', 'r1', 'r2', 'r3'])
    expect(ids(sortRosterEntries(none, 'zk', 1))).toEqual(['r0', 'r1', 'r2', 'r3'])
  })
})

describe('AC4: ties keep roster order in both directions', () => {
  const r = roster(5, 5, 5)
  it('AC4: all-equal values keep order descending', () => {
    expect(ids(sortRosterEntries(r, 'zk', -1))).toEqual(['r0', 'r1', 'r2'])
  })
  it('AC4: all-equal values keep order ascending (not reversed)', () => {
    expect(ids(sortRosterEntries(r, 'zk', 1))).toEqual(['r0', 'r1', 'r2'])
  })
  it('AC4: tied groups keep order inside each group', () => {
    const t = roster(2, 9, 2, 9, 2)
    expect(ids(sortRosterEntries(t, 'zk', -1))).toEqual(['r1', 'r3', 'r0', 'r2', 'r4'])
    expect(ids(sortRosterEntries(t, 'zk', 1))).toEqual(['r0', 'r2', 'r4', 'r1', 'r3'])
  })
  it('AC4: 0 and -0 are tied', () => {
    expect(ids(sortRosterEntries(roster(0, -0, 0), 'zk', 1))).toEqual(['r0', 'r1', 'r2'])
    expect(ids(sortRosterEntries(roster(-0, 0, -0), 'zk', -1))).toEqual(['r0', 'r1', 'r2'])
  })
})

describe('AC5: empty rosters and unknown keys', () => {
  it('AC5: an empty roster gives a new empty array', () => {
    const r: RosterEntry[] = []
    const out = sortRosterEntries(r, 'zk', -1)
    expect(out).toEqual([])
    expect(out).not.toBe(r)
    expect(sortRosterEntries(r, 'zk', 1)).toEqual([])
  })
  it('AC5: a key no entry has keeps the original order in both directions', () => {
    const r = roster(3, 1, 2)
    expect(ids(sortRosterEntries(r, 'nokey', -1))).toEqual(['r0', 'r1', 'r2'])
    expect(ids(sortRosterEntries(r, 'nokey', 1))).toEqual(['r0', 'r1', 'r2'])
  })
  it('AC5: a one-entry roster comes back unchanged', () => {
    const r = roster(4)
    expect(sortRosterEntries(r, 'zk', 1)).toEqual(r)
  })
})

describe('AC1-AC4: seeded random property loop', () => {
  // Small deterministic PRNG (mulberry32).
  function rng(seed: number): () => number {
    let a = seed
    return () => {
      a = (a + 0x6d2b79f5) | 0
      let t = Math.imul(a ^ (a >>> 15), 1 | a)
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296
    }
  }
  const pool: V[] = [null, undefined, NaN, Infinity, -Infinity, 0, 1, 2, 3, -1, 2.5]
  const isNum = (v: V): v is number => typeof v === 'number' && Number.isFinite(v)

  it('AC1-AC4: sorted output is a stable permutation with non-numeric values last', () => {
    const next = rng(20240229)
    for (let round = 0; round < 300; round++) {
      const n = Math.floor(next() * 14)
      const values = Array.from({ length: n }, () => pool[Math.floor(next() * pool.length)])
      const r = roster(...values)
      for (const dir of [-1, 1] as const) {
        const out = sortRosterEntries(r, 'zk', dir)
        expect(out).toHaveLength(n)
        expect([...ids(out)].sort()).toEqual([...ids(r)].sort())
        const vals = out.map((e) => e.stats['zk'])
        const firstBad = vals.findIndex((v) => !isNum(v))
        const numericPart = firstBad === -1 ? vals : vals.slice(0, firstBad)
        const tail = firstBad === -1 ? [] : vals.slice(firstBad)
        // nulls-last: nothing numeric after the first non-numeric
        expect(tail.some(isNum)).toBe(false)
        // numeric part ordered
        for (let i = 1; i < numericPart.length; i++) {
          const a = numericPart[i - 1] as number
          const b = numericPart[i] as number
          expect(dir === -1 ? a >= b : a <= b).toBe(true)
        }
        // stability: equal-valued (and all non-numeric) neighbours keep roster order
        const unstable: string[] = []
        for (let i = 1; i < out.length; i++) {
          const a = out[i - 1]
          const b = out[i]
          const va = a.stats['zk']
          const vb = b.stats['zk']
          const sameGroup = (isNum(va) && isNum(vb) && va === vb) || (!isNum(va) && !isNum(vb))
          if (sameGroup && r.indexOf(a) > r.indexOf(b)) unstable.push(`${a.id}>${b.id}`)
        }
        expect(unstable).toEqual([])
        // does not mutate input
        expect(ids(r)).toEqual(values.map((_, i) => `r${i}`))
      }
    }
  })
})

describe('AC10: tableColumns', () => {
  const d = (key: string, extra?: boolean): StatDef => ({
    key,
    label: key.toUpperCase(),
    group: 'g',
    ...(extra ? { extra: true } : {}),
  })
  const unit = (stats: StatDef[]): RosterUnitDef => ({ key: 'zu', label: 'Zu', stats })

  it('AC10: drops extra defs and keeps definition order', () => {
    const u = unit([d('c'), d('a', true), d('b'), d('e', true), d('z')])
    expect(tableColumns(u).map((s) => s.key)).toEqual(['c', 'b', 'z'])
  })
  it('AC10: a unit with no stats has no columns', () => {
    expect(tableColumns(unit([]))).toEqual([])
  })
  it('AC10: a unit of only extra stats has no columns', () => {
    expect(tableColumns(unit([d('a', true)]))).toEqual([])
  })
  it('AC10: does not mutate the unit', () => {
    const u = deepFreeze(unit([d('a'), d('b', true)]))
    expect(() => tableColumns(u)).not.toThrow()
  })
})

describe('AC19: columnLeaders', () => {
  const def: StatDef = { key: 'zk', label: 'Zk', group: 'g' }
  const leaders = (...values: V[]) => [...columnLeaders(roster(...values), def)].sort()

  it('AC19: a single maximum leads', () => {
    expect(leaders(1, 7, 3)).toEqual(['r1'])
  })
  it('AC19: tied maxima all lead', () => {
    expect(leaders(7, 1, 7)).toEqual(['r0', 'r2'])
  })
  it('AC19: all entries tied at a positive value all lead', () => {
    expect(leaders(4, 4, 4)).toEqual(['r0', 'r1', 'r2'])
  })
  it('AC19: all null, all missing, all zero and all negative give no leader', () => {
    expect(leaders(null, null)).toEqual([])
    expect(leaders(undefined, undefined)).toEqual([])
    expect(leaders(0, 0, 0)).toEqual([])
    expect(leaders(-3, -1, -2)).toEqual([])
  })
  it('AC19: mixed zero, negative and null gives no leader (zero max)', () => {
    expect(leaders(-2, 0, null, 0, undefined)).toEqual([])
  })
  it('AC19: a zero max with a negative does not promote the zero', () => {
    expect(leaders(0, -1)).toEqual([])
  })
  it('AC19: a one-player roster with a positive value leads', () => {
    expect(leaders(5)).toEqual(['r0'])
  })
  it('AC19: a one-player roster with zero, null or negative does not', () => {
    expect(leaders(0)).toEqual([])
    expect(leaders(null)).toEqual([])
    expect(leaders(-1)).toEqual([])
  })
  it('AC19: an empty roster has no leaders', () => {
    expect(leaders()).toEqual([])
  })
  it('AC19: non-finite values are ignored', () => {
    expect(leaders(Infinity, 2, NaN, 1)).toEqual(['r1'])
    expect(leaders(Infinity, NaN)).toEqual([])
    expect(leaders(Infinity, 0)).toEqual([])
  })
  it('AC19: a small positive fractional max leads', () => {
    expect(leaders(0.1, 0, null)).toEqual(['r0'])
  })
  it('AC19: leaders do not depend on input order', () => {
    const r = roster(3, 9, null, 9, 1)
    const reversed = [...r].reverse()
    expect([...columnLeaders(r, def)].sort()).toEqual([...columnLeaders(reversed, def)].sort())
    expect([...columnLeaders(r, def)].sort()).toEqual(['r1', 'r3'])
  })
  it('AC19: a stat key absent from some entries only uses the entries that have it', () => {
    expect(leaders(undefined, 2, undefined)).toEqual(['r1'])
  })
})

describe('AC17: cellText', () => {
  const plain: StatDef = { key: 'k', label: 'K', group: 'g' }
  const dec: StatDef = { key: 'k', label: 'K', group: 'g', decimals: 1 }
  const pct: StatDef = { key: 'k', label: 'K', group: 'g', percent: true }
  const bad: V[] = [null, undefined, NaN, Infinity, -Infinity]

  it('AC17: groups thousands in en-US', () => {
    expect(cellText(1234, plain)).toBe('1,234')
  })
  it('AC17: honours decimals', () => {
    expect(cellText(4.82, dec)).toBe('4.8')
  })
  it('AC17: zero is "0", not a placeholder', () => {
    expect(cellText(0, plain)).toBe('0')
  })
  it('AC17: percent stats append %', () => {
    expect(cellText(87, pct)).toBe('87%')
    expect(cellText(0, pct)).toBe('0%')
  })
  it('AC17: percent plus decimals', () => {
    expect(cellText(87.26, { ...pct, decimals: 1 })).toBe('87.3%')
  })
  it('AC17: null, missing, NaN and Infinity show a bare dash', () => {
    for (const v of bad) {
      expect(cellText(v, plain)).toBe(DASH)
      expect(cellText(v, dec)).toBe(DASH)
    }
  })
  it('AC17: placeholders never carry a % even for percent stats', () => {
    for (const v of bad) expect(cellText(v, pct)).toBe(DASH)
  })
})

describe('AC18: barPercent', () => {
  it('AC18: passes through values in range', () => {
    expect(barPercent(87)).toBe(87)
    expect(barPercent(0)).toBe(0)
    expect(barPercent(100)).toBe(100)
    expect(barPercent(33.5)).toBe(33.5)
  })
  it('AC18: clamps below 0 and above 100', () => {
    expect(barPercent(-5)).toBe(0)
    expect(barPercent(140)).toBe(100)
    expect(barPercent(100.0001)).toBe(100)
    expect(barPercent(-0.0001)).toBe(0)
  })
  it('AC18: null, missing and non-finite give 0', () => {
    expect(barPercent(null)).toBe(0)
    expect(barPercent(undefined)).toBe(0)
    expect(barPercent(NaN)).toBe(0)
    expect(barPercent(Infinity)).toBe(0)
    expect(barPercent(-Infinity)).toBe(0)
  })
})

describe('AC21: playerMeta', () => {
  it(`AC21: position ${DOT} #number when a number exists`, () => {
    expect(playerMeta(entry('a', 1, { position: 'WR', number: 11 }))).toBe(`WR ${DOT} #11`)
  })
  it('AC21: number 0 is still shown', () => {
    expect(playerMeta(entry('a', 1, { position: 'QB', number: 0 }))).toBe(`QB ${DOT} #0`)
  })
  it('AC21: just the position when number is absent', () => {
    expect(playerMeta(entry('a', 1, { position: 'WR' }))).toBe('WR')
  })
})

describe('AC10/AC11/AC13/AC14/AC17-AC19/AC21: buildRosterTable', () => {
  const defs: StatDef[] = [
    { key: 'zpct', label: 'Zpct', group: 'g', percent: true },
    { key: 'zcnt', label: 'Zcnt', group: 'g' },
    { key: 'zhid', label: 'Zhid', group: 'g', extra: true },
    { key: 'zavg', label: 'Zavg', group: 'g', decimals: 1 },
  ]
  const unit: RosterUnitDef = { key: 'zu', label: 'Zu', stats: defs }
  const players: RosterEntry[] = [
    {
      id: 'p0',
      name: 'Aa Bb',
      position: 'ZA',
      number: 3,
      stats: { zpct: 40, zcnt: 1200, zhid: 9, zavg: 4.84 },
    },
    { id: 'p1', name: 'Cc Dd', position: 'ZB', stats: { zpct: 90, zcnt: null, zhid: 1, zavg: 2 } },
    {
      id: 'p2',
      name: 'Ee Ff',
      position: 'ZC',
      number: 12,
      stats: { zpct: 90, zcnt: 5, zhid: 2, zavg: null },
    },
    { id: 'p3', name: 'Gg Hh', position: 'ZD', number: 7, stats: { zpct: null, zcnt: 5, zhid: 3 } },
  ]
  const build = (k: string, d: -1 | 1, list: RosterEntry[] = players) =>
    buildRosterTable(unit, list, { k, d })
  const rowIds = (t: ReturnType<typeof build>) => t.rows.map((r) => r.id)

  it('AC10: columns are the non-extra defs in order with their labels', () => {
    const t = build('zpct', -1)
    expect(t.columns.map((c) => c.key)).toEqual(['zpct', 'zcnt', 'zavg'])
    expect(t.columns.map((c) => c.label)).toEqual(['Zpct', 'Zcnt', 'Zavg'])
    expect(t.columns.map((c) => c.percent)).toEqual([true, false, false])
  })

  it('AC13/AC14: a descending sort marks only that column, with a down arrow', () => {
    const t = build('zcnt', -1)
    expect(t.columns.map((c) => c.ariaSort)).toEqual(['none', 'descending', 'none'])
    expect(t.columns.map((c) => c.arrow)).toEqual([null, '↓', null])
  })

  it('AC13/AC14: an ascending sort marks only that column, with an up arrow', () => {
    const t = build('zavg', 1)
    expect(t.columns.map((c) => c.ariaSort)).toEqual(['none', 'none', 'ascending'])
    expect(t.columns.map((c) => c.arrow)).toEqual([null, null, '↑'])
  })

  it('AC11/AC13: an unknown key marks nothing and keeps roster order', () => {
    const t = build('nokey', -1)
    expect(t.columns.every((c) => c.ariaSort === 'none' && c.arrow === null)).toBe(true)
    expect(rowIds(t)).toEqual(['p0', 'p1', 'p2', 'p3'])
  })

  it('AC11: an extra stat key is not sortable, so rows stay in roster order', () => {
    const t = build('zhid', -1)
    expect(t.columns.every((c) => c.ariaSort === 'none' && c.arrow === null)).toBe(true)
    expect(rowIds(t)).toEqual(['p0', 'p1', 'p2', 'p3'])
  })

  it('AC11: rows follow the sort for a visible key, nulls last and ties stable', () => {
    expect(rowIds(build('zpct', -1))).toEqual(['p1', 'p2', 'p0', 'p3'])
    expect(rowIds(build('zpct', 1))).toEqual(['p0', 'p1', 'p2', 'p3'])
    expect(rowIds(build('zcnt', -1))).toEqual(['p0', 'p2', 'p3', 'p1'])
    expect(rowIds(build('zcnt', 1))).toEqual(['p2', 'p3', 'p0', 'p1'])
  })

  it('AC21: row colour is the unsorted roster index, whatever the sort', () => {
    for (const [k, d] of [
      ['zpct', -1],
      ['zcnt', 1],
      ['nokey', -1],
    ] as const) {
      const t = build(k, d)
      for (const row of t.rows) {
        const i = players.findIndex((p) => p.id === row.id)
        expect(row.color).toBe(seriesColor(i))
      }
    }
  })

  it('AC21: name and meta come from the entry', () => {
    const t = build('zpct', -1)
    const p0 = t.rows.find((r) => r.id === 'p0')
    const p1 = t.rows.find((r) => r.id === 'p1')
    expect(p0?.name).toBe('Aa Bb')
    expect(p0?.meta).toBe(`ZA ${DOT} #3`)
    expect(p1?.meta).toBe('ZB')
  })

  it('AC19: leader flags per row and column are the same under any sort', () => {
    const flags = (t: ReturnType<typeof build>) =>
      Object.fromEntries(t.rows.map((r) => [r.id, r.cells.map((c) => c.leader)]))
    const base = flags(build('nokey', -1))
    expect(base).toEqual({
      p0: [false, true, true],
      p1: [true, false, false],
      p2: [true, false, false],
      p3: [false, false, false],
    })
    // zcnt max 1200 -> p0 only; zpct max 90 -> p1 and p2; zavg max 4.84 -> p0
    expect(flags(build('zpct', 1))).toEqual(base)
    expect(flags(build('zcnt', -1))).toEqual(base)
    expect(flags(build('zavg', -1))).toEqual(base)
  })

  it('AC17: cell text uses the column format, with % for percent and a dash for null', () => {
    const t = build('nokey', -1)
    const text = (id: string) => t.rows.find((r) => r.id === id)?.cells.map((c) => c.text)
    expect(text('p0')).toEqual(['40%', '1,200', '4.8'])
    expect(text('p1')).toEqual(['90%', DASH, '2.0'])
    expect(text('p3')).toEqual([DASH, '5', DASH])
  })

  it('AC18: bar is null for non-percent columns and clamped 0-100 for percent ones', () => {
    const t = build('nokey', -1)
    const bars = (id: string) => t.rows.find((r) => r.id === id)?.cells.map((c) => c.bar)
    expect(bars('p0')).toEqual([40, null, null])
    expect(bars('p3')).toEqual([0, null, null])
    const wild = [
      entry('w0', 140, { stats: { zpct: 140 } }),
      entry('w1', -5, { stats: { zpct: -5 } }),
    ]
    const w = build('nokey', -1, wild)
    expect(w.rows.map((r) => r.cells[0].bar)).toEqual([100, 0])
  })

  it('AC17: cells carry their column key, in column order', () => {
    const t = build('zcnt', -1)
    for (const row of t.rows) expect(row.cells.map((c) => c.key)).toEqual(['zpct', 'zcnt', 'zavg'])
  })

  it('AC17: no output string contains NaN, Infinity, null or undefined', () => {
    const nasty: RosterEntry[] = [
      entry('n0', NaN, { stats: { zpct: NaN, zcnt: Infinity, zavg: -Infinity } }),
      entry('n1', null, { stats: { zpct: null, zcnt: null } }),
      entry('n2', undefined, { stats: {} }),
    ]
    const t = build('zpct', -1, nasty)
    const strings = [
      ...t.columns.flatMap((c) => [c.label, c.ariaSort, c.arrow ?? '']),
      ...t.rows.flatMap((r) => [r.name, r.meta, ...r.cells.map((c) => c.text)]),
    ].join('|')
    for (const word of ['NaN', 'Infinity', '∞', 'null', 'undefined']) {
      expect(strings).not.toContain(word)
    }
    for (const row of t.rows) {
      for (const c of row.cells) expect(c.leader).toBe(false)
    }
  })

  it('AC1: does not mutate a frozen roster or unit', () => {
    const r = deepFreeze(players.map((p) => ({ ...p, stats: { ...p.stats } })))
    const u = deepFreeze({ ...unit, stats: defs.map((s) => ({ ...s })) })
    expect(() => buildRosterTable(u, r, { k: 'zpct', d: -1 })).not.toThrow()
  })

  it('A13: an empty roster gives the columns and no rows', () => {
    const t = build('zpct', -1, [])
    expect(t.columns).toHaveLength(3)
    expect(t.rows).toEqual([])
  })

  it('AC19: a one-player roster with a positive value has a leader cell', () => {
    const t = build('zpct', -1, [players[0]])
    expect(t.rows[0].cells.map((c) => c.leader)).toEqual([true, true, true])
  })
})
