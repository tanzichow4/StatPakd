import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { DataSource } from '../../dataSource'
import type { DataProvider } from '../../domain/provider'
import type {
  LeagueUiDefaults,
  RosterEntry,
  RosterUnit,
  RosterUnitDef,
  Season,
  TeamId,
} from '../../domain/types'
import { useAppState } from '../../state'
import { AppStateProvider } from '../../state/AppStateProvider'
import {
  deferred,
  fixtureRoster,
  fixtureRosterUnits,
  fixtureStatDefs,
  fixtureUiDefaults,
  rosterProvider,
} from '../../test/fixtureProvider'
import { ShareOfProduction } from './ShareOfProduction'

const DOT = '·'

function Host() {
  const { state, dispatch } = useAppState()
  return (
    <div>
      <output data-testid="state">{JSON.stringify({ unit: state.unit })}</output>
      <button type="button" onClick={() => dispatch({ type: 'setTeam', teamId: 'zt2' })}>
        probe team 2
      </button>
      <button type="button" onClick={() => dispatch({ type: 'setSeason', season: '3030' })}>
        probe season 3030
      </button>
      <ShareOfProduction teamId={state.teamId} season={state.season} />
    </div>
  )
}

interface Options {
  provider?: DataProvider
  defaults?: LeagueUiDefaults
}

function setup({ provider = rosterProvider(), defaults }: Options = {}) {
  const user = userEvent.setup()
  const view = render(
    <DataSource provider={provider}>
      <AppStateProvider defaults={defaults ?? fixtureUiDefaults()} statDefs={fixtureStatDefs()}>
        <Host />
      </AppStateProvider>
    </DataSource>,
  )
  return { user, provider, ...view }
}

const probe = (name: string) => screen.getByRole('button', { name: `probe ${name}` })
const stateUnit = () => JSON.parse(screen.getByTestId('state').textContent ?? '{}').unit
const section = () => screen.getByRole('region', { name: 'Share of team production' })
const toggle = () => within(section()).getByRole('group', { name: 'Unit' })
const unitButtons = () => within(toggle()).getAllByRole('button')
const pressed = () =>
  unitButtons()
    .filter((b) => b.getAttribute('aria-pressed') === 'true')
    .map((b) => b.textContent)
const bars = () =>
  within(section())
    .queryAllByRole('group')
    .filter((g) => g !== toggle())
const barByName = (name: string) => within(section()).getByRole('group', { name })
const segmentsOf = (name: string) => within(barByName(name)).queryAllByRole('img')
const legend = () => within(section()).queryByRole('list', { name: 'Legend' })
const legendNames = () =>
  within(legend() as HTMLElement)
    .queryAllByRole('listitem')
    .map((li) => li.textContent)
const rowLabels = () => bars().map((b) => b.getAttribute('aria-label'))

async function ready() {
  await screen.findByRole('group', { name: 'Zalpha share share' })
}

