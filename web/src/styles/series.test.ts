import { describe, expect, it } from 'vitest'
import { seriesTextColor } from './series'

describe('seriesTextColor', () => {
  it('uses white on series 1, 3 and 6 and ink on the others', () => {
    const white = 'var(--color-white)'
    const ink = 'var(--color-ink)'
    expect([0, 1, 2, 3, 4, 5, 6, 7].map(seriesTextColor)).toEqual([
      white,
      ink,
      white,
      ink,
      ink,
      white,
      ink,
      ink,
    ])
  })

  it('wraps after eight series', () => {
    expect(seriesTextColor(8)).toBe(seriesTextColor(0))
    expect(seriesTextColor(9)).toBe(seriesTextColor(1))
  })
})
