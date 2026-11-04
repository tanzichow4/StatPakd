import { describe, expect, it } from 'vitest'
import { shares } from './shares'

/** Small deterministic PRNG (mulberry32) so the property loop is reproducible. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0)

describe('shares: AC3 examples', () => {
  it('AC3: [1, 1, 1] -> [34, 33, 33]', () => {
    expect(shares([1, 1, 1])).toEqual([34, 33, 33])
  })
  it('AC3: [2, 1] -> [67, 33]', () => {
    expect(shares([2, 1])).toEqual([67, 33])
  })
  it('AC3: [50, 50] -> [50, 50]', () => {
    expect(shares([50, 50])).toEqual([50, 50])
  })
  it('AC3: [5, 0, null, 5] -> [50, 0, 0, 50]', () => {
    expect(shares([5, 0, null, 5])).toEqual([50, 0, 0, 50])
  })
  it('AC3: [7] -> [100]', () => {
    expect(shares([7])).toEqual([100])
  })
})

describe('shares: largest remainder and ties', () => {
  it('AC3: six equal entries give the 4 leftover points to the earliest four', () => {
    // 100/6 = 16.67 each: floors 16 (sum 96), 4 leftover to indices 0-3.
    expect(shares([1, 1, 1, 1, 1, 1])).toEqual([17, 17, 17, 17, 16, 16])
  })
  it('AC3: the leftover goes to the largest fractional remainder, not the earliest', () => {
    // exact 33.33, 33.33, 33.33 / use [1, 2, 4] total 7: 14.28, 28.57, 57.14 -> floors 14,28,57 = 99
    // largest remainder is index 1 (.57)
    expect(shares([1, 2, 4])).toEqual([14, 29, 57])
  })
  it('AC3: remainders decide before position', () => {
    // total 3: 66.67 and 33.33 -> floors 66, 33; leftover to the 0.67 remainder
    expect(shares([2, 1])).toEqual([67, 33])
    expect(shares([1, 2])).toEqual([33, 67])
  })
  it('AC3: equal remainders break by earlier index even when a larger value is later', () => {
    // [1,1,1,1,1,1,1] total 7: 14.28 each, floors 14 (sum 98), 2 leftover -> indices 0,1
    expect(shares([1, 1, 1, 1, 1, 1, 1])).toEqual([15, 15, 14, 14, 14, 14, 14])
  })
  it('AC3: an entry with an exact integer share never takes a leftover point', () => {
    // [1,1,2] total 4: 25, 25, 50 exact -> no leftover
    expect(shares([1, 1, 2])).toEqual([25, 25, 50])
  })
  it('AC3: fractional (non-integer) values are supported', () => {
    const out = shares([0.5, 0.25, 0.25])
    expect(out).toEqual([50, 25, 25])
  })
  it('AC3: a very small value beside a huge one still totals 100', () => {
    const out = shares([1_000_000, 1])
    expect(sum(out)).toBe(100)
    expect(out[0]).toBe(100)
    expect(out[1]).toBe(0)
  })
})

describe('shares: AC2 uncounted values', () => {
  it('AC2: null, undefined, zero and negatives get 0%', () => {
    expect(shares([null, undefined, 0, -3, 4])).toEqual([0, 0, 0, 0, 100])
  })
  it('AC2: [-5, 5] -> [0, 100]', () => {
    expect(shares([-5, 5])).toEqual([0, 100])
  })
  it('AC2: NaN and Infinity count as 0', () => {
    expect(shares([Number.NaN, 5, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY, 5])).toEqual([
      0, 50, 0, 0, 50,
    ])
  })
  it('AC2: negatives do not reduce the total', () => {
    expect(shares([-100, 1, 1])).toEqual([0, 50, 50])
  })
  it('AC2: zero/negative entries never receive leftover points', () => {
    const out = shares([1, 0, 1, -1, 1, null, 1, 1, 1])
    expect(out[1]).toBe(0)
    expect(out[3]).toBe(0)
    expect(out[5]).toBe(0)
    expect(sum(out)).toBe(100)
  })
})

describe('shares: AC4 zero total', () => {
  it('AC4: [] -> []', () => {
    expect(shares([])).toEqual([])
  })
  it('AC4: all zero', () => {
    expect(shares([0, 0, 0])).toEqual([0, 0, 0])
  })
  it('AC4: all null', () => {
    expect(shares([null, null])).toEqual([0, 0])
  })
  it('AC4: [undefined]', () => {
    expect(shares([undefined])).toEqual([0])
  })
  it('AC4: only negatives and non-finite values', () => {
    expect(shares([-1, Number.NaN, Number.POSITIVE_INFINITY, -0])).toEqual([0, 0, 0, 0])
  })
  it('AC4: results never contain NaN or Infinity and use +0', () => {
    for (const input of [[], [0], [null, 0, -1], [Number.NaN], [Number.POSITIVE_INFINITY, 0]]) {
      for (const v of shares(input)) {
        expect(Number.isFinite(v)).toBe(true)
        expect(Object.is(v, 0)).toBe(true)
      }
    }
  })
})

describe('shares: AC1 shape', () => {
  it('AC1: a single positive entry is 100', () => {
    expect(shares([0.001])).toEqual([100])
  })
  it('AC1: a single zero entry is 0', () => {
    expect(shares([0])).toEqual([0])
  })
  it('AC1: output has the same length and order as the input', () => {
    const out = shares([1, 3, 0, 6])
    expect(out).toHaveLength(4)
    expect(out).toEqual([10, 30, 0, 60])
  })
  it('AC1: returns a new array', () => {
    const input = [100]
    expect(shares(input)).not.toBe(input)
  })
  it('AC1: is pure, repeated calls give equal results', () => {
    const input = [3, 5, 7, null]
    expect(shares(input)).toEqual(shares(input))
  })
})

describe('shares: AC5 no mutation', () => {
  it('AC5: a frozen input is not mutated and does not throw', () => {
    const input = Object.freeze([3, null, -1, 5, undefined, 2])
    const copy = [...input]
    expect(() => shares(input)).not.toThrow()
    expect([...input]).toEqual(copy)
  })
  it('AC5: input is unchanged after a call (including sort-sensitive ties)', () => {
    const input = [1, 1, 1, 2, 2, 2, 3]
    const copy = [...input]
    shares(input)
    expect(input).toEqual(copy)
  })
})

describe('shares: AC3 property loop (seeded)', () => {
  it('AC3: for many random integer arrays, sum is 100 and each pct is within 1 of the exact share', () => {
    const rand = mulberry32(20240607)
    for (let n = 0; n < 2000; n++) {
      const len = 1 + Math.floor(rand() * 20)
      const values: number[] = []
      for (let i = 0; i < len; i++) {
        const r = rand()
        // Mix zeros, small and large integers.
        values.push(r < 0.2 ? 0 : Math.floor(rand() * (r < 0.6 ? 10 : 5000)))
      }
      const total = sum(values)
      const out = shares(values)
      expect(out).toHaveLength(len)
      expect(sum(out)).toBe(total === 0 ? 0 : 100)
      out.forEach((pct, i) => {
        const v = values[i] ?? 0
        const exact = total === 0 ? 0 : (100 * v) / total
        expect(Number.isInteger(pct)).toBe(true)
        expect(pct).toBeGreaterThanOrEqual(0)
        expect(Math.abs(pct - exact)).toBeLessThan(1)
        expect(v === 0 ? pct : 0).toBe(0)
      })
    }
  })

  it('AC3: random arrays with null, negative and non-finite entries still sum to 100', () => {
    const rand = mulberry32(99)
    const junk = [null, undefined, -4, Number.NaN, Number.POSITIVE_INFINITY, 0]
    for (let n = 0; n < 500; n++) {
      const len = 1 + Math.floor(rand() * 12)
      const values: (number | null | undefined)[] = []
      let counted = 0
      for (let i = 0; i < len; i++) {
        if (rand() < 0.4) {
          values.push(junk[Math.floor(rand() * junk.length)])
        } else {
          const v = 1 + Math.floor(rand() * 300)
          counted += v
          values.push(v)
        }
      }
      const out = shares(values)
      expect(sum(out)).toBe(counted > 0 ? 100 : 0)
      expect(out.every((v) => Number.isInteger(v) && v >= 0)).toBe(true)
    }
  })
})
