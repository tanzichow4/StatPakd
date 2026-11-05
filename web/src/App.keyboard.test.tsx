/**
 * AC8/AC9: keyboard-only App flow. Steps already covered elsewhere:
 * - EntityPicker.test.tsx: AC22 Done/Escape focus, AC25 card removal focus order, AC27 open, search,
 *   chip, add.
 * - StatSidebar.test.tsx: AC14 Escape returns focus to the Add button, AC21 full keyboard cycle.
 * - ComparePanel.test.tsx: tab arrows. Chart3D.test.tsx: keys. RosterTable.test.tsx: AC15 sort keys.
 * - TeamChips.test.tsx: AC13.
 * Focus is placed with element.focus() (no pointer clicks); jsdom has no native select popup, so
 * select changes use user.selectOptions.
 */
import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import App from './App'

afterEach(() => {
  window.history.pushState({}, '', '/')
})

type User = ReturnType<typeof userEvent.setup>

const panel = () => screen.getByRole('region', { name: 'Stat views' })
const kind = () => screen.getByRole('group', { name: 'Players or teams' })
const addCard = () => screen.getByRole('button', { name: /^Add (player|team)/ })
const removeButtons = () =>
  screen.queryAllByRole('button', { name: /^Remove / }).filter((b) => !b.closest('dialog'))

function focus(el: HTMLElement) {
  act(() => el.focus())
  expect(el).toHaveFocus()
}
async function loaded() {
  await waitFor(() => expect(removeButtons().length).toBeGreaterThan(0))
  await act(async () => {})
}
async function openBreakdown(user: User) {
  focus(within(kind()).getByRole('button', { name: 'Teams' }))
  await user.keyboard('{Enter}')
  await screen.findByRole('list', { name: 'Selected teams' })
  await loaded()
  focus(
    within(screen.getByRole('group', { name: 'Team view' })).getByRole('button', {
      name: 'Team breakdown',
    }),
  )
  await user.keyboard('{Enter}')
  await screen.findByRole('region', { name: 'Share of team production' })
  await screen.findAllByRole('rowheader')
  await act(async () => {})
}

describe('AC8/AC9: keyboard flow at App level', () => {
  it('AC8: Enter switches to Teams, Space switches back, focus stays on a control', async () => {
    const user = userEvent.setup()
    render(<App />)
    await loaded()
    focus(within(kind()).getByRole('button', { name: 'Teams' }))
    await user.keyboard('{Enter}')
    await screen.findByRole('list', { name: 'Selected teams' })
    focus(within(kind()).getByRole('button', { name: 'Players' }))
    await user.keyboard(' ')
    expect(await screen.findByRole('list', { name: 'Selected players' })).toBeInTheDocument()
    expect(document.activeElement).not.toBe(document.body)
  })

  it('AC8: the season select changes by keyboard focus plus selectOptions', async () => {
    const user = userEvent.setup()
    render(<App />)
    await loaded()
    const select = screen.getByRole('combobox', { name: 'Season' }) as HTMLSelectElement
    await waitFor(() => expect(within(select).getAllByRole('option').length).toBeGreaterThan(1))
    focus(select)
    const other = within(select)
      .getAllByRole('option')
      .map((o) => (o as HTMLOptionElement).value)
      .find((v) => v !== select.value) as string
    await user.selectOptions(select, other)
    expect(select.value).toBe(other)
  })

  it('AC9: Escape closes the Add popover and focus returns to the Add card', async () => {
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

  it('AC8: arrow keys move through the view tabs', async () => {
    const user = userEvent.setup()
    render(<App />)
    await loaded()
    const list = within(panel()).getByRole('tablist', { name: 'View' })
    focus(within(list).getByRole('tab', { selected: true }))
    await user.keyboard('{ArrowLeft}')
    expect(within(list).getByRole('tab', { name: '2D chart' })).toHaveFocus()
    await user.keyboard('{Home}')
    expect(within(list).getByRole('tab', { name: 'Table' })).toHaveFocus()
    expect(within(list).getByRole('tab', { name: 'Table' })).toHaveAttribute(
      'aria-selected',
      'true',
    )
  })

  it('AC8: arrows rotate the 3D chart and an axis select changes', async () => {
    const user = userEvent.setup()
    render(<App />)
    await loaded()
    const chart = await within(panel()).findByRole('group', { name: '3D chart' })
    focus(chart)
    const before = chart.innerHTML
    await user.keyboard('{ArrowRight}{ArrowDown}')
    expect(chart.innerHTML).not.toBe(before)
    const axis = within(panel()).getByRole('combobox', { name: 'X axis' }) as HTMLSelectElement
    const next = within(axis)
      .getAllByRole('option')
      .map((o) => (o as HTMLOptionElement).value)
      .find((v) => v !== axis.value) as string
    focus(axis)
    await user.selectOptions(axis, next)
    expect(axis.value).toBe(next)
  })

  it('AC8: breakdown, team chip and Defense by Enter, share arrows, and roster sort', async () => {
    const user = userEvent.setup()
    render(<App />)
    await loaded()
    await openBreakdown(user)

    const chips = within(screen.getByRole('group', { name: 'Teams' })).getAllByRole('button')
    const other = chips.find((c) => c.getAttribute('aria-pressed') === 'false') as HTMLElement
    focus(other)
    await user.keyboard('{Enter}')
    await waitFor(() => expect(other).toHaveAttribute('aria-pressed', 'true'))

    const unit = screen.getByRole('group', { name: 'Unit' })
    const defense = within(unit).getByRole('button', { name: 'Defense' })
    focus(defense)
    await user.keyboard('{Enter}')
    await waitFor(() => expect(defense).toHaveAttribute('aria-pressed', 'true'))
    focus(within(unit).getByRole('button', { name: 'Offense' }))
    await user.keyboard('{Enter}')
    await screen.findByRole('group', { name: 'Touches share' })

    const share = screen.getByRole('region', { name: 'Share of team production' })
    const bar = within(share)
      .getAllByRole('group')
      .find((g) => g !== unit) as HTMLElement
    const segs = within(bar).getAllByRole('img')
    expect(segs.length).toBeGreaterThan(1)
    focus(segs[0])
    await user.keyboard('{ArrowRight}')
    expect(segs[1]).toHaveFocus()
    await user.keyboard('{End}')
    expect(segs[segs.length - 1]).toHaveFocus()

    const table = screen.getByRole('table', { name: /.+/ })
    const heads = within(table).getAllByRole('columnheader')
    const idx = heads.findIndex((h) => h.getAttribute('aria-sort') === 'none')
    focus(within(heads[idx]).getByRole('button'))
    await user.keyboard('{Enter}')
    const first = within(table).getAllByRole('columnheader')[idx].getAttribute('aria-sort')
    await user.keyboard(' ')
    const second = within(table).getAllByRole('columnheader')[idx].getAttribute('aria-sort')
    expect(first).not.toBe('none')
    expect(second).not.toBe(first)
    expect(document.activeElement).not.toBe(document.body)
  })
})
