import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { RosterTable } from './RosterTable'
import type { RosterColumn, RosterRow } from './rosterModel'

// Invented presentational data. Column "pct" is a percentage column and is sorted descending,
// "qty" is plain, "nul" is empty for everybody.
const columns: RosterColumn[] = [
  { key: 'pct', label: 'Pct stat', percent: true, ariaSort: 'descending', arrow: '↓' },
  { key: 'qty', label: 'Qty stat', percent: false, ariaSort: 'none', arrow: null },
  { key: 'nul', label: 'Nul stat', percent: false, ariaSort: 'none', arrow: null },
]

const rows: RosterRow[] = [
  {
    id: 'a',
    name: 'Ada Brindle',
    meta: 'ZA · #12',
    color: 'var(--series-1)',
    cells: [
      { key: 'pct', text: '87%', leader: true, bar: 87 },
      { key: 'qty', text: '1,234', leader: true, bar: null },
      { key: 'nul', text: '—', leader: false, bar: null },
    ],
  },
  {
    id: 'b',
    name: 'Bo Cantrell',
    meta: 'ZB',
    color: 'var(--series-2)',
    cells: [
      { key: 'pct', text: '—', leader: false, bar: 0 },
      { key: 'qty', text: '1,234', leader: true, bar: null },
      { key: 'nul', text: '—', leader: false, bar: null },
    ],
  },
  {
    id: 'c',
    name: 'Cher',
    meta: 'ZC',
    color: 'var(--series-3)',
    cells: [
      { key: 'pct', text: '100%', leader: false, bar: 100 },
      { key: 'qty', text: '5', leader: false, bar: null },
      { key: 'nul', text: '—', leader: false, bar: null },
    ],
  },
]

function setup(props: Partial<{ columns: RosterColumn[]; rows: RosterRow[] }> = {}) {
  const onSort = vi.fn()
  const user = userEvent.setup()
  const view = render(
    <div>
      <h2 id="rt-head">Roster</h2>
      <RosterTable
        columns={props.columns ?? columns}
        rows={props.rows ?? rows}
        labelledBy="rt-head"
        describedBy="rt-cap"
        onSort={onSort}
      />
      <p id="rt-cap">Caption text</p>
    </div>,
  )
  return { user, onSort, ...view }
}

const table = () => screen.getByRole('table', { name: 'Roster' })
const header = (name: string) => screen.getByRole('columnheader', { name })
const cellsOfRow = (name: string) => {
  const rowHead = screen.getByRole('rowheader', { name: new RegExp(`^${name}`) })
  return within(rowHead.closest('tr') as HTMLElement).getAllByRole('cell')
}

describe('AC9: semantic table', () => {
  it('AC9: exposes table, rowgroup, row, columnheader, rowheader and cell roles', () => {
    setup()
    expect(table()).toBeInTheDocument()
    expect(within(table()).getAllByRole('rowgroup')).toHaveLength(2)
    expect(within(table()).getAllByRole('row')).toHaveLength(1 + rows.length)
    expect(within(table()).getAllByRole('columnheader')).toHaveLength(1 + columns.length)
    expect(within(table()).getAllByRole('rowheader')).toHaveLength(rows.length)
    expect(within(table()).getAllByRole('cell')).toHaveLength(rows.length * columns.length)
  })
  it('AC9: the table is named by its heading and described by the caption', () => {
    setup()
    expect(table()).toHaveAccessibleName('Roster')
    expect(table()).toHaveAccessibleDescription('Caption text')
  })
})

