import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import App from './App'

afterEach(() => {
  window.history.pushState({}, '', '/')
})

type User = ReturnType<typeof userEvent.setup>

const kindControl = () => screen.getByRole('group', { name: 'Players or teams' })
const switchGroup = () => screen.queryByRole('group', { name: 'Team view' })
const picker = (kind: 'teams' | 'players') =>
  screen.queryByRole('list', { name: `Selected ${kind}` })
const sidebar = () => screen.queryByRole('complementary', { name: 'Stats' })
const panel = () => screen.queryByRole('region', { name: 'Stat views' })
const chipGroup = () => screen.queryByRole('group', { name: 'Teams' })
const SHARE_TITLE = 'Share of team production'
const COMPARE_HINT = 'Compare up to 8 teams side by side'
const INSIDE_HINT = 'Compare players within one team'

async function goTeams(user: User) {
  await user.click(within(kindControl()).getByRole('button', { name: 'Teams' }))
  expect(await screen.findByRole('list', { name: 'Selected teams' })).toBeInTheDocument()
}
async function goPlayers(user: User) {
  await user.click(within(kindControl()).getByRole('button', { name: 'Players' }))
}
const modeBtn = (name: 'Compare teams' | 'Team breakdown') =>
  within(screen.getByRole('group', { name: 'Team view' })).getByRole('button', { name })
async function enterBreakdown(user: User) {
  await user.click(modeBtn('Team breakdown'))
  expect(await screen.findByRole('region', { name: 'Philadelphia Eagles' })).toBeInTheDocument()
}
async function leaveBreakdown(user: User) {
  await user.click(modeBtn('Compare teams'))
  expect(await screen.findByRole('list', { name: 'Selected teams' })).toBeInTheDocument()
}

