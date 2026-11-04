import { describe, expect, it } from 'vitest'
import type { Entity, StatDef } from '../../domain/types'
import { comparePlayers, compareStatDefs } from '../../test/compareFixtures'
import { RADAR, pointsAttr, radarModel, radarPoint, vertexT } from './radarModel'
import { resolveColumns, resolveRows } from './tableModel'

const defs = compareStatDefs()
const pool = comparePlayers()

function rowsFor(keys: string[]): StatDef[] {
  return resolveRows(keys, defs.players)
}
function cols(ids: string[], from: readonly Entity[] = pool) {
  return resolveColumns(ids, from)
}
function dist(p: { x: number; y: number }): number {
  return Math.hypot(p.x - 260, p.y - 210)
}
function allNumbers(model: unknown): number[] {
  const out: number[] = []
  const walk = (v: unknown) => {
    if (typeof v === 'number') out.push(v)
    else if (Array.isArray(v)) v.forEach(walk)
    else if (v && typeof v === 'object') Object.values(v).forEach(walk)
  }
  walk(model)
  return out
}

const DEFAULT_KEYS = ['zhigh', 'zlow', 'zbig']
const DEFAULT_IDS = ['zp1', 'zp2', 'zp3']
const model = () => radarModel(rowsFor(DEFAULT_KEYS), cols(DEFAULT_IDS), pool)

describe('radarPoint', () => {
  it('AC7: 3 axes at t = 1 are exact', () => {
    expect([0, 1, 2].map((i) => radarPoint(i, 3, 1))).toEqual([
      { x: 260, y: 60 },
      { x: 389.9, y: 285 },
      { x: 130.1, y: 285 },
    ])
  })

  it('AC7: 4 axes at t = 1 are exact and have no -0 or float residue', () => {
    const pts = [0, 1, 2, 3].map((i) => radarPoint(i, 4, 1))
    expect(pts).toEqual([
      { x: 260, y: 60 },
      { x: 410, y: 210 },
      { x: 260, y: 360 },
      { x: 110, y: 210 },
    ])
  })

  it('AC7: t = 0 is the centre', () => {
    for (const i of [0, 1, 2]) expect(radarPoint(i, 3, 0)).toEqual({ x: 260, y: 210 })
  })

  it('AC7: exposes the design constants', () => {
    expect(RADAR.cx).toBe(260)
    expect(RADAR.cy).toBe(210)
    expect(RADAR.r).toBe(150)
    expect(RADAR.rings).toEqual([0.25, 0.5, 0.75, 1])
  })
})

describe('pointsAttr', () => {
  it('AC7: joins "x,y" pairs with single spaces', () => {
    expect(
      pointsAttr([
        { x: 260, y: 60 },
        { x: 389.9, y: 285 },
      ]),
    ).toBe('260,60 389.9,285')
  })

  it('AC14: empty list gives an empty string', () => {
    expect(pointsAttr([])).toBe('')
  })
})

describe('vertexT', () => {
  const higher = { lowerIsBetter: false } as StatDef
  const lower = { lowerIsBetter: true } as StatDef

  it('AC7: higher-is-better pool max is 1 and pool min is 0.08', () => {
    expect(vertexT(10, { min: 1, max: 10 }, higher)).toBeCloseTo(1, 10)
    expect(vertexT(1, { min: 1, max: 10 }, higher)).toBeCloseTo(0.08, 10)
  })

  it('AC7: lower-is-better is inverted (min -> 1, max -> 0.08)', () => {
    expect(vertexT(1.25, { min: 1.25, max: 9 }, lower)).toBeCloseTo(1, 10)
    expect(vertexT(9, { min: 1.25, max: 9 }, lower)).toBeCloseTo(0.08, 10)
  })

  it('AC7: min === max gives 0.54', () => {
    expect(vertexT(7, { min: 7, max: 7 }, higher)).toBeCloseTo(0.54, 10)
    expect(vertexT(7, { min: 7, max: 7 }, lower)).toBeCloseTo(0.54, 10)
  })

  it('AC12: null and undefined are 0, not the 0.08 floor', () => {
    expect(vertexT(null, { min: 1, max: 10 }, higher)).toBe(0)
    expect(vertexT(undefined, { min: 1, max: 10 }, higher)).toBe(0)
    expect(vertexT(null, null, lower)).toBe(0)
  })
})

