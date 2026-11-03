import { describe, expect, it } from 'vitest'
import type { DataProvider } from '../domain/provider'
import { MockProvider } from './mockProvider'

// Reference literals come from the design script
// (design_handoff_statpakd/design/StatPakd App.dc.html, lines 196-326) run in Node.

const provider: DataProvider = new MockProvider()
const SEASONS = ['2024', '2023', '2022']
const TEAM_IDS = ['kc', 'buf', 'bal', 'det', 'phi', 'min', 'gb', 'sf']

describe('every method returns a Promise', () => {
  it('AC9: all five methods return promises', () => {
    const results = [
      provider.getLeagues(),
      provider.getSeasons('nfl'),
      provider.getStatDefs('nfl', 'players'),
      provider.getEntities('nfl', 'players', '2024'),
      provider.getRoster('nfl', 'kc', 'off', '2024'),
    ]
    for (const r of results) expect(r).toBeInstanceOf(Promise)
  })

  it('AC9: bad input rejects rather than throwing synchronously', async () => {
    const promises: Promise<unknown>[] = []
    expect(() => {
      promises.push(provider.getEntities('nfl', 'players', '1999'))
      promises.push(provider.getRoster('nfl', 'zzz', 'off', '2024'))
      promises.push(provider.getSeasons('nope'))
    }).not.toThrow()
    for (const p of promises) await expect(p).rejects.toBeInstanceOf(Error)
  })
})

describe('getLeagues', () => {
  it('AC8: resolves to NFL, NBA, MLB, NHL with only NFL enabled', async () => {
    expect(await provider.getLeagues()).toEqual([
      { id: 'nfl', name: 'NFL', enabled: true },
      { id: 'nba', name: 'NBA', enabled: false },
      { id: 'mlb', name: 'MLB', enabled: false },
      { id: 'nhl', name: 'NHL', enabled: false },
    ])
  })
})

describe('getSeasons', () => {
  it('AC9: NFL seasons are 2024, 2023, 2022 (newest first)', async () => {
    expect(await provider.getSeasons('nfl')).toEqual(['2024', '2023', '2022'])
  })

  it('AC10: mutating the returned seasons does not affect a later call', async () => {
    const seasons = await provider.getSeasons('nfl')
    seasons.push('1999')
    seasons.shift()
    expect(await provider.getSeasons('nfl')).toEqual(['2024', '2023', '2022'])
  })
})

describe('getStatDefs', () => {
  it('AC9: resolves to 22 player defs and 13 team defs in design order', async () => {
    const players = await provider.getStatDefs('nfl', 'players')
    const teams = await provider.getStatDefs('nfl', 'teams')
    expect(players).toHaveLength(22)
    expect(teams).toHaveLength(13)
    expect(players[0]).toEqual({ key: 'passYds', label: 'Pass Yds', group: 'Passing' })
    expect(players[2]).toEqual({
      key: 'int',
      label: 'Interceptions',
      group: 'Passing',
      lowerIsBetter: true,
    })
    expect(players[21]).toEqual({
      key: 'ypt',
      label: 'Yds / Touch',
      group: 'Totals',
      decimals: 1,
      extra: true,
    })
    expect(teams[6]).toEqual({ key: 'to', label: 'Turnover Diff', group: 'Overall', signed: true })
    expect(teams[12]).toEqual({ key: 'wins', label: 'Wins', group: 'Overall', extra: true })
  })

  it('AC10: mutating returned defs does not affect a later call', async () => {
    const first = await provider.getStatDefs('nfl', 'players')
    const def = first[0]
    if (!def) throw new Error('expected a def')
    def.label = 'changed'
    first.length = 0
    const second = await provider.getStatDefs('nfl', 'players')
    expect(second).toHaveLength(22)
    expect(second[0]?.label).toBe('Pass Yds')
  })
})

