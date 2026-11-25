import type { EntityId, GameLogEntry, StatDef, StatMap, StatValue } from '../../domain/types'
import { rollup } from '../../lib/rollup'
import { formatStat } from '../../lib/stats'
import { canonicalStatOrder } from '../../state'
import { seriesColor } from '../../styles/series'
import type { CompareColumn } from '../compare/tableModel'
import {
  categoryAt,
  fitLine,
  valueAxis,
  type GraphLine,
  type GraphModel,
  type GraphPoint,
} from '../dotgraph/graphModel'

/** How many periods the "last few" shortcut picks. */
export const RECENT_COUNT = 4
/** A change smaller than this share of the average counts as holding steady. */
export const STEADY_SHARE = 0.05
/** Slopes smaller than this would print as zero, so they count as holding steady too. */
export const STEADY_SLOPE = 0.005
/** Most dots that get a printed period label in the stat-against-stat graph. */
export const LABEL_LIMIT = 20
/** Sideways step, as a share of a column, between players' dots in the same period. */
const SIDE_STEP = 0.14

export type GameLogs = ReadonlyMap<EntityId, readonly GameLogEntry[]>

export interface Period {
  period: number
  label: string
  shortLabel: string
  tickLabel?: string
  phase?: string
}

/** Every period any of the logs covers, in order. */
export function allPeriods(logs: GameLogs): Period[] {
  const byNumber = new Map<number, Period>()
  for (const log of logs.values()) {
    for (const { period, label, shortLabel, tickLabel, phase } of log) {
      byNumber.set(period, { period, label, shortLabel, tickLabel, phase })
    }
  }
  return [...byNumber.values()].sort((a, b) => a.period - b.period)
}

/** The chosen periods that exist; `null` means every period. */
export function chosenPeriods(periods: readonly Period[], chosen: readonly number[] | null) {
  return chosen === null ? [...periods] : periods.filter((p) => chosen.includes(p.period))
}

/** The periods of each phase, when there is more than one phase to choose between. */
export function phasesOf(periods: readonly Period[]): { phase: string; numbers: number[] }[] {
  const phases = new Map<string, number[]>()
  for (const { phase, period } of periods) {
    if (!phase) continue
    const numbers = phases.get(phase)
    if (numbers) numbers.push(period)
    else phases.set(phase, [period])
  }
  return phases.size < 2 ? [] : [...phases].map(([phase, numbers]) => ({ phase, numbers }))
}

/** The latest periods in which any of the players had a game. */
export function recentPeriods(
  periods: readonly Period[],
  logs: GameLogs,
  count = RECENT_COUNT,
): number[] {
  const players = [...logs.keys()]
  return periods
    .filter((p) => players.some((id) => playedEntry(logs, id, p.period)))
    .slice(-count)
    .map((p) => p.period)
}

/** What to show in place of stats for a period without a game. */
export function absence(logs: GameLogs, id: EntityId, period: number): string {
  const entry = logs.get(id)?.find((e) => e.period === period)
  return entry ? (entry.note ?? 'Bye') : 'No game'
}

/** The entry of one period, when the player had a game in it. */
export function playedEntry(logs: GameLogs, id: EntityId, period: number) {
  return logs.get(id)?.find((e) => e.period === period && e.played)
}

/** Definitions with at least one value in any log, in canonical order. */
export function statsWithData(defs: readonly StatDef[], logs: GameLogs): StatDef[] {
  const entries = [...logs.values()].flat()
  const byKey = new Map(defs.map((d) => [d.key, d]))
  const out: StatDef[] = []
  for (const key of canonicalStatOrder(defs)) {
    const def = byKey.get(key)
    if (def && entries.some((e) => e.stats[key] != null)) out.push(def)
  }
  return out
}

/** The first of the wanted keys that is available, else the stat at `fallback`. */
export function pickStat(
  available: readonly StatDef[],
  wanted: readonly string[],
  fallback = 0,
): StatDef | undefined {
  for (const key of wanted) {
    const def = available.find((d) => d.key === key)
    if (def) return def
  }
  return available[fallback] ?? available[0]
}

/** A player's total for a stat over the periods. */
export function periodTotal(
  logs: GameLogs,
  id: EntityId,
  def: StatDef,
  periods: readonly Period[],
): StatValue {
  const stats: StatMap[] = []
  for (const p of periods) {
    const entry = playedEntry(logs, id, p.period)
    if (entry) stats.push(entry.stats)
  }
  return rollup(def, stats)
}

export interface StatGroupTotals {
  group: string
  rows: { def: StatDef; values: StatValue[] }[]
}

/** Totals over the periods for every player, grouped by stat category. */
export function groupedTotals(
  columns: readonly CompareColumn[],
  logs: GameLogs,
  defs: readonly StatDef[],
  periods: readonly Period[],
): StatGroupTotals[] {
  const groups = new Map<string, StatGroupTotals>()
  for (const def of defs) {
    let group = groups.get(def.group)
    if (!group) {
      group = { group: def.group, rows: [] }
      groups.set(def.group, group)
    }
    const values = columns.map((c) => periodTotal(logs, c.entity.id, def, periods))
    group.rows.push({ def, values })
  }
  return [...groups.values()]
}

interface Sample {
  period: number
  value: number
}

function samples(logs: GameLogs, id: EntityId, key: string, periods: readonly Period[]): Sample[] {
  const out: Sample[] = []
  for (const { period } of periods) {
    const value = playedEntry(logs, id, period)?.stats[key]
    if (value != null) out.push({ period, value })
  }
  return out
}

const signed = (v: number, digits: number) => {
  const text = Math.abs(v).toLocaleString('en-US', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })
  return `${v > 0 ? '+' : v < 0 ? '−' : ''}${text}`
}