describe('AC1/AC2: the switch only exists for teams', () => {
  it('AC2: Players mode has no switch and no hint', async () => {
    render(<App />)
    expect(await screen.findByRole('list', { name: 'Selected players' })).toBeInTheDocument()
    expect(switchGroup()).not.toBeInTheDocument()
    expect(screen.queryByText(COMPARE_HINT)).not.toBeInTheDocument()
    expect(screen.queryByText(INSIDE_HINT)).not.toBeInTheDocument()
  })
  it('AC1: Teams mode shows the switch with Compare teams pressed and the hint', async () => {
    const user = userEvent.setup()
    render(<App />)
    await goTeams(user)
    expect(switchGroup()).toBeInTheDocument()
    expect(modeBtn('Compare teams')).toHaveAttribute('aria-pressed', 'true')
    expect(modeBtn('Team breakdown')).toHaveAttribute('aria-pressed', 'false')
    expect(screen.getByText(COMPARE_HINT)).toBeInTheDocument()
  })
  it('AC1: the switch sits above the picker and the compare panel', async () => {
    const user = userEvent.setup()
    render(<App />)
    await goTeams(user)
    const sw = switchGroup() as HTMLElement
    const list = picker('teams') as HTMLElement
    expect(sw.compareDocumentPosition(list) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })
})

describe('AC6/AC7/AC15-AC17: breakdown mode', () => {
  it('AC6: breakdown hides the picker, the sidebar and the compare panel', async () => {
    const user = userEvent.setup()
    render(<App />)
    await goTeams(user)
    expect(sidebar()).toBeInTheDocument()
    expect(panel()).toBeInTheDocument()
    await enterBreakdown(user)
    expect(picker('teams')).not.toBeInTheDocument()
    expect(sidebar()).not.toBeInTheDocument()
    expect(panel()).not.toBeInTheDocument()
    expect(screen.queryByRole('tablist')).not.toBeInTheDocument()
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
    expect(screen.queryByRole('group', { name: '3D chart' })).not.toBeInTheDocument()
    expect(screen.getByText(INSIDE_HINT)).toBeInTheDocument()
    expect(modeBtn('Team breakdown')).toHaveAttribute('aria-pressed', 'true')
  })
  it('AC7: shows the Teams chips then the default team card, with no placeholder', async () => {
    const user = userEvent.setup()
    render(<App />)
    await goTeams(user)
    await enterBreakdown(user)
    const group = chipGroup() as HTMLElement
    const chips = within(group).getAllByRole('button')
    expect(chips).toHaveLength(8)
    expect(within(group).getByRole('button', { name: 'PHI', pressed: true })).toBeInTheDocument()
    const section = screen.getByRole('region', { name: 'Philadelphia Eagles' })
    expect(group.compareDocumentPosition(section) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    const share = await screen.findByRole('region', { name: SHARE_TITLE })
    expect(section.nextElementSibling).toBe(share)
    expect(share.nextElementSibling).toBeNull()
    expect(screen.queryByText(/coming soon/i)).not.toBeInTheDocument()
  })
  it('AC15: the card shows the name, badge and "division · record · season"', async () => {
    const user = userEvent.setup()
    render(<App />)
    await goTeams(user)
    await enterBreakdown(user)
    const section = screen.getByRole('region', { name: 'Philadelphia Eagles' })
    expect(within(section).getByRole('heading', { level: 2 })).toHaveTextContent(
      'Philadelphia Eagles',
    )
    expect(within(section).getByText('PHI')).toBeInTheDocument()
    expect(within(section).getByText(/^NFC East · \d+–\d+ · 2024$/)).toBeInTheDocument()
  })
  it('AC16/AC17: the four summary labels carry formatted values', async () => {
    const user = userEvent.setup()
    render(<App />)
    await goTeams(user)
    await enterBreakdown(user)
    const section = screen.getByRole('region', { name: 'Philadelphia Eagles' })
    await waitFor(() => expect(within(section).getAllByRole('term')).toHaveLength(4))
    expect(
      within(section)
        .getAllByRole('term')
        .map((t) => t.textContent),
    ).toEqual(['Pts / G', 'Yds / G', 'Allowed / G', 'TO Diff'])
    expect(
      within(section)
        .getAllByRole('definition')
        .map((d) => d.textContent),
    ).toEqual(['27.2', '367.2', '17.8', '+11'])
  })
  it('AC13: clicking another chip swaps the card', async () => {
    const user = userEvent.setup()
    render(<App />)
    await goTeams(user)
    await enterBreakdown(user)
    await user.click(within(chipGroup() as HTMLElement).getByRole('button', { name: 'KC' }))
    expect(await screen.findByRole('region', { name: 'Kansas City Chiefs' })).toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'Philadelphia Eagles' })).not.toBeInTheDocument()
    expect(within(chipGroup() as HTMLElement).getByRole('button', { name: 'KC' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
  })
  it('AC10: the global nav stays visible in breakdown mode', async () => {
    const user = userEvent.setup()
    render(<App />)
    await goTeams(user)
    await enterBreakdown(user)
    expect(screen.getByRole('banner')).toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: 'Season' })).toBeInTheDocument()
  })
})

describe('AC5: teamMode survives kind switches', () => {
  it('AC5: Teams + breakdown -> Players shows the players UI, back to Teams shows breakdown', async () => {
    const user = userEvent.setup()
    render(<App />)
    await goTeams(user)
    await enterBreakdown(user)
    await goPlayers(user)
    expect(await screen.findByRole('list', { name: 'Selected players' })).toBeInTheDocument()
    expect(switchGroup()).not.toBeInTheDocument()
    expect(sidebar()).toBeInTheDocument()
    expect(panel()).toBeInTheDocument()
    expect(chipGroup()).not.toBeInTheDocument()
    await user.click(within(kindControl()).getByRole('button', { name: 'Teams' }))
    expect(await screen.findByRole('region', { name: 'Philadelphia Eagles' })).toBeInTheDocument()
    expect(modeBtn('Team breakdown')).toHaveAttribute('aria-pressed', 'true')
    expect(sidebar()).not.toBeInTheDocument()
  })
  it('AC6: Teams compare mode renders the picker, sidebar and panel as before', async () => {
    const user = userEvent.setup()
    render(<App />)
    await goTeams(user)
    expect(sidebar()).toBeInTheDocument()
    expect(panel()).toBeInTheDocument()
    expect(chipGroup()).not.toBeInTheDocument()
  })
})

