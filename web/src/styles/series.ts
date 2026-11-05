export const SERIES_COUNT = 8

/** CSS color for the nth selected entity (0-based); wraps after SERIES_COUNT. */
export function seriesColor(index: number): string {
  return `var(--series-${(index % SERIES_COUNT) + 1})`
}

/** Text colour that meets 4.5:1 on the nth series colour: white where it passes, else ink. */
export function seriesTextColor(index: number): string {
  const n = (index % SERIES_COUNT) + 1
  return n === 1 || n === 3 || n === 6 ? 'var(--color-white)' : 'var(--color-ink)'
}
