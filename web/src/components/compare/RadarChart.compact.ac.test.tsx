import { render } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { comparePlayers, compareStatDefs } from '../../test/compareFixtures'
import { RadarChart } from './RadarChart'
import { RADAR, RADAR_COMPACT, RADAR_DEFAULT, radarModel } from './radarModel'
import { resolveColumns, resolveRows } from './tableModel'
import css from './RadarChart.module.css?raw'

const defs = compareStatDefs()
const pool = comparePlayers()
const KEYS = ['zhigh', 'zlow', 'zbig', 'zsign', 'zsolo']

function rows(n: number) {
  return resolveRows(KEYS.slice(0, n), defs.players)
}
const columns = () => resolveColumns(['zp1', 'zp2', 'zp3'], pool)
const dist = (p: { x: number; y: number }) => Math.hypot(p.x - RADAR.cx, p.y - RADAR.cy)

afterEach(() => vi.unstubAllGlobals())

function stubMatchMedia(matches: boolean) {
  vi.stubGlobal(
    'matchMedia',
    vi.fn().mockImplementation((query: string) => ({
      matches,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  )
}

describe('AC4: radar compact geometry (model)', () => {
  it('AC4: compact labels sit at a larger fraction of the ring than default', () => {
    expect(RADAR_COMPACT.labelT).toBeGreaterThan(RADAR_DEFAULT.labelT)
  })

  it('AC4: compact ring is smaller than default so labels have room inside the chart box', () => {
    expect(RADAR_COMPACT.r).toBeLessThan(RADAR_DEFAULT.r)
  })

  it('AC4: default geometry is unchanged (r 150, labelT 1.12)', () => {
    expect(RADAR_DEFAULT).toEqual({ r: 150, labelT: 1.12 })
    const explicit = radarModel(rows(3), columns(), pool, RADAR_DEFAULT)
    const implicit = radarModel(rows(3), columns(), pool)
    expect(explicit).toEqual(implicit)
  })

  it.each([3, 4, 5])('AC4: %i axes, compact label distance is r * labelT from the centre', (n) => {
    const m = radarModel(rows(n), columns(), pool, RADAR_COMPACT)
    for (const a of m.axes) {
      expect(dist(a.label)).toBeCloseTo(RADAR_COMPACT.r * RADAR_COMPACT.labelT, 0)
      expect(dist(a.end)).toBeCloseTo(RADAR_COMPACT.r, 0)
    }
  })

  it.each([3, 4, 5])('AC4: %i axes, compact label is further out relative to its axis end', (n) => {
    const compact = radarModel(rows(n), columns(), pool, RADAR_COMPACT)
    const dflt = radarModel(rows(n), columns(), pool, RADAR_DEFAULT)
    compact.axes.forEach((a, i) => {
      expect(dist(a.label) / dist(a.end)).toBeGreaterThan(
        dist(dflt.axes[i].label) / dist(dflt.axes[i].end),
      )
    })
  })

  it.each([3, 4, 5])('AC4: %i axes, compact outer ring vertices are at radius 120', (n) => {
    const m = radarModel(rows(n), columns(), pool, RADAR_COMPACT)
    const outer = m.rings[m.rings.length - 1].split(' ').map((s) => {
      const [x, y] = s.split(',').map(Number)
      return { x, y }
    })
    expect(outer).toHaveLength(n)
    for (const p of outer) expect(dist(p)).toBeCloseTo(RADAR_COMPACT.r, 0)
  })

  it.each([3, 4, 5])('AC4: %i axes, compact label anchors stay inside the chart box', (n) => {
    const m = radarModel(rows(n), columns(), pool, RADAR_COMPACT)
    for (const a of m.axes) {
      expect(a.label.x).toBeGreaterThan(0)
      expect(a.label.x).toBeLessThan(RADAR.width)
      expect(a.label.y).toBeGreaterThan(0)
      expect(a.label.y).toBeLessThan(RADAR.height)
      expect(a.label.left).toBeGreaterThan(0)
      expect(a.label.left).toBeLessThan(100)
      expect(a.label.top).toBeGreaterThan(0)
      expect(a.label.top).toBeLessThan(100)
    }
  })

  it('AC4: series vertices stay within the compact ring', () => {
    const m = radarModel(rows(5), columns(), pool, RADAR_COMPACT)
    for (const s of m.series) for (const p of s.points) expect(dist(p)).toBeLessThanOrEqual(120.1)
  })

  it('AC4: fewer than 3 axes is still not ok with compact geometry', () => {
    const m = radarModel(rows(2), columns(), pool, RADAR_COMPACT)
    expect(m.ok).toBe(false)
    expect(m.axes).toEqual([])
    expect(m.rings).toEqual([])
  })
})

describe('AC4: RadarChart picks geometry from the viewport', () => {
  const r = rows(3)
  const outerRing = (g: typeof RADAR_DEFAULT) => {
    const m = radarModel(r, columns(), pool, g)
    return m.rings[m.rings.length - 1]
  }

  it('AC4: narrow viewport renders the compact outer ring', () => {
    stubMatchMedia(true)
    const { container } = render(<RadarChart columns={columns()} rows={r} pool={pool} />)
    expect(container.innerHTML).toContain(outerRing(RADAR_COMPACT))
    expect(container.innerHTML).not.toContain(outerRing(RADAR_DEFAULT))
  })

  it('AC4: wide viewport renders the default outer ring', () => {
    stubMatchMedia(false)
    const { container } = render(<RadarChart columns={columns()} rows={r} pool={pool} />)
    expect(container.innerHTML).toContain(outerRing(RADAR_DEFAULT))
  })

  it('AC4: without matchMedia the default ring renders and nothing throws', () => {
    vi.stubGlobal('matchMedia', undefined)
    const { container } = render(<RadarChart columns={columns()} rows={r} pool={pool} />)
    expect(container.innerHTML).toContain(outerRing(RADAR_DEFAULT))
  })
})

describe('AC4: narrow axis label CSS', () => {
  it('AC4: a max-width media block lets axis labels wrap', () => {
    const m = /@media \(max-width:\s*\d+px\)\s*\{([\s\S]*)\}\s*$/.exec(css)
    expect(m).not.toBeNull()
    expect(m![1]).toMatch(/\.axisLabel\s*\{[^}]*white-space:\s*normal/)
    expect(m![1]).toMatch(/\.axisLabel\s*\{[^}]*max-width/)
  })
})
