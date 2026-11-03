import { describe, expect, it } from 'vitest'
import { rnd, vary } from './variation'

// Reference literals: produced by running the design script
// (design_handoff_statpakd/design/StatPakd App.dc.html, lines 196-326) in Node, outside the repo.
// They were never computed by the code under test.

describe('rnd (FNV-1a hash in [0, 1) with four decimals)', () => {
  it('AC6: matches the design hash for known seed strings', () => {
    expect(rnd('')).toBe(0.6261)
    expect(rnd('a')).toBe(0.222)
    expect(rnd('allen2023pa')).toBe(0.5309)
    expect(rnd('allen2023ra')).toBe(0.6523)
    expect(rnd('kc2022to')).toBe(0.6688)
    expect(rnd('buf2023to')).toBe(0.2634)
    expect(rnd('buf2023ya')).toBe(0.0969)
    expect(rnd('Josh Allen2023ca')).toBe(0.5624)
  })

  it('AC2: returns the same value for the same input and stays in [0, 1)', () => {
    for (const s of ['', 'x', 'kc2023ppg', "Za'Darius Smith2022snap"]) {
      expect(rnd(s)).toBe(rnd(s))
      expect(rnd(s)).toBeGreaterThanOrEqual(0)
      expect(rnd(s)).toBeLessThan(1)
    }
  })

  it('AC6: different inputs give different outputs', () => {
    expect(rnd('allen2023ra')).not.toBe(rnd('allen2022ra'))
  })
})

describe('vary', () => {
  it('AC6: returns the input unchanged for 2024', () => {
    expect(vary('kc', '2024', 'ppg', 22.6, false)).toBe(22.6)
    expect(vary('buf', '2024', 'to', 24, true)).toBe(24)
    expect(vary('allen', '2024', 'pa', 3731, true)).toBe(3731)
  })

  it('AC3: keeps null as null (never coerces to 0) in every season', () => {
    for (const season of ['2024', '2023', '2022']) {
      expect(vary('x', season, 'pa', null, true)).toBeNull()
    }
  })

  it('AC6: matches design output for integer stats in 2023', () => {
    expect(vary('allen', '2023', 'pa', 3731, true)).toBe(3474)
  })

  it('AC6: matches design output for decimal and rate stats in 2023', () => {
    expect(vary('allen', '2023', 'cmp', 63.6, false)).toBe(64)
    expect(vary('kc', '2023', 'ppg', 22.6, false)).toBe(18.6)
    expect(vary('kc', '2023', 'win', 88.2, false)).toBe(82.4)
  })

  it('AC6: matches the design turnover-difference branch', () => {
    expect(vary('buf', '2023', 'to', 24, true)).toBe(1)
    expect(vary('buf', '2022', 'to', 24, true)).toBe(-2)
    expect(vary('x', '2023', 'to', 0, true)).toBe(0)
  })

  it('AC2: is deterministic', () => {
    expect(vary('kc', '2022', 'ppg', 22.6, false)).toBe(vary('kc', '2022', 'ppg', 22.6, false))
  })
})
