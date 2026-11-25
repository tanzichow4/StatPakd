import { describe, expect, it } from 'vitest'
import type { DataProvider } from './provider'
import type {
  Entity,
  EntityKind,
  GameLogEntry,
  League,
  RosterEntry,
  RosterUnitDef,
  StatDef,
} from './types'

const leagues: League[] = [
  { id: 'league-a', name: 'League A', enabled: true },
  { id: 'league-b', name: 'League B', enabled: false },
]

const statDefs: StatDef[] = [
  { key: 'points', label: 'Points', group: 'Scoring' },
  {
    key: 'errors',
    label: 'Errors',
    group: 'Discipline',
    decimals: 1,
    lowerIsBetter: true,
    signed: false,
    extra: true,
  },
]

const entities: Entity[] = [
  {
    id: 'entity-1',
    name: 'Entity One',
    shortName: 'E. One',
    meta: 'Team 1 · Role X · #7',
    badge: 'RX',
    position: 'Role X',
    teamId: 'team-1',
    stats: { points: 12, errors: null, zero: 0 },
  },
  {
    id: 'team-1',
    name: 'Team One',
    shortName: 'T1',
    meta: 'Group 1',
    badge: 'T1',
    stats: {},
  },
]

const roster: RosterEntry[] = [
  { id: 'entity-1', name: 'Entity One', position: 'Role X', number: 7, stats: { points: 12 } },
  { id: 'entity-2', name: 'Entity Two', position: 'Role Y', stats: { points: null } },
]

const rosterUnits: RosterUnitDef[] = [
  {
    key: 'unit-1',
    label: 'Unit One',
    stats: [
      { key: 'points', label: 'Points', group: 'Scoring', shareLabel: 'Pts' },
      { key: 'errors', label: 'Errors', group: 'Scoring' },
    ],
  },
  { key: 'unit-2', label: 'Unit Two', stats: [] },
]

const provider: DataProvider = {
  getLeagues: async () => leagues,
  getSeasons: async (leagueId) => (leagueId === 'league-a' ? ['2002', '2001'] : []),
  getStatDefs: async (_leagueId, kind) => (kind === 'players' ? statDefs : []),
  getEntities: async (_leagueId, kind, season) =>
    kind === 'players' && season === '2002' ? entities : [],
  getRoster: async (_leagueId, teamId, unit, _season) =>
    teamId === 'team-1' && unit === 'unit-1' ? roster : [],
  getRosterUnits: async (leagueId) => (leagueId === 'league-a' ? rosterUnits : []),
  getGameLog: async (_leagueId, playerId): Promise<GameLogEntry[]> =>
    playerId === 'entity-1'
      ? [
          { period: 1, label: 'Round 1', shortLabel: 'R1', played: true, stats: { points: 3 } },
          { period: 2, label: 'Round 2', shortLabel: 'R2', played: false, stats: {} },
        ]
      : [],
}

