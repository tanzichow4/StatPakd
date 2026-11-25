import type { Entity, EntityId, GameLogEntry, StatDef, StatValue } from '../../domain/types'
import { NULL_PLACEHOLDER, formatStat } from '../../lib/stats'
import { canonicalStatOrder } from '../../state'
import type { CompareColumn } from '../compare/tableModel'

/** A change smaller than this share of the average counts as holding steady. */
export const STEADY_SHARE = 0.05
/** Slopes smaller than this would print as zero, so they count as holding steady too. */
export const STEADY_SLOPE = 0.005
/** How many periods the "last few" shortcut picks. */
export const RECENT_COUNT = 4

/** The chosen player, else the first compared player, else the first player. */
export function activePlayer(
  players: readonly Entity[],
  chosenId: EntityId,
  comparedIds: readonly EntityId[],
): Entity | undefined {
  const find = (id: EntityId) => players.find((p) => p.id === id)
  return find(chosenId) ?? comparedIds.map(find).find((p) => p !== undefined) ?? players[0]
}

/** Definitions with at least one value in the log, in canonical order. */
export function statsWithData(defs: readonly StatDef[], log: readonly GameLogEntry[]): StatDef[] {
  const byKey = new Map(defs.map((d) => [d.key, d]))
  const out: StatDef[] = []
  for (const key of canonicalStatOrder(defs)) {
    const def = byKey.get(key)
    if (def && log.some((e) => e.stats[key] != null)) out.push(def)
  }
  return out
}

/** The chosen stat, else the first preferred stat the player has, else the first available. */
export function chartStat(
  available: readonly StatDef[],
  chosen: string,
  preferred: readonly string[],
): StatDef | undefined {
  const find = (key: string) => available.find((d) => d.key === key)
  return find(chosen) ?? preferred.map(find).find((d) => d !== undefined) ?? available[0]
}

export interface TrendPoint {
  period: number
  value: number
}

/** The periods that have a value for a stat. */
export function trendPoints(entries: readonly GameLogEntry[], key: string): TrendPoint[] {
  const out: TrendPoint[] = []
  for (const e of entries) {
    const value = e.stats[key]
    if (e.played && value != null) out.push({ period: e.period, value })
  }
  return out
}

const average = (values: readonly number[]) => values.reduce((a, v) => a + v, 0) / values.length

/** Least-squares line through the points; `null` with fewer than two distinct periods. */
export function fitLine(points: readonly TrendPoint[]): { slope: number; start: number } | null {
  if (points.length < 2) return null
  const mx = average(points.map((p) => p.period))
  const my = average(points.map((p) => p.value))
  const spread = points.reduce((a, p) => a + (p.period - mx) ** 2, 0)
  if (spread === 0) return null
  const slope = points.reduce((a, p) => a + (p.period - mx) * (p.value - my), 0) / spread
  return { slope, start: my - slope * mx }
}

export type Direction = 'up' | 'down' | 'steady'

export interface Trend {
  direction: Direction
  text: string
}

const signed = (v: number, digits: number) => {
  const text = Math.abs(v).toLocaleString('en-US', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })
  return `${v > 0 ? '+' : v < 0 ? '−' : ''}${text}`
}

/** Whether a stat is rising or falling over the points, in words. */
export function describeTrend(
  points: readonly TrendPoint[],
  def: Pick<StatDef, 'lowerIsBetter'>,
): Trend | null {
  const line = fitLine(points)
  if (!line) return null
  const change = line.slope * (points[points.length - 1].period - points[0].period)
  const mean = Math.abs(average(points.map((p) => p.value)))
  if (Math.abs(line.slope) < STEADY_SLOPE || Math.abs(change) < STEADY_SHARE * mean) {
    return { direction: 'steady', text: 'Holding steady' }
  }
  const direction: Direction = change > 0 ? 'up' : 'down'
  const better = def.lowerIsBetter ? change < 0 : change > 0
  const digits = Math.abs(line.slope) < 0.1 ? 2 : 1
  return {
    direction,
    text: `Trending ${direction}: ${signed(line.slope, digits)} per week (${better ? 'improving' : 'declining'})`,
  }
}

