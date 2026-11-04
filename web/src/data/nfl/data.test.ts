import { describe, expect, it } from 'vitest'
import type { StatDef } from '../../domain/types'
import { getLeagueRegistry } from '../leagues'
import { SAMPLE_DATA_LABEL } from '../sampleData'
import { DEF_T, OFF_T, RAW_P, RAW_T, ROSTERS } from './raw'
import { playerStatDefs, teamStatDefs } from './statDefs'

// Expected values below are written out from the design script
// (design_handoff_statpakd/design/StatPakd App.dc.html, lines 198-270).

const EXPECTED_PLAYER_DEFS: StatDef[] = [
  { key: 'passYds', label: 'Pass Yds', group: 'Passing' },
  { key: 'passTd', label: 'Pass TD', group: 'Passing' },
  { key: 'int', label: 'Interceptions', group: 'Passing', lowerIsBetter: true },
  { key: 'cmp', label: 'Comp %', group: 'Passing', decimals: 1 },
  { key: 'rate', label: 'Passer Rating', group: 'Passing', decimals: 1 },
  { key: 'rushYds', label: 'Rush Yds', group: 'Rushing' },
  { key: 'rushTd', label: 'Rush TD', group: 'Rushing' },
  { key: 'ypc', label: 'Yds / Carry', group: 'Rushing', decimals: 1 },
  { key: 'rec', label: 'Receptions', group: 'Receiving' },
  { key: 'recYds', label: 'Rec Yds', group: 'Receiving' },
  { key: 'recTd', label: 'Rec TD', group: 'Receiving' },
  { key: 'ypr', label: 'Yds / Catch', group: 'Receiving', decimals: 1 },
  { key: 'scrim', label: 'Scrimmage Yds', group: 'Totals' },
  { key: 'totTd', label: 'Scrimmage TD', group: 'Totals' },
  { key: 'passYpg', label: 'Pass Yds / G', group: 'Passing', decimals: 1, extra: true },
  { key: 'tdInt', label: 'TD : INT', group: 'Passing', decimals: 1, extra: true },
  { key: 'carries', label: 'Carries', group: 'Rushing', extra: true },
  { key: 'rushYpg', label: 'Rush Yds / G', group: 'Rushing', decimals: 1, extra: true },
  { key: 'tgt', label: 'Targets', group: 'Receiving', extra: true },
  { key: 'recYpg', label: 'Rec Yds / G', group: 'Receiving', decimals: 1, extra: true },
  { key: 'touches', label: 'Touches', group: 'Totals', extra: true },
  { key: 'ypt', label: 'Yds / Touch', group: 'Totals', decimals: 1, extra: true },
]

const EXPECTED_TEAM_DEFS: StatDef[] = [
  { key: 'ppg', label: 'Points / G', group: 'Offense', decimals: 1, summaryLabel: 'Pts / G' },
  { key: 'ypg', label: 'Yards / G', group: 'Offense', decimals: 1, summaryLabel: 'Yds / G' },
  { key: 'pass', label: 'Pass Yds / G', group: 'Offense', decimals: 1 },
  { key: 'rush', label: 'Rush Yds / G', group: 'Offense', decimals: 1 },
  { key: 'third', label: '3rd Down %', group: 'Offense', decimals: 1 },
  {
    key: 'papg',
    label: 'Pts Allowed / G',
    group: 'Defense',
    decimals: 1,
    lowerIsBetter: true,
    summaryLabel: 'Allowed / G',
  },
  { key: 'to', label: 'Turnover Diff', group: 'Overall', signed: true, summaryLabel: 'TO Diff' },
  { key: 'win', label: 'Win %', group: 'Overall', decimals: 1 },
  { key: 'totPts', label: 'Total Points', group: 'Offense', extra: true },
  { key: 'passPct', label: 'Pass Yds Share %', group: 'Offense', decimals: 1, extra: true },
  {
    key: 'yapg',
    label: 'Yds Allowed / G',
    group: 'Defense',
    decimals: 1,
    lowerIsBetter: true,
    extra: true,
  },
  {
    key: 'pdiff',
    label: 'Point Diff / G',
    group: 'Overall',
    decimals: 1,
    signed: true,
    extra: true,
  },
  { key: 'wins', label: 'Wins', group: 'Overall', extra: true },
]

describe('sample-data label', () => {
  it('AC4: is a non-empty string saying the data is sample data', () => {
    expect(typeof SAMPLE_DATA_LABEL).toBe('string')
    expect(SAMPLE_DATA_LABEL.length).toBeGreaterThan(0)
    expect(SAMPLE_DATA_LABEL).toBe('Sample data for design purposes.')
  })
})

