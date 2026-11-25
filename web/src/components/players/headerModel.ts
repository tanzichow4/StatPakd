import type { StatDef, StatMap } from '../../domain/types'
import { formatStat } from '../../lib/stats'
import type { SummaryStat } from '../teams/teamHeaderModel'

/** Most season stats shown in the player header. */
export const HEADER_STATS = 5

/** Season totals for the header: the stats picked for comparison first, only those with a value. */
export function summaryRow(
  defs: readonly StatDef[],
  stats: StatMap,
  picked: readonly string[],
): SummaryStat[] {
  const wanted = new Set(picked)
  const withValue = defs.filter((d) => !d.extra && stats[d.key] != null)
  return [
    ...withValue.filter((d) => wanted.has(d.key)),
    ...withValue.filter((d) => !wanted.has(d.key)),
  ]
    .slice(0, HEADER_STATS)
    .map((d) => ({ key: d.key, label: d.label, text: formatStat(stats[d.key], d) }))
}
