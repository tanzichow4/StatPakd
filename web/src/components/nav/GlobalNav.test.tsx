import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { DataSource } from '../../dataSource'
import type { DataProvider } from '../../domain/provider'
import type { League } from '../../domain/types'
import { useAppState } from '../../state'
import { AppStateProvider } from '../../state/AppStateProvider'
import {
  createFixtureProvider,
  deferred,
  fixtureLeagues,
  fixtureSeasons,
  fixtureStatDefs,
  fixtureUiDefaults,
} from '../../test/fixtureProvider'
import { GlobalNav } from './GlobalNav'

function StateProbe() {
  const { state, dispatch } = useAppState()
  const { kind, season, q, pos, addOpen, sel, stats } = state
  return (
    <div>
      <output data-testid="state">
        {JSON.stringify({ kind, season, q, pos, addOpen, sel, stats })}
      </output>
      <button
        type="button"
        onClick={() => {
          dispatch({ type: 'toggleAdd' })
          dispatch({ type: 'setQuery', q: 'abc' })
          dispatch({ type: 'setPos', pos: 'X' })
        }}
      >
        seed
      </button>
    </div>
  )
}

function tree(provider: DataProvider) {
  return (
    <DataSource provider={provider}>
      <AppStateProvider defaults={fixtureUiDefaults()} statDefs={fixtureStatDefs()}>
        <GlobalNav />
        <StateProbe />
      </AppStateProvider>
    </DataSource>
  )
}

function setup(provider: DataProvider = createFixtureProvider()) {
  const view = render(tree(provider))
  return { provider, ...view }
}

const readState = () => JSON.parse(screen.getByTestId('state').textContent ?? '{}')
const leaguesNav = () => screen.getByRole('navigation', { name: 'Leagues' })
const seasonSelect = () => screen.getByRole('combobox', { name: 'Season' })
const optionValues = () =>
  within(seasonSelect())
    .queryAllByRole('option')
    .map((o) => (o as HTMLOptionElement).value)
const leagueButtons = () => within(leaguesNav()).queryAllByRole('button')
const leagueNames = () =>
  leagueButtons().map((b) => (b.textContent ?? '').replace(/SOON$/, '').trim())
const flush = () => act(async () => {})

describe('AC3: nav without a provider', () => {
  it('AC3: rendering the nav outside <DataSource> throws a clear error', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    try {
      expect(() =>
        render(
          <AppStateProvider defaults={fixtureUiDefaults()} statDefs={fixtureStatDefs()}>
            <GlobalNav />
          </AppStateProvider>,
        ),
      ).toThrow(/useDataProvider must be used inside <DataSource>/)
    } finally {
      spy.mockRestore()
    }
  })
})

describe('AC5: logo', () => {
  it('AC5: shows Stat and Pakd with accessible text StatPakd, not as a heading', async () => {
    setup()
    await screen.findByRole('button', { name: 'Zorbball' })
    expect(screen.getByText('Stat')).toBeInTheDocument()
    expect(screen.getByText('Pakd')).toBeInTheDocument()
    expect(screen.getByText('StatPakd')).toBeInTheDocument()
    expect(screen.queryAllByRole('heading')).toHaveLength(0)
  })
  it('AC5: the bar is a banner landmark containing the logo', async () => {
    setup()
    await flush()
    expect(within(screen.getByRole('banner')).getByText('StatPakd')).toBeInTheDocument()
  })
})

describe('AC6: league items', () => {
  it('AC6: one button per league, in provider order, labelled with the name', async () => {
    setup()
    await screen.findByRole('button', { name: 'Zorbball' })
    expect(leagueNames()).toEqual(fixtureLeagues.map((l) => l.name))
  })
  it('AC6: leagues sit in a navigation landmark named Leagues', async () => {
    setup()
    await screen.findByRole('button', { name: 'Zorbball' })
    expect(leaguesNav()).toBeInTheDocument()
  })
  it('AC6: follows a different provider order and names', async () => {
    const leagues: League[] = [
      { id: 'b1', name: 'Bravoball', enabled: false },
      { id: 'a1', name: 'Alphaball', enabled: true },
    ]
    setup(createFixtureProvider({ getLeagues: vi.fn(() => Promise.resolve(leagues)) }))
    await screen.findByRole('button', { name: 'Alphaball' })
    expect(leagueNames()).toEqual(['Bravoball', 'Alphaball'])
  })
  it('AC6: an empty league list renders the nav with no items', async () => {
    setup(createFixtureProvider({ getLeagues: vi.fn(() => Promise.resolve([])) }))
    await flush()
    expect(leagueButtons()).toHaveLength(0)
    expect(optionValues()).toEqual([])
  })
})

