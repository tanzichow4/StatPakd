import { act, fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { DataSource } from '../../dataSource'
import type { DataProvider } from '../../domain/provider'
import type { EntityKind, LeagueUiDefaults, StatDef } from '../../domain/types'
import { useAppState } from '../../state'
import { AppStateProvider } from '../../state/AppStateProvider'
import {
  createFixtureProvider,
  deferred,
  fixtureSidebarStatDefs,
  fixtureSidebarUiDefaults,
} from '../../test/fixtureProvider'
import { AnnouncerProvider } from '../a11y'
import { StatSidebar } from './StatSidebar'

function Probe() {
  const { state, dispatch } = useAppState()
  const [count, setCount] = useState(0)
  const { kind, stats, addStatOpen } = state
  return (
    <div>
      <output data-testid="state">{JSON.stringify({ kind, stats, addStatOpen })}</output>
      <button type="button" onClick={() => dispatch({ type: 'setKind', kind: 'teams' })}>
        probe to teams
      </button>
      <button type="button" onClick={() => dispatch({ type: 'setKind', kind: 'players' })}>
        probe to players
      </button>
      <button type="button" onClick={() => setCount((c) => c + 1)}>
        probe count
      </button>
      <output data-testid="count">{count}</output>
    </div>
  )
}

interface Options {
  defaults?: LeagueUiDefaults
  getStatDefs?: DataProvider['getStatDefs']
}

function setup({ defaults = fixtureSidebarUiDefaults(), getStatDefs }: Options = {}) {
  const defs = fixtureSidebarStatDefs()
  const provider = createFixtureProvider({
    getStatDefs:
      getStatDefs ?? vi.fn((_leagueId: string, kind: EntityKind) => Promise.resolve(defs[kind])),
  })
  const user = userEvent.setup()
  const view = render(
    <DataSource provider={provider}>
      <AppStateProvider defaults={defaults} statDefs={defs}>
        <AnnouncerProvider>
          <StatSidebar />
          <Probe />
        </AnnouncerProvider>
      </AppStateProvider>
    </DataSource>,
  )
  return { provider, user, ...view }
}

function defaultsWith(players: string[]): LeagueUiDefaults {
  const d = fixtureSidebarUiDefaults()
  d.players.stats = players
  return d
}

const readState = () => JSON.parse(screen.getByTestId('state').textContent ?? '{}')
const sidebar = () => screen.getByRole('complementary', { name: 'Stats' })
const headings = () => within(sidebar()).queryAllByRole('heading', { level: 2 })
const headingNames = () => headings().map((h) => h.textContent)
const addBtn = (group: string) => screen.getByRole('button', { name: `Add stat to ${group}` })
const queryAddBtn = (group: string) =>
  screen.queryByRole('button', { name: `Add stat to ${group}` })
const menus = () => screen.queryAllByRole('group', { name: /^Stats to add to/ })
const menuItems = (group: string) =>
  within(screen.getByRole('group', { name: `Stats to add to ${group}` }))
    .getAllByRole('button')
    .map((b) => b.textContent)
const rowNames = () =>
  within(sidebar())
    .queryAllByRole('checkbox')
    .map((c) => c.closest('label')?.textContent)
const groupRows = (group: string) =>
  within(screen.getByRole('group', { name: group }))
    .queryAllByRole('checkbox')
    .map((c) => c.closest('label')?.textContent)
const box = (name: string) => screen.getByRole('checkbox', { name })
const flush = () => act(async () => {})

async function ready() {
  expect(await screen.findByRole('checkbox', { name: 'Zscore' })).toBeInTheDocument()
}

describe('AC2/AC5: groups and per-kind selection', () => {
  it('AC2: headings are the groups in first-appearance order', async () => {
    setup()
    await ready()
    expect(headingNames()).toEqual(['zalpha', 'zbeta', 'zgamma', 'zdelta'])
  })
  it('AC22: the sidebar is a complementary region named Stats', async () => {
    setup()
    await ready()
    expect(sidebar()).toBeInTheDocument()
  })
  it('AC5: switching to teams shows the team groups, back shows the earlier selection', async () => {
    const { user } = setup()
    await ready()
    await user.click(box('Zkilt'))
    await user.click(screen.getByRole('button', { name: 'probe to teams' }))
    expect(await screen.findByRole('checkbox', { name: 'Ztpts' })).toBeInTheDocument()
    expect(headingNames()).toEqual(['ztoff', 'ztdef'])
    await user.click(screen.getByRole('button', { name: 'probe to players' }))
    expect(await screen.findByRole('checkbox', { name: 'Zscore' })).toBeInTheDocument()
    expect(rowNames()).toEqual(['Zscore', 'Zgrit'])
  })
})

describe('AC3/AC4/AC7: rows', () => {
  it('AC3: a group lists only its selected stats, checked', async () => {
    setup()
    await ready()
    expect(groupRows('zalpha')).toEqual(['Zscore'])
    expect(box('Zscore')).toBeChecked()
    expect(screen.queryByRole('checkbox', { name: 'Zblip' })).not.toBeInTheDocument()
    expect(screen.queryByRole('checkbox', { name: 'Zdrift' })).not.toBeInTheDocument()
  })
  it('AC3: rows follow definition order regardless of the selection order', async () => {
    setup({ defaults: defaultsWith(['zdrift', 'zscore', 'zblip']) })
    await ready()
    expect(groupRows('zalpha')).toEqual(['Zscore', 'Zblip', 'Zdrift'])
  })
  it('AC4: a group with nothing selected keeps its heading and Add button, no checkbox', async () => {
    setup()
    await ready()
    expect(headingNames()).toContain('zdelta')
    expect(addBtn('zdelta')).toBeInTheDocument()
    expect(groupRows('zdelta')).toEqual([])
  })
  it('AC7: a selected key without a definition is not rendered, other rows are fine', async () => {
    setup({ defaults: defaultsWith(['zscore', 'zghost', 'zgrit']) })
    await ready()
    expect(rowNames()).toEqual(['Zscore', 'Zgrit'])
  })
})

describe('AC8: deselecting', () => {
  it('AC8: clicking the label text removes the row and the key', async () => {
    const { user } = setup()
    await ready()
    await user.click(screen.getByText('Zgrit'))
    expect(screen.queryByRole('checkbox', { name: 'Zgrit' })).not.toBeInTheDocument()
    expect(readState().stats.players).toEqual(['zscore', 'zkilt'])
  })
  it('AC8: clicking the box removes the row and the key', async () => {
    const { user } = setup()
    await ready()
    await user.click(box('Zgrit'))
    expect(screen.queryByRole('checkbox', { name: 'Zgrit' })).not.toBeInTheDocument()
    expect(readState().stats.players).toEqual(['zscore', 'zkilt'])
  })
  it('AC8: Space on the focused checkbox removes the row and the key', async () => {
    const { user } = setup()
    await ready()
    box('Zgrit').focus()
    await user.keyboard(' ')
    expect(screen.queryByRole('checkbox', { name: 'Zgrit' })).not.toBeInTheDocument()
    expect(readState().stats.players).toEqual(['zscore', 'zkilt'])
  })
  it('AC8: a deselected stat shows up in its group menu', async () => {
    const { user } = setup()
    await ready()
    await user.click(box('Zgrit'))
    await user.click(addBtn('zbeta'))
    expect(menuItems('zbeta')).toEqual(['Zgrit', 'Zhum', 'Zjolt'])
  })
})

describe('AC9: the last stat is locked', () => {
  async function toTeams(user: ReturnType<typeof userEvent.setup>) {
    await user.click(screen.getByRole('button', { name: 'probe to teams' }))
    expect(await screen.findByRole('checkbox', { name: 'Ztpts' })).toBeInTheDocument()
  }
  it('AC9: the only stat is aria-disabled, stays checked after click and Space', async () => {
    const { user } = setup()
    await ready()
    await toTeams(user)
    expect(box('Ztpts')).toHaveAttribute('aria-disabled', 'true')
    await user.click(box('Ztpts'))
    box('Ztpts').focus()
    await user.keyboard(' ')
    expect(box('Ztpts')).toBeChecked()
    expect(readState().stats.teams).toEqual(['ztpts'])
  })
  it('AC9: clicking the locked label text changes nothing', async () => {
    const { user } = setup()
    await ready()
    await toTeams(user)
    await user.click(screen.getByText('Ztpts'))
    expect(readState().stats.teams).toEqual(['ztpts'])
  })
  it('AC9: after adding a second stat the first is no longer aria-disabled', async () => {
    const { user } = setup()
    await ready()
    await toTeams(user)
    await user.click(addBtn('ztdef'))
    await user.click(screen.getByRole('button', { name: 'Ztblk' }))
    expect(box('Ztpts')).not.toHaveAttribute('aria-disabled', 'true')
    await user.click(box('Ztpts'))
    expect(readState().stats.teams).toEqual(['ztblk'])
  })
  it('AC9: deselecting down to one locks the survivor', async () => {
    const { user } = setup()
    await ready()
    await user.click(box('Zgrit'))
    await user.click(box('Zkilt'))
    expect(box('Zscore')).toHaveAttribute('aria-disabled', 'true')
    await user.click(box('Zscore'))
    expect(readState().stats.players).toEqual(['zscore'])
  })
  it('AC9: with several stats selected no checkbox is aria-disabled', async () => {
    setup()
    await ready()
    const flags = within(sidebar())
      .getAllByRole('checkbox')
      .map((c) => c.getAttribute('aria-disabled'))
    expect(flags).toEqual([null, null, null])
  })
})

describe('AC10: Add button visibility', () => {
  it('AC10: a fully selected group has no Add button', async () => {
    setup()
    await ready()
    expect(queryAddBtn('zgamma')).not.toBeInTheDocument()
    expect(queryAddBtn('zalpha')).toBeInTheDocument()
  })
  it('AC10: the Add button disappears after the last unselected stat is added', async () => {
    const { user } = setup()
    await ready()
    await user.click(addBtn('zalpha'))
    await user.click(screen.getByRole('button', { name: 'Zblip' }))
    expect(queryAddBtn('zalpha')).toBeInTheDocument()
    await user.click(addBtn('zalpha'))
    await user.click(screen.getByRole('button', { name: 'Zdrift' }))
    expect(queryAddBtn('zalpha')).not.toBeInTheDocument()
  })
  it('AC10: deselecting from a full group brings the Add button back', async () => {
    const { user } = setup()
    await ready()
    await user.click(box('Zkilt'))
    expect(queryAddBtn('zgamma')).toBeInTheDocument()
  })
})

describe('AC11: opening the menu', () => {
  it('AC11: lists exactly the unselected stats in definition order', async () => {
    const { user } = setup()
    await ready()
    await user.click(addBtn('zalpha'))
    expect(menuItems('zalpha')).toEqual(['Zblip', 'Zdrift'])
  })
  it('AC11: the Add button again closes the menu', async () => {
    const { user } = setup()
    await ready()
    await user.click(addBtn('zalpha'))
    await user.click(addBtn('zalpha'))
    expect(menus()).toHaveLength(0)
    expect(readState().addStatOpen).toBeNull()
  })
  it('AC11: opening another group closes the first, one menu at a time', async () => {
    const { user } = setup()
    await ready()
    await user.click(addBtn('zalpha'))
    await user.click(addBtn('zbeta'))
    expect(menus()).toHaveLength(1)
    expect(menuItems('zbeta')).toEqual(['Zhum', 'Zjolt'])
  })
  it('AC11: Enter on the Add button opens the menu', async () => {
    const { user } = setup()
    await ready()
    addBtn('zalpha').focus()
    await user.keyboard('{Enter}')
    expect(menus()).toHaveLength(1)
  })
  it('AC11: Space on the Add button opens the menu', async () => {
    const { user } = setup()
    await ready()
    addBtn('zalpha').focus()
    await user.keyboard(' ')
    expect(menus()).toHaveLength(1)
  })
  it('AC11: a group with nothing selected opens a menu with its stat', async () => {
    const { user } = setup()
    await ready()
    await user.click(addBtn('zdelta'))
    expect(menuItems('zdelta')).toEqual(['Zlorn'])
  })
  it('AC11: no menu is open initially', async () => {
    setup()
    await ready()
    expect(menus()).toHaveLength(0)
  })
})

describe('AC12: Add button semantics', () => {
  it('AC12: aria-expanded goes false then true', async () => {
    const { user } = setup()
    await ready()
    expect(addBtn('zalpha')).toHaveAttribute('aria-expanded', 'false')
    await user.click(addBtn('zalpha'))
    expect(addBtn('zalpha')).toHaveAttribute('aria-expanded', 'true')
  })
  it('AC12: while open aria-controls equals the menu id', async () => {
    const { user } = setup()
    await ready()
    await user.click(addBtn('zalpha'))
    const menu = screen.getByRole('group', { name: 'Stats to add to zalpha' })
    expect(menu.id).not.toBe('')
    expect(addBtn('zalpha')).toHaveAttribute('aria-controls', menu.id)
  })
  it('AC12: a closed Add button has no aria-controls', async () => {
    setup()
    await ready()
    expect(addBtn('zalpha')).not.toHaveAttribute('aria-controls')
  })
  it('AC12: only the open group reports aria-expanded true', async () => {
    const { user } = setup()
    await ready()
    await user.click(addBtn('zalpha'))
    expect(addBtn('zbeta')).toHaveAttribute('aria-expanded', 'false')
  })
  it('AC12: accessible names carry the group name and the visible text is Add stat', async () => {
    setup()
    await ready()
    expect(addBtn('zalpha')).toHaveTextContent('Add stat')
    expect(addBtn('zbeta')).toBeInTheDocument()
    expect(addBtn('zdelta')).toBeInTheDocument()
  })
})

describe('AC13: picking a stat', () => {
  it('AC13: picks land in canonical position and each pick closes the menu', async () => {
    const { user } = setup()
    await ready()
    await user.click(addBtn('zalpha'))
    await user.click(screen.getByRole('button', { name: 'Zdrift' }))
    expect(menus()).toHaveLength(0)
    expect(groupRows('zalpha')).toEqual(['Zscore', 'Zdrift'])
    await user.click(addBtn('zalpha'))
    await user.click(screen.getByRole('button', { name: 'Zblip' }))
    expect(menus()).toHaveLength(0)
    expect(groupRows('zalpha')).toEqual(['Zscore', 'Zblip', 'Zdrift'])
    expect(readState().stats.players).toEqual(['zscore', 'zblip', 'zdrift', 'zgrit', 'zkilt'])
  })
  it('AC13: picking from an empty group adds its first row', async () => {
    const { user } = setup()
    await ready()
    await user.click(addBtn('zdelta'))
    await user.click(screen.getByRole('button', { name: 'Zlorn' }))
    expect(groupRows('zdelta')).toEqual(['Zlorn'])
    expect(readState().stats.players).toEqual(['zscore', 'zgrit', 'zkilt', 'zlorn'])
  })
  it('AC13: the picked item leaves the menu on the next open', async () => {
    const { user } = setup()
    await ready()
    await user.click(addBtn('zbeta'))
    await user.click(screen.getByRole('button', { name: 'Zhum' }))
    await user.click(addBtn('zbeta'))
    expect(menuItems('zbeta')).toEqual(['Zjolt'])
  })
  it('AC13: Enter on a menu item picks it', async () => {
    const { user } = setup()
    await ready()
    addBtn('zbeta').focus()
    await user.keyboard('{Enter}')
    await user.keyboard('{Enter}')
    expect(readState().stats.players).toEqual(['zscore', 'zgrit', 'zhum', 'zkilt'])
  })
})

describe('AC17/AC19/AC27: focus management', () => {
  it('AC17: opening a menu focuses its first item', async () => {
    const { user } = setup()
    await ready()
    await user.click(addBtn('zalpha'))
    expect(screen.getByRole('button', { name: 'Zblip' })).toHaveFocus()
  })
  it('AC17: opening another group moves focus to that menu first item', async () => {
    const { user } = setup()
    await ready()
    await user.click(addBtn('zalpha'))
    await user.click(addBtn('zbeta'))
    expect(screen.getByRole('button', { name: 'Zhum' })).toHaveFocus()
  })
  it('AC19: after a pick the new checkbox has focus', async () => {
    const { user } = setup()
    await ready()
    await user.click(addBtn('zalpha'))
    await user.click(screen.getByRole('button', { name: 'Zdrift' }))
    expect(box('Zdrift')).toHaveFocus()
  })
  it('AC19: after picking the last unselected stat the new checkbox still has focus', async () => {
    const { user } = setup()
    await ready()
    await user.click(addBtn('zdelta'))
    await user.click(screen.getByRole('button', { name: 'Zlorn' }))
    expect(box('Zlorn')).toHaveFocus()
  })
  it('AC27: deselecting a middle row focuses the next row', async () => {
    const { user } = setup({ defaults: defaultsWith(['zscore', 'zblip', 'zdrift', 'zgrit']) })
    await ready()
    box('Zblip').focus()
    await user.keyboard(' ')
    expect(box('Zdrift')).toHaveFocus()
  })
  it('AC27: deselecting the first row focuses the next row', async () => {
    const { user } = setup({ defaults: defaultsWith(['zscore', 'zblip', 'zdrift', 'zgrit']) })
    await ready()
    box('Zscore').focus()
    await user.keyboard(' ')
    expect(box('Zblip')).toHaveFocus()
  })
  it('AC27: deselecting the last row focuses the previous row', async () => {
    const { user } = setup({ defaults: defaultsWith(['zscore', 'zblip', 'zdrift', 'zgrit']) })
    await ready()
    await user.click(box('Zdrift'))
    expect(box('Zblip')).toHaveFocus()
  })
  it('AC27: deselecting the only row of a group focuses that group Add button', async () => {
    const { user } = setup()
    await ready()
    await user.click(box('Zgrit'))
    expect(addBtn('zbeta')).toHaveFocus()
  })
  it('AC27: the next row is in the same group, not the next group', async () => {
    const { user } = setup({ defaults: defaultsWith(['zscore', 'zblip', 'zgrit']) })
    await ready()
    await user.click(box('Zblip'))
    expect(box('Zscore')).toHaveFocus()
  })
  it('AC9: a locked click moves no focus away and removes nothing', async () => {
    const { user } = setup({ defaults: defaultsWith(['zscore']) })
    await ready()
    await user.click(box('Zscore'))
    expect(box('Zscore')).toHaveFocus()
  })
})

describe('AC21: keyboard-only operation', () => {
  it('AC21: Tab reaches every stat checkbox and Add button in visual order', async () => {
    const { user } = setup()
    await ready()
    const seen: (string | null)[] = []
    for (let i = 0; i < 5; i += 1) {
      await user.tab()
      seen.push(
        document.activeElement?.getAttribute('aria-label') ??
          document.activeElement?.closest('label')?.textContent ??
          null,
      )
    }
    expect(seen).toEqual(['Zscore', 'Add stat to zalpha', 'Zgrit', 'Add stat to zbeta', 'Zkilt'])
  })
  it('AC21: the locked last stat is still reachable by Tab', async () => {
    const { user } = setup({ defaults: defaultsWith(['zscore']) })
    await ready()
    await user.tab()
    expect(box('Zscore')).toHaveFocus()
  })
  it('AC21: a full keyboard cycle opens, picks, then deselects', async () => {
    const { user } = setup()
    await ready()
    addBtn('zalpha').focus()
    await user.keyboard('{Enter}')
    await user.keyboard('{Enter}')
    expect(box('Zblip')).toHaveFocus()
    await user.keyboard(' ')
    expect(readState().stats.players).toEqual(['zscore', 'zgrit', 'zkilt'])
  })
})

describe('AC6: loading, empty and failure', () => {
  it('AC6: while loading the sidebar region exists with no groups', async () => {
    const d = deferred<StatDef[]>()
    setup({ getStatDefs: vi.fn(() => d.promise) })
    await flush()
    expect(sidebar()).toBeInTheDocument()
    expect(headings()).toHaveLength(0)
  })
  it('AC6: an empty provider result gives no groups and no crash', async () => {
    setup({ getStatDefs: vi.fn(() => Promise.resolve([])) })
    await flush()
    expect(sidebar()).toBeInTheDocument()
    expect(headings()).toHaveLength(0)
  })
  it('AC6: a rejected getStatDefs gives no groups and the region stays', async () => {
    setup({ getStatDefs: vi.fn(() => Promise.reject(new Error('boom'))) })
    await flush()
    expect(sidebar()).toBeInTheDocument()
    expect(headings()).toHaveLength(0)
  })
  it('AC6: a stale players response after switching to teams is never shown', async () => {
    const defs = fixtureSidebarStatDefs()
    const pending: Record<EntityKind, ReturnType<typeof deferred<StatDef[]>>> = {
      players: deferred<StatDef[]>(),
      teams: deferred<StatDef[]>(),
    }
    const { user } = setup({
      getStatDefs: vi.fn((_leagueId: string, kind: EntityKind) => pending[kind].promise),
    })
    await flush()
    await user.click(screen.getByRole('button', { name: 'probe to teams' }))
    await act(async () => pending.teams.resolve(defs.teams))
    expect(headingNames()).toEqual(['ztoff', 'ztdef'])
    await act(async () => pending.players.resolve(defs.players))
    expect(headingNames()).toEqual(['ztoff', 'ztdef'])
  })
  it('AC1: the sidebar asks the provider for the stat defs of the current kind', async () => {
    const { provider, user } = setup()
    await ready()
    await user.click(screen.getByRole('button', { name: 'probe to teams' }))
    await screen.findByRole('checkbox', { name: 'Ztpts' })
    expect(provider.getStatDefs).toHaveBeenCalledWith('zorb', 'players')
    expect(provider.getStatDefs).toHaveBeenCalledWith('zorb', 'teams')
  })
})

describe('AC14/AC18: Escape', () => {
  it('AC14: Escape on a menu item closes the menu and focuses the Add button', async () => {
    const { user } = setup()
    await ready()
    await user.click(addBtn('zalpha'))
    await user.keyboard('{Escape}')
    expect(menus()).toHaveLength(0)
    expect(addBtn('zalpha')).toHaveFocus()
    expect(readState().addStatOpen).toBeNull()
  })
  it('AC18: Escape on the open Add button closes the menu and keeps focus there', async () => {
    const { user } = setup()
    await ready()
    await user.click(addBtn('zalpha'))
    addBtn('zalpha').focus()
    await user.keyboard('{Escape}')
    expect(menus()).toHaveLength(0)
    expect(addBtn('zalpha')).toHaveFocus()
  })
  it('AC14: the Escape keydown does not propagate to a document listener', async () => {
    const { user } = setup()
    await ready()
    const spy = vi.fn()
    document.addEventListener('keydown', spy)
    try {
      await user.click(addBtn('zalpha'))
      spy.mockClear()
      await user.keyboard('{Escape}')
      expect(spy).not.toHaveBeenCalled()
    } finally {
      document.removeEventListener('keydown', spy)
    }
  })
  it('AC14: Escape with no menu open leaves the state alone', async () => {
    const { user } = setup()
    await ready()
    const before = readState()
    box('Zscore').focus()
    await user.keyboard('{Escape}')
    expect(readState()).toEqual(before)
  })
  it('AC14: the selection is unchanged after Escape', async () => {
    const { user } = setup()
    await ready()
    await user.click(addBtn('zalpha'))
    await user.keyboard('{Escape}')
    expect(readState().stats.players).toEqual(['zscore', 'zgrit', 'zkilt'])
  })
})

describe('AC15/AC20: outside press', () => {
  it('AC15: pressing an outside button closes the menu, the button still acts, no focus steal', async () => {
    const { user } = setup()
    await ready()
    await user.click(addBtn('zalpha'))
    await user.click(screen.getByRole('button', { name: 'probe count' }))
    expect(menus()).toHaveLength(0)
    expect(screen.getByTestId('count')).toHaveTextContent('1')
    expect(screen.getByRole('button', { name: 'probe count' })).toHaveFocus()
  })
  it('AC20: an outside close does not focus the Add button', async () => {
    const { user } = setup()
    await ready()
    await user.click(addBtn('zalpha'))
    await user.click(screen.getByRole('button', { name: 'probe count' }))
    expect(addBtn('zalpha')).not.toHaveFocus()
  })
  it('AC15: pressing the empty page body closes the menu', async () => {
    const { user } = setup()
    await ready()
    await user.click(addBtn('zalpha'))
    await user.click(document.body)
    expect(menus()).toHaveLength(0)
    expect(readState().addStatOpen).toBeNull()
  })
  it('AC15: pressing the menu padding (not an item) keeps it open', async () => {
    const { user } = setup()
    await ready()
    await user.click(addBtn('zalpha'))
    const menu = screen.getByRole('group', { name: 'Stats to add to zalpha' })
    await user.pointer({ keys: '[MouseLeft>]', target: menu })
    await user.pointer({ keys: '[/MouseLeft]', target: menu })
    expect(menus()).toHaveLength(1)
  })
  it('AC15: pressing a stat checkbox elsewhere closes the menu and toggles it', async () => {
    const { user } = setup()
    await ready()
    await user.click(addBtn('zalpha'))
    await user.click(box('Zgrit'))
    expect(menus()).toHaveLength(0)
    expect(readState().stats.players).toEqual(['zscore', 'zkilt'])
  })
  it('AC11: clicking another group Add button while open closes the first and opens the second', async () => {
    const { user } = setup()
    await ready()
    await user.click(addBtn('zalpha'))
    await user.click(addBtn('zbeta'))
    expect(menus()).toHaveLength(1)
    expect(readState().addStatOpen).toBe('zbeta')
  })
  it('AC15: after an Escape close a later outside press changes nothing', async () => {
    const { user } = setup()
    await ready()
    await user.click(addBtn('zalpha'))
    await user.keyboard('{Escape}')
    const before = readState()
    await user.click(screen.getByRole('button', { name: 'probe count' }))
    expect(readState()).toEqual(before)
  })
  it('AC15: unmounting with the menu open then pressing outside raises no error', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    try {
      const { user, unmount } = setup()
      await ready()
      await user.click(addBtn('zalpha'))
      unmount()
      fireEvent.pointerDown(document.body)
      fireEvent.click(document.body)
      expect(spy).not.toHaveBeenCalled()
    } finally {
      spy.mockRestore()
    }
  })
})

