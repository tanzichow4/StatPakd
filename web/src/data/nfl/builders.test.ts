import { describe, expect, it } from 'vitest'
import type { Entity, RosterEntry } from '../../domain/types'
import { NFL_SEASONS, ROSTER_UNITS, buildPlayers, buildRoster, buildTeams } from './builders'
import { ROSTERS, RAW_P } from './raw'

// Reference literals in this file were produced by running the design script
// (design_handoff_statpakd/design/StatPakd App.dc.html, lines 196-326) in Node, outside the repo.
// They were not computed by the code under test.

const SEASONS = ['2024', '2023', '2022'] as const
const TEAM_IDS = ['kc', 'buf', 'bal', 'det', 'phi', 'min', 'gb', 'sf'] as const
const UNITS = ['off', 'def'] as const
const MIDDLE_DOT = '·'
const EN_DASH = '–'

const PLAYER_KEYS = [
  'passYds',
  'passTd',
  'int',
  'cmp',
  'rate',
  'rushYds',
  'rushTd',
  'ypc',
  'rec',
  'recYds',
  'recTd',
  'ypr',
  'scrim',
  'totTd',
  'passYpg',
  'tdInt',
  'carries',
  'rushYpg',
  'tgt',
  'recYpg',
  'touches',
  'ypt',
]
const TEAM_KEYS = [
  'ppg',
  'ypg',
  'pass',
  'rush',
  'third',
  'papg',
  'to',
  'win',
  'totPts',
  'passPct',
  'yapg',
  'pdiff',
  'wins',
]

function player(season: string, id: string): Entity {
  const found = buildPlayers(season).find((p) => p.id === id)
  if (!found) throw new Error(`missing player ${id}`)
  return found
}

function team(season: string, id: string): Entity {
  const found = buildTeams(season).find((t) => t.id === id)
  if (!found) throw new Error(`missing team ${id}`)
  return found
}

function rosterRow(teamId: string, unit: string, season: string, name: string): RosterEntry {
  const found = buildRoster(teamId, unit, season).find((r) => r.name === name)
  if (!found) throw new Error(`missing roster row ${name}`)
  return found
}

describe('constants', () => {
  it('AC9: seasons are 2024, 2023, 2022 and units are off, def', () => {
    expect([...NFL_SEASONS]).toEqual(['2024', '2023', '2022'])
    expect([...ROSTER_UNITS]).toEqual(['off', 'def'])
  })
})

