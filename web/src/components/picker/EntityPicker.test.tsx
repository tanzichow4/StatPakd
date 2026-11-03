import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { DataSource } from '../../dataSource'
import type { DataProvider } from '../../domain/provider'
import type { LeagueUiDefaults } from '../../domain/types'
import { MAX_SELECTED, useAppState } from '../../state'
import { AppStateProvider } from '../../state/AppStateProvider'
import { seriesColor } from '../../styles/series'
import { entitiesProvider, fixtureStatDefs, fixtureUiDefaults } from '../../test/fixtureProvider'
import { EntityPicker } from './EntityPicker'

function StateProbe() {
  const { state, dispatch } = useAppState()
  const { kind, q, pos, addOpen, sel, teamMode } = state
  return (
    <div>
      <output data-testid="state">
        {JSON.stringify({ kind, q, pos, addOpen, sel, teamMode })}
      </output>
      <button type="button" onClick={() => dispatch({ type: 'setKind', kind: 'teams' })}>
        probe to teams
      </button>
      <button type="button" onClick={() => dispatch({ type: 'setKind', kind: 'players' })}>
        probe to players
      </button>
      <button type="button" onClick={() => dispatch({ type: 'setTeamMode', mode: 'inside' })}>
        probe inside
      </button>
    </div>
  )
}

interface Options {
  provider?: DataProvider
  players?: string[]
  teams?: string[]
}

function setup({ provider = entitiesProvider(), players, teams }: Options = {}) {
  const defaults: LeagueUiDefaults = fixtureUiDefaults()
  if (players) defaults.players.sel = players
  if (teams) defaults.teams.sel = teams
  const view = render(
    <DataSource provider={provider}>
      <AppStateProvider defaults={defaults} statDefs={fixtureStatDefs()}>
        <EntityPicker />
        <StateProbe />
      </AppStateProvider>
    </DataSource>,
  )
  return { provider, ...view }
}

const readState = () => JSON.parse(screen.getByTestId('state').textContent ?? '{}')
const cards = () => screen.getByRole('list', { name: /^Selected/ })
const dialog = () => screen.getByRole('dialog')
const addCard = () => screen.getByRole('button', { name: /^Add (player|team)/ })
const searchbox = () => screen.getByRole('searchbox')
const inCardRow = (b: HTMLElement) => !b.closest('dialog, [role="dialog"]')
const cardRemoves = () =>
  within(cards())
    .queryAllByRole('button', { name: /^Remove / })
    .filter(inCardRow)
const cardRemove = (name: string) => {
  const found = cardRemoves().filter((b) => b.getAttribute('aria-label') === `Remove ${name}`)
  if (found.length !== 1) throw new Error(`expected one card remove button for ${name}`)
  return found[0]
}
const cardNames = () => cardRemoves().map((b) => (b.getAttribute('aria-label') ?? '').slice(7))
const resultRows = () =>
  within(within(dialog()).getByRole('list', { name: 'Results' })).getAllByRole('listitem')
const colorOf = (name: string) => cardRemove(name).closest('li')?.style.borderTopColor
const flush = () => act(async () => {})

async function ready() {
  expect(await within(cards()).findByText('Ola Quenby')).toBeInTheDocument()
}

async function openPopover(user: ReturnType<typeof userEvent.setup>) {
  await user.click(addCard())
  expect(dialog()).toBeInTheDocument()
}

describe('AC5: cards row', () => {
  it('AC5: shows one card per selected id, in selection order', async () => {
    setup({ players: ['zp3', 'zp1', 'zp2'] })
    await ready()
    expect(cardNames()).toEqual(['Quill Dorvane', 'Ola Quenby', 'Pim Rastow'])
  })
  it('AC5: the add card follows the cards and reads Add player with the slots line', async () => {
    setup()
    await ready()
    expect(addCard()).toHaveTextContent('Add player')
    expect(addCard()).toHaveTextContent('6 of 8 slots open')
    const all = screen.getAllByRole('button').filter((b) => b.closest('ul'))
    expect(all[all.length - 1]).toBe(addCard())
  })
  it('AC5: shows nothing but the add card when nothing is selected', async () => {
    setup({ players: [] })
    await flush()
    expect(cardNames()).toEqual([])
    expect(addCard()).toHaveTextContent('8 of 8 slots open')
  })
  it('AC5: loads entities for the active league, kind and season', async () => {
    const { provider } = setup()
    await ready()
    expect(provider.getEntities).toHaveBeenCalledWith('zorb', 'players', '3031')
  })
})

