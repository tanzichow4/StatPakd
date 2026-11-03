import { useEffect, useState } from 'react'
import { useActiveLeagueId, useDataProvider } from '../../dataSource'
import type { Entity, EntityKind, LeagueId, Season } from '../../domain/types'

interface Loaded {
  leagueId: LeagueId
  kind: EntityKind
  season: Season
  entities: Entity[]
}

/** Entities of the active league for a kind and season. Failures and stale loads give []. */
export function useEntities(kind: EntityKind, season: Season): Entity[] {
  const provider = useDataProvider()
  const leagueId = useActiveLeagueId()
  const [loaded, setLoaded] = useState<Loaded | null>(null)

  useEffect(() => {
    if (leagueId === null) return
    let cancelled = false
    provider.getEntities(leagueId, kind, season).then(
      (entities) => {
        if (!cancelled) setLoaded({ leagueId, kind, season, entities })
      },
      () => {
        if (!cancelled) setLoaded({ leagueId, kind, season, entities: [] })
      },
    )
    return () => {
      cancelled = true
    }
  }, [provider, leagueId, kind, season])

  const current =
    loaded !== null &&
    loaded.leagueId === leagueId &&
    loaded.kind === kind &&
    loaded.season === season
  return current ? loaded.entities : []
}
