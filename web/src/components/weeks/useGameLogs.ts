import { useEffect, useState } from 'react'
import { filterArgs, useActiveLeagueId, useDataProvider } from '../../dataSource'
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
export function useGameLogs(
  playerIds: readonly EntityId[],
  season: Season,
  playoffs = true,
): GameLogs | null {
  const provider = useDataProvider()
  const leagueId = useActiveLeagueId()
  const [loaded, setLoaded] = useState<Loaded | null>(null)
  // One string, so a new array with the same players does not load again.
  const key = JSON.stringify([leagueId, season, playerIds, playoffs])

  useEffect(() => {
    const [league, year, ids, all] = JSON.parse(key) as [string | null, Season, EntityId[], boolean]
    if (league === null) return
    let cancelled = false
    const load = async (id: EntityId): Promise<[EntityId, GameLogEntry[]]> => {
      try {
        return [id, await provider.getGameLog(league, id, year, ...filterArgs(all))]
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
