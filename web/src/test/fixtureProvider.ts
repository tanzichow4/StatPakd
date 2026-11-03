import { vi } from 'vitest'
import type { DataProvider } from '../domain/provider'
import type { Entity, EntityKind, League, LeagueUiDefaults, Season, StatDef } from '../domain/types'

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

const playerRows: [string, string, string | undefined, string][] = [
  ['zp1', 'Ola Quenby', 'ZA', 'zt1'],
  ['zp2', 'Pim Rastow', 'ZB', 'zt1'],
  ['zp3', 'Quill Dorvane', 'ZC', 'zt2'],
  ['zp4', 'Rex Tolliver', 'ZA', 'zt2'],
  ['zp5', 'Sana Whitlock', 'ZB', 'zt1'],
  ['zp6', 'Tobi Yarrow', 'ZC', 'zt2'],
  ['zp7', 'Ulla Vexley', 'ZA', 'zt1'],
  ['zp8', 'Vik Zandor', 'ZB', 'zt2'],
  ['zp9', 'Wren Ostby', 'ZC', 'zt1'],
  ['zp10', 'Xan Pellum', undefined, 'zt2'],
]

/** Ten invented players with invented positions; the last has no position. */
export function fixturePlayers(): Entity[] {
  return playerRows.map(([id, name, position, teamId]) => ({
    id,
    name,
    shortName: name.split(' ')[1],
    meta: `${teamId} meta ${id}`,
    badge: position ?? 'ZN',
    ...(position ? { position } : {}),
    teamId,
    stats: { zscore: 1, zblip: 2 },
  }))
}

/** Four invented teams; teams carry no teamId. */
export function fixtureTeams(): Entity[] {
  const rows: [string, string, string][] = [
    ['zt1', 'Zephyr Flarns', 'ZQA'],
    ['zt2', 'Quark Boulders', 'ZQB'],
    ['zt3', 'Mirth Hawks', 'ZQC'],
    ['zt4', 'Nimbus Owls', 'ZQD'],
  ]
  return rows.map(([id, name, shortName]) => ({
    id,
    name,
    shortName,
    meta: `meta ${id}`,
    badge: shortName,
    stats: { ztpts: 1, ztwin: 2 },
  }))
}

/** A fixture provider whose getEntities resolves the fixture players or teams by kind. */
export function entitiesProvider(overrides: Partial<DataProvider> = {}): DataProvider {
  return createFixtureProvider({
    getEntities: vi.fn((_leagueId: string, kind: EntityKind) =>
      Promise.resolve(kind === 'players' ? fixturePlayers() : fixtureTeams()),
    ),
    ...overrides,
  })
}
