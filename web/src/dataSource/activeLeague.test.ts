import { describe, expect, it } from 'vitest'
import type { League } from '../domain/types'
import { fixtureLeagues } from '../test/fixtureProvider'
import { firstEnabledLeagueId } from './activeLeague'

describe('AC1: the active league is the first enabled league', () => {
  it('AC1: returns the id of the first enabled league', () => {
    expect(firstEnabledLeagueId(fixtureLeagues)).toBe('zorb')
  })
  it('AC1: skips disabled leagues that come first', () => {
    const leagues: League[] = [
      { id: 'b1', name: 'Bravoball', enabled: false },
      { id: 'a1', name: 'Alphaball', enabled: true },
      { id: 'c1', name: 'Charlieball', enabled: true },
    ]
    expect(firstEnabledLeagueId(leagues)).toBe('a1')
  })
  it('AC1: returns null when no league is enabled', () => {
    const leagues: League[] = [{ id: 'b1', name: 'Bravoball', enabled: false }]
    expect(firstEnabledLeagueId(leagues)).toBeNull()
  })
  it('AC1: returns null for an empty list', () => {
    expect(firstEnabledLeagueId([])).toBeNull()
  })
  it('AC1: does not mutate its input', () => {
    const leagues = fixtureLeagues.map((l) => ({ ...l }))
    firstEnabledLeagueId(leagues)
    expect(leagues).toEqual(fixtureLeagues)
  })
})
