import type { Entity, StatDef, StatValue } from '../../domain/types'
import { formatStat, leagueRange, normalize, type StatRange } from '../../lib/stats'
import type { CompareColumn } from './tableModel'

export const RADAR = {
  width: 520,
  height: 420,
  cx: 260,
  cy: 210,
  r: 150,
  floor: 0.08,
  labelT: 1.12,
  rings: [0.25, 0.5, 0.75, 1],
  centreBand: 8,
  minAxes: 3,
} as const

export interface RadarGeometry {
  r: number
  labelT: number
}

export const RADAR_DEFAULT: RadarGeometry = { r: RADAR.r, labelT: RADAR.labelT }
/** Smaller ring and labels further out, for narrow viewports where labels wrap. */
export const RADAR_COMPACT: RadarGeometry = { r: 120, labelT: 1.2 }

export interface Point {
  x: number
  y: number
}

export type LabelAlign = 'middle' | 'start' | 'end'

export interface RadarAxis {
  def: StatDef
  end: Point
  label: { x: number; y: number; left: number; top: number; align: LabelAlign }
}

export interface RadarValue {
  def: StatDef
  value: StatValue | undefined
  text: string
  na: boolean
}

export interface RadarSeries {
  entity: Entity
  colorIndex: number
  points: Point[]
  pointsAttr: string
  values: RadarValue[]
  missing: string[]
}

export interface RadarModel {
  ok: boolean
  axes: RadarAxis[]
  rings: string[]
  series: RadarSeries[]
}

/** Round to 1 decimal, normalising -0 to 0. */
function r1(v: number): number {
  return Math.round(v * 10) / 10 + 0
}

/** Point for axis `i` of `n` at fraction `t` of the radius. Axis 0 points up, clockwise. */
export function radarPoint(i: number, n: number, t: number, r: number = RADAR.r): Point {
  const a = -Math.PI / 2 + (i * 2 * Math.PI) / n
  return {
    x: r1(RADAR.cx + Math.cos(a) * r * t),
    y: r1(RADAR.cy + Math.sin(a) * r * t),
  }
}

/** Radius fraction for a value: 0 for null, else floor plus the inverted-aware league position. */
export function vertexT(
  value: StatValue | undefined,
  range: StatRange,
  def: Pick<StatDef, 'lowerIsBetter'>,
): number {
  if (value == null) return 0
  return (
    RADAR.floor + (1 - RADAR.floor) * normalize(value, range, def, { invertLowerIsBetter: true })
  )
}

export function pointsAttr(points: Point[]): string {
  return points.map((p) => `${p.x},${p.y}`).join(' ')
}

export function radarModel(
  rows: StatDef[],
  columns: CompareColumn[],
  pool: readonly Entity[],
  geometry: RadarGeometry = RADAR_DEFAULT,
): RadarModel {
  const n = rows.length
  const ok = n >= RADAR.minAxes
  const ranges = rows.map((def) => leagueRange(pool, def.key))

  const axes: RadarAxis[] = ok
    ? rows.map((def, i) => {
        const p = radarPoint(i, n, geometry.labelT, geometry.r)
        const align: LabelAlign =
          Math.abs(p.x - RADAR.cx) < RADAR.centreBand ? 'middle' : p.x > RADAR.cx ? 'start' : 'end'
        return {
          def,
          end: radarPoint(i, n, 1, geometry.r),
          label: {
            x: p.x,
            y: p.y,
            left: r1((p.x / RADAR.width) * 100),
            top: r1((p.y / RADAR.height) * 100),
            align,
          },
        }
      })
    : []

  const rings = ok
    ? RADAR.rings.map((t) => pointsAttr(rows.map((_, i) => radarPoint(i, n, t, geometry.r))))
    : []

  const series = columns.map(({ entity, colorIndex }): RadarSeries => {
    const values = rows.map((def): RadarValue => {
      const value = entity.stats[def.key]
      return { def, value, text: formatStat(value, def), na: value == null }
    })
    const points = ok
      ? rows.map((def, i) =>
          radarPoint(i, n, vertexT(entity.stats[def.key], ranges[i], def), geometry.r),
        )
      : []
    return {
      entity,
      colorIndex,
      points,
      pointsAttr: pointsAttr(points),
      values,
      missing: values.filter((v) => v.na).map((v) => v.def.label),
    }
  })

  return { ok, axes, rings, series }
}
