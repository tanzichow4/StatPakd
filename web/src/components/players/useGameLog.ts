import { useEffect, useState } from 'react'
import { useActiveLeagueId, useDataProvider } from '../../dataSource'
import type { EntityId, GameLogEntry, LeagueId, Season } from '../../domain/types'

interface Loaded {
  leagueId: LeagueId
  playerId: EntityId
  season: Season
  log: GameLogEntry[]
}

/**
 * A player's season, period by period. `null` while loading or for a stale load; `[]` after a
 * failure or when there is no data.
 */
export function useGameLog(playerId: EntityId, season: Season): GameLogEntry[] | null {
  const provider = useDataProvider()
  const leagueId = useActiveLeagueId()
  const [loaded, setLoaded] = useState<Loaded | null>(null)

  useEffect(() => {
    if (leagueId === null) return
    let cancelled = false
    provider.getGameLog(leagueId, playerId, season).then(
      (log) => {
        if (!cancelled) setLoaded({ leagueId, playerId, season, log })
      },
      () => {
        if (!cancelled) setLoaded({ leagueId, playerId, season, log: [] })
      },
    )
    return () => {
      cancelled = true
    }
  }, [provider, leagueId, playerId, season])

  const current =
    loaded !== null &&
    loaded.leagueId === leagueId &&
    loaded.playerId === playerId &&
    loaded.season === season
  return current ? loaded.log : null
}