describe('AC6: series colours', () => {
  it('AC6: card N has the series colour for selection index N', async () => {
    setup({ players: ['zp1', 'zp2', 'zp3'] })
    await ready()
    expect(['Ola Quenby', 'Pim Rastow', 'Quill Dorvane'].map(colorOf)).toEqual([
      seriesColor(0),
      seriesColor(1),
      seriesColor(2),
    ])
  })
  it('AC6: removing the first card shifts the colours of the others down', async () => {
    const user = userEvent.setup()
    setup({ players: ['zp1', 'zp2', 'zp3'] })
    await ready()
    await user.click(cardRemove('Ola Quenby'))
    expect(colorOf('Pim Rastow')).toBe(seriesColor(0))
    expect(colorOf('Quill Dorvane')).toBe(seriesColor(1))
  })
  it('AC6: a newly added entity takes the colour of index sel.length - 1', async () => {
    const user = userEvent.setup()
    setup({ players: ['zp1', 'zp2'] })
    await ready()
    await openPopover(user)
    await user.click(within(dialog()).getByRole('button', { name: 'Add Quill Dorvane' }))
    expect(colorOf('Quill Dorvane')).toBe(seriesColor(2))
    expect(colorOf('Ola Quenby')).toBe(seriesColor(0))
  })
  it('AC6: ids missing from the data render no card and do not shift other colours', async () => {
    setup({ players: ['zp1', 'ghost', 'zp2'] })
    await ready()
    expect(cardNames()).toEqual(['Ola Quenby', 'Pim Rastow'])
    expect(colorOf('Pim Rastow')).toBe(seriesColor(2))
    expect(addCard()).toHaveTextContent('5 of 8 slots open')
  })
})

describe('AC7: card content and removal', () => {
  it('AC7: a card shows badge, name and meta', async () => {
    setup()
    await ready()
    const card = cardRemove('Ola Quenby').closest('li') as HTMLElement
    expect(card).toHaveTextContent('ZA')
    expect(card).toHaveTextContent('Ola Quenby')
    expect(card).toHaveTextContent('zt1 meta zp1')
  })
  it('AC7: the remove button removes its card and frees a slot', async () => {
    const user = userEvent.setup()
    setup()
    await ready()
    await user.click(cardRemove('Pim Rastow'))
    expect(cardNames()).toEqual(['Ola Quenby'])
    expect(readState().sel.players).toEqual(['zp1'])
    expect(addCard()).toHaveTextContent('7 of 8 slots open')
  })
})

describe('AC9: full selection hides the add card', () => {
  const seven = ['zp1', 'zp2', 'zp3', 'zp4', 'zp5', 'zp6', 'zp7']
  it('AC9: adding the 8th entity closes the popover and removes the add card', async () => {
    const user = userEvent.setup()
    setup({ players: seven })
    await ready()
    await openPopover(user)
    await user.click(within(dialog()).getByRole('button', { name: 'Add Vik Zandor' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^Add player/ })).not.toBeInTheDocument()
    expect(cardNames()).toHaveLength(MAX_SELECTED)
    expect(readState().addOpen).toBe(false)
  })
  it('AC9: starting with 8 selected shows no add card', async () => {
    setup({ players: [...seven, 'zp8'] })
    await ready()
    expect(screen.queryByRole('button', { name: /^Add player/ })).not.toBeInTheDocument()
  })
  it('AC9: removing one of 8 brings the add card back', async () => {
    const user = userEvent.setup()
    setup({ players: [...seven, 'zp8'] })
    await ready()
    await user.click(cardRemove('Ola Quenby'))
    expect(addCard()).toHaveTextContent('1 of 8 slots open')
  })
})

describe('AC10: separate selections per kind', () => {
  it('AC10: Teams shows the team cards and Add team; Players returns unchanged', async () => {
    const user = userEvent.setup()
    setup()
    await ready()
    const before = cardNames()
    await user.click(screen.getByRole('button', { name: 'probe to teams' }))
    expect(await within(cards()).findByText('Zephyr Flarns')).toBeInTheDocument()
    expect(cardNames()).toEqual(['Zephyr Flarns', 'Quark Boulders'])
    expect(addCard()).toHaveTextContent('Add team')
    await user.click(screen.getByRole('button', { name: 'probe to players' }))
    await ready()
    expect(cardNames()).toEqual(before)
    expect(addCard()).toHaveTextContent('Add player')
  })
  it('AC10: a team change does not touch the player selection', async () => {
    const user = userEvent.setup()
    setup()
    await ready()
    await user.click(screen.getByRole('button', { name: 'probe to teams' }))
    await within(cards()).findByText('Zephyr Flarns')
    await user.click(cardRemove('Zephyr Flarns'))
    expect(readState().sel).toEqual({ players: ['zp1', 'zp2'], teams: ['zt2'] })
  })
})

