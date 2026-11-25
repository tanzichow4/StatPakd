import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import App from './App'
import { seriesColor } from './styles/series'
import { expectAccessible } from './test/expectAccessible'

type User = ReturnType<typeof userEvent.setup>

// Each test renders the whole app with a season of rows, which is slow when many files run at once.
vi.setConfig({ testTimeout: 20_000 })

const button = (group: string, name: string) =>
  within(screen.getByRole('group', { name: group })).getByRole('button', { name })
const weekChip = (n: number) => button('Single weeks', `Week ${n}`)
const graph = () => screen.getByRole('group', { name: 'Weekly dot graph' })
const totals = () => screen.getByRole('complementary', { name: 'Totals' })
const select = (name: string) => screen.getByRole('combobox', { name })
const playerTable = (name = 'Josh Allen') =>
  screen.getByRole('table', { name: `${name} week by week` })
/** Week labels in the first column, without the total row. */
const tableWeeks = (table: HTMLElement) =>
  within(table)
    .getAllByRole('rowheader')
    .map((h) => h.textContent)
    .filter((t) => t !== 'Total')
const totalOf = (stat: string) => {
  const row = within(totals()).getByRole('button', { name: stat }).closest('tr') as HTMLElement
  return within(row)
    .getAllByRole('cell')
    .map((c) => c.textContent)
}

async function openWeeks(): Promise<User> {
  const user = userEvent.setup()
  render(<App />)
  await screen.findByRole('list', { name: 'Selected players' })
  await user.click(button('Player view', 'Week to week'))
  await screen.findByRole('group', { name: 'Weekly dot graph' })
  await act(async () => {})
  return user
}

async function onlyAllen(): Promise<User> {
  const user = await openWeeks()
  await user.click(screen.getByRole('button', { name: 'Remove Saquon Barkley' }))
  await user.click(screen.getByRole('button', { name: "Remove Ja'Marr Chase" }))
  await screen.findByRole('table', { name: 'Josh Allen week by week' })
  return user
}

describe('playoffs switch', () => {
  it('is not offered for the sample data, which has no playoff games', async () => {
    render(<App />)
    await screen.findByRole('list', { name: 'Selected players' })
    expect(screen.queryByRole('checkbox', { name: 'Include playoffs' })).toBeNull()
    expect(screen.queryByText(/Playoff games are/)).toBeNull()
  })
})

describe('player viewing options', () => {
  it('offers Week to week and Season totals, and starts on Season totals', async () => {
    render(<App />)
    await screen.findByRole('list', { name: 'Selected players' })
    const options = within(screen.getByRole('group', { name: 'Player view' })).getAllByRole(
      'button',
    )
    expect(options.map((o) => o.textContent)).toEqual(['Week to week', 'Season totals'])
    expect(options[1]).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('region', { name: 'Stat views' })).toBeInTheDocument()
  })

  it('keeps the player cards in both views and returns to season totals', async () => {
    const user = await openWeeks()
    expect(screen.getByRole('list', { name: 'Selected players' })).toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'Stat views' })).toBeNull()
    await user.click(button('Player view', 'Season totals'))
    expect(await screen.findByRole('region', { name: 'Stat views' })).toBeInTheDocument()
    expect(screen.queryByRole('group', { name: 'Weekly dot graph' })).toBeNull()
  })

  it('is not offered for teams', async () => {
    const user = await openWeeks()
    await user.click(button('Players or teams', 'Teams'))
    expect(screen.queryByRole('group', { name: 'Player view' })).toBeNull()
    expect(screen.queryByRole('group', { name: 'Weekly dot graph' })).toBeNull()
  })

  it('asks for a player when none is selected', async () => {
    const user = await onlyAllen()
    await user.click(screen.getByRole('button', { name: 'Remove Josh Allen' }))
    expect(screen.getByText('Add a player to start comparing.')).toBeInTheDocument()
  })
})

