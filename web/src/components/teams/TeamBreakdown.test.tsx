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
  rosterProvider,
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
          unit: state.unit,
          tSort: state.tSort,
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
      <button type="button" onClick={send({ type: 'setUnit', unit: 'zalt' })}>
        probe unit zalt
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
const SHARE_TITLE = 'Share of team production'
// The team header card: the one region that is not the share section.
const card = () =>
  screen.queryAllByRole('region', {
    name: (n) => n !== SHARE_TITLE && n !== 'Roster' && n !== 'Roster table',
  })[0] ?? null
const shareSection = () => screen.queryByRole('region', { name: SHARE_TITLE })
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
  it('AC7: the chips come first, then the card, the share section and the Roster section', async () => {
    const { container } = setup({ provider: rosterProvider() })
    const group = await screen.findByRole('group', { name: 'Teams' })
    const section = await screen.findByRole('region', { name: 'Zephyr Flarns' })
    expect(group.compareDocumentPosition(section) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    const share = await screen.findByRole('region', { name: SHARE_TITLE })
    expect(section.nextElementSibling).toBe(share)
    const roster = await screen.findByRole('region', { name: 'Roster' })
    expect(share.nextElementSibling).toBe(roster)
    expect(roster.nextElementSibling).toBeNull()
    expect(screen.getAllByRole('table')).toHaveLength(1)
    expect(screen.getByRole('table')).toHaveAccessibleName('Roster')
    expect(screen.queryByText(/coming soon/i)).not.toBeInTheDocument()
    expect(container.querySelectorAll('section')).toHaveLength(3)
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
  it('AC14: only team entities are requested for the chips and card', async () => {
    const provider = seasonTeamsProvider()
    setup({ provider })
    await screen.findByRole('group', { name: 'Teams' })
    expect(provider.getEntities).toHaveBeenCalledWith(expect.anything(), 'teams', '3031')
    expect(provider.getEntities).not.toHaveBeenCalledWith(expect.anything(), 'players', '3031')
  })
  it('AC26: getRoster is called with the team, unit and season, and never for players', async () => {
    const provider = rosterProvider()
    setup({ provider })
    await screen.findByRole('group', { name: 'Zalpha share share' })
    expect(provider.getRoster).toHaveBeenCalledWith('zorb', 'zt1', 'zunit', '3031')
    expect(provider.getRoster).toHaveBeenCalledTimes(1)
  })
  it('AC9: with no roster units the card still shows and no roster is requested', async () => {
    const provider = seasonTeamsProvider()
    setup({ provider })
    await screen.findByRole('region', { name: 'Zephyr Flarns' })
    await act(async () => {})
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

describe('AC9/AC12/AC26: the share section below the card', () => {
  it('AC9: the section shows its heading, subtitle and toggle after the card', async () => {
    setup({ provider: rosterProvider() })
    const share = await screen.findByRole('region', { name: SHARE_TITLE })
    expect(within(share).getByRole('heading', { level: 2 })).toHaveTextContent(SHARE_TITLE)
    expect(within(share).getByText('How the workload splits across the roster')).toBeInTheDocument()
    expect(within(share).getByRole('group', { name: 'Unit' })).toBeInTheDocument()
    const cardEl = screen.getByRole('region', { name: 'Zephyr Flarns' })
    expect(cardEl.compareDocumentPosition(share) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })
  it('AC9: it is not rendered in compare mode or Players mode', async () => {
    const { user } = setup({ provider: rosterProvider(), always: false })
    await user.click(probe('teams'))
    await user.click(probe('inside'))
    await screen.findByRole('region', { name: SHARE_TITLE })
    await user.click(probe('compare'))
    expect(shareSection()).toBeNull()
    await user.click(probe('inside'))
    await screen.findByRole('region', { name: SHARE_TITLE })
    await user.click(probe('players'))
    expect(shareSection()).toBeNull()
  })
  it('AC9: not rendered while teams are pending', async () => {
    const pending = deferred<Entity[]>()
    const provider = rosterProvider({ getEntities: vi.fn(() => pending.promise) })
    setup({ provider })
    await act(async () => {})
    expect(shareSection()).toBeNull()
    expect(screen.queryByRole('heading', { name: SHARE_TITLE })).toBeNull()
  })
  it('AC9: not rendered when the teams load fails', async () => {
    const getEntities = vi.fn(() => Promise.reject(new Error('boom')))
    setup({ provider: rosterProvider({ getEntities }) })
    await waitFor(() => expect(getEntities).toHaveBeenCalled())
    await act(async () => {})
    expect(shareSection()).toBeNull()
  })
  it('AC9: not rendered for an unknown teamId, and no roster is requested', async () => {
    const provider = rosterProvider()
    setup({ provider, defaults: { ...fixtureUiDefaults(), teamId: 'nobody' } })
    await screen.findByRole('group', { name: 'Teams' })
    await act(async () => {})
    expect(shareSection()).toBeNull()
    expect(provider.getRoster).not.toHaveBeenCalled()
  })
  it('AC9: clicking a chip for an unknown teamId then shows the section', async () => {
    const { user } = setup({
      provider: rosterProvider(),
      defaults: { ...fixtureUiDefaults(), teamId: 'nobody' },
    })
    await screen.findByRole('group', { name: 'Teams' })
    await user.click(screen.getByRole('button', { name: 'ZQB' }))
    expect(await screen.findByRole('region', { name: SHARE_TITLE })).toBeInTheDocument()
  })
  it('AC12/AC26: a chip change reloads the roster for the new team and keeps the unit', async () => {
    const provider = rosterProvider()
    const { user } = setup({ provider })
    await screen.findByRole('group', { name: 'Zalpha share share' })
    expect(screen.getByText('731 total')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'ZQB' }))
    await waitFor(() => expect(screen.getByText('738 total')).toBeInTheDocument())
    expect(provider.getRoster).toHaveBeenLastCalledWith('zorb', 'zt2', 'zunit', '3031')
    expect(readState().unit).toBe('zunit')
  })
  it('AC12/AC26: a season change reloads the roster and keeps the unit', async () => {
    const provider = rosterProvider()
    const { user } = setup({ provider })
    await screen.findByRole('group', { name: 'Zalpha share share' })
    await user.click(probe('season 3030'))
    await waitFor(() => expect(screen.getByText('730 total')).toBeInTheDocument())
    expect(provider.getRoster).toHaveBeenLastCalledWith('zorb', 'zt1', 'zunit', '3030')
  })
  it('AC12: the chosen unit survives a chip change, a season change and a compare round trip', async () => {
    const { user } = setup({ provider: rosterProvider(), always: false })
    await user.click(probe('teams'))
    await user.click(probe('inside'))
    await screen.findByRole('group', { name: 'Zalpha share share' })
    await user.click(screen.getByRole('button', { name: 'Zunit Two' }))
    await screen.findByRole('group', { name: 'Zomega share' })
    await user.click(screen.getByRole('button', { name: 'ZQB' }))
    await user.click(probe('season 3030'))
    await user.click(probe('compare'))
    await user.click(probe('inside'))
    await screen.findByRole('group', { name: 'Zomega share' })
    expect(readState().unit).toBe('zalt')
    const share = screen.getByRole('region', { name: SHARE_TITLE })
    expect(
      within(share)
        .getAllByRole('button', { pressed: true })
        .map((b) => b.textContent),
    ).toEqual(['Zunit Two'])
    expect(screen.queryByRole('group', { name: 'Zalpha share share' })).toBeNull()
  })
  it('AC11: the unit set elsewhere shows that unit', async () => {
    const { user } = setup({ provider: rosterProvider() })
    await screen.findByRole('group', { name: 'Zalpha share share' })
    await user.click(probe('unit zalt'))
    expect(await screen.findByRole('group', { name: 'Zomega share' })).toBeInTheDocument()
  })
})

describe('T4: the Roster section below the share section', () => {
  const rosterDefaults = (): LeagueUiDefaults => ({ ...fixtureUiDefaults(), sortKey: 'zsnap' })
  const rosterRegion = () => screen.queryByRole('region', { name: 'Roster' })
  const rosterTable = () => screen.getByRole('table', { name: 'Roster' })
  const headerNames = () =>
    within(rosterTable())
      .getAllByRole('columnheader')
      .map((h) => h.textContent?.replace(/[↓↑]/g, '').trim())
  const headerBtn = (name: string) => within(rosterTable()).getByRole('button', { name })
  const unitBtn = (name: string) =>
    within(screen.getByRole('group', { name: 'Unit' })).getByRole('button', { name })

  async function ready() {
    const view = setup({ provider: rosterProvider(), defaults: rosterDefaults() })
    await screen.findByRole('table', { name: 'Roster' })
    return view
  }

  it('AC8/AC25: one getRoster call serves both sections', async () => {
    const { provider } = await ready()
    await act(async () => {})
    expect(provider.getRoster).toHaveBeenCalledTimes(1)
    expect(provider.getRoster).toHaveBeenCalledWith('zorb', 'zt1', 'zunit', '3031')
    expect(screen.getByRole('region', { name: SHARE_TITLE })).toBeInTheDocument()
  })
  it('AC7: the Roster region follows the share section and there is one unit toggle', async () => {
    await ready()
    const share = screen.getByRole('region', { name: SHARE_TITLE })
    expect(
      share.compareDocumentPosition(screen.getByRole('region', { name: 'Roster' })) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()
    expect(screen.getAllByRole('group', { name: 'Unit' })).toHaveLength(1)
  })
  it('AC10: the table columns are the non-extra stats of the unit', async () => {
    await ready()
    expect(headerNames()).toEqual(['Player', 'Zsnap', 'Zalpha', 'Zbeta', 'Zgamma', 'Zepsilon'])
  })
  it('AC16: the toggle switches the table and resets the sort to the default descending', async () => {
    const { user } = await ready()
    await user.click(headerBtn('Zalpha'))
    await user.click(headerBtn('Zalpha'))
    expect(readState().tSort).toEqual({ k: 'zalpha', d: 1 })
    await user.click(unitBtn('Zunit Two'))
    await waitFor(() => expect(headerNames()).toEqual(['Player', 'Zsnap', 'Zomega', 'Zsigma']))
    expect(readState().tSort).toEqual({ k: 'zsnap', d: -1 })
    expect(within(rosterTable()).getByRole('columnheader', { name: /Zsnap/ })).toHaveAttribute(
      'aria-sort',
      'descending',
    )
    expect(within(rosterTable()).getByText('Kip Zorrell')).toBeInTheDocument()
    expect(screen.getByRole('group', { name: 'Zomega share' })).toBeInTheDocument()
  })
  it('AC16: clicking the already-active unit keeps the sort', async () => {
    const { user } = await ready()
    await user.click(headerBtn('Zbeta'))
    await user.click(headerBtn('Zbeta'))
    await user.click(unitBtn('Zunit One'))
    expect(readState().tSort).toEqual({ k: 'zbeta', d: 1 })
    expect(within(rosterTable()).getByRole('columnheader', { name: /Zbeta/ })).toHaveAttribute(
      'aria-sort',
      'ascending',
    )
  })
  it('AC16: a chip change keeps the sort and shows the new rows', async () => {
    const { user } = await ready()
    await user.click(headerBtn('Zalpha'))
    expect(within(rosterTable()).getByText('331')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'ZQB' }))
    await waitFor(() => expect(within(rosterTable()).getByText('338')).toBeInTheDocument())
    expect(readState().tSort).toEqual({ k: 'zalpha', d: -1 })
    expect(within(rosterTable()).getByRole('columnheader', { name: /Zalpha/ })).toHaveAttribute(
      'aria-sort',
      'descending',
    )
  })
  it('AC16: a season change keeps the sort and shows the new rows', async () => {
    const { user } = await ready()
    await user.click(headerBtn('Zalpha'))
    await user.click(headerBtn('Zalpha'))
    await user.click(probe('season 3030'))
    await waitFor(() => expect(within(rosterTable()).getByText('330')).toBeInTheDocument())
    expect(readState().tSort).toEqual({ k: 'zalpha', d: 1 })
  })
  it('AC8: no Roster region in compare mode or Players mode', async () => {
    const { user } = setup({
      provider: rosterProvider(),
      defaults: rosterDefaults(),
      always: false,
    })
    expect(rosterRegion()).toBeNull()
    await user.click(probe('teams'))
    await user.click(probe('inside'))
    await screen.findByRole('table', { name: 'Roster' })
    await user.click(probe('compare'))
    expect(rosterRegion()).toBeNull()
    expect(screen.queryByRole('table', { name: 'Roster' })).toBeNull()
    await user.click(probe('inside'))
    await screen.findByRole('table', { name: 'Roster' })
    await user.click(probe('players'))
    expect(rosterRegion()).toBeNull()
  })
  it('AC8: teams pending renders no Roster region', async () => {
    const pending = deferred<Entity[]>()
    setup({ provider: rosterProvider({ getEntities: vi.fn(() => pending.promise) }) })
    await act(async () => {})
    expect(rosterRegion()).toBeNull()
  })
  it('AC8: an unknown team renders no Roster region', async () => {
    setup({ provider: rosterProvider(), defaults: { ...rosterDefaults(), teamId: 'nobody' } })
    await screen.findByRole('group', { name: 'Teams' })
    await act(async () => {})
    expect(rosterRegion()).toBeNull()
    expect(screen.queryByRole('table')).toBeNull()
  })
  it('AC8: pending units render no Roster region', async () => {
    const pending = deferred<never[]>()
    setup({ provider: rosterProvider({ getRosterUnits: vi.fn(() => pending.promise) }) })
    await screen.findByRole('region', { name: 'Zephyr Flarns' })
    await act(async () => {})
    expect(rosterRegion()).toBeNull()
  })
  it('AC8: rejected units render no Roster region and do not throw', async () => {
    const getRosterUnits = vi.fn(() => Promise.reject(new Error('boom')))
    setup({ provider: rosterProvider({ getRosterUnits }) })
    await waitFor(() => expect(getRosterUnits).toHaveBeenCalled())
    await act(async () => {})
    expect(rosterRegion()).toBeNull()
  })
  it('AC8: a pending roster renders no Roster region', async () => {
    const pending = deferred<never[]>()
    setup({ provider: rosterProvider({ getRoster: vi.fn(() => pending.promise) }) })
    await screen.findByRole('region', { name: SHARE_TITLE })
    await act(async () => {})
    expect(rosterRegion()).toBeNull()
  })
  it('AC8: a rejected roster renders no Roster region and does not throw', async () => {
    const getRoster = vi.fn(() => Promise.reject(new Error('boom')))
    setup({ provider: rosterProvider({ getRoster }) })
    await waitFor(() => expect(getRoster).toHaveBeenCalled())
    await act(async () => {})
    expect(rosterRegion()).toBeNull()
    expect(screen.getByRole('region', { name: 'Zephyr Flarns' })).toBeInTheDocument()
  })
  it('AC8: an unknown unit renders no Roster region and requests no roster', async () => {
    const provider = rosterProvider()
    setup({ provider, defaults: { ...rosterDefaults(), unit: 'nope' } })
    await screen.findByRole('region', { name: SHARE_TITLE })
    await act(async () => {})
    expect(rosterRegion()).toBeNull()
    expect(provider.getRoster).not.toHaveBeenCalled()
  })
})