describe('domain types and DataProvider contract', () => {
  it('AC9: getLeagues resolves to League objects', async () => {
    const result = await provider.getLeagues()
    expect(result).toHaveLength(2)
    expect(result[0]).toEqual({ id: 'league-a', name: 'League A', enabled: true })
    expect(typeof result[1].enabled).toBe('boolean')
  })

  it('AC9: getSeasons resolves to a string array, newest first', async () => {
    const result = await provider.getSeasons('league-a')
    expect(result).toEqual(['2002', '2001'])
  })

  it('AC9: getSeasons resolves to an empty array for an unknown league', async () => {
    expect(await provider.getSeasons('missing')).toEqual([])
  })

  it('AC6: getStatDefs resolves to StatDef objects, optional fields may be absent', async () => {
    const result = await provider.getStatDefs('league-a', 'players')
    expect(result[0]).toEqual({ key: 'points', label: 'Points', group: 'Scoring' })
    expect(result[0]).not.toHaveProperty('decimals')
    expect(result[1].lowerIsBetter).toBe(true)
    expect(result[1].decimals).toBe(1)
  })

  it('AC9: getStatDefs resolves to an empty array when nothing is defined', async () => {
    expect(await provider.getStatDefs('league-a', 'teams')).toEqual([])
  })

  it('AC7: getEntities resolves to Entity objects with number, null and absent stats', async () => {
    const result = await provider.getEntities('league-a', 'players', '2002')
    expect(result).toHaveLength(2)
    const first = result[0]
    expect(first.stats.points).toBe(12)
    expect(first.stats.errors).toBeNull()
    expect(first.stats.zero).toBe(0)
    expect(first.stats.zero).not.toBeNull()
    expect(first.stats).not.toHaveProperty('missing')
    expect(first.position).toBe('Role X')
    expect(result[1].teamId).toBeUndefined()
    for (const e of result) {
      for (const field of [e.id, e.name, e.shortName, e.meta, e.badge]) {
        expect(typeof field).toBe('string')
      }
    }
  })

  it('AC9: getEntities resolves to an empty array for a season with no data', async () => {
    expect(await provider.getEntities('league-a', 'players', '1900')).toEqual([])
  })

  it('AC8: getRoster resolves to RosterEntry objects with optional number and null stats', async () => {
    const result = await provider.getRoster('league-a', 'team-1', 'unit-1', '2002')
    expect(result).toHaveLength(2)
    expect(result[0].number).toBe(7)
    expect(result[1].number).toBeUndefined()
    expect(result[1].stats.points).toBeNull()
  })

  it('AC9: getRoster resolves to an empty array for an unknown team', async () => {
    expect(await provider.getRoster('league-a', 'nope', 'unit-1', '2002')).toEqual([])
  })

  it('T25: getGameLog resolves one entry per period, with empty stats when not played', async () => {
    const result = await provider.getGameLog('league-a', 'entity-1', '2002')
    expect(result.map((e) => e.period)).toEqual([1, 2])
    expect(result[1]).toMatchObject({ played: false, stats: {} })
    await expect(provider.getGameLog('league-a', 'nope', '2002')).resolves.toEqual([])
  })

  it('AC9: every method returns a Promise', () => {
    expect(provider.getLeagues()).toBeInstanceOf(Promise)
    expect(provider.getSeasons('league-a')).toBeInstanceOf(Promise)
    expect(provider.getStatDefs('league-a', 'teams')).toBeInstanceOf(Promise)
    expect(provider.getEntities('league-a', 'teams', '2002')).toBeInstanceOf(Promise)
    expect(provider.getRoster('league-a', 'team-1', 'unit-1', '2002')).toBeInstanceOf(Promise)
  })

  it('AC5: EntityKind accepts exactly players and teams', () => {
    const kinds: EntityKind[] = ['players', 'teams']
    expect(kinds).toHaveLength(2)

    // @ts-expect-error AC5: other strings is not an EntityKind
    const invalidKind: EntityKind = 'coaches'
    expect(invalidKind).toBe('coaches')

    // @ts-expect-error AC5: kind is case sensitive
    const wrongCase: EntityKind = 'Players'
    expect(wrongCase).toBe('Players')

    // @ts-expect-error AC5: the provider rejects an invalid kind at compile level
    void provider.getStatDefs('league-a', 'coaches')
  })

  it('AC6: omitting a required StatDef field is a type error', () => {
    // @ts-expect-error AC6: group is required
    const noGroup: StatDef = { key: 'points', label: 'Points' }
    // @ts-expect-error AC6: label is required
    const noLabel: StatDef = { key: 'points', group: 'Scoring' }
    // @ts-expect-error AC6: key is required
    const noKey: StatDef = { label: 'Points', group: 'Scoring' }
    expect([noGroup, noLabel, noKey]).toHaveLength(3)
  })

  it('AC7: a string or undefined stat value is a type error', () => {
    const base = { id: 'x', name: 'X', shortName: 'X', meta: '', badge: '' }

    // @ts-expect-error AC7: string stat values are not allowed
    const withString: Entity = { ...base, stats: { points: '12' } }
    // @ts-expect-error AC7: undefined stat values are not allowed
    const withUndefined: Entity = { ...base, stats: { points: undefined } }
    // @ts-expect-error AC7: stats is required
    const noStats: Entity = { ...base }
    // @ts-expect-error AC7: string stat values are not allowed on roster entries either
    const rosterString: RosterEntry = { id: 'x', name: 'X', position: 'P', stats: { a: 'b' } }

    expect([withString, withUndefined, noStats, rosterString]).toHaveLength(4)
  })

  it('AC16: a StatDef may carry a summaryLabel string, and may omit it', () => {
    const withLabel: StatDef = { key: 'k', label: 'K', group: 'G', summaryLabel: 'K / G' }
    const without: StatDef = { key: 'k', label: 'K', group: 'G' }
    expect(withLabel.summaryLabel).toBe('K / G')
    expect(without.summaryLabel).toBeUndefined()
    // @ts-expect-error AC16: summaryLabel must be a string
    const bad: StatDef = { key: 'k', label: 'K', group: 'G', summaryLabel: 3 }
    expect(bad).toBeDefined()
  })

  it('AC9: a synchronous provider is a type error', () => {
    const syncProvider: DataProvider = {
      // @ts-expect-error AC9: getLeagues must return a Promise, not a plain array
      getLeagues: () => leagues,
      getSeasons: async () => [],
      getStatDefs: async () => [],
      getEntities: async () => [],
      getRoster: async () => [],
      getRosterUnits: async () => [],
      getGameLog: async () => [],
    }
    expect(Array.isArray(syncProvider.getLeagues())).toBe(true)
  })

  it('AC6: getRosterUnits resolves to RosterUnitDef objects with ordered stat defs', async () => {
    const result = await provider.getRosterUnits('league-a')
    expect(result.map((u) => u.key)).toEqual(['unit-1', 'unit-2'])
    expect(result[0]).toEqual({
      key: 'unit-1',
      label: 'Unit One',
      stats: [
        { key: 'points', label: 'Points', group: 'Scoring', shareLabel: 'Pts' },
        { key: 'errors', label: 'Errors', group: 'Scoring' },
      ],
    })
    expect(result[0].stats[1]).not.toHaveProperty('shareLabel')
    expect(result[1].stats).toEqual([])
  })

  it('AC8: getRosterUnits resolves to [] for a disabled or unknown league', async () => {
    expect(await provider.getRosterUnits('league-b')).toEqual([])
    expect(await provider.getRosterUnits('missing')).toEqual([])
  })

  it('AC8: getRosterUnits returns a Promise', () => {
    expect(provider.getRosterUnits('league-a')).toBeInstanceOf(Promise)
  })

  it('AC6: RosterUnitDef requires key, label and stats; shareLabel must be a string', () => {
    // @ts-expect-error AC6: stats is required
    const noStats: RosterUnitDef = { key: 'u', label: 'U' }
    // @ts-expect-error AC6: label is required
    const noLabel: RosterUnitDef = { key: 'u', stats: [] }
    // @ts-expect-error AC6: key is required
    const noKey: RosterUnitDef = { label: 'U', stats: [] }
    // @ts-expect-error AC6: shareLabel must be a string
    const bad: StatDef = { key: 'k', label: 'K', group: 'G', shareLabel: 3 }
    const ok: StatDef = { key: 'k', label: 'K', group: 'G', shareLabel: '' }
    const without: StatDef = { key: 'k', label: 'K', group: 'G' }
    expect([noStats, noLabel, noKey, bad]).toHaveLength(4)
    expect(ok.shareLabel).toBe('')
    expect(without.shareLabel).toBeUndefined()
  })

  it('AC6: StatDef.percent is optional and must be a boolean', () => {
    // @ts-expect-error AC6: percent must be a boolean
    const bad: StatDef = { key: 'k', label: 'K', group: 'G', percent: 'yes' }
    const on: StatDef = { key: 'k', label: 'K', group: 'G', percent: true }
    const off: StatDef = { key: 'k', label: 'K', group: 'G', percent: false }
    const without: StatDef = { key: 'k', label: 'K', group: 'G' }
    expect(bad).toBeDefined()
    expect(on.percent).toBe(true)
    expect(off.percent).toBe(false)
    expect(without.percent).toBeUndefined()
  })
})