describe('AC7: enabled league', () => {
  it('AC7: the first enabled league is current and has no SOON tag', async () => {
    setup()
    const zorb = await screen.findByRole('button', { name: 'Zorbball' })
    expect(zorb).toHaveAttribute('aria-current', 'page')
    expect(zorb).not.toHaveTextContent('SOON')
    expect(zorb).toBeEnabled()
  })
  it('AC7: the active league is the first enabled one, even when it is not first in the list', async () => {
    const leagues: League[] = [
      { id: 'b1', name: 'Bravoball', enabled: false },
      { id: 'a1', name: 'Alphaball', enabled: true },
      { id: 'c1', name: 'Charlieball', enabled: true },
    ]
    setup(createFixtureProvider({ getLeagues: vi.fn(() => Promise.resolve(leagues)) }))
    const alpha = await screen.findByRole('button', { name: 'Alphaball' })
    expect(alpha).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('button', { name: 'Charlieball' })).not.toHaveAttribute('aria-current')
    expect(screen.getByRole('button', { name: /Bravoball/ })).not.toHaveAttribute('aria-current')
  })
})

describe('AC8: disabled leagues', () => {
  it('AC8: disabled leagues are disabled, show SOON and are never current', async () => {
    setup()
    await screen.findByRole('button', { name: 'Zorbball' })
    const [, quix, flarn] = leagueButtons()
    expect(quix).toBeDisabled()
    expect(flarn).toBeDisabled()
    expect(quix).toHaveTextContent('SOON')
    expect(flarn).toHaveTextContent('SOON')
    expect(quix).not.toHaveAttribute('aria-current')
    expect(flarn).not.toHaveAttribute('aria-current')
  })
  it('AC8: clicking or pressing Enter/Space on a disabled league changes nothing', async () => {
    const user = userEvent.setup()
    setup()
    await screen.findByRole('button', { name: 'Zorbball' })
    const before = readState()
    const quix = leagueButtons()[1]
    await user.click(quix)
    quix.focus()
    await user.keyboard('{Enter}')
    await user.keyboard(' ')
    expect(readState()).toEqual(before)
    expect(quix).not.toHaveAttribute('aria-current')
    expect(leagueButtons()[0]).toHaveAttribute('aria-current', 'page')
  })
  it('AC8: no SOON text appears when every league is enabled', async () => {
    const leagues: League[] = [{ id: 'a1', name: 'Alphaball', enabled: true }]
    setup(createFixtureProvider({ getLeagues: vi.fn(() => Promise.resolve(leagues)) }))
    await screen.findByRole('button', { name: 'Alphaball' })
    expect(screen.queryByText('SOON')).not.toBeInTheDocument()
  })
})

describe('AC9: loading and failing leagues', () => {
  it('AC9: while getLeagues is pending the logo and kind control still render', async () => {
    const d = deferred<League[]>()
    setup(createFixtureProvider({ getLeagues: vi.fn(() => d.promise) }))
    expect(screen.getByText('StatPakd')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Players' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Teams' })).toBeInTheDocument()
    expect(leagueButtons()).toHaveLength(0)
    await act(async () => d.resolve(fixtureLeagues))
    expect(leagueButtons()).toHaveLength(fixtureLeagues.length)
  })
  it('AC9: when getLeagues rejects there are no league items and the kind control works', async () => {
    const user = userEvent.setup()
    const d = deferred<League[]>()
    setup(createFixtureProvider({ getLeagues: vi.fn(() => d.promise) }))
    await act(async () => d.reject(new Error('boom')))
    expect(leagueButtons()).toHaveLength(0)
    expect(optionValues()).toEqual([])
    await user.click(screen.getByRole('button', { name: 'Teams' }))
    expect(readState().kind).toBe('teams')
  })
})

