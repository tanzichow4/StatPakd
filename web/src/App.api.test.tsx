import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MockProvider } from './data/mockProvider'
import { seriousViolations } from './test/axe'

const mock = new MockProvider()

/** Answers the API's addresses from the sample data, so the app runs as it does for real. */
async function body(url: string): Promise<unknown> {
  const { pathname, searchParams } = new URL(url, 'http://web.test')
  const season = searchParams.get('season') ?? ''
  const parts = pathname.split('/').slice(2)
  const [, league, resource, id, last] = parts
  if (!league) return mock.getLeagues()
  if (resource === 'seasons') return mock.getSeasons(league)
  if (resource === 'ui-defaults') return mock.getUiDefaults(league)
  const kind = searchParams.get('kind') as 'players' | 'teams'
  if (resource === 'stat-defs') return mock.getStatDefs(league, kind)
  if (resource === 'entities') return mock.getEntities(league, kind, season)
  if (resource === 'roster-units') return mock.getRosterUnits(league)
  if (last === 'game-log') return mock.getGameLog(league, id, season)
  if (last === 'roster') {
    return mock.getRoster(league, id, searchParams.get('unit') ?? '', season)
  }
  throw new Error(`No answer for ${pathname}`)
}

type Server = (url: string) => Promise<Response>

const working: Server = async (url) => new Response(JSON.stringify(await body(url)))
const down: Server = () => Promise.reject(new TypeError('Failed to fetch'))

/** Loads the app afresh with the API as its data source. */
async function openApp(server: Server) {
  vi.resetModules()
  vi.stubEnv('VITE_DATA_SOURCE', 'api')
  const fetcher = vi.fn(server)
  vi.stubGlobal('fetch', fetcher)
  const { default: App } = await import('./App')
  render(<App />)
  return fetcher
}

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

describe('the app on the API', () => {
  it('shows progress, then the app with the source of the data', async () => {
    const fetcher = await openApp(working)
    expect(screen.getByText(/Loading data…/)).toBeInTheDocument()
    expect(await screen.findByRole('list', { name: 'Selected players' })).toBeInTheDocument()
    expect(screen.getByText(/Data from nflverse/)).toBeInTheDocument()
    expect(screen.queryByText(/Sample data/)).toBeNull()
    expect(fetcher).toHaveBeenCalledWith('/api/leagues/nfl/ui-defaults')
  })

  const toggle = () => screen.getByRole('checkbox', { name: 'Include playoffs' })
  const asked = (fetcher: Awaited<ReturnType<typeof openApp>>, part: string) =>
    fetcher.mock.calls.map(([url]) => url).filter((url) => url.includes(part))

  it('includes playoffs until they are switched off, everywhere data is asked for', async () => {
    const user = userEvent.setup()
    const fetcher = await openApp(working)
    await screen.findByRole('list', { name: 'Selected players' })
    expect(toggle()).toBeChecked()
    expect(screen.getByText(/Playoff games are included\./)).toBeInTheDocument()
    expect(asked(fetcher, 'playoffs=')).toEqual([])

    await user.click(toggle())
    expect(toggle()).not.toBeChecked()
    expect(screen.getByText(/Playoff games are not included\./)).toBeInTheDocument()
    await vi.waitFor(() =>
      expect(asked(fetcher, 'kind=players&season=2024&playoffs=false')).toHaveLength(1),
    )

    const view = screen.getByRole('group', { name: 'Player view' })
    await user.click(within(view).getByRole('button', { name: 'Week to week' }))
    await screen.findByRole('group', { name: 'Weekly dot graph' })
    expect(asked(fetcher, 'game-log').every((url) => url.endsWith('playoffs=false'))).toBe(true)

    const kind = screen.getByRole('group', { name: 'Players or teams' })
    await user.click(within(kind).getByRole('button', { name: 'Teams' }))
    const teamView = screen.getByRole('group', { name: 'Team view' })
    await user.click(within(teamView).getByRole('button', { name: 'Team breakdown' }))
    await screen.findByRole('table', { name: 'Roster' })
    expect(asked(fetcher, '/roster?')).toEqual([
      expect.stringContaining('season=2024&playoffs=false'),
    ])
    expect(await seriousViolations(document.body)).toEqual([])
  })

  it('shows a retry instead of a blank page when the server cannot be reached', async () => {
    const user = userEvent.setup()
    let up = false
    await openApp((url) => (up ? working(url) : down(url)))
    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('The data server could not be reached.')
    expect(await seriousViolations(document.body)).toEqual([])
    up = true
    await user.click(within(alert).getByRole('button', { name: 'Retry' }))
    expect(await screen.findByRole('list', { name: 'Selected players' })).toBeInTheDocument()
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('offers a retry when a later request fails and reloads what was missing', async () => {
    const user = userEvent.setup()
    let broken = true
    await openApp((url) =>
      broken && url.includes('game-log')
        ? Promise.resolve(new Response('{}', { status: 503 }))
        : working(url),
    )
    await screen.findByRole('list', { name: 'Selected players' })
    const view = screen.getByRole('group', { name: 'Player view' })
    await user.click(within(view).getByRole('button', { name: 'Week to week' }))
    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('The data server answered 503.')
    broken = false
    await user.click(within(alert).getByRole('button', { name: 'Retry' }))
    expect(await screen.findByRole('group', { name: 'Weekly dot graph' })).toBeInTheDocument()
    expect(screen.queryByRole('alert')).toBeNull()
  })
})
