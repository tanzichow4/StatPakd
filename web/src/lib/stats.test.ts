import { describe, expect, it } from 'vitest'
import statsSource from './stats.ts?raw'
import { buildPlayers, buildTeams, playerStatDefs, teamStatDefs } from '../data/nfl'
import type { Entity, StatDef, StatValue } from '../domain/types'
import {
  NULL_PLACEHOLDER,
  barWidth,
  bestIndex,
  formatStat,
  leagueRange,
  normalize,
  type StatRange,
} from './stats'

// ---------------------------------------------------------------------------
// Shared fixtures
// ---------------------------------------------------------------------------

const DASH = '—'

/** Small def helper; keys are irrelevant to the pure functions. */
function def(extra: Partial<StatDef> = {}): StatDef {
  return { key: 'k', label: 'K', group: 'G', ...extra }
}

function byKey(defs: StatDef[], key: string): StatDef {
  const found = defs.find((d) => d.key === key)
  if (!found) throw new Error(`missing def ${key}`)
  return found
}

const TEAM_DEFS = teamStatDefs()
const PLAYER_DEFS = playerStatDefs()
const INT_DEF = byKey(PLAYER_DEFS, 'int') // lowerIsBetter
const PAPG_DEF = byKey(TEAM_DEFS, 'papg') // lowerIsBetter, decimals 1
const TO_DEF = byKey(TEAM_DEFS, 'to') // signed
const PDIFF_DEF = byKey(TEAM_DEFS, 'pdiff') // signed, decimals 1

function ent(stats: Record<string, StatValue>, id = 'e'): Entity {
  return { id, name: id, shortName: id, meta: '', badge: '', stats }
}

// ---------------------------------------------------------------------------
// formatStat (AC1 to AC5)
// ---------------------------------------------------------------------------

