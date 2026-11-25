import type { Entity, StatDef } from '../../domain/types'
import { bestIndex, formatStat, leagueRange, normalize } from '../../lib/stats'
import type { CompareColumn } from './tableModel'

/** Selected dots closer than this (percent of the scale) are moved to separate lanes. */
export const LANE_GAP = 3.5

export interface DotMark {
  entity: Entity
  colorIndex: number
  text: string
  na: boolean
  best: boolean
  /** Position on the scale, 0 to 100; 0 when not applicable. */
  x: number
  /** Vertical step from the scale line: 0, -1, 1, -2, 2, ... */
  offset: number
}

export interface LeagueDot {
  id: string
  x: number
}

export interface DotRow {
  def: StatDef
  minText: string
  maxText: string
  /** One mark per selected column, in column order. */
  marks: DotMark[]
  /** Every unselected pool entity with a value. */
  league: LeagueDot[]
  /** Largest absolute offset, used to size the plot. */
  spread: number
}

/** Offsets for positions so that near-equal values do not cover each other. */
export function laneOffsets(xs: readonly (number | null)[]): number[] {
  const lastInLane: number[] = []
  const offsets = xs.map(() => 0)
  const order: { x: number; i: number }[] = []
  xs.forEach((x, i) => {
    if (x !== null) order.push({ x, i })
  })
  order.sort((a, b) => a.x - b.x || a.i - b.i)
  for (const { x, i } of order) {
    let lane = lastInLane.findIndex((last) => x - last >= LANE_GAP)
    if (lane < 0) lane = lastInLane.length
    lastInLane[lane] = x
    offsets[i] = lane === 0 ? 0 : lane % 2 === 1 ? -(lane + 1) / 2 : lane / 2
  }
  return offsets
}

/** One scale per stat from the league minimum to maximum. Lower-is-better stats are not flipped. */
export function dotRows(
  rows: StatDef[],
  columns: CompareColumn[],
  pool: readonly Entity[],
): DotRow[] {
  const selected = new Set(columns.map((c) => c.entity.id))
  return rows.map((def) => {
    const range = leagueRange(pool, def.key)
    const place = (v: number) => normalize(v, range, {}) * 100
    const values = columns.map((c) => c.entity.stats[def.key])
    const best = bestIndex(values, def)
    const xs = values.map((v) => (v == null ? null : place(v)))
    const offsets = laneOffsets(xs)
    const marks = columns.map(({ entity, colorIndex }, i): DotMark => ({
      entity,
      colorIndex,
      text: formatStat(values[i], def),
      na: values[i] == null,
      best: best.includes(i),
      x: xs[i] ?? 0,
      offset: offsets[i],
    }))
    const league: LeagueDot[] = []
    for (const entity of pool) {
      const v = entity.stats[def.key]
      if (v != null && !selected.has(entity.id)) league.push({ id: entity.id, x: place(v) })
    }
    return {
      def,
      minText: formatStat(range?.min, def),
      maxText: formatStat(range?.max, def),
      marks,
      league,
      spread: Math.max(0, ...offsets.map(Math.abs)),
    }
  })
}