describe('getEntities', () => {
  it('AC9: resolves to 17 players for each season', async () => {
    for (const season of SEASONS) {
      const players = await provider.getEntities('nfl', 'players', season)
      expect(players).toHaveLength(17)
      expect(players[0]?.id).toBe('allen')
    }
  })

  it('AC9: resolves to 8 teams for each season', async () => {
    for (const season of SEASONS) {
      const teams = await provider.getEntities('nfl', 'teams', season)
      expect(teams.map((t) => t.id)).toEqual(TEAM_IDS)
    }
  })

  it('AC1: 2024 provider values match the design', async () => {
    const players = await provider.getEntities('nfl', 'players', '2024')
    const barkley = players.find((p) => p.id === 'barkley')
    expect(barkley?.stats).toMatchObject({
      rushYds: 2005,
      rushTd: 13,
      ypc: 5.8,
      rec: 33,
      recYds: 278,
      recTd: 2,
      ypr: 8.4,
      scrim: 2283,
      totTd: 15,
      passYds: null,
    })
    const teams = await provider.getEntities('nfl', 'teams', '2024')
    const kc = teams.find((t) => t.id === 'kc')
    expect(kc?.stats).toMatchObject({ ppg: 22.6, to: -1, win: 88.2, wins: 15 })
    expect(kc?.meta).toBe('AFC West · 15–2')
  })

  it('AC6: 2023 provider values match the design', async () => {
    const teams = await provider.getEntities('nfl', 'teams', '2023')
    expect(teams.find((t) => t.id === 'kc')?.stats).toMatchObject({
      ppg: 18.6,
      to: -1,
      win: 82.4,
      wins: 14,
    })
    const players = await provider.getEntities('nfl', 'players', '2023')
    expect(players.find((p) => p.id === 'allen')?.stats.passYds).toBe(3474)
  })

  it('AC2: repeated calls resolve to deeply equal results', async () => {
    for (const season of SEASONS) {
      for (const kind of ['players', 'teams'] as const) {
        expect(await provider.getEntities('nfl', kind, season)).toEqual(
          await provider.getEntities('nfl', kind, season),
        )
      }
    }
  })

  it('AC10: mutating returned entities does not affect a later call', async () => {
    const first = await provider.getEntities('nfl', 'players', '2024')
    const p = first[0]
    if (!p) throw new Error('expected a player')
    p.stats.passYds = -1
    p.name = 'Changed'
    first.length = 0
    const second = await provider.getEntities('nfl', 'players', '2024')
    expect(second).toHaveLength(17)
    expect(second[0]?.name).toBe('Josh Allen')
    expect(second[0]?.stats.passYds).toBe(3731)
  })
})

describe('getRoster', () => {
  it('AC9: resolves to 7 offense and 5 defense rows for every team and season', async () => {
    for (const season of SEASONS) {
      for (const teamId of TEAM_IDS) {
        expect(await provider.getRoster('nfl', teamId, 'off', season)).toHaveLength(7)
        expect(await provider.getRoster('nfl', teamId, 'def', season)).toHaveLength(5)
      }
    }
  })

  it('AC13: 2024 offense row values match the design', async () => {
    const rows = await provider.getRoster('nfl', 'phi', 'off', '2024')
    const barkley = rows.find((r) => r.name === 'Saquon Barkley')
    expect(barkley?.position).toBe('RB')
    expect(barkley?.number).toBe(26)
    expect(barkley?.stats).toEqual({
      snap: 56,
      touch: 378,
      tgt: 47,
      scrim: 2283,
      td: 15,
      ypt: 6,
    })
  })

  it('AC6: 2023 defense row values match the design', async () => {
    const rows = await provider.getRoster('nfl', 'kc', 'def', '2023')
    expect(rows.find((r) => r.name === 'Nick Bolton')?.stats).toEqual({
      snap: 90,
      tkl: 104,
      sk: 3,
      int: 1,
      pd: 6,
      ff: 1,
      take: 2,
    })
  })

  it('AC2: repeated calls resolve to deeply equal results', async () => {
    for (const season of SEASONS) {
      for (const teamId of TEAM_IDS) {
        for (const unit of ['off', 'def']) {
          expect(await provider.getRoster('nfl', teamId, unit, season)).toEqual(
            await provider.getRoster('nfl', teamId, unit, season),
          )
        }
      }
    }
  })

  it('AC10: mutating returned rows does not affect a later call', async () => {
    const first = await provider.getRoster('nfl', 'kc', 'def', '2024')
    const row = first[0]
    if (!row) throw new Error('expected a row')
    row.stats.tkl = -1
    first.length = 0
    const second = await provider.getRoster('nfl', 'kc', 'def', '2024')
    expect(second).toHaveLength(5)
    expect(second[0]?.stats.tkl).not.toBe(-1)
  })

  it('roster row ids are unique across all teams and units for a season', async () => {
    const ids: string[] = []
    for (const teamId of TEAM_IDS) {
      for (const unit of ['off', 'def']) {
        ids.push(...(await provider.getRoster('nfl', teamId, unit, '2024')).map((r) => r.id))
      }
    }
    expect(new Set(ids).size).toBe(ids.length)
    expect(ids).toHaveLength(8 * 12)
  })
})

