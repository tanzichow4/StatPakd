import { useEffect, useState, type ReactNode } from 'react'
import { firstEnabledLeagueId, useDataProvider } from '../../dataSource'
import type { EntityKind, LeagueUiDefaults, StatDef } from '../../domain/types'
import styles from './Data.module.css'

/** What the app needs before it can start. */
export interface StartData {
  defaults: LeagueUiDefaults
  statDefs: Record<EntityKind, StatDef[]>
}

interface Props {
  /** Supplied by a data source that has its starting data at hand; nothing is loaded then. */
  initial?: StartData
  children: (start: StartData) => ReactNode
}

type Loaded = { attempt: number; start?: StartData; error?: string }

/** Loads the starting data, showing progress, or the failure with a way to try again. */
export function Bootstrap({ initial, children }: Props) {
  const provider = useDataProvider()
  const [attempt, setAttempt] = useState(0)
  const [loaded, setLoaded] = useState<Loaded | null>(null)

  useEffect(() => {
    if (initial) return
    let cancelled = false
    const load = async (): Promise<StartData> => {
      const leagueId = firstEnabledLeagueId(await provider.getLeagues())
      if (leagueId === null) throw new Error('No league has data yet.')
      const [defaults, players, teams] = await Promise.all([
        provider.getUiDefaults(leagueId),
        provider.getStatDefs(leagueId, 'players'),
        provider.getStatDefs(leagueId, 'teams'),
      ])
      return { defaults, statDefs: { players, teams } }
    }
    load().then(
      (start) => {
        if (!cancelled) setLoaded({ attempt, start })
      },
      (error: unknown) => {
        if (!cancelled) {
          setLoaded({ attempt, error: error instanceof Error ? error.message : String(error) })
        }
      },
    )
    return () => {
      cancelled = true
    }
  }, [provider, initial, attempt])

  if (initial) return children(initial)
  const current = loaded?.attempt === attempt ? loaded : null
  if (current?.start) return children(current.start)

  return (
    <main className={styles.screen}>
      <h1 className={styles.title}>StatPakd</h1>
      {current?.error ? (
        <div role="alert" className={styles.message}>
          <p>Could not load the data. {current.error}</p>
          <button
            type="button"
            className={styles.retry}
            onClick={() => {
              provider.status?.reset()
              setAttempt((n) => n + 1)
            }}
          >
            Retry
          </button>
        </div>
      ) : (
        <output className={styles.message}>
          Loading data… The first start downloads it, which can take a minute.
        </output>
      )}
    </main>
  )
}
