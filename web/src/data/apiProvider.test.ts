import { describe, expect, it, vi } from 'vitest'
import { ApiProvider, type Fetch } from './apiProvider'

const answer = (body: unknown, status = 200) =>
  Promise.resolve({ ok: status < 400, status, json: () => Promise.resolve(body) })

const entity = {
  id: 'e',
  name: 'E',
  shortName: 'E',
  meta: '',
  badge: '',
  stats: { k: 1, n: null },
}

describe('ApiProvider requests', () => {
  it.each([
    ['getLeagues', [], '/api/leagues'],
    ['getSeasons', ['nfl'], '/api/leagues/nfl/seasons'],
    ['getStatDefs', ['nfl', 'teams'], '/api/leagues/nfl/stat-defs?kind=teams'],
    [
      'getEntities',
      ['nfl', 'players', '2026'],
      '/api/leagues/nfl/entities?kind=players&season=2026',
    ],
    ['getRosterUnits', ['nfl'], '/api/leagues/nfl/roster-units'],
    [
      'getRoster',
      ['nfl', 'buf', 'off', '2026'],
      '/api/leagues/nfl/teams/buf/roster?unit=off&season=2026',
    ],
    ['getGameLog', ['nfl', '00-1', '2026'], '/api/leagues/nfl/players/00-1/game-log?season=2026'],
  ])('%s asks for the right address', async (method, args, url) => {
    const fetcher = vi.fn<Fetch>(() => answer([]))
    const provider = new ApiProvider('', fetcher)
    await (provider[method as 'getSeasons'] as (...a: string[]) => Promise<unknown>).call(
      provider,
      ...(args as string[]),
    )
    expect(fetcher).toHaveBeenCalledWith(url)
  })

  it('asks for the starting choices', async () => {
    const body = { season: '1', teamId: 't', unit: 'u', sortKey: 's', players: {}, teams: {} }
    const fetcher = vi.fn<Fetch>(() => answer(body))
    await expect(new ApiProvider('', fetcher).getUiDefaults('nfl')).resolves.toEqual(body)
    expect(fetcher).toHaveBeenCalledWith('/api/leagues/nfl/ui-defaults')
  })

  it('prefixes the address of the API and escapes ids', async () => {
    const fetcher = vi.fn<Fetch>(() => answer([]))
    await new ApiProvider('http://api.test/', fetcher).getRoster('nfl', 'a/b', 'o f', '2026')
    expect(fetcher).toHaveBeenCalledWith(
      'http://api.test/api/leagues/nfl/teams/a%2Fb/roster?unit=o+f&season=2026',
    )
  })

  it('returns valid data, including null stats', async () => {
    const provider = new ApiProvider('', () => answer([entity]))
    await expect(provider.getEntities('nfl', 'players', '1')).resolves.toEqual([entity])
  })

  it('requests each address once', async () => {
    const fetcher = vi.fn<Fetch>(() => answer(['2026']))
    const provider = new ApiProvider('', fetcher)
    await Promise.all([provider.getSeasons('nfl'), provider.getSeasons('nfl')])
    await provider.getSeasons('nfl')
    expect(fetcher).toHaveBeenCalledTimes(1)
  })
})

describe('ApiProvider failures', () => {
  it('rejects an error status, remembers the message and allows another try', async () => {
    const fetcher = vi
      .fn<Fetch>()
      .mockImplementationOnce(() => answer({}, 503))
      .mockImplementation(() => answer(['2026']))
    const provider = new ApiProvider('', fetcher)
    await expect(provider.getSeasons('nfl')).rejects.toThrow('503')
    expect(provider.status.getSnapshot()).toEqual({
      pending: 0,
      error: 'The data server answered 503.',
    })
    await expect(provider.getSeasons('nfl')).resolves.toEqual(['2026'])
    provider.status.reset()
    expect(provider.status.getSnapshot().error).toBeNull()
  })

  it('explains an unreachable server', async () => {
    const provider = new ApiProvider('', () => Promise.reject(new TypeError('Failed to fetch')))
    await expect(provider.getLeagues()).rejects.toThrow('The data server could not be reached.')
  })

  it.each([
    ['getLeagues', { not: 'a list' }],
    ['getLeagues', [{ id: 'x', name: 'X' }]],
    ['getSeasons', [1]],
  ])('%s rejects an unexpected answer', async (method, body) => {
    const provider = new ApiProvider('', () => answer(body))
    await expect(provider[method as 'getLeagues']()).rejects.toThrow('unexpected answer')
  })

  it('rejects stats that are not numbers or null', async () => {
    const provider = new ApiProvider('', () => answer([{ ...entity, stats: { k: '1' } }]))
    await expect(provider.getEntities('nfl', 'players', '1')).rejects.toThrow('unexpected')
  })

  it('tells listeners while a request is under way', async () => {
    const provider = new ApiProvider('', () => answer([]))
    const pending: number[] = []
    const stop = provider.status.subscribe(() =>
      pending.push(provider.status.getSnapshot().pending),
    )
    await provider.getLeagues()
    stop()
    await provider.getSeasons('nfl')
    expect(pending).toEqual([1, 0])
  })
})

describe('ApiProvider playoffs', () => {
  it('can leave playoff games out', () => {
    expect(new ApiProvider().hasPlayoffs).toBe(true)
  })

  it('says so only when they are left out', async () => {
    const fetcher = vi.fn<Fetch>(() => answer([]))
    const provider = new ApiProvider('', fetcher)
    await provider.getEntities('nfl', 'teams', '1', { playoffs: false })
    await provider.getRoster('nfl', 't', 'u', '1', { playoffs: false })
    await provider.getGameLog('nfl', 'p', '1', { playoffs: false })
    await provider.getEntities('nfl', 'teams', '1', { playoffs: true })
    expect(fetcher.mock.calls.map(([url]) => url)).toEqual([
      '/api/leagues/nfl/entities?kind=teams&season=1&playoffs=false',
      '/api/leagues/nfl/teams/t/roster?unit=u&season=1&playoffs=false',
      '/api/leagues/nfl/players/p/game-log?season=1&playoffs=false',
      '/api/leagues/nfl/entities?kind=teams&season=1',
    ])
  })
})
