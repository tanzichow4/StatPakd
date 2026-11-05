import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import App from './App'

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
