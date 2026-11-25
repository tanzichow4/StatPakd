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
})