describe('AC16: kind switch closes the menu', () => {
  it('AC16: switching kind by click only (no pointerdown) closes the open menu', async () => {
    const { user } = setup()
    await ready()
    await user.click(addBtn('zalpha'))
    expect(readState().addStatOpen).toBe('zalpha')
    fireEvent.click(screen.getByRole('button', { name: 'probe to teams' }))
    expect(readState().addStatOpen).toBeNull()
    await screen.findByRole('checkbox', { name: 'Ztpts' })
    expect(menus()).toHaveLength(0)
  })
  it('AC16: switching back shows no menu open', async () => {
    const { user } = setup()
    await ready()
    await user.click(addBtn('zalpha'))
    fireEvent.click(screen.getByRole('button', { name: 'probe to teams' }))
    await screen.findByRole('checkbox', { name: 'Ztpts' })
    fireEvent.click(screen.getByRole('button', { name: 'probe to players' }))
    await screen.findByRole('checkbox', { name: 'Zscore' })
    expect(menus()).toHaveLength(0)
    expect(readState().addStatOpen).toBeNull()
    expect(addBtn('zalpha')).toHaveAttribute('aria-expanded', 'false')
  })
  it('AC16: a stale addStatOpen naming a group of another kind renders no menu', async () => {
    const { user } = setup()
    await ready()
    await user.click(addBtn('zalpha'))
    fireEvent.click(screen.getByRole('button', { name: 'probe to teams' }))
    await screen.findByRole('checkbox', { name: 'Ztpts' })
    await flush()
    expect(menus()).toHaveLength(0)
  })
})

