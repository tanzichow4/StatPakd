import type { League, LeagueId } from '../domain/types'

/** The id of the first enabled league, or null when there is none. */
export function firstEnabledLeagueId(leagues: League[]): LeagueId | null {
  return leagues.find((l) => l.enabled)?.id ?? null
}