describe('AC1: 2024 players match the design', () => {
  it('Saquon Barkley (RB)', () => {
    expect(player('2024', 'barkley').stats).toEqual({
      passYds: null,
      passTd: null,
      int: null,
      cmp: null,
      rate: null,
      rushYds: 2005,
      rushTd: 13,
      ypc: 5.8,
      rec: 33,
      recYds: 278,
      recTd: 2,
      ypr: 8.4,
      scrim: 2283,
      totTd: 15,
      passYpg: null,
      tdInt: null,
      carries: 345,
      rushYpg: 117.9,
      tgt: 47,
      recYpg: 16.4,
      touches: 378,
      ypt: 6,
    })
  })

  it('Josh Allen (QB)', () => {
    expect(player('2024', 'allen').stats).toEqual({
      passYds: 3731,
      passTd: 28,
      int: 6,
      cmp: 63.6,
      rate: 101.4,
      rushYds: 531,
      rushTd: 12,
      ypc: 5.2,
      rec: null,
      recYds: null,
      recTd: null,
      ypr: null,
      scrim: 531,
      totTd: 12,
      passYpg: 219.5,
      tdInt: 4.7,
      carries: 102,
      rushYpg: 31.2,
      tgt: null,
      recYpg: null,
      touches: 102,
      ypt: 5.2,
    })
  })

  it("Ja'Marr Chase (WR)", () => {
    expect(player('2024', 'chase').stats).toMatchObject({
      passYds: null,
      rushYds: 32,
      ypc: null,
      rec: 127,
      recYds: 1708,
      recTd: 17,
      ypr: 13.4,
      scrim: 1740,
      totTd: 17,
      carries: 3,
      rushYpg: 1.9,
      tgt: 181,
      recYpg: 100.5,
      touches: 130,
      ypt: 13.4,
    })
  })

  it('George Kittle (TE) with zero carries', () => {
    expect(player('2024', 'kittle').stats).toMatchObject({
      rushYds: 0,
      rushTd: 0,
      ypc: null,
      rec: 78,
      recYds: 1106,
      ypr: 14.2,
      scrim: 1106,
      totTd: 8,
      carries: 0,
      rushYpg: 0,
      tgt: 111,
      recYpg: 65.1,
      touches: 78,
      ypt: 14.2,
    })
  })

  it('Patrick Mahomes and Jared Goff (QB, goff below the 30 carry threshold)', () => {
    expect(player('2024', 'mahomes').stats).toMatchObject({
      passYpg: 231.1,
      tdInt: 2.4,
      ypc: 5.3,
      ypt: 5.3,
    })
    expect(player('2024', 'goff').stats).toMatchObject({
      carries: 29,
      ypc: null,
      ypt: 1.9,
      passYpg: 272.3,
      tdInt: 3.1,
    })
  })

  it('has 17 players in design order', () => {
    expect(buildPlayers('2024').map((p) => p.id)).toEqual(RAW_P.map((p) => p[0]))
  })

  it('Kansas City Chiefs', () => {
    expect(team('2024', 'kc').stats).toEqual({
      ppg: 22.6,
      ypg: 335.6,
      pass: 225.0,
      rush: 110.6,
      papg: 19.2,
      to: -1,
      third: 47.4,
      win: 88.2,
      totPts: 384,
      passPct: 67,
      yapg: 288.2,
      pdiff: 3.4,
      wins: 15,
    })
    expect(team('2024', 'kc').meta).toBe(`AFC West ${MIDDLE_DOT} 15${EN_DASH}2`)
  })

  it('Buffalo Bills, Detroit Lions and San Francisco 49ers', () => {
    expect(team('2024', 'buf').stats).toMatchObject({
      to: 24,
      win: 76.5,
      totPts: 525,
      passPct: 61,
      yapg: 344.2,
      pdiff: 9.3,
      wins: 13,
    })
    expect(team('2024', 'det').stats).toMatchObject({
      totPts: 564,
      passPct: 61.5,
      yapg: 314.1,
      pdiff: 13.1,
      wins: 15,
    })
    expect(team('2024', 'sf').stats).toMatchObject({
      to: -11,
      win: 35.3,
      totPts: 401,
      passPct: 66,
      yapg: 375.3,
      pdiff: -2,
      wins: 6,
    })
    expect(team('2024', 'sf').meta).toBe(`NFC West ${MIDDLE_DOT} 6${EN_DASH}11`)
  })
})

describe('AC2: deterministic', () => {
  for (const season of SEASONS) {
    it(`players and teams are deeply equal on repeated calls (${season})`, () => {
      expect(buildPlayers(season)).toEqual(buildPlayers(season))
      expect(buildTeams(season)).toEqual(buildTeams(season))
    })

    for (const teamId of TEAM_IDS) {
      for (const unit of UNITS) {
        it(`roster is deeply equal on repeated calls (${season}, ${teamId}, ${unit})`, () => {
          expect(buildRoster(teamId, unit, season)).toEqual(buildRoster(teamId, unit, season))
        })
      }
    }
  }
})

