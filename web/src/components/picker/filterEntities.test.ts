import { describe, expect, it } from 'vitest'
import type { Entity } from '../../domain/types'
import { ALL_POSITIONS } from '../../state'
import { fixturePlayers, fixtureTeams } from '../../test/fixtureProvider'
import {
  filterEntities,
  kindSingular,
  matchesQuery,
  popoverShift,
  positionChips,
  teamText,
} from './filterEntities'

const players = fixturePlayers()
const teams = fixtureTeams()
const ids = (list: Entity[]) => list.map((e) => e.id)

describe('AC14: teamText', () => {
  it('AC14: uses teamId for a player', () => {
    expect(teamText(players[0])).toBe('zt1')
  })
  it('AC14: uses shortName for a team without teamId', () => {
    expect(teamText(teams[0])).toBe('ZQA')
  })
})

describe('AC14: matchesQuery', () => {
  it('AC14: an empty query matches everything', () => {
    expect(players.every((p) => matchesQuery(p, ''))).toBe(true)
  })
  it('AC14: a whitespace-only query matches everything', () => {
    expect(players.every((p) => matchesQuery(p, '   '))).toBe(true)
  })
  it('AC14: matches a substring of the name', () => {
    expect(matchesQuery(players[0], 'quen')).toBe(true)
    expect(matchesQuery(players[0], 'rastow')).toBe(false)
  })
  it('AC14: is case-insensitive for query and data', () => {
    expect(matchesQuery(players[0], 'OLA QUENBY')).toBe(true)
    expect(matchesQuery(players[0], 'ZT1')).toBe(true)
  })
  it('AC14: ignores leading and trailing whitespace', () => {
    expect(matchesQuery(players[0], '  quenby  ')).toBe(true)
  })
  it('AC14: keeps inner whitespace significant', () => {
    expect(matchesQuery(players[0], 'ola quenby')).toBe(true)
    expect(matchesQuery(players[0], 'olaquenby')).toBe(false)
  })
  it('AC14: matches a player by team id', () => {
    expect(matchesQuery(players[0], 'zt1')).toBe(true)
    expect(matchesQuery(players[0], 'zt2')).toBe(false)
  })
  it('AC14: matches a team by short name and by name', () => {
    expect(matchesQuery(teams[0], 'zqa')).toBe(true)
    expect(matchesQuery(teams[0], 'flarns')).toBe(true)
    expect(matchesQuery(teams[0], 'zqb')).toBe(false)
  })
  it('AC14: does not match a player by its short name', () => {
    const e: Entity = { ...players[0], name: 'Aaa Bbb', shortName: 'Hidden', teamId: 'zt9' }
    expect(matchesQuery(e, 'hidden')).toBe(false)
  })
  it('AC14: regex characters are treated literally', () => {
    expect(matchesQuery(players[0], '.*')).toBe(false)
    expect(matchesQuery(players[0], '(')).toBe(false)
  })
})

describe('AC15: positionChips', () => {
  it('AC15: starts with All then distinct positions in first-appearance order', () => {
    expect(positionChips(players)).toEqual([ALL_POSITIONS, 'ZA', 'ZB', 'ZC'])
  })
  it('AC15: skips entities with no position', () => {
    const only = players.filter((p) => p.position === undefined)
    expect(only).toHaveLength(1)
    expect(positionChips(only)).toEqual([ALL_POSITIONS])
  })
  it('AC15: an empty list gives only All', () => {
    expect(positionChips([])).toEqual([ALL_POSITIONS])
  })
  it('AC15: order follows the data, not alphabetical order', () => {
    const reversed = [...players].reverse()
    expect(positionChips(reversed)).toEqual([ALL_POSITIONS, 'ZC', 'ZB', 'ZA'])
  })
})

describe('AC16: filterEntities', () => {
  it('AC16: no query and All returns every entity in provider order', () => {
    expect(ids(filterEntities(players, '', ALL_POSITIONS))).toEqual(ids(players))
  })
  it('AC16: a position keeps only that position', () => {
    expect(ids(filterEntities(players, '', 'ZA'))).toEqual(['zp1', 'zp4', 'zp7'])
  })
  it('AC16: a position excludes entities with no position', () => {
    expect(ids(filterEntities(players, '', 'ZA'))).not.toContain('zp10')
  })
  it('AC16: query and position combine with AND', () => {
    expect(ids(filterEntities(players, 'zt1', 'ZA'))).toEqual(['zp1', 'zp7'])
  })
  it('AC20: nothing matching returns an empty list', () => {
    expect(filterEntities(players, 'zzzz', ALL_POSITIONS)).toEqual([])
    expect(filterEntities(players, 'quenby', 'ZB')).toEqual([])
  })
  it('AC16: an unknown position returns an empty list', () => {
    expect(filterEntities(players, '', 'NOPE')).toEqual([])
  })
  it('AC14: a query on teams matches short name or name', () => {
    expect(ids(filterEntities(teams, 'zqb', ALL_POSITIONS))).toEqual(['zt2'])
    expect(ids(filterEntities(teams, 'OWLS', ALL_POSITIONS))).toEqual(['zt4'])
  })
  it('AC16: does not mutate the input', () => {
    const copy = fixturePlayers()
    filterEntities(copy, 'zt1', 'ZA')
    expect(copy).toEqual(players)
  })
})

describe('AC8: kindSingular', () => {
  it('AC8: maps kinds to singular words', () => {
    expect(kindSingular('players')).toBe('player')
    expect(kindSingular('teams')).toBe('team')
  })
})

describe('AC35: popoverShift', () => {
  it('AC35: a popover that fits is not shifted', () => {
    expect(popoverShift(28, 360, 1280)).toBe(0)
  })
  it('AC35: a popover that exactly fits inside the margin is not shifted', () => {
    expect(popoverShift(912, 360, 1280)).toBe(0)
  })
  it('AC35: one pixel of overflow past the margin shifts by one pixel', () => {
    expect(popoverShift(913, 360, 1280)).toBe(1)
  })
  it('AC35: an overflowing popover is shifted so its right edge is margin inside', () => {
    expect(popoverShift(1000, 360, 1280)).toBe(88)
  })
  it('AC35: honours a custom margin', () => {
    expect(popoverShift(1000, 360, 1280, 20)).toBe(100)
  })
  it('AC35: never moves the popover left of the margin', () => {
    const shift = popoverShift(50, 360, 300)
    expect(50 - shift).toBe(8)
  })
  it('AC35: the shift is never negative', () => {
    expect(popoverShift(4, 100, 1280)).toBe(0)
  })
})