describe('AC11: team inside mode', () => {
  it('AC11: the picker is not rendered for teams when teamMode is inside', async () => {
    const user = userEvent.setup()
    setup()
    await ready()
    await user.click(screen.getByRole('button', { name: 'probe to teams' }))
    await user.click(screen.getByRole('button', { name: 'probe inside' }))
    expect(screen.queryByRole('list', { name: /^Selected/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^Add team/ })).not.toBeInTheDocument()
  })
  it('AC11: inside mode does not hide the picker for players', async () => {
    const user = userEvent.setup()
    setup()
    await ready()
    await user.click(screen.getByRole('button', { name: 'probe inside' }))
    expect(readState().teamMode).toBe('inside')
    expect(addCard()).toHaveTextContent('Add player')
  })
})

describe('AC12: opening the popover', () => {
  it('AC12: the popover is closed initially and aria-expanded is false', async () => {
    setup()
    await ready()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(addCard()).toHaveAttribute('aria-expanded', 'false')
  })
  it('AC12: click opens, sets aria-expanded and focuses the search', async () => {
    const user = userEvent.setup()
    setup()
    await ready()
    await openPopover(user)
    expect(addCard()).toHaveAttribute('aria-expanded', 'true')
    expect(searchbox()).toHaveFocus()
    expect(dialog()).toHaveAccessibleName('Add player')
  })
  it('AC12: Enter opens the popover with the search focused', async () => {
    const user = userEvent.setup()
    setup()
    await ready()
    addCard().focus()
    await user.keyboard('{Enter}')
    expect(searchbox()).toHaveFocus()
    expect(readState().addOpen).toBe(true)
  })
  it('AC12: Space opens the popover with the search focused', async () => {
    const user = userEvent.setup()
    setup()
    await ready()
    addCard().focus()
    await user.keyboard(' ')
    expect(searchbox()).toHaveFocus()
    expect(readState().addOpen).toBe(true)
  })
  it('AC12: reopening starts with an empty query', async () => {
    const user = userEvent.setup()
    setup()
    await ready()
    await openPopover(user)
    await user.type(searchbox(), 'abc')
    await user.click(screen.getByRole('button', { name: 'Done' }))
    await openPopover(user)
    expect(searchbox()).toHaveValue('')
  })
  it('AC12: the teams popover is labelled Add team', async () => {
    const user = userEvent.setup()
    setup()
    await user.click(screen.getByRole('button', { name: 'probe to teams' }))
    await within(cards()).findByText('Zephyr Flarns')
    await openPopover(user)
    expect(dialog()).toHaveAccessibleName('Add team')
  })
})

describe('AC13 and AC14: search', () => {
  it('AC13: the search has the players placeholder', async () => {
    const user = userEvent.setup()
    setup()
    await ready()
    await openPopover(user)
    expect(searchbox()).toHaveAttribute('placeholder', 'Search players or team')
  })
  it('AC13: typing updates q in state and the list on each keystroke', async () => {
    const user = userEvent.setup()
    setup()
    await ready()
    await openPopover(user)
    expect(resultRows()).toHaveLength(10)
    await user.type(searchbox(), 'q')
    expect(readState().q).toBe('q')
    expect(resultRows().length).toBeLessThan(10)
  })
  it('AC14: search by name is case-insensitive', async () => {
    const user = userEvent.setup()
    setup()
    await ready()
    await openPopover(user)
    await user.type(searchbox(), 'QUENBY')
    expect(resultRows()).toHaveLength(1)
    expect(resultRows()[0]).toHaveTextContent('Ola Quenby')
  })
  it('AC14: surrounding whitespace is ignored', async () => {
    const user = userEvent.setup()
    setup()
    await ready()
    await openPopover(user)
    await user.type(searchbox(), '  quenby  ')
    expect(resultRows()).toHaveLength(1)
  })
  it('AC14: search by team text lists that team players', async () => {
    const user = userEvent.setup()
    setup()
    await ready()
    await openPopover(user)
    await user.type(searchbox(), 'zt2')
    expect(resultRows()).toHaveLength(5)
  })
  it('AC14: on Teams, short name and name both match', async () => {
    const user = userEvent.setup()
    setup()
    await user.click(screen.getByRole('button', { name: 'probe to teams' }))
    await within(cards()).findByText('Zephyr Flarns')
    await openPopover(user)
    expect(searchbox()).toHaveAttribute('placeholder', 'Search teams')
    await user.type(searchbox(), 'zqb')
    expect(resultRows()).toHaveLength(1)
    await user.clear(searchbox())
    await user.type(searchbox(), 'owls')
    expect(resultRows()).toHaveLength(1)
    expect(resultRows()[0]).toHaveTextContent('Nimbus Owls')
  })
  it('AC20: a query with no match shows "No matches." and no rows', async () => {
    const user = userEvent.setup()
    setup()
    await ready()
    await openPopover(user)
    await user.type(searchbox(), 'zzzz')
    expect(within(dialog()).getByText('No matches.')).toBeInTheDocument()
    expect(within(dialog()).queryAllByRole('listitem')).toHaveLength(0)
  })
})

