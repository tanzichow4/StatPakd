import { act, renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { DataSource } from '../../dataSource'
import type { DataProvider } from '../../domain/provider'
import type { Entity, EntityKind, League, Season } from '../../domain/types'
import {
  createFixtureProvider,
  deferred,
  entitiesProvider,
  fixturePlayers,
  fixtureTeams,
} from '../../test/fixtureProvider'
import { useEntities } from './useEntities'

function wrapperFor(provider: DataProvider) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <DataSource provider={provider}>{children}</DataSource>
  }
}

interface Props {
  kind: EntityKind
  season: Season
}

function setup(provider: DataProvider, initial: Props = { kind: 'players', season: '3031' }) {
  return renderHook(({ kind, season }: Props) => useEntities(kind, season), {
    wrapper: wrapperFor(provider),
    initialProps: initial,
  })
}

const ids = (list: Entity[]) => list.map((e) => e.id)

describe('AC1: useEntities loads through the provider', () => {
  it('AC1: calls getEntities with the first enabled league, kind and season', async () => {
    const provider = entitiesProvider()
    const { result } = setup(provider)
    await waitFor(() => expect(result.current).toHaveLength(fixturePlayers().length))
    expect(provider.getEntities).toHaveBeenCalledWith('zorb', 'players', '3031')
  })
  it('AC1: uses the first enabled league even when it is not first in the list', async () => {
    const leagues: League[] = [
      { id: 'off1', name: 'Offball', enabled: false },
      { id: 'on1', name: 'Onball', enabled: true },
    ]
    const provider = entitiesProvider({ getLeagues: vi.fn(() => Promise.resolve(leagues)) })
    const { result } = setup(provider)
    await waitFor(() => expect(result.current.length).toBeGreaterThan(0))
    expect(provider.getEntities).toHaveBeenCalledWith('on1', 'players', '3031')
    expect(provider.getEntities).not.toHaveBeenCalledWith('off1', 'players', '3031')
  })
  it('AC1: returns the entities in provider order', async () => {
    const { result } = setup(entitiesProvider())
    await waitFor(() => expect(result.current).toHaveLength(10))
    expect(ids(result.current)).toEqual(ids(fixturePlayers()))
  })
  it('AC1: returns an empty list before the data arrives', async () => {
    const d = deferred<Entity[]>()
    const { result } = setup(entitiesProvider({ getEntities: vi.fn(() => d.promise) }))
    await act(async () => {})
    expect(result.current).toEqual([])
    await act(async () => d.resolve(fixtureTeams()))
    expect(result.current).toHaveLength(4)
  })
  it('AC1: with no enabled league it returns [] and does not call getEntities', async () => {
    const leagues: League[] = [{ id: 'off1', name: 'Offball', enabled: false }]
    const provider = entitiesProvider({ getLeagues: vi.fn(() => Promise.resolve(leagues)) })
    const { result } = setup(provider)
    await act(async () => {})
    expect(result.current).toEqual([])
    expect(provider.getEntities).not.toHaveBeenCalled()
  })
})

