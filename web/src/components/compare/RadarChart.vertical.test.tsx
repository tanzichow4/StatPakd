import { render } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { comparePlayers, compareStatDefs } from '../../test/compareFixtures'
import { RadarChart } from './RadarChart'
import { RADAR, RADAR_COMPACT, radarModel } from './radarModel'
import { resolveColumns, resolveRows } from './tableModel'
import css from './RadarChart.module.css?raw'
import chart3dCss from './Chart3D.module.css?raw'

const defs = compareStatDefs()
const pool = comparePlayers()
const KEYS = ['zhigh', 'zlow', 'zbig', 'zsign', 'zsolo']

afterEach(() => vi.unstubAllGlobals())

describe('T18 QA F1: compact radar labels clear the ring', () => {
  it.each([3, 4, 5])('%i axes: compact label anchors are outside the outer ring', (n) => {
    const m = radarModel(
      resolveRows(KEYS.slice(0, n), defs.players),
      resolveColumns(['zp1'], pool),
      pool,
      RADAR_COMPACT,
    )
    for (const a of m.axes) {
      const d = Math.hypot(a.label.x - RADAR.cx, a.label.y - RADAR.cy)
      expect(d).toBeGreaterThan(RADAR_COMPACT.r + 10)
    }
  })

  it('compact labels leave room below the bottom anchor for three wrapped lines', () => {
    const bottom = RADAR.cy + RADAR_COMPACT.r * RADAR_COMPACT.labelT
    expect(RADAR.height - bottom).toBeGreaterThanOrEqual(60)
  })

  it('centred labels grow away from the ring (above/below classes)', () => {
    vi.stubGlobal(
      'matchMedia',
      vi.fn().mockReturnValue({
        matches: true,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }),
    )
    const { getAllByTestId } = render(
      <RadarChart
        columns={resolveColumns(['zp1'], pool)}
        rows={resolveRows(KEYS.slice(0, 4), defs.players)}
        pool={pool}
      />,
    )
    const labels = getAllByTestId('radar-label')
    expect(labels[0].className).toMatch(/above/)
    expect(labels[2].className).toMatch(/below/)
    expect(labels[1].className).not.toMatch(/above|below/)
  })

  it('narrow CSS anchors above and below labels at their outer edge', () => {
    const block = /@media \(max-width:\s*480px\)\s*\{([\s\S]*)\}\s*$/.exec(css)?.[1] ?? ''
    expect(block).toMatch(/\.middle\.above\s*\{[^}]*translate\(-50%,\s*-100%\)/)
    expect(block).toMatch(/\.middle\.below\s*\{[^}]*translate\(-50%,\s*0\)/)
  })
})

describe('T18 QA F2: narrow 3D overlay layout', () => {
  const block = /@media \(max-width:\s*480px\)\s*\{([\s\S]*?)\n\}\s*$/.exec(chart3dCss)?.[1] ?? ''

  it('reserves a strip for the hint so it cannot overlap labels or tags', () => {
    expect(block).toMatch(/\.card\s*\{[^}]*padding-bottom:\s*28px/)
    expect(block).toMatch(/\.overlay\s*\{[^}]*bottom:\s*28px/)
  })

  it('axis labels do not wrap needlessly next to the card edge', () => {
    expect(block).toMatch(/\.axisLabel\s*\{[^}]*width:\s*max-content/)
  })
})
