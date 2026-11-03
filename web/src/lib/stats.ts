import type { Entity, StatDef, StatValue } from '../domain/types'

/** Min and max of a stat across a pool, or `null` when no value exists ("no range"). */
export type StatRange = { readonly min: number; readonly max: number } | null

/** Shown in place of a missing stat value (U+2014 em dash). */
export const NULL_PLACEHOLDER = '—'

/** Formats a stat value for display, following the design script. */
export function formatStat(
  value: StatValue | undefined,
  def: Pick<StatDef, 'decimals' | 'signed'>,
): string {
  if (value == null) return NULL_PLACEHOLDER
  const text = def.decimals ? value.toFixed(def.decimals) : value.toLocaleString('en-US')
  return def.signed && value > 0 ? `+${text}` : text
}

/** Indices (ascending) of every best value; empty when fewer than 2 non-null values exist. */
export function bestIndex(
  values: ReadonlyArray<StatValue | undefined>,
  def: Pick<StatDef, 'lowerIsBetter'>,
): number[] {
  const present: number[] = []
  for (const v of values) {
    if (v != null) present.push(v)
  }
  if (present.length < 2) return []
  let best = present[0]
  for (const v of present) {
    if (def.lowerIsBetter ? v < best : v > best) best = v
  }
  const result: number[] = []
  values.forEach((v, i) => {
    if (v != null && v === best) result.push(i)
  })
  return result
}

/** Min and max of `stats[key]` across entities, ignoring null and missing values. */
export function leagueRange(
  entities: ReadonlyArray<Pick<Entity, 'stats'>>,
  key: string,
): StatRange {
  let min = Infinity
  let max = -Infinity
  let seen = false
  for (const entity of entities) {
    const v = entity.stats[key]
    if (v == null) continue
    seen = true
    if (v < min) min = v
    if (v > max) max = v
  }
  return seen ? { min, max } : null
}

/** Position of a value within the range, 0 to 1. Optionally inverted for lower-is-better stats. */
export function normalize(
  value: StatValue | undefined,
  range: StatRange,
  def: Pick<StatDef, 'lowerIsBetter'>,
  options?: { invertLowerIsBetter?: boolean },
): number {
  if (value == null) return 0
  if (range == null) return 0.5
  const n = range.max === range.min ? 0.5 : (value - range.min) / (range.max - range.min)
  return options?.invertLowerIsBetter && def.lowerIsBetter ? 1 - n : n
}

/** Integer bar width percentage (5 to 100); 0 for a missing value. Bars never invert. */
export function barWidth(value: StatValue | undefined, range: StatRange): number {
  if (value == null) return 0
  return Math.round((0.05 + 0.95 * normalize(value, range, {})) * 100)
}
