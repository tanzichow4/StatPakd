import { describe, expect, it } from 'vitest'
import { contrastRatio, relativeLuminance } from './contrast'

describe('AC18: contrast helper', () => {
  it('AC18: black on white is 21:1 in either order', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 5)
    expect(contrastRatio('#ffffff', '#000000')).toBeCloseTo(21, 5)
  })
  it('AC18: equal colours give 1', () => {
    expect(contrastRatio('#2f5fd0', '#2f5fd0')).toBeCloseTo(1, 5)
  })
  it('AC18: #777777 on white is about 4.48', () => {
    expect(contrastRatio('#777777', '#ffffff')).toBeCloseTo(4.48, 2)
  })
  it('AC18: accepts upper case hex', () => {
    expect(contrastRatio('#2F5FD0', '#FFFFFF')).toBeCloseTo(contrastRatio('#2f5fd0', '#ffffff'), 8)
  })
  it('AC18: luminance of white is 1 and of black is 0', () => {
    expect(relativeLuminance('#ffffff')).toBeCloseTo(1, 6)
    expect(relativeLuminance('#000000')).toBeCloseTo(0, 6)
  })
  it('AC18: rejects an invalid colour instead of returning NaN', () => {
    expect(() => contrastRatio('not-a-colour', '#ffffff')).toThrow(/./)
    expect(() => contrastRatio('#12345', '#ffffff')).toThrow(/./)
  })
  it('AC13: the focus colour on white is about 5.72', () => {
    expect(contrastRatio('#2f5fd0', '#ffffff')).toBeCloseTo(5.72, 1)
  })
})
