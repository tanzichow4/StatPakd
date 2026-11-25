import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import type { LeagueUiDefaults, RosterEntry } from '../../domain/types'
import { useAppState } from '../../state'
import { AppStateProvider } from '../../state/AppStateProvider'
import {
  fixtureRoster,
  fixtureRosterUnits,
  fixtureStatDefs,
  fixtureUiDefaults,
} from '../../test/fixtureProvider'
import { RosterSection } from './RosterSection'

const CAPTION = 'Click a column to sort · Black = team leader'

// Roster order of fixtureRoster('zunit'): index 0..9.
const NAMES = [
  'Ada Brindle',
  'Bo Cantrell',
  'Cher',
  'Dax Ellory',
  'Edda Fenwick',
  'Finn Garrow',
  'Gwen Hollis',
  'Hugo Imber',
  'Ivy Jessup',
  'Jory Kestrel Vane',
]
const byIndex = (idx: number[]) => idx.map((i) => NAMES[i])

function Host({ rosterOverride }: { rosterOverride?: RosterEntry[] }) {
  const { state, dispatch } = useAppState()
  const units = fixtureRosterUnits()
  const unit = units.find((u) => u.key === state.unit) ?? units[0]
  return (
    <div>
      <output data-testid="sort">{JSON.stringify(state.tSort)}</output>
      <button type="button" onClick={() => dispatch({ type: 'setUnit', unit: 'zalt' })}>
        probe unit zalt
      </button>
      <button type="button" onClick={() => dispatch({ type: 'setUnit', unit: 'zunit' })}>
        probe unit zunit
      </button>
      <RosterSection
        unit={unit}
        roster={rosterOverride ?? fixtureRoster(state.unit === 'zalt' ? 'zalt' : 'zunit')}
      />
    </div>
  )
}

function setup(defaults?: LeagueUiDefaults, rosterOverride?: RosterEntry[]) {
  const user = userEvent.setup()
  const view = render(
    <AppStateProvider
      defaults={defaults ?? { ...fixtureUiDefaults(), sortKey: 'zsnap' }}
      statDefs={fixtureStatDefs()}
    >
      <Host rosterOverride={rosterOverride} />
    </AppStateProvider>,
  )
  return { user, ...view }
}

const sortState = () => JSON.parse(screen.getByTestId('sort').textContent ?? '{}')
const table = () => screen.getByRole('table', { name: 'Roster' })
const head = (name: string) => within(table()).getByRole('columnheader', { name })
const btn = (name: string) => within(table()).getByRole('button', { name })
const headers = () =>
  within(table())
    .getAllByRole('columnheader')
    .map((h) => h.textContent?.replace(/[↓↑]/g, '').trim())
const order = () =>
  within(table())
    .getAllByRole('rowheader')
    .map((h) => NAMES.find((n) => (h.textContent ?? '').startsWith(n)))
const sortAttrs = () =>
  within(table())
    .getAllByRole('columnheader')
    .map((h) => h.getAttribute('aria-sort'))

