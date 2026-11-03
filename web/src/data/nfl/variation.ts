/** Stats that are rates: they vary within a narrower band. */
export const RATE: Readonly<Record<string, number>> = { cmp: 1, rate: 1, third: 1, win: 1 }

/** Deterministic hash (FNV-1a) of a string, mapped to [0, 1). */
export function rnd(str: string): number {
  let h = 2166136261
  for (const c of str) {
    h ^= c.charCodeAt(0)
    h = Math.imul(h, 16777619)
  }
  return ((h >>> 0) % 10000) / 10000
}

/** Round to one decimal place. */
export function round1(v: number): number {
  return Math.round(v * 10) / 10
}

/**
 * Deterministically vary a 2024 value for another season. 2024 and absent values pass through.
 * @param isInt round to an integer when true, otherwise to one decimal.
 */
export function vary(
  id: string,
  season: string,
  key: string,
  v: number | null | undefined,
  isInt: boolean,
): number | null {
  if (v == null) return null
  if (season === '2024') return v
  const r = rnd(id + season + key)
  const f = Object.hasOwn(RATE, key) ? 0.93 + 0.1 * r : 0.74 + 0.36 * r
  const out = key === 'to' ? Math.round(v * (r * 1.6 - 0.4)) : v * f
  return isInt ? Math.round(out) : round1(out)
}