describe('AC10/AC12/AC13: headers', () => {
  it('AC10: Player comes first, then the column labels in order', () => {
    setup()
    expect(
      within(table())
        .getAllByRole('columnheader')
        .map((h) => h.textContent?.replace(/[↓↑]/g, '').trim()),
    ).toEqual(['Player', 'Pct stat', 'Qty stat', 'Nul stat'])
  })
  it('AC12: the Player header is not a button and has no aria-sort', () => {
    setup()
    const player = header('Player')
    expect(within(player).queryByRole('button')).toBeNull()
    expect(player).not.toHaveAttribute('aria-sort')
  })
  it('AC12: each stat header holds one button named exactly the label, without the arrow', () => {
    setup()
    for (const c of columns) {
      expect(screen.getByRole('button', { name: c.label })).toBeInTheDocument()
    }
    expect(screen.queryByRole('button', { name: /[↓↑]/ })).toBeNull()
    expect(screen.getAllByRole('button')).toHaveLength(columns.length)
  })
  it('AC12: the arrow glyph is hidden from assistive technology', () => {
    setup()
    const btn = screen.getByRole('button', { name: 'Pct stat' })
    const arrow = within(btn).getByText('↓')
    expect(arrow.closest('[aria-hidden="true"]')).not.toBeNull()
  })
  it('AC13: aria-sort is on the th, not on the button, and none elsewhere', () => {
    setup()
    expect(header('Pct stat')).toHaveAttribute('aria-sort', 'descending')
    expect(header('Qty stat')).toHaveAttribute('aria-sort', 'none')
    expect(header('Nul stat')).toHaveAttribute('aria-sort', 'none')
    for (const b of screen.getAllByRole('button')) expect(b).not.toHaveAttribute('aria-sort')
  })
  it('AC13: ascending is exposed as aria-sort="ascending"', () => {
    const asc = columns.map((c, i) =>
      i === 0 ? { ...c, ariaSort: 'ascending' as const, arrow: '↑' as const } : c,
    )
    setup({ columns: asc })
    expect(header('Pct stat')).toHaveAttribute('aria-sort', 'ascending')
  })
  it('AC14: only the sorted header shows an arrow, and it is styled differently', () => {
    setup()
    expect(screen.getByRole('button', { name: 'Pct stat' })).toHaveTextContent('Pct stat↓')
    expect(screen.getByRole('button', { name: 'Qty stat' }).textContent).toBe('Qty stat')
    expect(screen.getByRole('button', { name: 'Nul stat' }).textContent).toBe('Nul stat')
    expect(screen.getByRole('button', { name: 'Pct stat' }).className).not.toBe(
      screen.getByRole('button', { name: 'Qty stat' }).className,
    )
  })
  it('AC14: an ascending column shows the up arrow', () => {
    const asc = columns.map((c, i) =>
      i === 0 ? { ...c, ariaSort: 'ascending' as const, arrow: '↑' as const } : c,
    )
    setup({ columns: asc })
    expect(screen.getByRole('button', { name: 'Pct stat' })).toHaveTextContent('Pct stat↑')
  })
})

describe('AC15: activating a header', () => {
  it('AC15: a click calls onSort with the column key', async () => {
    const { user, onSort } = setup()
    await user.click(screen.getByRole('button', { name: 'Qty stat' }))
    expect(onSort).toHaveBeenCalledTimes(1)
    expect(onSort).toHaveBeenCalledWith('qty')
  })
  it('AC15: Enter and Space on a focused header button sort', async () => {
    const { user, onSort } = setup()
    screen.getByRole('button', { name: 'Nul stat' }).focus()
    await user.keyboard('{Enter}')
    expect(onSort).toHaveBeenLastCalledWith('nul')
    await user.keyboard(' ')
    expect(onSort).toHaveBeenCalledTimes(2)
    expect(onSort).toHaveBeenLastCalledWith('nul')
  })
  it('AC12: clicking the Player header does nothing', async () => {
    const { user, onSort } = setup()
    await user.click(header('Player'))
    expect(onSort).not.toHaveBeenCalled()
  })
})

describe('AC17: cell text', () => {
  it('AC17: shows the supplied text in order, with a dash for missing values', () => {
    setup()
    expect(cellsOfRow('Ada').map((c) => c.textContent)).toEqual([
      expect.stringContaining('87%'),
      expect.stringContaining('1,234'),
      expect.stringContaining('—'),
    ])
  })
  it('AC17: a dash cell has hidden "not applicable" text and no "0", "null" or "NaN"', () => {
    setup()
    const dash = cellsOfRow('Bo')[0]
    expect(within(dash).getByText('not applicable')).toBeInTheDocument()
    expect(dash.textContent).not.toMatch(/\b0\b|null|NaN|undefined/)
  })
  it('AC17: "%" appears only in the percentage column', () => {
    setup()
    for (const name of ['Ada', 'Bo', 'Cher']) {
      const [, qty, nul] = cellsOfRow(name)
      expect(qty.textContent).not.toContain('%')
      expect(nul.textContent).not.toContain('%')
    }
    expect(cellsOfRow('Ada')[0].textContent).toContain('%')
  })
  it('AC17/AC22: stat cells are right aligned via a class distinct from the row header', () => {
    setup()
    const cell = cellsOfRow('Ada')[1]
    const rowHead = screen.getByRole('rowheader', { name: /^Ada/ })
    expect(cell.className).not.toBe('')
    expect(cell.className).not.toBe(rowHead.className)
  })
})

