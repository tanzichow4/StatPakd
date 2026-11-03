import { useEffect, useState } from 'react'
import { useActiveLeagueId, useDataProvider } from '../../dataSource'
import type { EntityKind, LeagueId, StatDef } from '../../domain/types'

interface Loaded {
  leagueId: LeagueId
  kind: EntityKind
  defs: StatDef[]
}

/** Stat definitions of the active league for a kind. Loading, failure and stale loads give []. */
export function useStatDefs(kind: EntityKind): StatDef[] {
  const provider = useDataProvider()
  const leagueId = useActiveLeagueId()
  const [loaded, setLoaded] = useState<Loaded | null>(null)

  useEffect(() => {
    if (leagueId === null) return
    let cancelled = false
    provider.getStatDefs(leagueId, kind).then(
      (defs) => {
        if (!cancelled) setLoaded({ leagueId, kind, defs })
      },
      () => {
        if (!cancelled) setLoaded({ leagueId, kind, defs: [] })
      },
    )
    return () => {
      cancelled = true
    }
  }, [provider, leagueId, kind])

  const current = loaded !== null && loaded.leagueId === leagueId && loaded.kind === kind
  return current ? loaded.defs : []
}