describe('AC15 and AC16: position chips', () => {
  it('AC15: chips come from the loaded data', async () => {
    const user = userEvent.setup()
    setup()
    await ready()
    await openPopover(user)
    const group = within(dialog()).getByRole('group', { name: 'Filter by position' })
    expect(
      within(group)
        .getAllByRole('button')
        .map((b) => b.textContent),
    ).toEqual(['All', 'ZA', 'ZB', 'ZC'])
  })
  it('AC15: Teams has no position chips', async () => {
    const user = userEvent.setup()
    setup()
    await user.click(screen.getByRole('button', { name: 'probe to teams' }))
    await within(cards()).findByText('Zephyr Flarns')
    await openPopover(user)
    expect(within(dialog()).queryByRole('group', { name: 'Filter by position' })).toBeNull()
  })
  it('AC16: choosing a chip filters, marks it pressed, and sets pos', async () => {
    const user = userEvent.setup()
    setup()
    await ready()
    await openPopover(user)
    await user.click(within(dialog()).getByRole('button', { name: 'ZA' }))
    expect(readState().pos).toBe('ZA')
    expect(within(dialog()).getByRole('button', { name: 'ZA' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    expect(within(dialog()).getByRole('button', { name: 'All' })).toHaveAttribute(
      'aria-pressed',
      'false',
    )
    expect(resultRows()).toHaveLength(3)
  })
  it('AC16: the position filter combines with the search (AND)', async () => {
    const user = userEvent.setup()
    setup()
    await ready()
    await openPopover(user)
    await user.click(within(dialog()).getByRole('button', { name: 'ZA' }))
    await user.type(searchbox(), 'zt1')
    expect(resultRows()).toHaveLength(2)
  })
  it('AC16: a position with a non-matching query shows "No matches."', async () => {
    const user = userEvent.setup()
    setup()
    await ready()
    await openPopover(user)
    await user.click(within(dialog()).getByRole('button', { name: 'ZB' }))
    await user.type(searchbox(), 'quenby')
    expect(within(dialog()).getByText('No matches.')).toBeInTheDocument()
  })
  it('AC16: choosing All again lists everyone', async () => {
    const user = userEvent.setup()
    setup()
    await ready()
    await openPopover(user)
    await user.click(within(dialog()).getByRole('button', { name: 'ZC' }))
    await user.click(within(dialog()).getByRole('button', { name: 'All' }))
    expect(resultRows()).toHaveLength(10)
  })
})

describe('AC17: add and remove from the popover', () => {
  it('AC17: Add adds a card, flips the CTA to Remove, and the popover stays open', async () => {
    const user = userEvent.setup()
    setup()
    await ready()
    await openPopover(user)
    await user.click(within(dialog()).getByRole('button', { name: 'Add Quill Dorvane' }))
    expect(cardNames()).toEqual(['Ola Quenby', 'Pim Rastow', 'Quill Dorvane'])
    expect(within(dialog()).getByRole('button', { name: 'Remove Quill Dorvane' })).toBeEnabled()
    expect(within(dialog()).queryByRole('button', { name: 'Add Quill Dorvane' })).toBeNull()
    expect(readState().addOpen).toBe(true)
  })
  it('AC17: Remove in the popover removes the card and flips the CTA to Add', async () => {
    const user = userEvent.setup()
    setup()
    await ready()
    await openPopover(user)
    await user.click(within(dialog()).getByRole('button', { name: 'Remove Ola Quenby' }))
    expect(cardNames()).toEqual(['Pim Rastow'])
    expect(within(dialog()).getByRole('button', { name: 'Add Ola Quenby' })).toBeInTheDocument()
    expect(dialog()).toBeInTheDocument()
  })
  it('AC17: the slots line updates while the popover is open', async () => {
    const user = userEvent.setup()
    setup()
    await ready()
    await openPopover(user)
    await user.click(within(dialog()).getByRole('button', { name: 'Add Rex Tolliver' }))
    expect(addCard()).toHaveTextContent('5 of 8 slots open')
  })
})

describe('AC3: failing data', () => {
  it('AC3: a rejected getEntities shows no cards and "No matches." in an open popover', async () => {
    const user = userEvent.setup()
    setup({
      provider: entitiesProvider({ getEntities: vi.fn(() => Promise.reject(new Error('x'))) }),
    })
    await flush()
    expect(cardNames()).toEqual([])
    await openPopover(user)
    expect(within(dialog()).getByText('No matches.')).toBeInTheDocument()
    expect(addCard()).toHaveTextContent('6 of 8 slots open')
  })
  it('AC3: an empty entity list also shows "No matches."', async () => {
    const user = userEvent.setup()
    setup({ provider: entitiesProvider({ getEntities: vi.fn(() => Promise.resolve([])) }) })
    await flush()
    await openPopover(user)
    expect(within(dialog()).getByText('No matches.')).toBeInTheDocument()
  })
})

describe('AC22 and AC23: closing and focus return', () => {
  it('AC22: Done closes the popover and focuses the add card', async () => {
    const user = userEvent.setup()
    setup()
    await ready()
    await openPopover(user)
    await user.click(screen.getByRole('button', { name: 'Done' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(addCard()).toHaveFocus()
    expect(addCard()).toHaveAttribute('aria-expanded', 'false')
  })
  it('AC22: the add card toggles the popover closed and keeps focus', async () => {
    const user = userEvent.setup()
    setup()
    await ready()
    await openPopover(user)
    await user.click(addCard())
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(addCard()).toHaveFocus()
  })
  it('AC22: Escape in the search input closes the popover and focuses the add card', async () => {
    const user = userEvent.setup()
    setup()
    await ready()
    await openPopover(user)
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(addCard()).toHaveFocus()
  })
  it('AC22: Escape from a chip or result CTA closes the popover', async () => {
    const user = userEvent.setup()
    setup()
    await ready()
    await openPopover(user)
    within(dialog()).getByRole('button', { name: 'ZB' }).focus()
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(addCard()).toHaveFocus()
  })
  it('AC22: Escape on the add card while open closes the popover', async () => {
    const user = userEvent.setup()
    setup()
    await ready()
    await openPopover(user)
    addCard().focus()
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(addCard()).toHaveFocus()
  })
  it('AC22: Escape while closed changes nothing', async () => {
    const user = userEvent.setup()
    setup()
    await ready()
    addCard().focus()
    const before = readState()
    await user.keyboard('{Escape}')
    expect(readState()).toEqual(before)
    expect(addCard()).toHaveFocus()
  })
  it('AC22: Escape on a card remove button while closed changes nothing', async () => {
    const user = userEvent.setup()
    setup()
    await ready()
    cardRemove('Ola Quenby').focus()
    const before = readState()
    await user.keyboard('{Escape}')
    expect(readState()).toEqual(before)
  })
})

describe('AC24: focus after the 8th add', () => {
  it('AC24: focus lands on the last card remove button', async () => {
    const user = userEvent.setup()
    setup({ players: ['zp1', 'zp2', 'zp3', 'zp4', 'zp5', 'zp6', 'zp7'] })
    await ready()
    await openPopover(user)
    await user.click(within(dialog()).getByRole('button', { name: 'Add Vik Zandor' }))
    expect(cardRemove('Vik Zandor')).toHaveFocus()
    expect(document.body).not.toHaveFocus()
  })
})

describe('AC25: focus after removing a card', () => {
  it('AC25: removing a middle card focuses the next card remove button', async () => {
    const user = userEvent.setup()
    setup({ players: ['zp1', 'zp2', 'zp3'] })
    await ready()
    await user.click(cardRemove('Pim Rastow'))
    expect(cardRemove('Quill Dorvane')).toHaveFocus()
  })
  it('AC25: removing the first card focuses the card now first', async () => {
    const user = userEvent.setup()
    setup({ players: ['zp1', 'zp2', 'zp3'] })
    await ready()
    await user.click(cardRemove('Ola Quenby'))
    expect(cardRemove('Pim Rastow')).toHaveFocus()
  })
  it('AC25: removing the last card focuses the previous card remove button', async () => {
    const user = userEvent.setup()
    setup({ players: ['zp1', 'zp2', 'zp3'] })
    await ready()
    await user.click(cardRemove('Quill Dorvane'))
    expect(cardRemove('Pim Rastow')).toHaveFocus()
  })
  it('AC25: removing the only card focuses the add card', async () => {
    const user = userEvent.setup()
    setup({ players: ['zp1'] })
    await ready()
    await user.click(cardRemove('Ola Quenby'))
    expect(addCard()).toHaveFocus()
  })
  it('AC25: removing a card with the keyboard keeps focus off the body', async () => {
    const user = userEvent.setup()
    setup({ players: ['zp1', 'zp2'] })
    await ready()
    cardRemove('Ola Quenby').focus()
    await user.keyboard('{Enter}')
    expect(cardRemove('Pim Rastow')).toHaveFocus()
  })
  it('AC25: removing the last of 8 cards focuses the previous remove button and shows the add card', async () => {
    const user = userEvent.setup()
    setup({ players: ['zp1', 'zp2', 'zp3', 'zp4', 'zp5', 'zp6', 'zp7', 'zp8'] })
    await ready()
    await user.click(cardRemove('Vik Zandor'))
    expect(cardRemove('Ulla Vexley')).toHaveFocus()
    expect(addCard()).toBeInTheDocument()
  })
})

describe('AC26: kind switch while open', () => {
  it('AC26: switching kind closes the popover and resets q and pos', async () => {
    const user = userEvent.setup()
    setup()
    await ready()
    await openPopover(user)
    await user.type(searchbox(), 'abc')
    await user.click(within(dialog()).getByRole('button', { name: 'ZA' }))
    await user.click(screen.getByRole('button', { name: 'probe to teams' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(readState()).toMatchObject({ kind: 'teams', q: '', pos: 'All', addOpen: false })
  })
  it('AC26: focus is not forced onto the picker', async () => {
    const user = userEvent.setup()
    setup()
    await ready()
    await openPopover(user)
    await user.click(screen.getByRole('button', { name: 'probe to teams' }))
    await within(cards()).findByText('Zephyr Flarns')
    expect(screen.getByRole('button', { name: 'probe to teams' })).toHaveFocus()
  })
})

describe('AC27: keyboard-only flow', () => {
  it('AC27: Tab reaches each card remove button and then the add card, in order', async () => {
    const user = userEvent.setup()
    setup()
    await ready()
    await user.tab()
    expect(cardRemove('Ola Quenby')).toHaveFocus()
    await user.tab()
    expect(cardRemove('Pim Rastow')).toHaveFocus()
    await user.tab()
    expect(addCard()).toHaveFocus()
  })
  it('AC27: open, search, toggle a chip, add a result, Done, all by keyboard', async () => {
    const user = userEvent.setup()
    setup()
    await ready()
    await user.tab()
    await user.tab()
    await user.tab()
    await user.keyboard('{Enter}')
    expect(searchbox()).toHaveFocus()
    await user.keyboard('zt1')
    expect(readState().q).toBe('zt1')
    await user.tab()
    expect(screen.getByRole('button', { name: 'Done' })).toHaveFocus()
    await user.tab()
    expect(screen.getByRole('button', { name: 'All' })).toHaveFocus()
    await user.tab()
    expect(screen.getByRole('button', { name: 'ZA' })).toHaveFocus()
    await user.keyboard(' ')
    expect(readState().pos).toBe('ZA')
    await user.tab()
    await user.tab()
    await user.tab()
    expect(document.activeElement).toBe(
      within(dialog()).getByRole('button', { name: 'Remove Ola Quenby' }),
    )
    await user.tab()
    await user.keyboard('{Enter}')
    expect(cardNames()).toEqual(['Ola Quenby', 'Pim Rastow', 'Ulla Vexley'])
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(addCard()).toHaveFocus()
  })
})

describe('AC28: native controls', () => {
  it('AC28: every picker control is a native button or input', async () => {
    const user = userEvent.setup()
    setup()
    await ready()
    await openPopover(user)
    const root = screen.getByRole('list', { name: /^Selected/ }).parentElement as HTMLElement
    const controls = [
      ...within(root).getAllByRole('button'),
      ...within(root).getAllByRole('searchbox'),
    ]
    expect(controls.every((c) => ['BUTTON', 'INPUT'].includes(c.tagName))).toBe(true)
  })
})
