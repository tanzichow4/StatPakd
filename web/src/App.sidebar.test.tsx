import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import App from './App'

afterEach(() => {
  window.history.pushState({}, '', '/')
})

const sidebar = () => screen.getByRole('complementary', { name: 'Stats' })
const headingNames = () =>
  within(sidebar())
    .getAllByRole('heading', { level: 2 })
    .map((h) => h.textContent)
const rowNames = (group: string) =>
  within(within(sidebar()).getByRole('group', { name: group }))
    .queryAllByRole('checkbox')
    .map((c) => c.closest('label')?.textContent)

async function loaded() {
  expect(await within(sidebar()).findByText('Passing')).toBeInTheDocument()
}

describe('AC22: layout regions', () => {
  it('AC22: the Stats sidebar and the empty Stat views region are inside main', async () => {
    render(<App />)
    await loaded()
    const main = screen.getByRole('main')
    expect(within(main).getByRole('complementary', { name: 'Stats' })).toBe(sidebar())
    const panel = within(main).getByRole('region', { name: 'Stat views' })
    expect(panel).toBeEmptyDOMElement()
  })
  it('AC22: the sidebar follows the entity picker in DOM order', async () => {
    render(<App />)
    await loaded()
    const picker = screen.getByRole('list', { name: /^Selected/ })
    expect(
      picker.compareDocumentPosition(sidebar()) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()
  })
  it('AC22: the main region follows the sidebar', async () => {
    render(<App />)
    await loaded()
    const panel = screen.getByRole('region', { name: 'Stat views' })
    expect(sidebar().compareDocumentPosition(panel) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })
})

describe('AC2/AC5: mock data groups', () => {
  it('AC2: Players show Passing, Rushing, Receiving, Totals', async () => {
    render(<App />)
    await loaded()
    expect(headingNames()).toEqual(['Passing', 'Rushing', 'Receiving', 'Totals'])
  })
  it('AC3: Players default rows are only the selected stats', async () => {
    render(<App />)
    await loaded()
    expect(rowNames('Passing')).toEqual(['Pass Yds', 'Pass TD'])
    expect(rowNames('Rushing')).toEqual(['Rush Yds'])
  })
  it('AC5: Teams show Offense, Defense, Overall', async () => {
    const user = userEvent.setup()
    render(<App />)
    await loaded()
    await user.click(screen.getByRole('button', { name: 'Teams' }))
    expect(await within(sidebar()).findByText('Offense')).toBeInTheDocument()
    expect(headingNames()).toEqual(['Offense', 'Defense', 'Overall'])
  })
})

describe('AC13: adding stats with mock data', () => {
  it('AC13: Passer Rating then Interceptions land in canonical order', async () => {
    const user = userEvent.setup()
    render(<App />)
    await loaded()
    await user.click(screen.getByRole('button', { name: 'Add stat to Passing' }))
    await user.click(screen.getByRole('button', { name: 'Passer Rating' }))
    await user.click(screen.getByRole('button', { name: 'Add stat to Passing' }))
    await user.click(screen.getByRole('button', { name: 'Interceptions' }))
    expect(rowNames('Passing')).toEqual(['Pass Yds', 'Pass TD', 'Interceptions', 'Passer Rating'])
  })
  it('AC13: extra stats such as Pass Yds / G can be added', async () => {
    const user = userEvent.setup()
    render(<App />)
    await loaded()
    await user.click(screen.getByRole('button', { name: 'Add stat to Passing' }))
    await user.click(screen.getByRole('button', { name: 'Pass Yds / G' }))
    expect(rowNames('Passing')).toContain('Pass Yds / G')
  })
})

describe('AC25: existing behaviour is unchanged', () => {
  it('AC25: the banner, heading and picker are still present', async () => {
    render(<App />)
    await loaded()
    expect(screen.getByRole('banner')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'StatPakd' })).toBeInTheDocument()
    expect(screen.getByRole('list', { name: /^Selected/ })).toBeInTheDocument()
  })
})
