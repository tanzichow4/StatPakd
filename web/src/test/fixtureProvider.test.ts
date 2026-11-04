import { describe, expect, it, vi } from 'vitest'
import type { RosterUnitDef } from '../domain/types'
import { createFixtureProvider } from './fixtureProvider'

describe('createFixtureProvider getRosterUnits', () => {
  it('AC8: defaults to a spy that resolves to []', async () => {
    const p = createFixtureProvider()
    const result = p.getRosterUnits('zorb')
    expect(result).toBeInstanceOf(Promise)
    expect(await result).toEqual([])
    expect(vi.isMockFunction(p.getRosterUnits)).toBe(true)
    expect(p.getRosterUnits).toHaveBeenCalledWith('zorb')
  })

  it('AC8: each call resolves to a fresh array', async () => {
    const p = createFixtureProvider()
    const a = await p.getRosterUnits('zorb')
    a.push({ key: 'x', label: 'X', stats: [] })
    expect(await p.getRosterUnits('zorb')).toEqual([])
  })

  it('AC8: an override replaces the default', async () => {
    const units: RosterUnitDef[] = [{ key: 'zunit', label: 'Zunit One', stats: [] }]
    const p = createFixtureProvider({ getRosterUnits: vi.fn(() => Promise.resolve(units)) })
    expect(await p.getRosterUnits('zorb')).toBe(units)
  })

  it('AC8: other methods keep their defaults when getRosterUnits is overridden', async () => {
    const p = createFixtureProvider({ getRosterUnits: vi.fn(() => Promise.resolve([])) })
    expect(await p.getRoster('zorb', 'zt1', 'zunit', '3031')).toEqual([])
    expect((await p.getLeagues()).length).toBeGreaterThan(0)
  })
})