describe('formatStat', () => {
  it('exports the em dash placeholder (U+2014)', () => {
    expect(NULL_PLACEHOLDER).toBe(DASH)
  })

  const nullCases: [string, StatValue | undefined, StatDef][] = [
    ['null, plain def', null, def()],
    ['undefined, plain def', undefined, def()],
    ['null, decimals 1', null, def({ decimals: 1 })],
    ['undefined, decimals 1', undefined, def({ decimals: 1 })],
    ['null, signed', null, def({ signed: true })],
    ['undefined, signed + decimals', undefined, def({ signed: true, decimals: 2 })],
    ['null, T04 to', null, TO_DEF],
    ['null, T04 pdiff', null, PDIFF_DEF],
  ]
  it.each(nullCases)('AC1: returns an em dash for %s', (_n, value, d) => {
    expect(formatStat(value, d)).toBe(DASH)
  })

  const decimalCases: [number, number, string][] = [
    [64.25, 1, '64.3'],
    [7, 1, '7.0'],
    [1234.5, 1, '1234.5'],
    [0, 1, '0.0'],
    [1234567.891, 2, '1234567.89'],
    [-3.14159, 3, '-3.142'],
    [0.05, 1, (0.05).toFixed(1)],
    [1.005, 2, (1.005).toFixed(2)],
  ]
  it.each(decimalCases)(
    'AC2: value %s with decimals %s gives %s (toFixed, no separator)',
    (v, dec, out) => {
      expect(formatStat(v, def({ decimals: dec }))).toBe(out)
      expect(formatStat(v, def({ decimals: dec }))).toBe(v.toFixed(dec))
    },
  )

  const localeCases: [string, number, Partial<StatDef>, string][] = [
    ['decimals absent, 4806', 4806, {}, '4,806'],
    ['decimals absent, -1200', -1200, {}, '-1,200'],
    ['decimals absent, 12.3456', 12.3456, {}, '12.346'],
    ['decimals absent, 0', 0, {}, '0'],
    ['decimals absent, 999 (no separator needed)', 999, {}, '999'],
    ['decimals absent, 1000 boundary', 1000, {}, '1,000'],
    ['decimals absent, 1234567', 1234567, {}, '1,234,567'],
    ['decimals 0, 12.3456 follows design truthiness (A1)', 12.3456, { decimals: 0 }, '12.346'],
    ['decimals 0, 4806', 4806, { decimals: 0 }, '4,806'],
    ['decimals undefined explicitly, 4806', 4806, { decimals: undefined }, '4,806'],
  ]
  it.each(localeCases)('AC3: %s', (_n, v, extra, out) => {
    expect(formatStat(v, def(extra))).toBe(out)
    expect(formatStat(v, def(extra))).toBe(v.toLocaleString('en-US'))
  })

  const signedCases: [string, number, Partial<StatDef>, string][] = [
    ['positive integer', 3, { signed: true }, '+3'],
    ['positive with decimals 1', 2.5, { signed: true, decimals: 1 }, '+2.5'],
    ['negative integer', -1, { signed: true }, '-1'],
    ['negative with decimals', -2.5, { signed: true, decimals: 1 }, '-2.5'],
    ['zero', 0, { signed: true }, '0'],
    ['zero with decimals', 0, { signed: true, decimals: 1 }, '0.0'],
    ['large positive gets separator', 1200, { signed: true }, '+1,200'],
    ['small positive that rounds to .0', 0.04, { signed: true, decimals: 1 }, '+0.0'],
  ]
  it.each(signedCases)('AC4: signed %s', (_n, v, extra, out) => {
    expect(formatStat(v, def(extra))).toBe(out)
  })

  const unsignedCases: [string, number, Partial<StatDef>, string][] = [
    ['signed absent, positive', 3, {}, '3'],
    ['signed false, positive', 3, { signed: false }, '3'],
    ['signed false, positive decimals', 2.5, { signed: false, decimals: 1 }, '2.5'],
    ['signed absent, negative', -1, {}, '-1'],
    ['signed false, zero', 0, { signed: false }, '0'],
  ]
  it.each(unsignedCases)('AC5: not signed gives no plus (%s)', (_n, v, extra, out) => {
    expect(formatStat(v, def(extra))).toBe(out)
    expect(formatStat(v, def(extra))).not.toContain('+')
  })

  it('AC19: T04 signed defs format as the design does', () => {
    expect(formatStat(5, TO_DEF)).toBe('+5')
    expect(formatStat(-4, TO_DEF)).toBe('-4')
    expect(formatStat(0, TO_DEF)).toBe('0')
    expect(formatStat(6.25, PDIFF_DEF)).toBe('+6.3')
    expect(formatStat(-3.4, PDIFF_DEF)).toBe('-3.4')
    expect(formatStat(21.04, PAPG_DEF)).toBe('21.0')
    expect(formatStat(17, INT_DEF)).toBe('17')
  })
})

// ---------------------------------------------------------------------------
// bestIndex (AC6 to AC10)
// ---------------------------------------------------------------------------

