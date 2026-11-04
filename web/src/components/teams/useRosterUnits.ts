import { useEffect, useState } from 'react'
import { useActiveLeagueId, useDataProvider } from '../../dataSource'
import type { LeagueId, RosterUnitDef } from '../../domain/types'

interface Loaded {
  leagueId: LeagueId
  units: RosterUnitDef[]
}

/** Roster unit definitions of the active league. `null` while loading or after a failure. */
export function useRosterUnits(): RosterUnitDef[] | null {
  const provider = useDataProvider()
  const leagueId = useActiveLeagueId()
  const [loaded, setLoaded] = useState<Loaded | null>(null)

  useEffect(() => {
    if (leagueId === null) return
    let cancelled = false
    provider.getRosterUnits(leagueId).then(
      (units) => {
        if (!cancelled) setLoaded({ leagueId, units })
      },
      () => {
        if (!cancelled) setLoaded(null)
      },
    )
    return () => {
      cancelled = true
    }
  }, [provider, leagueId])

  return loaded !== null && loaded.leagueId === leagueId ? loaded.units : null
}
