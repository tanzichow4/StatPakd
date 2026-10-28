export const SERIES_COUNT = 8

/** CSS color for the nth selected entity (0-based); wraps after SERIES_COUNT. */
export function seriesColor(index: number): string {
  return `var(--series-${(index % SERIES_COUNT) + 1})`
}