describe('radarModel geometry', () => {
  it('AC7: 3-axis spoke ends are the t = 1 points', () => {
    expect(model().axes.map((a) => a.end)).toEqual([
      { x: 260, y: 60 },
      { x: 389.9, y: 285 },
      { x: 130.1, y: 285 },
    ])
  })

  it('AC7: pool max of a higher-is-better stat is at distance 150, pool min at 12', () => {
    const m = radarModel(rowsFor(DEFAULT_KEYS), cols(['zp1', 'zp6']), pool)
    expect(m.series[0].points[0]).toEqual({ x: 260, y: 60 })
    expect(dist(m.series[0].points[0])).toBeCloseTo(150, 5)
    expect(m.series[1].points[0]).toEqual({ x: 260, y: 198 })
    expect(dist(m.series[1].points[0])).toBeCloseTo(12, 5)
  })

  it('AC7: lower-is-better stat is inverted (pool min zp2 at t 1, pool max zp4 at 0.08)', () => {
    const m = radarModel(rowsFor(DEFAULT_KEYS), cols(['zp2', 'zp4']), pool)
    expect(m.series[0].points[1]).toEqual({ x: 389.9, y: 285 })
    expect(m.series[1].points[1]).toEqual({ x: 270.4, y: 216 })
    expect(dist(m.series[1].points[1])).toBeCloseTo(12, 0)
  })

  it('AC8: exact interior vertices from the league pool', () => {
    const m = model()
    const [zp1, zp2, zp3] = m.series
    expect(zp1.points[0]).toEqual({ x: 260, y: 60 })
    expect(zp1.points[1]).toEqual({ x: 355.2, y: 265 })
    expect(zp3.points[0]).toEqual({ x: 260, y: 136.7 })
    expect(zp3.points[2]).toEqual({ x: 249.6, y: 216 })
    expect(zp2.points[2]).toEqual({ x: 241.6, y: 220.6 })
  })

  it('AC8: the smallest in the selection that is not the pool min is strictly inside (0.08, 1)', () => {
    const p = model().series[2].points[0]
    expect(dist(p)).toBeGreaterThan(12)
    expect(dist(p)).toBeLessThan(150)
  })

  it('AC7: min === max gives distance 0.54 * 150 = 81', () => {
    const m = radarModel(rowsFor(['zhigh', 'zlow', 'zsolo']), cols(['zp1']), pool)
    const p = m.series[0].points[2]
    expect(p).toEqual({ x: 189.9, y: 250.5 })
    expect(dist(p)).toBeCloseTo(81, 0)
  })

  it('AC12: null value sits exactly at the centre and the missing key too', () => {
    const m = radarModel(rowsFor(['zhigh', 'zlow', 'zsolo']), cols(['zp1', 'zp2', 'zp3']), pool)
    expect(m.series[1].points[2]).toEqual({ x: 260, y: 210 })
    expect(m.series[2].points[2]).toEqual({ x: 260, y: 210 })
    expect(m.series[1].pointsAttr.split(' ')[2]).toBe('260,210')
    expect(m.series[0].points[2]).not.toEqual({ x: 260, y: 210 })
  })

  it('AC12: null at the centre rather than the 0.08 floor for a lower-is-better axis too', () => {
    const nullable: Entity = { ...pool[0], id: 'zn', stats: { zhigh: 10, zlow: null, zbig: 1000 } }
    const m = radarModel(rowsFor(DEFAULT_KEYS), cols(['zn'], [nullable]), [...pool, nullable])
    expect(m.series[0].points[1]).toEqual({ x: 260, y: 210 })
  })

  it('AC7: rings are 4 strings; outer ring is the spoke ends', () => {
    const m = model()
    expect(m.rings).toHaveLength(4)
    expect(m.rings[3]).toBe('260,60 389.9,285 130.1,285')
    expect(m.rings[1]).toBe('260,135 325,247.5 195,247.5')
    RADAR.rings.forEach((t, k) => {
      expect(m.rings[k]).toBe(pointsAttr([0, 1, 2].map((i) => radarPoint(i, 3, t))))
    })
    expect(m.rings[0].startsWith('260,172.5 ')).toBe(true)
  })

  it('AC7: ring count and points follow the axis count', () => {
    const m = radarModel(rowsFor(['zhigh', 'zlow', 'zbig', 'zsign']), cols(DEFAULT_IDS), pool)
    expect(m.rings[3]).toBe('260,60 410,210 260,360 110,210')
    expect(m.axes).toHaveLength(4)
  })
})

