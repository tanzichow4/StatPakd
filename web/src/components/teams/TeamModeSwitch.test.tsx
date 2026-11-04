import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { DataSource } from '../../dataSource'
import { useAppState } from '../../state'
import { AppStateProvider } from '../../state/AppStateProvider'
import { MAX_SELECTED, type AppAction } from '../../state/appState'
import {
  createFixtureProvider,
  fixtureStatDefs,
  fixtureUiDefaults,
} from '../../test/fixtureProvider'
import { TeamModeSwitch } from './TeamModeSwitch'

function Probe() {
  const { state, dispatch } = useAppState()
  const send = (a: AppAction) => () => dispatch(a)
  return (
    <div>
      <output data-testid="state">
        {JSON.stringify({ kind: state.kind, teamMode: state.teamMode, addOpen: state.addOpen })}
      </output>
      <button type="button" onClick={send({ type: 'setKind', kind: 'teams' })}>
        probe teams
      </button>
      <button type="button" onClick={send({ type: 'setKind', kind: 'players' })}>
        probe players
      </button>
      <button type="button" onClick={send({ type: 'setTeamMode', mode: 'inside' })}>
        probe inside
      </button>
      <button type="button" onClick={send({ type: 'toggleAdd' })}>
        probe toggle add
      </button>
    </div>
  )
}

function setup() {
  const user = userEvent.setup()
  render(
    <DataSource provider={createFixtureProvider()}>
      <AppStateProvider defaults={fixtureUiDefaults()} statDefs={fixtureStatDefs()}>
        <TeamModeSwitch />
        <Probe />
      </AppStateProvider>
    </DataSource>,
  )
  return user
}

const readState = () => JSON.parse(screen.getByTestId('state').textContent ?? '{}')
const group = () => screen.queryByRole('group', { name: 'Team view' })
const compareBtn = () => screen.getByRole('button', { name: 'Compare teams' })
const insideBtn = () => screen.getByRole('button', { name: 'Team breakdown' })
const probe = (name: string) => screen.getByRole('button', { name: `probe ${name}` })
const COMPARE_HINT = `Compare up to ${MAX_SELECTED} teams side by side`
const INSIDE_HINT = 'Compare players within one team'

describe('AC2: the switch is hidden for players', () => {
  it('AC2: Players renders no switch and no hint in compare mode', () => {
    setup()
    expect(readState().kind).toBe('players')
    expect(group()).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Compare teams' })).not.toBeInTheDocument()
    expect(screen.queryByText(COMPARE_HINT)).not.toBeInTheDocument()
    expect(screen.queryByText(INSIDE_HINT)).not.toBeInTheDocument()
  })
  it('AC2: Players renders no switch and no hint even when teamMode is inside', async () => {
    const user = setup()
    await user.click(probe('inside'))
    expect(readState()).toMatchObject({ kind: 'players', teamMode: 'inside' })
    expect(group()).not.toBeInTheDocument()
    expect(screen.queryByText(COMPARE_HINT)).not.toBeInTheDocument()
    expect(screen.queryByText(INSIDE_HINT)).not.toBeInTheDocument()
  })
})

describe('AC1: the switch for teams', () => {
  it('AC1: Teams shows a Team view group with two buttons in order', async () => {
    const user = setup()
    await user.click(probe('teams'))
    const g = screen.getByRole('group', { name: 'Team view' })
    expect([...g.querySelectorAll('button')].map((b) => b.textContent)).toEqual([
      'Compare teams',
      'Team breakdown',
    ])
  })
  it('AC1: in compare mode only "Compare teams" is pressed', async () => {
    const user = setup()
    await user.click(probe('teams'))
    expect(compareBtn()).toHaveAttribute('aria-pressed', 'true')
    expect(insideBtn()).toHaveAttribute('aria-pressed', 'false')
  })
  it('AC1: in breakdown mode only "Team breakdown" is pressed', async () => {
    const user = setup()
    await user.click(probe('inside'))
    await user.click(probe('teams'))
    expect(insideBtn()).toHaveAttribute('aria-pressed', 'true')
    expect(compareBtn()).toHaveAttribute('aria-pressed', 'false')
  })
})

describe('AC3/AC4: hint text and switching', () => {
  it('AC3: the compare hint uses the MAX_SELECTED number', async () => {
    const user = setup()
    await user.click(probe('teams'))
    expect(screen.getByText('Compare up to 8 teams side by side')).toBeInTheDocument()
    expect(screen.getByText(COMPARE_HINT)).toBeInTheDocument()
    expect(screen.queryByText(INSIDE_HINT)).not.toBeInTheDocument()
  })
  it('AC4: clicking "Team breakdown" sets teamMode inside and changes the hint', async () => {
    const user = setup()
    await user.click(probe('teams'))
    await user.click(insideBtn())
    expect(readState().teamMode).toBe('inside')
    expect(insideBtn()).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByText(INSIDE_HINT)).toBeInTheDocument()
    expect(screen.queryByText(COMPARE_HINT)).not.toBeInTheDocument()
  })
  it('AC4: clicking "Compare teams" sets teamMode back to compare', async () => {
    const user = setup()
    await user.click(probe('teams'))
    await user.click(insideBtn())
    await user.click(compareBtn())
    expect(readState().teamMode).toBe('compare')
    expect(screen.getByText(COMPARE_HINT)).toBeInTheDocument()
  })
  it('AC4: clicking the active option leaves the state unchanged (add popover stays open)', async () => {
    const user = setup()
    await user.click(probe('teams'))
    await user.click(probe('toggle add'))
    expect(readState().addOpen).toBe(true)
    await user.click(compareBtn())
    expect(readState()).toMatchObject({ teamMode: 'compare', addOpen: true })
    expect(screen.getByText(COMPARE_HINT)).toBeInTheDocument()
  })
  it('AC10: entering breakdown closes the add popover', async () => {
    const user = setup()
    await user.click(probe('teams'))
    await user.click(probe('toggle add'))
    await user.click(insideBtn())
    expect(readState()).toMatchObject({ teamMode: 'inside', addOpen: false })
  })
})
