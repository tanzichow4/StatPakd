import { act, renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { DataSource } from '../../dataSource'
import type { DataProvider } from '../../domain/provider'
import type { RosterEntry, RosterUnit, Season, TeamId } from '../../domain/types'
import { deferred, fixtureRoster, rosterProvider } from '../../test/fixtureProvider'
import { useRoster } from './useRoster'

interface Props {
  teamId: TeamId
  unit: RosterUnit | null
  season: Season
}

const initialProps: Props = { teamId: 'zt1', unit: 'zunit', season: '3031' }

function setup(provider: DataProvider, initial: Props = initialProps) {
  function Wrapper({ children }: { children: ReactNode }) {
    return <DataSource provider={provider}>{children}</DataSource>
  }
  return renderHook(({ teamId, unit, season }: Props) => useRoster(teamId, unit, season), {
    wrapper: Wrapper,
    initialProps: initial,
  })
}

const ids = (list: RosterEntry[] | null) => list?.map((r) => r.id)
const ALT_IDS = ['zr1', 'zr2']

describe('AC26: useRoster loads through the provider', () => {
  it('AC26: calls getRoster with league, team, unit and season', async () => {
    const provider = rosterProvider()
    const { result } = setup(provider)
    await waitFor(() => expect(result.current).not.toBeNull())
    expect(provider.getRoster).toHaveBeenCalledWith('zorb', 'zt1', 'zunit', '3031')
    expect(ids(result.current)).toEqual(ids(fixtureRoster('zunit')))
  })
  it('AC27: is null while the load is pending', async () => {
    const d = deferred<RosterEntry[]>()
    const { result } = setup(rosterProvider({ getRoster: vi.fn(() => d.promise) }))
    await act(async () => {})
    expect(result.current).toBeNull()
    await act(async () => d.resolve(fixtureRoster('zalt')))
    expect(ids(result.current)).toEqual(ALT_IDS)
  })
  it('AC20: an empty roster is [] and not null', async () => {
    const getRoster = vi.fn(() => Promise.resolve([]))
    const { result } = setup(rosterProvider({ getRoster }))
    await waitFor(() => expect(result.current).toEqual([]))
  })
  it('AC27: a rejected load gives null without throwing', async () => {
    const getRoster = vi.fn(() => Promise.reject(new Error('boom')))
    const { result } = setup(rosterProvider({ getRoster }))
    await waitFor(() => expect(getRoster).toHaveBeenCalled())
    await act(async () => {})
    expect(result.current).toBeNull()
  })
})

describe('AC28: a null unit makes no call', () => {
  it('AC28: unit null gives null and getRoster is never called', async () => {
    const provider = rosterProvider()
    const { result } = setup(provider, { teamId: 'zt1', unit: null, season: '3031' })
    await act(async () => {})
    expect(result.current).toBeNull()
    expect(provider.getRoster).not.toHaveBeenCalled()
  })
  it('AC28: going from a unit to null drops the data and makes no further call', async () => {
    const provider = rosterProvider()
    const { result, rerender } = setup(provider)
    await waitFor(() => expect(result.current).not.toBeNull())
    rerender({ teamId: 'zt1', unit: null, season: '3031' })
    expect(result.current).toBeNull()
    await act(async () => {})
    expect(provider.getRoster).toHaveBeenCalledTimes(1)
  })
  it('AC28: going from null to a unit loads it', async () => {
    const provider = rosterProvider()
    const { result, rerender } = setup(provider, { teamId: 'zt1', unit: null, season: '3031' })
    await act(async () => {})
    rerender({ teamId: 'zt1', unit: 'zalt', season: '3031' })
    await waitFor(() => expect(ids(result.current)).toEqual(ALT_IDS))
    expect(provider.getRoster).toHaveBeenCalledWith('zorb', 'zt1', 'zalt', '3031')
  })
})

describe.each([
  ['team', { teamId: 'zt2', unit: 'zunit', season: '3031' }],
  ['unit', { teamId: 'zt1', unit: 'zalt', season: '3031' }],
  ['season', { teamId: 'zt1', unit: 'zunit', season: '3030' }],
] as [string, Props][])('AC26: a %s change', (name, next) => {
  it('AC26: reloads and is null until the new load lands', async () => {
    const d = deferred<RosterEntry[]>()
    const getRoster = vi
      .fn()
      .mockImplementationOnce(() => Promise.resolve(fixtureRoster('zunit')))
      .mockImplementation(() => d.promise)
    const { result, rerender } = setup(rosterProvider({ getRoster }))
    await waitFor(() => expect(result.current).not.toBeNull())
    rerender(next)
    expect(result.current).toBeNull()
    expect(getRoster).toHaveBeenLastCalledWith('zorb', next.teamId, next.unit, next.season)
    await act(async () => d.resolve(fixtureRoster('zalt')))
    expect(ids(result.current)).toEqual(ALT_IDS)
  })
  it(`AC26: an old load that resolves late after a ${name} change is ignored`, async () => {
    const first = deferred<RosterEntry[]>()
    const second = deferred<RosterEntry[]>()
    const getRoster = vi
      .fn()
      .mockImplementationOnce(() => first.promise)
      .mockImplementationOnce(() => second.promise)
    const { result, rerender } = setup(rosterProvider({ getRoster }))
    await waitFor(() => expect(getRoster).toHaveBeenCalledTimes(1))
    rerender(next)
    await waitFor(() => expect(getRoster).toHaveBeenCalledTimes(2))
    await act(async () => second.resolve(fixtureRoster('zalt')))
    expect(ids(result.current)).toEqual(ALT_IDS)
    await act(async () => first.resolve(fixtureRoster('zunit')))
    expect(ids(result.current)).toEqual(ALT_IDS)
  })
  it(`AC26: an old load resolving first is not shown after a ${name} change`, async () => {
    const first = deferred<RosterEntry[]>()
    const second = deferred<RosterEntry[]>()
    const getRoster = vi
      .fn()
      .mockImplementationOnce(() => first.promise)
      .mockImplementationOnce(() => second.promise)
    const { result, rerender } = setup(rosterProvider({ getRoster }))
    await waitFor(() => expect(getRoster).toHaveBeenCalledTimes(1))
    rerender(next)
    await waitFor(() => expect(getRoster).toHaveBeenCalledTimes(2))
    await act(async () => first.resolve(fixtureRoster('zunit')))
    expect(result.current).toBeNull()
  })
})

describe('AC27: recovery and cleanup', () => {
  it('AC27: a later successful change recovers after a rejection', async () => {
    const getRoster = vi
      .fn()
      .mockImplementationOnce(() => Promise.reject(new Error('boom')))
      .mockImplementation(() => Promise.resolve(fixtureRoster('zalt')))
    const { result, rerender } = setup(rosterProvider({ getRoster }))
    await act(async () => {})
    expect(result.current).toBeNull()
    rerender({ teamId: 'zt1', unit: 'zalt', season: '3031' })
    await waitFor(() => expect(ids(result.current)).toEqual(ALT_IDS))
  })
  it('AC27: unmounting before the response causes no console error', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    try {
      const d = deferred<RosterEntry[]>()
      const provider = rosterProvider({ getRoster: vi.fn(() => d.promise) })
      const { unmount } = setup(provider)
      await waitFor(() => expect(provider.getRoster).toHaveBeenCalled())
      unmount()
      await act(async () => d.resolve(fixtureRoster('zunit')))
      expect(spy).not.toHaveBeenCalled()
    } finally {
      spy.mockRestore()
    }
  })
})
