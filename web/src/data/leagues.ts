import type { League } from '../domain/types'

/** Fresh copy of the league registry; only the NFL is enabled. */
export function getLeagueRegistry(): League[] {
  return [
    { id: 'nfl', name: 'NFL', enabled: true },
    { id: 'nba', name: 'NBA', enabled: false },
    { id: 'mlb', name: 'MLB', enabled: false },
    { id: 'nhl', name: 'NHL', enabled: false },
  ]
}