describe('bestIndex', () => {
  const high = def()
  const low = def({ lowerIsBetter: true })
  const lowFalse = def({ lowerIsBetter: false })

  const cases: [string, string, (StatValue | undefined)[], StatDef, number[]][] = [
    ['AC7', 'higher is best by default', [1, 5, 3], high, [1]],
    ['AC7', 'higher is best when lowerIsBetter is false', [1, 5, 3], lowFalse, [1]],
    ['AC7', 'lowerIsBetter picks the smallest', [4, 1, 3], low, [1]],
    ['AC7', 'T04 int is lower-is-better', [12, 5, 9], INT_DEF, [1]],
    ['AC7', 'T04 papg is lower-is-better', [24.1, 19.3, 20], PAPG_DEF, [1]],
    ['AC7', 'T04 to (higher best) ', [3, -2, 7], TO_DEF, [2]],
    ['AC7', 'negative values, higher best', [-5, -2, -9], high, [1]],
    ['AC7', 'negative values, lower best', [-5, -2, -9], low, [2]],
    ['AC7', 'zero beats negatives when higher is best', [-1, 0], high, [1]],
    ['AC6', 'best at first index', [9, 2, 3], high, [0]],
    ['AC6', 'best at last index', [2, 3, 9], high, [2]],
    ['AC9', 'tie for highest returns all, ascending', [7, 3, 7, 7], high, [0, 2, 3]],
    ['AC9', 'tie for lowest returns all, ascending', [2, 5, 2], low, [0, 2]],
    ['AC9', 'exactly two equal values are both best', [4, 4], high, [0, 1]],
    ['AC9', 'all equal values are all best', [1, 1, 1], low, [0, 1, 2]],
    ['AC9', 'ties at zero', [0, 0], high, [0, 1]],
    ['AC8', 'nulls are skipped when choosing the best', [null, 5, 8, null], high, [2]],
    ['AC8', 'undefined is skipped when choosing the best', [undefined, 5, 8], high, [2]],
    ['AC8', 'null at the would-be best position is ignored (low)', [null, 5, 8], low, [1]],
    ['AC8', 'null is never treated as zero (low)', [null, 3, 4], low, [1]],
    ['AC8', 'null is never treated as zero (high, negatives)', [null, -3, -4], high, [1]],
    ['AC8', 'mixed null and undefined with ties', [null, 6, undefined, 6], high, [1, 3]],
    ['AC10', 'empty input', [], high, []],
    ['AC10', 'all null', [null, null, null], high, []],
    ['AC10', 'all null / undefined (low)', [null, undefined], low, []],
    ['AC10', 'single value', [5], high, []],
    ['AC10', 'single value (low)', [5], low, []],
    ['AC10', 'single non-null among nulls', [null, 5, null], high, []],
    ['AC10', 'single non-null among undefined', [undefined, 5, undefined], low, []],
    ['AC10', 'single zero among nulls', [null, 0], high, []],
  ]
  it.each(cases)('%s: %s', (_ac, _n, values, d, expected) => {
    expect(bestIndex(values, d)).toEqual(expected)
  })

  it('AC6: result is ascending even for many ties', () => {
    const r = bestIndex([5, 1, 5, 2, 5, 5], high)
    expect(r).toEqual([0, 2, 4, 5])
    expect(r).toEqual([...r].sort((a, b) => a - b))
  })

  it('AC6: always returns an array', () => {
    expect(Array.isArray(bestIndex([], high))).toBe(true)
    expect(Array.isArray(bestIndex([1, 2], high))).toBe(true)
  })

  it('AC9: equality is exact, with no epsilon', () => {
    expect(bestIndex([0.3, 0.1 + 0.2], high)).toEqual([1])
  })
})

// ---------------------------------------------------------------------------
// leagueRange (AC11, AC12)
// ---------------------------------------------------------------------------

describe('leagueRange', () => {
  const cases: [string, string, Entity[], StatRange][] = [
    [
      'AC11',
      'min and max over several entities',
      [ent({ k: 3 }), ent({ k: 9 }), ent({ k: 5 })],
      { min: 3, max: 9 },
    ],
    [
      'AC11',
      'ignores null values',
      [ent({ k: null }), ent({ k: 4 }), ent({ k: 2 }), ent({ k: null })],
      { min: 2, max: 4 },
    ],
    [
      'AC11',
      'ignores missing keys',
      [ent({}), ent({ k: 4 }), ent({ other: 100 }), ent({ k: 8 })],
      { min: 4, max: 8 },
    ],
    [
      'AC11',
      'negative values',
      [ent({ k: -4 }), ent({ k: -9 }), ent({ k: 2 })],
      { min: -9, max: 2 },
    ],
    [
      'AC11',
      'zero is a real value, not ignored',
      [ent({ k: 0 }), ent({ k: 5 })],
      { min: 0, max: 5 },
    ],
    ['AC11', 'zero as the maximum', [ent({ k: -3 }), ent({ k: 0 })], { min: -3, max: 0 }],
    ['AC11', 'descending order', [ent({ k: 9 }), ent({ k: 5 }), ent({ k: 1 })], { min: 1, max: 9 }],
    ['AC11', 'ascending order', [ent({ k: 1 }), ent({ k: 5 }), ent({ k: 9 })], { min: 1, max: 9 }],
    [
      'AC11',
      'middle value neither new min nor max',
      [ent({ k: 1 }), ent({ k: 9 }), ent({ k: 5 })],
      { min: 1, max: 9 },
    ],
    ['AC11', 'single value gives min === max', [ent({ k: 7 })], { min: 7, max: 7 }],
    [
      'AC11',
      'single non-null among nulls',
      [ent({ k: null }), ent({ k: 7 }), ent({})],
      { min: 7, max: 7 },
    ],
    ['AC11', 'equal values', [ent({ k: 7 }), ent({ k: 7 })], { min: 7, max: 7 }],
    ['AC12', 'empty list gives no range', [], null],
    ['AC12', 'all null gives no range', [ent({ k: null }), ent({ k: null })], null],
    ['AC12', 'all missing gives no range', [ent({}), ent({ other: 1 })], null],
    ['AC12', 'only other keys present', [ent({ other: 3 })], null],
  ]
  it.each(cases)('%s: %s', (_ac, _n, entities, expected) => {
    expect(leagueRange(entities, 'k')).toEqual(expected)
  })

  it('AC12: never throws for degenerate input', () => {
    expect(() => leagueRange([], 'k')).not.toThrow()
    expect(() => leagueRange([ent({})], 'nope')).not.toThrow()
  })

  it('AC11: handles a very large pool without overflowing arguments', () => {
    const pool = Array.from({ length: 200_000 }, (_, i) => ent({ k: i }))
    expect(leagueRange(pool, 'k')).toEqual({ min: 0, max: 199_999 })
  })
})

