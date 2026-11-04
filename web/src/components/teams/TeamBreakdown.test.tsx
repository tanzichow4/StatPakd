import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { DataSource } from '../../dataSource'
import type { DataProvider } from '../../domain/provider'
import type { Entity, EntityKind, LeagueUiDefaults, Season } from '../../domain/types'
import { useAppState } from '../../state'
import { AppStateProvider } from '../../state/AppStateProvider'
import type { AppAction } from '../../state/appState'
import {
  createFixtureProvider,
  deferred,
  fixtureStatDefs,
  fixtureTeamSummaryStatDefs,
  fixtureUiDefaults,
  seasonTeamsProvider,
} from '../../test/fixtureProvider'
import { TeamBreakdown } from './TeamBreakdown'

function Probe({ always }: { always: boolean }) {
  const { state, dispatch } = useAppState()
  const send = (a: AppAction) => () => dispatch(a)
  const show = always || (state.kind === 'teams' && state.teamMode === 'inside')
  return (
    <div>
      <output data-testid="state">
        {JSON.stringify({
          kind: state.kind,
          teamMode: state.teamMode,
          teamId: state.teamId,
          season: state.season,
          addStatOpen: state.addStatOpen,
        })}
      </output>
      <button type="button" onClick={send({ type: 'setKind', kind: 'teams' })}>
        probe teams
      </button>
      <button type="button" onClick={send({ type: 'setKind', kind: 'players' })}>
        probe players
      </button>
      <button type="button" onClick={send({ type: 'setTeamMode', mode: 'inside' })}>
        probe inside
      </button>
      <button type="button" onClick={send({ type: 'setTeamMode', mode: 'compare' })}>
        probe compare
      </button>
      <button type="button" onClick={send({ type: 'toggleAddStatMenu', group: 'zgroup' })}>
        probe menu
      </button>
      <button type="button" onClick={send({ type: 'setSeason', season: '3030' })}>
        probe season 3030
      </button>
      {show && <TeamBreakdown />}
    </div>
  )
}

interface Options {
  provider?: DataProvider
  defaults?: LeagueUiDefaults
  always?: boolean
}

function setup({ provider = seasonTeamsProvider(), defaults, always = true }: Options = {}) {
  const user = userEvent.setup()
  const d = defaults ?? fixtureUiDefaults()
  const view = render(
    <DataSource provider={provider}>
      <AppStateProvider defaults={d} statDefs={fixtureStatDefs()}>
        <Probe always={always} />
      </AppStateProvider>
    </DataSource>,
  )
  return { user, provider, ...view }
}

const readState = () => JSON.parse(screen.getByTestId('state').textContent ?? '{}')
const probe = (name: string) => screen.getByRole('button', { name: `probe ${name}` })
const chipGroup = () => screen.queryByRole('group', { name: 'Teams' })
const chipNames = () =>
  within(screen.getByRole('group', { name: 'Teams' }))
    .getAllByRole('button')
    .map((b) => b.textContent)
const pressed = () =>
  within(screen.getByRole('group', { name: 'Teams' }))
    .queryAllByRole('button', { pressed: true })
    .map((b) => b.textContent)
const card = () => screen.queryByRole('region')
const terms = () => screen.getAllByRole('term').map((t) => t.textContent)
const values = () => screen.getAllByRole('definition').map((d) => d.textContent)