describe('disabled leagues resolve to empty arrays (A6)', () => {
  for (const id of ['nba', 'mlb', 'nhl']) {
    it(`AC9: ${id} gives [] from every method`, async () => {
      expect(await provider.getSeasons(id)).toEqual([])
      expect(await provider.getStatDefs(id, 'players')).toEqual([])
      expect(await provider.getStatDefs(id, 'teams')).toEqual([])
      expect(await provider.getEntities(id, 'players', '2024')).toEqual([])
      expect(await provider.getEntities(id, 'teams', '2024')).toEqual([])
      expect(await provider.getRoster(id, 'kc', 'off', '2024')).toEqual([])
    })
  }
})

describe('unknown inputs reject with an Error (A6)', () => {
  const badLeagues = ['', 'NFL', 'xfl', '__proto__', 'toString', 'constructor']

  it('unknown league id rejects on every method', async () => {
    for (const id of badLeagues) {
      await expect(provider.getSeasons(id)).rejects.toBeInstanceOf(Error)
      await expect(provider.getStatDefs(id, 'players')).rejects.toBeInstanceOf(Error)
      await expect(provider.getEntities(id, 'teams', '2024')).rejects.toBeInstanceOf(Error)
      await expect(provider.getRoster(id, 'kc', 'off', '2024')).rejects.toBeInstanceOf(Error)
    }
  })

  it('unknown season rejects with a message naming the season', async () => {
    await expect(provider.getEntities('nfl', 'players', '2019')).rejects.toThrow(/2019/)
    await expect(provider.getEntities('nfl', 'teams', '')).rejects.toBeInstanceOf(Error)
    await expect(provider.getEntities('nfl', 'teams', '2025')).rejects.toBeInstanceOf(Error)
    await expect(provider.getRoster('nfl', 'kc', 'off', '2019')).rejects.toBeInstanceOf(Error)
  })

  it('unknown team id rejects, including prototype property names', async () => {
    for (const id of ['zzz', '', 'KC', 'cin', 'was', 'atl', 'dal', 'lv']) {
      await expect(provider.getRoster('nfl', id, 'off', '2024')).rejects.toBeInstanceOf(Error)
    }
    for (const id of ['__proto__', 'toString', 'constructor', 'hasOwnProperty']) {
      await expect(provider.getRoster('nfl', id, 'off', '2024')).rejects.toBeInstanceOf(Error)
      await expect(provider.getRoster('nfl', id, 'def', '2024')).rejects.toBeInstanceOf(Error)
    }
  })

  it('unknown unit rejects, including prototype property names', async () => {
    for (const unit of ['', 'special', 'OFF', '__proto__', 'toString', 'constructor']) {
      await expect(provider.getRoster('nfl', 'kc', unit, '2024')).rejects.toBeInstanceOf(Error)
    }
  })
})
