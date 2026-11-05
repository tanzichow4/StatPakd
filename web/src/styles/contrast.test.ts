import { describe, expect, it } from 'vitest'
import { contrastRatio } from '../lib/contrast'
import tokensCss from './tokens.css?raw'

function token(name: string): string {
  const m = new RegExp(String.raw`--${name}:\s*(#[0-9a-fA-F]{3,6})\s*;`).exec(tokensCss)
  if (!m) throw new Error(`token --${name} not found`)
  return m[1]
}

interface Pair {
  fg: string
  bg: string
  use: string
  min: number
}

const LIGHT = ['color-white', 'color-surface-subtle']

const pairs: Pair[] = []
for (const fg of [
  'color-text-muted',
  'color-text-label',
  'color-text-faint',
  'color-text-na',
  'color-ink',
]) {
  for (const bg of LIGHT) pairs.push({ fg, bg, use: 'body text on light surfaces', min: 4.5 })
}
// Muted text also sits on the track colour (inactive segmented items, IconButton).
pairs.push({ fg: 'color-text-muted', bg: 'color-track', use: 'inactive segmented item', min: 4.5 })
// Hard-coded greys kept as is are checked in docs/a11y.md; nav text on dark surfaces:
for (const bg of ['color-ink', 'color-nav-surface']) {
  pairs.push({ fg: 'color-nav-text', bg, use: 'global nav text', min: 4.5 })
}
// Focus indicator, 3:1 against every background it is drawn on.
for (const bg of [...LIGHT, 'color-track', 'color-track-alt']) {
  pairs.push({ fg: 'color-focus', bg, use: 'focus ring on light', min: 3 })
}
for (const bg of ['color-ink', 'color-nav-surface']) {
  pairs.push({ fg: 'color-white', bg, use: 'focus ring in dark nav', min: 3 })
}

/** Documented exemptions: disabled controls are not required to meet 4.5:1 (WCAG 1.4.3).\s*/
const exemptions = [
  { fg: 'color-nav-soon', bg: 'color-ink', reason: 'disabled "Soon" league buttons' },
  { fg: 'color-checkbox-off', bg: 'color-white', reason: 'locked last-stat checkbox box' },
  { fg: 'color-ink', bg: 'color-white', reason: 'disabled ctaAdd button at opacity 0.4' },
]

describe('AC18: contrast of colour tokens', () => {
  for (const p of pairs) {
    it(`${p.fg} on ${p.bg} (${p.use}) is at least ${p.min}:1`, () => {
      expect(contrastRatio(token(p.fg), token(p.bg))).toBeGreaterThanOrEqual(p.min)
    })
  }

  it('lists each exemption with a reason', () => {
    for (const e of exemptions) expect(e.reason.length).toBeGreaterThan(0)
  })
})
