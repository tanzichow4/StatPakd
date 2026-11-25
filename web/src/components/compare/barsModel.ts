import type { Entity, StatDef, StatValue } from '../../domain/types'
import { barWidth, formatStat, leagueRange } from '../../lib/stats'
import type { CompareColumn } from './tableModel'

export interface BarLine {
  entity: Entity
  colorIndex: number
  value: StatValue | undefined
  width: number
  text: string
  na: boolean
}

export interface BarRow {
  def: StatDef
  lines: BarLine[]
}

/** One row per stat, one line per selected column; widths are scaled to the league pool range. */
export function barRows(
  rows: StatDef[],
  columns: CompareColumn[],
  pool: readonly Entity[],
): BarRow[] {
  return rows.map((def) => {
    const range = leagueRange(pool, def.key)
    const lines = columns.map(({ entity, colorIndex }): BarLine => {
      const value = entity.stats[def.key]
      return {
        entity,
        colorIndex,
        value,
        width: barWidth(value, range),
        text: formatStat(value, def),
        na: value == null,
      }
    })
    return { def, lines }
  })
}
