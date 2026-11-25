import type { EntityId, RosterEntry, RosterUnitDef, StatDef, StatValue } from '../../domain/types'
import { NULL_PLACEHOLDER, formatStat } from '../../lib/stats'
import type { SortDir } from '../../state/appState'
import { seriesColor } from '../../styles/series'

export interface RosterColumn {
  key: string
  label: string
  percent: boolean
  ariaSort: 'descending' | 'ascending' | 'none'
  arrow: '↓' | '↑' | null
}

export interface RosterCell {
  key: string
  text: string
  leader: boolean
  /** Bar fill width 0-100 for percent columns, otherwise `null`. */
  bar: number | null
}

export interface RosterRow {
  id: EntityId
  name: string
  meta: string
  color: string
  cells: RosterCell[]
}

export interface RosterTableModel {
  columns: RosterColumn[]
  rows: RosterRow[]
}

/** The value when it is a finite number, otherwise `null`. */
export function finiteValue(v: StatValue | undefined): number | null {
  return typeof v === 'number' && Number.isFinite(v) ? v : null
}

/**
 * Sort a roster by a stat. Non-numeric values go last in both directions; ties and non-numeric
 * entries keep roster order. Returns a new array and never mutates the input.
 */
export function sortRosterEntries(
  roster: readonly RosterEntry[],
  key: string,
  dir: SortDir,
): RosterEntry[] {
  const numeric: { entry: RosterEntry; i: number; v: number }[] = []
  const rest: RosterEntry[] = []
  roster.forEach((entry, i) => {
    const v = finiteValue(entry.stats[key])
    if (v === null) rest.push(entry)
    else numeric.push({ entry, i, v })
  })
  numeric.sort((a, b) => dir * (a.v - b.v) || a.i - b.i)
  return [...numeric.map((n) => n.entry), ...rest]
}

/** Table columns: the unit's non-extra stat definitions in definition order. */
export function tableColumns(unit: RosterUnitDef): StatDef[] {
  return unit.stats.filter((s) => !s.extra)
}

/** Ids of the entries holding the column maximum, when that maximum is above zero. */
export function columnLeaders(roster: readonly RosterEntry[], def: StatDef): Set<EntityId> {
  const values = roster.map((e) => finiteValue(e.stats[def.key]))
  const nums = values.filter((v): v is number => v !== null)
  const leaders = new Set<EntityId>()
  if (nums.length === 0) return leaders
  const max = Math.max(...nums)
  if (!(max > 0)) return leaders
  roster.forEach((e, i) => {
    if (values[i] === max) leaders.add(e.id)
  })
  return leaders
}

/** Display text of a cell: "—" when missing or not finite, `%` appended for percent stats. */
export function cellText(v: StatValue | undefined, def: StatDef): string {
  const n = finiteValue(v)
  if (n === null) return NULL_PLACEHOLDER
  const text = formatStat(n, def)
  return def.percent ? `${text}%` : text
}

/** Bar fill width, clamped to 0-100; 0 when the value is not finite. */
export function barPercent(v: StatValue | undefined): number {
  const n = finiteValue(v)
  if (n === null) return 0
  return Math.min(100, Math.max(0, n))
}

/** Meta line: "position · #number", or just the position when there is no number. */
export function playerMeta(entry: RosterEntry): string {
  return entry.number === undefined ? entry.position : `${entry.position} · #${entry.number}`
}

export function buildRosterTable(
  unit: RosterUnitDef,
  roster: readonly RosterEntry[],
  sort: { k: string; d: SortDir },
): RosterTableModel {
  const defs = tableColumns(unit)
  const sorted = defs.some((d) => d.key === sort.k)
  const columns: RosterColumn[] = defs.map((d) => {
    const active = sorted && d.key === sort.k
    return {
      key: d.key,
      label: d.label,
      percent: d.percent === true,
      ariaSort: active ? (sort.d === -1 ? 'descending' : 'ascending') : 'none',
      arrow: active ? (sort.d === -1 ? '↓' : '↑') : null,
    }
  })
  const leaders = defs.map((d) => columnLeaders(roster, d))
  const index = new Map<EntityId, number>(roster.map((e, i) => [e.id, i]))
  const ordered = sorted ? sortRosterEntries(roster, sort.k, sort.d) : [...roster]
  const rows: RosterRow[] = ordered.map((e) => ({
    id: e.id,
    name: e.name,
    meta: playerMeta(e),
    color: seriesColor(index.get(e.id) ?? 0),
    cells: defs.map((d, c) => ({
      key: d.key,
      text: cellText(e.stats[d.key], d),
      leader: leaders[c].has(e.id),
      bar: d.percent ? barPercent(e.stats[d.key]) : null,
    })),
  }))
  return { columns, rows }
}