describe('AC8: compare -> breakdown -> compare keeps the compare state', () => {
  const chartLabels = () =>
    screen.getAllByTestId('axis-label').map((n) => {
      const s = (n as HTMLElement).style
      return `${n.textContent}@${s.left},${s.top}`
    })
  const selectedNames = () =>
    within(screen.getByRole('list', { name: 'Selected teams' }))
      .getAllByRole('listitem')
      .map((li) => li.textContent)

  it('AC8: selected teams, stats, view tab and 3D axis survive a round trip', async () => {
    const user = userEvent.setup()
    render(<App />)
    await goTeams(user)
    // Deselect a team.
    await user.click(screen.getByRole('button', { name: 'Remove Detroit Lions' }))
    expect(screen.queryByRole('button', { name: 'Remove Detroit Lions' })).toBeNull()
    // Toggle a stat off.
    const stats = within(sidebar() as HTMLElement)
    await user.click(stats.getByRole('checkbox', { name: '3rd Down %' }))
    expect(stats.queryByRole('checkbox', { name: '3rd Down %' })).toBeNull()
    // Change the 3D X axis.
    const xAxis = within(panel() as HTMLElement).getByRole('combobox', { name: 'X axis' })
    await user.selectOptions(xAxis, 'ypg')
    const xValue = (xAxis as HTMLSelectElement).value
    expect(xValue).toBe('ypg')
    const before = selectedNames()

    await enterBreakdown(user)
    await leaveBreakdown(user)

    expect(selectedNames()).toEqual(before)
    expect(screen.queryByRole('button', { name: 'Remove Detroit Lions' })).toBeNull()
    expect(
      within(sidebar() as HTMLElement).queryByRole('checkbox', { name: '3rd Down %' }),
    ).toBeNull()
    expect(
      within(sidebar() as HTMLElement).getByRole('checkbox', { name: 'Points / G' }),
    ).toBeChecked()
    expect(within(panel() as HTMLElement).getByRole('combobox', { name: 'X axis' })).toHaveValue(
      'ypg',
    )
    expect(
      within(panel() as HTMLElement).getByRole('tab', { name: '3D chart', selected: true }),
    ).toBeInTheDocument()
  })
  it('AC8: the Table tab survives a round trip', async () => {
    const user = userEvent.setup()
    render(<App />)
    await goTeams(user)
    await user.click(within(panel() as HTMLElement).getByRole('tab', { name: 'Table' }))
    await enterBreakdown(user)
    await leaveBreakdown(user)
    expect(
      within(panel() as HTMLElement).getByRole('tab', { name: 'Table', selected: true }),
    ).toBeInTheDocument()
    expect(await within(panel() as HTMLElement).findByRole('table')).toBeInTheDocument()
  })
  it('AC8: the 2D Radar sub-mode survives a round trip', async () => {
    const user = userEvent.setup()
    render(<App />)
    await goTeams(user)
    await user.click(within(panel() as HTMLElement).getByRole('tab', { name: '2D chart' }))
    await user.click(within(panel() as HTMLElement).getByRole('button', { name: 'Radar' }))
    await enterBreakdown(user)
    await leaveBreakdown(user)
    expect(
      within(panel() as HTMLElement).getByRole('tab', { name: '2D chart', selected: true }),
    ).toBeInTheDocument()
    expect(within(panel() as HTMLElement).getByRole('button', { name: 'Radar' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    expect(
      await within(panel() as HTMLElement).findByRole('group', { name: 'Radar chart' }),
    ).toBeInTheDocument()
  })
  it('AC8: the 3D camera survives a round trip', async () => {
    const user = userEvent.setup()
    render(<App />)
    await goTeams(user)
    const plot = await within(panel() as HTMLElement).findByRole('group', { name: '3D chart' })
    const initial = chartLabels()
    plot.focus()
    await user.keyboard('{ArrowRight}{ArrowRight}{ArrowDown}')
    const rotated = chartLabels()
    expect(rotated).not.toEqual(initial)

    await enterBreakdown(user)
    await leaveBreakdown(user)

    await within(panel() as HTMLElement).findByRole('group', { name: '3D chart' })
    expect(chartLabels()).toEqual(rotated)
  })
})

describe('AC9/AC10: popovers and menus after breakdown', () => {
  it('AC9: an add-stat menu open in Teams compare is closed after the round trip', async () => {
    const user = userEvent.setup()
    render(<App />)
    await goTeams(user)
    await user.click(screen.getByRole('button', { name: 'Add stat to Offense' }))
    expect(screen.getByRole('group', { name: 'Stats to add to Offense' })).toBeInTheDocument()
    await enterBreakdown(user)
    await leaveBreakdown(user)
    expect(screen.queryByRole('group', { name: /^Stats to add to/ })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Add stat to Offense' })).toHaveAttribute(
      'aria-expanded',
      'false',
    )
  })
  it('AC9: a menu open in Players, then Teams while inside, then Compare teams, shows none', async () => {
    const user = userEvent.setup()
    render(<App />)
    await goTeams(user)
    await enterBreakdown(user)
    await goPlayers(user)
    await user.click(await screen.findByRole('button', { name: 'Add stat to Passing' }))
    expect(screen.getByRole('group', { name: 'Stats to add to Passing' })).toBeInTheDocument()
    await user.click(within(kindControl()).getByRole('button', { name: 'Teams' }))
    await screen.findByRole('region', { name: 'Philadelphia Eagles' })
    await leaveBreakdown(user)
    expect(screen.queryByRole('group', { name: /^Stats to add to/ })).not.toBeInTheDocument()
    // Back in Players the menu stays closed too.
    await goPlayers(user)
    expect(await screen.findByRole('list', { name: 'Selected players' })).toBeInTheDocument()
    expect(screen.queryByRole('group', { name: /^Stats to add to/ })).not.toBeInTheDocument()
  })
  it('AC10: an open add-entity popover is closed after entering and leaving breakdown', async () => {
    const user = userEvent.setup()
    render(<App />)
    await goTeams(user)
    await user.click(screen.getByRole('button', { name: /^Add team/ }))
    expect(screen.getByRole('searchbox')).toBeInTheDocument()
    await enterBreakdown(user)
    await leaveBreakdown(user)
    expect(screen.queryByRole('searchbox')).not.toBeInTheDocument()
  })
})

describe('AC18: season change in breakdown', () => {
  it('AC18: the meta suffix follows the season and the team stays', async () => {
    const user = userEvent.setup()
    render(<App />)
    await goTeams(user)
    await enterBreakdown(user)
    await waitFor(() => expect(screen.getAllByRole('definition')).toHaveLength(4))
    const before = screen.getAllByRole('definition').map((d) => d.textContent)
    const select = screen.getByRole('combobox', { name: 'Season' })
    await user.selectOptions(select, '2023')
    await waitFor(() => expect(screen.getByText(/^NFC East · \d+–\d+ · 2023$/)).toBeInTheDocument())
    expect(screen.queryByText(/ · 2024$/)).not.toBeInTheDocument()
    expect(within(chipGroup() as HTMLElement).getByRole('button', { name: 'PHI' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    await waitFor(() =>
      expect(screen.getAllByRole('definition').map((d) => d.textContent)).not.toEqual(before),
    )
    expect(screen.getAllByRole('definition')).toHaveLength(4)
    await act(async () => {})
  })
})

describe('AC7/AC9-AC12/AC17-AC21: share of team production with the mock data', () => {
  const share = () => screen.getByRole('region', { name: SHARE_TITLE })
  const unitGroup = () => within(share()).getByRole('group', { name: 'Unit' })
  const unitBtn = (name: 'Offense' | 'Defense') => within(unitGroup()).getByRole('button', { name })
  const barNames = () =>
    within(share())
      .getAllByRole('group')
      .filter((g) => g !== unitGroup())
      .map((g) => g.getAttribute('aria-label'))
  const legendNames = () =>
    within(within(share()).getByRole('list', { name: 'Legend' }))
      .getAllByRole('listitem')
      .map((li) => li.textContent)
  const totals = () =>
    within(share())
      .getAllByText(/ total$/)
      .map((n) => n.textContent)
  const pctOf = (el: HTMLElement) =>
    Number(/\((\d+)%\)$/.exec(el.getAttribute('aria-label') ?? '')?.[1])

  async function open() {
    const user = userEvent.setup()
    render(<App />)
    await goTeams(user)
    await enterBreakdown(user)
    await screen.findByRole('group', { name: 'Touches share' })
    return user
  }

  it('AC9: the default team shows the section below the card with heading and subtitle', async () => {
    await open()
    expect(within(share()).getByRole('heading', { level: 2 })).toHaveTextContent(SHARE_TITLE)
    expect(
      within(share()).getByText('How the workload splits across the roster'),
    ).toBeInTheDocument()
  })
  it('AC10: Offense and Defense buttons in order, Offense pressed by default', async () => {
    await open()
    expect(
      within(unitGroup())
        .getAllByRole('button')
        .map((b) => b.textContent),
    ).toEqual(['Offense', 'Defense'])
    expect(unitBtn('Offense')).toHaveAttribute('aria-pressed', 'true')
    expect(unitBtn('Defense')).toHaveAttribute('aria-pressed', 'false')
  })
  it('AC7: the offense rows are Touches, Targets, Scrimmage Yds, Touchdowns', async () => {
    await open()
    expect(barNames()).toEqual([
      'Touches share',
      'Targets share',
      'Scrimmage Yds share',
      'Touchdowns share',
    ])
    for (const label of ['Touches', 'Targets', 'Scrimmage Yds', 'Touchdowns']) {
      expect(within(share()).getByText(label)).toBeInTheDocument()
    }
  })
  it('AC17: the Touches row leader reads "Leader: Barkley NN%"', async () => {
    await open()
    expect(within(share()).getAllByText(/^Leader: /)).toHaveLength(4)
    let row: HTMLElement | null = within(share()).getByRole('group', { name: 'Touches share' })
    while (row && !within(row).queryByText(/^Leader: /)) row = row.parentElement
    expect(row).not.toBeNull()
    expect(within(row as HTMLElement).getByText('Touches')).toBeInTheDocument()
    expect(within(row as HTMLElement).getByText(/^Leader: Barkley \d+%$/)).toBeInTheDocument()
  })
  it('AC21: the Touches segments are named "Name · value (pct%)"', async () => {
    await open()
    const bar = within(share()).getByRole('group', { name: 'Touches share' })
    const names = within(bar)
      .getAllByRole('img')
      .map((s) => s.getAttribute('aria-label') ?? '')
    expect(names.length).toBeGreaterThan(0)
    expect(names.some((n) => /^Saquon Barkley · [\d,]+ \(\d+%\)$/.test(n))).toBe(true)
    for (const n of names) expect(n).toMatch(/^.+ · [\d,]+ \(\d+%\)$/)
  })
  it('AC18: the percentages in each offense row add to 100', async () => {
    await open()
    for (const name of barNames()) {
      const bar = within(share()).getByRole('group', { name: name as string })
      const sum = within(bar)
        .getAllByRole('img')
        .map(pctOf)
        .reduce((a, b) => a + b, 0)
      expect(sum).toBe(100)
    }
  })
  it('AC24: the legend lists the offense roster including Saquon Barkley', async () => {
    await open()
    const names = legendNames()
    expect(names.length).toBeGreaterThan(1)
    expect(names).toContain('Saquon Barkley')
    expect(new Set(names).size).toBe(names.length)
  })
  it('AC11: clicking Defense shows the four defense rows and a different legend', async () => {
    const user = await open()
    const offenseLegend = legendNames()
    await user.click(unitBtn('Defense'))
    await screen.findByRole('group', { name: 'Tackles share' })
    expect(barNames()).toEqual([
      'Tackles share',
      'Sacks share',
      'Takeaways share',
      'Passes Defended share',
    ])
    expect(unitBtn('Defense')).toHaveAttribute('aria-pressed', 'true')
    expect(unitBtn('Offense')).toHaveAttribute('aria-pressed', 'false')
    expect(legendNames()).not.toEqual(offenseLegend)
  })
  it('AC11: clicking Offense again returns to the offense rows', async () => {
    const user = await open()
    await user.click(unitBtn('Defense'))
    await screen.findByRole('group', { name: 'Tackles share' })
    await user.click(unitBtn('Offense'))
    expect(await screen.findByRole('group', { name: 'Touches share' })).toBeInTheDocument()
    expect(screen.queryByRole('group', { name: 'Tackles share' })).not.toBeInTheDocument()
  })
  it('AC12: Defense stays selected after a chip change', async () => {
    const user = await open()
    await user.click(unitBtn('Defense'))
    await screen.findByRole('group', { name: 'Tackles share' })
    await user.click(within(chipGroup() as HTMLElement).getByRole('button', { name: 'KC' }))
    await screen.findByRole('region', { name: 'Kansas City Chiefs' })
    expect(unitBtn('Defense')).toHaveAttribute('aria-pressed', 'true')
    expect(await screen.findByRole('group', { name: 'Tackles share' })).toBeInTheDocument()
    expect(screen.queryByRole('group', { name: 'Touches share' })).not.toBeInTheDocument()
  })
  it('AC26: a chip change loads different numbers for the same unit', async () => {
    const user = await open()
    const before = totals()
    await user.click(within(chipGroup() as HTMLElement).getByRole('button', { name: 'KC' }))
    await screen.findByRole('region', { name: 'Kansas City Chiefs' })
    await waitFor(() => expect(totals()).not.toEqual(before))
    expect(unitBtn('Offense')).toHaveAttribute('aria-pressed', 'true')
    expect(barNames()).toHaveLength(4)
  })
  it('AC12/AC26: Defense stays selected after a season change', async () => {
    const user = await open()
    await user.click(unitBtn('Defense'))
    await screen.findByRole('group', { name: 'Tackles share' })
    const before = totals()
    await user.selectOptions(screen.getByRole('combobox', { name: 'Season' }), '2023')
    await waitFor(() => expect(screen.getByText(/ · 2023$/)).toBeInTheDocument())
    await waitFor(() => expect(totals()).not.toEqual(before))
    expect(unitBtn('Defense')).toHaveAttribute('aria-pressed', 'true')
    expect(barNames()).toHaveLength(4)
  })
  it('AC12: Defense stays selected through breakdown -> compare -> breakdown', async () => {
    const user = await open()
    await user.click(unitBtn('Defense'))
    await screen.findByRole('group', { name: 'Tackles share' })
    await leaveBreakdown(user)
    await enterBreakdown(user)
    expect(await screen.findByRole('group', { name: 'Tackles share' })).toBeInTheDocument()
    expect(unitBtn('Defense')).toHaveAttribute('aria-pressed', 'true')
  })
  it('AC9: the section is absent in compare mode and in Players mode', async () => {
    const user = userEvent.setup()
    render(<App />)
    expect(screen.queryByRole('region', { name: SHARE_TITLE })).not.toBeInTheDocument()
    await goTeams(user)
    expect(screen.queryByRole('region', { name: SHARE_TITLE })).not.toBeInTheDocument()
    await enterBreakdown(user)
    expect(await screen.findByRole('region', { name: SHARE_TITLE })).toBeInTheDocument()
    await leaveBreakdown(user)
    expect(screen.queryByRole('region', { name: SHARE_TITLE })).not.toBeInTheDocument()
    await enterBreakdown(user)
    await goPlayers(user)
    await screen.findByRole('list', { name: 'Selected players' })
    expect(screen.queryByRole('region', { name: SHARE_TITLE })).not.toBeInTheDocument()
  })
  it('AC19: the section never contains NaN, Infinity or undefined', async () => {
    const user = await open()
    const check = () => expect(share().textContent).not.toMatch(/NaN|Infinity|undefined/)
    check()
    await user.click(unitBtn('Defense'))
    await screen.findByRole('group', { name: 'Tackles share' })
    check()
  })
})
