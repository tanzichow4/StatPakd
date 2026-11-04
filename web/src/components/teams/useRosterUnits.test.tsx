import { act, renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { DataSource } from '../../dataSource'
import type { DataProvider } from '../../domain/provider'
import type { League, RosterUnitDef } from '../../domain/types'
import { createFixtureProvider, deferred, fixtureRosterUnits } from '../../test/fixtureProvider'
import { useRosterUnits } from './useRosterUnits'

function setup(provider: DataProvider) {
  function Wrapper({ children }: { children: ReactNode }) {
    return <DataSource provider={provider}>{children}</DataSource>
  }
  return renderHook(() => useRosterUnits(), { wrapper: Wrapper })
}

const withUnits = (overrides: Partial<DataProvider> = {}) =>
  createFixtureProvider({
    getRosterUnits: vi.fn(() => Promise.resolve(fixtureRosterUnits())),
    ...overrides,
  })

describe('AC27: useRosterUnits', () => {
  it('AC27: is null while the load is pending', async () => {
    const d = deferred<RosterUnitDef[]>()
    const { result } = setup(withUnits({ getRosterUnits: vi.fn(() => d.promise) }))
    await act(async () => {})
    expect(result.current).toBeNull()
    await act(async () => d.resolve(fixtureRosterUnits()))
    expect(result.current).toEqual(fixtureRosterUnits())
  })
  it('AC6/AC26: loads the units of the active league, in provider order', async () => {
    const provider = withUnits()
    const { result } = setup(provider)
    await waitFor(() => expect(result.current).not.toBeNull())
    expect(provider.getRosterUnits).toHaveBeenCalledWith('zorb')
    expect(result.current?.map((u) => u.key)).toEqual(['zunit', 'zalt'])
  })
  it('AC27: a rejected load gives null and does not throw', async () => {
    const getRosterUnits = vi.fn(() => Promise.reject(new Error('boom')))
    const { result } = setup(withUnits({ getRosterUnits }))
    await waitFor(() => expect(getRosterUnits).toHaveBeenCalled())
    await act(async () => {})
    expect(result.current).toBeNull()
  })
  it('AC20: an empty list of units is [], not null', async () => {
    const { result } = setup(withUnits({ getRosterUnits: vi.fn(() => Promise.resolve([])) }))
    await waitFor(() => expect(result.current).toEqual([]))
  })
  it('AC27: with no enabled league it stays null and makes no call', async () => {
    const leagues: League[] = [{ id: 'off1', name: 'Offball', enabled: false }]
    const provider = withUnits({ getLeagues: vi.fn(() => Promise.resolve(leagues)) })
    const { result } = setup(provider)
    await act(async () => {})
    expect(result.current).toBeNull()
    expect(provider.getRosterUnits).not.toHaveBeenCalled()
  })
  it('AC27: unmounting before the response causes no console error', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    try {
      const d = deferred<RosterUnitDef[]>()
      const provider = withUnits({ getRosterUnits: vi.fn(() => d.promise) })
      const { unmount } = setup(provider)
      await waitFor(() => expect(provider.getRosterUnits).toHaveBeenCalled())
      unmount()
      await act(async () => d.resolve(fixtureRosterUnits()))
      expect(spy).not.toHaveBeenCalled()
    } finally {
      spy.mockRestore()
    }
  })
})
