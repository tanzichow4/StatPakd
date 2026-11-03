import { useEffect, useState } from 'react'
import { firstEnabledLeagueId, useDataProvider } from '../../dataSource'
import type { League, LeagueId, Season } from '../../domain/types'

export interface NavData {
  leagues: League[]
  activeLeagueId: LeagueId | null
  seasons: Season[]
}

/** Loads leagues, and the seasons of the first enabled league. Failures become empty lists. */
export function useNavData(): NavData {
  const provider = useDataProvider()
  const [leagues, setLeagues] = useState<League[]>([])
  const [loaded, setLoaded] = useState<{ leagueId: LeagueId; seasons: Season[] } | null>(null)

  useEffect(() => {
    let cancelled = false
    provider.getLeagues().then(
      (result) => {
        if (!cancelled) setLeagues(result)
      },
      () => {
        if (!cancelled) setLeagues([])
      },
    )
    return () => {
      cancelled = true
    }
  }, [provider])

  const activeLeagueId = firstEnabledLeagueId(leagues)

  useEffect(() => {
    let cancelled = false
    if (activeLeagueId === null) return
    const leagueId = activeLeagueId
    provider.getSeasons(leagueId).then(
      (result) => {
        if (!cancelled) setLoaded({ leagueId, seasons: result })
      },
      () => {
        if (!cancelled) setLoaded({ leagueId, seasons: [] })
      },
    )
    return () => {
      cancelled = true
    }
  }, [provider, activeLeagueId])

  // Seasons loaded for another league are never shown.
  const seasons = loaded && loaded.leagueId === activeLeagueId ? loaded.seasons : []

  return { leagues, activeLeagueId, seasons }
}
