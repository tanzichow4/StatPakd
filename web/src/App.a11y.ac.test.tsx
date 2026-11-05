import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import App from './App'
import { seriousViolations } from './test/axe'

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
const selectedNames = () =>
  removeButtons().map((b) => (b.getAttribute('aria-label') ?? '').replace(/^Remove /, ''))
const kindGroup = () => screen.getByRole('group', { name: 'Players or teams' })

async function loaded() {
  await waitFor(() => expect(removeButtons().length).toBeGreaterThan(0))
  await act(async () => {})
}
async function tab(user: User, name: string) {
  await user.click(within(panel()).getByRole('tab', { name }))
  await act(async () => {})
}
async function chart(user: User, name: 'Bars' | 'Radar') {
  await tab(user, '2D chart')
  await user.click(within(panel()).getByRole('button', { name }))
  await act(async () => {})
}
async function goTeams(user: User) {
  await user.click(within(kindGroup()).getByRole('button', { name: 'Teams' }))
  await screen.findByRole('list', { name: 'Selected teams' })
  await loaded()
}
async function breakdown(user: User) {
  const sw = screen.getByRole('group', { name: 'Team view' })
  await user.click(within(sw).getByRole('button', { name: 'Team breakdown' }))
  await screen.findByRole('region', { name: 'Share of team production' })
  await screen.findAllByRole('rowheader')
  await act(async () => {})
}

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

/** Lists tab-order problems: positive tabindex, or focusable content inside aria-hidden. */
function structureProblems(): string[] {
  const problems: string[] = []
  document.querySelectorAll('[tabindex]').forEach((el) => {
    if (Number(el.getAttribute('tabindex')) > 0)
      problems.push(`positive: ${el.outerHTML.slice(0, 80)}`)
  })
  document.querySelectorAll('[aria-hidden="true"]').forEach((hidden) => {
    if (hidden.matches(FOCUSABLE) || hidden.querySelector(FOCUSABLE))
      problems.push(`hidden focusable: ${hidden.outerHTML.slice(0, 80)}`)
  })
  return problems
}

describe('AC17/AC14: axe finds no serious or critical issue in V1 (Players compare)', () => {
  for (const name of ['Table', '3D chart'] as const) {
    it(`AC17: Players, ${name} tab`, async () => {
      const user = userEvent.setup()
      render(<App />)
      await loaded()
      await tab(user, name)
      expect(await seriousViolations(document.body)).toEqual([])
    })
  }
  it('AC17: Players, Bars', async () => {
    const user = userEvent.setup()
    render(<App />)
    await loaded()
    await chart(user, 'Bars')
    expect(await seriousViolations(document.body)).toEqual([])
  })
  it('AC17: Players, Radar', async () => {
    const user = userEvent.setup()
    render(<App />)
    await loaded()
    await chart(user, 'Radar')
    expect(await seriousViolations(document.body)).toEqual([])
  })
})

describe('AC17/AC14: axe on V2 (Teams compare)', () => {
  it('AC17: Teams, Table', async () => {
    const user = userEvent.setup()
    render(<App />)
    await loaded()
    await goTeams(user)
    await tab(user, 'Table')
    expect(await seriousViolations(document.body)).toEqual([])
  })
  it('AC17: Teams, Bars', async () => {
    const user = userEvent.setup()
    render(<App />)
    await loaded()
    await goTeams(user)
    await chart(user, 'Bars')
    expect(await seriousViolations(document.body)).toEqual([])
  })
  it('AC17: Teams, Radar', async () => {
    const user = userEvent.setup()
    render(<App />)
    await loaded()
    await goTeams(user)
    await chart(user, 'Radar')
    expect(await seriousViolations(document.body)).toEqual([])
  })
  it('AC17: Teams, 3D', async () => {
    const user = userEvent.setup()
    render(<App />)
    await loaded()
    await goTeams(user)
    await tab(user, '3D chart')
    expect(await seriousViolations(document.body)).toEqual([])
  })
})

