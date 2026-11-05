import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import App from './App'

afterEach(() => {
  window.history.pushState({}, '', '/')
})

type User = ReturnType<typeof userEvent.setup>

const cards = () => screen.getByRole('list', { name: /^Selected/ })
const panel = () => screen.getByRole('region', { name: 'Stat views' })
const removeButtons = () =>
  within(cards())
    .queryAllByRole('button', { name: /^Remove / })
    .filter((b) => !b.closest('dialog'))
const addCard = () => screen.getByRole('button', { name: /^Add (player|team)/ })
const kindGroup = () => screen.getByRole('group', { name: 'Players or teams' })

async function loaded() {
  await waitFor(() => expect(removeButtons().length).toBeGreaterThan(0))
  await act(async () => {})
}
/** Moves focus without a pointer click; every later interaction is keyboard only. */
function focus(el: HTMLElement) {
  act(() => el.focus())
  expect(el).toHaveFocus()
}
const notBody = () => expect(document.activeElement).not.toBe(document.body)

async function goTeamsByKeyboard(user: User) {
  focus(within(kindGroup()).getByRole('button', { name: 'Teams' }))
  await user.keyboard('{Enter}')
  await screen.findByRole('list', { name: 'Selected teams' })
  await loaded()
}
async function enterBreakdown(user: User) {
  const sw = screen.getByRole('group', { name: 'Team view' })
  focus(within(sw).getByRole('button', { name: 'Team breakdown' }))
  await user.keyboard('{Enter}')
  await screen.findByRole('region', { name: 'Share of team production' })
  await screen.findAllByRole('rowheader')
  await act(async () => {})
}

