import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { compareStatDefs } from '../../test/compareFixtures'
import { AxisControls } from './AxisControls'
import { axisOptions } from './chart3dModel'

const options = axisOptions(compareStatDefs().players)
const LABELS = ['Zhigh', 'Zlow', 'Zbig', 'Zsign', 'Zsolo']

function setup(axes: [string, string, string] = ['zhigh', 'zlow', 'zbig']) {
  const onAxis = vi.fn()
  const onReset = vi.fn()
  const user = userEvent.setup()
  const view = render(
    <AxisControls options={options} axes={axes} onAxis={onAxis} onReset={onReset} />,
  )
  return { user, onAxis, onReset, ...view }
}

const select = (name: string) => screen.getByRole('combobox', { name })
const reset = () => screen.getByRole('button', { name: 'Reset view' })
const optionLabels = (el: HTMLElement) =>
  within(el)
    .getAllByRole('option')
    .map((o) => o.textContent)

describe('AC6: three labelled axis selects', () => {
  it('AC6: the selects are named X axis, Y axis and Z axis, left to right', () => {
    setup()
    const names = screen.getAllByRole('combobox').map((c) => c.getAttribute('aria-label'))
    expect(names).toEqual(['X axis', 'Y axis', 'Z axis'])
  })
  it('AC6: the visible letters X, Y and Z are shown', () => {
    setup()
    for (const letter of ['X', 'Y', 'Z']) {
      expect(screen.getByText(letter)).toBeVisible()
    }
  })
  it('AC6: each select lists every stat label in the given order', () => {
    setup()
    for (const name of ['X axis', 'Y axis', 'Z axis']) {
      expect(optionLabels(select(name))).toEqual(LABELS)
    }
  })
  it('AC6: each select shows its current axis stat', () => {
    setup(['zsign', 'zhigh', 'zsolo'])
    expect(select('X axis')).toHaveDisplayValue('Zsign')
    expect(select('Y axis')).toHaveDisplayValue('Zhigh')
    expect(select('Z axis')).toHaveDisplayValue('Zsolo')
  })
  it('AC6: an empty option list renders three empty selects without crashing', () => {
    render(<AxisControls options={[]} axes={['a', 'b', 'c']} onAxis={vi.fn()} onReset={vi.fn()} />)
    expect(screen.getAllByRole('combobox')).toHaveLength(3)
  })
})

describe('AC7: choosing a stat reports the axis index and key', () => {
  it('AC7: changing X calls onAxis(0, key)', async () => {
    const { user, onAxis } = setup()
    await user.selectOptions(select('X axis'), 'zsign')
    expect(onAxis).toHaveBeenCalledTimes(1)
    expect(onAxis).toHaveBeenCalledWith(0, 'zsign')
  })
  it('AC7: changing Y calls onAxis(1, key)', async () => {
    const { user, onAxis } = setup()
    await user.selectOptions(select('Y axis'), 'zsolo')
    expect(onAxis).toHaveBeenCalledWith(1, 'zsolo')
  })
  it('AC7: changing Z calls onAxis(2, key)', async () => {
    const { user, onAxis } = setup()
    await user.selectOptions(select('Z axis'), 'zhigh')
    expect(onAxis).toHaveBeenCalledWith(2, 'zhigh')
  })
  it('AC7: choosing an option by label text reports its key, not its label', async () => {
    const { user, onAxis } = setup()
    await user.selectOptions(select('Y axis'), 'Zsign')
    expect(onAxis).toHaveBeenCalledWith(1, 'zsign')
  })
})

describe('AC8: the same stat may be chosen on more than one axis', () => {
  it('AC8: Y can be set to the key X already shows', async () => {
    const { user, onAxis } = setup()
    await user.selectOptions(select('Y axis'), 'zhigh')
    expect(onAxis).toHaveBeenCalledWith(1, 'zhigh')
  })
  it('AC8: every select still lists every option when two axes share a stat', () => {
    setup(['zhigh', 'zhigh', 'zhigh'])
    for (const name of ['X axis', 'Y axis', 'Z axis']) {
      expect(optionLabels(select(name))).toEqual(LABELS)
      expect(select(name)).toHaveDisplayValue('Zhigh')
    }
  })
})

describe('AC10: an unknown axis key shows Choose a stat', () => {
  it('AC10: the select shows a disabled Choose a stat option as its value', () => {
    setup(['zhigh', 'znope', 'zbig'])
    expect(select('Y axis')).toHaveDisplayValue('Choose a stat')
    const placeholder = within(select('Y axis')).getByRole('option', { name: 'Choose a stat' })
    expect(placeholder).toBeDisabled()
  })
  it('AC10: the other selects are unaffected and show no placeholder', () => {
    setup(['zhigh', 'znope', 'zbig'])
    expect(select('X axis')).toHaveDisplayValue('Zhigh')
    expect(select('Z axis')).toHaveDisplayValue('Zbig')
    expect(screen.getAllByRole('option', { name: 'Choose a stat' })).toHaveLength(1)
  })
  it('AC10: all three unknown shows three placeholders', () => {
    setup(['a', 'b', 'c'])
    expect(screen.getAllByRole('option', { name: 'Choose a stat' })).toHaveLength(3)
  })
  it('AC10: no placeholder when every axis is known', () => {
    setup()
    expect(screen.queryByText('Choose a stat')).not.toBeInTheDocument()
  })
  it('AC10: a known stat can be chosen from the placeholder state', async () => {
    const { user, onAxis } = setup(['zhigh', 'znope', 'zbig'])
    await user.selectOptions(select('Y axis'), 'zlow')
    expect(onAxis).toHaveBeenCalledWith(1, 'zlow')
  })
})

describe('AC11: the Reset view button', () => {
  it('AC11: the button is named Reset view and is the last control after the selects', () => {
    setup()
    const all = screen.getAllByRole('combobox')
    expect(reset().compareDocumentPosition(all[2]) & Node.DOCUMENT_POSITION_PRECEDING).toBeTruthy()
    expect(screen.getAllByRole('button')).toHaveLength(1)
  })
  it('AC11: a click calls onReset once', async () => {
    const { user, onReset } = setup()
    await user.click(reset())
    expect(onReset).toHaveBeenCalledTimes(1)
  })
  it('AC11: Enter calls onReset', async () => {
    const { user, onReset } = setup()
    reset().focus()
    await user.keyboard('{Enter}')
    expect(onReset).toHaveBeenCalledTimes(1)
  })
  it('AC11: Space calls onReset', async () => {
    const { user, onReset } = setup()
    reset().focus()
    await user.keyboard(' ')
    expect(onReset).toHaveBeenCalledTimes(1)
  })
  it('AC11: keyboard focus stays on the button after activation', async () => {
    const { user } = setup()
    reset().focus()
    await user.keyboard('{Enter}')
    expect(reset()).toHaveFocus()
    await user.keyboard(' ')
    expect(reset()).toHaveFocus()
  })
  it('AC11: resetting does not report an axis change', async () => {
    const { user, onAxis } = setup()
    await user.click(reset())
    expect(onAxis).not.toHaveBeenCalled()
  })
})

describe('AC29: tab order inside the controls', () => {
  it('AC29: Tab goes X, Y, Z, Reset view', async () => {
    const { user } = setup()
    await user.tab()
    expect(select('X axis')).toHaveFocus()
    await user.tab()
    expect(select('Y axis')).toHaveFocus()
    await user.tab()
    expect(select('Z axis')).toHaveFocus()
    await user.tab()
    expect(reset()).toHaveFocus()
  })
})