describe('AC17/AC14: axe on V3-V6', () => {
  it('AC17: V3 the empty state (every entity removed)', async () => {
    const user = userEvent.setup()
    render(<App />)
    await loaded()
    while (removeButtons().length > 0) await user.click(removeButtons()[0])
    expect(screen.getByText(/to start comparing/)).toBeInTheDocument()
    expect(await seriousViolations(document.body)).toEqual([])
  })
  it('AC17: V4 the Add popover open with position chips', async () => {
    const user = userEvent.setup()
    render(<App />)
    await loaded()
    await user.click(screen.getByRole('button', { name: /^Add player/ }))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByRole('group', { name: 'Filter by position' })).toBeInTheDocument()
    expect(await seriousViolations(document.body)).toEqual([])
  })
  it('AC17: V5 the add-stat menu open', async () => {
    const user = userEvent.setup()
    render(<App />)
    await loaded()
    await user.click(await screen.findByRole('button', { name: 'Add stat to Passing' }))
    expect(screen.getByRole('group', { name: 'Stats to add to Passing' })).toBeInTheDocument()
    expect(await seriousViolations(document.body)).toEqual([])
  })
  for (const unit of ['Offense', 'Defense'] as const) {
    it(`AC17: V6 Teams breakdown, ${unit}`, async () => {
      const user = userEvent.setup()
      render(<App />)
      await loaded()
      await goTeams(user)
      await breakdown(user)
      if (unit === 'Defense') {
        await user.click(
          within(screen.getByRole('group', { name: 'Unit' })).getByRole('button', { name: unit }),
        )
        await act(async () => {})
      }
      expect(await seriousViolations(document.body)).toEqual([])
    })
  }
})

describe('AC14: names on controls, regions and tables', () => {
  it('AC14: every button, input, select, tablist, region and table has an accessible name', async () => {
    const user = userEvent.setup()
    render(<App />)
    await loaded()
    await tab(user, 'Table')
    const roles = ['button', 'combobox', 'searchbox', 'checkbox', 'tablist', 'tab', 'table']
    for (const role of roles) {
      for (const el of screen.queryAllByRole(role)) {
        expect(el).toHaveAccessibleName()
      }
    }
    for (const el of screen.queryAllByRole('region')) expect(el).toHaveAccessibleName()
  })
  it('AC14: entity remove buttons are named by action and target', async () => {
    render(<App />)
    await loaded()
    const names = selectedNames()
    expect(names.length).toBeGreaterThan(0)
    for (const n of names) {
      expect(screen.getByRole('button', { name: `Remove ${n}` })).toBeVisible()
    }
  })
  it('AC14: the Teams breakdown scroll region and roster table are named', async () => {
    const user = userEvent.setup()
    render(<App />)
    await loaded()
    await goTeams(user)
    await breakdown(user)
    expect(screen.getByRole('region', { name: 'Roster table' })).toHaveAccessibleName()
    for (const t of screen.getAllByRole('table')) expect(t).toHaveAccessibleName()
  })
})