// ---------------------------------------------------------------------------
// normalize (AC13 to AC16, AC18)
// ---------------------------------------------------------------------------

describe('normalize', () => {
  const R: StatRange = { min: 10, max: 20 }
  const high = def()
  const low = def({ lowerIsBetter: true })

  const plainCases: [string, string, StatValue | undefined, StatRange, number][] = [
    ['AC13', 'min gives 0', 10, R, 0],
    ['AC13', 'max gives 1', 20, R, 1],
    ['AC13', 'midpoint gives 0.5', 15, R, 0.5],
    ['AC13', 'quarter point', 12.5, R, 0.25],
    ['AC13', 'negative range min', -10, { min: -10, max: 10 }, 0],
    ['AC13', 'negative range max', 10, { min: -10, max: 10 }, 1],
    ['AC13', 'negative range midpoint', 0, { min: -10, max: 10 }, 0.5],
    ['AC13', 'range starting at zero', 5, { min: 0, max: 10 }, 0.5],
    ['AC14', 'min === max gives 0.5', 7, { min: 7, max: 7 }, 0.5],
    ['AC14', 'min === max at zero gives 0.5', 0, { min: 0, max: 0 }, 0.5],
    ['AC14', 'min === max negative gives 0.5', -3, { min: -3, max: -3 }, 0.5],
    ['AC15', 'null gives 0', null, R, 0],
    ['AC15', 'undefined gives 0', undefined, R, 0],
    ['AC15', 'null with min === max gives 0', null, { min: 7, max: 7 }, 0],
    ['AC18', 'no range, non-null gives 0.5', 12, null, 0.5],
    ['AC18', 'no range, zero gives 0.5', 0, null, 0.5],
    ['AC18', 'no range, null gives 0', null, null, 0],
    ['AC18', 'no range, undefined gives 0', undefined, null, 0],
  ]

  it.each(plainCases)('%s: %s (options omitted)', (_ac, _n, v, r, expected) => {
    expect(normalize(v, r, high)).toBe(expected)
  })
  it.each(plainCases)('%s: %s ({})', (_ac, _n, v, r, expected) => {
    expect(normalize(v, r, high, {})).toBe(expected)
  })
  it.each(plainCases)(
    '%s: %s (lowerIsBetter def, inversion not requested)',
    (_ac, _n, v, r, expected) => {
      expect(normalize(v, r, low)).toBe(expected)
      expect(normalize(v, r, low, {})).toBe(expected)
      expect(normalize(v, r, low, { invertLowerIsBetter: false })).toBe(expected)
    },
  )

  const invertCases: [string, string, StatValue | undefined, StatRange, StatDef, number][] = [
    ['AC16', 'min gives 1', 10, R, low, 1],
    ['AC16', 'max gives 0', 20, R, low, 0],
    ['AC16', 'midpoint stays 0.5', 15, R, low, 0.5],
    ['AC16', 'quarter point gives 0.75', 12.5, R, low, 0.75],
    ['AC16', 'min === max gives 0.5', 7, { min: 7, max: 7 }, low, 0.5],
    ['AC16', 'null still gives 0', null, R, low, 0],
    ['AC16', 'undefined still gives 0', undefined, R, low, 0],
    ['AC16', 'no range, non-null stays 0.5', 3, null, low, 0.5],
    ['AC16', 'no range, null stays 0', null, null, low, 0],
    ['AC16', 'T04 int lower-is-better inverts', 0, { min: 0, max: 10 }, INT_DEF, 1],
    ['AC16', 'T04 papg lower-is-better inverts', 30, { min: 10, max: 30 }, PAPG_DEF, 0],
  ]
  it.each(invertCases)('%s: inversion requested, %s', (_ac, _n, v, r, d, expected) => {
    expect(normalize(v, r, d, { invertLowerIsBetter: true })).toBe(expected)
  })

  it('AC16: inversion requested but lowerIsBetter false does not invert', () => {
    const d = def({ lowerIsBetter: false })
    expect(normalize(10, R, d, { invertLowerIsBetter: true })).toBe(0)
    expect(normalize(20, R, d, { invertLowerIsBetter: true })).toBe(1)
  })

  it('AC16: inversion requested but lowerIsBetter absent does not invert', () => {
    expect(normalize(10, R, high, { invertLowerIsBetter: true })).toBe(0)
    expect(normalize(20, R, high, { invertLowerIsBetter: true })).toBe(1)
  })

  it('AC16: options object with no flag behaves like omitted for lowerIsBetter defs', () => {
    expect(normalize(10, R, low, {})).toBe(normalize(10, R, low))
  })

  it('AC14/AC18: never returns NaN or Infinity', () => {
    const ranges: StatRange[] = [null, { min: 5, max: 5 }, { min: 0, max: 0 }, { min: 0, max: 10 }]
    const values: (StatValue | undefined)[] = [null, undefined, 0, 5, 10]
    for (const r of ranges)
      for (const v of values)
        for (const opts of [undefined, {}, { invertLowerIsBetter: true }])
          for (const d of [high, low]) {
            expect(Number.isFinite(normalize(v, r, d, opts))).toBe(true)
          }
  })

  it('AC13: does not clamp values outside the range (A5)', () => {
    expect(normalize(30, R, high)).toBe(2)
    expect(normalize(0, R, high)).toBe(-1)
  })
})