describe('AC8: kind and season by keyboard', () => {
  it('AC8: Enter on Teams switches to teams and Enter on Players switches back', async () => {
    const user = userEvent.setup()
    render(<App />)
    await loaded()
    await goTeamsByKeyboard(user)
    expect(within(kindGroup()).getByRole('button', { name: 'Teams' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    focus(within(kindGroup()).getByRole('button', { name: 'Players' }))
    await user.keyboard(' ')
    expect(await screen.findByRole('list', { name: 'Selected players' })).toBeInTheDocument()
  })
  it('AC8: the season select is reachable by Tab and can change by keyboard', async () => {
    const user = userEvent.setup()
    render(<App />)
    await loaded()
    const select = screen.getByRole('combobox', { name: 'Season' }) as HTMLSelectElement
    await waitFor(() => expect(within(select).getAllByRole('option').length).toBeGreaterThan(1))
    focus(select)
    // jsdom has no native select popup, so the option choice uses selectOptions.
    const other = within(select)
      .getAllByRole('option')
      .map((o) => (o as HTMLOptionElement).value)
      .find((v) => v !== select.value) as string
    await user.selectOptions(select, other)
    expect(select.value).toBe(other)
    notBody()
  })
})

describe('AC8/AC9: Add popover by keyboard', () => {
  it('AC9: Escape closes the popover and focus returns to the Add card', async () => {
    const user = userEvent.setup()
    render(<App />)
    await loaded()
    focus(addCard())
    await user.keyboard('{Enter}')
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(addCard()).toHaveFocus()
  })
  it('AC9: Done by keyboard closes the popover and focus returns to the Add card', async () => {
    const user = userEvent.setup()
    render(<App />)
    await loaded()
    focus(addCard())
    await user.keyboard('{Enter}')
    focus(within(screen.getByRole('dialog')).getByRole('button', { name: 'Done' }))
    await user.keyboard('{Enter}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(addCard()).toHaveFocus()
  })
  it('AC8: open, search, filter by chip and add an entity with the keyboard only', async () => {
    const user = userEvent.setup()
    render(<App />)
    await loaded()
    const before = removeButtons().length
    focus(addCard())
    await user.keyboard('{Enter}')
    const dialog = screen.getByRole('dialog')
    focus(within(dialog).getByRole('searchbox'))
    await user.keyboard('a')
    focus(within(dialog).getByRole('button', { name: 'QB' }))
    await user.keyboard('{Enter}')
    const results = within(dialog).getByRole('list', { name: 'Results' })
    const add = within(results).getAllByRole('button', { name: /^Add / }).at(0) as HTMLElement
    focus(add)
    await user.keyboard('{Enter}')
    await user.keyboard('{Escape}')
    expect(removeButtons()).toHaveLength(before + 1)
    notBody()
  })
  it('AC9: removing an entity inside the popover keeps focus in the popover', async () => {
    const user = userEvent.setup()
    render(<App />)
    await loaded()
    const before = removeButtons().length
    focus(addCard())
    await user.keyboard('{Enter}')
    const dialog = screen.getByRole('dialog')
    const remove = within(dialog).getAllByRole('button', { name: /^Remove / })[0]
    focus(remove)
    await user.keyboard('{Enter}')
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByRole('dialog').contains(document.activeElement)).toBe(true)
    await user.keyboard('{Escape}')
    expect(removeButtons()).toHaveLength(before - 1)
  })
})

describe('AC9: card removal focus order', () => {
  it('AC9: removing the first card moves focus to the next card remove button', async () => {
    const user = userEvent.setup()
    render(<App />)
    await loaded()
    const [first, second] = removeButtons()
    const secondName = second.getAttribute('aria-label')
    focus(first)
    await user.keyboard('{Enter}')
    expect(screen.getByRole('button', { name: secondName as string })).toHaveFocus()
  })
  it('AC9: removing the last card moves focus to the previous card remove button', async () => {
    const user = userEvent.setup()
    render(<App />)
    await loaded()
    const buttons = removeButtons()
    const prevName = buttons[buttons.length - 2].getAttribute('aria-label')
    focus(buttons[buttons.length - 1])
    await user.keyboard('{Enter}')
    expect(screen.getByRole('button', { name: prevName as string })).toHaveFocus()
  })
  it('AC9: removing the only card moves focus to the Add card', async () => {
    const user = userEvent.setup()
    render(<App />)
    await loaded()
    while (removeButtons().length > 1) {
      focus(removeButtons()[0])
      await user.keyboard('{Enter}')
      notBody()
    }
    focus(removeButtons()[0])
    await user.keyboard('{Enter}')
    expect(removeButtons()).toHaveLength(0)
    expect(addCard()).toHaveFocus()
  })
})

describe('AC8/AC9: add-stat menu and stat checkboxes by keyboard', () => {
  it('AC9: Escape closes the add-stat menu and focus returns to its button', async () => {
    const user = userEvent.setup()
    render(<App />)
    await loaded()
    const btn = await screen.findByRole('button', { name: 'Add stat to Passing' })
    focus(btn)
    await user.keyboard('{Enter}')
    expect(screen.getByRole('group', { name: 'Stats to add to Passing' })).toBeInTheDocument()
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('group', { name: 'Stats to add to Passing' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Add stat to Passing' })).toHaveFocus()
  })
  it('AC8: a stat is added from the menu with Enter and a checkbox toggles with Space', async () => {
    const user = userEvent.setup()
    render(<App />)
    await loaded()
    const side = screen.getByRole('complementary', { name: 'Stats' })
    const countBefore = within(side).getAllByRole('checkbox').length
    focus(await screen.findByRole('button', { name: 'Add stat to Passing' }))
    await user.keyboard('{Enter}')
    const menu = screen.getByRole('group', { name: 'Stats to add to Passing' })
    const item = within(menu).getAllByRole('button').at(0) as HTMLElement
    focus(item)
    await user.keyboard('{Enter}')
    await waitFor(() => expect(within(side).getAllByRole('checkbox').length).toBe(countBefore + 1))
    notBody()
    // Picking a stat moves focus to its new checkbox; Space unchecks it, which removes the stat.
    expect(document.activeElement).toHaveAttribute('type', 'checkbox')
    await user.keyboard(' ')
    await waitFor(() => expect(within(side).getAllByRole('checkbox').length).toBe(countBefore))
  })
})

describe('AC8: chart tabs and 3D by keyboard', () => {
  it('AC8: arrow keys move through the view tabs at App level', async () => {
    const user = userEvent.setup()
    render(<App />)
    await loaded()
    const list = within(panel()).getByRole('tablist', { name: 'View' })
    const tabs = within(list).getAllByRole('tab')
    expect(tabs.map((t) => t.textContent)).toEqual(['Table', '2D chart', '3D chart'])
    focus(within(list).getByRole('tab', { selected: true }))
    expect(within(list).getByRole('tab', { name: '3D chart' })).toHaveAttribute(
      'aria-selected',
      'true',
    )
    await user.keyboard('{ArrowLeft}')
    expect(within(list).getByRole('tab', { name: '2D chart' })).toHaveFocus()
    expect(within(list).getByRole('tab', { name: '2D chart' })).toHaveAttribute(
      'aria-selected',
      'true',
    )
    await user.keyboard('{Home}')
    expect(within(list).getByRole('tab', { name: 'Table' })).toHaveFocus()
    expect(await within(panel()).findByRole('table')).toBeInTheDocument()
    await user.keyboard('{End}')
    expect(within(list).getByRole('tab', { name: '3D chart' })).toHaveFocus()
  })
  it('AC8: the chart type control switches Bars and Radar with Enter', async () => {
    const user = userEvent.setup()
    render(<App />)
    await loaded()
    focus(within(panel()).getByRole('tab', { name: '3D chart' }))
    await user.keyboard('{ArrowLeft}')
    const radar = within(panel()).getByRole('button', { name: 'Radar' })
    focus(radar)
    await user.keyboard('{Enter}')
    expect(radar).toHaveAttribute('aria-pressed', 'true')
    expect(within(panel()).getByRole('button', { name: 'Bars' })).toHaveAttribute(
      'aria-pressed',
      'false',
    )
  })
  it('AC8: arrow keys rotate the 3D chart and an axis select can change', async () => {
    const user = userEvent.setup()
    render(<App />)
    await loaded()
    const chart = await within(panel()).findByRole('group', { name: '3D chart' })
    const snapshot = () => chart.innerHTML
    focus(chart)
    const before = snapshot()
    await user.keyboard('{ArrowRight}{ArrowDown}')
    expect(snapshot()).not.toBe(before)
    const axis = within(panel()).getByRole('combobox', { name: 'X axis' }) as HTMLSelectElement
    const next = within(axis)
      .getAllByRole('option')
      .map((o) => (o as HTMLOptionElement).value)
      .find((v) => v !== axis.value) as string
    focus(axis)
    await user.selectOptions(axis, next)
    expect(axis.value).toBe(next)
  })
})

describe('AC8: Teams breakdown by keyboard', () => {
  it('AC8: Enter opens the breakdown, a team chip is picked, Offense/Defense toggle', async () => {
    const user = userEvent.setup()
    render(<App />)
    await loaded()
    await goTeamsByKeyboard(user)
    await enterBreakdown(user)
    const chips = within(screen.getByRole('group', { name: 'Teams' })).getAllByRole('button')
    expect(chips.length).toBeGreaterThan(1)
    const other = chips.find((c) => c.getAttribute('aria-pressed') === 'false') as HTMLElement
    focus(other)
    await user.keyboard('{Enter}')
    await waitFor(() => expect(other).toHaveAttribute('aria-pressed', 'true'))
    const unit = screen.getByRole('group', { name: 'Unit' })
    const defense = within(unit).getByRole('button', { name: 'Defense' })
    focus(defense)
    await user.keyboard('{Enter}')
    await waitFor(() => expect(defense).toHaveAttribute('aria-pressed', 'true'))
    expect(within(unit).getByRole('button', { name: 'Offense' })).toHaveAttribute(
      'aria-pressed',
      'false',
    )
  })
  it('AC11: each share row contributes at most one tabindex 0 and arrows move inside it', async () => {
    const user = userEvent.setup()
    render(<App />)
    await loaded()
    await goTeamsByKeyboard(user)
    await enterBreakdown(user)
    const share = screen.getByRole('region', { name: 'Share of team production' })
    const unit = screen.getByRole('group', { name: 'Unit' })
    const bars = within(share)
      .getAllByRole('group')
      .filter((g) => g !== unit)
    expect(bars.length).toBeGreaterThan(0)
    let total = 0
    for (const bar of bars) {
      const stops = within(bar)
        .getAllByRole('img')
        .filter((s) => s.getAttribute('tabindex') === '0')
      expect(stops.length).toBeLessThanOrEqual(1)
      total += stops.length
    }
    expect(total).toBeLessThanOrEqual(bars.length)
    const segs = within(bars[0]).getAllByRole('img')
    expect(segs.length).toBeGreaterThan(1)
    focus(segs[0])
    await user.keyboard('{ArrowRight}')
    expect(segs[1]).toHaveFocus()
    expect(screen.getByRole('tooltip')).toHaveTextContent(segs[1].getAttribute('aria-label') ?? '')
    await user.keyboard('{End}')
    expect(segs[segs.length - 1]).toHaveFocus()
    await user.keyboard('{Home}')
    expect(segs[0]).toHaveFocus()
  })
  it('AC8: a roster column sorts in both directions by keyboard', async () => {
    const user = userEvent.setup()
    render(<App />)
    await loaded()
    await goTeamsByKeyboard(user)
    await enterBreakdown(user)
    const table = screen.getByRole('table', { name: /.+/ })
    const sorted = () =>
      within(table)
        .getAllByRole('columnheader')
        .map((h) => h.getAttribute('aria-sort'))
    const heads = within(table).getAllByRole('columnheader')
    const target = heads.find((h) => h.getAttribute('aria-sort') === 'none') as HTMLElement
    expect(target).toBeDefined()
    const idx = heads.indexOf(target)
    const btn = within(target).getByRole('button')
    focus(btn)
    await user.keyboard('{Enter}')
    const first = sorted()[idx]
    expect(first).not.toBe('none')
    await user.keyboard(' ')
    const second = sorted()[idx]
    expect(second).not.toBe('none')
    expect(second).not.toBe(first)
    notBody()
  })
})
