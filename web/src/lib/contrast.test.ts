import { describe, expect, it } from 'vitest'
import { contrastRatio, parseHex, relativeLuminance } from './contrast'

describe('contrast helpers', () => {
  it('parses 6 and 3 digit hex', () => {
    expect(parseHex('#ff8000')).toEqual([255, 128, 0])
    expect(parseHex('#fff')).toEqual([255, 255, 255])
  })

  it('rejects invalid input', () => {
    expect(() => parseHex('red')).toThrow()
  })

  it('computes luminance extremes', () => {
    expect(relativeLuminance('#000000')).toBe(0)
    expect(relativeLuminance('#ffffff')).toBeCloseTo(1, 5)
  })

  it('black on white is 21', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 5)
  })

  it('#777777 on white is about 4.48', () => {
    expect(contrastRatio('#777777', '#ffffff')).toBeCloseTo(4.48, 2)
  })

  it('equal colours give 1 and order does not matter', () => {
    expect(contrastRatio('#123456', '#123456')).toBe(1)
    expect(contrastRatio('#ffffff', '#777777')).toBe(contrastRatio('#777777', '#ffffff'))
  })
})