// ---------------------------------------------------------------------------
// barWidth (AC17, AC18)
// ---------------------------------------------------------------------------

describe('barWidth', () => {
  const R: StatRange = { min: 10, max: 20 }
  const cases: [string, string, StatValue | undefined, StatRange, number][] = [
    ['AC17', 'pool min gives 5', 10, R, 5],
    ['AC17', 'pool max gives 100', 20, R, 100],
    ['AC17', 'midpoint gives 53 (round of 52.5)', 15, R, 53],
    ['AC17', 'min === max gives 53', 7, { min: 7, max: 7 }, 53],
    ['AC17', 'null gives 0', null, R, 0],
    ['AC17', 'undefined gives 0', undefined, R, 0],
    ['AC17', 'null with min === max gives 0', null, { min: 7, max: 7 }, 0],
    ['AC17', 'quarter point', 12.5, R, Math.round((0.05 + 0.95 * 0.25) * 100)],
    ['AC17', 'negative range min', -4, { min: -4, max: 4 }, 5],
    ['AC17', 'negative range max', 4, { min: -4, max: 4 }, 100],
    ['AC18', 'no range, non-null gives 53', 12, null, 53],
    ['AC18', 'no range, zero gives 53', 0, null, 53],
    ['AC18', 'no range, null gives 0', null, null, 0],
    ['AC18', 'no range, undefined gives 0', undefined, null, 0],
  ]
  it.each(cases)('%s: %s', (_ac, _n, v, r, expected) => {
    expect(barWidth(v, r)).toBe(expected)
  })

  it('AC17: min === max equals the inline design expression', () => {
    expect(barWidth(7, { min: 7, max: 7 })).toBe(Math.round((0.05 + 0.95 * 0.5) * 100))
  })

  it('AC17: always an integer', () => {
    for (let v = 10; v <= 20; v += 0.7) expect(Number.isInteger(barWidth(v, R))).toBe(true)
  })

  it('AC17: bars are never inverted for lower-is-better stats', () => {
    // barWidth takes no def; the pool min of a lower-is-better stat still gives 5.
    const range = { min: 0, max: 10 }
    expect(barWidth(0, range)).toBe(5)
    expect(barWidth(10, range)).toBe(100)
  })
})

