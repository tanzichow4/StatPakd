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
  it('AC32: on the default 3D view no table, entity name or stat label is in the DOM', async () => {
    setup()
    await flush()
    expect(tableEl()).toBeNull()
    expect(screen.queryByText('Ola Quenby')).not.toBeInTheDocument()
    expect(screen.queryByText('Zhigh')).not.toBeInTheDocument()
    expect(caption()).toBeNull()
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
  it('AC32: the placeholder text exists only in the selected panel', async () => {
    const { user } = setup()
    await user.click(tab('2D chart'))
    expect(screen.queryByText(/3D chart — coming soon/)).not.toBeInTheDocument()
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
    ).toEqual(['Bars', 'Radar'])
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
  it('AC8: 3D shows the 3D chart coming-soon placeholder', async () => {
    setup()
    expect(await screen.findByText('3D chart — coming soon')).toBeInTheDocument()
  })
  it('AC8: 2D shows Bars chart, then Radar chart after toggling', async () => {
    const { user } = setup()
    await user.click(tab('2D chart'))
    expect(await screen.findByText('Bars chart — coming soon')).toBeInTheDocument()
    expect(screen.queryByText(/Radar chart/)).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Radar' }))
    expect(screen.getByText('Radar chart — coming soon')).toBeInTheDocument()
    expect(screen.queryByText(/Bars chart/)).not.toBeInTheDocument()
  })
  it('AC8: the placeholder has no controls of its own', async () => {
    setup()
    const panel = screen.getByRole('tabpanel', { name: '3D chart' })
    await flush()
    expect(within(panel).queryAllByRole('button')).toHaveLength(0)
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
