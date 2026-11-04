import type { Entity, EntityId, Season, StatDef, StatMap } from '../../domain/types'
import { formatStat } from '../../lib/stats'
import type { TeamMode } from '../../state/appState'

/** One labelled value in the team header summary. */
export interface SummaryStat {
  key: string
  label: string
  text: string
}

/** The team with the given id, or undefined when there is none. */
export function findTeam(entities: readonly Entity[], teamId: EntityId): Entity | undefined {
  return entities.find((e) => e.id === teamId)
}

/** The header subtitle: the entity's preformatted meta, then the season. */
export function teamMetaLine(entity: Pick<Entity, 'meta'>, season: Season): string {
  return `${entity.meta} · ${season}`
}

/** Summary stats (defs with a non-empty `summaryLabel`) in definition order, formatted. */
export function summaryStats(defs: readonly StatDef[], stats: StatMap): SummaryStat[] {
  const result: SummaryStat[] = []
  for (const def of defs) {
    if (!def.summaryLabel) continue
    result.push({ key: def.key, label: def.summaryLabel, text: formatStat(stats[def.key], def) })
  }
  return result
}

/** Hint text shown next to the team mode switch. */
export function teamModeHint(mode: TeamMode, max: number): string {
  return mode === 'compare'
    ? `Compare up to ${max} teams side by side`
    : 'Compare players within one team'
}
