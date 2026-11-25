import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import App from './App'
import { seriesColor } from './styles/series'
import { seriousViolations } from './test/axe'

type User = ReturnType<typeof userEvent.setup>

const button = (group: string, name: string) =>
  within(screen.getByRole('group', { name: group })).getByRole('button', { name })
const weekChip = (n: number) => button('Weeks to compare', `Week ${n}`)
const gameLog = () => screen.getByRole('table', { name: 'Game log' })
const comparison = () => screen.queryByRole('table', { name: 'Chosen weeks compared by stat' })
const chart = (name: string) => screen.getByRole('group', { name })

async function openDetail(): Promise<User> {
  const user = userEvent.setup()
  render(<App />)
  await screen.findByRole('list', { name: 'Selected players' })
  await user.click(button('Player view', 'Player detail'))
  await screen.findByRole('table', { name: 'Game log' })
  await act(async () => {})
  return user
}

describe('2D chart: dot plot', () => {
  it('is offered beside Bars and Radar and shows the selected players', async () => {
    const user = userEvent.setup()
    render(<App />)
    await screen.findByRole('list', { name: 'Selected players' })
    await user.click(screen.getByRole('tab', { name: '2D chart' }))
    expect(button('Chart type', 'Bars')).toHaveAttribute('aria-pressed', 'true')
    await user.click(button('Chart type', 'Dot plot'))
    const plot = chart('Dot plot')
    expect(within(plot).getAllByTestId('dot')[0].style.background).toBe(seriesColor(0))
    expect(screen.queryByRole('group', { name: 'Bars chart' })).toBeNull()
    expect(await seriousViolations(document.body)).toEqual([])
  })
})

