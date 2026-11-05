import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import App from './App'

afterEach(() => {
  window.history.pushState({}, '', '/')
})

const text = () => screen.getByRole('status').textContent ?? ''
const sidebar = () => screen.getByRole('complementary', { name: 'Stats' })

async function loaded() {
  expect(await within(sidebar()).findByText('Passing')).toBeInTheDocument()
  expect(await screen.findByRole('list', { name: /^Selected/ })).toBeInTheDocument()
}

describe('AC15: App live region', () => {
  it('AC15: exactly one polite status region is present from first render, empty', () => {
    render(<App />)
    const regions = screen.getAllByRole('status')
    expect(regions).toHaveLength(1)
    expect(regions[0]).toHaveAttribute('aria-live', 'polite')
    expect(text().trim()).toBe('')
  })
  it('AC15: nothing is announced on initial load', async () => {
    render(<App />)
    await loaded()
    expect(text().trim()).toBe('')
  })
  it('AC15: nothing is announced on season change', async () => {
    const user = userEvent.setup()
    render(<App />)
    await loaded()
    const select = screen.getByRole('combobox', { name: 'Season' })
    await waitFor(() => expect(within(select).getAllByRole('option').length).toBeGreaterThan(1))
    const other = within(select)
      .getAllByRole('option')
      .map((o) => (o as HTMLOptionElement).value)
      .find((v) => v !== (select as HTMLSelectElement).value)
    expect(other).toBeDefined()
    await user.selectOptions(select, other as string)
    expect(select).toHaveValue(other)
    await loaded()
    expect(text().trim()).toBe('')
  })
  it('AC15: nothing is announced on kind switch, in either direction', async () => {
    const user = userEvent.setup()
    render(<App />)
    await loaded()
    await user.click(screen.getByRole('button', { name: 'Teams' }))
    expect(await within(sidebar()).findByText('Offense')).toBeInTheDocument()
    expect(text().trim()).toBe('')
    await user.click(screen.getByRole('button', { name: 'Players' }))
    expect(await within(sidebar()).findByText('Passing')).toBeInTheDocument()
    expect(text().trim()).toBe('')
  })
  it('AC15: a stat removal in the full App announces removed with the label', async () => {
    const user = userEvent.setup()
    render(<App />)
    await loaded()
    await user.click(within(sidebar()).getByRole('checkbox', { name: 'Pass TD' }))
    await waitFor(() => expect(text()).toMatch(/removed/i))
    expect(text()).toContain('Pass TD')
  })
  it('AC15: a card removal in the full App announces removed with the entity name', async () => {
    const user = userEvent.setup()
    render(<App />)
    await loaded()
    const cards = screen.getByRole('list', { name: /^Selected/ })
    const first = await within(cards).findAllByRole('button', { name: /^Remove / })
    const label = first[0].getAttribute('aria-label') ?? ''
    await user.click(first[0])
    await waitFor(() => expect(text()).toMatch(/removed/i))
    expect(text()).toContain(label.replace(/^Remove /, ''))
  })
  it('AC15: a kind switch after an action does not overwrite or add a message', async () => {
    const user = userEvent.setup()
    render(<App />)
    await loaded()
    await user.click(within(sidebar()).getByRole('checkbox', { name: 'Pass TD' }))
    await waitFor(() => expect(text()).toMatch(/removed/i))
    const before = text()
    await user.click(screen.getByRole('button', { name: 'Teams' }))
    expect(await within(sidebar()).findByText('Offense')).toBeInTheDocument()
    expect(text()).toBe(before)
  })
})