describe('AC10: kind control', () => {
  it('AC10: Players is pressed initially and the group has a label', async () => {
    setup()
    await flush()
    expect(screen.getByRole('button', { name: 'Players' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Teams' })).toHaveAttribute('aria-pressed', 'false')
    expect(screen.getByRole('group', { name: 'Players or teams' })).toBeInTheDocument()
  })
})

describe('AC11: changing kind', () => {
  it('AC11: Teams sets kind and resets q, pos and addOpen; Players reverses the kind', async () => {
    const user = userEvent.setup()
    setup()
    await flush()
    await user.click(screen.getByRole('button', { name: 'seed' }))
    expect(readState()).toMatchObject({ kind: 'players', q: 'abc', pos: 'X', addOpen: true })

    await user.click(screen.getByRole('button', { name: 'Teams' }))
    expect(readState()).toMatchObject({ kind: 'teams', q: '', pos: 'All', addOpen: false })
    expect(screen.getByRole('button', { name: 'Teams' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Players' })).toHaveAttribute('aria-pressed', 'false')

    await user.click(screen.getByRole('button', { name: 'seed' }))
    expect(readState()).toMatchObject({ kind: 'teams', q: 'abc', pos: 'X', addOpen: true })
    await user.click(screen.getByRole('button', { name: 'Players' }))
    expect(readState()).toMatchObject({ kind: 'players', q: '', pos: 'All', addOpen: false })
    expect(screen.getByRole('button', { name: 'Players' })).toHaveAttribute('aria-pressed', 'true')
  })
  it('AC11: clicking the already active kind keeps it and still resets the filters', async () => {
    const user = userEvent.setup()
    setup()
    await flush()
    await user.click(screen.getByRole('button', { name: 'seed' }))
    await user.click(screen.getByRole('button', { name: 'Players' }))
    expect(readState()).toMatchObject({ kind: 'players', q: '', pos: 'All', addOpen: false })
  })
})

describe('AC12: seasons', () => {
  it('AC12: getSeasons is called with the active league id', async () => {
    const { provider } = setup()
    await waitFor(() => expect(provider.getSeasons).toHaveBeenCalledWith('zorb'))
    expect(provider.getSeasons).not.toHaveBeenCalledWith('quix')
    expect(provider.getSeasons).not.toHaveBeenCalledWith('flarn')
  })
  it('AC12: the id comes from the first enabled league, not the first league', async () => {
    const leagues: League[] = [
      { id: 'off1', name: 'Offball', enabled: false },
      { id: 'on1', name: 'Onball', enabled: true },
    ]
    const { provider } = setup(
      createFixtureProvider({ getLeagues: vi.fn(() => Promise.resolve(leagues)) }),
    )
    await waitFor(() => expect(provider.getSeasons).toHaveBeenCalledWith('on1'))
    expect(provider.getSeasons).not.toHaveBeenCalledWith('off1')
  })
  it('AC12: options show "<season> Season" with the season as value, in order', async () => {
    setup()
    await waitFor(() => expect(optionValues()).toEqual(fixtureSeasons))
    const labels = within(seasonSelect())
      .getAllByRole('option')
      .map((o) => o.textContent)
    expect(labels).toEqual(fixtureSeasons.map((s) => `${s} Season`))
  })
})

describe('AC13: choosing a season', () => {
  it('AC13: the select shows state.season', async () => {
    setup()
    await waitFor(() => expect(optionValues()).toHaveLength(fixtureSeasons.length))
    expect(seasonSelect()).toHaveValue('3031')
  })
  it('AC13: choosing another season updates state.season and nothing else', async () => {
    const user = userEvent.setup()
    setup()
    await waitFor(() => expect(optionValues()).toHaveLength(fixtureSeasons.length))
    const before = readState()
    await user.selectOptions(seasonSelect(), '3030')
    const after = readState()
    expect(after.season).toBe('3030')
    expect(seasonSelect()).toHaveValue('3030')
    expect(after.kind).toEqual(before.kind)
    expect(after.sel).toEqual(before.sel)
    expect(after.stats).toEqual(before.stats)
  })
  it('AC13: a season change keeps a chosen kind', async () => {
    const user = userEvent.setup()
    setup()
    await waitFor(() => expect(optionValues()).toHaveLength(fixtureSeasons.length))
    await user.click(screen.getByRole('button', { name: 'Teams' }))
    await user.selectOptions(seasonSelect(), '3029')
    expect(readState()).toMatchObject({ kind: 'teams', season: '3029' })
  })
})

describe('AC14: season select name and failures', () => {
  it('AC14: the select is a combobox named Season', async () => {
    setup()
    await flush()
    expect(seasonSelect()).toBeInTheDocument()
  })
  it('AC14: while seasons are loading the select is empty and nothing crashes', async () => {
    const d = deferred<string[]>()
    setup(createFixtureProvider({ getSeasons: vi.fn(() => d.promise) }))
    await screen.findByRole('button', { name: 'Zorbball' })
    expect(optionValues()).toEqual([])
    await act(async () => d.resolve(fixtureSeasons))
    expect(optionValues()).toEqual(fixtureSeasons)
  })
  it('AC14: when getSeasons rejects there are no options and the leagues still show', async () => {
    const d = deferred<string[]>()
    const { provider } = setup(createFixtureProvider({ getSeasons: vi.fn(() => d.promise) }))
    await screen.findByRole('button', { name: 'Zorbball' })
    await waitFor(() => expect(provider.getSeasons).toHaveBeenCalled())
    await act(async () => d.reject(new Error('boom')))
    expect(optionValues()).toEqual([])
    expect(leagueButtons()).toHaveLength(fixtureLeagues.length)
  })
  it('AC14: with no enabled league there are no options and getSeasons is not called', async () => {
    const leagues: League[] = [{ id: 'off1', name: 'Offball', enabled: false }]
    const { provider } = setup(
      createFixtureProvider({ getLeagues: vi.fn(() => Promise.resolve(leagues)) }),
    )
    await screen.findByRole('button', { name: /Offball/ })
    await flush()
    expect(optionValues()).toEqual([])
    expect(provider.getSeasons).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: /Offball/ })).not.toHaveAttribute('aria-current')
  })
  it('AC14: an empty season list gives an empty select', async () => {
    setup(createFixtureProvider({ getSeasons: vi.fn(() => Promise.resolve([])) }))
    await screen.findByRole('button', { name: 'Zorbball' })
    await flush()
    expect(optionValues()).toEqual([])
  })
})

describe('AC17: keyboard order', () => {
  it('AC17: Tab goes league, Players, Teams, Season and never lands on a disabled league', async () => {
    const user = userEvent.setup()
    setup()
    await screen.findByRole('button', { name: 'Zorbball' })
    const visited: string[] = []
    for (let i = 0; i < 4; i += 1) {
      await user.tab()
      const el = document.activeElement as HTMLElement
      visited.push(el.tagName === 'SELECT' ? 'select' : (el.textContent ?? ''))
    }
    expect(visited).toEqual(['Zorbball', 'Players', 'Teams', 'select'])
  })
})

describe('AC18: loading from a fixture provider', () => {
  it('AC18: leagues and seasons come from the fixture provider only', async () => {
    const { provider } = setup()
    await waitFor(() => expect(optionValues()).toEqual(fixtureSeasons))
    expect(provider.getLeagues).toHaveBeenCalled()
    expect(screen.queryByText('NFL')).not.toBeInTheDocument()
    expect(screen.queryByText(/2024/)).not.toBeInTheDocument()
  })
})

describe('AC21: late results are ignored', () => {
  it('AC21: unmounting before getLeagues resolves causes no error and no getSeasons call', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    try {
      const d = deferred<League[]>()
      const { provider, unmount } = setup(
        createFixtureProvider({ getLeagues: vi.fn(() => d.promise) }),
      )
      unmount()
      await act(async () => d.resolve(fixtureLeagues))
      expect(provider.getSeasons).not.toHaveBeenCalled()
      expect(spy).not.toHaveBeenCalled()
    } finally {
      spy.mockRestore()
    }
  })
  it('AC21: unmounting before getSeasons resolves causes no error', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    try {
      const d = deferred<string[]>()
      const { provider, unmount } = setup(
        createFixtureProvider({ getSeasons: vi.fn(() => d.promise) }),
      )
      await waitFor(() => expect(provider.getSeasons).toHaveBeenCalled())
      unmount()
      await act(async () => d.resolve(fixtureSeasons))
      expect(spy).not.toHaveBeenCalled()
    } finally {
      spy.mockRestore()
    }
  })
  it('AC21: unmounting before a rejection causes no error', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    try {
      const d = deferred<League[]>()
      const { unmount } = setup(createFixtureProvider({ getLeagues: vi.fn(() => d.promise) }))
      unmount()
      await act(async () => d.reject(new Error('late')))
      expect(spy).not.toHaveBeenCalled()
    } finally {
      spy.mockRestore()
    }
  })
})