describe('AC3: nulls follow the rules in every season', () => {
  for (const season of SEASONS) {
    describe(`season ${season}`, () => {
      const players = buildPlayers(season)

      it('QBs have no receiving stats', () => {
        const qbs = players.filter((p) => p.position === 'QB')
        expect(qbs).toHaveLength(7)
        for (const qb of qbs) {
          const got = ['rec', 'recYds', 'recTd', 'ypr', 'tgt', 'recYpg'].map((k) => [
            qb.id,
            k,
            qb.stats[k],
          ])
          expect(got.filter((g) => g[2] !== null)).toEqual([])
        }
      })

      it('non-QBs have no passing stats', () => {
        const others = players.filter((p) => p.position !== 'QB')
        expect(others).toHaveLength(10)
        for (const p of others) {
          const got = ['passYds', 'passTd', 'int', 'cmp', 'rate', 'passYpg', 'tdInt'].map((k) => [
            p.id,
            k,
            p.stats[k],
          ])
          expect(got.filter((g) => g[2] !== null)).toEqual([])
        }
      })

      it('ypc is null exactly when carries are below 30', () => {
        const actual = players.map((p) => [p.id, p.stats.ypc === null])
        const expected = players.map((p) => [p.id, (p.stats.carries ?? 0) < 30])
        expect(actual).toEqual(expected)
        expect(players.some((p) => p.stats.ypc !== null)).toBe(true)
        expect(players.some((p) => p.stats.ypc === null)).toBe(true)
      })

      it('ypr is null exactly when receptions are below 10 or null', () => {
        const actual = players.map((p) => [p.id, p.stats.ypr === null])
        const expected = players.map((p) => [p.id, p.stats.rec === null || (p.stats.rec ?? 0) < 10])
        expect(actual).toEqual(expected)
        expect(players.some((p) => p.stats.ypr !== null)).toBe(true)
        expect(players.some((p) => p.stats.ypr === null)).toBe(true)
      })

      it('non-null stats are numbers, null is never turned into 0', () => {
        for (const p of players) {
          for (const v of Object.values(p.stats)) {
            expect(v === null || (typeof v === 'number' && Number.isFinite(v))).toBe(true)
          }
        }
      })
    })
  }

  it('boundary: 29 carries gives null ypc and 30 would give a number (2024 data)', () => {
    // Goff has 29 carries in 2024; Burrow (42) and Hurts (150) are above the threshold.
    expect(player('2024', 'goff').stats.ypc).toBeNull()
    expect(player('2024', 'burrow').stats.ypc).toBe(4.8)
  })
})

