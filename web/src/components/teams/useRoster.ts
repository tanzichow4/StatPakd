import { useEffect, useState } from 'react'
import { useActiveLeagueId, useDataProvider } from '../../dataSource'
import type { LeagueId, RosterEntry, RosterUnit, Season, TeamId } from '../../domain/types'

interface Loaded {
  leagueId: LeagueId
  teamId: TeamId
  unit: RosterUnit
  season: Season
  roster: RosterEntry[]
}

/**
 * Roster of a team for a unit and season. `null` while loading, after a failure, for a stale
 * load, or when `unit` is `null` (no provider call is made).
 */
export function useRoster(
  teamId: TeamId,
  unit: RosterUnit | null,
  season: Season,
): RosterEntry[] | null {
  const provider = useDataProvider()
  const leagueId = useActiveLeagueId()
  const [loaded, setLoaded] = useState<Loaded | null>(null)

  useEffect(() => {
    if (leagueId === null || unit === null) return
    let cancelled = false
    provider.getRoster(leagueId, teamId, unit, season).then(
      (roster) => {
        if (!cancelled) setLoaded({ leagueId, teamId, unit, season, roster })
      },
      () => {
        if (!cancelled) setLoaded(null)
      },
    )
    return () => {
      cancelled = true
    }
  }, [provider, leagueId, teamId, unit, season])

  const current =
    loaded !== null &&
    unit !== null &&
    loaded.leagueId === leagueId &&
    loaded.teamId === teamId &&
    loaded.unit === unit &&
    loaded.season === season
  return current ? loaded.roster : null
}
