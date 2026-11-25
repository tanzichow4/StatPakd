import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import type { LeagueUiDefaults, RosterUnitDef } from '../../domain/types'
import { useAppState } from '../../state'
import { AppStateProvider } from '../../state/AppStateProvider'
import { fixtureRosterUnits, fixtureStatDefs, fixtureUiDefaults } from '../../test/fixtureProvider'
import { UnitToggle } from './UnitToggle'

function Probe() {
  const { state } = useAppState()
  return <output data-testid="unit">{state.unit}</output>
}

function setup(units: RosterUnitDef[] = fixtureRosterUnits(), unit = 'zunit') {
  const defaults: LeagueUiDefaults = { ...fixtureUiDefaults(), unit }
  const user = userEvent.setup()
  render(
    <AppStateProvider defaults={defaults} statDefs={fixtureStatDefs()}>
      <UnitToggle units={units} />
      <Probe />
    </AppStateProvider>,
  )
  return { user }
}

const group = () => screen.getByRole('group', { name: 'Unit' })
const buttons = () => within(group()).getAllByRole('button')
const pressedStates = () => buttons().map((b) => b.getAttribute('aria-pressed'))
const stateUnit = () => screen.getByTestId('unit').textContent

describe('AC10: the unit toggle', () => {
  it('AC10: is a group named Unit', () => {
    setup()
    expect(group()).toBeInTheDocument()
  })
  it('AC10: one button per unit, in data order, labelled with the unit label', () => {
    setup()
    expect(buttons().map((b) => b.textContent)).toEqual(['Zunit One', 'Zunit Two'])
  })
  it('AC10: follows the order of the data, not alphabetical', () => {
    setup([...fixtureRosterUnits()].reverse(), 'zalt')
    expect(buttons().map((b) => b.textContent)).toEqual(['Zunit Two', 'Zunit One'])
  })
  it('AC10: only the button of state.unit is pressed', () => {
    setup()
    expect(pressedStates()).toEqual(['true', 'false'])
  })
  it('AC10: pressed follows a different state.unit', () => {
    setup(fixtureRosterUnits(), 'zalt')
    expect(pressedStates()).toEqual(['false', 'true'])
  })
  it('AC27: with no units it renders an empty control without throwing', () => {
    setup([])
    expect(group()).toBeInTheDocument()
    expect(screen.queryAllByRole('button')).toHaveLength(0)
  })
})

describe('AC11: clicking', () => {
  it('AC11: clicking an inactive button sets state.unit to its key', async () => {
    const { user } = setup()
    await user.click(screen.getByRole('button', { name: 'Zunit Two' }))
    expect(stateUnit()).toBe('zalt')
    expect(pressedStates()).toEqual(['false', 'true'])
  })
  it('AC11: clicking the active button changes nothing', async () => {
    const { user } = setup()
    await user.click(screen.getByRole('button', { name: 'Zunit One' }))
    expect(stateUnit()).toBe('zunit')
    expect(pressedStates()).toEqual(['true', 'false'])
  })
  it('AC11: clicking back and forth tracks the last click', async () => {
    const { user } = setup()
    await user.click(screen.getByRole('button', { name: 'Zunit Two' }))
    await user.click(screen.getByRole('button', { name: 'Zunit One' }))
    expect(stateUnit()).toBe('zunit')
    expect(pressedStates()).toEqual(['true', 'false'])
  })
})

describe('AC28: an unknown state.unit', () => {
  it('AC28: no button is pressed and state is not changed', () => {
    setup(fixtureRosterUnits(), 'nope')
    expect(pressedStates()).toEqual(['false', 'false'])
    expect(stateUnit()).toBe('nope')
  })
  it('AC28: clicking any button then selects it', async () => {
    const { user } = setup(fixtureRosterUnits(), 'nope')
    await user.click(screen.getByRole('button', { name: 'Zunit One' }))
    expect(stateUnit()).toBe('zunit')
    expect(pressedStates()).toEqual(['true', 'false'])
  })
})