/** Whether a stat is rising or falling over the periods, in words. */
export function describeTrend(
  points: readonly Sample[],
  def: Pick<StatDef, 'lowerIsBetter'>,
): string {
  if (points.length === 0) return 'No values in these weeks'
  const line = fitLine(points.map((p) => ({ x: p.period, y: p.value })))
  if (!line) return 'Not enough weeks for a trend'
  const change = line.slope * (points[points.length - 1].period - points[0].period)
  const mean = Math.abs(points.reduce((a, p) => a + p.value, 0) / points.length)
  if (Math.abs(line.slope) < STEADY_SLOPE || Math.abs(change) < STEADY_SHARE * mean) {
    return 'Holding steady'
  }
  const better = def.lowerIsBetter ? change < 0 : change > 0
  const digits = Math.abs(line.slope) < 0.1 ? 2 : 1
  const direction = change > 0 ? 'up' : 'down'
  return `Trending ${direction}: ${signed(line.slope, digits)} per week (${better ? 'improving' : 'declining'})`
}

export function playerTrends(
  columns: readonly CompareColumn[],
  logs: GameLogs,
  def: StatDef,
  periods: readonly Period[],
) {
  return columns.map(({ entity, colorIndex }) => ({
    id: entity.id,
    name: entity.shortName,
    colorIndex,
    text: describeTrend(samples(logs, entity.id, def.key, periods), def),
  }))
}

const clamp = (v: number) => Math.min(100, Math.max(0, v))

/** Periods along x and one stat up y, a colour for each player. */
export function periodGraph(
  columns: readonly CompareColumn[],
  logs: GameLogs,
  def: StatDef,
  periods: readonly Period[],
  trend: boolean,
): GraphModel {
  const series = columns.map((c) => samples(logs, c.entity.id, def.key, periods))
  const axis = valueAxis(
    series.flat().map((s) => s.value),
    def,
    true,
  )
  const count = periods.length
  const index = new Map(periods.map((p, i) => [p.period, i]))
  const points: GraphPoint[] = []
  const lines: GraphLine[] = []
  columns.forEach(({ entity, colorIndex }, c) => {
    const color = seriesColor(colorIndex)
    // Players sit side by side so equal values stay visible.
    const shift = ((c - (columns.length - 1) / 2) * SIDE_STEP * 100) / Math.max(count, 1)
    const xOf = (period: number) => categoryAt(index.get(period) ?? 0, count) + shift
    for (const s of series[c]) {
      points.push({
        id: `${entity.id}-${s.period}`,
        x: xOf(s.period),
        y: 100 - axis.at(s.value),
        color,
        description: `${entity.name}, ${periods[index.get(s.period) ?? 0].label}: ${def.label} ${formatStat(s.value, def)}`,
        // A single player over a few periods has room to print the values.
        ...(columns.length === 1 && count <= 8 ? { text: formatStat(s.value, def) } : {}),
      })
    }
    const fit = fitLine(series[c].map((s) => ({ x: s.period, y: s.value })))
    if (trend && fit) {
      const first = series[c][0].period
      const last = series[c][series[c].length - 1].period
      const yOf = (period: number) => clamp(100 - axis.at(fit.start + fit.slope * period))
      lines.push({
        id: entity.id,
        x1: xOf(first),
        y1: yOf(first),
        x2: xOf(last),
        y2: yOf(last),
        color,
      })
    }
  })
  return {
    xTitle: 'Week',
    yTitle: def.label,
    xTicks: periods.map((p, i) => ({
      at: categoryAt(i, count),
      label: p.tickLabel ?? String(p.period),
    })),
    yTicks: axis.ticks,
    points,
    lines,
  }
}

/** One stat against another, a dot for each player and period. */
export function statGraph(
  columns: readonly CompareColumn[],
  logs: GameLogs,
  x: StatDef,
  y: StatDef,
  periods: readonly Period[],
  trend: boolean,
): GraphModel {
  const series = columns.map(({ entity }) =>
    periods.flatMap((p) => {
      const stats = playedEntry(logs, entity.id, p.period)?.stats
      const xv = stats?.[x.key]
      const yv = stats?.[y.key]
      return xv != null && yv != null ? [{ ...p, x: xv, y: yv }] : []
    }),
  )
  const all = series.flat()
  const ax = valueAxis(
    all.map((s) => s.x),
    x,
    false,
  )
  const ay = valueAxis(
    all.map((s) => s.y),
    y,
    true,
  )
  const points: GraphPoint[] = []
  const lines: GraphLine[] = []
  columns.forEach(({ entity, colorIndex }, c) => {
    const color = seriesColor(colorIndex)
    for (const s of series[c]) {
      points.push({
        id: `${entity.id}-${s.period}`,
        x: ax.at(s.x),
        y: 100 - ay.at(s.y),
        color,
        description: `${entity.name}, ${s.label}: ${x.label} ${formatStat(s.x, x)}, ${y.label} ${formatStat(s.y, y)}`,
        ...(all.length <= LABEL_LIMIT ? { text: s.shortLabel } : {}),
      })
    }
    const fit = fitLine(series[c])
    if (trend && fit) {
      const xs = series[c].map((s) => s.x)
      const end = (v: number) => ({
        x: ax.at(v),
        y: clamp(100 - ay.at(fit.start + fit.slope * v)),
      })
      const a = end(Math.min(...xs))
      const b = end(Math.max(...xs))
      lines.push({ id: entity.id, x1: a.x, y1: a.y, x2: b.x, y2: b.y, color })
    }
  })
  return {
    xTitle: x.label,
    yTitle: y.label,
    xTicks: ax.ticks,
    yTicks: ay.ticks,
    points,
    lines,
  }
}
