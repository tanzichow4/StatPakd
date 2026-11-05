import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import App from './App'
import { seriousViolations } from './test/axe'

afterEach(() => {
  window.history.pushState({}, '', '/')
})

const live = () => document.querySelector('[aria-live="polite"]')

describe('AC15: the live region stays quiet without a user edit', () => {
  it('AC15: initial load leaves the region empty', async () => {
    render(<App />)
    expect(await screen.findByRole('list', { name: 'Selected players' })).toBeInTheDocument()
    await act(async () => {})
    expect(live()?.textContent).toBe('')
  })

  it('AC15: a season change leaves the region empty', async () => {
    const user = userEvent.setup()
    render(<App />)
    await screen.findByRole('list', { name: 'Selected players' })
    const select = screen.getByRole('combobox', { name: 'Season' })
    await within(select).findAllByRole('option')
    const other = within(select)
      .getAllByRole('option')
      .find((o) => (o as HTMLOptionElement).value !== (select as HTMLSelectElement).value)
    await user.selectOptions(select, (other as HTMLOptionElement).value)
    await act(async () => {})
    expect(live()?.textContent).toBe('')
  })

  it('AC15: a kind switch leaves the region empty', async () => {
    const user = userEvent.setup()
    render(<App />)
    await screen.findByRole('list', { name: 'Selected players' })
    const kind = screen.getByRole('group', { name: 'Players or teams' })
    await user.click(within(kind).getByRole('button', { name: 'Teams' }))
    expect(await screen.findByRole('list', { name: 'Selected teams' })).toBeInTheDocument()
    expect(live()?.textContent).toBe('')
  })
})

type User = ReturnType<typeof userEvent.setup>

const panel = () => screen.getByRole('region', { name: 'Stat views' })
const removeButtons = () =>
  screen.queryAllByRole('button', { name: /^Remove / }).filter((b) => !b.closest('dialog'))
const names = () =>
  removeButtons().map((b) => (b.getAttribute('aria-label') ?? '').replace(/^Remove /, ''))

async function loaded() {
  await waitFor(() => expect(removeButtons().length).toBeGreaterThan(0))
  await act(async () => {})
}
async function tab(user: User, name: string) {
  await user.click(within(panel()).getByRole('tab', { name }))
  await act(async () => {})
}
async function goTeams(user: User) {
  const kind = screen.getByRole('group', { name: 'Players or teams' })
  await user.click(within(kind).getByRole('button', { name: 'Teams' }))
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

describe('AC17: no serious or critical axe violations in V1 to V6', () => {
  for (const kind of ['Players', 'Teams'] as const) {
    for (const name of ['Table', '2D chart', '3D chart']) {
      it(`AC17: V1/V2 ${kind}, ${name}`, async () => {
        const user = userEvent.setup()
        render(<App />)
        await loaded()
        if (kind === 'Teams') await goTeams(user)
        await tab(user, name)
        expect(await seriousViolations(document.body)).toEqual([])
      })
    }
  }
  it('AC17: V3 the empty state', async () => {
    const user = userEvent.setup()
    render(<App />)
    await loaded()
    while (removeButtons().length > 0) await user.click(removeButtons()[0])
    expect(await seriousViolations(document.body)).toEqual([])
  })
  it('AC17: V4 the Add popover open', async () => {
    const user = userEvent.setup()
    render(<App />)
    await loaded()
    await user.click(screen.getByRole('button', { name: /^Add player/ }))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(await seriousViolations(document.body)).toEqual([])
  })
  it('AC17: V5 the add-stat menu open', async () => {
    const user = userEvent.setup()
    render(<App />)
    await loaded()
    await user.click(await screen.findByRole('button', { name: 'Add stat to Passing' }))
    expect(await seriousViolations(document.body)).toEqual([])
  })
  for (const unit of ['Offense', 'Defense']) {
    it(`AC17: V6 Teams breakdown, ${unit}`, async () => {
      const user = userEvent.setup()
      render(<App />)
      await loaded()
      await goTeams(user)
      await breakdown(user)
      await user.click(
        within(screen.getByRole('group', { name: 'Unit' })).getByRole('button', { name: unit }),
      )
      await act(async () => {})
      expect(await seriousViolations(document.body)).toEqual([])
    })
  }
})

describe('AC10: tab order structure', () => {
  it('AC10: no positive tabindex and no focusable element inside aria-hidden', async () => {
    render(<App />)
    await loaded()
    document.querySelectorAll('[tabindex]').forEach((el) => {
      expect(Number(el.getAttribute('tabindex'))).toBeLessThanOrEqual(0)
    })
    const focusable = 'a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"])'
    document.querySelectorAll('[aria-hidden="true"]').forEach((el) => {
      expect(el.matches(focusable)).toBe(false)
      expect(el.querySelector(focusable)).toBeNull()
    })
  })
  it('AC10: no module stylesheet reorders items (no "order:" or "-reverse")', () => {
    const sheets = import.meta.glob('./**/*.module.css', {
      query: '?raw',
      import: 'default',
      eager: true,
    }) as Record<string, string>
    const entries = Object.entries(sheets)
    expect(entries.length).toBeGreaterThan(5)
    for (const [, css] of entries) {
      const stripped = css.replace(/\/\*[\s\S]*?\*\//g, '')
      expect(stripped).not.toMatch(/(^|[;{\s])order\s*:/)
      expect(stripped).not.toMatch(/-reverse/)
    }
  })
})

describe('AC16: each selected entity is available as text', () => {
  it('AC16: Players Table headers and 3D readout carry each selected name', async () => {
    const user = userEvent.setup()
    render(<App />)
    await loaded()
    const selected = names()
    expect(selected.length).toBeGreaterThan(0)
    await tab(user, 'Table')
    const heads = within(panel())
      .getAllByRole('columnheader')
      .map((h) => h.textContent ?? '')
    for (const n of selected) expect(heads.some((h) => h.includes(n))).toBe(true)
    await tab(user, '3D chart')
    const readout = within(panel()).getByRole('complementary')
    for (const n of selected) expect(within(readout).getAllByText(n).length).toBeGreaterThan(0)
  })
  it('AC16: the roster rows name each player in the Teams breakdown', async () => {
    const user = userEvent.setup()
    render(<App />)
    await loaded()
    await goTeams(user)
    await breakdown(user)
    const heads = screen.getAllByRole('rowheader')
    expect(heads.length).toBeGreaterThan(0)
    for (const h of heads) expect(h.textContent ?? '').not.toBe('')
  })
})