describe('AC18: mini bar', () => {
  const fills = (cell: HTMLElement) =>
    Array.from(cell.querySelectorAll<HTMLElement>('[style*="width"]')).filter((e) =>
      /width:\s*\d+(\.\d+)?%/.test(e.getAttribute('style') ?? ''),
    )
  it('AC18: percent cells have a hidden bar whose fill width is the value', () => {
    setup()
    const f = fills(cellsOfRow('Ada')[0])
    expect(f).toHaveLength(1)
    expect(f[0].style.width).toBe('87%')
    expect(f[0].closest('[aria-hidden="true"]')).not.toBeNull()
  })
  it('AC18: a missing value shows an empty track (0% fill)', () => {
    setup()
    const f = fills(cellsOfRow('Bo')[0])
    expect(f).toHaveLength(1)
    expect(f[0].style.width).toBe('0%')
  })
  it('AC18: a full value fills the track at 100%', () => {
    setup()
    expect(fills(cellsOfRow('Cher')[0])[0].style.width).toBe('100%')
  })
  it('AC18: non-percent cells have no bar', () => {
    setup()
    for (const name of ['Ada', 'Bo', 'Cher']) {
      const [, qty, nul] = cellsOfRow(name)
      expect(fills(qty)).toHaveLength(0)
      expect(fills(nul)).toHaveLength(0)
    }
  })
})

describe('AC19/AC20: team leader', () => {
  it('AC19/AC20: every tied leader cell has the hidden "team leader" text', () => {
    setup()
    expect(within(cellsOfRow('Ada')[1]).getByText(/team leader/)).toBeInTheDocument()
    expect(within(cellsOfRow('Bo')[1]).getByText(/team leader/)).toBeInTheDocument()
    expect(within(cellsOfRow('Ada')[0]).getByText(/team leader/)).toBeInTheDocument()
  })
  it('AC19: non-leaders and an empty column have no "team leader" text', () => {
    setup()
    expect(within(cellsOfRow('Cher')[1]).queryByText(/team leader/)).toBeNull()
    expect(within(cellsOfRow('Cher')[0]).queryByText(/team leader/)).toBeNull()
    for (const name of ['Ada', 'Bo', 'Cher']) {
      expect(within(cellsOfRow(name)[2]).queryByText(/team leader/)).toBeNull()
    }
    expect(screen.getAllByText(/team leader/)).toHaveLength(3)
  })
  it('AC19: the leader value is styled differently from a plain value', () => {
    setup()
    const lead = within(cellsOfRow('Ada')[1]).getByText('1,234')
    const plain = within(cellsOfRow('Cher')[1]).getByText('5')
    expect(lead.className).not.toBe(plain.className)
  })
})

describe('AC21: player cell', () => {
  it('AC21: shows the name and the meta line, with a position-only meta when supplied so', () => {
    setup()
    const ada = screen.getByRole('rowheader', { name: /^Ada Brindle/ })
    expect(within(ada).getByText('Ada Brindle')).toBeInTheDocument()
    expect(within(ada).getByText('ZA · #12')).toBeInTheDocument()
    const bo = screen.getByRole('rowheader', { name: /^Bo Cantrell/ })
    expect(within(bo).getByText('ZB')).toBeInTheDocument()
  })
  it('AC21: a hidden swatch carries the player colour', () => {
    setup()
    const swatch = (name: RegExp) =>
      screen.getByRole('rowheader', { name }).querySelector('[aria-hidden="true"]') as HTMLElement
    expect(swatch(/^Ada/).getAttribute('style')).toContain('--series-1')
    expect(swatch(/^Bo/).getAttribute('style')).toContain('--series-2')
    expect(swatch(/^Cher/).getAttribute('style')).toContain('--series-3')
  })
})

describe('AC9/AC22/AC23: scroll container and layout', () => {
  it('AC23: the table sits in a focusable region named "Roster table"', () => {
    setup()
    const region = screen.getByRole('region', { name: 'Roster table' })
    expect(region).toHaveAttribute('tabindex', '0')
    expect(region).toContainElement(table())
  })
  it('AC22: the table has a minimum width of 820px', () => {
    setup()
    expect(table().style.minWidth).toBe('820px')
  })
  it('AC22: rows use a grid with a 220px player track and a 96px track per stat column', () => {
    setup()
    const tpl = (within(table()).getAllByRole('row')[0] as HTMLElement).style.gridTemplateColumns
    expect(tpl).toContain('minmax(220px, 1.6fr)')
    const repeated = /repeat\((\d+),\s*minmax\(96px, 1fr\)\)/.exec(tpl)
    const count = repeated ? Number(repeated[1]) : (tpl.match(/minmax\(96px, 1fr\)/g) ?? []).length
    expect(count).toBe(columns.length)
  })
})

describe('AC11: empty roster', () => {
  it('AC11: renders the header row and no body rows', () => {
    setup({ rows: [] })
    expect(within(table()).getAllByRole('row')).toHaveLength(1)
    expect(within(table()).getAllByRole('columnheader')).toHaveLength(1 + columns.length)
    expect(screen.queryAllByText(/team leader/)).toHaveLength(0)
  })
  it('AC17: no cell text ever shows NaN, undefined or null', () => {
    const { container } = setup()
    expect(container.textContent).not.toMatch(/NaN|undefined|null/)
  })
})