describe('Player detail', () => {
  it('opens on the first compared player in place of the comparison', async () => {
    await openDetail()
    expect(screen.getByRole('heading', { level: 2, name: 'Josh Allen' })).toBeInTheDocument()
    expect(button('Player', 'Josh Allen')).toHaveAttribute('aria-pressed', 'true')
    expect(screen.queryByRole('region', { name: 'Stat views' })).toBeNull()
    expect(screen.queryByRole('list', { name: 'Selected players' })).toBeNull()
  })

  it('labels the weekly values as sample data', async () => {
    await openDetail()
    expect(screen.getByText(/Sample data: weekly values are generated/)).toBeInTheDocument()
  })

  it('lists 18 weeks with one bye', async () => {
    await openDetail()
    const rows = within(gameLog()).getAllByRole('row').slice(1)
    expect(rows).toHaveLength(18)
    expect(within(gameLog()).getAllByRole('checkbox')).toHaveLength(17)
    expect(within(gameLog()).getAllByText('Bye')).toHaveLength(1)
  })

  it('plots one stat by week with average and trend lines, and the stat can be changed', async () => {
    const user = await openDetail()
    const select = screen.getByRole('combobox', { name: 'Weekly stat' })
    expect(select).toHaveDisplayValue('Pass Yds')
    const plot = chart('Pass Yds by week')
    expect(within(plot).getAllByTestId('trend-dot')).toHaveLength(17)
    expect(within(plot).getByTestId('average-line')).toBeInTheDocument()
    expect(within(plot).getByTestId('trend-line')).toBeInTheDocument()
    expect(screen.getByTestId('season-trend')).toHaveTextContent(/Average [\d,.]+/)
    await user.selectOptions(select, 'rushYds')
    expect(chart('Rush Yds by week')).toBeInTheDocument()
  })

  it('asks for two weeks before comparing', async () => {
    const user = await openDetail()
    expect(screen.getByText('Pick at least 2 weeks to compare.')).toBeInTheDocument()
    await user.click(weekChip(1))
    expect(screen.getByText('Pick at least 2 weeks to compare.')).toBeInTheDocument()
    expect(comparison()).toBeNull()
  })

  it('compares weeks 1, 2 and 3 as dot plots with trends and as a table', async () => {
    const user = await openDetail()
    for (const n of [3, 1, 2]) await user.click(weekChip(n))
    const plot = chart('Pass Yds across the chosen weeks')
    expect(within(plot).getAllByTestId('trend-dot')).toHaveLength(3)
    expect(within(plot).getByTestId('path')).toBeInTheDocument()
    expect(within(plot).getByTestId('trend-line')).toBeInTheDocument()
    expect(screen.getAllByTestId('week-trend')[0]).toHaveTextContent(/^W1 to W3: /)
    const headers = within(comparison()!)
      .getAllByRole('columnheader')
      .map((h) => h.textContent)
    expect(headers).toEqual(['Stat', 'Week 1', 'Week 2', 'Week 3'])
    expect(await seriousViolations(document.body)).toEqual([])
  })

  it('keeps the chips, the game log and the season chart in step', async () => {
    const user = await openDetail()
    const row = () => within(gameLog()).getByRole('checkbox', { name: 'Week 2' })
    const dot = () => within(chart('Pass Yds by week')).getByRole('button', { name: /^Week 2:/ })
    await user.click(row())
    expect(weekChip(2)).toHaveAttribute('aria-pressed', 'true')
    expect(dot()).toHaveAttribute('aria-pressed', 'true')
    await user.click(dot())
    expect(row()).not.toBeChecked()
    expect(weekChip(2)).toHaveAttribute('aria-pressed', 'false')
  })

  it('has shortcuts for the last four weeks, all weeks and none', async () => {
    const user = await openDetail()
    const columns = () => within(comparison()!).getAllByRole('columnheader').length - 1
    await user.click(screen.getByRole('button', { name: 'Last 4' }))
    expect(columns()).toBe(4)
    await user.click(screen.getByRole('button', { name: 'All' }))
    expect(columns()).toBe(17)
    await user.click(screen.getByRole('button', { name: 'Clear' }))
    expect(comparison()).toBeNull()
  })

  it('finds a player by search and clears the chosen weeks when the player changes', async () => {
    const user = await openDetail()
    await user.click(weekChip(1))
    await user.type(screen.getByRole('searchbox', { name: 'Find a player' }), 'barkley')
    expect(
      within(screen.getByRole('group', { name: 'Player' })).getAllByRole('button'),
    ).toHaveLength(1)
    await user.click(button('Player', 'Saquon Barkley'))
    expect(
      await screen.findByRole('heading', { level: 2, name: 'Saquon Barkley' }),
    ).toBeInTheDocument()
    await screen.findByRole('table', { name: 'Game log' })
    expect(weekChip(1)).toHaveAttribute('aria-pressed', 'false')
    // A running back has no passing columns.
    expect(within(gameLog()).queryByRole('columnheader', { name: 'Pass Yds' })).toBeNull()
  })

  it('says when no player matches', async () => {
    const user = await openDetail()
    await user.type(screen.getByRole('searchbox', { name: 'Find a player' }), 'zzzz')
    expect(screen.getByText('No matches.')).toBeInTheDocument()
  })

  it('follows the season select', async () => {
    const user = await openDetail()
    const before = gameLog().textContent
    await user.selectOptions(screen.getByRole('combobox', { name: 'Season' }), '2023')
    await screen.findByText(/· 2023$/)
    await screen.findByRole('table', { name: 'Game log' })
    await act(async () => {})
    expect(gameLog().textContent).not.toBe(before)
  })

  it('is hidden for teams and kept when returning to players', async () => {
    const user = await openDetail()
    await user.click(button('Players or teams', 'Teams'))
    expect(screen.queryByRole('group', { name: 'Player view' })).toBeNull()
    expect(screen.queryByRole('table', { name: 'Game log' })).toBeNull()
    await user.click(button('Players or teams', 'Players'))
    expect(await screen.findByRole('table', { name: 'Game log' })).toBeInTheDocument()
    await user.click(button('Player view', 'Compare players'))
    expect(await screen.findByRole('list', { name: 'Selected players' })).toBeInTheDocument()
  })
})
