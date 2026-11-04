import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import App from './App'

afterEach(() => {
  window.history.pushState({}, '', '/')
})

const panel = () => screen.getByRole('region', { name: 'Stat views' })
const cards = () => screen.getByRole('list', { name: /^Selected/ })
const headers = () => within(panel()).getAllByRole('columnheader')
const rowHeaders = () => within(panel()).getAllByRole('rowheader')

async function openTable(user: ReturnType<typeof userEvent.setup>) {
  expect(await within(cards()).findByText('Josh Allen')).toBeInTheDocument()
  await user.click(within(panel()).getByRole('tab', { name: 'Table' }))
  expect(await within(panel()).findByRole('table')).toBeInTheDocument()
}

describe('AC1: the panel is mounted in the Stat views region', () => {
  it('AC1: the region holds the view tab list as its first role element', async () => {
    render(<App />)
    const first = panel().querySelector('[role]')
    expect(first).toHaveAttribute('role', 'tablist')
    expect(first).toHaveAccessibleName('View')
    expect(await within(cards()).findByText('Josh Allen')).toBeInTheDocument()
  })
  it('AC1: only one element is named Stat views', async () => {
    render(<App />)
    expect(screen.getAllByRole('region', { name: 'Stat views' })).toHaveLength(1)
    expect(await within(cards()).findByText('Josh Allen')).toBeInTheDocument()
  })
  it('AC4: the app opens on 3D with the 3D chart', async () => {
    render(<App />)
    expect(
      within(panel()).getByRole('tab', { name: '3D chart', selected: true }),
    ).toBeInTheDocument()
    expect(await within(panel()).findByRole('group', { name: '3D chart' })).toBeInTheDocument()
    expect(screen.queryByText('3D chart — coming soon')).not.toBeInTheDocument()
    expect(screen.queryByText(/coming soon/)).not.toBeInTheDocument()
  })
})

describe('AC32: the default 3D view does not duplicate App-level text', () => {
  it('AC32: player names appear once in the picker and once in the 3D readout, and no table is rendered', async () => {
    render(<App />)
    expect(await within(cards()).findByText('Josh Allen')).toBeInTheDocument()
    expect(await within(panel()).findByRole('group', { name: '3D chart' })).toBeInTheDocument()
    expect(screen.getAllByText('Josh Allen')).toHaveLength(2)
    expect(within(cards()).getAllByText('Josh Allen')).toHaveLength(1)
    expect(
      within(within(panel()).getByRole('complementary')).getAllByText('Josh Allen'),
    ).toHaveLength(1)
    expect(within(panel()).queryByRole('table')).not.toBeInTheDocument()
  })
  it('AC32: a sidebar stat label appears once in the sidebar and otherwise only in the panel', async () => {
    render(<App />)
    expect(await within(panel()).findByRole('group', { name: '3D chart' })).toBeInTheDocument()
    const all = screen.getAllByText('Pass Yds')
    const inPanel = within(panel()).getAllByText('Pass Yds')
    expect(inPanel.length).toBeGreaterThan(0)
    expect(all).toHaveLength(inPanel.length + 1)
    expect(within(panel()).queryByRole('table')).not.toBeInTheDocument()
  })
})

describe('AC12: default tables', () => {
  it('AC12: players show 3 entity columns plus Stat and 6 stat rows', async () => {
    const user = userEvent.setup()
    render(<App />)
    await openTable(user)
    expect(headers()).toHaveLength(4)
    expect(headers()[0]).toHaveTextContent('Stat')
    expect(rowHeaders()).toHaveLength(6)
    expect(within(headers()[1]).getByText('Josh Allen')).toBeInTheDocument()
    expect(within(headers()[2]).getByText('Saquon Barkley')).toBeInTheDocument()
    expect(within(headers()[3]).getByText("Ja'Marr Chase")).toBeInTheDocument()
  })
  it('AC12: player rows follow the sidebar order and use stat labels', async () => {
    const user = userEvent.setup()
    render(<App />)
    await openTable(user)
    expect(rowHeaders().map((h) => h.textContent)).toEqual([
      'Pass Yds',
      'Pass TD',
      'Rush Yds',
      'Rec Yds',
      'Scrimmage Yds',
      'Scrimmage TD',
    ])
  })
  it('AC12: teams show 3 team columns and 6 rows', async () => {
    const user = userEvent.setup()
    render(<App />)
    await openTable(user)
    await user.click(screen.getByRole('button', { name: 'Teams' }))
    expect(await within(panel()).findByText('Kansas City Chiefs')).toBeInTheDocument()
    expect(headers()).toHaveLength(4)
    expect(rowHeaders()).toHaveLength(6)
    expect(
      within(panel()).getByRole('table', { name: 'Selected teams compared by stat' }),
    ).toBeInTheDocument()
  })
  it('AC18: the caption shows under the table', async () => {
    const user = userEvent.setup()
    render(<App />)
    await openTable(user)
    expect(
      within(panel()).getByText('Black = best among selected · — = not applicable to position'),
    ).toBeVisible()
  })
  it('AC19: the scroll region is named and focusable', async () => {
    const user = userEvent.setup()
    render(<App />)
    await openTable(user)
    expect(within(panel()).getByRole('region', { name: 'Comparison table' })).toHaveAttribute(
      'tabindex',
      '0',
    )
  })
})

