import { describe, expect, it } from 'vitest'
import tokensCss from './tokens.css?raw'
import { seriesTextColor } from './series'

// Independent WCAG 2 implementation (deliberately not importing lib/contrast).
function lin(c: number): number {
  const s = c / 255
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
}
function lum(hex: string): number {
  const h = hex.replace('#', '')
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16))
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)
}
function ratio(a: string, b: string): number {
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}
function token(name: string): string {
  const m = new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{6})\\s*;`).exec(tokensCss)
  if (!m) throw new Error(`token --${name} not found`)
  return m[1]
}
function resolve(v: string): string {
  const m = /^var\(--([\w-]+)\)$/.exec(v)
  if (!m) throw new Error(`not a var(): ${v}`)
  return token(m[1])
}

const LIGHT_BGS = ['color-white', 'color-surface-subtle']

describe('AC18: text tokens meet 4.5:1 on light backgrounds', () => {
  for (const name of [
    'color-text-muted',
    'color-text-label',
    'color-text-faint',
    'color-text-na',
    'color-ink',
  ]) {
    for (const bg of LIGHT_BGS) {
      it(`AC18: --${name} on --${bg} is at least 4.5:1`, () => {
        expect(ratio(token(name), token(bg))).toBeGreaterThanOrEqual(4.5)
      })
    }
  }
  it('AC18: muted text on the track background (inactive segmented items) is at least 4.5:1', () => {
    expect(ratio(token('color-text-muted'), token('color-track'))).toBeGreaterThanOrEqual(4.5)
  })
  it('AC18: nav text meets 4.5:1 on the ink bar and the nav surface', () => {
    for (const bg of ['color-ink', 'color-nav-surface']) {
      expect(ratio(token('color-nav-text'), token(bg))).toBeGreaterThanOrEqual(4.5)
    }
  })
})

describe('AC13: focus colour meets 3:1', () => {
  for (const bg of ['color-white', 'color-surface-subtle', 'color-track', 'color-track-alt']) {
    it(`AC13: --color-focus on --${bg} is at least 3:1`, () => {
      expect(ratio(token('color-focus'), token(bg))).toBeGreaterThanOrEqual(3)
    })
  }
  it('AC13: the white focus ring on the dark nav meets 3:1', () => {
    for (const bg of ['color-ink', 'color-nav-surface']) {
      expect(ratio(token('color-white'), token(bg))).toBeGreaterThanOrEqual(3)
    }
  })
})

describe('AC21: contrast changes are minimal', () => {
  it('AC21: token names are kept', () => {
    for (const n of ['text-muted', 'text-label', 'text-faint', 'text-na', 'nav-soon', 'focus']) {
      expect(tokensCss).toContain(`--color-${n}:`)
    }
  })
  it('AC21: the focus colour, nav-soon and series colours are unchanged', () => {
    expect(token('color-focus').toLowerCase()).toBe('#2f5fd0')
    expect(token('color-nav-soon').toLowerCase()).toBe('#6a6a66')
    const expected = [
      '#111111',
      '#e0472b',
      '#2f5fd0',
      '#14946a',
      '#d9921a',
      '#7b4fc9',
      '#1a9aa8',
      '#d6457f',
    ]
    expected.forEach((hex, i) => expect(token(`series-${i + 1}`).toLowerCase()).toBe(hex))
  })
  it('AC21: darkened greys are not lighter than the originals and keep the grey hue offset', () => {
    const originals: Record<string, string> = {
      'color-text-muted': '#7a7a75',
      'color-text-label': '#8a8a85',
      'color-text-faint': '#9a9a95',
      'color-text-na': '#b5b5b0',
    }
    for (const [name, orig] of Object.entries(originals)) {
      const now = token(name)
      expect(lum(now)).toBeLessThanOrEqual(lum(orig))
      const [r, g, b] = [1, 3, 5].map((i) => parseInt(now.slice(i, i + 2), 16))
      expect(r).toBe(g)
      expect(g - b).toBe(5)
    }
  })
  it('AC21: no CSS file still hard-codes a failing grey', () => {
    const css = import.meta.glob('../**/*.css', { query: '?raw', import: 'default', eager: true })
    expect(Object.keys(css).length).toBeGreaterThan(5)
    for (const [file, text] of Object.entries(css)) {
      if (file.endsWith('tokens.css')) continue
      for (const bad of ['#7a7a75', '#8a8a85', '#9a9a95', '#b5b5b0']) {
        expect(String(text).toLowerCase(), `${file} has ${bad}`).not.toContain(bad)
      }
    }
  })
})

describe('AC24: share segment text meets 4.5:1 on all 8 series colours', () => {
  for (let i = 0; i < 8; i++) {
    it(`AC24: series ${i + 1} text colour passes 4.5:1`, () => {
      const fg = resolve(seriesTextColor(i))
      expect(ratio(fg, token(`series-${i + 1}`))).toBeGreaterThanOrEqual(4.5)
    })
  }
})
