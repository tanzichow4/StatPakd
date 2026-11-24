import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { DataSource } from '../../dataSource'
import type { DataProvider } from '../../domain/provider'
import type { Entity, EntityKind, LeagueUiDefaults } from '../../domain/types'
import { useAppState } from '../../state'
import { AppStateProvider } from '../../state/AppStateProvider'
import {
  compareDefaults,
  comparePlayers,
  compareProvider,
  compareStatDefs,
  compareTeams,
} from '../../test/compareFixtures'
import { deferred } from '../../test/fixtureProvider'
import { ComparePanel } from './ComparePanel'
import { COMPACT_HEADER_MIN } from './tableModel'

function Probe() {
  const { state, dispatch } = useAppState()
  return (
    <div>
      <output data-testid="state">
        {JSON.stringify({ view: state.view, chart2: state.chart2 })}
      </output>
      <button type="button" onClick={() => dispatch({ type: 'setKind', kind: 'teams' })}>
        probe to teams
      </button>
      <button type="button" onClick={() => dispatch({ type: 'setKind', kind: 'players' })}>
        probe to players
      </button>
      <button type="button" onClick={() => dispatch({ type: 'setSeason', season: '3030' })}>
        probe season
      </button>
      <button type="button" onClick={() => dispatch({ type: 'setTeamMode', mode: 'inside' })}>
        probe inside
      </button>
      {['zp4', 'zp5', 'zp6', 'zp7', 'zp8'].map((id) => (
        <button key={id} type="button" onClick={() => dispatch({ type: 'toggleEntity', id })}>
          probe toggle {id}
        </button>
      ))}
      <button type="button" onClick={() => dispatch({ type: 'toggleStat', key: 'zsolo' })}>
        probe stat zsolo
      </button>
    </div>
  )
}

interface Options {
  provider?: DataProvider
  defaults?: LeagueUiDefaults
}

function setup({ provider = compareProvider(), defaults = compareDefaults() }: Options = {}) {
  const user = userEvent.setup()
  const view = render(
    <DataSource provider={provider}>
      <AppStateProvider defaults={defaults} statDefs={compareStatDefs()}>
        <ComparePanel />
        <Probe />
      </AppStateProvider>
    </DataSource>,
  )
  return { provider, user, ...view }
}

const readState = () => JSON.parse(screen.getByTestId('state').textContent ?? '{}')
const tab = (name: string) => screen.getByRole('tab', { name })
const probe = (name: string) => screen.getByRole('button', { name })
const flush = () => act(async () => {})
const tableEl = () => screen.queryByRole('table', { hidden: true })
const caption = () => screen.queryByText(/Black = best among selected/)
const emptyText = /Add a (player|team) to start comparing\./
const RADAR_CAPTION =
  'Axes scaled to league range; "lower is better" stats are inverted so outward is always better.'
const RADAR_MESSAGE = 'Pick at least 3 stats for the radar.'

async function toTable(ctx: ReturnType<typeof setup>) {
  await ctx.user.click(tab('Table'))
  expect(await screen.findByRole('table')).toBeInTheDocument()
}

describe('AC4: tabs', () => {
  it('AC4: the tab list is named View with Table, 2D chart, 3D chart in that order', () => {
    setup()
    const list = screen.getByRole('tablist', { name: 'View' })
    expect(
      within(list)
        .getAllByRole('tab')
        .map((t) => t.textContent),
    ).toEqual(['Table', '2D chart', '3D chart'])
  })
  it('AC4: 3D chart is selected on first load', () => {
    setup()
    expect(tab('3D chart')).toHaveAttribute('aria-selected', 'true')
    expect(tab('Table')).toHaveAttribute('aria-selected', 'false')
    expect(tab('2D chart')).toHaveAttribute('aria-selected', 'false')
    expect(readState().view).toBe('3d')
  })
  it('AC4: the tabs map to the view values num, 2d and 3d', async () => {
    const { user } = setup()
    await user.click(tab('Table'))
    expect(readState().view).toBe('num')
    await user.click(tab('2D chart'))
    expect(readState().view).toBe('2d')
    await user.click(tab('3D chart'))
    expect(readState().view).toBe('3d')
  })
})

describe('AC5: tab interaction', () => {
  it('AC5: clicking a tab selects it', async () => {
    const { user } = setup()
    await user.click(tab('Table'))
    expect(tab('Table')).toHaveAttribute('aria-selected', 'true')
    expect(tab('3D chart')).toHaveAttribute('aria-selected', 'false')
  })
  it('AC5: only the selected tab is in the tab order', () => {
    setup()
    expect(tab('3D chart')).toHaveAttribute('tabindex', '0')
    expect(tab('Table')).toHaveAttribute('tabindex', '-1')
    expect(tab('2D chart')).toHaveAttribute('tabindex', '-1')
  })
  it('AC5: Tab from before the list lands on the selected tab', async () => {
    const { user } = setup()
    await user.tab()
    expect(tab('3D chart')).toHaveFocus()
  })
  it('AC5: ArrowRight from the last tab wraps to the first and selects it', async () => {
    const { user } = setup()
    tab('3D chart').focus()
    await user.keyboard('{ArrowRight}')
    expect(tab('Table')).toHaveFocus()
    expect(tab('Table')).toHaveAttribute('aria-selected', 'true')
    expect(readState().view).toBe('num')
  })
  it('AC5: ArrowLeft moves back and wraps from the first tab', async () => {
    const { user } = setup()
    tab('3D chart').focus()
    await user.keyboard('{ArrowLeft}')
    expect(tab('2D chart')).toHaveFocus()
    expect(readState().view).toBe('2d')
    await user.keyboard('{ArrowLeft}{ArrowLeft}')
    expect(tab('3D chart')).toHaveFocus()
    expect(readState().view).toBe('3d')
  })
  it('AC5: Home and End jump to the first and last tab', async () => {
    const { user } = setup()
    tab('3D chart').focus()
    await user.keyboard('{Home}')
    expect(tab('Table')).toHaveFocus()
    expect(readState().view).toBe('num')
    await user.keyboard('{End}')
    expect(tab('3D chart')).toHaveFocus()
    expect(readState().view).toBe('3d')
  })
  it('AC5: arrowing to Table shows the table panel', async () => {
    const { user } = setup()
    tab('3D chart').focus()
    await user.keyboard('{ArrowRight}')
    expect(await screen.findByRole('table')).toBeInTheDocument()
  })
})

describe('AC6: tab panels', () => {
  it('AC6: three panels exist and every tab aria-controls resolves to one that points back', () => {
    setup()
    const panels = screen.getAllByRole('tabpanel', { hidden: true })
    expect(panels).toHaveLength(3)
    const tabs = screen.getAllByRole('tab')
    const controls = tabs.map((t) => t.getAttribute('aria-controls'))
    expect(panels.map((p) => p.id)).toEqual(controls)
    expect(panels.map((p) => p.getAttribute('aria-labelledby'))).toEqual(tabs.map((t) => t.id))
  })
  it('AC6: only the selected tab panel is visible', () => {
    setup()
    expect(screen.getAllByRole('tabpanel')).toHaveLength(1)
    expect(screen.getByRole('tabpanel', { name: '3D chart' })).toBeVisible()
    expect(screen.getByRole('tabpanel', { name: '3D chart', hidden: true })).toBeInTheDocument()
  })
  it('AC6: the non-selected panels carry the hidden attribute', () => {
    setup()
    const hidden = screen
      .getAllByRole('tabpanel', { hidden: true })
      .filter((p) => p.hasAttribute('hidden'))
    expect(hidden).toHaveLength(2)
  })
  it('AC6: switching tabs moves which panel is visible', async () => {
    const { user } = setup()
    await user.click(tab('2D chart'))
    expect(screen.getByRole('tabpanel', { name: '2D chart' })).toBeVisible()
    expect(screen.getAllByRole('tabpanel')).toHaveLength(1)
  })
})