describe('raw data', () => {
  it('AC5: RAW_P has 17 players with design ids in design order', () => {
    expect(RAW_P).toHaveLength(17)
    expect(RAW_P.map((p) => p[0])).toEqual([
      'allen',
      'jackson',
      'mahomes',
      'burrow',
      'goff',
      'hurts',
      'daniels',
      'barkley',
      'henry',
      'robinson',
      'gibbs',
      'chase',
      'jefferson',
      'lamb',
      'stbrown',
      'bowers',
      'kittle',
    ])
  })

  it('AC5: RAW_P covers every position QB, RB, WR and TE', () => {
    const positions = new Set(RAW_P.map((p) => p[4]))
    expect([...positions].sort()).toEqual(['QB', 'RB', 'TE', 'WR'])
  })

  it('AC5: RAW_P spot values match the design', () => {
    const byId = new Map(RAW_P.map((p) => [p[0], p]))
    const allen = byId.get('allen')
    expect(allen?.slice(0, 6)).toEqual(['allen', 'Josh Allen', 'J. Allen', 'BUF', 'QB', 17])
    expect(allen?.[6]).toEqual({
      pa: 3731,
      ptd: 28,
      int: 6,
      cmp: 63.6,
      rate: 101.4,
      ra: 102,
      ry: 531,
      rtd: 12,
    })
    expect(byId.get('barkley')?.[6]).toEqual({
      ra: 345,
      ry: 2005,
      rtd: 13,
      rec: 33,
      rcy: 278,
      rctd: 2,
    })
    expect(byId.get('chase')?.[1]).toBe("Ja'Marr Chase")
    expect(byId.get('kittle')?.[6]).toEqual({
      ra: 0,
      ry: 0,
      rtd: 0,
      rec: 78,
      rcy: 1106,
      rctd: 8,
    })
  })

  it('AC5: non-QB base stats have no passing fields (absent, not zero)', () => {
    for (const p of RAW_P.filter((row) => row[4] !== 'QB')) {
      expect(p[6]).not.toHaveProperty('pa')
      expect(p[6]).not.toHaveProperty('cmp')
    }
    for (const p of RAW_P.filter((row) => row[4] === 'QB')) {
      expect(p[6]).not.toHaveProperty('rcy')
    }
  })

  it('AC5: RAW_T has 8 teams with design ids, divisions and stats', () => {
    expect(RAW_T).toHaveLength(8)
    expect(RAW_T.map((t) => t[0])).toEqual(['kc', 'buf', 'bal', 'det', 'phi', 'min', 'gb', 'sf'])
    expect(RAW_T[0]).toEqual([
      'kc',
      'Kansas City Chiefs',
      'KC',
      'AFC West',
      [22.6, 335.6, 225.0, 110.6, 19.2, -1, 47.4, 88.2],
    ])
    expect(RAW_T[7]).toEqual([
      'sf',
      'San Francisco 49ers',
      'SF',
      'NFC West',
      [23.6, 365.6, 241.3, 124.3, 25.6, -11, 42.2, 35.3],
    ])
    for (const t of RAW_T) expect(t[4]).toHaveLength(8)
  })

  it('AC5: ROSTERS has 8 teams, 7 offense and 5 defense rows each', () => {
    expect(Object.keys(ROSTERS).sort()).toEqual(
      ['bal', 'buf', 'det', 'gb', 'kc', 'min', 'phi', 'sf'].sort(),
    )
    for (const team of Object.values(ROSTERS)) {
      expect(team.off).toHaveLength(7)
      expect(team.def).toHaveLength(5)
    }
  })

  it('AC5: ROSTERS spot values match the design', () => {
    expect(ROSTERS.kc?.off[0]).toEqual(['Patrick Mahomes', 'QB', 15])
    expect(ROSTERS.buf?.off[4]).toEqual(['Keon Coleman', 'WR2', 0])
    expect(ROSTERS.det?.def[0]).toEqual(["Za'Darius Smith", 'EDGE', 99])
    expect(ROSTERS.phi?.off[1]).toEqual(['Saquon Barkley', 'RB1', 26])
    expect(ROSTERS.sf?.def[4]).toEqual(['Talanoa Hufanga', 'S', 29])
  })

  it('AC5: OFF_T and DEF_T match the design templates', () => {
    expect(Object.keys(OFF_T)).toEqual(['QB', 'RB1', 'RB2', 'WR1', 'WR2', 'WR3', 'TE'])
    expect(OFF_T.QB).toEqual({ snap: 99, ca: 80, ry: 350, rtd: 3, rec: 0, rcy: 0, rctd: 0 })
    expect(OFF_T.WR1).toEqual({ snap: 90, ca: 4, ry: 20, rtd: 0, rec: 92, rcy: 1200, rctd: 8 })
    expect(OFF_T.TE).toEqual({ snap: 80, ca: 0, ry: 0, rtd: 0, rec: 62, rcy: 650, rctd: 5 })
    expect(Object.keys(DEF_T)).toEqual(['EDGE', 'DT', 'LB', 'CB', 'S'])
    expect(DEF_T.EDGE).toEqual({ snap: 76, tkl: 42, sk: 9, int: 0, pd: 2, ff: 2 })
    expect(DEF_T.LB).toEqual({ snap: 97, tkl: 118, sk: 2, int: 1, pd: 5, ff: 1 })
    expect(DEF_T.S).toEqual({ snap: 98, tkl: 84, sk: 1, int: 3, pd: 8, ff: 1 })
  })

  it('AC5: every roster role has a template', () => {
    for (const team of Object.values(ROSTERS)) {
      for (const [, role] of team.off) expect(OFF_T).toHaveProperty(role)
      for (const [, role] of team.def) expect(DEF_T).toHaveProperty(role)
    }
  })
})