// ---------------------------------------------------------------------------
// Design parity (AC19): design expressions reimplemented inline
// ---------------------------------------------------------------------------

describe('design parity', () => {
  type Dd = { dec?: number; sign?: boolean; low?: boolean }
  const toDd = (d: StatDef): Dd => ({ dec: d.decimals, sign: d.signed, low: d.lowerIsBetter })

  // Design: fmt
  const dFmt = (d: Dd, v: number | null | undefined): string => {
    if (v == null) return DASH
    const t = d.dec ? v.toFixed(d.dec) : v.toLocaleString('en-US')
    return d.sign && v > 0 ? '+' + t : t
  }
  // Design: range over the whole pool, nulls filtered
  const dRange = (pool: Entity[], k: string): [number, number] => {
    const vals = pool.map((e) => e.stats[k]).filter((v): v is number => v != null)
    return [Math.min(...vals), Math.max(...vals)]
  }
  // Design: n01
  const dN01 = (r: [number, number], v: number | null | undefined): number => {
    if (v == null) return 0
    return r[1] === r[0] ? 0.5 : (v - r[0]) / (r[1] - r[0])
  }
  // Design: bar p
  const dBar = (r: [number, number], v: number | null | undefined): number =>
    v == null ? 0 : Math.round((0.05 + 0.95 * dN01(r, v)) * 100)
  // Design: radar t
  const dRadar = (d: Dd, r: [number, number], v: number | null | undefined): number => {
    let t = dN01(r, v)
    if (d.low && v != null) t = 1 - t
    return t
  }
  // Design: best-of
  const dBest = (d: Dd, vals: (number | null | undefined)[]): number[] => {
    const nn = vals.filter((v): v is number => v != null)
    const best = d.low ? Math.min(...nn) : Math.max(...nn)
    return vals
      .map((v, i) => (nn.length > 1 && v != null && v === best ? i : -1))
      .filter((i) => i >= 0)
  }

  const seasons = ['2024', '2023', '2022'] as const
  const suites: [string, StatDef[], (s: string) => Entity[]][] = [
    ['players', PLAYER_DEFS, buildPlayers],
    ['teams', TEAM_DEFS, buildTeams],
  ]

  for (const [kind, defs, build] of suites) {
    for (const season of seasons) {
      describe(`${kind} ${season}`, () => {
        const pool = build(season)

        it.each(defs.map((d) => [d.key, d] as const))(
          'AC19: stat %s matches the design',
          (key, d) => {
            const dd = toDd(d)
            const r = dRange(pool, key)
            const lr = leagueRange(pool, key)
            // Pools for every T04 key have at least one non-null value.
            expect(lr).toEqual({ min: r[0], max: r[1] })

            for (const e of pool) {
              const v = e.stats[key]
              expect(formatStat(v, d)).toBe(dFmt(dd, v))
              expect(normalize(v, lr, d)).toBe(dN01(r, v))
              expect(normalize(v, lr, d, { invertLowerIsBetter: true })).toBe(dRadar(dd, r, v))
              expect(barWidth(v, lr)).toBe(dBar(r, v))
            }

            // Best-of over the full pool, and over a few selections of 2 to 3 entities.
            const selections = [
              pool,
              pool.slice(0, 2),
              pool.slice(1, 4),
              pool.slice(-3),
              pool.slice(0, 1),
            ]
            for (const sel of selections) {
              const vals = sel.map((e) => e.stats[key])
              const nn = vals.filter((v) => v != null)
              const expected = nn.length === 0 ? [] : dBest(dd, vals)
              expect(bestIndex(vals, d)).toEqual(expected)
            }
          },
        )
      })
    }
  }

  it('AC19: pools contain nulls that the library handles like the design', () => {
    const pool = buildPlayers('2024')
    const withNull = pool.filter((e) => e.stats.rec == null)
    expect(withNull.length).toBeGreaterThan(0)
    const d = byKey(PLAYER_DEFS, 'rec')
    expect(formatStat(withNull[0]!.stats.rec, d)).toBe(DASH)
    expect(barWidth(withNull[0]!.stats.rec, leagueRange(pool, 'rec'))).toBe(0)
  })

  it('AC19: radar inversion on T04 lower-is-better stats', () => {
    const pool = buildTeams('2024')
    const r = dRange(pool, 'papg')
    const lr = leagueRange(pool, 'papg')
    const best = pool.find((e) => e.stats.papg === r[0])!
    const worst = pool.find((e) => e.stats.papg === r[1])!
    expect(normalize(best.stats.papg, lr, PAPG_DEF, { invertLowerIsBetter: true })).toBe(1)
    expect(normalize(worst.stats.papg, lr, PAPG_DEF, { invertLowerIsBetter: true })).toBe(0)
    expect(barWidth(best.stats.papg, lr)).toBe(5)
  })
})