describe('AC7/AC11/AC12/AC15: chips then the card', () => {
  it('AC11: renders a chip per team in provider order', async () => {
    setup()
    expect(await screen.findByRole('group', { name: 'Teams' })).toBeInTheDocument()
    expect(chipNames()).toEqual(['ZQA', 'ZQB'])
  })
  it('AC12: the chip for state.teamId is the only one pressed', async () => {
    setup()
    await screen.findByRole('group', { name: 'Teams' })
    expect(pressed()).toEqual(['ZQA'])
  })
  it('AC7: the chips come first, then the card, then nothing else', async () => {
    const { container } = setup()
    const group = await screen.findByRole('group', { name: 'Teams' })
    const section = await screen.findByRole('region', { name: 'Zephyr Flarns' })
    expect(group.compareDocumentPosition(section) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(section.nextElementSibling).toBeNull()
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
    expect(screen.queryByText(/coming soon/i)).not.toBeInTheDocument()
    expect(container.querySelectorAll('section')).toHaveLength(1)
  })
  it('AC15: the card shows the name and "meta · season" for the chosen team', async () => {
    setup()
    expect(await screen.findByRole('heading', { level: 2, name: 'Zephyr Flarns' })).toBeVisible()
    expect(screen.getByText('31-32 record · 3031')).toBeInTheDocument()
  })
  it('AC16/AC17: summary stats show in definition order, formatted', async () => {
    setup()
    await screen.findByRole('region', { name: 'Zephyr Flarns' })
    await waitFor(() => expect(terms()).toEqual(['Zavg / G', 'Zdiff']))
    expect(values()).toEqual(['31.3', '+31'])
  })
  it('AC17: a null value and a missing key both show a dash', async () => {
    const { user } = setup()
    await screen.findByRole('group', { name: 'Teams' })
    await user.click(screen.getByRole('button', { name: 'ZQB' }))
    await screen.findByRole('region', { name: 'Quark Boulders' })
    await waitFor(() => expect(values()).toEqual(['—', '—']))
  })
  it('AC16: non-summary defs are not shown on the card', async () => {
    setup()
    await screen.findByRole('region', { name: 'Zephyr Flarns' })
    await waitFor(() => expect(terms()).toHaveLength(2))
    expect(screen.queryByText('Ztpts')).not.toBeInTheDocument()
    expect(screen.queryByText('Ztblk')).not.toBeInTheDocument()
  })
  it('AC16: with defs still pending the card shows without a stats list', async () => {
    const defs = deferred<ReturnType<typeof fixtureTeamSummaryStatDefs>>()
    const provider = seasonTeamsProvider({ getStatDefs: vi.fn(() => defs.promise) })
    const { container } = setup({ provider })
    await screen.findByRole('region', { name: 'Zephyr Flarns' })
    expect(container.querySelector('dl')).toBeNull()
    await act(async () => defs.resolve(fixtureTeamSummaryStatDefs()))
    await waitFor(() => expect(terms()).toEqual(['Zavg / G', 'Zdiff']))
  })
})

describe('AC13: selecting a chip', () => {
  it('AC13: clicking another chip moves the active chip, teamId and the card', async () => {
    const { user } = setup()
    await screen.findByRole('group', { name: 'Teams' })
    await user.click(screen.getByRole('button', { name: 'ZQB' }))
    expect(readState().teamId).toBe('zt2')
    expect(pressed()).toEqual(['ZQB'])
    expect(screen.getByRole('heading', { level: 2, name: 'Quark Boulders' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { level: 2, name: 'Zephyr Flarns' })).toBeNull()
    expect(screen.getByText('33-34 record · 3031')).toBeInTheDocument()
  })
  it('AC13: clicking the active chip changes nothing', async () => {
    const { user } = setup()
    await screen.findByRole('group', { name: 'Teams' })
    await user.click(screen.getByRole('button', { name: 'ZQA' }))
    expect(readState().teamId).toBe('zt1')
    expect(pressed()).toEqual(['ZQA'])
    expect(card()).toHaveAccessibleName('Zephyr Flarns')
  })
})

describe('AC14/AC23: loading and failure', () => {
  it('AC14: while entities are pending nothing renders', async () => {
    const pending = deferred<Entity[]>()
    const provider = seasonTeamsProvider({ getEntities: vi.fn(() => pending.promise) })
    setup({ provider })
    await act(async () => {})
    expect(chipGroup()).toBeNull()
    expect(card()).toBeNull()
  })
  it('AC14: a rejected load renders nothing and does not throw', async () => {
    const getEntities = vi.fn(() => Promise.reject(new Error('boom')))
    setup({ provider: seasonTeamsProvider({ getEntities }) })
    await waitFor(() => expect(getEntities).toHaveBeenCalled())
    await act(async () => {})
    expect(chipGroup()).toBeNull()
    expect(card()).toBeNull()
  })
  it('AC14: an empty team list renders nothing', async () => {
    const getEntities = vi.fn(() => Promise.resolve([]))
    setup({ provider: createFixtureProvider({ getEntities }) })
    await waitFor(() => expect(getEntities).toHaveBeenCalled())
    await act(async () => {})
    expect(chipGroup()).toBeNull()
    expect(card()).toBeNull()
  })
  it('AC14: only team entities are requested, and no roster', async () => {
    const provider = seasonTeamsProvider()
    setup({ provider })
    await screen.findByRole('group', { name: 'Teams' })
    expect(provider.getEntities).toHaveBeenCalledWith(expect.anything(), 'teams', '3031')
    expect(provider.getRoster).not.toHaveBeenCalled()
  })
})

describe('AC18/AC23: season changes', () => {
  it('AC18: a season change keeps the team and shows the new season data', async () => {
    const { user } = setup()
    await screen.findByRole('region', { name: 'Zephyr Flarns' })
    await user.click(probe('season 3030'))
    await waitFor(() => expect(screen.getByText('30-31 record · 3030')).toBeInTheDocument())
    expect(pressed()).toEqual(['ZQA'])
    expect(readState().teamId).toBe('zt1')
    await waitFor(() => expect(values()).toEqual(['30.3', '+30']))
    expect(screen.queryByText('31-32 record · 3031')).not.toBeInTheDocument()
  })
  it('AC23: in the gap before the new season loads nothing is shown, not the old card', async () => {
    const base = seasonTeamsProvider()
    const gap = deferred<void>()
    const getEntities = vi.fn(async (l: string, k: EntityKind, s: Season) => {
      if (s === '3030') await gap.promise
      return base.getEntities(l, k, s)
    })
    const { user } = setup({ provider: seasonTeamsProvider({ getEntities }) })
    await screen.findByRole('region', { name: 'Zephyr Flarns' })
    await user.click(probe('season 3030'))
    await waitFor(() => expect(chipGroup()).toBeNull())
    expect(card()).toBeNull()
    expect(screen.queryByText(/record · 3030/)).not.toBeInTheDocument()
    expect(screen.queryByText(/31-32 record/)).not.toBeInTheDocument()
    await act(async () => gap.resolve())
    expect(await screen.findByText('30-31 record · 3030')).toBeInTheDocument()
  })
  it('AC18: a late answer for the old season does not overwrite the new season', async () => {
    const base = seasonTeamsProvider()
    const old = deferred<void>()
    const getEntities = vi.fn(async (l: string, k: EntityKind, s: Season) => {
      if (s === '3031') await old.promise
      return base.getEntities(l, k, s)
    })
    const { user } = setup({ provider: seasonTeamsProvider({ getEntities }) })
    await user.click(probe('season 3030'))
    expect(await screen.findByText('30-31 record · 3030')).toBeInTheDocument()
    await act(async () => old.resolve())
    expect(screen.getByText('30-31 record · 3030')).toBeInTheDocument()
    expect(screen.queryByText(/3031/)).not.toBeInTheDocument()
  })
})

describe('AC19: an unknown teamId', () => {
  function unknown(): LeagueUiDefaults {
    return { ...fixtureUiDefaults(), teamId: 'nobody' }
  }
  it('AC19: no chip is pressed, no card shows, and teamId is not changed', async () => {
    setup({ defaults: unknown() })
    await screen.findByRole('group', { name: 'Teams' })
    expect(chipNames()).toEqual(['ZQA', 'ZQB'])
    expect(pressed()).toEqual([])
    expect(card()).toBeNull()
    await act(async () => {})
    expect(readState().teamId).toBe('nobody')
  })
  it('AC19: clicking a chip then shows that team card', async () => {
    const { user } = setup({ defaults: unknown() })
    await screen.findByRole('group', { name: 'Teams' })
    await user.click(screen.getByRole('button', { name: 'ZQB' }))
    expect(readState().teamId).toBe('zt2')
    expect(await screen.findByRole('region', { name: 'Quark Boulders' })).toBeInTheDocument()
    expect(pressed()).toEqual(['ZQB'])
  })
})

describe('AC9: no add-stat menu is open once breakdown shows', () => {
  it('AC9: path (a) menu open in Teams compare, then switch to breakdown', async () => {
    const { user } = setup({ always: false })
    await user.click(probe('teams'))
    await user.click(probe('menu'))
    expect(readState().addStatOpen).toBe('zgroup')
    await user.click(probe('inside'))
    await screen.findByRole('group', { name: 'Teams' })
    expect(readState().addStatOpen).toBeNull()
    await user.click(probe('compare'))
    expect(readState()).toMatchObject({ teamMode: 'compare', addStatOpen: null })
  })
  it('AC9: path (b) menu open in Players, then kind to Teams while inside', async () => {
    const { user } = setup({ always: false })
    await user.click(probe('inside'))
    expect(readState()).toMatchObject({ kind: 'players', teamMode: 'inside' })
    await user.click(probe('menu'))
    expect(readState().addStatOpen).toBe('zgroup')
    await user.click(probe('teams'))
    await screen.findByRole('group', { name: 'Teams' })
    expect(readState().addStatOpen).toBeNull()
    await user.click(probe('compare'))
    expect(readState()).toMatchObject({ kind: 'teams', teamMode: 'compare', addStatOpen: null })
  })
  it('AC9: mounting with no menu open leaves the state null', async () => {
    setup()
    await screen.findByRole('group', { name: 'Teams' })
    expect(readState().addStatOpen).toBeNull()
  })
})
