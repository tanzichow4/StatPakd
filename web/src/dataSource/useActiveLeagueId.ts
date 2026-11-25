import { useEffect, useState } from 'react'
import type { League, LeagueId } from '../domain/types'
import { firstEnabledLeagueId } from './activeLeague'
import { useDataProvider } from './useDataProvider'

/** The first enabled league of the data source; null while loading or on failure. */
export function useActiveLeagueId(): LeagueId | null {
  const provider = useDataProvider()
  const [leagues, setLeagues] = useState<League[]>([])

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

  return firstEnabledLeagueId(leagues)
}