describe('week selector', () => {
  it('starts with all 18 weeks', async () => {
    await onlyAllen()
    expect(tableWeeks(playerTable())).toHaveLength(18)
    expect(weekChip(1)).toHaveAttribute('aria-pressed', 'true')
    expect(totals()).toHaveTextContent('18 weeks chosen')
  })

  it('narrows the table, graph and totals to the last four weeks', async () => {
    const user = await onlyAllen()
    const season = totalOf('Pass Yds')
    await user.click(screen.getByRole('button', { name: 'Last 4' }))
    expect(tableWeeks(playerTable())).toEqual(['Week 15', 'Week 16', 'Week 17', 'Week 18'])
    expect(within(graph()).getAllByTestId('dot')).toHaveLength(4)
    expect(within(graph()).getAllByTestId('x-tick')).toHaveLength(4)
    expect(totals()).toHaveTextContent('4 weeks chosen')
    expect(totalOf('Pass Yds')).not.toEqual(season)
  })

  it('chooses a range with the From and To selects', async () => {
    const user = await onlyAllen()
    await user.selectOptions(select('First week'), '3')
    await user.selectOptions(select('Last week'), '5')
    expect(tableWeeks(playerTable())).toEqual(['Week 3', 'Week 4', 'Week 5'])
  })

  it('moves the other end of the range when From passes To', async () => {
    const user = await onlyAllen()
    await user.selectOptions(select('Last week'), '4')
    await user.selectOptions(select('First week'), '7')
    expect(tableWeeks(playerTable())).toEqual(['Week 7'])
  })

  it('picks single weeks after clearing', async () => {
    const user = await onlyAllen()
    await user.click(screen.getByRole('button', { name: 'Clear' }))
    expect(screen.getByText('Pick at least one week.')).toBeInTheDocument()
    expect(screen.queryByRole('group', { name: 'Weekly dot graph' })).toBeNull()
    for (const n of [3, 1, 2]) await user.click(weekChip(n))
    expect(tableWeeks(playerTable())).toEqual(['Week 1', 'Week 2', 'Week 3'])
    await user.click(screen.getByRole('button', { name: 'All' }))
    expect(tableWeeks(playerTable())).toHaveLength(18)
  })
})

