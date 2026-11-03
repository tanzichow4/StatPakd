import { vi } from 'vitest'
import type { DataProvider } from '../domain/provider'
import type { Entity, EntityKind, LeagueUiDefaults, StatDef } from '../domain/types'
import { createFixtureProvider } from './fixtureProvider'

/**
 * Invented compare data. Definition order differs from the order a test may select stats in, so
 * canonical order (group first appearance, then definition order) is zhigh, zlow, zbig, zsign,
 * zsolo.
 */
export function compareStatDefs(): { players: StatDef[]; teams: StatDef[] } {
  return {
    players: [
      { key: 'zhigh', label: 'Zhigh', group: 'zga', decimals: 0 },
      { key: 'zbig', label: 'Zbig', group: 'zgb', decimals: 0 },
      { key: 'zlow', label: 'Zlow', group: 'zga', decimals: 2, lowerIsBetter: true },
      { key: 'zsign', label: 'Zsign', group: 'zgb', decimals: 1, signed: true },
      { key: 'zsolo', label: 'Zsolo', group: 'zgb', decimals: 0 },
    ],
    teams: [
      { key: 'ztpts', label: 'Ztpts', group: 'ztg', decimals: 1 },
      { key: 'ztlow', label: 'Ztlow', group: 'ztg', decimals: 1, lowerIsBetter: true },
      { key: 'ztwin', label: 'Ztwin', group: 'ztg2', decimals: 0 },
    ],
  }
}

/** Canonical player stat order of compareStatDefs. */
export const CANONICAL_PLAYER_KEYS = ['zhigh', 'zlow', 'zbig', 'zsign', 'zsolo']

const playerRows: Array<[string, string, string, Record<string, number | null>]> = [
  // zhigh ties on zp1/zp2; zp4 has a null zhigh; zp2 has the smallest zlow of zp1..zp3.
  ['zp1', 'Ola Quenby', 'Quenby', { zhigh: 10, zlow: 3.5, zbig: 4000, zsign: 2, zsolo: 7 }],
  ['zp2', 'Pim Rastow', 'Rastow', { zhigh: 10, zlow: 1.25, zbig: 1200, zsign: -1, zsolo: null }],
  ['zp3', 'Quill Dorvane', 'Dorvane', { zhigh: 5, zlow: 2, zbig: 1000, zsign: 0 }],
  ['zp4', 'Rex Tolliver', 'Tolliver', { zhigh: null, zlow: 9, zbig: 2500, zsign: 4, zsolo: null }],
  ['zp5', 'Sana Whitlock', 'Whitlock', { zhigh: 7, zlow: 4, zbig: 1500, zsign: 1, zsolo: null }],
  ['zp6', 'Tobi Yarrow', 'Yarrow', { zhigh: 1, zlow: 5, zbig: 1100, zsign: 3, zsolo: null }],
  ['zp7', 'Ulla Vexley', 'Vexley', { zhigh: 2, zlow: 6, zbig: 1300, zsign: 5, zsolo: null }],
  ['zp8', 'Vik Zandor', 'Zandor', { zhigh: 3, zlow: 8, zbig: 1400, zsign: 6, zsolo: null }],
]

/** Eight invented players with distinct name / shortName / meta / badge. */
export function comparePlayers(): Entity[] {
  return playerRows.map(([id, name, shortName, stats], i) => ({
    id,
    name,
    shortName,
    meta: `zmeta ${id}`,
    badge: `ZB${i + 1}`,
    stats: { ...stats },
  }))
}

/** Three invented teams; ztlow is lower-is-better. */
export function compareTeams(): Entity[] {
  const rows: Array<[string, string, string, Record<string, number>]> = [
    ['zt1', 'Zephyr Flarns', 'ZQA', { ztpts: 30, ztlow: 20.5, ztwin: 12 }],
    ['zt2', 'Quark Boulders', 'ZQB', { ztpts: 25, ztlow: 18.2, ztwin: 9 }],
    ['zt3', 'Mirth Hawks', 'ZQC', { ztpts: 28, ztlow: 22, ztwin: 10 }],
  ]
  return rows.map(([id, name, shortName, stats]) => ({
    id,
    name,
    shortName,
    meta: `zteammeta ${id}`,
    badge: shortName,
    stats,
  }))
}

/** Defaults with chosen selections and stats; ax values are unused by the compare panel. */
export function compareDefaults(
  opts: {
    players?: string[]
    playerStats?: string[]
    teams?: string[]
    teamStats?: string[]
  } = {},
): LeagueUiDefaults {
  return {
    season: '3031',
    teamId: 'zt1',
    unit: 'zunit',
    sortKey: 'zhigh',
    players: {
      sel: opts.players ?? ['zp1', 'zp2', 'zp3'],
      stats: opts.playerStats ?? ['zhigh', 'zlow', 'zbig'],
      ax: ['zhigh', 'zlow', 'zbig'],
    },
    teams: {
      sel: opts.teams ?? ['zt1', 'zt2', 'zt3'],
      stats: opts.teamStats ?? ['ztpts', 'ztlow'],
      ax: ['ztpts', 'ztlow', 'ztwin'],
    },
  }
}

/** A provider serving the compare fixtures; override any method per test. */
export function compareProvider(overrides: Partial<DataProvider> = {}): DataProvider {
  const defs = compareStatDefs()
  return createFixtureProvider({
    getStatDefs: vi.fn((_leagueId: string, kind: EntityKind) => Promise.resolve(defs[kind])),
    getEntities: vi.fn((_leagueId: string, kind: EntityKind) =>
      Promise.resolve(kind === 'players' ? comparePlayers() : compareTeams()),
    ),
    ...overrides,
  })
}