describe('AC6: 2023 and 2022 match the design variation', () => {
  it('2023 player stats', () => {
    expect(player('2023', 'allen').stats).toMatchObject({
      passYds: 3474,
      cmp: 64,
      rate: 99.5,
      rushYds: 463,
      ypc: 4.7,
      scrim: 463,
    })
    expect(player('2023', 'barkley').stats).toMatchObject({
      rushYds: 2150,
      rec: 36,
      recYds: 228,
      ypr: 6.3,
      scrim: 2378,
      totTd: 12,
      tgt: 51,
      ypt: 6,
    })
    expect(player('2023', 'kittle').stats).toMatchObject({
      rec: 70,
      recYds: 985,
      ypr: 14.1,
      ypc: null,
      totTd: 6,
    })
    expect(player('2023', 'goff').stats).toMatchObject({ ypc: null, carries: 22, ypt: 2.3 })
  })

  it('2022 player stats', () => {
    expect(player('2022', 'allen').stats).toMatchObject({
      passYds: 3266,
      cmp: 62.7,
      rate: 96.2,
      rushYds: 399,
      ypc: 3.6,
    })
    expect(player('2022', 'barkley').stats).toMatchObject({
      rushYds: 1543,
      rec: 28,
      recYds: 257,
      ypr: 9.2,
      scrim: 1800,
      totTd: 14,
      tgt: 40,
      ypt: 4.7,
    })
    expect(player('2022', 'jefferson').stats).toMatchObject({
      rec: 81,
      recYds: 1645,
      ypr: 20.3,
      tgt: 116,
      recYpg: 96.8,
    })
  })

  it('2023 team stats (including to and win)', () => {
    expect(team('2023', 'kc').stats).toEqual({
      ppg: 18.6,
      ypg: 345.5,
      pass: 231.3,
      rush: 83.5,
      papg: 15.8,
      to: -1,
      third: 46.2,
      win: 82.4,
      totPts: 316,
      passPct: 66.9,
      yapg: 241.2,
      pdiff: 2.8,
      wins: 14,
    })
    expect(team('2023', 'kc').meta).toBe(`AFC West ${MIDDLE_DOT} 14${EN_DASH}3`)
    expect(team('2023', 'buf').stats).toMatchObject({ to: 1, win: 73.2, wins: 12, yapg: 301.6 })
    expect(team('2023', 'sf').stats).toMatchObject({ to: -5, win: 34.7, wins: 6, pdiff: -3.7 })
  })

  it('2022 team stats (including to and win)', () => {
    expect(team('2022', 'kc').stats).toEqual({
      ppg: 23.5,
      ypg: 279,
      pass: 212.5,
      rush: 106.8,
      papg: 18,
      to: -1,
      third: 44.2,
      win: 85.9,
      totPts: 400,
      passPct: 76.2,
      yapg: 279.1,
      pdiff: 5.5,
      wins: 15,
    })
    expect(team('2022', 'buf').stats).toMatchObject({ to: -2, win: 77.6, wins: 13 })
    expect(team('2022', 'sf').stats).toMatchObject({ to: -8, win: 32.9, wins: 6, yapg: 433.5 })
  })

  it('2023 roster rows', () => {
    expect(rosterRow('buf', 'off', '2023', 'Josh Allen')).toMatchObject({
      stats: { snap: 94, touch: 99, tgt: 0, scrim: 546, td: 13, ypt: 5.5 },
    })
    expect(rosterRow('phi', 'off', '2023', 'Saquon Barkley').stats).toEqual({
      snap: 58,
      touch: 389,
      tgt: 50,
      scrim: 2393,
      td: 16,
      ypt: 6.2,
    })
    expect(rosterRow('kc', 'off', '2023', 'DeAndre Hopkins').stats).toEqual({
      snap: 78,
      touch: 66,
      tgt: 91,
      scrim: 795,
      td: 4,
      ypt: 12,
    })
    expect(rosterRow('kc', 'def', '2023', 'Nick Bolton').stats).toEqual({
      snap: 90,
      tkl: 104,
      sk: 3,
      int: 1,
      pd: 6,
      ff: 1,
      take: 2,
    })
    expect(rosterRow('det', 'def', '2023', "Za'Darius Smith").stats).toEqual({
      snap: 73,
      tkl: 54,
      sk: 10,
      int: 0,
      pd: 2,
      ff: 2,
      take: 2,
    })
  })

  it('2022 roster rows', () => {
    expect(rosterRow('phi', 'off', '2022', 'Saquon Barkley').stats).toEqual({
      snap: 59,
      touch: 394,
      tgt: 47,
      scrim: 1889,
      td: 15,
      ypt: 4.8,
    })
    expect(rosterRow('kc', 'off', '2022', 'DeAndre Hopkins').stats).toEqual({
      snap: 78,
      touch: 52,
      tgt: 71,
      scrim: 543,
      td: 4,
      ypt: 10.4,
    })
    expect(rosterRow('kc', 'def', '2022', 'Nick Bolton').stats).toEqual({
      snap: 92,
      tkl: 87,
      sk: 2,
      int: 1,
      pd: 6,
      ff: 1,
      take: 2,
    })
  })

  it('at least some 2023 and 2022 values differ from 2024', () => {
    expect(player('2024', 'allen').stats.passYds).not.toBe(player('2023', 'allen').stats.passYds)
    expect(team('2024', 'kc').stats.ppg).not.toBe(team('2023', 'kc').stats.ppg)
    expect(team('2024', 'buf').stats.to).not.toBe(team('2022', 'buf').stats.to)
  })

  it('team win never exceeds 100 and roster snap never exceeds 100', () => {
    for (const season of SEASONS) {
      for (const t of buildTeams(season)) expect(t.stats.win as number).toBeLessThanOrEqual(100)
      for (const teamId of TEAM_IDS) {
        for (const unit of UNITS) {
          for (const row of buildRoster(teamId, unit, season)) {
            expect(row.stats.snap as number, `${teamId} ${unit} ${row.name}`).toBeLessThanOrEqual(
              100,
            )
          }
        }
      }
    }
  })

  it('boundary: a snap that rounds to 101 before the cap is capped at exactly 100', () => {
    // Brock Purdy 2022: the design's uncapped value is 100.92, which rounds to 101.
    expect(rosterRow('sf', 'off', '2022', 'Brock Purdy').stats.snap).toBe(100)
  })
})

describe('AC13: 2024 roster values match the design', () => {
  it('Josh Allen (buf, off)', () => {
    expect(rosterRow('buf', 'off', '2024', 'Josh Allen').stats).toEqual({
      snap: 95,
      touch: 102,
      tgt: 0,
      scrim: 531,
      td: 12,
      ypt: 5.2,
    })
  })

  it('Saquon Barkley (phi, off)', () => {
    expect(rosterRow('phi', 'off', '2024', 'Saquon Barkley').stats).toEqual({
      snap: 56,
      touch: 378,
      tgt: 47,
      scrim: 2283,
      td: 15,
      ypt: 6,
    })
  })

  it('template-based offense row (kc, Travis Kelce)', () => {
    expect(rosterRow('kc', 'off', '2024', 'Travis Kelce').stats).toEqual({
      snap: 74,
      touch: 74,
      tgt: 106,
      scrim: 491,
      td: 6,
      ypt: 6.6,
    })
  })

  it("defense rows (kc Nick Bolton, det Za'Darius Smith)", () => {
    expect(rosterRow('kc', 'def', '2024', 'Nick Bolton').stats).toEqual({
      snap: 92,
      tkl: 161,
      sk: 2,
      int: 1,
      pd: 7,
      ff: 1,
      take: 2,
    })
    expect(rosterRow('det', 'def', '2024', "Za'Darius Smith").stats).toEqual({
      snap: 75,
      tkl: 45,
      sk: 8,
      int: 0,
      pd: 2,
      ff: 3,
      take: 3,
    })
  })
})