describe('totals on the side', () => {
  it('groups totals by category, including usage', async () => {
    await onlyAllen()
    const names = within(totals())
      .getAllByRole('region')
      .map((r) => r.getAttribute('aria-label'))
    expect(names).toEqual(['Passing totals', 'Rushing totals', 'Totals totals', 'Usage totals'])
  })

  it('adds every week up to the season value', async () => {
    await onlyAllen()
    expect(totalOf('Pass Yds')).toEqual(['3,731'])
    expect(totalOf('Comp %')).toEqual(['63.6'])
    expect(totalOf('Snaps')).toEqual(['1,050'])
  })

  it('graphs the stat that is picked', async () => {
    const user = await onlyAllen()
    await user.click(within(totals()).getByRole('button', { name: 'Snaps' }))
    expect(select('Weekly stat')).toHaveDisplayValue('Snaps')
    expect(within(graph()).getByTestId('y-title')).toHaveTextContent('Snaps')
    expect(within(totals()).getByRole('button', { name: 'Snaps' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
  })
})

describe('weekly dot graph', () => {
  it('plots weeks along x with a trend line that can be turned off', async () => {
    const user = await onlyAllen()
    expect(within(graph()).getByTestId('x-title')).toHaveTextContent('Week')
    expect(within(graph()).getByTestId('y-title')).toHaveTextContent('Pass Yds')
    expect(within(graph()).getAllByTestId('dot')).toHaveLength(17)
    expect(within(graph()).getAllByTestId('trend-line')).toHaveLength(1)
    await user.click(screen.getByRole('checkbox', { name: 'Trend lines' }))
    expect(within(graph()).queryByTestId('trend-line')).toBeNull()
  })

  it('compares one stat against another, a dot for each week', async () => {
    const user = await onlyAllen()
    await user.click(button('Graph type', 'Stat vs stat'))
    await user.selectOptions(select('Weekly X axis'), 'snaps')
    await user.selectOptions(select('Weekly Y axis'), 'passYds')
    expect(within(graph()).getByTestId('x-title')).toHaveTextContent('Snaps')
    expect(within(graph()).getByTestId('y-title')).toHaveTextContent('Pass Yds')
    expect(within(graph()).getAllByTestId('dot')).toHaveLength(17)
    expect(within(graph()).getAllByRole('listitem')[0]).toHaveTextContent(
      /Josh Allen, Week 1: Snaps \d+, Pass Yds \d+/,
    )
  })

  it('colours each player and gives each a trend', async () => {
    const user = await openWeeks()
    await user.click(within(totals()).getByRole('button', { name: 'Snaps' }))
    const colors = new Set(
      within(graph())
        .getAllByTestId('dot')
        .map((d) => d.style.background),
    )
    expect(colors).toEqual(new Set([seriesColor(0), seriesColor(1), seriesColor(2)]))
    expect(within(graph()).getAllByTestId('trend-line')).toHaveLength(3)
    const trends = screen.getByRole('list', { name: 'Snaps trends' })
    expect(within(trends).getAllByRole('listitem')).toHaveLength(3)
  })

  it('says when a player has no values for the stat', async () => {
    await openWeeks()
    const trends = screen.getByRole('list', { name: 'Pass Yds trends' })
    expect(trends).toHaveTextContent('S. Barkley No values in these weeks')
  })
})

describe('comparing players week by week', () => {
  it('shows the graphed stat for each player with a total row', async () => {
    const user = await openWeeks()
    await user.click(within(totals()).getByRole('button', { name: 'Snaps' }))
    const table = screen.getByRole('table', { name: 'Snaps by week and player' })
    expect(
      within(table)
        .getAllByRole('columnheader')
        .map((h) => h.textContent),
    ).toEqual(['Week', 'J. Allen', 'S. Barkley', 'J. Chase'])
    expect(tableWeeks(table)).toHaveLength(18)
    expect(within(table).getByRole('rowheader', { name: 'Total' })).toBeInTheDocument()
    expect(within(table).getAllByText('(best)').length).toBeGreaterThan(0)
  })

  it('shows both stats when comparing one against another', async () => {
    const user = await openWeeks()
    await user.click(button('Graph type', 'Stat vs stat'))
    await user.selectOptions(select('Weekly X axis'), 'snaps')
    await user.selectOptions(select('Weekly Y axis'), 'scrim')
    expect(screen.getByRole('table', { name: 'Snaps by week and player' })).toBeInTheDocument()
    expect(
      screen.getByRole('table', { name: 'Scrimmage Yds by week and player' }),
    ).toBeInTheDocument()
  })

  it('labels the data as sample data and has no serious accessibility violations', async () => {
    await openWeeks()
    expect(screen.getByText(/Sample data: weekly values and snap counts/)).toBeInTheDocument()
    await expectAccessible()
  })
})

describe('season totals dot graph', () => {
  async function openGraph(): Promise<User> {
    const user = userEvent.setup()
    render(<App />)
    await screen.findByRole('list', { name: 'Selected players' })
    await user.click(screen.getByRole('tab', { name: '2D chart' }))
    await user.click(button('Chart type', 'Dot graph'))
    return user
  }
  const dots = () => screen.getByRole('group', { name: 'Dot graph' })

  it('starts with one stat along x and a row for each player', async () => {
    await openGraph()
    expect(select('Graph X axis')).toHaveDisplayValue('Pass Yds')
    expect(select('Graph Y axis')).toHaveDisplayValue('None (X axis only)')
    expect(
      within(dots())
        .getAllByTestId('y-tick')
        .map((t) => t.textContent),
    ).toEqual(['J. Allen', 'S. Barkley', 'J. Chase'])
    expect(screen.getByText(/No value, so not plotted: S. Barkley, J. Chase/)).toBeInTheDocument()
  })

  it('compares two stats with the league in gray', async () => {
    const user = await openGraph()
    await user.selectOptions(select('Graph X axis'), 'snaps')
    await user.selectOptions(select('Graph Y axis'), 'scrim')
    expect(within(dots()).getByTestId('x-title')).toHaveTextContent('Snaps')
    expect(within(dots()).getByTestId('y-title')).toHaveTextContent('Scrimmage Yds')
    expect(within(dots()).getAllByTestId('dot')).toHaveLength(3)
    expect(within(dots()).getAllByTestId('league-dot').length).toBeGreaterThan(5)
    await expectAccessible()
  })

  it('keeps Bars as the default and Teams on their dot plot', async () => {
    const user = userEvent.setup()
    render(<App />)
    await screen.findByRole('list', { name: 'Selected players' })
    await user.click(screen.getByRole('tab', { name: '2D chart' }))
    expect(button('Chart type', 'Bars')).toHaveAttribute('aria-pressed', 'true')
    await user.click(button('Players or teams', 'Teams'))
    await screen.findByRole('list', { name: 'Selected teams' })
    await user.click(button('Chart type', 'Dot plot'))
    expect(screen.getByRole('group', { name: 'Dot plot' })).toBeInTheDocument()
  })
})
