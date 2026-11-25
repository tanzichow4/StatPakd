import { act, renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { DataSource } from '../../dataSource'
import type { DataProvider } from '../../domain/provider'
import type { EntityKind, League, StatDef } from '../../domain/types'
import { createFixtureProvider, deferred, fixtureSidebarStatDefs } from '../../test/fixtureProvider'
import { useStatDefs } from './useStatDefs'

function wrapperFor(provider: DataProvider) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <DataSource provider={provider}>{children}</DataSource>
  }
}

function providerWith(overrides: Partial<DataProvider> = {}) {
  const defs = fixtureSidebarStatDefs()
  return createFixtureProvider({
    getStatDefs: vi.fn((_leagueId: string, kind: EntityKind) => Promise.resolve(defs[kind])),
    ...overrides,
  })
}

function setup(provider: DataProvider, kind: EntityKind = 'players') {
  return renderHook(({ k }: { k: EntityKind }) => useStatDefs(k), {
    wrapper: wrapperFor(provider),
    initialProps: { k: kind },
  })
}

const keys = (list: StatDef[]) => list.map((d) => d.key)

describe('AC1: useStatDefs loads through the provider', () => {
  it('AC1: resolves the defs of the active league and kind in provider order', async () => {
    const { result } = setup(providerWith())
    await waitFor(() => expect(result.current).toHaveLength(8))
    expect(keys(result.current)).toEqual(keys(fixtureSidebarStatDefs().players))
  })
  it('AC1: calls getStatDefs with the first enabled league and the kind', async () => {
    const provider = providerWith()
    const { result } = setup(provider)
    await waitFor(() => expect(result.current.length).toBeGreaterThan(0))
    expect(provider.getStatDefs).toHaveBeenCalledWith('zorb', 'players')
  })
  it('AC1: uses the first enabled league even when it is not first in the list', async () => {
    const leagues: League[] = [
      { id: 'off1', name: 'Offball', enabled: false },
      { id: 'on1', name: 'Onball', enabled: true },
    ]
    const provider = providerWith({ getLeagues: vi.fn(() => Promise.resolve(leagues)) })
    const { result } = setup(provider)
    await waitFor(() => expect(result.current.length).toBeGreaterThan(0))
    expect(provider.getStatDefs).toHaveBeenCalledWith('on1', 'players')
  })
  it('AC1: with no enabled league it returns [] and never calls getStatDefs', async () => {
    const leagues: League[] = [{ id: 'off1', name: 'Offball', enabled: false }]
    const provider = providerWith({ getLeagues: vi.fn(() => Promise.resolve(leagues)) })
    const { result } = setup(provider)
    await act(async () => {})
    expect(result.current).toEqual([])
    expect(provider.getStatDefs).not.toHaveBeenCalled()
  })
})

describe('AC6: loading, failure and stale results', () => {
  it('AC6: pending gives [] and then the defs once resolved', async () => {
    const d = deferred<StatDef[]>()
    const { result } = setup(providerWith({ getStatDefs: vi.fn(() => d.promise) }))
    await act(async () => {})
    expect(result.current).toEqual([])
    await act(async () => d.resolve(fixtureSidebarStatDefs().teams))
    expect(result.current).toHaveLength(3)
  })
  it('AC6: a rejected getStatDefs gives [] without throwing', async () => {
    const getStatDefs = vi.fn(() => Promise.reject(new Error('boom')))
    const { result } = setup(providerWith({ getStatDefs }))
    await act(async () => {})
    expect(getStatDefs).toHaveBeenCalled()
    expect(result.current).toEqual([])
  })
  it('AC6: a rejected getLeagues gives []', async () => {
    const provider = providerWith({ getLeagues: vi.fn(() => Promise.reject(new Error('x'))) })
    const { result } = setup(provider)
    await act(async () => {})
    expect(result.current).toEqual([])
    expect(provider.getStatDefs).not.toHaveBeenCalled()
  })
  it('AC5: a kind switch loads the other kind and drops the old defs immediately', async () => {
    const provider = providerWith()
    const { result, rerender } = setup(provider)
    await waitFor(() => expect(result.current).toHaveLength(8))
    rerender({ k: 'teams' })
    expect(result.current).toEqual([])
    await waitFor(() => expect(keys(result.current)).toEqual(['ztpts', 'ztwin', 'ztblk']))
    expect(provider.getStatDefs).toHaveBeenCalledWith('zorb', 'teams')
  })
  it('AC6: after a kind switch the old request resolving last never shows the old defs', async () => {
    const first = deferred<StatDef[]>()
    const second = deferred<StatDef[]>()
    const getStatDefs = vi
      .fn()
      .mockImplementationOnce(() => first.promise)
      .mockImplementationOnce(() => second.promise)
    const { result, rerender } = setup(providerWith({ getStatDefs }))
    await waitFor(() => expect(getStatDefs).toHaveBeenCalledTimes(1))
    rerender({ k: 'teams' })
    await waitFor(() => expect(getStatDefs).toHaveBeenCalledTimes(2))
    await act(async () => second.resolve(fixtureSidebarStatDefs().teams))
    expect(keys(result.current)).toEqual(['ztpts', 'ztwin', 'ztblk'])
    await act(async () => first.resolve(fixtureSidebarStatDefs().players))
    expect(keys(result.current)).toEqual(['ztpts', 'ztwin', 'ztblk'])
  })
  it('AC6: a late old-kind response alone leaves the new kind empty', async () => {
    const first = deferred<StatDef[]>()
    const second = deferred<StatDef[]>()
    const getStatDefs = vi
      .fn()
      .mockImplementationOnce(() => first.promise)
      .mockImplementationOnce(() => second.promise)
    const { result, rerender } = setup(providerWith({ getStatDefs }))
    await waitFor(() => expect(getStatDefs).toHaveBeenCalledTimes(1))
    rerender({ k: 'teams' })
    await waitFor(() => expect(getStatDefs).toHaveBeenCalledTimes(2))
    await act(async () => first.resolve(fixtureSidebarStatDefs().players))
    expect(result.current).toEqual([])
  })
  it('AC6: unmounting before the response causes no console error', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    try {
      const d = deferred<StatDef[]>()
      const provider = providerWith({ getStatDefs: vi.fn(() => d.promise) })
      const { unmount } = setup(provider)
      await waitFor(() => expect(provider.getStatDefs).toHaveBeenCalled())
      unmount()
      await act(async () => d.resolve(fixtureSidebarStatDefs().players))
      expect(spy).not.toHaveBeenCalled()
    } finally {
      spy.mockRestore()
    }
  })
})