describe('AC16: lower is better', () => {
  it('AC16: the Teams defaults show the note on exactly the lower-is-better rows', async () => {
    const user = userEvent.setup()
    render(<App />)
    await openTable(user)
    await user.click(screen.getByRole('button', { name: 'Teams' }))
    expect(await within(panel()).findByText('Kansas City Chiefs')).toBeInTheDocument()
    const notes = within(panel()).getAllByText('lower is better')
    expect(notes.length).toBeGreaterThan(0)
    expect(within(panel()).getByRole('rowheader', { name: /Pts Allowed/ })).toHaveTextContent(
      'lower is better',
    )
    expect(within(panel()).getByRole('rowheader', { name: /^Points \/ G/ })).not.toHaveTextContent(
      'lower is better',
    )
  })
  it('AC16: Players show no note until Interceptions is added from the sidebar', async () => {
    const user = userEvent.setup()
    render(<App />)
    await openTable(user)
    expect(within(panel()).queryByText('lower is better')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Add stat to Passing' }))
    await user.click(screen.getByRole('button', { name: 'Interceptions' }))
    expect(
      await within(panel()).findByRole('rowheader', { name: /Interceptions/ }),
    ).toHaveTextContent('lower is better')
  })
})

describe('AC10: sidebar changes follow into the table', () => {
  it('AC10: a stat added in the sidebar appears in canonical position', async () => {
    const user = userEvent.setup()
    render(<App />)
    await openTable(user)
    await user.click(screen.getByRole('button', { name: 'Add stat to Passing' }))
    await user.click(screen.getByRole('button', { name: 'Passer Rating' }))
    expect(rowHeaders().map((h) => h.textContent)).toEqual([
      'Pass Yds',
      'Pass TD',
      'Passer Rating',
      'Rush Yds',
      'Rec Yds',
      'Scrimmage Yds',
      'Scrimmage TD',
    ])
  })
})

describe('AC11: season switching', () => {
  it('AC11: choosing another season changes at least one cell', async () => {
    const user = userEvent.setup()
    render(<App />)
    await openTable(user)
    const cellTexts = () =>
      within(panel())
        .getAllByRole('cell')
        .map((c) => c.textContent)
    const before = cellTexts()
    await user.selectOptions(screen.getByRole('combobox', { name: 'Season' }), '2023')
    await waitFor(() => expect(cellTexts()).not.toEqual(before))
    expect(within(panel()).getAllByRole('cell')).toHaveLength(before.length)
  })
})

describe('AC17: compact headers against the mock data', () => {
  it('AC17: adding players to reach 5 switches every header to the short form', async () => {
    const user = userEvent.setup()
    render(<App />)
    await openTable(user)
    expect(within(headers()[1]).getByText('Josh Allen')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /^Add player/ }))
    const dialog = screen.getByRole('dialog')
    await user.click(within(dialog).getAllByRole('button', { name: /^Add / })[0])
    expect(headers()).toHaveLength(5)
    expect(within(headers()[1]).getByText('Josh Allen')).toBeInTheDocument()
    await user.click(within(dialog).getAllByRole('button', { name: /^Add / })[0])
    expect(headers()).toHaveLength(6)
    expect(within(panel()).queryByText('Josh Allen')).not.toBeInTheDocument()
    expect(headers()[1]).toHaveTextContent('QB')
    expect(headers()[1]).not.toHaveTextContent('·')
  })
})
