import { useEffect, useState } from 'react'
import { filterArgs, useActiveLeagueId, useDataProvider } from '../../dataSource'
import type { Entity, EntityKind, LeagueId, Season } from '../../domain/types'

interface Loaded {
  leagueId: LeagueId
  kind: EntityKind
  season: Season
  playoffs: boolean
  entities: Entity[]
}

/** Entities of the active league for a kind and season. Failures and stale loads give []. */
export function useEntities(kind: EntityKind, season: Season, playoffs = true): Entity[] {
  const provider = useDataProvider()
  const leagueId = useActiveLeagueId()
  const [loaded, setLoaded] = useState<Loaded | null>(null)

  useEffect(() => {
    if (leagueId === null) return
    let cancelled = false
    provider.getEntities(leagueId, kind, season, ...filterArgs(playoffs)).then(
      (entities) => {
        if (!cancelled) setLoaded({ leagueId, kind, season, playoffs, entities })
      },
      () => {
        if (!cancelled) setLoaded({ leagueId, kind, season, playoffs, entities: [] })
      },
    )
    return () => {
      cancelled = true
    }
  }, [provider, leagueId, kind, season, playoffs])

  const current =
    loaded !== null &&
    loaded.leagueId === leagueId &&
    loaded.kind === kind &&
    loaded.season === season &&
    loaded.playoffs === playoffs
  return current ? loaded.entities : []
}
