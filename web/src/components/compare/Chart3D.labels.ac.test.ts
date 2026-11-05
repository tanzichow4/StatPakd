import { describe, expect, it } from 'vitest'
import { DEFAULT_CAMERA, type Camera } from '../../lib/projection'
import { compareStatDefs } from '../../test/compareFixtures'
import { axisDefs, axisLabelLayout } from './chart3dModel'
import css from './Chart3D.module.css?raw'

const defs3 = axisDefs(['zhigh', 'zlow', 'zsign'], compareStatDefs().players)
const MAX_PCT = 40

function sweep(): Camera[] {
  const out: Camera[] = []
  for (let yaw = -Math.PI; yaw <= Math.PI; yaw += Math.PI / 12) {
    for (const pitch of [-1.2, -0.6, 0, 0.4, 0.9, 1.3]) out.push({ yaw, pitch })
  }
  return out
}

/** Room a label needs on its open side, as a percentage of the card width. */
function roomOk(l: { side: string; left: number }): boolean {
  return l.side === 'before' ? l.left >= MAX_PCT : l.left <= 100 - MAX_PCT
}

describe('AC5: 3D axis labels stay inside the chart card', () => {
  it('AC5: every label box (anchor +/- 40% of the card) fits for any camera', () => {
    const bad = sweep().flatMap((cam) =>
      axisLabelLayout(cam, defs3)
        .filter((l) => !roomOk(l))
        .map((l) => ({ cam, l })),
    )
    expect(bad).toEqual([])
  })

  it('AC5: default camera labels all fit and keep letters X, Y, Z', () => {
    const labels = axisLabelLayout(DEFAULT_CAMERA, defs3)
    expect(labels.map((l) => l.letter)).toEqual(['X', 'Y', 'Z'])
    expect(labels.every(roomOk)).toBe(true)
    expect(labels.every((l) => l.left >= 0 && l.left <= 100 && l.top >= 0 && l.top <= 100)).toBe(
      true,
    )
  })

  it('AC5: label text always starts with its letter', () => {
    const all = sweep().flatMap((cam) => axisLabelLayout(cam, defs3))
    expect(all.every((l) => l.text.startsWith(`${l.letter} · `))).toBe(true)
  })

  it('AC5: a label in the middle band keeps the side that follows the centre line', () => {
    const mid = sweep()
      .flatMap((cam) => axisLabelLayout(cam, defs3))
      .filter((l) => l.left > MAX_PCT && l.left < 100 - MAX_PCT)
    expect(mid.length).toBeGreaterThan(0)
    expect(mid.filter((l) => l.side !== (l.left < 50 ? 'before' : 'after'))).toEqual([])
  })

  it('AC5: both sides occur across the sweep', () => {
    const sides = new Set(sweep().flatMap((cam) => axisLabelLayout(cam, defs3).map((l) => l.side)))
    expect(sides).toEqual(new Set(['before', 'after']))
  })

  it('AC5: missing axis stat still yields a label with the letter', () => {
    const labels = axisLabelLayout(DEFAULT_CAMERA, [undefined, undefined, undefined])
    expect(labels).toHaveLength(3)
    expect(labels[0].text.startsWith('X')).toBe(true)
  })
})

describe('AC5: narrow axis label CSS', () => {
  const block = /@media \(max-width:\s*\d+px\)\s*\{([\s\S]*?)\n\}/.exec(css)

  it('AC5: a narrow media block exists', () => {
    expect(block).not.toBeNull()
  })

  it('AC5: narrow .axisLabel is 10px, capped at 40% and wraps', () => {
    const body = /\.axisLabel\s*\{([^}]*)\}/.exec(block?.[1] ?? '')?.[1] ?? ''
    expect(body).toMatch(/font-size:\s*10px/)
    expect(body).toMatch(/max-width:\s*40%/)
    expect(body).toMatch(/white-space:\s*normal/)
  })

  it('AC5: base .axisLabel does not wrap or cap on wide viewports', () => {
    const base = /(?:^|\n)\.axisLabel\s*\{([^}]*)\}/.exec(css)?.[1] ?? ''
    expect(base).toMatch(/white-space:\s*nowrap/)
    expect(base).not.toMatch(/max-width/)
  })
})