describe('stat definitions', () => {
  it('AC5/AC7: there are 22 player defs in design order with mapped fields', () => {
    expect(playerStatDefs()).toHaveLength(22)
    expect(playerStatDefs()).toEqual(EXPECTED_PLAYER_DEFS)
    expect(playerStatDefs().map((d) => d.key)).toEqual(EXPECTED_PLAYER_DEFS.map((d) => d.key))
  })

  it('AC5/AC7: there are 13 team defs in design order with mapped fields', () => {
    expect(teamStatDefs()).toHaveLength(13)
    expect(teamStatDefs()).toEqual(EXPECTED_TEAM_DEFS)
    expect(teamStatDefs().map((d) => d.key)).toEqual(EXPECTED_TEAM_DEFS.map((d) => d.key))
  })

  it('AC7: optional fields are omitted (not undefined or false) when the design sets none', () => {
    const passYds = playerStatDefs().find((d) => d.key === 'passYds')
    expect(passYds).toStrictEqual({ key: 'passYds', label: 'Pass Yds', group: 'Passing' })
    const wins = teamStatDefs().find((d) => d.key === 'wins')
    expect(wins).toStrictEqual({ key: 'wins', label: 'Wins', group: 'Overall', extra: true })
    const flagValues = [...playerStatDefs(), ...teamStatDefs()].flatMap((d) =>
      [d.lowerIsBetter, d.signed, d.extra].filter((v) => v !== undefined),
    )
    expect(flagValues.every((v) => v === true)).toBe(true)
  })

  it('AC7: lowerIsBetter and signed flags are on the design stats only', () => {
    expect(
      [...playerStatDefs(), ...teamStatDefs()].filter((d) => d.lowerIsBetter).map((d) => d.key),
    ).toEqual(['int', 'papg', 'yapg'])
    expect(
      [...playerStatDefs(), ...teamStatDefs()].filter((d) => d.signed).map((d) => d.key),
    ).toEqual(['to', 'pdiff'])
  })

  it('AC10: mutating a returned def list does not affect the next call', () => {
    const first = playerStatDefs()
    const firstDef = first[0]
    if (!firstDef) throw new Error('expected a player stat def')
    firstDef.label = 'changed'
    first.pop()
    expect(playerStatDefs()).toEqual(EXPECTED_PLAYER_DEFS)
    const teams = teamStatDefs()
    teams.length = 0
    expect(teamStatDefs()).toEqual(EXPECTED_TEAM_DEFS)
  })
})

describe('league registry', () => {
  it('AC8: lists NFL, NBA, MLB, NHL in order with only NFL enabled', () => {
    expect(getLeagueRegistry()).toEqual([
      { id: 'nfl', name: 'NFL', enabled: true },
      { id: 'nba', name: 'NBA', enabled: false },
      { id: 'mlb', name: 'MLB', enabled: false },
      { id: 'nhl', name: 'NHL', enabled: false },
    ])
  })

  it('AC10: returns a fresh array on each call', () => {
    const first = getLeagueRegistry()
    const nfl = first[0]
    if (!nfl) throw new Error('expected a league')
    nfl.enabled = false
    first.pop()
    expect(getLeagueRegistry()).toHaveLength(4)
    expect(getLeagueRegistry()[0]?.enabled).toBe(true)
  })
})
