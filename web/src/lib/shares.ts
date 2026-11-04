/**
 * Integer percentages for a list of stat values, by the largest-remainder method.
 * Null, undefined, zero, negative and non-finite values count as 0 and get 0%. When the counted
 * total is 0 every entry is 0; otherwise the result sums to exactly 100. Equal remainders go to
 * the earlier entry. Does not mutate its input.
 */
export function shares(values: ReadonlyArray<number | null | undefined>): number[] {
  const counted = values.map((v) => (v != null && Number.isFinite(v) && v > 0 ? v : 0))
  const total = counted.reduce((sum, v) => sum + v, 0)
  if (!(total > 0) || !Number.isFinite(total)) return counted.map(() => 0)

  const exact = counted.map((v) => (100 * v) / total)
  const result = exact.map((x) => Math.floor(x))
  let leftover = 100 - result.reduce((sum, p) => sum + p, 0)
  const order = exact
    .map((x, i) => ({ i, rem: x - Math.floor(x) }))
    .sort((a, b) => b.rem - a.rem || a.i - b.i)
  for (const { i } of order) {
    if (leftover <= 0) break
    if (counted[i] > 0) {
      result[i] += 1
      leftover -= 1
    }
  }
  return result
}
