import { useEffect, useState } from 'react'
import { filterArgs, useActiveLeagueId, useDataProvider } from '../../dataSource'
import type { LeagueId, RosterEntry, RosterUnit, Season, TeamId } from '../../domain/types'

interface Loaded {
  leagueId: LeagueId
  teamId: TeamId
  unit: RosterUnit
  season: Season
  playoffs: boolean
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
  playoffs = true,
): RosterEntry[] | null {
  const provider = useDataProvider()
  const leagueId = useActiveLeagueId()
  const [loaded, setLoaded] = useState<Loaded | null>(null)

  useEffect(() => {
    if (leagueId === null || unit === null) return
    let cancelled = false
    provider.getRoster(leagueId, teamId, unit, season, ...filterArgs(playoffs)).then(
      (roster) => {
        if (!cancelled) setLoaded({ leagueId, teamId, unit, season, playoffs, roster })
      },
      () => {
        if (!cancelled) setLoaded(null)
      },
    )
    return () => {
      cancelled = true
    }
  }, [provider, leagueId, teamId, unit, season, playoffs])

  const current =
    loaded !== null &&
    unit !== null &&
    loaded.leagueId === leagueId &&
    loaded.teamId === teamId &&
    loaded.unit === unit &&
    loaded.season === season &&
    loaded.playoffs === playoffs
  return current ? loaded.roster : null
}
