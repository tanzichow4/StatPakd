import { describe, expect, it } from 'vitest'
import { seriesTextColor } from './series'

const W = 'var(--color-white)'
const INK = 'var(--color-ink)'

describe('AC24: seriesTextColor', () => {
  it('AC24: white on series 1, 3 and 6; ink on 2, 4, 5, 7 and 8', () => {
    expect([0, 1, 2, 3, 4, 5, 6, 7].map(seriesTextColor)).toEqual([
      W,
      INK,
      W,
      INK,
      INK,
      W,
      INK,
      INK,
    ])
  })
  it('AC24: wraps after 8 like seriesColor', () => {
    expect(seriesTextColor(8)).toBe(seriesTextColor(0))
    expect(seriesTextColor(9)).toBe(seriesTextColor(1))
    expect(seriesTextColor(23)).toBe(seriesTextColor(7))
  })
})