describe('AC10: tab order structure', () => {
  it('AC10: no positive tabindex and nothing focusable in aria-hidden, Players 3D', async () => {
    render(<App />)
    await loaded()
    expect(document.querySelectorAll('[tabindex]').length).toBeGreaterThan(0)
    expect(structureProblems()).toEqual([])
  })
  it('AC10: same on Players Table, Bars, Radar', async () => {
    const user = userEvent.setup()
    render(<App />)
    await loaded()
    await tab(user, 'Table')
    expect(structureProblems()).toEqual([])
    await chart(user, 'Bars')
    expect(structureProblems()).toEqual([])
    await chart(user, 'Radar')
    expect(structureProblems()).toEqual([])
  })
  it('AC10: same on the Add popover and the add-stat menu', async () => {
    const user = userEvent.setup()
    render(<App />)
    await loaded()
    await user.click(screen.getByRole('button', { name: /^Add player/ }))
    expect(structureProblems()).toEqual([])
    await user.keyboard('{Escape}')
    await user.click(await screen.findByRole('button', { name: 'Add stat to Passing' }))
    expect(structureProblems()).toEqual([])
  })
  it('AC10: same on the Teams breakdown', async () => {
    const user = userEvent.setup()
    render(<App />)
    await loaded()
    await goTeams(user)
    await breakdown(user)
    expect(structureProblems()).toEqual([])
  })
  it('AC10: no module stylesheet reorders items (no "order:" or "-reverse")', () => {
    const sheets = import.meta.glob('./**/*.module.css', {
      query: '?raw',
      import: 'default',
      eager: true,
    }) as Record<string, string>
    const entries = Object.entries(sheets)
    expect(entries.length).toBeGreaterThan(5)
    const offenders: string[] = []
    for (const [file, css] of entries) {
      const stripped = css.replace(/\/\*[\s\S]*?\*\//g, '')
      offenders.push(...(/(^|[;{\s])order\s*:|-reverse/.test(stripped) ? [file] : []))
    }
    expect(offenders).toEqual([])
  })
})

describe('AC16: selected series are available as text in every view', () => {
  it('AC16: Players Table headers carry each selected name', async () => {
    const user = userEvent.setup()
    render(<App />)
    await loaded()
    const names = selectedNames()
    expect(names.length).toBeGreaterThan(0)
    await tab(user, 'Table')
    const heads = within(panel())
      .getAllByRole('columnheader')
      .map((h) => h.textContent ?? '')
    expect(names.filter((n) => !heads.some((h) => h.includes(n)))).toEqual([])
  })
  it('AC16: Players Bars, Radar and 3D panels contain each selected name', async () => {
    const user = userEvent.setup()
    render(<App />)
    await loaded()
    const names = selectedNames()
    expect(names.length).toBeGreaterThan(0)
    await chart(user, 'Bars')
    // Bars label each line with the entity's short name, so match on the surname.
    const barLines = within(within(panel()).getByRole('group', { name: 'Bars chart' }))
      .getAllByRole('listitem')
      .map((li) => li.textContent ?? '')
    for (const n of names) {
      const surname = n.split(' ').slice(-1)[0]
      expect(
        barLines.some((t) => t.includes(surname)),
        `bars ${n}`,
      ).toBe(true)
    }
    await chart(user, 'Radar')
    for (const n of names) {
      expect(within(panel()).getAllByText(n).length).toBeGreaterThan(0)
    }
    await tab(user, '3D chart')
    const readout = within(panel()).getByRole('complementary')
    for (const n of names) {
      expect(within(readout).getAllByText(n).length).toBeGreaterThan(0)
    }
  })
  it('AC16: Teams Table headers carry each selected team name', async () => {
    const user = userEvent.setup()
    render(<App />)
    await loaded()
    await goTeams(user)
    const names = selectedNames()
    expect(names.length).toBeGreaterThan(0)
    await tab(user, 'Table')
    const heads = within(panel())
      .getAllByRole('columnheader')
      .map((h) => h.textContent ?? '')
    expect(names.filter((n) => !heads.some((h) => h.includes(n)))).toEqual([])
  })
  it('AC16: Teams Bars, Radar and 3D panels contain each selected team name', async () => {
    const user = userEvent.setup()
    render(<App />)
    await loaded()
    await goTeams(user)
    const names = selectedNames()
    expect(names.length).toBeGreaterThan(0)
    await chart(user, 'Bars')
    // Each bar line carries a visible short label (a team abbreviation), one per team per stat.
    const lines = within(within(panel()).getByRole('group', { name: 'Bars chart' })).getAllByRole(
      'listitem',
    )
    expect(lines.length % names.length).toBe(0)
    for (const li of lines) expect(li.textContent ?? '').toMatch(/\S/)
    await chart(user, 'Radar')
    for (const n of names) expect(within(panel()).getAllByText(n).length).toBeGreaterThan(0)
    await tab(user, '3D chart')
    for (const n of names) expect(within(panel()).getAllByText(n).length).toBeGreaterThan(0)
  })
  it('AC16: breakdown share segments are named in text and match roster row headers', async () => {
    const user = userEvent.setup()
    render(<App />)
    await loaded()
    await goTeams(user)
    await breakdown(user)
    const share = screen.getByRole('region', { name: 'Share of team production' })
    const legend = within(share).getByRole('list', { name: 'Legend' })
    const legendNames = within(legend)
      .getAllByRole('listitem')
      .map((li) => li.textContent ?? '')
    expect(legendNames.length).toBeGreaterThan(0)
    const rowHeads = screen.getAllByRole('rowheader').map((h) => h.textContent ?? '')
    expect(rowHeads.length).toBeGreaterThan(0)
    const segs = within(share).getAllByRole('img')
    expect(segs.length).toBeGreaterThan(0)
    for (const s of segs) expect(s).toHaveAccessibleName(/\S/)
    expect(legendNames.filter((n) => !rowHeads.some((h) => h.includes(n.trim())))).toEqual([])
  })
})
