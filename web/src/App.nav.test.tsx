import { act, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import App from './App'
import selectCss from './components/ui/Select.module.css?raw'

afterEach(() => {
  window.history.pushState({}, '', '/')
})

describe('AC1: nav mounting', () => {
  it('AC1: on / the first element of the page is the banner nav', async () => {
    const { container } = render(<App />)
    const first = container.firstElementChild as HTMLElement
    expect(first).toBe(screen.getByRole('banner'))
    expect(within(first).getByRole('navigation', { name: 'Leagues' })).toBeInTheDocument()
    await act(async () => {})
  })
  it('AC1: the page content comes after the nav', async () => {
    render(<App />)
    const banner = screen.getByRole('banner')
    const heading = screen.getByRole('heading', { name: 'StatPakd' })
    expect(banner.compareDocumentPosition(heading) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    await act(async () => {})
  })
  it('AC2: the app supplies the mock leagues and seasons to the nav', async () => {
    render(<App />)
    const nav = screen.getByRole('navigation', { name: 'Leagues' })
    await waitFor(() => expect(within(nav).getAllByRole('button')).toHaveLength(4))
    expect(within(nav).getByRole('button', { name: 'NFL' })).toHaveAttribute('aria-current', 'page')
    const select = screen.getByRole('combobox', { name: 'Season' })
    await waitFor(() => expect(within(select).getAllByRole('option').length).toBeGreaterThan(0))
    expect(select).toHaveValue('2024')
  })
  it('AC1: on /dev the DevPage renders and the nav does not', async () => {
    window.history.pushState({}, '', '/dev')
    render(<App />)
    expect(screen.getByRole('heading', { name: 'UI primitives' })).toBeInTheDocument()
    expect(screen.queryByRole('banner')).not.toBeInTheDocument()
    expect(screen.queryByRole('navigation', { name: 'Leagues' })).not.toBeInTheDocument()
    await act(async () => {})
  })
})

describe('AC22: Select padding', () => {
  const rule = (name: string) => new RegExp(`\\.${name}\\s*\\{[^}]*\\}`).exec(selectCss)?.[0] ?? ''
  it('AC22: the dark variant has padding 6px 10px', () => {
    expect(rule('dark')).toMatch(/padding:\s*6px 10px/)
  })
  it('AC22: the light variant keeps the base padding 7px 10px', () => {
    expect(rule('light')).not.toMatch(/padding/)
    expect(rule('select')).toMatch(/padding:\s*7px 10px/)
  })
})