describe('radarModel labels', () => {
  it('AC7: 3-axis label anchors, percentages and alignment are exact', () => {
    const labels = model().axes.map((a) => a.label)
    expect(labels).toEqual([
      { x: 260, y: 42, left: 50, top: 10, align: 'middle' },
      { x: 405.5, y: 294, left: 78, top: 70, align: 'start' },
      { x: 114.5, y: 294, left: 22, top: 70, align: 'end' },
    ])
  })

  it('AC7: 4-axis label anchors and rounded percentages', () => {
    const m = radarModel(rowsFor(['zhigh', 'zlow', 'zbig', 'zsign']), cols(DEFAULT_IDS), pool)
    expect(m.axes.map((a) => a.label)).toEqual([
      { x: 260, y: 42, left: 50, top: 10, align: 'middle' },
      { x: 428, y: 210, left: 82.3, top: 50, align: 'start' },
      { x: 260, y: 378, left: 50, top: 90, align: 'middle' },
      { x: 92, y: 210, left: 17.7, top: 50, align: 'end' },
    ])
  })

  it('AC15: for n = 3..8 every label is outside R (distance 168) and aligned away from centre', () => {
    for (let n = 3; n <= 8; n++) {
      const rows: StatDef[] = Array.from({ length: n }, (_, i) => ({
        key: `s${i}`,
        label: `Stat ${i}`,
        group: 'g',
        decimals: 0,
      }))
      const stats = (v: number) => Object.fromEntries(rows.map((r) => [r.key, v]))
      const ents: Entity[] = [1, 2].map((v) => ({
        id: `e${v}`,
        name: `E${v}`,
        shortName: `E${v}`,
        meta: 'm',
        badge: 'b',
        stats: stats(v),
      }))
      const m = radarModel(rows, cols(['e1'], ents), ents)
      expect(m.ok).toBe(true)
      expect(m.axes).toHaveLength(n)
      m.axes.forEach((a) => {
        const { x, y, align } = a.label
        expect(dist({ x, y })).toBeGreaterThan(150)
        expect(dist({ x, y })).toBeCloseTo(168, 0)
        const expected = Math.abs(x - 260) < 8 ? 'middle' : x > 260 ? 'start' : 'end'
        expect(align).toBe(expected)
      })
    }
  })

  it('AC9: axis order and labels follow rows', () => {
    const rows = rowsFor(['zbig', 'zhigh', 'zlow'])
    const m = radarModel(rows, cols(DEFAULT_IDS), pool)
    expect(m.axes.map((a) => a.def.key)).toEqual(['zhigh', 'zlow', 'zbig'])
    expect(m.axes.map((a) => a.def.label)).toEqual(['Zhigh', 'Zlow', 'Zbig'])
  })
})

describe('radarModel series', () => {
  it('AC10: series follow column order and carry colorIndex', () => {
    const m = radarModel(rowsFor(DEFAULT_KEYS), cols(['zp3', 'nope', 'zp1']), pool)
    expect(m.series.map((s) => [s.entity.id, s.colorIndex])).toEqual([
      ['zp3', 0],
      ['zp1', 2],
    ])
  })

  it('AC10: each series has one point per axis and a matching points attribute', () => {
    for (const s of model().series) {
      expect(s.points).toHaveLength(3)
      expect(s.pointsAttr).toBe(pointsAttr(s.points))
    }
    expect(model().series[0].pointsAttr.startsWith('260,60 355.2,265 ')).toBe(true)
  })

  it('AC11: adding another selected entity does not move the others', () => {
    const base = model().series
    const more = radarModel(rowsFor(DEFAULT_KEYS), cols([...DEFAULT_IDS, 'zp4']), pool).series
    expect(more).toHaveLength(4)
    for (let i = 0; i < 3; i++) expect(more[i].points).toEqual(base[i].points)
  })

  it('AC11: a different pool changes the vertices', () => {
    const smaller = pool.filter((e) => e.id !== 'zp6')
    const m = radarModel(rowsFor(DEFAULT_KEYS), cols(DEFAULT_IDS), smaller)
    expect(m.series[2].points[0]).not.toEqual(model().series[2].points[0])
  })

  it('AC13: values use formatStat text and na flags; missing lists labels in axis order', () => {
    const m = radarModel(
      rowsFor(['zsolo', 'zbig', 'zsign', 'zlow']),
      cols(['zp1', 'zp2', 'zp3']),
      pool,
    )
    const [zp1, zp2, zp3] = m.series
    expect(zp1.values.map((v) => v.text)).toEqual(['3.50', '4,000', '+2.0', '7'])
    expect(zp1.values.map((v) => v.na)).toEqual([false, false, false, false])
    expect(zp1.missing).toEqual([])
    expect(zp2.values.map((v) => v.def.key)).toEqual(['zlow', 'zbig', 'zsign', 'zsolo'])
    expect(zp2.values.map((v) => v.na)).toEqual([false, false, false, true])
    expect(zp2.missing).toEqual(['Zsolo'])
    expect(zp3.missing).toEqual(['Zsolo'])
  })

  it('AC13: multiple missing labels are in axis order', () => {
    const sparse: Entity = { ...pool[0], id: 'zs', stats: { zsign: null } }
    const m = radarModel(rowsFor(['zsolo', 'zhigh', 'zsign']), cols(['zs'], [sparse]), pool)
    expect(m.series[0].missing).toEqual(['Zhigh', 'Zsign', 'Zsolo'])
  })
})