describe('AC7: output shapes', () => {
  it('player entity fields', () => {
    const allen = player('2024', 'allen')
    expect(allen.id).toBe('allen')
    expect(allen.name).toBe('Josh Allen')
    expect(allen.shortName).toBe('J. Allen')
    expect(allen.badge).toBe('QB')
    expect(allen.position).toBe('QB')
    expect(allen.teamId).toBe('buf')
    expect(allen.meta).toBe(`BUF ${MIDDLE_DOT} QB ${MIDDLE_DOT} #17`)
  })

  it('every player has all 22 stat keys and a meta of TEAM, POS, #N', () => {
    for (const season of SEASONS) {
      for (const p of buildPlayers(season)) {
        expect(Object.keys(p.stats).sort()).toEqual([...PLAYER_KEYS].sort())
        expect(p.meta).toMatch(new RegExp(`^[A-Z]+ ${MIDDLE_DOT} [A-Z]{2} ${MIDDLE_DOT} #\\d+$`))
        expect(p.teamId).toBe(p.meta.split(' ')[0]?.toLowerCase())
        expect(p.badge).toBe(p.position)
      }
    }
  })

  it('players have no design-only fields', () => {
    const p = player('2024', 'allen')
    for (const k of ['big', 'tile', 'abbr', 'i', 's', 'short', 'pos', 'team']) {
      expect(p).not.toHaveProperty(k)
    }
  })

  it('team entity fields', () => {
    const kc = team('2024', 'kc')
    expect(kc.id).toBe('kc')
    expect(kc.name).toBe('Kansas City Chiefs')
    expect(kc.shortName).toBe('KC')
    expect(kc.badge).toBe('KC')
    expect(kc.position).toBeUndefined()
    expect(kc.teamId).toBeUndefined()
  })

  it('every team has all 13 stat keys, 8 teams in design order, and wins + losses = 17', () => {
    for (const season of SEASONS) {
      const teams = buildTeams(season)
      expect(teams.map((t) => t.id)).toEqual([...TEAM_IDS])
      for (const t of teams) {
        expect(Object.keys(t.stats).sort()).toEqual([...TEAM_KEYS].sort())
        const m = /^(.+) · (\d+)–(\d+)$/.exec(t.meta)
        expect(m).not.toBeNull()
        expect(Number(m?.[2]) + Number(m?.[3])).toBe(17)
        expect(Number(m?.[2])).toBe(t.stats.wins)
      }
    }
  })

  it('roster rows map position, number and stat keys', () => {
    const rb = buildRoster('phi', 'off', '2024')[1]
    expect(rb?.name).toBe('Saquon Barkley')
    expect(rb?.position).toBe('RB')
    expect(rb?.number).toBe(26)
    expect(buildRoster('kc', 'off', '2024').map((r) => r.position)).toEqual([
      'QB',
      'RB',
      'RB',
      'WR',
      'WR',
      'WR',
      'TE',
    ])
    expect(buildRoster('buf', 'off', '2024')[4]?.number).toBe(0)
  })

  it('roster rows follow the design order and lengths with the expected stat keys', () => {
    for (const season of SEASONS) {
      for (const teamId of TEAM_IDS) {
        const off = buildRoster(teamId, 'off', season)
        const def = buildRoster(teamId, 'def', season)
        expect(off.map((r) => r.name)).toEqual(ROSTERS[teamId]?.off.map((r) => r[0]))
        expect(def.map((r) => r.name)).toEqual(ROSTERS[teamId]?.def.map((r) => r[0]))
        expect(off).toHaveLength(7)
        expect(def).toHaveLength(5)
        for (const r of off) {
          expect(Object.keys(r.stats).sort()).toEqual(
            ['snap', 'touch', 'tgt', 'scrim', 'td', 'ypt'].sort(),
          )
        }
        for (const r of def) {
          expect(Object.keys(r.stats).sort()).toEqual(
            ['snap', 'tkl', 'sk', 'int', 'pd', 'ff', 'take'].sort(),
          )
        }
      }
    }
  })

  it('roster positions never contain digits', () => {
    for (const teamId of TEAM_IDS) {
      for (const unit of UNITS) {
        for (const r of buildRoster(teamId, unit, '2024')) expect(r.position).not.toMatch(/\d/)
      }
    }
  })

  it('roster ids are unique across the whole dataset', () => {
    const ids: string[] = []
    for (const season of SEASONS) {
      for (const teamId of TEAM_IDS) {
        for (const unit of UNITS) ids.push(...buildRoster(teamId, unit, season).map((r) => r.id))
      }
    }
    // ids need not differ by season, but must be unique within one season's dataset
    const perSeason = ids.length / SEASONS.length
    expect(new Set(ids.slice(0, perSeason)).size).toBe(perSeason)
    for (const id of ids) expect(id.length).toBeGreaterThan(0)
  })

  it('defense take equals int + ff for every row', () => {
    for (const season of SEASONS) {
      for (const teamId of TEAM_IDS) {
        for (const r of buildRoster(teamId, 'def', season)) {
          expect(r.stats.take).toBe((r.stats.int as number) + (r.stats.ff as number))
        }
      }
    }
  })
})

