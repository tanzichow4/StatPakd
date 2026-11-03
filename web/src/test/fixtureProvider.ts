import { vi } from 'vitest'
import type { DataProvider } from '../domain/provider'
import type { League, LeagueUiDefaults, Season, StatDef } from '../domain/types'

/** Invented leagues: nothing here matches a real league or the mock data. */
export const fixtureLeagues: League[] = [
  { id: 'zorb', name: 'Zorbball', enabled: true },
  { id: 'quix', name: 'Quixball', enabled: false },
  { id: 'flarn', name: 'Flarnball', enabled: false },
]

/** Invented seasons, newest first. */
export const fixtureSeasons: Season[] = ['3031', '3030', '3029']

/** A provider whose methods are vi.fn spies; override any method per test. */
export function createFixtureProvider(overrides: Partial<DataProvider> = {}): DataProvider {
  return {
    getLeagues: vi.fn(() => Promise.resolve(fixtureLeagues.map((l) => ({ ...l })))),
    getSeasons: vi.fn(() => Promise.resolve([...fixtureSeasons])),
    getStatDefs: vi.fn(() => Promise.resolve([])),
    getEntities: vi.fn(() => Promise.resolve([])),
    getRoster: vi.fn(() => Promise.resolve([])),
    ...overrides,
  }
}

export function fixtureUiDefaults(): LeagueUiDefaults {
  return {
    season: '3031',
    teamId: 'zt1',
    unit: 'zunit',
    sortKey: 'zscore',
    players: { sel: ['zp1', 'zp2'], stats: ['zscore', 'zblip'], ax: ['zscore', 'zblip', 'zscore'] },
    teams: { sel: ['zt1', 'zt2'], stats: ['ztpts', 'ztwin'], ax: ['ztpts', 'ztwin', 'ztpts'] },
  }
}

export function fixtureStatDefs(): { players: StatDef[]; teams: StatDef[] } {
  return {
    players: [
      { key: 'zscore', label: 'Zscore', group: 'zgroup' },
      { key: 'zblip', label: 'Zblip', group: 'zgroup' },
    ],
    teams: [
      { key: 'ztpts', label: 'Ztpts', group: 'ztgroup' },
      { key: 'ztwin', label: 'Ztwin', group: 'ztgroup' },
    ],
  }
}

export interface Deferred<T> {
  promise: Promise<T>
  resolve: (value: T) => void
  reject: (reason?: unknown) => void
}

/** A promise that the test settles by hand. */
export function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}