/** Difference between the last and first chosen values, for example "W1 to W3: +45". */
export function changeText(
  entries: readonly GameLogEntry[],
  def: Pick<StatDef, 'key' | 'decimals'>,
): string | null {
  const points = trendPoints(entries, def.key)
  if (points.length < 2) return null
  const first = points[0]
  const last = points[points.length - 1]
  const label = (period: number) => entries.find((e) => e.period === period)?.shortLabel ?? ''
  return `${label(first.period)} to ${label(last.period)}: ${signed(last.value - first.value, def.decimals ?? 0)}`
}

export interface ChartColumn {
  period: number
  label: string
  shortLabel: string
  played: boolean
  text: string
  /** Centre of the column, in percent of the plot width. */
  x: number
  /** Height of the dot, in percent from the top; `null` when there is no value. */
  y: number | null
}

export interface ChartLine {
  x1: number
  y1: number
  x2: number
  y2: number
}

export interface TrendChartModel {
  columns: ChartColumn[]
  ticks: { text: string; y: number }[]
  average: { text: string; y: number } | null
  trend: ChartLine | null
}

/** The value range shown on the vertical axis, with headroom around the data. */
export function valueDomain(values: readonly number[]): [number, number] {
  if (values.length === 0) return [0, 1]
  const min = Math.min(...values)
  const max = Math.max(...values)
  const pad = max > min ? (max - min) * 0.12 : Math.max(1, Math.abs(max) * 0.1)
  // Values that are never negative never get a negative axis.
  return [min >= 0 ? Math.max(0, min - pad) : min - pad, max + pad]
}

/** Geometry of a dot plot over periods, with the average and the fitted trend line. */
export function trendChart(entries: readonly GameLogEntry[], def: StatDef): TrendChartModel {
  const points = trendPoints(entries, def.key)
  const values = points.map((p) => p.value)
  const [low, high] = valueDomain(values)
  const y = (v: number) => 100 - ((v - low) / (high - low)) * 100
  const clamp = (v: number) => Math.min(100, Math.max(0, v))
  const columns = entries.map((e, i): ChartColumn => {
    const value: StatValue | undefined = e.stats[def.key]
    const has = e.played && value != null
    return {
      period: e.period,
      label: e.label,
      shortLabel: e.shortLabel,
      played: e.played,
      text: has ? formatStat(value, def) : NULL_PLACEHOLDER,
      x: ((i + 0.5) / entries.length) * 100,
      y: has ? y(value) : null,
    }
  })
  // Number the highest, middle and lowest values, each exactly where it is drawn. Whole-number
  // stats get a whole-number middle, and repeats are dropped.
  let ticks: TrendChartModel['ticks'] = []
  if (values.length > 0) {
    const max = Math.max(...values)
    const min = Math.min(...values)
    const middle = (max + min) / 2
    const marks = new Set([max, def.decimals ? middle : Math.round(middle), min])
    ticks = [...marks].map((v) => ({ text: formatStat(v, def), y: y(v) }))
  }
  const mean = values.length > 0 ? average(values) : null
  const line = fitLine(points)
  let trend: ChartLine | null = null
  if (line) {
    const end = (p: TrendPoint) => ({
      x: columns.find((c) => c.period === p.period)?.x ?? 0,
      y: clamp(y(line.start + line.slope * p.period)),
    })
    const a = end(points[0])
    const b = end(points[points.length - 1])
    trend = { x1: a.x, y1: a.y, x2: b.x, y2: b.y }
  }
  return {
    columns,
    ticks,
    average:
      mean === null
        ? null
        : { text: formatStat(mean, { ...def, decimals: def.decimals || 1 }), y: y(mean) },
    trend,
  }
}

/** The played periods among the chosen ones, in season order. */
export function chosenEntries(
  log: readonly GameLogEntry[],
  periods: readonly number[],
): GameLogEntry[] {
  return log.filter((e) => e.played && periods.includes(e.period))
}

/** The most recent played periods. */
export function recentPeriods(log: readonly GameLogEntry[], count = RECENT_COUNT): number[] {
  return log
    .filter((e) => e.played)
    .slice(-count)
    .map((e) => e.period)
}

/** Periods as comparison table columns. */
export function periodColumns(entries: readonly GameLogEntry[]): CompareColumn[] {
  return entries.map((e, colorIndex) => ({
    colorIndex,
    entity: {
      id: String(e.period),
      name: e.label,
      shortName: e.shortLabel,
      meta: '',
      badge: e.shortLabel,
      stats: e.stats,
    },
  }))
}