describe('AC2: reload on kind and season change', () => {
  it('AC2: a kind change loads the new kind', async () => {
    const provider = entitiesProvider()
    const { result, rerender } = setup(provider)
    await waitFor(() => expect(result.current).toHaveLength(10))
    rerender({ kind: 'teams', season: '3031' })
    await waitFor(() => expect(ids(result.current)).toEqual(ids(fixtureTeams())))
    expect(provider.getEntities).toHaveBeenCalledWith('zorb', 'teams', '3031')
  })
  it('AC2: a season change loads the new season', async () => {
    const provider = entitiesProvider()
    const { result, rerender } = setup(provider)
    await waitFor(() => expect(result.current).toHaveLength(10))
    rerender({ kind: 'players', season: '3030' })
    await waitFor(() =>
      expect(provider.getEntities).toHaveBeenCalledWith('zorb', 'players', '3030'),
    )
    await act(async () => {})
    expect(result.current).toHaveLength(10)
  })
  it('AC2: old entities are not returned after the key changes, before the new data lands', async () => {
    const d = deferred<Entity[]>()
    const getEntities = vi
      .fn()
      .mockImplementationOnce(() => Promise.resolve(fixturePlayers()))
      .mockImplementation(() => d.promise)
    const { result, rerender } = setup(entitiesProvider({ getEntities }))
    await waitFor(() => expect(result.current).toHaveLength(10))
    rerender({ kind: 'teams', season: '3031' })
    expect(result.current).toEqual([])
    await act(async () => d.resolve(fixtureTeams()))
    expect(result.current).toHaveLength(4)
  })
  it('AC2: responses resolving out of order show only the latest request', async () => {
    const first = deferred<Entity[]>()
    const second = deferred<Entity[]>()
    const getEntities = vi
      .fn()
      .mockImplementationOnce(() => first.promise)
      .mockImplementationOnce(() => second.promise)
    const { result, rerender } = setup(entitiesProvider({ getEntities }))
    await waitFor(() => expect(getEntities).toHaveBeenCalledTimes(1))
    rerender({ kind: 'teams', season: '3031' })
    await waitFor(() => expect(getEntities).toHaveBeenCalledTimes(2))
    await act(async () => second.resolve(fixtureTeams()))
    expect(ids(result.current)).toEqual(ids(fixtureTeams()))
    await act(async () => first.resolve(fixturePlayers()))
    expect(ids(result.current)).toEqual(ids(fixtureTeams()))
  })
  it('AC2: a late response for an old season is ignored', async () => {
    const first = deferred<Entity[]>()
    const second = deferred<Entity[]>()
    const getEntities = vi
      .fn()
      .mockImplementationOnce(() => first.promise)
      .mockImplementationOnce(() => second.promise)
    const { result, rerender } = setup(entitiesProvider({ getEntities }))
    await waitFor(() => expect(getEntities).toHaveBeenCalledTimes(1))
    rerender({ kind: 'players', season: '3030' })
    await waitFor(() => expect(getEntities).toHaveBeenCalledTimes(2))
    await act(async () => first.resolve(fixturePlayers()))
    expect(result.current).toEqual([])
    await act(async () => second.resolve(fixturePlayers().slice(0, 2)))
    expect(result.current).toHaveLength(2)
  })
})

describe('AC3: failures', () => {
  it('AC3: a rejected getEntities gives an empty list without throwing', async () => {
    const getEntities = vi.fn(() => Promise.reject(new Error('boom')))
    const { result } = setup(entitiesProvider({ getEntities }))
    await act(async () => {})
    expect(getEntities).toHaveBeenCalled()
    expect(result.current).toEqual([])
  })
  it('AC3: a later successful kind change recovers after a rejection', async () => {
    const getEntities = vi
      .fn()
      .mockImplementationOnce(() => Promise.reject(new Error('boom')))
      .mockImplementation(() => Promise.resolve(fixtureTeams()))
    const { result, rerender } = setup(entitiesProvider({ getEntities }))
    await act(async () => {})
    expect(result.current).toEqual([])
    rerender({ kind: 'teams', season: '3031' })
    await waitFor(() => expect(result.current).toHaveLength(4))
  })
  it('AC3: a rejected getLeagues gives an empty list and no getEntities call', async () => {
    const provider = createFixtureProvider({
      getLeagues: vi.fn(() => Promise.reject(new Error('no leagues'))),
    })
    const { result } = setup(provider)
    await act(async () => {})
    expect(result.current).toEqual([])
    expect(provider.getEntities).not.toHaveBeenCalled()
  })
  it('AC3: unmounting before the response causes no console error', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    try {
      const d = deferred<Entity[]>()
      const provider = entitiesProvider({ getEntities: vi.fn(() => d.promise) })
      const { unmount } = setup(provider)
      await waitFor(() => expect(provider.getEntities).toHaveBeenCalled())
      unmount()
      await act(async () => d.resolve(fixturePlayers()))
      expect(spy).not.toHaveBeenCalled()
    } finally {
      spy.mockRestore()
    }
  })
})
