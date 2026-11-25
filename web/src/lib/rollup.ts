import type { StatDef, StatMap, StatValue } from '../domain/types'

const round = (v: number, decimals: number) => {
  const f = 10 ** decimals
  return Math.round(v * f) / f
}

const sum = (values: readonly number[]) => values.reduce((a, v) => a + v, 0)

/** The values of one key that exist across the periods. */
function present(periods: readonly StatMap[], key: string): number[] {
  const out: number[] = []
  for (const p of periods) {
    const v = p[key]
    if (v != null) out.push(v)
  }
  return out
}

/** One total for a stat over several periods, following the stat's rollup rule. */
export function rollup(
  def: Pick<StatDef, 'key' | 'decimals' | 'rollup'>,
  periods: readonly StatMap[],
): StatValue {
  const rule = def.rollup
  const decimals = def.decimals ?? 0
  if (rule?.kind === 'ratio') {
    const num = present(periods, rule.num)
    const den = present(periods, rule.den)
    if (num.length === 0 || den.length === 0) return null
    const below = rule.minDen === undefined ? sum(den) : Math.max(sum(den), rule.minDen)
    return below === 0 ? null : round((sum(num) / below) * (rule.scale ?? 1), decimals)
  }
  const values = present(periods, def.key)
  if (values.length === 0) return null
  if (rule?.kind === 'average') return round(sum(values) / values.length, decimals)
  // Rounding hides the binary fraction error of adding decimals.
  return round(sum(values), Math.max(decimals, 6))
}
