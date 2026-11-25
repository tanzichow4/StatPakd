import type { StatDef } from '../../domain/types'
import { formatStat } from '../../lib/stats'
import { along, niceScale, type Scale } from './scale'

export interface GraphTick {
  /** Percent from the left (x axis) or from the top (y axis). */
  at: number
  label: string
}

export interface GraphPoint {
  id: string
  /** Percent from the left. */
  x: number
  /** Percent from the top. */
  y: number
  color: string
  /** Read by screen readers and shown on hover. */
  description: string
  /** Printed beside the dot. */
  text?: string
  /** Context dot, drawn small and gray. */
  muted?: boolean
}

export interface GraphLine {
  id: string
  x1: number
  y1: number
  x2: number
  y2: number
  color: string
}

export interface GraphModel {
  xTitle: string
  yTitle: string
  xTicks: GraphTick[]
  yTicks: GraphTick[]
  points: GraphPoint[]
  lines: GraphLine[]
}

export interface ValueAxis {
  ticks: GraphTick[]
  /** Percent along the axis, from its low end. */
  at: (value: number) => number
}

/** A numbered axis for one stat. `vertical` axes put the low end at the bottom. */
export function valueAxis(
  values: readonly number[],
  def: Pick<StatDef, 'decimals' | 'signed'>,
  vertical: boolean,
): ValueAxis {
  const scale: Scale = niceScale(values, !def.decimals)
  const at = (v: number) => along(v, scale)
  return {
    at,
    ticks: scale.ticks.map((v) => ({
      at: vertical ? 100 - at(v) : at(v),
      // Ticks are round numbers, so decimals show only when the step needs them.
      label: formatStat(v, Number.isInteger(v) ? { signed: def.signed } : def),
    })),
  }
}

/** Evenly spaced positions for `count` categories, in percent. */
export function categoryAt(index: number, count: number): number {
  return ((index + 0.5) / count) * 100
}

export interface XY {
  x: number
  y: number
}

/** Least-squares line `y = start + slope * x`; `null` without two different x values. */
export function fitLine(points: readonly XY[]): { slope: number; start: number } | null {
  if (points.length < 2) return null
  const mean = (values: number[]) => values.reduce((a, v) => a + v, 0) / values.length
  const mx = mean(points.map((p) => p.x))
  const my = mean(points.map((p) => p.y))
  const spread = points.reduce((a, p) => a + (p.x - mx) ** 2, 0)
  if (spread === 0) return null
  const slope = points.reduce((a, p) => a + (p.x - mx) * (p.y - my), 0) / spread
  return { slope, start: my - slope * mx }
}
