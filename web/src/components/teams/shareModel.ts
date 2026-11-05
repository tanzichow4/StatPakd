import type { RosterEntry, RosterUnit, RosterUnitDef, StatDef } from '../../domain/types'
import { shares } from '../../lib/shares'
import { formatStat } from '../../lib/stats'
import { seriesColor, seriesTextColor } from '../../styles/series'

/** Segments with at least this percentage show their percent text. */
export const PCT_TEXT_MIN = 9

export interface ShareSegment {
  id: string
  value: number
  color: string
  /** Text colour for the percent text, chosen to meet 4.5:1 on `color`. */
  textColor: string
  pct: number
  /** Percent text inside the segment, or `null` when the segment is too small. */
  text: string | null
  tooltip: string
}

export interface ShareRowModel {
  key: string
  label: string
  barLabel: string
  totalText: string
  segments: ShareSegment[]
  /** `null` when the stat has no counted total. */
  leaderText: string | null
}

export interface LegendItem {
  id: string
  name: string
  color: string
}

export function findUnit(
  units: readonly RosterUnitDef[],
  key: RosterUnit,
): RosterUnitDef | undefined {
  return units.find((u) => u.key === key)
}

/** Share stats of a unit (those with a non-empty share label), in definition order. */
export function shareStats(unit: RosterUnitDef): StatDef[] {
  return unit.stats.filter((s) => s.shareLabel != null && s.shareLabel !== '')
}

/** Player name without its first word; the full name when it has a single word. */
export function leaderName(name: string): string {
  const words = name.trim().split(/\s+/)
  return words.length > 1 ? words.slice(1).join(' ') : words[0]
}

function counted(v: number | null | undefined): number {
  return v != null && Number.isFinite(v) && v > 0 ? v : 0
}

export function buildShareRow(def: StatDef, roster: readonly RosterEntry[]): ShareRowModel {
  const values = roster.map((r) => counted(r.stats[def.key]))
  const pcts = shares(values)
  const total = values.reduce((a, b) => a + b, 0)

  const segments: ShareSegment[] = []
  let leader = -1
  values.forEach((value, i) => {
    if (value <= 0) return
    if (leader === -1 || value > values[leader]) leader = i
    const pct = pcts[i]
    segments.push({
      id: roster[i].id,
      value,
      color: seriesColor(i),
      textColor: seriesTextColor(i),
      pct,
      text: pct >= PCT_TEXT_MIN ? `${pct}%` : null,
      tooltip: `${roster[i].name} · ${formatStat(value, def)} (${pct}%)`,
    })
  })

  return {
    key: def.key,
    label: def.shareLabel ?? def.label,
    barLabel: `${def.shareLabel ?? def.label} share`,
    totalText: `${formatStat(total, def)} total`,
    segments,
    leaderText:
      leader === -1 ? null : `Leader: ${leaderName(roster[leader].name)} ${pcts[leader]}%`,
  }
}

export function legendItems(roster: readonly RosterEntry[]): LegendItem[] {
  return roster.map((r, i) => ({ id: r.id, name: r.name, color: seriesColor(i) }))
}