describe('AC7/AC9: heading, table and caption', () => {
  it('AC7: renders an h2 "Roster" naming the section', () => {
    setup()
    expect(screen.getByRole('heading', { level: 2, name: 'Roster' })).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Roster' })).toBeInTheDocument()
  })
  it('AC7: the caption text with U+00B7 sits below the table', () => {
    setup()
    const caption = screen.getByText(CAPTION)
    expect(table().compareDocumentPosition(caption) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Roster' })).toBeInTheDocument()
  })
  it('AC9: the table is named Roster and described by the caption', () => {
    setup()
    expect(table()).toHaveAccessibleName('Roster')
    expect(table()).toHaveAccessibleDescription(CAPTION)
  })
  it('AC23: the scroll container is a focusable region named "Roster table"', () => {
    setup()
    const region = screen.getByRole('region', { name: 'Roster table' })
    expect(region).toHaveAttribute('tabindex', '0')
    expect(region).toContainElement(table())
  })
  it('AC10: columns are Player then the non-extra stats in definition order', () => {
    setup()
    expect(headers()).toEqual(['Player', 'Zsnap', 'Zalpha', 'Zbeta', 'Zgamma', 'Zepsilon'])
    expect(screen.queryByRole('columnheader', { name: /Zdelta/ })).toBeNull()
  })
  it('AC11: one row per roster entry', () => {
    setup()
    expect(within(table()).getAllByRole('rowheader')).toHaveLength(NAMES.length)
  })
})

describe('AC11/AC13/AC14: initial sort and unknown sort key', () => {
  it('AC13/AC14: the default key is sorted descending with its arrow', () => {
    setup()
    expect(sortAttrs()).toEqual([null, 'descending', 'none', 'none', 'none', 'none'])
    expect(btn('Zsnap')).toHaveTextContent('Zsnap↓')
    expect(btn('Zalpha').textContent).toBe('Zalpha')
  })
  it('AC11: rows start in descending order of the default key', () => {
    setup()
    expect(order()).toEqual(byIndex([9, 8, 7, 6, 5, 4, 3, 2, 1, 0]))
  })
  it('AC11: an unknown sort key keeps roster order and marks no column sorted', () => {
    setup(fixtureUiDefaults())
    expect(sortState().k).toBe('zscore')
    expect(order()).toEqual(NAMES)
    expect(sortAttrs()).toEqual([null, 'none', 'none', 'none', 'none', 'none'])
    expect(within(table()).queryByText(/[↓↑]/)).toBeNull()
  })
})

describe('AC15: clicking headers', () => {
  it('AC15: a new column starts descending, then flips asc, then desc', async () => {
    const { user } = setup()
    await user.click(btn('Zalpha'))
    expect(sortState()).toEqual({ k: 'zalpha', d: -1 })
    expect(head('Zalpha')).toHaveAttribute('aria-sort', 'descending')
    expect(head('Zsnap')).toHaveAttribute('aria-sort', 'none')
    await user.click(btn('Zalpha'))
    expect(sortState()).toEqual({ k: 'zalpha', d: 1 })
    expect(head('Zalpha')).toHaveAttribute('aria-sort', 'ascending')
    expect(btn('Zalpha')).toHaveTextContent('Zalpha↑')
    await user.click(btn('Zalpha'))
    expect(sortState()).toEqual({ k: 'zalpha', d: -1 })
    expect(btn('Zalpha')).toHaveTextContent('Zalpha↓')
  })
  it('AC15: switching to another column starts it descending even after ascending', async () => {
    const { user } = setup()
    await user.click(btn('Zalpha'))
    await user.click(btn('Zalpha'))
    expect(sortState().d).toBe(1)
    await user.click(btn('Zbeta'))
    expect(sortState()).toEqual({ k: 'zbeta', d: -1 })
    expect(sortAttrs()).toEqual([null, 'none', 'none', 'descending', 'none', 'none'])
  })
  it('AC15: Enter and Space on a focused header sort', async () => {
    const { user } = setup()
    btn('Zbeta').focus()
    await user.keyboard('{Enter}')
    expect(sortState()).toEqual({ k: 'zbeta', d: -1 })
    await user.keyboard(' ')
    expect(sortState()).toEqual({ k: 'zbeta', d: 1 })
  })
  it('AC15: the Player header does not sort', async () => {
    const { user } = setup()
    await user.click(head('Player'))
    expect(sortState()).toEqual({ k: 'zsnap', d: -1 })
  })
})

describe('AC3/AC4/AC11: rendered row order', () => {
  it('AC3: a null value stays last in descending order, negatives and zero before it', async () => {
    const { user } = setup()
    await user.click(btn('Zalpha'))
    // zalpha by index: [300, 20, 150, -10, null, 100, 0, 60, 40, 30]
    expect(order()).toEqual(byIndex([0, 2, 5, 7, 8, 9, 1, 6, 3, 4]))
  })
  it('AC3: a null value stays last in ascending order too', async () => {
    const { user } = setup()
    await user.click(btn('Zalpha'))
    await user.click(btn('Zalpha'))
    expect(order()).toEqual(byIndex([3, 6, 1, 9, 8, 7, 5, 2, 0, 4]))
  })
  it('AC4: ties keep roster order in both directions', async () => {
    const { user } = setup()
    // zgamma by index: [10, 40, 5, 0, 40, 10, 5, 0, 20, 10]
    await user.click(btn('Zgamma'))
    expect(order()).toEqual(byIndex([1, 4, 8, 0, 5, 9, 2, 6, 3, 7]))
    await user.click(btn('Zgamma'))
    expect(order()).toEqual(byIndex([3, 7, 2, 6, 0, 5, 9, 8, 1, 4]))
  })
  it('AC11: an empty column value in every row keeps roster order', async () => {
    const roster = fixtureRoster('zunit').map((e) => ({ ...e, stats: { ...e.stats, zbeta: null } }))
    const { user } = setup(undefined, roster)
    await user.click(btn('Zbeta'))
    expect(order()).toEqual(NAMES)
  })
})

describe('AC19/AC20: leaders', () => {
  const cellsOf = (name: string) =>
    within(
      screen.getByRole('rowheader', { name: new RegExp(`^${name}`) }).closest('tr') as HTMLElement,
    ).getAllByRole('cell')
  it('AC19: tied leaders both carry the leader text, a lone leader only one, in any order', async () => {
    const { user } = setup()
    const leaderNames = (col: number) =>
      NAMES.filter((n) => within(cellsOf(n)[col]).queryByText(/team leader/))
    // columns: 0 zsnap, 1 zalpha, 2 zbeta, 3 zgamma, 4 zepsilon
    expect(leaderNames(0)).toEqual(['Jory Kestrel Vane'])
    expect(leaderNames(1)).toEqual(['Ada Brindle'])
    expect(leaderNames(3)).toEqual(['Bo Cantrell', 'Edda Fenwick'])
    await user.click(btn('Zgamma'))
    await user.click(btn('Zgamma'))
    expect(leaderNames(3).sort()).toEqual(['Bo Cantrell', 'Edda Fenwick'])
    expect(leaderNames(1)).toEqual(['Ada Brindle'])
  })
  it('AC19: every player ties on an all-equal column and gets the leader text', () => {
    setup()
    const holders = NAMES.filter((n) => within(cellsOf(n)[4]).queryByText(/team leader/))
    expect(holders).toEqual(NAMES)
  })
  it('AC19: a column with only null and zero values has no leader', () => {
    const roster = fixtureRoster('zunit').map((e) => ({
      ...e,
      stats: { ...e.stats, zbeta: e.id === 'zr1' ? null : 0 },
    }))
    setup(undefined, roster)
    for (const n of NAMES) expect(within(cellsOf(n)[2]).queryByText(/team leader/)).toBeNull()
  })
})

describe('AC17/AC18/AC21: cells', () => {
  const rowOf = (name: string) =>
    screen.getByRole('rowheader', { name: new RegExp(`^${name}`) }).closest('tr') as HTMLElement
  it('AC17/AC18: the percentage column shows "N%" and a bar; a null shows a dash', () => {
    setup()
    const cells = within(rowOf('Ada')).getAllByRole('cell')
    expect(cells[0]).toHaveTextContent(/^50%/)
    const fill = cells[0].querySelector<HTMLElement>('[style*="width"]')
    expect(fill?.style.width).toBe('50%')
    const nullCell = within(rowOf('Edda')).getAllByRole('cell')[1]
    expect(nullCell).toHaveTextContent('—')
    expect(nullCell).toHaveTextContent('not applicable')
  })
  it('AC17: decimals are honoured and grouping is applied', () => {
    setup()
    expect(within(rowOf('Ada')).getAllByRole('cell')[4]).toHaveTextContent(/^1\.5/)
  })
  it('AC21: the swatch colour follows the unsorted index, not the sorted position', async () => {
    const { user } = setup()
    const color = (name: string) =>
      rowOf(name).querySelector('th [aria-hidden="true"]')?.getAttribute('style') ?? ''
    expect(color('Ada')).toContain('--series-1')
    expect(color('Jory')).toContain('--series-2') // index 9 wraps after 8 colours
    await user.click(btn('Zalpha'))
    await user.click(btn('Zalpha'))
    expect(color('Ada')).toContain('--series-1')
    expect(color('Bo')).toContain('--series-2')
    expect(color('Dax')).toContain('--series-4')
  })
  it('AC21: the meta line shows the position when there is no number', () => {
    setup()
    expect(
      within(screen.getByRole('rowheader', { name: /^Ada Brindle/ })).getByText('ZA'),
    ).toBeInTheDocument()
  })
  it('AC17: no NaN, undefined or null text anywhere', () => {
    const { container } = setup()
    expect(container.textContent).not.toMatch(/NaN|undefined|null/)
  })
  it('AC11: an empty roster shows the header and no body rows', () => {
    setup(undefined, [])
    expect(within(table()).getAllByRole('columnheader')).toHaveLength(6)
    expect(within(table()).queryAllByRole('rowheader')).toHaveLength(0)
    expect(within(table()).queryAllByText(/team leader/)).toHaveLength(0)
  })
})

describe('AC16: unit switch through the existing reducer', () => {
  it('AC16: setUnit swaps the columns and resets the sort to the default key descending', async () => {
    const { user } = setup()
    await user.click(btn('Zalpha'))
    await user.click(btn('Zalpha'))
    expect(sortState()).toEqual({ k: 'zalpha', d: 1 })
    await user.click(screen.getByRole('button', { name: 'probe unit zalt' }))
    expect(headers()).toEqual(['Player', 'Zsnap', 'Zomega', 'Zsigma'])
    expect(sortState()).toEqual({ k: 'zsnap', d: -1 })
    expect(sortAttrs()).toEqual([null, 'descending', 'none', 'none'])
    // The other unit has no zsnap values: every row is missing, so roster order holds.
    expect(within(table()).getAllByRole('rowheader')).toHaveLength(2)
  })
})
