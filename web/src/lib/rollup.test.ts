import { describe, expect, it } from 'vitest'
import { rollup } from './rollup'

const weeks = [
  { n: 10, d: 4, r: 80 },
  { n: 5, d: 0, r: 91 },
  { n: null, d: null, r: null },
]

describe('rollup', () => {
  it('adds counting stats, skipping missing values', () => {
    expect(rollup({ key: 'n' }, weeks)).toBe(15)
    expect(rollup({ key: 'n', decimals: 1 }, [{ n: 0.1 }, { n: 0.2 }])).toBe(0.3)
  })

  it('averages when asked', () => {
    expect(rollup({ key: 'r', decimals: 1, rollup: { kind: 'average' } }, weeks)).toBe(85.5)
  })

  it('divides summed parts for a ratio', () => {
    const rule = { kind: 'ratio' as const, num: 'n', den: 'd' }
    expect(rollup({ key: 'q', decimals: 2, rollup: rule }, weeks)).toBe(3.75)
    expect(rollup({ key: 'q', rollup: { ...rule, scale: 100 } }, weeks)).toBe(375)
  })

  it('handles a zero denominator', () => {
    const rule = { kind: 'ratio' as const, num: 'n', den: 'd' }
    expect(rollup({ key: 'q', rollup: rule }, [weeks[1]])).toBeNull()
    expect(rollup({ key: 'q', rollup: { ...rule, minDen: 1 } }, [weeks[1]])).toBe(5)
  })

  it('has no total without values', () => {
    expect(rollup({ key: 'n' }, [])).toBeNull()
    expect(
      rollup({ key: 'q', rollup: { kind: 'ratio', num: 'n', den: 'd' } }, [weeks[2]]),
    ).toBeNull()
  })

  it('builds a capped composite from summed values', () => {
    const rule = {
      kind: 'composite' as const,
      den: 'att',
      max: 2.375,
      scale: 100 / 6,
      terms: [
        { num: 'cmp', offset: -0.3, factor: 5 },
        { num: 'yds', offset: -3, factor: 0.25 },
        { num: 'td', offset: 0, factor: 20 },
        { num: 'int', offset: -0.095, factor: -25 },
      ],
    }
    const def = { key: 'rating', decimals: 1, rollup: rule }
    const halves = [
      { att: 30, cmp: 20, yds: 200, td: 2, int: 1 },
      { att: 30, cmp: 20, yds: 200, td: 1, int: 1 },
    ]
    expect(rollup(def, halves)).toBe(88.2)
    expect(rollup(def, [{ att: 10, cmp: 10, yds: 200, td: 4, int: 0 }])).toBe(158.3)
    expect(rollup(def, [{ att: 10, cmp: 0, yds: 0, td: 0, int: 5 }])).toBe(0)
    expect(rollup(def, [{ att: 0 }])).toBeNull()
  })

  it('has no total for a rate that applies to no period', () => {
    const def = { key: 'q', rollup: { kind: 'ratio' as const, num: 'n', den: 'd' } }
    expect(rollup(def, [{ q: null, n: 1, d: 1 }])).toBeNull()
    expect(
      rollup(def, [
        { q: null, n: 0, d: 0 },
        { q: 1, n: 1, d: 1 },
      ]),
    ).toBe(1)
  })
})