describe('AC9: heading, subtitle and toggle', () => {
  it('AC9: renders an h2 "Share of team production" naming the section', async () => {
    setup()
    await ready()
    const h = within(section()).getByRole('heading', { level: 2 })
    expect(h).toHaveTextContent('Share of team production')
  })
  it('AC9: shows the subtitle', async () => {
    setup()
    await ready()
    expect(within(section()).getByText('How the workload splits across the roster')).toBeVisible()
  })
  it('AC9/AC10: the toggle sits inside the section after the heading', async () => {
    setup()
    await ready()
    const h = within(section()).getByRole('heading', { level: 2 })
    expect(h.compareDocumentPosition(toggle()) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })
})

describe('AC10/AC11: the toggle', () => {
  it('AC10: one button per unit in data order with the unit pressed from state', async () => {
    setup()
    await ready()
    expect(unitButtons().map((b) => b.textContent)).toEqual(['Zunit One', 'Zunit Two'])
    expect(pressed()).toEqual(['Zunit One'])
  })
  it('AC11: clicking the other unit switches rows, bars, leaders and legend', async () => {
    const { user } = setup()
    await ready()
    await user.click(screen.getByRole('button', { name: 'Zunit Two' }))
    expect(stateUnit()).toBe('zalt')
    await screen.findByRole('group', { name: 'Zomega share' })
    expect(rowLabels()).toEqual(['Zomega share', 'Zsigma share'])
    expect(pressed()).toEqual(['Zunit Two'])
    expect(within(section()).getByText('131 total')).toBeInTheDocument()
    expect(within(section()).getByText('Leader: Zorrell 69%')).toBeInTheDocument()
    expect(within(section()).getByText('Leader: Zorrell 50%')).toBeInTheDocument()
    expect(legendNames()).toEqual(['Kip Zorrell', 'Lona Mervish'])
    expect(screen.queryByText('Zalpha share')).not.toBeInTheDocument()
  })
  it('AC11: the roster is requested for the same team and season and the new unit', async () => {
    const { user, provider } = setup()
    await ready()
    await user.click(screen.getByRole('button', { name: 'Zunit Two' }))
    await screen.findByRole('group', { name: 'Zomega share' })
    expect(provider.getRoster).toHaveBeenLastCalledWith('zorb', 'zt1', 'zalt', '3031')
  })
  it('AC11: clicking the active button changes nothing and reloads nothing', async () => {
    const { user, provider } = setup()
    await ready()
    const calls = vi.mocked(provider.getRoster).mock.calls.length
    await user.click(screen.getByRole('button', { name: 'Zunit One' }))
    expect(stateUnit()).toBe('zunit')
    expect(rowLabels()).toEqual(['Zalpha share share', 'Zgamma tally share', 'Zdelta share'])
    expect(vi.mocked(provider.getRoster).mock.calls.length).toBe(calls)
  })
})

describe('AC13/AC14/AC17: the rows', () => {
  it('AC13: one row per share stat, in definition order, skipping empty share labels', async () => {
    setup()
    await ready()
    expect(rowLabels()).toEqual(['Zalpha share share', 'Zgamma tally share', 'Zdelta share'])
    expect(screen.queryByText('Zbeta')).not.toBeInTheDocument()
    expect(screen.queryByText('Zsnap')).not.toBeInTheDocument()
    expect(screen.queryByText('Zepsilon')).not.toBeInTheDocument()
  })
  it('AC14: shows each share label with its total', async () => {
    setup()
    await ready()
    const s = within(section())
    expect(s.getByText('Zalpha share')).toBeInTheDocument()
    expect(s.getByText('Zgamma tally')).toBeInTheDocument()
    expect(s.getByText('731 total')).toBeInTheDocument()
    expect(s.getByText('140 total')).toBeInTheDocument()
  })
  it('AC17: the leader is the largest value by last name with its percentage', async () => {
    setup()
    await ready()
    expect(within(section()).getByText('Leader: Brindle 45%')).toBeInTheDocument()
  })
  it('AC17: on a tie the first player in roster order leads', async () => {
    setup()
    await ready()
    expect(within(section()).getByText('Leader: Cantrell 29%')).toBeInTheDocument()
    expect(within(section()).queryByText(/Leader: Fenwick/)).not.toBeInTheDocument()
  })
  it('AC21: the segments carry the tooltip text as their name', async () => {
    setup()
    await ready()
    const names = segmentsOf('Zalpha share share').map((s) => s.getAttribute('aria-label'))
    expect(names).toEqual([
      `Ada Brindle ${DOT} 331 (45%)`,
      `Bo Cantrell ${DOT} 20 (3%)`,
      `Cher ${DOT} 150 (21%)`,
      `Finn Garrow ${DOT} 100 (14%)`,
      `Hugo Imber ${DOT} 60 (8%)`,
      `Ivy Jessup ${DOT} 40 (5%)`,
      `Jory Kestrel Vane ${DOT} 30 (4%)`,
    ])
  })
  it('AC15: players with negative, null or zero values have no segment', async () => {
    setup()
    await ready()
    const names = segmentsOf('Zalpha share share').map((s) => s.getAttribute('aria-label'))
    expect(names.join('|')).not.toMatch(/Dax Ellory|Edda Fenwick|Gwen Hollis/)
  })
  it('AC16: percent text appears at 9% and above only', async () => {
    setup()
    await ready()
    const texts = segmentsOf('Zalpha share share').map((s) => s.textContent)
    expect(texts).toEqual(['45%', '', '21%', '14%', '', '', ''])
  })
  it('AC18: the percentages of a row add to 100', async () => {
    setup()
    await ready()
    const pcts = segmentsOf('Zgamma tally share').map((s) =>
      Number(/\((\d+)%\)$/.exec(s.getAttribute('aria-label') ?? '')?.[1]),
    )
    expect(pcts).toHaveLength(8)
    expect(pcts.reduce((a, b) => a + b, 0)).toBe(100)
  })
})

describe('AC19: zero-total rows', () => {
  it('AC19: the stat nobody has shows an empty bar, "0 total" and no leader', async () => {
    setup()
    await ready()
    expect(segmentsOf('Zdelta share')).toHaveLength(0)
    expect(within(section()).getByText('0 total')).toBeInTheDocument()
    expect(within(section()).getAllByText(/^Leader:/)).toHaveLength(2)
  })
  it('AC19: the section text never shows NaN, Infinity or undefined', async () => {
    setup()
    await ready()
    expect(section().textContent).not.toMatch(/NaN|Infinity|undefined/)
  })
})

describe('AC20: an empty roster', () => {
  it('AC20: every row is empty with 0 total, no leader and an empty legend', async () => {
    const provider = rosterProvider({ getRoster: vi.fn(() => Promise.resolve([])) })
    setup({ provider })
    await screen.findByRole('group', { name: 'Zalpha share share' })
    expect(rowLabels()).toEqual(['Zalpha share share', 'Zgamma tally share', 'Zdelta share'])
    expect(within(section()).getAllByText('0 total')).toHaveLength(3)
    expect(within(section()).queryByText(/Leader/)).not.toBeInTheDocument()
    expect(within(section()).queryAllByRole('img')).toHaveLength(0)
    expect(legend()).toBeInTheDocument()
    expect(legendNames()).toEqual([])
    expect(section().textContent).not.toMatch(/NaN|Infinity|undefined/)
  })
})

describe('AC24/AC25: legend', () => {
  it('AC24: lists all ten players in roster order, including those without a segment', async () => {
    setup()
    await ready()
    expect(legendNames()).toEqual(fixtureRoster('zunit').map((r) => r.name))
  })
  it('AC25: legend swatch colours match the segment colours of the same player', async () => {
    setup()
    await ready()
    const items = within(legend() as HTMLElement).getAllByRole('listitem')
    const swatch = (i: number) => items[i]?.querySelector('span')?.getAttribute('style')
    const seg = segmentsOf('Zalpha share share')
    // Ada is legend item 0, Cher item 2 and Hugo item 7: segments 0, 2 and 4.
    expect(seg[0]?.getAttribute('style')).toContain('var(--series-1)')
    expect(swatch(0)).toContain('var(--series-1)')
    expect(seg[2]?.getAttribute('style')).toContain('var(--series-3)')
    expect(swatch(2)).toContain('var(--series-3)')
    expect(seg[4]?.getAttribute('style')).toContain('var(--series-8)')
    expect(swatch(7)).toContain('var(--series-8)')
    // Ivy is the 9th player, so the colour wraps to the first.
    expect(seg[5]?.getAttribute('style')).toContain('var(--series-1)')
    expect(swatch(8)).toContain('var(--series-1)')
  })
})

describe('AC22: keyboard', () => {
  it("AC22: Tab goes through the toggle, then each row's segments top to bottom", async () => {
    const user = userEvent.setup()
    setup()
    await ready()
    const order = [
      ...unitButtons(),
      ...segmentsOf('Zalpha share share'),
      ...segmentsOf('Zgamma tally share'),
    ]
    // The probe buttons come first in the page, so start from the first toggle button.
    act(() => (order[0] as HTMLElement).focus())
    for (const el of order.slice(1)) {
      await user.tab()
      expect(el).toHaveFocus()
    }
  })
  it('AC22: focusing a segment shows its tooltip text', async () => {
    setup()
    await ready()
    const first = segmentsOf('Zalpha share share')[0] as HTMLElement
    act(() => first.focus())
    expect(await screen.findByRole('tooltip')).toHaveTextContent(`Ada Brindle ${DOT} 331 (45%)`)
  })
})

describe('AC26: reloading', () => {
  it('AC26: loads the roster for the active league, team, unit and season', async () => {
    const { provider } = setup()
    await ready()
    expect(provider.getRoster).toHaveBeenCalledWith('zorb', 'zt1', 'zunit', '3031')
  })
  it('AC26/AC12: a team change reloads the roster and keeps the unit', async () => {
    const { user, provider } = setup()
    await ready()
    await user.click(probe('team 2'))
    await waitFor(() => expect(within(section()).getByText('738 total')).toBeInTheDocument())
    expect(within(section()).getByText('Leader: Brindle 46%')).toBeInTheDocument()
    expect(provider.getRoster).toHaveBeenLastCalledWith('zorb', 'zt2', 'zunit', '3031')
    expect(pressed()).toEqual(['Zunit One'])
    expect(within(section()).queryByText('731 total')).not.toBeInTheDocument()
  })
  it('AC26/AC12: a season change reloads the roster and keeps the unit', async () => {
    const { user, provider } = setup()
    await ready()
    await user.click(probe('season 3030'))
    await waitFor(() => expect(within(section()).getByText('730 total')).toBeInTheDocument())
    expect(provider.getRoster).toHaveBeenLastCalledWith('zorb', 'zt1', 'zunit', '3030')
    expect(pressed()).toEqual(['Zunit One'])
  })
  it('AC26: after a team change the old team is not shown while the new one loads', async () => {
    const gate = deferred<RosterEntry[]>()
    const getRoster = vi.fn((_l: string, teamId: TeamId, unit: RosterUnit, season: Season) =>
      teamId === 'zt2' ? gate.promise : Promise.resolve(fixtureRoster(unit, Number(season) % 100)),
    )
    const { user } = setup({ provider: rosterProvider({ getRoster }) })
    await ready()
    await user.click(probe('team 2'))
    await waitFor(() => expect(bars()).toHaveLength(0))
    expect(within(section()).queryByText('731 total')).not.toBeInTheDocument()
    expect(legend()).toBeNull()
    expect(toggle()).toBeInTheDocument()
    await act(async () => gate.resolve(fixtureRoster('zunit', 38)))
    expect(await within(section()).findByText('738 total')).toBeInTheDocument()
  })
  it('AC26: a superseded load resolving last is ignored', async () => {
    const slow = deferred<RosterEntry[]>()
    const getRoster = vi.fn((_l: string, _t: TeamId, unit: RosterUnit, season: Season) =>
      season === '3031' ? slow.promise : Promise.resolve(fixtureRoster(unit, Number(season) % 100)),
    )
    const { user } = setup({ provider: rosterProvider({ getRoster }) })
    await screen.findByRole('group', { name: 'Unit' })
    await user.click(probe('season 3030'))
    await waitFor(() => expect(within(section()).getByText('730 total')).toBeInTheDocument())
    await act(async () => slow.resolve(fixtureRoster('zunit', 99)))
    expect(within(section()).getByText('730 total')).toBeInTheDocument()
    expect(within(section()).queryByText('799 total')).not.toBeInTheDocument()
  })
  it('AC26: an old unit load resolving after switching unit does not show', async () => {
    const slowOff = deferred<RosterEntry[]>()
    let n = 0
    const getRoster = vi.fn((_l: string, _t: TeamId, unit: RosterUnit) => {
      n += 1
      if (n === 1) return slowOff.promise
      return Promise.resolve(fixtureRoster(unit, 31))
    })
    const { user } = setup({ provider: rosterProvider({ getRoster }) })
    await screen.findByRole('group', { name: 'Unit' })
    await user.click(screen.getByRole('button', { name: 'Zunit Two' }))
    await screen.findByRole('group', { name: 'Zomega share' })
    await act(async () => slowOff.resolve(fixtureRoster('zunit', 31)))
    expect(rowLabels()).toEqual(['Zomega share', 'Zsigma share'])
    expect(legendNames()).toEqual(['Kip Zorrell', 'Lona Mervish'])
  })
})

describe('AC27: loading and failure', () => {
  it('AC27: while units are pending nothing renders', async () => {
    const pending = deferred<RosterUnitDef[]>()
    const provider = rosterProvider({ getRosterUnits: vi.fn(() => pending.promise) })
    const { container } = setup({ provider })
    await act(async () => {})
    expect(screen.queryByRole('region')).not.toBeInTheDocument()
    expect(screen.queryByRole('heading')).not.toBeInTheDocument()
    expect(container.querySelector('section')).toBeNull()
    await act(async () => pending.resolve(fixtureRosterUnits()))
    expect(await screen.findByRole('heading', { level: 2 })).toBeInTheDocument()
  })
  it('AC27: when the units load fails nothing renders and nothing throws', async () => {
    const getRosterUnits = vi.fn(() => Promise.reject(new Error('boom')))
    setup({ provider: rosterProvider({ getRosterUnits }) })
    await waitFor(() => expect(getRosterUnits).toHaveBeenCalled())
    await act(async () => {})
    expect(screen.queryByRole('heading')).not.toBeInTheDocument()
    expect(screen.queryByRole('group', { name: 'Unit' })).not.toBeInTheDocument()
  })
  it('AC27: while the roster is pending only heading, subtitle and toggle show', async () => {
    const pending = deferred<RosterEntry[]>()
    setup({ provider: rosterProvider({ getRoster: vi.fn(() => pending.promise) }) })
    await screen.findByRole('group', { name: 'Unit' })
    expect(screen.getByRole('heading', { level: 2 })).toBeInTheDocument()
    expect(screen.getByText('How the workload splits across the roster')).toBeInTheDocument()
    expect(bars()).toHaveLength(0)
    expect(legend()).toBeNull()
    expect(pressed()).toEqual(['Zunit One'])
  })
  it('AC27: when the roster load fails the toggle stays and there are no rows or legend', async () => {
    const getRoster = vi.fn(() => Promise.reject(new Error('boom')))
    const { user } = setup({ provider: rosterProvider({ getRoster }) })
    await screen.findByRole('group', { name: 'Unit' })
    await waitFor(() => expect(getRoster).toHaveBeenCalled())
    await act(async () => {})
    expect(screen.getByRole('heading', { level: 2 })).toBeInTheDocument()
    expect(bars()).toHaveLength(0)
    expect(legend()).toBeNull()
    // The user can still switch units.
    await user.click(screen.getByRole('button', { name: 'Zunit Two' }))
    expect(stateUnit()).toBe('zalt')
  })
  it('AC27: with no units at all the heading and an empty toggle show without rows', async () => {
    const provider = rosterProvider({ getRosterUnits: vi.fn(() => Promise.resolve([])) })
    setup({ provider })
    await screen.findByRole('heading', { level: 2 })
    expect(within(toggle()).queryAllByRole('button')).toHaveLength(0)
    expect(bars()).toHaveLength(0)
    expect(legend()).toBeNull()
    expect(provider.getRoster).not.toHaveBeenCalled()
  })
})

describe('AC28: an unknown state.unit', () => {
  const unknown = (): LeagueUiDefaults => ({ ...fixtureUiDefaults(), unit: 'nope' })
  it('AC28: nothing is pressed, there are no rows or legend, and getRoster is not called', async () => {
    const { provider } = setup({ defaults: unknown() })
    await screen.findByRole('group', { name: 'Unit' })
    await act(async () => {})
    expect(pressed()).toEqual([])
    expect(unitButtons()).toHaveLength(2)
    expect(bars()).toHaveLength(0)
    expect(legend()).toBeNull()
    expect(provider.getRoster).not.toHaveBeenCalled()
  })
  it('AC28: the unit in state is not changed automatically', async () => {
    setup({ defaults: unknown() })
    await screen.findByRole('group', { name: 'Unit' })
    await act(async () => {})
    expect(stateUnit()).toBe('nope')
  })
  it('AC28: clicking a unit button then shows that unit', async () => {
    const { user } = setup({ defaults: unknown() })
    await screen.findByRole('group', { name: 'Unit' })
    await user.click(screen.getByRole('button', { name: 'Zunit Two' }))
    expect(await screen.findByRole('group', { name: 'Zomega share' })).toBeInTheDocument()
    expect(stateUnit()).toBe('zalt')
    expect(pressed()).toEqual(['Zunit Two'])
    expect(legendNames()).toEqual(['Kip Zorrell', 'Lona Mervish'])
  })
})
