import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import App from './App'

afterEach(() => {
  window.history.pushState({}, '', '/')
})

const cards = () => screen.getByRole('list', { name: /^Selected/ })
const cardNames = () =>
  within(cards())
    .queryAllByRole('button', { name: /^Remove / })
    .filter((b) => !b.closest('dialog, [role="dialog"]'))
    .map((b) => (b.getAttribute('aria-label') ?? '').replace(/^Remove /, ''))
const addCard = () => screen.getByRole('button', { name: /^Add (player|team)/ })

async function loaded() {
  expect(await within(cards()).findByText('Josh Allen')).toBeInTheDocument()
}

describe('AC5: default picker in the app', () => {
  it('AC5: shows three player cards then the add card with its slots line', async () => {
    render(<App />)
    await loaded()
    expect(cardNames()).toEqual(['Josh Allen', 'Saquon Barkley', "Ja'Marr Chase"])
    expect(addCard()).toHaveTextContent('Add player')
    expect(addCard()).toHaveTextContent('5 of 8 slots open')
  })
})

describe('AC32: composition', () => {
  it('AC32: the picker sits inside main, after the banner', async () => {
    render(<App />)
    await loaded()
    const main = screen.getByRole('main')
    expect(within(main).getByRole('list', { name: /^Selected/ })).toBe(cards())
    expect(
      screen.getByRole('banner').compareDocumentPosition(main) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()
  })
  it('AC32: the StatPakd heading stays in the DOM', async () => {
    render(<App />)
    await loaded()
    expect(screen.getByRole('heading', { name: 'StatPakd' })).toBeInTheDocument()
  })
  it('AC32: the heading comes before the picker inside main', async () => {
    render(<App />)
    await loaded()
    const heading = screen.getByRole('heading', { name: 'StatPakd' })
    expect(heading.compareDocumentPosition(cards()) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })
  it('AC32: on /dev the picker is not rendered', async () => {
    window.history.pushState({}, '', '/dev')
    render(<App />)
    expect(screen.getByRole('heading', { name: 'UI primitives' })).toBeInTheDocument()
    expect(screen.queryByRole('list', { name: /^Selected/ })).not.toBeInTheDocument()
    await act(async () => {})
  })
})

describe('AC10: kind switching in the app', () => {
  it('AC10: Teams shows three team cards and Add team; Players returns unchanged', async () => {
    const user = userEvent.setup()
    render(<App />)
    await loaded()
    const players = cardNames()
    await user.click(screen.getByRole('button', { name: 'Teams' }))
    expect(await within(cards()).findByText('Kansas City Chiefs')).toBeInTheDocument()
    expect(cardNames()).toEqual(['Kansas City Chiefs', 'Detroit Lions', 'Baltimore Ravens'])
    expect(addCard()).toHaveTextContent('Add team')
    await user.click(screen.getByRole('button', { name: 'Players' }))
    await loaded()
    expect(cardNames()).toEqual(players)
    expect(addCard()).toHaveTextContent('Add player')
  })
})

describe('AC14: search against the mock data', () => {
  it('AC14: "allen" finds Josh Allen in the open popover', async () => {
    const user = userEvent.setup()
    render(<App />)
    await loaded()
    await user.click(addCard())
    await user.type(screen.getByRole('searchbox'), 'allen')
    const rows = within(
      within(screen.getByRole('dialog')).getByRole('list', { name: 'Results' }),
    ).getAllByRole('listitem')
    expect(rows).toHaveLength(1)
    expect(rows[0]).toHaveTextContent('Josh Allen')
  })
  it('AC15: the chips are All, QB, RB, WR, TE', async () => {
    const user = userEvent.setup()
    render(<App />)
    await loaded()
    await user.click(addCard())
    const group = within(screen.getByRole('dialog')).getByRole('group', {
      name: 'Filter by position',
    })
    expect(
      within(group)
        .getAllByRole('button')
        .map((b) => b.textContent),
    ).toEqual(['All', 'QB', 'RB', 'WR', 'TE'])
  })
})