describe('radarModel ok flag', () => {
  it.each([0, 1, 2])('AC4: %i rows give ok false with empty axes, rings, points', (n) => {
    const keys = DEFAULT_KEYS.slice(0, n)
    const m = radarModel(rowsFor(keys), cols(DEFAULT_IDS), pool)
    expect(m.ok).toBe(false)
    expect(m.axes).toEqual([])
    expect(m.rings).toEqual([])
    expect(m.series).toHaveLength(3)
    for (const s of m.series) {
      expect(s.points).toEqual([])
      expect(s.pointsAttr).toBe('')
      expect(s.values).toHaveLength(n)
    }
  })

  it('AC5: with fewer than 3 stats the missing list is still filled', () => {
    const m = radarModel(rowsFor(['zhigh', 'zsolo']), cols(['zp2', 'zp1']), pool)
    expect(m.ok).toBe(false)
    expect(m.series[0].missing).toEqual(['Zsolo'])
    expect(m.series[1].missing).toEqual([])
    expect(m.series[0].values.map((v) => v.text)).toEqual(['10', '—'])
  })

  it('AC1: 3 rows give ok true', () => {
    expect(model().ok).toBe(true)
  })

  it('AC5: no selected entities still works', () => {
    const m = radarModel(rowsFor(DEFAULT_KEYS), [], pool)
    expect(m.ok).toBe(true)
    expect(m.series).toEqual([])
  })
})

describe('radarModel robustness', () => {
  it('AC14: an all-null entity is a degenerate polygon at the centre with no NaN', () => {
    const blank: Entity = {
      ...pool[0],
      id: 'zblank',
      stats: { zhigh: null, zlow: null, zbig: null },
    }
    const m = radarModel(rowsFor(DEFAULT_KEYS), cols(['zblank'], [blank]), [...pool, blank])
    expect(m.series[0].points).toEqual([
      { x: 260, y: 210 },
      { x: 260, y: 210 },
      { x: 260, y: 210 },
    ])
    expect(m.series[0].pointsAttr).toBe('260,210 260,210 260,210')
    expect(m.series[0].missing).toEqual(['Zhigh', 'Zlow', 'Zbig'])
    expect(allNumbers(m).some(Number.isNaN)).toBe(false)
  })

  it('AC14: an all-null pool range (null range) yields centre points, no NaN', () => {
    const nulls = pool.filter((e) => e.stats.zsolo == null)
    const m = radarModel(rowsFor(['zhigh', 'zlow', 'zsolo']), cols(['zp2'], nulls), nulls)
    expect(m.series[0].points[2]).toEqual({ x: 260, y: 210 })
    expect(allNumbers(m).some(Number.isNaN)).toBe(false)
    expect(m.series[0].pointsAttr).toMatch(/^[\d.]+,[\d.]+( [\d.]+,[\d.]+)*$/)
  })

  it('AC14: an empty pool produces no NaN', () => {
    const m = radarModel(rowsFor(DEFAULT_KEYS), cols(DEFAULT_IDS), [])
    expect(allNumbers(m).some(Number.isNaN)).toBe(false)
  })

  it('AC14: pointsAttr always matches the number,number pattern with no NaN or -0', () => {
    for (const s of model().series) {
      expect(s.pointsAttr).toMatch(/^[\d.]+,[\d.]+( [\d.]+,[\d.]+)*$/)
    }
    expect(allNumbers(model()).some((n) => Object.is(n, -0))).toBe(false)
  })

  it('AC7: two calls give deep-equal output and inputs are not mutated', () => {
    const rows = rowsFor(DEFAULT_KEYS)
    const columns = cols(DEFAULT_IDS)
    const snapshot = structuredClone({ rows, columns, pool })
    const a = radarModel(rows, columns, pool)
    const b = radarModel(rows, columns, pool)
    expect(a).toEqual(b)
    expect({ rows, columns, pool }).toEqual(snapshot)
  })
})