describe('AC10: results are fresh objects', () => {
  it('mutating players or teams does not change later calls', () => {
    const before = buildPlayers('2024')
    const first = buildPlayers('2024')
    const p = first[0]
    if (!p) throw new Error('expected a player')
    p.name = 'Changed'
    p.stats.passYds = -1
    first.pop()
    expect(buildPlayers('2024')).toEqual(before)

    const teamsBefore = buildTeams('2023')
    const teams = buildTeams('2023')
    const t = teams[0]
    if (!t) throw new Error('expected a team')
    t.stats.ppg = 0
    t.meta = 'x'
    expect(buildTeams('2023')).toEqual(teamsBefore)
  })

  it('mutating a roster does not change later calls', () => {
    const before = buildRoster('kc', 'off', '2024')
    const rows = buildRoster('kc', 'off', '2024')
    const row = rows[0]
    if (!row) throw new Error('expected a row')
    row.stats.snap = -5
    row.name = 'Changed'
    rows.length = 0
    expect(buildRoster('kc', 'off', '2024')).toEqual(before)
  })
})

describe('invalid input', () => {
  it('buildPlayers and buildTeams throw for an unknown season', () => {
    for (const bad of ['2019', '', '2024 ', 'abc']) {
      expect(() => buildPlayers(bad)).toThrow(Error)
      expect(() => buildTeams(bad)).toThrow(Error)
    }
  })

  it('buildRoster throws for an unknown season', () => {
    expect(() => buildRoster('kc', 'off', '2019')).toThrow(/2019/)
  })

  it('buildRoster throws for an unknown team, including prototype property names', () => {
    for (const bad of ['zzz', '', 'KC', 'cin', '__proto__', 'toString', 'constructor']) {
      expect(() => buildRoster(bad, 'off', '2024')).toThrow(Error)
    }
  })

  it('buildRoster throws for an unknown unit, including prototype property names', () => {
    for (const bad of ['xx', '', 'OFF', 'special', '__proto__', 'toString']) {
      expect(() => buildRoster('kc', bad, '2024')).toThrow(Error)
    }
  })
})

describe('AC11: snapshots', () => {
  it('player snapshot (Saquon Barkley 2024)', () => {
    expect(player('2024', 'barkley')).toMatchSnapshot()
  })

  it('team snapshot (Kansas City Chiefs 2024)', () => {
    expect(team('2024', 'kc')).toMatchSnapshot()
  })

  it('offense roster row snapshot (Josh Allen, buf 2023)', () => {
    expect(rosterRow('buf', 'off', '2023', 'Josh Allen')).toMatchSnapshot()
  })

  it('defense roster row snapshot (Nick Bolton, kc 2024)', () => {
    expect(rosterRow('kc', 'def', '2024', 'Nick Bolton')).toMatchSnapshot()
  })
})