describe('AC32: hidden panels render no content', () => {
  it('AC32: on the default 3D view there is no table or caption and names and labels are only inside the 3D panel', async () => {
    setup()
    await flush()
    expect(tableEl()).toBeNull()
    expect(caption()).toBeNull()
    const panel3d = screen.getByRole('tabpanel', { name: '3D chart' })
    expect(within(panel3d).getAllByText('Ola Quenby')).toHaveLength(1)
    expect(screen.getAllByText('Ola Quenby')).toHaveLength(1)
    const labels = screen.getAllByText('Zhigh')
    expect(labels.length).toBeGreaterThan(0)
    for (const el of labels) expect(panel3d).toContainElement(el)
    const others = screen.getAllByRole('tabpanel', { hidden: true }).filter((p) => p !== panel3d)
    expect(others).toHaveLength(2)
    expect(others.map((p) => p.childNodes.length)).toEqual([0, 0])
  })
  it('AC32: on the Table view the other two panels are empty', async () => {
    const ctx = setup()
    await toTable(ctx)
    const empty = screen
      .getAllByRole('tabpanel', { hidden: true })
      .filter((p) => p.hasAttribute('hidden'))
    expect(empty.map((p) => p.childNodes.length)).toEqual([0, 0])
  })
  it('AC32: leaving the Table view removes the table from the DOM', async () => {
    const ctx = setup()
    await toTable(ctx)
    await ctx.user.click(tab('3D chart'))
    expect(tableEl()).toBeNull()
  })
  it('AC32: the 3D chart exists only in the selected panel', async () => {
    const { user } = setup()
    await flush()
    expect(screen.getByRole('group', { name: '3D chart' })).toBeInTheDocument()
    await user.click(tab('2D chart'))
    expect(screen.queryByText(/3D chart — coming soon/)).not.toBeInTheDocument()
    expect(screen.queryByRole('group', { name: '3D chart' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Reset view' })).not.toBeInTheDocument()
    expect(screen.queryByRole('combobox', { name: 'X axis' })).not.toBeInTheDocument()
    const hidden3d = document.getElementById(tab('3D chart').getAttribute('aria-controls') ?? '')
    expect(hidden3d).not.toBeNull()
    expect(hidden3d?.hasAttribute('hidden')).toBe(true)
    expect(hidden3d?.childNodes).toHaveLength(0)
  })
})

describe('AC7: Bars | Radar control', () => {
  const control = () => screen.queryByRole('group', { name: 'Chart type' })
  it('AC7: absent on 3D and Table', async () => {
    const { user } = setup()
    expect(control()).toBeNull()
    await user.click(tab('Table'))
    expect(control()).toBeNull()
  })
  it('AC7: present on 2D with Bars and Radar, after the tab list', async () => {
    const { user } = setup()
    await user.click(tab('2D chart'))
    const group = screen.getByRole('group', { name: 'Chart type' })
    expect(
      within(group)
        .getAllByRole('button')
        .map((b) => b.textContent),
    ).toEqual(['Bars', 'Radar', 'Dot plot'])
    const list = screen.getByRole('tablist', { name: 'View' })
    expect(list.compareDocumentPosition(group) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })
  it('AC7: Bars is pressed by default and clicking Radar presses it and dispatches', async () => {
    const { user } = setup()
    await user.click(tab('2D chart'))
    expect(screen.getByRole('button', { name: 'Bars' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Radar' })).toHaveAttribute('aria-pressed', 'false')
    await user.click(screen.getByRole('button', { name: 'Radar' }))
    expect(readState().chart2).toBe('radar')
    expect(screen.getByRole('button', { name: 'Radar' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Bars' })).toHaveAttribute('aria-pressed', 'false')
  })
  it('AC7: Enter and Space on the other button toggle it', async () => {
    const { user } = setup()
    await user.click(tab('2D chart'))
    screen.getByRole('button', { name: 'Radar' }).focus()
    await user.keyboard('{Enter}')
    expect(readState().chart2).toBe('radar')
    screen.getByRole('button', { name: 'Bars' }).focus()
    await user.keyboard(' ')
    expect(readState().chart2).toBe('bars')
  })
  it('AC7: Tab from the selected 2D tab reaches Bars', async () => {
    const { user } = setup()
    await user.click(tab('2D chart'))
    tab('2D chart').focus()
    await user.tab()
    expect(screen.getByRole('button', { name: 'Bars' })).toHaveFocus()
    await user.tab()
    expect(screen.getByRole('button', { name: 'Radar' })).toHaveFocus()
  })
  it('AC7: leaving 2D removes the control again', async () => {
    const { user } = setup()
    await user.click(tab('2D chart'))
    await user.click(tab('Table'))
    expect(control()).toBeNull()
  })
  it('AC7: the control stays usable with an empty selection', async () => {
    const { user } = setup({ defaults: compareDefaults({ players: [] }) })
    await user.click(tab('2D chart'))
    await user.click(screen.getByRole('button', { name: 'Radar' }))
    expect(readState().chart2).toBe('radar')
  })
})

describe('AC8: placeholders', () => {
  it('AC8: 3D shows the 3D chart and no coming-soon placeholder', async () => {
    setup()
    expect(await screen.findByRole('group', { name: '3D chart' })).toBeInTheDocument()
    expect(screen.queryByText('3D chart — coming soon')).not.toBeInTheDocument()
    expect(screen.queryByText(/coming soon/)).not.toBeInTheDocument()
  })
  it('AC8: 2D shows Bars chart, then Radar chart after toggling', async () => {
    const { user } = setup()
    await user.click(tab('2D chart'))
    expect(await screen.findByRole('group', { name: 'Bars chart' })).toBeInTheDocument()
    expect(screen.getByText('Bar length scaled to league range.')).toBeInTheDocument()
    expect(screen.queryByText('Bars chart — coming soon')).toBeNull()
    expect(screen.queryByText(/Radar chart/)).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Radar' }))
    expect(await screen.findByRole('group', { name: 'Radar chart' })).toBeInTheDocument()
    expect(screen.getByText(RADAR_CAPTION)).toBeInTheDocument()
    expect(screen.queryByText(/coming soon/)).toBeNull()
    expect(screen.queryByText('Radar chart — coming soon')).toBeNull()
    expect(screen.queryByRole('group', { name: 'Bars chart' })).toBeNull()
    expect(screen.queryByText('Bar length scaled to league range.')).toBeNull()
    expect(screen.queryByText(/Bars chart/)).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Bars' }))
    expect(await screen.findByRole('group', { name: 'Bars chart' })).toBeInTheDocument()
    expect(screen.queryByRole('group', { name: 'Radar chart' })).toBeNull()
    expect(screen.queryByText(RADAR_CAPTION)).toBeNull()
    expect(screen.queryByText(/Radar chart/)).not.toBeInTheDocument()
  })
  it('AC8: the 3D panel controls are the axis selects and view buttons, with no links', async () => {
    setup()
    const panel = screen.getByRole('tabpanel', { name: '3D chart' })
    await flush()
    expect(
      within(panel)
        .getAllByRole('combobox')
        .map((c) => c.getAttribute('aria-label')),
    ).toEqual(['X axis', 'Y axis', 'Z axis'])
    expect(
      within(panel)
        .getAllByRole('button')
        .map((b) => b.textContent),
    ).toEqual(['Reset view', '3D', 'Front', 'Side', 'Top'])
    expect(within(panel).queryAllByRole('link')).toHaveLength(0)
  })
})

describe('AC9: columns', () => {
  it('AC9: columns follow the selection order, not the data order', async () => {
    const ctx = setup({ defaults: compareDefaults({ players: ['zp3', 'zp1', 'zp2'] }) })
    await toTable(ctx)
    expect(
      screen
        .getAllByRole('columnheader')
        .slice(1)
        .map((h) => h.textContent),
    ).toEqual(['Quill Dorvanezmeta zp3', 'Ola Quenbyzmeta zp1', 'Pim Rastowzmeta zp2'])
  })
  it('AC9: an unknown selected id gets no column and the others keep their colours', async () => {
    const ctx = setup({ defaults: compareDefaults({ players: ['zp1', 'zmissing', 'zp2'] }) })
    await toTable(ctx)
    const heads = screen.getAllByRole('columnheader').slice(1)
    expect(heads).toHaveLength(2)
    const dots = heads.map((h) => h.querySelector('[aria-hidden="true"]')?.getAttribute('style'))
    expect(dots[0]).toContain('var(--series-1)')
    expect(dots[1]).toContain('var(--series-3)')
  })
})

describe('AC10: rows', () => {
  it('AC10: rows are the selected stats in canonical order with their labels', async () => {
    const ctx = setup({
      defaults: compareDefaults({ playerStats: ['zsolo', 'zbig', 'zhigh', 'zsign'] }),
    })
    await toTable(ctx)
    expect(screen.getAllByRole('rowheader').map((h) => h.textContent)).toEqual([
      'Zhigh',
      'Zbig',
      'Zsign',
      'Zsolo',
    ])
  })
  it('AC10: a selected key without a definition makes no row', async () => {
    const ctx = setup({ defaults: compareDefaults({ playerStats: ['zhigh', 'znope'] }) })
    await toTable(ctx)
    expect(screen.getAllByRole('rowheader')).toHaveLength(1)
  })
  it('AC10: adding a stat inserts its row in canonical position', async () => {
    const ctx = setup({ defaults: compareDefaults({ playerStats: ['zhigh', 'zbig'] }) })
    await toTable(ctx)
    await ctx.user.click(probe('probe stat zsolo'))
    expect(screen.getAllByRole('rowheader').map((h) => h.textContent)).toEqual([
      'Zhigh',
      'Zbig',
      'Zsolo',
    ])
  })
})

describe('AC11: kind and season switching', () => {
  it('AC11: switching to Teams shows the team table, and back shows players', async () => {
    const ctx = setup()
    await toTable(ctx)
    await ctx.user.click(probe('probe to teams'))
    expect(
      await screen.findByRole('table', { name: 'Selected teams compared by stat' }),
    ).toBeInTheDocument()
    expect(screen.getAllByRole('rowheader').map((h) => h.textContent)).toEqual([
      'Ztpts',
      'Ztlowlower is better',
    ])
    expect(screen.getByText('Zephyr Flarns')).toBeInTheDocument()
    await ctx.user.click(probe('probe to players'))
    expect(
      await screen.findByRole('table', { name: 'Selected players compared by stat' }),
    ).toBeInTheDocument()
  })
  it('AC11: changing the season loads new values into the table', async () => {
    const playersFor = (season: string): Entity[] =>
      comparePlayers().map((p) => ({
        ...p,
        stats: { ...p.stats, zbig: season === '3030' ? 5000 + Number(p.stats.zbig) : p.stats.zbig },
      }))
    const getEntities = vi.fn((_l: string, kind: EntityKind, season: string) =>
      Promise.resolve(kind === 'players' ? playersFor(season) : []),
    )
    const ctx = setup({ provider: compareProvider({ getEntities }) })
    await toTable(ctx)
    expect(screen.getByRole('cell', { name: /^4,000\s?\(best\)$/ })).toBeInTheDocument()
    await ctx.user.click(probe('probe season'))
    expect(await screen.findByRole('cell', { name: /^9,000\s?\(best\)$/ })).toBeInTheDocument()
    expect(getEntities).toHaveBeenCalledWith(expect.anything(), 'players', '3030')
  })
  it('AC11: team mode inside still renders as compare', async () => {
    const ctx = setup()
    await ctx.user.click(probe('probe to teams'))
    await ctx.user.click(probe('probe inside'))
    await ctx.user.click(tab('Table'))
    expect(await screen.findByRole('table')).toBeInTheDocument()
  })
})

describe('AC17: header switch at the 4/5 boundary', () => {
  it('AC17: the compact threshold is five', () => {
    expect(COMPACT_HEADER_MIN).toBe(5)
  })
  it('AC17: adding the fifth entity switches headers and removing it switches back', async () => {
    const ctx = setup({ defaults: compareDefaults({ players: ['zp1', 'zp2', 'zp3'] }) })
    await toTable(ctx)
    await ctx.user.click(probe('probe toggle zp4'))
    expect(await screen.findByText('Ola Quenby')).toBeInTheDocument()
    await ctx.user.click(probe('probe toggle zp5'))
    expect(await screen.findByText('Quenby')).toBeInTheDocument()
    expect(screen.queryByText('Ola Quenby')).not.toBeInTheDocument()
    expect(screen.getByText('ZB5')).toBeInTheDocument()
    await ctx.user.click(probe('probe toggle zp5'))
    expect(await screen.findByText('Ola Quenby')).toBeInTheDocument()
    expect(screen.queryByText('ZB5')).not.toBeInTheDocument()
  })
  it('AC25: eight entities give the 1230px min-width inside the scroll region', async () => {
    const ids = ['zp1', 'zp2', 'zp3', 'zp4', 'zp5', 'zp6', 'zp7', 'zp8']
    const ctx = setup({ defaults: compareDefaults({ players: ids }) })
    await toTable(ctx)
    expect(screen.getAllByRole('columnheader')).toHaveLength(9)
    expect(screen.getByRole('table')).toHaveStyle({ minWidth: '1230px' })
    const region = screen.getByRole('region', { name: 'Comparison table' })
    expect(within(region).getByRole('table')).toBe(screen.getByRole('table'))
    expect(screen.getByText('Zandor')).toBeInTheDocument()
  })
})

describe('AC20: scroll region in the panel', () => {
  it('AC20: the region is focusable and reached by Tab from the tab list on Table', async () => {
    const ctx = setup()
    await toTable(ctx)
    const region = screen.getByRole('region', { name: 'Comparison table' })
    expect(region).toHaveAttribute('tabindex', '0')
    tab('Table').focus()
    await ctx.user.tab()
    expect(region).toHaveFocus()
  })
})

describe('AC14/AC15: values in the panel', () => {
  it('AC15: pills, ties and N/A render from the provider data', async () => {
    const ctx = setup({ defaults: compareDefaults({ players: ['zp1', 'zp2', 'zp4'] }) })
    await toTable(ctx)
    const row = screen.getByRole('rowheader', { name: /^Zhigh/ }).closest('[role="row"]')
    expect(row).not.toBeNull()
    expect(
      within(row as HTMLElement)
        .getAllByRole('cell')
        .map((c) => c.textContent),
    ).toEqual(['10 (best)', '10 (best)', '—not applicable'])
  })
})

describe('AC22: empty state', () => {
  it.each(['Table', '2D chart', '3D chart'])(
    'AC22: players with no selection show the message and no table on %s',
    async (name) => {
      const { user } = setup({ defaults: compareDefaults({ players: [] }) })
      await user.click(tab(name))
      expect(await screen.findByText('Add a player to start comparing.')).toBeInTheDocument()
      expect(tableEl()).toBeNull()
      expect(caption()).toBeNull()
      expect(screen.getByRole('tablist', { name: 'View' })).toBeInTheDocument()
    },
  )
  it.each(['Table', '2D chart', '3D chart'])(
    'AC22: teams with no selection show the message and no table on %s',
    async (name) => {
      const { user } = setup({ defaults: compareDefaults({ teams: [] }) })
      await user.click(probe('probe to teams'))
      await user.click(tab(name))
      expect(await screen.findByText('Add a team to start comparing.')).toBeInTheDocument()
      expect(tableEl()).toBeNull()
      expect(caption()).toBeNull()
    },
  )
  it('AC22: only the visible panel holds the message', async () => {
    setup({ defaults: compareDefaults({ players: [] }) })
    expect(await screen.findAllByText(emptyText)).toHaveLength(1)
  })
  it('AC22: the message sits below the tab row', async () => {
    const { user } = setup({ defaults: compareDefaults({ players: [] }) })
    await user.click(tab('Table'))
    const message = await screen.findByText(emptyText)
    const list = screen.getByRole('tablist', { name: 'View' })
    expect(list.compareDocumentPosition(message) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })
  it('AC22: no message when entities are selected', async () => {
    const ctx = setup()
    await toTable(ctx)
    expect(screen.queryByText(emptyText)).not.toBeInTheDocument()
  })
  it('AC22: a selection with no selected stats shows neither the message nor a table', async () => {
    const { user } = setup({ defaults: compareDefaults({ playerStats: [] }) })
    await user.click(tab('Table'))
    await flush()
    expect(screen.queryByText(emptyText)).not.toBeInTheDocument()
    expect(tableEl()).toBeNull()
  })
})

describe('AC23/AC31: loading and failure show nothing', () => {
  it('AC23: while entities are pending there is no empty message, table or caption', async () => {
    const pending = deferred<Entity[]>()
    const { user } = setup({
      provider: compareProvider({ getEntities: vi.fn(() => pending.promise) }),
    })
    await user.click(tab('Table'))
    await flush()
    expect(screen.queryByText(emptyText)).not.toBeInTheDocument()
    expect(tableEl()).toBeNull()
    expect(caption()).toBeNull()
    await act(async () => pending.resolve(comparePlayers()))
    expect(await screen.findByRole('table')).toBeInTheDocument()
  })
  it('AC31: while stat definitions are pending no table with zero rows appears', async () => {
    const pending = deferred<ReturnType<typeof compareStatDefs>['players']>()
    const { user } = setup({
      provider: compareProvider({ getStatDefs: vi.fn(() => pending.promise) }),
    })
    await user.click(tab('Table'))
    await flush()
    expect(tableEl()).toBeNull()
    expect(caption()).toBeNull()
    expect(screen.queryByText(emptyText)).not.toBeInTheDocument()
    await act(async () => pending.resolve(compareStatDefs().players))
    expect(await screen.findByRole('table')).toBeInTheDocument()
  })
  it('AC31: a failed entity load shows nothing and does not crash', async () => {
    const { user } = setup({
      provider: compareProvider({ getEntities: vi.fn(() => Promise.reject(new Error('boom'))) }),
    })
    await user.click(tab('Table'))
    await flush()
    expect(tableEl()).toBeNull()
    expect(caption()).toBeNull()
    expect(screen.queryByText(emptyText)).not.toBeInTheDocument()
    expect(screen.getByRole('tablist', { name: 'View' })).toBeInTheDocument()
  })
  it('AC31: a failed stat definition load shows nothing and does not crash', async () => {
    const { user } = setup({
      provider: compareProvider({ getStatDefs: vi.fn(() => Promise.reject(new Error('boom'))) }),
    })
    await user.click(tab('Table'))
    await flush()
    expect(tableEl()).toBeNull()
    expect(screen.queryByText(emptyText)).not.toBeInTheDocument()
  })
  it('AC31: loading on 2D shows no placeholder and no empty message', async () => {
    const pending = deferred<Entity[]>()
    const { user } = setup({
      provider: compareProvider({ getEntities: vi.fn(() => pending.promise) }),
    })
    await user.click(tab('2D chart'))
    await flush()
    expect(screen.queryByText(/coming soon/)).not.toBeInTheDocument()
    expect(screen.queryByText(emptyText)).not.toBeInTheDocument()
    expect(screen.getByRole('group', { name: 'Chart type' })).toBeInTheDocument()
    expect(screen.queryByRole('group', { name: 'Bars chart' })).toBeNull()
    expect(screen.queryByText('Bar length scaled to league range.')).toBeNull()
    expect(screen.queryByTestId('bar-fill')).toBeNull()
    expect(screen.queryAllByRole('listitem')).toHaveLength(0)
    await user.click(screen.getByRole('button', { name: 'Radar' }))
    await flush()
    expect(screen.queryByRole('group', { name: 'Radar chart' })).toBeNull()
    expect(screen.queryByText(RADAR_MESSAGE)).toBeNull()
    expect(screen.queryByText(RADAR_CAPTION)).toBeNull()
    expect(screen.queryByRole('list', { name: 'Legend' })).toBeNull()
    expect(screen.queryByTestId('radar')).toBeNull()
    expect(screen.getByRole('tabpanel', { name: '2D chart' }).querySelector('svg')).toBeNull()
    expect(screen.queryByText(/coming soon/)).not.toBeInTheDocument()
    expect(screen.queryByText(emptyText)).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Bars' }))
    await act(async () => pending.resolve(comparePlayers()))
    expect(await screen.findByRole('group', { name: 'Bars chart' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Radar' }))
    expect(await screen.findByRole('group', { name: 'Radar chart' })).toBeInTheDocument()
  })
  it('AC31: switching kind drops the old table until the new data arrives', async () => {
    const pending = deferred<Entity[]>()
    const base = compareProvider()
    const getEntities = vi.fn((l: string, kind: EntityKind, season: string) =>
      kind === 'teams' ? pending.promise : base.getEntities(l, kind, season),
    )
    const ctx = setup({ provider: compareProvider({ getEntities }) })
    await toTable(ctx)
    await ctx.user.click(probe('probe to teams'))
    await flush()
    expect(tableEl()).toBeNull()
    expect(screen.queryByText(emptyText)).not.toBeInTheDocument()
  })
})

const barsGroup = () => screen.queryByRole('group', { name: 'Bars chart' })
const barsCaption = () => screen.queryByText('Bar length scaled to league range.')
const lineCount = (rowName: string) =>
  within(screen.getByRole('group', { name: rowName })).getAllByRole('listitem').length
const fillWidth = (rowName: string, line: string) => {
  const item = within(screen.getByRole('group', { name: rowName }))
    .getAllByRole('listitem')
    .find((li) => li.textContent?.startsWith(line))
  return item?.querySelector<HTMLElement>('[data-testid="bar-fill"]')?.style.width
}

async function to2D(ctx: ReturnType<typeof setup>) {
  await ctx.user.click(tab('2D chart'))
  expect(await screen.findByRole('group', { name: 'Bars chart' })).toBeInTheDocument()
}

describe('T11 AC9: widths come from the pool, not the selection', () => {
  it('AC9: default selection scales to the 8-player pool', async () => {
    await to2D(setup())
    expect(fillWidth('Zbig', 'Rastow')).toBe('11%')
    expect(fillWidth('Zhigh', 'Dorvane')).toBe('47%')
    expect(fillWidth('Zbig', 'Quenby')).toBe('100%')
    expect(fillWidth('Zbig', 'Dorvane')).toBe('5%')
  })
})

describe('T11 AC12: selection, season and kind changes', () => {
  it('AC12: toggling a fourth entity leaves the other widths and adds a line', async () => {
    const ctx = setup()
    await to2D(ctx)
    await ctx.user.click(probe('probe toggle zp4'))
    expect(await screen.findAllByText('Tolliver')).not.toHaveLength(0)
    expect(lineCount('Zbig')).toBe(4)
    expect(fillWidth('Zbig', 'Rastow')).toBe('11%')
    expect(fillWidth('Zhigh', 'Dorvane')).toBe('47%')
    await ctx.user.click(probe('probe toggle zp4'))
    expect(lineCount('Zbig')).toBe(3)
    expect(fillWidth('Zbig', 'Rastow')).toBe('11%')
  })
  it('AC12: changing the season recomputes widths and values', async () => {
    const getEntities = vi.fn((_l: string, kind: EntityKind, season: string) =>
      Promise.resolve(
        kind === 'players'
          ? comparePlayers().map((p) =>
              p.id === 'zp1' && season === '3030' ? { ...p, stats: { ...p.stats, zbig: 8000 } } : p,
            )
          : [],
      ),
    )
    const ctx = setup({ provider: compareProvider({ getEntities }) })
    await to2D(ctx)
    expect(fillWidth('Zbig', 'Rastow')).toBe('11%')
    await ctx.user.click(probe('probe season'))
    expect(await screen.findByText('8,000')).toBeInTheDocument()
    expect(fillWidth('Zbig', 'Rastow')).toBe('8%')
  })
  it('AC12/AC21: switching to Teams shows team rows and widths, and back restores players', async () => {
    const ctx = setup()
    await to2D(ctx)
    await ctx.user.click(probe('probe to teams'))
    expect(await screen.findByRole('group', { name: 'Ztpts' })).toBeInTheDocument()
    expect(screen.getByRole('group', { name: 'Ztlow lower is better' })).toBeInTheDocument()
    expect(screen.queryByRole('group', { name: 'Zhigh' })).toBeNull()
    expect(fillWidth('Ztpts', 'ZQC')).toBe('62%')
    expect(screen.getAllByText('Bar length scaled to league range.')).toHaveLength(1)
    await ctx.user.click(probe('probe to players'))
    expect(await screen.findByRole('group', { name: 'Zhigh' })).toBeInTheDocument()
    expect(screen.queryByRole('group', { name: 'Ztpts' })).toBeNull()
    expect(fillWidth('Zbig', 'Rastow')).toBe('11%')
  })
})

describe('T11 AC3: empty and failed states on 2D', () => {
  it('AC3: an empty selection shows the empty state and no chart or caption', async () => {
    const { user } = setup({ defaults: compareDefaults({ players: [] }) })
    await user.click(tab('2D chart'))
    expect(await screen.findByText('Add a player to start comparing.')).toBeInTheDocument()
    expect(barsGroup()).toBeNull()
    expect(barsCaption()).toBeNull()
  })
  it('AC3: a failed entity load on 2D shows no chart and does not crash', async () => {
    const { user } = setup({
      provider: compareProvider({ getEntities: vi.fn(() => Promise.reject(new Error('boom'))) }),
    })
    await user.click(tab('2D chart'))
    await flush()
    expect(barsGroup()).toBeNull()
    expect(barsCaption()).toBeNull()
    expect(screen.queryByText(emptyText)).not.toBeInTheDocument()
    expect(screen.getByRole('group', { name: 'Chart type' })).toBeInTheDocument()
  })
  it('AC3: with every stat deselected the chart does not render', async () => {
    const { user } = setup({ defaults: compareDefaults({ playerStats: [] }) })
    await user.click(tab('2D chart'))
    await flush()
    expect(barsGroup()).toBeNull()
  })
  it('AC3: the Table and 3D tabs show no Bars chart', async () => {
    const ctx = setup()
    await toTable(ctx)
    expect(barsGroup()).toBeNull()
    await ctx.user.click(tab('3D chart'))
    expect(barsGroup()).toBeNull()
    expect(await screen.findByRole('group', { name: '3D chart' })).toBeInTheDocument()
  })
})

describe('T11 AC17: keyboard', () => {
  it('AC17: Tab goes 2D tab, Bars, Radar and never into the chart', async () => {
    const ctx = setup()
    await to2D(ctx)
    tab('2D chart').focus()
    await ctx.user.tab()
    expect(screen.getByRole('button', { name: 'Bars' })).toHaveFocus()
    await ctx.user.tab()
    expect(screen.getByRole('button', { name: 'Radar' })).toHaveFocus()
    const chart = screen.getByRole('group', { name: 'Bars chart' })
    expect(chart.querySelectorAll('button, a, input, select, textarea, [tabindex]')).toHaveLength(0)
    await ctx.user.tab()
    expect(chart.contains(document.activeElement)).toBe(false)
  })
})

const radarGroup = () => screen.queryByRole('group', { name: 'Radar chart' })
const radarSeries = () => screen.queryAllByTestId('radar-series')
const seriesPoints = () =>
  radarSeries().map((g) => g.querySelector('polygon')?.getAttribute('points'))
const radarLabels = () => screen.queryAllByTestId('radar-label').map((l) => l.textContent)
const legend = () => screen.queryByRole('list', { name: 'Legend' })

async function toRadar(ctx: ReturnType<typeof setup>) {
  await ctx.user.click(tab('2D chart'))
  await ctx.user.click(screen.getByRole('button', { name: 'Radar' }))
  await flush()
}

describe('T12 AC1/AC2: Radar placement and switching', () => {
  it('AC1: Radar shows the chart, legend and caption and no placeholder', async () => {
    const ctx = setup()
    await toRadar(ctx)
    expect(await screen.findByRole('group', { name: 'Radar chart' })).toBeInTheDocument()
    expect(within(legend() as HTMLElement).getAllByRole('listitem')).toHaveLength(3)
    expect(screen.getByText(RADAR_CAPTION)).toBeInTheDocument()
    expect(screen.queryByText(/coming soon/)).toBeNull()
    expect(radarSeries()).toHaveLength(3)
  })
  it('AC2: only one of Bars and Radar is in the document at a time, in both directions', async () => {
    const ctx = setup()
    await to2D(ctx)
    expect(radarGroup()).toBeNull()
    await ctx.user.click(screen.getByRole('button', { name: 'Radar' }))
    expect(await screen.findByRole('group', { name: 'Radar chart' })).toBeInTheDocument()
    expect(barsGroup()).toBeNull()
    await ctx.user.click(screen.getByRole('button', { name: 'Bars' }))
    expect(await screen.findByRole('group', { name: 'Bars chart' })).toBeInTheDocument()
    expect(radarGroup()).toBeNull()
    expect(screen.queryByTestId('radar')).toBeNull()
    await ctx.user.click(screen.getByRole('button', { name: 'Radar' }))
    expect(await screen.findByRole('group', { name: 'Radar chart' })).toBeInTheDocument()
    expect(barsGroup()).toBeNull()
  })
})

describe('T12 AC8/AC9: pool scaling and axis order in the panel', () => {
  it('AC8: values scale to the 8-player pool, not to the selection', async () => {
    const ctx = setup()
    await toRadar(ctx)
    await screen.findByRole('group', { name: 'Radar chart' })
    const pts = seriesPoints()
    expect(pts[2]?.split(' ')[0]).toBe('260,136.7')
    expect(pts[1]?.split(' ')[2]).toBe('241.6,220.6')
    expect(pts[0]?.split(' ')[0]).toBe('260,60')
    expect(pts[1]?.split(' ')[1]).toBe('389.9,285')
  })
  it('AC9: axes follow canonical order regardless of pick order', async () => {
    const ctx = setup({
      defaults: compareDefaults({ playerStats: ['zsolo', 'zbig', 'zhigh', 'zsign'] }),
    })
    await toRadar(ctx)
    await screen.findByRole('group', { name: 'Radar chart' })
    expect(radarLabels()).toEqual(['Zhigh', 'Zbig', 'Zsign', 'Zsolo'])
  })
  it('AC9: a selected key without a definition adds no axis', async () => {
    const ctx = setup({
      defaults: compareDefaults({ playerStats: ['zhigh', 'zlow', 'zbig', 'znope'] }),
    })
    await toRadar(ctx)
    await screen.findByRole('group', { name: 'Radar chart' })
    expect(radarLabels()).toEqual(['Zhigh', 'Zlow', 'Zbig'])
  })
})

describe('T12 AC11: selection, season and kind changes', () => {
  it('AC11: toggling a fourth entity adds a series and legend item and moves nothing else', async () => {
    const ctx = setup()
    await toRadar(ctx)
    await screen.findByRole('group', { name: 'Radar chart' })
    const before = seriesPoints()
    await ctx.user.click(probe('probe toggle zp4'))
    expect(await screen.findAllByTestId('radar-series')).toHaveLength(4)
    expect(within(legend() as HTMLElement).getAllByRole('listitem')).toHaveLength(4)
    expect(seriesPoints().slice(0, 3)).toEqual(before)
    await ctx.user.click(probe('probe toggle zp4'))
    expect(radarSeries()).toHaveLength(3)
    expect(seriesPoints()).toEqual(before)
  })
  it('AC11: a fourth entity with a null zhigh plots that vertex at the centre', async () => {
    const ctx = setup()
    await toRadar(ctx)
    await ctx.user.click(probe('probe toggle zp4'))
    await screen.findAllByTestId('radar-series')
    expect(seriesPoints()[3]?.split(' ')[0]).toBe('260,210')
    expect(screen.getByText('Not applicable: Zhigh')).toBeInTheDocument()
  })
  it('AC11: changing the season recomputes the ranges', async () => {
    const getEntities = vi.fn((_l: string, kind: EntityKind, season: string) =>
      Promise.resolve(
        kind === 'players'
          ? comparePlayers().map((p) =>
              p.id === 'zp1' && season === '3030' ? { ...p, stats: { ...p.stats, zbig: 8000 } } : p,
            )
          : [],
      ),
    )
    const ctx = setup({ provider: compareProvider({ getEntities }) })
    await toRadar(ctx)
    await screen.findByRole('group', { name: 'Radar chart' })
    const before = seriesPoints()[1]
    expect(before?.split(' ')[2]).toBe('241.6,220.6')
    await ctx.user.click(probe('probe season'))
    await vi.waitFor(() => expect(seriesPoints()[1]?.split(' ')[2]).not.toBe('241.6,220.6'))
    expect(seriesPoints()[1]?.split(' ')[2]).toBe('246.2,218')
    expect(seriesPoints()[1]?.split(' ')[0]).toBe(before?.split(' ')[0])
  })
  it('AC11/AC17: Teams with the 2 default stats show the message, then Players restore', async () => {
    const ctx = setup()
    await toRadar(ctx)
    await screen.findByRole('group', { name: 'Radar chart' })
    await ctx.user.click(probe('probe to teams'))
    expect(await screen.findByText(RADAR_MESSAGE)).toBeInTheDocument()
    expect(radarGroup()).toBeNull()
    expect(screen.getByText('Zephyr Flarns')).toBeInTheDocument()
    expect(screen.queryByText('Ola Quenby')).toBeNull()
    expect(screen.getByText(RADAR_CAPTION)).toBeInTheDocument()
    await ctx.user.click(probe('probe to players'))
    expect(await screen.findByRole('group', { name: 'Radar chart' })).toBeInTheDocument()
    expect(screen.queryByText(RADAR_MESSAGE)).toBeNull()
  })
  it('AC17: Teams with three stats chart with the team labels', async () => {
    const ctx = setup({ defaults: compareDefaults({ teamStats: ['ztpts', 'ztlow', 'ztwin'] }) })
    await toRadar(ctx)
    await ctx.user.click(probe('probe to teams'))
    expect(await screen.findByRole('group', { name: 'Radar chart' })).toBeInTheDocument()
    expect(radarLabels()).toEqual(['Ztpts', 'Ztlow', 'Ztwin'])
    expect(radarSeries()).toHaveLength(3)
  })
})

describe('T12 AC4/AC6: fewer than 3 stats in the panel', () => {
  it('AC4: 2 stats show the message with legend and caption but no chart', async () => {
    const ctx = setup({ defaults: compareDefaults({ playerStats: ['zhigh', 'zlow'] }) })
    await toRadar(ctx)
    expect(await screen.findByText(RADAR_MESSAGE)).toBeInTheDocument()
    expect(radarGroup()).toBeNull()
    expect(radarSeries()).toHaveLength(0)
    expect(radarLabels()).toHaveLength(0)
    expect(screen.getByRole('tabpanel', { name: '2D chart' }).querySelector('svg')).toBeNull()
    expect(within(legend() as HTMLElement).getAllByRole('listitem')).toHaveLength(3)
    expect(screen.getByText(RADAR_CAPTION)).toBeInTheDocument()
  })
  it('AC4: 1 stat shows the message', async () => {
    const ctx = setup({ defaults: compareDefaults({ playerStats: ['zhigh'] }) })
    await toRadar(ctx)
    expect(await screen.findByText(RADAR_MESSAGE)).toBeInTheDocument()
    expect(radarGroup()).toBeNull()
  })
  it('AC6: adding a third stat shows the chart and removing it restores the message', async () => {
    const ctx = setup({ defaults: compareDefaults({ playerStats: ['zhigh', 'zlow'] }) })
    await toRadar(ctx)
    expect(await screen.findByText(RADAR_MESSAGE)).toBeInTheDocument()
    await ctx.user.click(probe('probe stat zsolo'))
    expect(await screen.findByRole('group', { name: 'Radar chart' })).toBeInTheDocument()
    expect(screen.queryByText(RADAR_MESSAGE)).toBeNull()
    expect(radarLabels()).toEqual(['Zhigh', 'Zlow', 'Zsolo'])
    await ctx.user.click(probe('probe stat zsolo'))
    expect(await screen.findByText(RADAR_MESSAGE)).toBeInTheDocument()
    expect(radarGroup()).toBeNull()
  })
})

describe('T12 AC3: empty, failed and other tabs', () => {
  it('AC3: an empty selection on Radar shows the empty state and no radar parts', async () => {
    const ctx = setup({ defaults: compareDefaults({ players: [] }) })
    await toRadar(ctx)
    expect(await screen.findByText('Add a player to start comparing.')).toBeInTheDocument()
    expect(radarGroup()).toBeNull()
    expect(screen.queryByText(RADAR_MESSAGE)).toBeNull()
    expect(legend()).toBeNull()
    expect(screen.queryByText(RADAR_CAPTION)).toBeNull()
    expect(screen.queryByTestId('radar')).toBeNull()
  })
  it('AC3: a failed entity load on Radar shows nothing and does not crash', async () => {
    const ctx = setup({
      provider: compareProvider({ getEntities: vi.fn(() => Promise.reject(new Error('boom'))) }),
    })
    await toRadar(ctx)
    expect(radarGroup()).toBeNull()
    expect(screen.queryByText(RADAR_MESSAGE)).toBeNull()
    expect(legend()).toBeNull()
    expect(screen.queryByText(emptyText)).not.toBeInTheDocument()
    expect(screen.getByRole('group', { name: 'Chart type' })).toBeInTheDocument()
  })
  it('AC3: with every stat deselected the Radar panel renders nothing', async () => {
    const ctx = setup({ defaults: compareDefaults({ playerStats: [] }) })
    await toRadar(ctx)
    expect(radarGroup()).toBeNull()
    expect(screen.queryByText(RADAR_MESSAGE)).toBeNull()
    expect(screen.queryByTestId('radar')).toBeNull()
  })
  it('AC3: the Table and 3D tabs show no radar when Radar is the 2D mode', async () => {
    const ctx = setup()
    await toRadar(ctx)
    await screen.findByRole('group', { name: 'Radar chart' })
    await ctx.user.click(tab('Table'))
    expect(await screen.findByRole('table')).toBeInTheDocument()
    expect(radarGroup()).toBeNull()
    expect(screen.queryByTestId('radar')).toBeNull()
    expect(screen.queryByText(RADAR_CAPTION)).toBeNull()
    await ctx.user.click(tab('3D chart'))
    expect(await screen.findByRole('group', { name: '3D chart' })).toBeInTheDocument()
    expect(radarGroup()).toBeNull()
    expect(screen.queryByTestId('radar')).toBeNull()
    expect(legend()).toBeNull()
  })
})

describe('T12 AC20: keyboard', () => {
  it('AC20: Tab goes 2D tab, Bars, Radar and never into the radar', async () => {
    const ctx = setup()
    await toRadar(ctx)
    const chart = await screen.findByRole('group', { name: 'Radar chart' })
    tab('2D chart').focus()
    await ctx.user.tab()
    expect(screen.getByRole('button', { name: 'Bars' })).toHaveFocus()
    await ctx.user.tab()
    expect(screen.getByRole('button', { name: 'Radar' })).toHaveFocus()
    const root = screen.getByTestId('radar')
    expect(root.querySelectorAll('button, a, input, select, textarea, [tabindex]')).toHaveLength(0)
    await ctx.user.tab()
    expect(chart.contains(document.activeElement)).toBe(false)
    expect(root.contains(document.activeElement)).toBe(false)
  })
})

const chart3d = () => screen.queryByRole('group', { name: '3D chart' })
const panel3d = () => screen.getByRole('tabpanel', { name: '3D chart' })
const axisSelect = (name: string) => screen.getByRole('combobox', { name })

describe('T14 AC1: the 3D panel content', () => {
  it('AC1: the default view shows the controls, the chart card and the readout in that order', async () => {
    setup()
    const x = await screen.findByRole('combobox', { name: 'X axis' })
    const reset = screen.getByRole('button', { name: 'Reset view' })
    const chart = screen.getByRole('group', { name: '3D chart' })
    const readout = screen.getByRole('complementary')
    const before = (a: Node, b: Node) =>
      Boolean(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING)
    expect(before(x, reset)).toBe(true)
    expect(before(reset, chart)).toBe(true)
    expect(before(chart, readout)).toBe(true)
    expect(within(readout).getByRole('heading', { name: 'Readout' })).toBeInTheDocument()
    for (const el of [x, reset, chart, readout]) expect(panel3d()).toContainElement(el)
  })
  it('AC1: the coming-soon text is not rendered anywhere', async () => {
    setup()
    await screen.findByRole('group', { name: '3D chart' })
    expect(screen.queryByText(/coming soon/)).not.toBeInTheDocument()
  })
  it('AC1: the readout lists the selected players in selection order', async () => {
    setup()
    await screen.findByRole('group', { name: '3D chart' })
    const items = within(screen.getByRole('complementary')).getAllByRole('listitem')
    expect(items.map((li) => li.textContent)).toEqual([
      expect.stringContaining('Ola Quenby'),
      expect.stringContaining('Pim Rastow'),
      expect.stringContaining('Quill Dorvane'),
    ])
  })
  it('AC1: switching from Table back to 3D shows the chart again', async () => {
    const ctx = setup()
    await toTable(ctx)
    expect(chart3d()).toBeNull()
    await ctx.user.click(tab('3D chart'))
    expect(await screen.findByRole('group', { name: '3D chart' })).toBeInTheDocument()
  })
})

describe('T14 AC2: the 3D chart does not depend on the sidebar stats', () => {
  it('AC2: with no sidebar stats selected the 3D chart still renders', async () => {
    setup({ defaults: compareDefaults({ playerStats: [] }) })
    expect(await screen.findByRole('group', { name: '3D chart' })).toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: 'X axis' })).toHaveDisplayValue('Zhigh')
    expect(screen.getByRole('button', { name: 'Reset view' })).toBeInTheDocument()
    expect(screen.getAllByTestId('point').length).toBeGreaterThan(0)
  })
  it('AC2: the same defaults give no table rows on the Table view', async () => {
    const { user } = setup({ defaults: compareDefaults({ playerStats: [] }) })
    await user.click(tab('Table'))
    await flush()
    expect(tableEl()).toBeNull()
    expect(chart3d()).toBeNull()
  })
  it('AC2: the axes come from the axis state, not from the sidebar stats', async () => {
    setup({ defaults: compareDefaults({ playerStats: ['zsolo'] }) })
    await screen.findByRole('group', { name: '3D chart' })
    expect(axisSelect('X axis')).toHaveDisplayValue('Zhigh')
    expect(axisSelect('Y axis')).toHaveDisplayValue('Zlow')
    expect(axisSelect('Z axis')).toHaveDisplayValue('Zbig')
  })
  it('AC2: teams with no sidebar stats still show the team chart', async () => {
    const { user } = setup({ defaults: compareDefaults({ teamStats: [] }) })
    await user.click(probe('probe to teams'))
    expect(await screen.findByRole('group', { name: '3D chart' })).toBeInTheDocument()
    expect(axisSelect('X axis')).toHaveDisplayValue('Ztpts')
  })
})

describe('T14 AC3: an empty selection', () => {
  it('AC3: players show the controls, the chart card, the Readout heading and the empty text once', async () => {
    setup({ defaults: compareDefaults({ players: [] }) })
    expect(await screen.findByRole('group', { name: '3D chart' })).toBeInTheDocument()
    expect(screen.getAllByRole('combobox')).toHaveLength(3)
    expect(screen.getByRole('button', { name: 'Reset view' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Readout' })).toBeInTheDocument()
    expect(screen.getAllByText('Add a player to start comparing.')).toHaveLength(1)
    expect(within(screen.getByRole('complementary')).getByText(emptyText)).toBeInTheDocument()
    expect(screen.queryAllByTestId('name-tag')).toHaveLength(0)
    expect(screen.queryAllByRole('listitem')).toHaveLength(0)
  })
  it('AC3: every eligible league entity is drawn as a grey dot', async () => {
    setup({ defaults: compareDefaults({ players: [] }) })
    await screen.findByRole('group', { name: '3D chart' })
    // Seven of the eight players have all three axis values.
    expect(screen.getAllByTestId('point')).toHaveLength(7)
    for (const g of screen.getAllByTestId('point')) {
      const circle = g.querySelector('circle') as SVGCircleElement
      // Smaller than a selected dot at any depth.
      expect(Number(circle.getAttribute('r'))).toBeGreaterThan(3)
      expect(Number(circle.getAttribute('r'))).toBeLessThan(6.5)
      expect(g.getAttribute('style')).toBeNull()
    }
  })
  it('AC3: teams show the team empty text once', async () => {
    const { user } = setup({ defaults: compareDefaults({ teams: [] }) })
    await user.click(probe('probe to teams'))
    expect(await screen.findAllByText('Add a team to start comparing.')).toHaveLength(1)
    expect(screen.getByRole('group', { name: '3D chart' })).toBeInTheDocument()
    expect(screen.getAllByTestId('point')).toHaveLength(3)
  })
  it('AC3: selecting an entity from the empty state adds its card and tag', async () => {
    const { user } = setup({ defaults: compareDefaults({ players: [] }) })
    await screen.findByRole('group', { name: '3D chart' })
    await user.click(probe('probe toggle zp4'))
    expect(screen.queryByText(emptyText)).not.toBeInTheDocument()
    expect(within(screen.getByRole('complementary')).getAllByRole('listitem')).toHaveLength(1)
    expect(screen.getByText('Tolliver')).toBeInTheDocument()
  })
})

describe('T14 AC4: loading and failure show no 3D controls', () => {
  const none = () => {
    expect(chart3d()).toBeNull()
    expect(screen.queryAllByRole('combobox')).toHaveLength(0)
    expect(screen.queryByRole('button', { name: 'Reset view' })).toBeNull()
    expect(panel3d().querySelector('svg')).toBeNull()
  }
  it('AC4: while entities are pending an empty selection shows only the empty text', async () => {
    const pending = deferred<Entity[]>()
    setup({
      provider: compareProvider({ getEntities: vi.fn(() => pending.promise) }),
      defaults: compareDefaults({ players: [] }),
    })
    await flush()
    none()
    expect(screen.getAllByText('Add a player to start comparing.')).toHaveLength(1)
    await act(async () => pending.resolve(comparePlayers()))
    expect(await screen.findByRole('group', { name: '3D chart' })).toBeInTheDocument()
  })
  it('AC4: while entities are pending with a selection the panel is empty', async () => {
    const pending = deferred<Entity[]>()
    setup({ provider: compareProvider({ getEntities: vi.fn(() => pending.promise) }) })
    await flush()
    none()
    expect(screen.queryByText(emptyText)).not.toBeInTheDocument()
    expect(panel3d().childNodes).toHaveLength(0)
    await act(async () => pending.resolve(comparePlayers()))
    expect(await screen.findByRole('group', { name: '3D chart' })).toBeInTheDocument()
  })
  it('AC4: while stat definitions are pending the 3D chart is not drawn', async () => {
    const pending = deferred<ReturnType<typeof compareStatDefs>['players']>()
    setup({ provider: compareProvider({ getStatDefs: vi.fn(() => pending.promise) }) })
    await flush()
    none()
    expect(screen.queryByText(emptyText)).not.toBeInTheDocument()
    await act(async () => pending.resolve(compareStatDefs().players))
    expect(await screen.findByRole('group', { name: '3D chart' })).toBeInTheDocument()
  })
  it('AC4: pending stat definitions with an empty selection show only the empty text', async () => {
    const pending = deferred<ReturnType<typeof compareStatDefs>['players']>()
    setup({
      provider: compareProvider({ getStatDefs: vi.fn(() => pending.promise) }),
      defaults: compareDefaults({ players: [] }),
    })
    await flush()
    none()
    expect(screen.getAllByText('Add a player to start comparing.')).toHaveLength(1)
  })
  it('AC4: a failed entity load shows no 3D chart and does not crash', async () => {
    setup({
      provider: compareProvider({ getEntities: vi.fn(() => Promise.reject(new Error('boom'))) }),
    })
    await flush()
    none()
    expect(screen.queryByText(emptyText)).not.toBeInTheDocument()
    expect(screen.getByRole('tablist', { name: 'View' })).toBeInTheDocument()
  })
  it('AC4: a failed entity load with an empty selection shows only the empty text', async () => {
    setup({
      provider: compareProvider({ getEntities: vi.fn(() => Promise.reject(new Error('boom'))) }),
      defaults: compareDefaults({ players: [] }),
    })
    await flush()
    none()
    expect(screen.getAllByText('Add a player to start comparing.')).toHaveLength(1)
  })
  it('AC4: a failed stat definition load shows no 3D chart and does not crash', async () => {
    setup({
      provider: compareProvider({ getStatDefs: vi.fn(() => Promise.reject(new Error('boom'))) }),
    })
    await flush()
    none()
    expect(screen.queryByText(emptyText)).not.toBeInTheDocument()
  })
  it('AC4: switching to teams while their data is pending drops the player chart', async () => {
    const pending = deferred<Entity[]>()
    const base = compareProvider()
    const getEntities = vi.fn((l: string, kind: EntityKind, season: string) =>
      kind === 'teams' ? pending.promise : base.getEntities(l, kind, season),
    )
    const { user } = setup({ provider: compareProvider({ getEntities }) })
    await screen.findByRole('group', { name: '3D chart' })
    await user.click(probe('probe to teams'))
    await flush()
    none()
    await act(async () => pending.resolve(compareTeams()))
    expect(await screen.findByRole('group', { name: '3D chart' })).toBeInTheDocument()
    expect(axisSelect('X axis')).toHaveDisplayValue('Ztpts')
  })
})

describe('T14 AC5: no 3D content on other views', () => {
  it('AC5: the Table view has no 3D group, axis select or Reset view button', async () => {
    const ctx = setup()
    await toTable(ctx)
    expect(chart3d()).toBeNull()
    expect(screen.queryByRole('combobox', { name: 'X axis' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Reset view' })).toBeNull()
    expect(screen.queryByRole('heading', { name: 'Readout' })).toBeNull()
  })
  it('AC5: the 2D view has none of them for Bars or Radar', async () => {
    const ctx = setup()
    await to2D(ctx)
    for (const mode of ['Bars', 'Radar']) {
      await ctx.user.click(screen.getByRole('button', { name: mode }))
      await flush()
      expect(chart3d()).toBeNull()
      expect(screen.queryByRole('combobox', { name: 'Z axis' })).toBeNull()
      expect(screen.queryByRole('button', { name: 'Reset view' })).toBeNull()
      expect(screen.queryByRole('heading', { name: 'Readout' })).toBeNull()
    }
  })
  it('AC5: the empty-selection readout is not rendered on Table or 2D', async () => {
    const { user } = setup({ defaults: compareDefaults({ players: [] }) })
    await user.click(tab('Table'))
    expect(await screen.findAllByText(emptyText)).toHaveLength(1)
    expect(screen.queryByRole('heading', { name: 'Readout' })).toBeNull()
    await user.click(tab('2D chart'))
    expect(await screen.findAllByText(emptyText)).toHaveLength(1)
    expect(screen.queryByRole('heading', { name: 'Readout' })).toBeNull()
  })
})

describe('T14 AC9: axes persist per kind', () => {
  it('AC9: changing X for players, visiting teams and returning keeps the changed X', async () => {
    const { user } = setup()
    await screen.findByRole('group', { name: '3D chart' })
    await user.selectOptions(axisSelect('X axis'), 'zsign')
    expect(axisSelect('X axis')).toHaveDisplayValue('Zsign')
    await user.click(probe('probe to teams'))
    await screen.findByRole('combobox', { name: 'X axis' })
    expect(axisSelect('X axis')).toHaveDisplayValue('Ztpts')
    expect(axisSelect('Y axis')).toHaveDisplayValue('Ztlow')
    expect(axisSelect('Z axis')).toHaveDisplayValue('Ztwin')
    await user.click(probe('probe to players'))
    await screen.findByRole('combobox', { name: 'X axis' })
    expect(axisSelect('X axis')).toHaveDisplayValue('Zsign')
    expect(axisSelect('Y axis')).toHaveDisplayValue('Zlow')
    expect(screen.getByText('X · Zsign')).toBeInTheDocument()
  })
  it('AC9: an axis change for teams does not change the players axes', async () => {
    const { user } = setup()
    await user.click(probe('probe to teams'))
    await screen.findByRole('combobox', { name: 'X axis' })
    await user.selectOptions(axisSelect('Y axis'), 'ztwin')
    expect(axisSelect('Y axis')).toHaveDisplayValue('Ztwin')
    await user.click(probe('probe to players'))
    await screen.findByRole('combobox', { name: 'X axis' })
    expect(axisSelect('Y axis')).toHaveDisplayValue('Zlow')
  })
  it('AC9: the options offered match the stats of the current kind', async () => {
    const { user } = setup()
    await screen.findByRole('combobox', { name: 'X axis' })
    const labels = () =>
      within(axisSelect('X axis'))
        .getAllByRole('option')
        .map((o) => o.textContent)
    expect(labels()).toEqual(['Zhigh', 'Zlow', 'Zbig', 'Zsign', 'Zsolo'])
    await user.click(probe('probe to teams'))
    await screen.findByRole('combobox', { name: 'X axis' })
    expect(labels()).toEqual(['Ztpts', 'Ztlow', 'Ztwin'])
  })
})
