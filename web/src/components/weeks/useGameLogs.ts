import { useEffect, useState } from 'react'
import { useActiveLeagueId, useDataProvider } from '../../dataSource'
import type { EntityId, GameLogEntry, Season } from '../../domain/types'
import type { GameLogs } from './weekModel'

interface Loaded {
  key: string
  logs: GameLogs
}

/**
 * The season of each player, period by period. `null` while loading or for a stale load. A player
 * whose load fails gets an empty log.
 */
export function useGameLogs(playerIds: readonly EntityId[], season: Season): GameLogs | null {
  const provider = useDataProvider()
  const leagueId = useActiveLeagueId()
  const [loaded, setLoaded] = useState<Loaded | null>(null)
  // One string, so a new array with the same players does not load again.
  const key = JSON.stringify([leagueId, season, playerIds])

  useEffect(() => {
    const [league, year, ids] = JSON.parse(key) as [string | null, Season, EntityId[]]
    if (league === null) return
    let cancelled = false
    const load = async (id: EntityId): Promise<[EntityId, GameLogEntry[]]> => {
      try {
        return [id, await provider.getGameLog(league, id, year)]
      } catch {
        return [id, []]
      }
    }
    void Promise.all(ids.map(load)).then((entries) => {
      if (!cancelled) setLoaded({ key, logs: new Map(entries) })
    })
    return () => {
      cancelled = true
    }
  }, [provider, key])

  return loaded?.key === key ? loaded.logs : null
}