describe('F1 regression: pressing another Add button keeps the layout stable', () => {
  it('AC15: pointerdown on another group Add button does not close the open menu', async () => {
    const { user } = setup()
    await ready()
    await user.click(addBtn('zalpha'))
    fireEvent.pointerDown(addBtn('zbeta'))
    expect(menus()).toHaveLength(1)
    expect(readState().addStatOpen).toBe('zalpha')
  })
  it('AC11: a full press on another Add button leaves only that menu open', async () => {
    const { user } = setup()
    await ready()
    await user.click(addBtn('zalpha'))
    fireEvent.pointerDown(addBtn('zbeta'))
    fireEvent.click(addBtn('zbeta'))
    expect(menus()).toHaveLength(1)
    expect(menuItems('zbeta')).toEqual(['Zhum', 'Zjolt'])
    expect(readState().addStatOpen).toBe('zbeta')
  })
  it('AC15: pointerdown on a truly outside element still closes the open menu', async () => {
    const { user } = setup()
    await ready()
    await user.click(addBtn('zalpha'))
    fireEvent.pointerDown(document.body)
    expect(menus()).toHaveLength(0)
    expect(readState().addStatOpen).toBeNull()
  })
  it('AC11: clicking the same group Add button still toggles its menu closed', async () => {
    const { user } = setup()
    await ready()
    await user.click(addBtn('zalpha'))
    fireEvent.pointerDown(addBtn('zalpha'))
    fireEvent.click(addBtn('zalpha'))
    expect(menus()).toHaveLength(0)
    expect(readState().addStatOpen).toBeNull()
  })
})

describe('T18 AC15: stat announcements', () => {
  async function toTeams(user: ReturnType<typeof userEvent.setup>) {
    await user.click(screen.getByRole('button', { name: 'probe to teams' }))
    expect(await screen.findByRole('checkbox', { name: 'Ztpts' })).toBeInTheDocument()
  }
  const live = () => document.querySelector('[aria-live="polite"]')?.textContent?.trim()

  it('AC15: starts empty', async () => {
    setup()
    await ready()
    expect(live()).toBe('')
  })
  it('AC15: unchecking a stat announces "<label> removed"', async () => {
    const { user } = setup()
    await ready()
    await user.click(box('Zgrit'))
    expect(live()).toBe('Zgrit removed')
  })
  it('AC15: picking from the Add menu announces "<label> added"', async () => {
    const { user } = setup()
    await ready()
    await toTeams(user)
    await user.click(addBtn('ztdef'))
    await user.click(screen.getByRole('button', { name: 'Ztblk' }))
    expect(live()).toBe('Ztblk added')
  })
  it('AC15: the locked last stat announces nothing', async () => {
    const { user } = setup()
    await ready()
    await toTeams(user)
    await user.click(box('Ztpts'))
    expect(live()).toBe('')
  })
})