// ---------------------------------------------------------------------------
// Purity (AC20)
// ---------------------------------------------------------------------------

describe('purity', () => {
  function deepFreeze<T>(o: T): T {
    if (o && typeof o === 'object') {
      Object.values(o).forEach(deepFreeze)
      Object.freeze(o)
    }
    return o
  }

  it('AC20: bestIndex does not mutate a frozen input array or def', () => {
    const values: (StatValue | undefined)[] = [3, null, 9, undefined, 9]
    const copy = [...values]
    const d = deepFreeze(def({ lowerIsBetter: true }))
    deepFreeze(values)
    expect(() => bestIndex(values, d)).not.toThrow()
    expect(values).toEqual(copy)
    expect(bestIndex(values, def())).toEqual([2, 4])
  })

  it('AC20: leagueRange does not mutate frozen entities or stats', () => {
    const pool = [ent({ k: 3 }, 'a'), ent({ k: null }, 'b'), ent({}, 'c'), ent({ k: 8 }, 'd')]
    const copy = structuredClone(pool)
    deepFreeze(pool)
    expect(leagueRange(pool, 'k')).toEqual({ min: 3, max: 8 })
    expect(pool).toEqual(copy)
  })

  it('AC20: leagueRange does not reorder a frozen array', () => {
    const pool = deepFreeze([ent({ k: 9 }), ent({ k: 1 }), ent({ k: 5 })])
    expect(() => leagueRange(pool, 'k')).not.toThrow()
    expect(pool.map((e) => e.stats.k)).toEqual([9, 1, 5])
  })

  it('AC20: formatStat, normalize and barWidth accept frozen inputs', () => {
    const d = deepFreeze(def({ decimals: 1, signed: true, lowerIsBetter: true }))
    const range = deepFreeze({ min: 0, max: 10 })
    const options = deepFreeze({ invertLowerIsBetter: true })
    expect(() => formatStat(2.5, d)).not.toThrow()
    expect(() => normalize(5, range, d, options)).not.toThrow()
    expect(() => barWidth(5, range)).not.toThrow()
    expect(d).toEqual({
      key: 'k',
      label: 'K',
      group: 'G',
      decimals: 1,
      signed: true,
      lowerIsBetter: true,
    })
    expect(range).toEqual({ min: 0, max: 10 })
    expect(options).toEqual({ invertLowerIsBetter: true })
  })

  it('AC20: functions are deterministic (same inputs, same outputs)', () => {
    const r = { min: 1, max: 9 }
    expect(normalize(4, r, def())).toBe(normalize(4, r, def()))
    expect(formatStat(4.5, def({ decimals: 1 }))).toBe(formatStat(4.5, def({ decimals: 1 })))
  })

  it('AC20: stats.ts has no React import and no league-specific stat keys', () => {
    const src = statsSource
    expect(src).not.toMatch(/from\s+['"]react/)
    expect(src).not.toMatch(/\brequire\(\s*['"]react/)
    const leagueKeys = [...TEAM_DEFS, ...PLAYER_DEFS].map((d) => d.key)
    for (const key of new Set(leagueKeys)) {
      expect(src, `league key ${key}`).not.toMatch(new RegExp(`['"\`]${key}['"\`]`))
    }
    expect(src).not.toMatch(/\bNFL\b|\bNBA\b|\bMLB\b|\bNHL\b/i)
  })
})
